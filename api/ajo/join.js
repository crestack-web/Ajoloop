/**
 * POST /api/ajo/join
 * Body: { circleId?, code?, reason? }
 */
import { requireUser, adminClient } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let circleId = body.circleId || null;
    const code = body.code ? String(body.code).trim().toUpperCase() : null;
    const reason = body.reason ? String(body.reason).trim().slice(0, 200) : null;

    const admin = adminClient();

    if (code) {
      const client = admin || ctx.sb;
      const { data: inv, error: invErr } = await client
        .from('ajo_invite_codes')
        .select('*, ajo_circles(*)')
        .eq('code', code)
        .eq('revoked', false)
        .maybeSingle();
      if (invErr || !inv) return res.status(400).json({ error: 'Invalid or revoked invite code' });
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invite code expired' });
      }
      if (inv.uses >= inv.max_uses) return res.status(400).json({ error: 'Invite code fully used' });
      circleId = inv.circle_id;
      // increment uses via admin
      if (admin) {
        await admin.from('ajo_invite_codes').update({ uses: inv.uses + 1 }).eq('id', inv.id);
      }
    }

    if (!circleId) return res.status(400).json({ error: 'circleId or code required' });

    const { data, error } = await ctx.sb.rpc('ajo_join_circle', {
      p_circle_id: circleId,
      p_reason: reason,
    });
    if (error) return res.status(400).json({ error: error.message });

    const { data: circle } = await ctx.sb.from('ajo_circles').select('*').eq('id', circleId).single();
    return res.status(200).json({ ok: true, member: data, circle });
  } catch (err) {
    console.error('[ajo/join]', err);
    return res.status(500).json({ error: err.message || 'Join failed' });
  }
}
