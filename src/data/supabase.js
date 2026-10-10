/**
 * Supabase client — only created when env is configured.
 */
import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const hasSupabase = !!(url && anon);

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

export default supabase;
