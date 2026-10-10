/**
 * GET /api/ajo/list — public open circles + mine
 */
import { requireUser } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;

    const { data: open, error: e1 } = await ctx.sb
      .from('ajo_circles')
      .select('*, ajo_members(count)')
      .eq('status', 'open')
      .eq('vis', 'public')
      .order('created_at', { ascending: false })
      .limit(50);
    if (e1) return res.status(400).json({ error: e1.message });

    const { data: mine, error: e2 } = await ctx.sb
      .from('ajo_members')
      .select('circle_id, role, ajo_circles(*)')
      .eq('user_id', ctx.user.id);
    if (e2) return res.status(400).json({ error: e2.message });

    return res.status(200).json({
      ok: true,
      open: open || [],
      mine: (mine || []).map(m => ({ role: m.role, circle: m.ajo_circles })),
    });
  } catch (err) {
    console.error('[ajo/list]', err);
    return res.status(500).json({ error: err.message });
  }
}
