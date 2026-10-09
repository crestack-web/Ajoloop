/**
 * Data client — single place the app talks to for persistence & (later) multiplayer.
 *
 * Mode:
 *   local  — localStorage via the engine Store (default, offline demo)
 *   remote — future Supabase / API (set VITE_API_MODE=remote)
 *
 * The engine already persists full game state through Store.save / Store.load.
 * This module is the seam for auth, sync, and server-owned social groups later.
 */

const mode = (import.meta.env?.VITE_API_MODE || 'local').toLowerCase();

export const api = {
  mode,

  /** Is this build offline-only? */
  get offline() {
    return mode === 'local' || !import.meta.env?.VITE_SUPABASE_URL;
  },

  /** Future: session / user id from auth provider */
  async getSession() {
    return null;
  },

  /** Future: pull server snapshot and merge */
  async pullState() {
    return null;
  },

  /** Future: push authoritative events (Ajo payments, group joins) */
  async pushEvent(_event) {
    return { ok: true, offline: true };
  },

  /** Future: real multiplayer group directory */
  async listPublicGroups() {
    return [];
  },
};

export default api;
