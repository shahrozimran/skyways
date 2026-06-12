/* ============================================================
   api.js — Shared API client, Auth management, utilities
   ============================================================ */

export const API_BASE = '/api';

// ── Token / Auth Management ───────────────────────────────
export const Auth = {
  getToken()     { if (typeof window === 'undefined') return null; return localStorage.getItem('sb_token'); },
  setToken(t)    { localStorage.setItem('sb_token', t); },
  removeToken()  { localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user'); localStorage.removeItem('sb_passenger'); },
  getUser()      { try { return JSON.parse(localStorage.getItem('sb_user')) || null; } catch { return null; } },
  setUser(u)     { localStorage.setItem('sb_user', JSON.stringify(u)); },
  getPassenger() { try { return JSON.parse(localStorage.getItem('sb_passenger')) || null; } catch { return null; } },
  setPassenger(p){ localStorage.setItem('sb_passenger', JSON.stringify(p)); },
  isLoggedIn()   { return !!this.getToken(); },
  isAdmin()      { const u = this.getUser(); return u && u.is_admin; },
  logout()       { this.removeToken(); window.location.href = '/login'; },
};

// ── API Client ────────────────────────────────────────────
export const Api = {
  async request(method, endpoint, body = null, requireAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (requireAuth) {
      const token = Auth.getToken();
      if (!token) { window.location.href = '/login'; return null; }
      headers['Authorization'] = `Bearer ${token}`;
    }
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      if (err.message && (err.message.includes('401') || err.message.includes('Invalid or expired'))) {
        Auth.logout();
      }
      throw err;
    }
  },
  get(ep, auth = false)        { return this.request('GET', ep, null, auth); },
  post(ep, body, auth = false) { return this.request('POST', ep, body, auth); },
  put(ep, body, auth = false)  { return this.request('PUT', ep, body, auth); },
  del(ep, auth = false)        { return this.request('DELETE', ep, null, auth); },
};

// ── Session Storage ───────────────────────────────────────
export const SearchStore = {
  set(data)  { if (typeof window !== 'undefined') sessionStorage.setItem('search_params', JSON.stringify(data)); },
  get()      { try { return JSON.parse(sessionStorage.getItem('search_params')) || {}; } catch { return {}; } },
  clear()    { sessionStorage.removeItem('search_params'); },
};

export const BookingStore = {
  set(data)  { if (typeof window !== 'undefined') sessionStorage.setItem('booking_data', JSON.stringify(data)); },
  get()      { try { return JSON.parse(sessionStorage.getItem('booking_data')) || {}; } catch { return {}; } },
  clear()    { sessionStorage.removeItem('booking_data'); },
};

// ── Formatting utilities ──────────────────────────────────
export function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(interval) {
  if (!interval) return '—';
  const match = interval.match(/(\d+):(\d+)/);
  if (match) return `${match[1]}h ${match[2]}m`;
  const hMatch = interval.match(/(\d+)\s*hour/);
  const mMatch = interval.match(/(\d+)\s*min/);
  return `${hMatch ? hMatch[1] + 'h' : ''} ${mMatch ? mMatch[1] + 'm' : ''}`.trim();
}

export function formatPrice(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function getStatusBadge(status) {
  const map = {
    'Confirmed': 'badge-green',
    'Cancelled': 'badge-red',
    'Pending':   'badge-orange',
    'Scheduled': 'badge-white',
    'Delayed':   'badge-orange',
    'Completed': 'badge-gray',
    'Success':   'badge-green',
    'Refunded':  'badge-orange',
    'Failed':    'badge-red',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

export function getAirlineIcon(code) {
  const icons = { PK: '🇵🇰', EK: '🇦🇪', BA: '🇬🇧', SV: '🇸🇦' };
  return icons[code] || '✈️';
}
