import { defineConfig, loadEnv } from 'vite';

/**
 * Map common Vercel / Supabase env names into VITE_* so the client bundle
 * receives them. Supports:
 *   VITE_SUPABASE_URL  | SUPABASE_PROJECT_URL | SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY | SUPABASE_ANON_KEY | SUPABASE_KEY
 *   VITE_API_MODE | API_MODE  (default remote when keys present)
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const url =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_PROJECT_URL ||
    env.SUPABASE_URL ||
    '';
  const anon =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_KEY ||
    '';
  const apiMode =
    env.VITE_API_MODE ||
    env.API_MODE ||
    (url && anon ? 'remote' : 'local');

  return {
    root: '.',
    publicDir: 'public',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anon),
      'import.meta.env.VITE_API_MODE': JSON.stringify(apiMode),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          main: 'index.html',
        },
      },
    },
    server: {
      port: 5173,
      open: true,
    },
  };
});
