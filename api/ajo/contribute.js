/**
 * POST /api/ajo/contribute
 * Body: { circleId, cycle? }
 * Debits wallet (service role) then records confirmed contribution.
 * Does NOT trust client amount — uses circle.amount from DB.
 */
import { requireUser, adminClient } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ctx = await requireUser(req, res);
    if (!ctx) return;
    const admin = adminClient();
    if (!admin) return res.status(503).json({ error: 'Server not configured for contributions' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const circleId = body.circleId;
    if (!circleId) return res.status(400).json({ error: 'circleId required' });

    const { data: circle, error: cErr } = await admin.from('ajo_circles').select('*').eq('id', circleId).single();
    if (cErr || !circle) return res.status(404).json({ error: 'Circle not found' });
    if (circle.status !== 'active') return res.status(400).json({ error: 'Circle is not active' });

    const { data: mem } = await admin.from('ajo_members').select('id').eq('circle_id', circleId).eq('user_id', ctx.user.id).maybeSingle();
    if (!mem) return res.status(403).json({ error: 'Not a member of this circle' });

    const cycle = body.cycle != null ? Math.floor(Number(body.cycle)) : circle.cycle;
    const amount = Number(circle.amount);

    // Already paid?
    const { data: existing } = await admin
      .from('ajo_contributions')
      .select('id,status')
      .eq('circle_id', circleId)
      .eq('user_id', ctx.user.id)
      .eq('cycle', cycle)
      .maybeSingle();
    if (existing && existing.status === 'confirmed') {
      return res.status(400).json({ error: 'Already contributed this cycle' });
    }

    const ref = `ajo_${circleId.slice(0, 8)}_${cycle}_${ctx.user.id.slice(0, 8)}_${Date.now()}`;

    const { data: newBal, error: debitErr } = await admin.rpc('debit_wallet', {
      p_user_id: ctx.user.id,
      p_amount: amount,
      p_kind: 'ajo_contribution',
      p_reference: ref,
      p_meta: { circle_id: circleId, cycle },
    });
    if (debitErr) {
      return res.status(400).json({ error: debitErr.message || 'Insufficient wallet balance' });
    }

    const { data: contrib, error: recErr } = await admin.rpc('ajo_record_contribution', {
      p_circle_id: circleId,
      p_user_id: ctx.user.id,
      p_cycle: cycle,
      p_amount: amount,
      p_payment_ref: ref,
    });
    if (recErr) {
      // refund
      await admin.rpc('credit_wallet', {
        p_user_id: ctx.user.id,
        p_amount: amount,
        p_kind: 'ajo_contribution_refund',
        p_reference: ref + '_refund',
      });
      return res.status(500).json({ error: recErr.message });
    }

    return res.status(200).json({
      ok: true,
      contribution: contrib,
      balance: Number(newBal),
      amount,
      cycle,
      reference: ref,
    });
  } catch (err) {
    console.error('[ajo/contribute]', err);
    return res.status(500).json({ error: err.message || 'Contribution failed' });
  }
}
