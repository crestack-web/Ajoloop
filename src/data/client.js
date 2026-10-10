/**
 * Data client — localStorage offline OR Supabase online.
 *
 * Enable online:
 *   VITE_API_MODE=remote
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 *
 * See docs/BACKEND.md and supabase/schema.sql
 */
import { supabase, hasSupabase } from './supabase.js';

const envMode = (import.meta.env?.VITE_API_MODE || '').toLowerCase();
// Prefer real backend whenever Supabase is configured (unless explicitly local)
const mode = envMode === 'local'
  ? 'local'
  : (hasSupabase ? 'remote' : 'local');

let _session = null;
let _saveTimer = null;
let _lastPush = 0;

export const api = {
  mode,
  get offline() {
    return mode !== 'remote' || !hasSupabase;
  },
  get online() {
    return !api.offline;
  },
  get session() {
    return _session;
  },
  get userId() {
    return _session?.user?.id || null;
  },

  async init() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    _session = data?.session || null;
    supabase.auth.onAuthStateChange((_event, session) => {
      _session = session;
    });
    return _session;
  },

  async getSession() {
    if (!supabase) return null;
    if (_session) return _session;
    const { data } = await supabase.auth.getSession();
    _session = data?.session || null;
    return _session;
  },

  /**
   * Sign up with email + password. username stored in user metadata + profiles.
   */
  async signUp({ email, password, username, displayName }) {
    if (!supabase) return { error: 'Online mode not configured' };
    username = String(username || '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);
    if (username.length < 3) return { error: 'Username needs at least 3 characters' };
    if (!email || !password || password.length < 6) {
      return { error: 'Email and password (6+ chars) required' };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        },
      },
    });
    if (error) return { error: error.message };
    _session = data.session;
    // Ensure profile row (trigger may already create it)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        display_name: displayName || username,
        updated_at: new Date().toISOString(),
      });
    }
    return { user: data.user, session: data.session };
  },

  async signIn({ email, password }) {
    if (!supabase) return { error: 'Online mode not configured' };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: error.message };
    _session = data.session;
    return { user: data.user, session: data.session };
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    _session = null;
  },

  /** Load cloud game state JSON for current user */
  async pullState() {
    if (!supabase || !_session?.user) return null;
    const { data, error } = await supabase
      .from('game_states')
      .select('state, version, updated_at')
      .eq('user_id', _session.user.id)
      .maybeSingle();
    if (error) {
      console.warn('pullState', error.message);
      return null;
    }
    return data?.state || null;
  },

  /** Push full game state (debounced by caller) */
  async pushState(state) {
    if (!supabase || !_session?.user || !state) return { ok: false, offline: true };
    const payload = {
      user_id: _session.user.id,
      state,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('game_states').upsert(payload, {
      onConflict: 'user_id',
    });
    if (error) {
      console.warn('pushState', error.message);
      return { ok: false, error: error.message };
    }
    // Mirror profile fields for discovery
    try {
      const p = state.p || {};
      await supabase.from('profiles').upsert({
        id: _session.user.id,
        username: p.username || 'player',
        display_name: p.name || p.username || 'Player',
        avatar: p.avatar || null,
        area: (p.home && p.home.area) || p.area || null,
        lat: p.lat ?? (p.home && p.home.lat) ?? null,
        lng: p.lng ?? (p.home && p.home.lng) ?? null,
        trust: p.trust ?? 50,
        rep: p.rep ?? 50,
        interests: p.interests || p.ints || [],
        business_status: p.businessStatus || null,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('profile mirror', e);
    }
    _lastPush = Date.now();
    return { ok: true };
  },

  /** Debounced cloud save — call from commit() */
  schedulePush(state, delayMs = 1200) {
    if (api.offline) return;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      api.pushState(state).catch(() => {});
    }, delayMs);
  },

  async pushEvent(_event) {
    if (api.offline) return { ok: true, offline: true };
    // Reserved for authoritative server events (Ajo payments, etc.)
    return { ok: true };
  },

  async listPublicGroups() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('groups_public')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(40);
    if (error) return [];
    return data || [];
  },

  async publishGroup(g) {
    if (!supabase || !_session?.user || !g) return;
    await supabase.from('groups_public').upsert({
      id: String(g.id),
      owner_id: _session.user.id,
      name: g.name,
      description: g.desc || '',
      category: g.cat || null,
      area: g.area || null,
      member_count: g.memberCount || Object.keys(g.mem || {}).length || 1,
      vis: g.vis || 'public',
      updated_at: new Date().toISOString(),
    });
  },

  async listProfiles({ area, q, limit = 20 } = {}) {
    if (!supabase) return [];
    let query = supabase.from('profiles').select('id,username,display_name,avatar,area,trust,rep,interests').limit(limit);
    if (area) query = query.eq('area', area);
    if (q) query = query.ilike('username', `%${q}%`);
    const { data } = await query;
    return data || [];
  },

  async sendFriendRequest(toUserId) {
    if (!supabase || !_session?.user) return { error: 'Not signed in' };
    const { error } = await supabase.from('friendships').insert({
      from_id: _session.user.id,
      to_id: toUserId,
      status: 'pending',
    });
    if (error) return { error: error.message };
    return { ok: true };
  },

  async respondFriendRequest(id, accept) {
    if (!supabase || !_session?.user) return { error: 'Not signed in' };
    const { error } = await supabase
      .from('friendships')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', id)
      .eq('to_id', _session.user.id);
    if (error) return { error: error.message };
    return { ok: true };
  },

  async sendMessage(toUserId, body) {
    if (!supabase || !_session?.user) return { error: 'Not signed in' };
    body = String(body || '').trim().slice(0, 2000);
    if (!body) return { error: 'Empty message' };
    const { error } = await supabase.from('messages').insert({
      from_id: _session.user.id,
      to_id: toUserId,
      body,
    });
    if (error) return { error: error.message };
    return { ok: true };
  },

  async loadThread(otherUserId, limit = 50) {
    if (!supabase || !_session?.user) return [];
    const uid = _session.user.id;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(from_id.eq.${uid},to_id.eq.${otherUserId}),and(from_id.eq.${otherUserId},to_id.eq.${uid})`
      )
      .order('created_at', { ascending: true })
      .limit(limit);
    return data || [];
  },
};


  /** Real NGN wallet balance from Supabase */
  async getWalletBalance() {
    if (!supabase || !_session?.user) return { balance: 0, currency: 'NGN' };
    const { data } = await supabase
      .from('wallets')
      .select('balance,currency,updated_at')
      .eq('user_id', _session.user.id)
      .maybeSingle();
    return {
      balance: Number(data?.balance || 0),
      currency: data?.currency || 'NGN',
      updated_at: data?.updated_at || null,
    };
  },

  /**
   * Start Bachs checkout for wallet top-up.
   * Returns { checkout_url } — redirect the browser there.
   */
  async createTopUpCheckout(amount) {
    if (!supabase) return { error: 'Online mode not configured' };
    const session = await this.getSession();
    if (!session?.access_token) return { error: 'Sign in required for payments' };
    amount = Math.floor(Number(amount) || 0);
    if (amount < 100) return { error: 'Minimum top-up is ₦100' };
    if (amount > 500000) return { error: 'Maximum top-up is ₦500,000' };
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount,
          origin: typeof location !== 'undefined' ? location.origin : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data.error || `Payment failed (${res.status})` };
      return data;
    } catch (e) {
      return { error: e.message || 'Network error starting payment' };
    }
  },

  /** Apply real wallet balance into the in-game cash display */
  async syncWalletToGame() {
    if (typeof G === 'undefined' || !G?.p) return null;
    const w = await this.getWalletBalance();
    if (w && Number.isFinite(w.balance)) {
      G.p.cash = Math.floor(w.balance);
      G.p.walletCurrency = w.currency || 'NGN';
      G.p.walletSyncedAt = Date.now();
    }
    return w;
  },

export default api;
