// src/lib/api.js
// Thin client for the Express REST API.
//
// Features:
//   • Attaches the current JWT (access token) to every request.
//   • On 401, attempts one silent token refresh then retries.
//   • When the device is offline, mutating requests (POST/PUT/PATCH/DELETE)
//     are enqueued in IndexedDB via src/lib/offline.js so they are flushed
//     once connectivity is restored.
//   • Read requests (GET) are served from the Workbox API cache when offline.

import { buildAuthHeaders } from '@/middleware/auth';
import { enqueueSync } from '@/lib/offline';
import { refreshSession } from '@/lib/jwt-manager';

const BASE = '/api';

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function apiFetch(path, options = {}, { retry = true } = {}) {
  const headers = await buildAuthHeaders();
  const merged = {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  };

  let res;
  try {
    res = await fetch(`${BASE}${path}`, merged);
  } catch {
    // Network failure — offline or server unreachable.
    throw new OfflineError(`Network error: ${path}`);
  }

  if (res.status === 401 && retry) {
    // Try a silent refresh and retry once.
    const session = await refreshSession();
    if (session) {
      return apiFetch(path, options, { retry: false });
    }
  }

  if (!res.ok) {
    let payload;
    try { payload = await res.json(); } catch { payload = {}; }
    const err = new Error(payload?.message || payload?.error || `API error ${res.status}`);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export const api = {
  get(path, params) {
    const url = params ? `${path}?${new URLSearchParams(params)}` : path;
    return apiFetch(url, { method: 'GET' });
  },

  async post(path, body, syncMeta) {
    try {
      return await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
      if (err instanceof OfflineError && syncMeta) {
        await enqueueSync('insert', syncMeta.table, { ...body, ...syncMeta.payload });
        return { queued: true };
      }
      throw err;
    }
  },

  async put(path, body, syncMeta) {
    try {
      return await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
    } catch (err) {
      if (err instanceof OfflineError && syncMeta) {
        await enqueueSync('update', syncMeta.table, { ...body, ...syncMeta.payload });
        return { queued: true };
      }
      throw err;
    }
  },

  async patch(path, body, syncMeta) {
    try {
      return await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
    } catch (err) {
      if (err instanceof OfflineError && syncMeta) {
        await enqueueSync('update', syncMeta.table, { ...body, ...syncMeta.payload });
        return { queued: true };
      }
      throw err;
    }
  },

  async delete(path, syncMeta) {
    try {
      return await apiFetch(path, { method: 'DELETE' });
    } catch (err) {
      if (err instanceof OfflineError && syncMeta) {
        await enqueueSync('delete', syncMeta.table, syncMeta.payload);
        return { queued: true };
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------------------------
// Refresh token exchange
// Exchanges the current Supabase session for server-issued tokens.
// ---------------------------------------------------------------------------

export async function exchangeToken() {
  return apiFetch('/auth/token', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// OfflineError
// ---------------------------------------------------------------------------

export class OfflineError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OfflineError';
  }
}
