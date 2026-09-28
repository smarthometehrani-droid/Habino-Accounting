import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfigState {
  url: string;
  key: string;
  isConfigured: boolean;
  source: 'localStorage' | 'env' | 'server' | 'none';
}

/**
 * Clean and normalize a Supabase URL
 */
export const normalizeSupabaseUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim().replace(/['"]/g, '');
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
};

/**
 * In-memory fallback if server provides config at runtime
 */
let runtimeServerConfig: { url: string; key: string } | null = null;

/**
 * Read the current Supabase configuration from all available sources
 */
export const getSupabaseConfig = (): SupabaseConfigState => {
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
  const procEnv = (typeof process !== 'undefined' && typeof process.env === 'object' && process.env !== null) ? process.env : {};
  const envUrl = normalizeSupabaseUrl(metaEnv.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL || '');
  const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY || '').trim().replace(/['"]/g, '');

  const localUrl = typeof window !== 'undefined' ? normalizeSupabaseUrl(localStorage.getItem('habino_supabase_url') || '') : '';
  const localKey = typeof window !== 'undefined' ? (localStorage.getItem('habino_supabase_anon_key') || '').trim().replace(/['"]/g, '') : '';

  const serverUrl = runtimeServerConfig ? normalizeSupabaseUrl(runtimeServerConfig.url) : '';
  const serverKey = runtimeServerConfig ? runtimeServerConfig.key.trim() : '';

  const activeUrl = localUrl || envUrl || serverUrl;
  const activeKey = localKey || envKey || serverKey;

  const isConfigured = Boolean(
    activeUrl &&
    activeKey &&
    activeUrl.startsWith('http')
  );

  let source: SupabaseConfigState['source'] = 'none';
  if (localUrl && localKey) source = 'localStorage';
  else if (envUrl && envKey) source = 'env';
  else if (serverUrl && serverKey) source = 'server';

  return {
    url: activeUrl,
    key: activeKey,
    isConfigured,
    source
  };
};

// Safe fallback proxy for offline or mock mode
const createOfflineProxy = (): any => {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'from') {
        return (table: string) => {
          const chainable = {
            select: () => chainable,
            insert: (items: any) => Promise.resolve({ data: items, error: null }),
            upsert: (items: any) => Promise.resolve({ data: items, error: null }),
            update: () => chainable,
            delete: () => chainable,
            eq: () => chainable,
            neq: () => chainable,
            gt: () => chainable,
            gte: () => chainable,
            lt: () => chainable,
            lte: () => chainable,
            order: () => chainable,
            limit: () => Promise.resolve({ data: [], error: null, count: 0 }),
            single: () => Promise.resolve({ data: null, error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: [], error: null, count: 0 })
          };
          return chainable;
        };
      }
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithPassword: () => Promise.resolve({ data: null, error: null }),
          signOut: () => Promise.resolve({ error: null })
        };
      }
      if (prop === 'rpc') {
        return () => Promise.resolve({ data: null, error: null });
      }
      return () => Promise.resolve({ data: null, error: null });
    }
  };
  return new Proxy({}, handler);
};

let activeClient: SupabaseClient<any, 'public', any> | null = null;
let lastClientSignature: string = '';

export const getSupabaseClient = (): SupabaseClient<any, 'public', any> => {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return createOfflineProxy();
  }

  const currentSignature = `${config.url}::${config.key}`;
  if (!activeClient || lastClientSignature !== currentSignature) {
    activeClient = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    lastClientSignature = currentSignature;
  }
  return activeClient;
};

/**
 * Dynamic Proxy: any import { supabase } always routes to the currently active live client!
 */
export const supabase: SupabaseClient<any, 'public', any> = new Proxy({} as any, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const val = Reflect.get(client, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  }
});

/**
 * Boolean accessor and reactive variable for backwards compatibility
 */
export const getIsSupabaseConfigured = (): boolean => getSupabaseConfig().isConfigured;

export let isSupabaseConfigured: boolean = getSupabaseConfig().isConfigured;

/**
 * Update credentials dynamically at runtime (for local dev testing or UI configuration)
 */
export const setSupabaseCredentials = (
  url: string,
  anonKey: string
): { success: boolean; isConfigured: boolean; config: SupabaseConfigState } => {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = (anonKey || '').trim().replace(/['"]/g, '');

  if (typeof window !== 'undefined') {
    if (cleanUrl && cleanKey) {
      localStorage.setItem('habino_supabase_url', cleanUrl);
      localStorage.setItem('habino_supabase_anon_key', cleanKey);
    } else {
      localStorage.removeItem('habino_supabase_url');
      localStorage.removeItem('habino_supabase_anon_key');
    }
  }

  // Also broadcast to server backend if running in fullstack container
  if (typeof fetch !== 'undefined') {
    fetch('/api/config/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, key: cleanKey })
    }).catch(() => {});
  }

  // Invalidate cached client and refresh state
  activeClient = null;
  lastClientSignature = '';
  const newConfig = getSupabaseConfig();
  isSupabaseConfigured = newConfig.isConfigured;

  // Dispatch event for UI reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('habino_supabase_config_changed', { detail: newConfig }));
  }

  return {
    success: true,
    isConfigured: newConfig.isConfigured,
    config: newConfig
  };
};

/**
 * Asynchronously sync configuration with the server backend on application boot
 */
export const syncSupabaseConfigWithServer = async (): Promise<SupabaseConfigState> => {
  const current = getSupabaseConfig();
  if (current.isConfigured) {
    return current;
  }

  try {
    const res = await fetch('/api/config/supabase');
    if (res.ok) {
      const data = await res.json();
      if (data.isConfigured && data.url && data.key) {
        runtimeServerConfig = { url: data.url, key: data.key };
        activeClient = null;
        lastClientSignature = '';
        const updated = getSupabaseConfig();
        isSupabaseConfigured = updated.isConfigured;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('habino_supabase_config_changed', { detail: updated }));
        }
        return updated;
      }
    }
  } catch {
    // Non-blocking
  }
  return current;
};

// Initiate auto-sync on load
if (typeof window !== 'undefined') {
  syncSupabaseConfigWithServer().catch(() => {});
}

/**
 * Multi-layer live ping to verify network connectivity to Supabase
 * Tries direct browser ping, then server proxy fallback
 */
export const testSupabaseDirectConnection = async (
  customUrl?: string,
  customKey?: string
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  latencyMs: number;
  url: string;
  routeUsed: string;
  error?: string;
}> => {
  const config = getSupabaseConfig();
  const rawTargetUrl = customUrl?.trim() || config.url;
  const targetKey = customKey?.trim() || config.key;
  const targetUrl = normalizeSupabaseUrl(rawTargetUrl);

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return {
      ok: false,
      status: 0,
      statusText: 'No URL',
      latencyMs: 0,
      url: targetUrl || '',
      routeUsed: 'none',
      error: 'آدرس سرور Supabase تعریف نشده است. لطفاً آدرس را با https:// وارد نمایید.'
    };
  }

  const start = performance.now();

  // Layer 1: Direct browser ping to Supabase Auth Health endpoint
  try {
    const healthUrl = `${targetUrl}/auth/v1/health`;
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: targetKey ? { apikey: targetKey } : {}
    });

    const latencyMs = Math.round(performance.now() - start);

    if (res.status < 500) {
      return {
        ok: true,
        status: res.status,
        statusText: res.statusText || 'OK',
        latencyMs,
        url: targetUrl,
        routeUsed: 'browser_direct (/auth/v1/health)'
      };
    }
  } catch {
    // If direct health check fails, proceed to Layer 2
  }

  // Layer 2: Direct browser ping to Rest endpoint
  try {
    const restUrl = `${targetUrl}/rest/v1/`;
    const res = await fetch(restUrl, {
      method: 'GET',
      headers: {
        apikey: targetKey,
        Authorization: `Bearer ${targetKey}`
      }
    });

    const latencyMs = Math.round(performance.now() - start);

    // Any HTTP response (including 200, 204, 401, 403, 404) proves server was reached!
    if (res.status > 0 && res.status < 500) {
      return {
        ok: true,
        status: res.status,
        statusText: res.statusText,
        latencyMs,
        url: targetUrl,
        routeUsed: 'browser_direct (/rest/v1/)'
      };
    }
  } catch {
    // If browser direct fails (e.g. CORS or browser sandboxing), try Layer 3
  }

  // Layer 3: Fallback through server backend proxy /api/supabase/ping
  try {
    const proxyQuery = new URLSearchParams({ url: targetUrl, key: targetKey }).toString();
    const res = await fetch(`/api/supabase/ping?${proxyQuery}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        return {
          ok: true,
          status: data.status || 200,
          statusText: data.statusText || 'OK (via Server Bridge)',
          latencyMs: data.latencyMs || Math.round(performance.now() - start),
          url: targetUrl,
          routeUsed: 'server_bridge (/api/supabase/ping)'
        };
      }
    }
  } catch {
    // Layer 3 failed
  }

  const latencyMs = Math.round(performance.now() - start);
  return {
    ok: false,
    status: 0,
    statusText: 'Network Error',
    latencyMs,
    url: targetUrl,
    routeUsed: 'failed_all_layers',
    error: 'عدم دریافت پاسخ از سرور Supabase. لطفاً صحت آدرس، کلید ناشناس، و اتصال اینترنت/پروکسی را بررسی فرمایید.'
  };
};
