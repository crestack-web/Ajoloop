/**
 * POST /api/payments/webhook
 * Bachs webhook receiver. Credits wallet on successful collection.
 * Optional: BACHS_WEBHOOK_SECRET for signature verification when available.
 */
import { createClient } from '@supabase/supabase-js';

function admin() {
  const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const type = event.type || event.event || event.name || '';
    const data = event.data || event.payload || event;

    // Accept collection.succeeded and payment-like payloads
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
    const amount = Math.floor(Number(amountRaw) || 0);
    const paymentId = data.payment_id || data.id || null;
    const checkoutId = data.checkout_id || data.checkout?.id || null;

    if (!userId || amount < 1) {
      console.warn('[webhook] missing user_id or amount', { type, meta, data });
      return res.status(200).json({ received: true, skipped: 'incomplete' });
    }

    const sb = admin();

    // Idempotency: skip if already completed for this reference / payment
    if (reference) {
      const { data: existing } = await sb
        .from('payment_intents')
        .select('status')
        .eq('reference', reference)
        .maybeSingle();
      if (existing?.status === 'completed') {
        return res.status(200).json({ received: true, duplicate: true });
      }
    }

    const { data: bal, error: creditErr } = await sb.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_kind: 'topup',
      p_reference: reference || paymentId || checkoutId,
      p_meta: { payment_id: paymentId, checkout_id: checkoutId, source: 'bachs' },
    });

    if (creditErr) {
      console.error('[webhook] credit_wallet', creditErr);
      return res.status(500).json({ error: creditErr.message });
    }

    if (reference) {
      await sb
        .from('payment_intents')
        .update({
          status: 'completed',
          bachs_payment_id: paymentId,
          bachs_checkout_id: checkoutId,
          completed_at: new Date().toISOString(),
        })
        .eq('reference', reference);
    }

    return res.status(200).json({ received: true, balance: bal });
  } catch (err) {
    console.error('[webhook]', err);
    return res.status(500).json({ error: err.message || 'Webhook failed' });
  }
}
