/**
 * Supabase client — created when URL + anon key are available.
 * Env is resolved in vite.config.js from VITE_* or SUPABASE_* names.
 */
import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const hasSupabase = !!(url && anon && url.startsWith('http'));

export const supabase = hasSupabase
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      },
    })
  : null;

if (typeof console !== 'undefined') {
  if (hasSupabase) console.info('[AjoLoop] Backend connected:', url.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co');
  else console.info('[AjoLoop] Offline mode — set SUPABASE_PROJECT_URL + SUPABASE_ANON_KEY (or VITE_*) and redeploy');
}

export default supabase;
