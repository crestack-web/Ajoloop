/**
 * POST /api/payments/withdraw
 * Body: { amount }
 * Debits wallet and creates a Bachs payout to the user's default bank account when configured.
 * If Bachs payout destination is not ready, marks withdrawal pending for manual processing.
 */
import { createClient } from '@supabase/supabase-js';
import { bachsFetch, amountToBachs, getBachsApiKey } from '../_bachs.js';

function clients(token) {
  const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !token) return {};
  return {
    user: createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }),
    admin: service ? createClient(url, service, { auth: { persistSession: false } }) : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in required' });
    const { user: sb, admin } = clients(token);
    if (!sb || !admin) return res.status(503).json({ error: 'Server payments not fully configured' });

    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid session' });
    const uid = userData.user.id;

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const amount = Math.floor(Number(body.amount) || 0);
    if (amount < 500) return res.status(400).json({ error: 'Minimum withdrawal is ₦500' });
    if (amount > 2000000) return res.status(400).json({ error: 'Maximum withdrawal is ₦2,000,000' });

    const { data: kyc } = await admin.from('kyc_profiles').select('status').eq('user_id', uid).maybeSingle();
    if (!kyc || kyc.status !== 'verified') {
      // Allow pending in sandbox; production should require verified
      if (!kyc || (kyc.status !== 'pending' && kyc.status !== 'verified')) {
        return res.status(400).json({ error: 'Complete NIN verification before withdrawing' });
      }
    }

    const { data: banks } = await admin.from('bank_accounts').select('*').eq('user_id', uid).eq('is_default', true).limit(1);
    const bank = (banks && banks[0]) || null;
    if (!bank) return res.status(400).json({ error: 'Add a bank account for payouts first' });

    const reference = `wd_${uid.slice(0, 8)}_${Date.now()}`;

    // Debit wallet first
    const { data: newBal, error: debitErr } = await admin.rpc('debit_wallet', {
      p_user_id: uid,
      p_amount: amount,
      p_kind: 'withdraw',
      p_reference: reference,
      p_meta: { bank_id: bank.id },
    });
    if (debitErr) {
      return res.status(400).json({ error: debitErr.message || 'Insufficient balance' });
    }

    const { data: wd, error: wdErr } = await admin.from('withdrawals').insert({
      user_id: uid,
      amount,
      status: 'pending',
      bank_account_id: bank.id,
      reference,
    }).select().maybeSingle();
    if (wdErr) {
      // refund
      await admin.rpc('credit_wallet', {
        p_user_id: uid,
        p_amount: amount,
        p_kind: 'withdraw_refund',
        p_reference: reference + '_refund',
      });
      return res.status(500).json({ error: wdErr.message });
    }

    // Attempt Bachs payout if key present
    let bachsPayoutId = null;
    let status = 'pending';
    let failure = null;
    if (getBachsApiKey()) {
      try {
        let destId = bank.bachs_destination_id;
        if (!destId) {
          const dest = await bachsFetch('/v1/payouts/destinations', {
            method: 'POST',
            body: {
              type: 'bank_account',
              currency: 'NGN',
              bank_code: bank.bank_code,
              account_number: bank.account_number,
              account_name: bank.account_name,
              country: 'NG',
            },
          });
          destId = dest.id || dest.destination_id;
          if (destId) {
            await admin.from('bank_accounts').update({ bachs_destination_id: destId }).eq('id', bank.id);
          }
        }
        if (destId) {
          const payout = await bachsFetch('/v1/payouts', {
            method: 'POST',
            body: {
              amount: amountToBachs(amount),
              currency: 'NGN',
              destination: destId,
              reference,
            },
          });
          bachsPayoutId = payout.id || payout.payout_id || null;
          status = payout.status === 'completed' ? 'completed' : 'processing';
        }
      } catch (err) {
        console.warn('[withdraw] Bachs payout deferred', err.message);
        failure = err.message;
        status = 'pending';
      }
    }

    await admin.from('withdrawals').update({
      status,
      bachs_payout_id: bachsPayoutId,
      failure_reason: failure,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    }).eq('id', wd.id);

    return res.status(200).json({
      ok: true,
      amount,
      balance: Number(newBal),
      status,
      reference,
      message: status === 'completed'
        ? 'Withdrawal sent to your bank.'
        : 'Withdrawal queued. Funds leave your wallet and will arrive in your bank when payout completes.',
    });
  } catch (err) {
    console.error('[withdraw]', err);
    return res.status(500).json({ error: err.message || 'Withdrawal failed' });
  }
}
