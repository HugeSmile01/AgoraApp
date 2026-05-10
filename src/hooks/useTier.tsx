/**
 * useTier.tsx — Mobile-compatible tier/subscription hook
 *
 * Identical logic to the web version; replaces localStorage
 * with AsyncStorage via storage adapter.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { hasFeature } from '@/lib/constants';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { storage } from '@/lib/storage';

type Tier = 'libre' | 'cloud' | 'pro';

interface TierContextValue {
  tier: Tier;
  setTier: (t: Tier) => void;
  can: (feature: string) => boolean;
  loginCount: number;
  daysSinceFirstUse: () => number;
  refreshTierFromDB: () => Promise<void>;
}

const TierContext = createContext<TierContextValue | null>(null);
const TIER_REFRESH_MS = 24 * 60 * 60 * 1000;

export function TierProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTierState] = useState<Tier>('libre');
  const [loginCount, setLoginCount] = useState(0);
  const [firstUseDate, setFirstUseDate] = useState(new Date().toISOString());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted values on mount
  useEffect(() => {
    (async () => {
      const savedTier = (await storage.getItem('agora_tier') as Tier) || 'libre';
      setTierState(savedTier);

      let firstUse = await storage.getItem('agora_first_use');
      if (!firstUse) {
        firstUse = new Date().toISOString();
        await storage.setItem('agora_first_use', firstUse);
      }
      setFirstUseDate(firstUse);

      const countRaw = await storage.getItem('agora_login_count');
      const count = parseInt(countRaw || '0') + 1;
      await storage.setItem('agora_login_count', count.toString());
      setLoginCount(count);
    })();
  }, []);

  async function setTier(newTier: Tier) {
    setTierState(newTier);
    await storage.setItem('agora_tier', newTier);
  }

  function can(feature: string): boolean {
    return hasFeature(tier, feature);
  }

  function daysSinceFirstUse(): number {
    const first = new Date(firstUseDate);
    return Math.floor((Date.now() - first.getTime()) / (1000 * 60 * 60 * 24));
  }

  const refreshTierFromDB = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const now = new Date();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier, subscription_status, subscription_expires_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profile) return;

      let effectiveTier: Tier = profile.tier;
      if (profile.tier !== 'libre' && profile.subscription_expires_at &&
          new Date(profile.subscription_expires_at) < now) {
        effectiveTier = 'libre';
      }

      if (effectiveTier !== tier) await setTier(effectiveTier);
    } catch { /* non-critical */ }
  }, [tier]);

  useEffect(() => {
    refreshTierFromDB();
    intervalRef.current = setInterval(refreshTierFromDB, TIER_REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refreshTierFromDB]);

  return (
    <TierContext.Provider value={{ tier, setTier, can, loginCount, daysSinceFirstUse, refreshTierFromDB }}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier(): TierContextValue {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error('useTier must be used within TierProvider');
  return ctx;
}
