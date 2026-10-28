/**
 * Unified IndexedDB Compatibility Adapter (Powered by Dexie.js)
 * 
 * Routes all legacy idb/aura_wav_db calls directly to the unified Dexie database,
 * preventing dual-database divergence, eliminating duplicate writes, and preserving
 * 100% backward compatibility.
 */

import {
  dexieDB,
  bulkSaveTracksToDexie,
  getAllTracksFromDexie,
  getAudioBlobFromDexie,
  saveLyricsToDexie,
  getLyricsFromDexie,
} from './dexieDB';
import { Track, Playlist } from '../types';

export interface IDBCompatibleStore {
  get(key: string): Promise<any>;
  put(value: any, key?: string): Promise<any>;
  delete(key: string): Promise<void>;
  getAll(): Promise<any[]>;
  clear(): Promise<void>;
}

class DexieStoreAdapter implements IDBCompatibleStore {
  constructor(private table: any, private keyField = 'id') {}

  async get(key: string): Promise<any> {
    if (this.keyField === 'key') {
      const rec = await this.table.get(key);
      return rec ? rec.value : undefined;
    }
    const rec = await this.table.get(key);
    return rec;
  }

  async put(value: any, key?: string): Promise<any> {
    if (this.keyField === 'key') {
      const actualKey = key || value?.key;
      await this.table.put({ key: actualKey, value });
      return actualKey;
    }
    await this.table.put(value);
    return value?.[this.keyField];
  }

  async delete(key: string): Promise<void> {
    await this.table.delete(key);
  }

  async getAll(): Promise<any[]> {
    if (this.keyField === 'key') {
      const records = await this.table.toArray();
      return records.map((r: any) => r.value);
    }
    return await this.table.toArray();
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }

  async getAllKeys(): Promise<any[]> {
    return await this.table.toCollection().primaryKeys();
  }
}

class DexieDatabaseAdapter {
  private stores: Record<string, DexieStoreAdapter>;

  constructor() {
    this.stores = {
      tracks: new DexieStoreAdapter(dexieDB.tracks, 'id'),
      audioBlobs: new DexieStoreAdapter(dexieDB.audioBlobs, 'id'),
      artworkBlobs: new DexieStoreAdapter(dexieDB.artworkBlobs, 'id'),
      playlists: new DexieStoreAdapter(dexieDB.playlists, 'id'),
      settings: new DexieStoreAdapter(dexieDB.settings, 'key'),
      lyrics: new DexieStoreAdapter(dexieDB.lyrics, 'id'),
      favorites: new DexieStoreAdapter(dexieDB.favorites, 'id'),
    };
  }

  async get(storeName: string, key: string): Promise<any> {
    const store = this.stores[storeName];
    if (!store) return undefined;
    return await store.get(key);
  }

  async put(storeName: string, value: any, key?: string): Promise<any> {
    const store = this.stores[storeName];
    if (!store) return undefined;
    return await store.put(value, key);
  }

  async delete(storeName: string, key: string): Promise<void> {
    const store = this.stores[storeName];
    if (store) {
      await store.delete(key);
    }
  }

  async getAll(storeName: string): Promise<any[]> {
    const store = this.stores[storeName];
    if (!store) return [];
    return await store.getAll();
  }

  async getAllKeys(storeName: string): Promise<any[]> {
    const store = this.stores[storeName];
    if (!store) return [];
    return await store.getAllKeys();
  }

  async clear(storeName: string): Promise<void> {
    const store = this.stores[storeName];
    if (store) {
      await store.clear();
    }
  }

  transaction(storeNames: string | string[], _mode: 'readonly' | 'readwrite' = 'readwrite') {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return {
      store: names.length === 1 ? this.stores[names[0]] : undefined,
      objectStore: (name: string) => this.stores[name],
      done: Promise.resolve(),
    };
  }
}

let unifiedAdapterInstance: DexieDatabaseAdapter | null = null;

export const getDB = async (): Promise<any> => {
  if (!unifiedAdapterInstance) {
    unifiedAdapterInstance = new DexieDatabaseAdapter();
  }
  return unifiedAdapterInstance;
};

// Re-export high-performance helpers
export async function saveTracks(tracks: Track[], blobs?: { id: string; blob: Blob }[]): Promise<void> {
  const cleanTracks = tracks.map(({ file: _file, blob: _blob, ...rest }) => rest as Track);
  await bulkSaveTracksToDexie(cleanTracks, blobs || []);
}

export async function getAllTracks(): Promise<Track[]> {
  return await getAllTracksFromDexie();
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  return await getAudioBlobFromDexie(id);
}

export async function deleteAudioBlob(id: string): Promise<void> {
  await dexieDB.audioBlobs.delete(id);
}

export async function getSetting<T = any>(key: string): Promise<T | null> {
  const record = await dexieDB.settings.get(key);
  return record ? (record.value as T) : null;
}

export async function saveSetting(key: string, value: any): Promise<void> {
  await dexieDB.settings.put({ key, value });
}

export async function getPlaylists(): Promise<Playlist[]> {
  return await dexieDB.playlists.toArray();
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  await dexieDB.playlists.put(playlist);
}

export async function deletePlaylist(id: string): Promise<void> {
  await dexieDB.playlists.delete(id);
}

export async function getFavorites(): Promise<string[]> {
  const favs = await dexieDB.favorites.toArray();
  return favs.map((f) => f.id);
}

export async function addFavorite(id: string): Promise<void> {
  await dexieDB.favorites.put({ id, addedAt: Date.now() });
}

export async function removeFavorite(id: string): Promise<void> {
  await dexieDB.favorites.delete(id);
}

export { saveLyricsToDexie, getLyricsFromDexie };
