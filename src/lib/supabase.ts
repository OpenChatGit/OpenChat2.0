import { createClient, Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'openchat-v2-auth' // Use custom key to avoid conflicts
  }
})

// Central Session Cache with high resilience
let currentSession: Session | null = null;
let sessionPromise: Promise<Session | null> | null = null;

// Immediately update cache on any auth change
supabase.auth.onAuthStateChange((_event, session) => {
  console.log(`[Supabase Global] Auth Event: ${_event}`, session?.user?.id);
  currentSession = session;
});

/**
 * Safely gets the current session with a lightning-fast internal timeout.
 */
export async function getSafeSession(): Promise<Session | null> {
  // 1. Memory First (Zero Latency)
  if (currentSession) return currentSession;

  // 2. Prevent Multiple Parallel Contention
  if (sessionPromise) return sessionPromise;

  sessionPromise = new Promise(async (resolve) => {
    // 3. Brutal 800ms Timeout for Storage-Locking Browser APIs
    const timeout = setTimeout(() => {
      console.warn('[Supabase Global] Lock timeout (800ms). Using guest/cached state.');
      resolve(currentSession);
    }, 800);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      currentSession = session;
      resolve(session);
    } catch (e) {
      console.error('[Supabase Global] Fetch failure:', e);
      resolve(currentSession);
    } finally {
      clearTimeout(timeout);
      sessionPromise = null;
    }
  });

  return sessionPromise;
}

export async function getSafeToken(): Promise<string | null> {
  const session = await getSafeSession();
  return session?.access_token || null;
}
