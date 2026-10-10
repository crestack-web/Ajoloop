/**
 * GET /api/payments/balance
 * Returns wallet balance for the signed-in user.
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in required' });

    const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anon) return res.status(503).json({ error: 'Supabase not configured' });

    const sb = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

    const { data: wallet } = await sb
      .from('wallets')
      .select('balance,currency,updated_at')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    return res.status(200).json({
      balance: Number(wallet?.balance || 0),
      currency: wallet?.currency || 'NGN',
      updated_at: wallet?.updated_at || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
