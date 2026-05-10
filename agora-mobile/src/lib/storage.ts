/**
 * storage.ts
 * Mobile-compatible storage adapter for Agora Business OS.
 *
 * Replaces:
 *   - localStorage  → AsyncStorage (react-native-async-storage)
 *   - IndexedDB     → AsyncStorage with JSON-encoded stores (sufficient
 *                     for the data volumes Agora handles; upgrade path:
 *                     expo-sqlite for larger datasets)
 *
 * Keeps the same ergonomics as the web version so the rest of the
 * codebase needs minimal changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage shim  (drop-in for localStorage.get/set/remove/getItem etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // silently ignore quota errors on mobile
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch { /* ignore */ }
  },

  /** Synchronous-style helpers (resolve immediately from in-memory cache) */
  cache: {} as Record<string, string | null>,
};

// ─────────────────────────────────────────────────────────────────────────────
// In-memory "IndexedDB" store
// All data is JSON-serialised and persisted via AsyncStorage.
// Key scheme:  agora_store_<storeName>_<recordId>
//              agora_store_<storeName>__index  (array of all IDs)
// ─────────────────────────────────────────────────────────────────────────────

async function indexKey(storeName: string) {
  return `agora_store_${storeName}__index`;
}

async function recordKey(storeName: string, id: string) {
  return `agora_store_${storeName}_${id}`;
}

async function getIndex(storeName: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(await indexKey(storeName));
  return raw ? JSON.parse(raw) : [];
}

async function setIndex(storeName: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(await indexKey(storeName), JSON.stringify(ids));
}

export const db = {
  async getAll(storeName: string): Promise<any[]> {
    const ids = await getIndex(storeName);
    const pairs = await AsyncStorage.multiGet(
      await Promise.all(ids.map(id => recordKey(storeName, id)))
    );
    return pairs
      .map(([, v]) => (v ? JSON.parse(v) : null))
      .filter(Boolean);
  },

  async get(storeName: string, id: string): Promise<any | null> {
    const key = await recordKey(storeName, id);
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },

  async put(storeName: string, record: any): Promise<void> {
    const id = String(record.id ?? record.key);
    const key = await recordKey(storeName, id);
    await AsyncStorage.setItem(key, JSON.stringify(record));
    const ids = await getIndex(storeName);
    if (!ids.includes(id)) {
      ids.push(id);
      await setIndex(storeName, ids);
    }
  },

  async delete(storeName: string, id: string): Promise<void> {
    const key = await recordKey(storeName, id);
    await AsyncStorage.removeItem(key);
    const ids = await getIndex(storeName);
    await setIndex(storeName, ids.filter(i => i !== id));
  },

  async clear(storeName: string): Promise<void> {
    const ids = await getIndex(storeName);
    const keys = await Promise.all(ids.map(id => recordKey(storeName, id)));
    await AsyncStorage.multiRemove(keys);
    await setIndex(storeName, []);
  },

  async count(storeName: string): Promise<number> {
    return (await getIndex(storeName)).length;
  },

  async getAllByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    const all = await db.getAll(storeName);
    return all.filter(r => r[indexName] === value);
  },
};
