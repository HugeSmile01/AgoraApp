import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getProfile } from '@/lib/db';
import { storage } from '@/lib/storage';

const LOCAL_USER_KEY = 'agora_local_user';

interface User {
  id: string;
  email?: string;
  tier?: string;
}

type AuthMode = 'libre_local' | 'cloud_authenticated' | 'signed_out';
type LibreLifecycle = 'none' | 'local_seeded' | 'local_regenerated' | 'handoff_pending' | 'handoff_completed';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, captchaToken?: string) => Promise<any>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  activateOfflineMode: () => Promise<void>;
  authMode: AuthMode;
  libreLifecycle: LibreLifecycle;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('signed_out');
  const [libreLifecycle, setLibreLifecycle] = useState<LibreLifecycle>('none');

  async function ensureLibreSession(forceRegenerate = false): Promise<User> {
    const raw = forceRegenerate ? null : await storage.getItem(LOCAL_USER_KEY);
    if (raw) {
      setLibreLifecycle('local_seeded');
      return JSON.parse(raw);
    }

    const seeded: User = { id: `local_${Date.now()}`, email: 'local@agora.app', tier: 'libre' };
    await storage.setItem(LOCAL_USER_KEY, JSON.stringify(seeded));
    setLibreLifecycle(forceRegenerate ? 'local_regenerated' : 'local_seeded');
    return seeded;
  }

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthMode(session?.user ? 'cloud_authenticated' : 'signed_out');
        setLibreLifecycle(session?.user ? 'handoff_completed' : 'none');

        if (session) {
          try {
            const localProfile = await getProfile();
            if (!localProfile) {
              const { pullFromCloud } = await import('@/lib/sync');
              await pullFromCloud(null);
            }
          } catch {
            // non-fatal
          }
        }
        setLoading(false);
      }).catch(() => setLoading(false));

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
        setAuthMode(session?.user ? 'cloud_authenticated' : 'signed_out');
        setLibreLifecycle(session?.user ? 'handoff_completed' : 'none');
      });

      return () => subscription.unsubscribe();
    }

    ensureLibreSession(false).then(localUser => {
      setUser(localUser);
      setAuthMode('libre_local');
      setLoading(false);
    });
  }, []);

  async function signUp(email: string, password: string, captchaToken?: string) {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured');
    const options = captchaToken ? { captchaToken } : undefined;
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (error) throw error;
    return data;
  }

  async function signIn(email: string, password: string, captchaToken?: string) {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured');
    const options = captchaToken ? { captchaToken } : undefined;
    setLibreLifecycle('handoff_pending');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password, options });
    if (error) throw error;
    setLibreLifecycle('handoff_completed');
    return data;
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured');
    setLibreLifecycle('handoff_pending');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  }

  async function signOut() {
    if (isSupabaseConfigured() && supabase) await supabase.auth.signOut();
    await storage.removeItem(LOCAL_USER_KEY);
    setUser(null);
    setAuthMode('signed_out');
    setLibreLifecycle('none');
  }

  async function activateOfflineMode() {
    const localUser = await ensureLibreSession(true);
    setUser(localUser);
    setAuthMode('libre_local');
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut, activateOfflineMode, authMode, libreLifecycle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
