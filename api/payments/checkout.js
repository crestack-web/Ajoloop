/**
 * POST /api/payments/checkout
 * Body: { amount: number, successUrl?, cancelUrl? }
 * Auth: Authorization: Bearer <supabase access token>
 * Creates a Bachs checkout session for wallet top-up (NGN).
 */
import { createClient } from '@supabase/supabase-js';
import { bachsFetch, amountToBachs } from '../_bachs.js';

function supabaseAdmin() {
  const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function supabaseUser(token) {
  const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.BACHS_API_KEY) {
      return res.status(503).json({ error: 'Payments not configured (BACHS_API_KEY)' });
    }

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in required' });

    const userClient = supabaseUser(token);
    if (!userClient) return res.status(503).json({ error: 'Supabase not configured' });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid session' });
    const user = userData.user;

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const amount = Math.floor(Number(body.amount) || 0);
    if (amount < 100) return res.status(400).json({ error: 'Minimum top-up is ₦100' });
    if (amount > 500000) return res.status(400).json({ error: 'Maximum top-up is ₦500,000' });

    const origin = (req.headers.origin || body.origin || process.env.APP_URL || 'https://oop-one.vercel.app').replace(/\/$/, '');
    const successUrl = body.successUrl || `${origin}/?payment=success&ref=TOPUP`;
    const cancelUrl = body.cancelUrl || `${origin}/?payment=cancelled`;

    const reference = `topup_${user.id.slice(0, 8)}_${Date.now()}`;
    const admin = supabaseAdmin();
    if (admin) {
      await admin.from('payment_intents').insert({
        user_id: user.id,
        amount,
        currency: 'NGN',
        status: 'pending',
        reference,
      });
      await admin.from('wallets').upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id', ignoreDuplicates: true });
    }

    const email = user.email || body.email || `user_${user.id.slice(0, 8)}@ajoloop.app`;
    const name =
      user.user_metadata?.display_name ||
      user.user_metadata?.username ||
      email.split('@')[0];

    const session = await bachsFetch('/v1/checkout-sessions', {
      method: 'POST',
      body: {
        pricing: { currency: 'NGN', amount: amountToBachs(amount) },
        customer: { email, name },
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_method_types: ['NGN_CARD', 'NGN_BANK_TRANSFER'],
        metadata: {
          user_id: user.id,
          kind: 'wallet_topup',
          amount: String(amount),
          reference,
        },
      },
    });

    const checkoutId = session.checkout_id || session.id || null;
    const checkoutUrl = session.checkout_url || session.url;
    if (!checkoutUrl) {
      return res.status(502).json({ error: 'Bachs did not return a checkout URL', detail: session });
    }

    if (admin && checkoutId) {
      await admin
        .from('payment_intents')
        .update({ bachs_checkout_id: checkoutId })
        .eq('reference', reference);
    }

    return res.status(200).json({
      checkout_url: checkoutUrl,
      checkout_id: checkoutId,
      reference,
      amount,
    });
  } catch (err) {
    console.error('[checkout]', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Checkout failed',
      detail: err.data || undefined,
    });
  }
}
