/**
 * POST /api/ajo/claim — recipient claims pending cycle payout into wallet
 * Body: { circleId, cycle, useReason? }
 * Credits wallet once (idempotent by ledger reference).
 */
import { requireUser } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!body.circleId || body.cycle == null) {
      return res.status(400).json({ error: 'circleId and cycle required' });
    }

    const { data, error } = await ctx.sb.rpc('ajo_claim_payout', {
      p_circle_id: body.circleId,
      p_cycle: Math.floor(Number(body.cycle)),
      p_use_reason: body.useReason || null,
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
  } catch (err) {
    console.error('[ajo/claim]', err);
    return res.status(500).json({ error: err.message });
  }
}
