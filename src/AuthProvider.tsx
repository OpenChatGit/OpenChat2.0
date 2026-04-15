import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, getSafeSession } from './lib/supabase'
import { UserRole } from './components/VerifiedBadge'

export interface AppUser {
  id: string
  name: string
  fullname: string
  email?: string
  avatarUrl?: string
  isPro: boolean
  provider: 'supabase'
  role: UserRole
  isVerified: boolean
  stack?: string[]
}

interface AuthContextType {
  user: AppUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => void;
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const currentUserRef = useRef<string | null>(null)
  const isSyncingRef = useRef(false)

  const syncUser = async (session: any) => {
    if (!session?.user) {
      console.log('[AuthProvider] No session found, switching to Guest.');
      currentUserRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // Guard redundant sync
    if (session.user.id === currentUserRef.current && isAuthenticated) {
        setIsLoading(false);
        return;
    }

    console.log('[AuthProvider] User detected:', session.user.id);
    const emailMask = (email?: string) => {
        if (!email) return 'hidden';
        const [user, domain] = email.split('@');
        return `${user.slice(0, 1)}***@${domain}`;
    };

    const nameMetadata = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0];

    const initialUser: AppUser = {
      id: session.user.id,
      name: session.user.user_metadata?.user_name || nameMetadata || 'User',
      fullname: nameMetadata || 'User',
      email: emailMask(session.user.email), // MASKED FOR PRIVACY
      avatarUrl: session.user.user_metadata?.avatar_url,
      isPro: false,
      provider: 'supabase',
      role: 'user',
      isVerified: false,
      stack: []
    };

    setUser(initialUser);
    setIsAuthenticated(true);
    setIsLoading(false); 
    currentUserRef.current = session.user.id;

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('role, is_verified, display_name, avatar_url, stack')
        .eq('user_id', session.user.id)
        .abortSignal(AbortSignal.timeout(3000))
        .single();
      
      if (settings) {
        setUser(prev => prev ? {
          ...prev,
          name: settings.display_name || prev.name,
          avatarUrl: settings.avatar_url || prev.avatarUrl,
          role: settings.role as any,
          isVerified: settings.is_verified,
          isPro: settings.role === 'owner' || settings.role === 'admin',
          stack: settings.stack || []
        } : null);
      }

      // 1.2) BACKGROUND HEARTBEAT SYNC (Force Cloud Metadata -> DB Upgrade)
      const token = session.access_token;
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/memory-sync`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`,
              'X-User-Token': token,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              session_id: 'profile-sync-' + Date.now(),
              session_title: 'Auto Profile Upgrade',
              messages: []
          })
      }).then(() => console.log('[AuthProvider] Background profile sync triggered.'));

    } catch (e) {
      console.warn('[AuthProvider] Role background sync failed:', e);
    } finally {
        isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    // Initial check on mount
    getSafeSession().then(syncUser);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthProvider] Auth State Update:', _event);
      if (_event === 'SIGNED_OUT') {
          // Explicit sign out cleanup
          setUser(null);
          setIsAuthenticated(false);
          currentUserRef.current = null;
      } else {
        await syncUser(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    }
  }, []);

  const login = () => {};

  const logout = async () => {
    console.log('[AuthProvider] NUCLEAR LOGOUT INITIATED');
    
    try {
        // 1. Try a regular sign out with a very aggressive timeout
        await Promise.race([
            supabase.auth.signOut(),
            new Promise(resolve => setTimeout(resolve, 800))
        ]);

        // 2. FORCE CLEAR ALL SUPABASE STORAGE KEYS (Manually breaking any locks/persistence)
        // This is the key fix for "re-appearing" sessions on refresh
        Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase.auth.token') || key.startsWith('sb-')) {
                console.log('[AuthProvider] Purging storage key:', key);
                localStorage.removeItem(key);
            }
        });

        // 3. Clear cookies (Supabase sometimes uses them as backup)
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

    } catch (err) {
        console.error('[AuthProvider] Error during logout process:', err);
    } finally {
        // 4. Reset ALL local state immediately
        console.log('[AuthProvider] Local state nuked. Redirecting to guest state.');
        setUser(null);
        setIsAuthenticated(false);
        currentUserRef.current = null;
        
        // Final force: If we're in a persistent loop, this reload would clear memory
        // But let's try it without first.
    }
  };

  const refresh = async () => {
    const session = await getSafeSession();
    await syncUser(session);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
