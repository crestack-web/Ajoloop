/**
 * POST /api/kyc/submit
 * Body: { nin, fullName }
 * Stores hashed NIN + last4, status pending. Real ID verification can be plugged in later.
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function userClient(token) {
  const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

function admin() {
  const url = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashNin(nin) {
  const salt = process.env.KYC_NIN_SALT || 'ajoloop-kyc-v1';
  return crypto.createHash('sha256').update(salt + String(nin)).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in required' });

    const sb = userClient(token);
    if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid session' });
    const user = userData.user;

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const nin = String(body.nin || '').replace(/\D/g, '');
    const fullName = String(body.fullName || '').trim().slice(0, 120);
    if (nin.length !== 11) return res.status(400).json({ error: 'NIN must be 11 digits' });
    if (fullName.length < 3) return res.status(400).json({ error: 'Enter your full legal name' });

    const row = {
      user_id: user.id,
      nin_last4: nin.slice(-4),
      nin_hash: hashNin(nin),
      full_name: fullName,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Prefer service role upsert; fall back to user client
    const ad = admin();
    const client = ad || sb;
    const { error } = await client.from('kyc_profiles').upsert(row, { onConflict: 'user_id' });
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      ok: true,
      status: 'pending',
      nin_last4: row.nin_last4,
      full_name: fullName,
      message: 'NIN submitted for verification. You will be notified when approved.',
    });
  } catch (err) {
    console.error('[kyc]', err);
    return res.status(500).json({ error: err.message || 'KYC submit failed' });
  }
}
