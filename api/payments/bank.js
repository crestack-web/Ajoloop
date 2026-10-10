/**
 * POST /api/payments/bank — save bank account for payouts
 * GET  /api/payments/bank — list user's bank accounts
 */
import { createClient } from '@supabase/supabase-js';
import { NG_BANKS } from './ng-banks.js';

function clients(token) {
  const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !token) return {};
  const user = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const admin = service ? createClient(url, service, { auth: { persistSession: false } }) : null;
  return { user, admin };
}

export default async function handler(req, res) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in required' });
    const { user: sb, admin } = clients(token);
    if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid session' });
    const uid = userData.user.id;

    if (req.method === 'GET') {
      const { data } = await sb.from('bank_accounts').select('id,bank_code,bank_name,account_number,account_name,is_default,created_at').eq('user_id', uid).order('created_at', { ascending: false });
      return res.status(200).json({ accounts: data || [] });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Require KYC pending or verified
    const { data: kyc } = await sb.from('kyc_profiles').select('status').eq('user_id', uid).maybeSingle();
    if (!kyc || (kyc.status !== 'pending' && kyc.status !== 'verified')) {
      return res.status(400).json({ error: 'Submit NIN verification before adding a bank account' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const accountNumber = String(body.accountNumber || '').replace(/\D/g, '');
    const accountName = String(body.accountName || '').trim().slice(0, 120);
    const bankCode = String(body.bankCode || '').trim();
    const bank = NG_BANKS.find(b => b.code === bankCode);
    const bankName = body.bankName || (bank && bank.name) || 'Bank';

    if (accountNumber.length !== 10) return res.status(400).json({ error: 'Account number must be 10 digits' });
    if (accountName.length < 3) return res.status(400).json({ error: 'Enter account name' });
    if (!bankCode) return res.status(400).json({ error: 'Select a bank' });

    const client = admin || sb;
    // Clear other defaults
    await client.from('bank_accounts').update({ is_default: false }).eq('user_id', uid);
    const { data, error } = await client.from('bank_accounts').upsert({
      user_id: uid,
      bank_code: bankCode,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      is_default: true,
    }, { onConflict: 'user_id,account_number,bank_code' }).select().maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, account: data });
  } catch (err) {
    console.error('[bank]', err);
    return res.status(500).json({ error: err.message });
  }
}
