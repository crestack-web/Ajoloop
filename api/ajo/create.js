/**
 * POST /api/ajo/create
 * Body: { name, size, amount, freqDays, purpose, vis }
 */
import { requireUser, adminClient } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = String(body.name || '').trim().slice(0, 64);
    const size = Math.floor(Number(body.size) || 0);
    const amount = Math.floor(Number(body.amount) || 0);
    const freqDays = Math.floor(Number(body.freqDays) || 7);
    const purpose = String(body.purpose || 'general').slice(0, 32);
    const vis = body.vis === 'private' ? 'private' : 'public';

    if (name.length < 2) return res.status(400).json({ error: 'Name required (min 2 characters)' });
    if (size < 2 || size > 20) return res.status(400).json({ error: 'Size must be 2–20' });
    if (amount < 500) return res.status(400).json({ error: 'Minimum contribution is ₦500' });
    if (![1, 3, 7, 14, 30].includes(freqDays)) return res.status(400).json({ error: 'Invalid frequency' });

    const { data, error } = await ctx.sb.from('ajo_circles').insert({
      host_id: ctx.user.id,
      name,
      size,
      amount,
      freq_days: freqDays,
      purpose,
      vis,
      status: 'open',
    }).select().single();

    if (error) return res.status(400).json({ error: error.message });

    const { error: memErr } = await ctx.sb.from('ajo_members').insert({
      circle_id: data.id,
      user_id: ctx.user.id,
      role: 'host',
    });
    if (memErr) {
      // best-effort cleanup
      const admin = adminClient();
      if (admin) await admin.from('ajo_circles').delete().eq('id', data.id);
      return res.status(400).json({ error: memErr.message });
    }

    return res.status(201).json({ ok: true, circle: data });
  } catch (err) {
    console.error('[ajo/create]', err);
    return res.status(500).json({ error: err.message || 'Create failed' });
  }
}
