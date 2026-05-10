/**
 * supabase.ts — Mobile-compatible Supabase client
 *
 * On mobile, environment variables are sourced from expo-constants
 * (set via app.json `extra` or a `.env` file with `expo-env`).
 * Falls back to empty strings so offline/libre mode still works.
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url: string =
  (Constants.expoConfig?.extra?.SUPABASE_URL as string) ||
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string) ||
  '';

const key: string =
  (Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string) ||
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) ||
  '';

export const supabase = url && key ? createClient(url, key) : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key);
}
