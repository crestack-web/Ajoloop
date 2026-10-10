/**
 * POST /api/ajo/invite — host creates invite code
 * Body: { circleId, maxUses?, ttlDays? }
 */
import { requireUser, adminClient } from '../_supabase.js';

function mkCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = 'AJO-';
  for (let i = 0; i < 6; i++) c += A[Math.floor(Math.random() * A.length)];
  return c;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const circleId = body.circleId;
    if (!circleId) return res.status(400).json({ error: 'circleId required' });

    const { data: circle } = await ctx.sb.from('ajo_circles').select('*').eq('id', circleId).single();
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    if (circle.host_id !== ctx.user.id) return res.status(403).json({ error: 'Only host can create codes' });
    if (circle.status !== 'open') return res.status(400).json({ error: 'Circle not open for invites' });

    const maxUses = Math.min(100, Math.max(1, Math.floor(Number(body.maxUses) || 10)));
    const ttlDays = Math.min(60, Math.max(1, Math.floor(Number(body.ttlDays) || 14)));
    const code = mkCode();
    const expires = new Date(Date.now() + ttlDays * 864e5).toISOString();

    const { data, error } = await ctx.sb.from('ajo_invite_codes').insert({
      circle_id: circleId,
      code,
      created_by: ctx.user.id,
      max_uses: maxUses,
      expires_at: expires,
    }).select().single();

    // Host may lack insert policy on invite codes — use admin fallback
    if (error) {
      const admin = adminClient();
      if (!admin) return res.status(400).json({ error: error.message });
      const { data: d2, error: e2 } = await admin.from('ajo_invite_codes').insert({
        circle_id: circleId,
        code,
        created_by: ctx.user.id,
        max_uses: maxUses,
        expires_at: expires,
      }).select().single();
      if (e2) return res.status(400).json({ error: e2.message });
      return res.status(201).json({ ok: true, invite: d2 });
    }
    return res.status(201).json({ ok: true, invite: data });
  } catch (err) {
    console.error('[ajo/invite]', err);
    return res.status(500).json({ error: err.message });
  }
}
