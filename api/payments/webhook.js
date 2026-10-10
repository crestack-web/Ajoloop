/**
 * POST /api/payments/webhook
 * Bachs webhook — credits wallet on successful collection.
 * When BACHS_WEBHOOK_SECRET (or BATCHS_WEBHOOK_SECRET) is set, requires matching signature header.
 * Idempotent via payment_intents.reference + credit_wallet reference uniqueness.
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function admin() {
  const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

function webhookSecret() {
  return process.env.BACHS_WEBHOOK_SECRET || process.env.BATCHS_WEBHOOK_SECRET || '';
}

function verifySignature(req, rawBody) {
  const secret = webhookSecret();
  if (!secret) {
    // Misconfiguration: do not accept in production-like strict mode
    if (process.env.REQUIRE_WEBHOOK_SECRET === '1' || process.env.VERCEL_ENV === 'production') {
      return { ok: false, reason: 'BACHS_WEBHOOK_SECRET not configured' };
    }
    return { ok: true, skipped: true };
  }

  const sig =
    req.headers['x-bachs-signature'] ||
    req.headers['x-batchs-signature'] ||
    req.headers['x-signature'] ||
    req.headers['bachs-signature'] ||
    '';

  if (!sig) return { ok: false, reason: 'missing signature header' };

  const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(String(sig).replace(/^sha256=/, ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    // Also accept raw secret equality for providers that send static tokens
    if (sig !== secret) return { ok: false, reason: 'invalid signature' };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const event = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    const v = verifySignature(req, raw);
    if (!v.ok) {
      console.warn('[webhook] signature', v.reason);
      return res.status(401).json({ error: v.reason || 'unauthorized' });
    }

    const type = event.type || event.event || event.name || '';
    const data = event.data || event.payload || event;

    const succeeded =
      type === 'collection.succeeded' ||
      type === 'payment.succeeded' ||
      type === 'checkout.completed' ||
      data?.status === 'succeeded' ||
      data?.status === 'completed';

    if (!succeeded) {
      return res.status(200).json({ received: true, ignored: type || 'unknown' });
    }

    const meta = data.metadata || data.meta || {};
    const userId = meta.user_id || data.user_id;
    const reference = meta.reference || data.reference;
    const amountRaw = meta.amount || data.amount || data.pricing?.amount;
    // Amounts from provider may be in major or minor units — prefer metadata.amount set at checkout (NGN major)
    const amount = Math.floor(Number(amountRaw) || 0);
    const paymentId = data.payment_id || data.id || null;
    const checkoutId = data.checkout_id || data.checkout?.id || null;

    if (!userId || amount < 1) {
      console.warn('[webhook] missing user_id or amount', { type, meta });
      return res.status(200).json({ received: true, skipped: 'incomplete' });
    }

    if (!reference) {
      console.warn('[webhook] missing reference — refusing non-idempotent credit');
      return res.status(400).json({ error: 'reference required for credit' });
    }

    const sb = admin();

    const { data: existing } = await sb
      .from('payment_intents')
      .select('status, amount, user_id')
      .eq('reference', reference)
      .maybeSingle();

    if (existing?.status === 'completed') {
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Prefer authoritative amount from payment_intents if present
    const creditAmount = existing?.amount != null ? Math.floor(Number(existing.amount)) : amount;
    const creditUser = existing?.user_id || userId;

    if (existing && existing.user_id && existing.user_id !== userId) {
      console.warn('[webhook] user_id mismatch', { reference });
      return res.status(400).json({ error: 'user mismatch' });
    }

    const { data: bal, error: creditErr } = await sb.rpc('credit_wallet', {
      p_user_id: creditUser,
      p_amount: creditAmount,
      p_kind: 'topup',
      p_reference: reference,
      p_meta: { payment_id: paymentId, checkout_id: checkoutId, source: 'bachs' },
    });

    if (creditErr) {
      console.error('[webhook] credit_wallet', creditErr);
      return res.status(500).json({ error: creditErr.message });
    }

    await sb
      .from('payment_intents')
      .update({
        status: 'completed',
        bachs_payment_id: paymentId,
        bachs_checkout_id: checkoutId,
        completed_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    return res.status(200).json({ received: true, balance: bal, amount: creditAmount });
  } catch (err) {
    console.error('[webhook]', err);
    return res.status(500).json({ error: err.message || 'Webhook failed' });
  }
}
