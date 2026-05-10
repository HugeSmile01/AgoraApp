/**
 * useAuth.tsx — Mobile-compatible auth hook
 *
 * Drop-in replacement for the web version.
 * Uses AsyncStorage instead of localStorage.
 * Supabase session management is identical.
 */

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

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, captchaToken?: string) => Promise<any>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  activateOfflineMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function createLocalUser(): Promise<User> {
  let raw = await storage.getItem(LOCAL_USER_KEY);
  if (!raw) {
    const newUser: User = { id: 'local_' + Date.now(), email: 'local@agora.app', tier: 'libre' };
    raw = JSON.stringify(newUser);
    await storage.setItem(LOCAL_USER_KEY, raw);
  }
  return JSON.parse(raw);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session) {
          try {
            const localProfile = await getProfile();
            if (!localProfile) {
              const { pullFromCloud } = await import('@/lib/sync');
              await pullFromCloud(null);
            }
          } catch { /* non-fatal */ }
        }
        setLoading(false);
      }).catch(() => setLoading(false));

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } else {
      // Offline / Libre mode
      storage.getItem(LOCAL_USER_KEY).then(raw => {
        if (raw) setUser(JSON.parse(raw));
        setLoading(false);
      });
    }
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password, options });
    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured');
    // On native, use expo-web-browser OAuth flow
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  }

  async function signOut() {
    if (isSupabaseConfigured() && supabase) await supabase.auth.signOut();
    await storage.removeItem(LOCAL_USER_KEY);
    setUser(null);
  }

  async function activateOfflineMode() {
    const localUser = await createLocalUser();
    setUser(localUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut, activateOfflineMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
