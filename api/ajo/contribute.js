/**
 * POST /api/ajo/contribute
 * Body: { circleId, idempotencyKey? }
 * Single DB transaction via ajo_contribute_atomic (auth.uid()).
 * Amount comes only from circle.amount in the database.
 */
import { requireUser } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const circleId = body.circleId;
    if (!circleId) return res.status(400).json({ error: 'circleId required' });

    const idem =
      body.idempotencyKey ||
      req.headers['idempotency-key'] ||
      null;

    const { data, error } = await ctx.sb.rpc('ajo_contribute_atomic', {
      p_circle_id: circleId,
      p_idempotency_key: idem,
    });

    if (error) {
      const msg = error.message || 'Contribution failed';
      const status =
        /insufficient|not a member|not active|not authenticated/i.test(msg) ? 400 : 400;
      return res.status(status).json({ error: msg });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[ajo/contribute]', err);
    return res.status(500).json({ error: err.message || 'Contribution failed' });
  }
}
