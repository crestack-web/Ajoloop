/**
 * POST /api/ajo/advance — host closes current cycle after all contributions
 * Creates pending payout for order_ids[cycle] (traditional rotating pot).
 * Body: { circleId }
 */
import { requireUser } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!body.circleId) return res.status(400).json({ error: 'circleId required' });

    const { data, error } = await ctx.sb.rpc('ajo_advance_cycle', { p_circle_id: body.circleId });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
  } catch (err) {
    console.error('[ajo/advance]', err);
    return res.status(500).json({ error: err.message });
  }
}
