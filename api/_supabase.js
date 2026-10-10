import { createClient } from '@supabase/supabase-js';

export function projectUrl() {
  return process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function adminClient() {
  const url = projectUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function userClient(token) {
  const url = projectUrl();
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

export function bearer(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function requireUser(req, res) {
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  const sb = userClient(token);
  if (!sb) {
    res.status(503).json({ error: 'Supabase not configured' });
    return null;
  }
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
  return { sb, user: data.user, token };
}
