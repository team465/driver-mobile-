import { createClient } from '@supabase/supabase-js';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// AsyncStorage v3 requires a native dev build. Falls back to in-memory storage
// when the native module is unavailable (Expo Go).
const memStore = new Map<string, string>();
const asyncStorageAvailable =
  Platform.OS !== 'web' && NativeModules.RNCAsyncStorage != null;

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!asyncStorageAvailable) return memStore.get(key) ?? null;
    try { return await AsyncStorage.getItem(key); } catch { return memStore.get(key) ?? null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memStore.set(key, value);
    if (!asyncStorageAvailable) return;
    try { await AsyncStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    memStore.delete(key);
    if (!asyncStorageAvailable) return;
    try { await AsyncStorage.removeItem(key); } catch {}
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: safeStorage } : {}),
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
