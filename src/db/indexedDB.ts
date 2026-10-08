import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track, Playlist } from '../types';

interface AuraDB extends DBSchema {
  tracks: {
    key: string;
    value: Track;
    indexes: { 'by-artist': string; 'by-album': string; 'by-date': number };
  };
  audioBlobs: {
    key: string;
    value: { id: string; blob: Blob };
  };
  playlists: {
    key: string;
    value: Playlist;
  };
  favorites: {
    key: string;
    value: { id: string; addedAt: number };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'aura_wav_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AuraDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<AuraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Tracks store
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('by-artist', 'artist');
          trackStore.createIndex('by-album', 'album');
          trackStore.createIndex('by-date', 'dateAdded');
        }
        // Audio Blobs store (for offline playback of imported songs)
        if (!db.objectStoreNames.contains('audioBlobs')) {
          db.createObjectStore('audioBlobs', { keyPath: 'id' });
        }
        // Playlists store
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
        // Favorites store
        if (!db.objectStoreNames.contains('favorites')) {
          db.createObjectStore('favorites', { keyPath: 'id' });
        }
        // User Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
};

// Track Operations
export async function saveTracks(tracks: Track[], blobs?: { id: string; blob: Blob }[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['tracks', 'audioBlobs'], 'readwrite');
    const trackStore = tx.objectStore('tracks');
    const blobStore = tx.objectStore('audioBlobs');

    for (const track of tracks) {
      const { file, blob, ...serializableTrack } = track;
      await trackStore.put(serializableTrack as Track);
    }

    if (blobs && blobs.length > 0) {
      for (const item of blobs) {
        await blobStore.put(item);
      }
    }

    await tx.done;
  } catch (err) { console.warn('[IndexedDB]', err); return; }
}

export async function getAllTracks(): Promise<Track[]> {
  try {
    const db = await getDB();
    return await db.getAll('tracks');
  } catch (err) { console.warn('[IndexedDB]', err); return []; }
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    const result = await db.get('audioBlobs', id);
    return result ? result.blob : null;
  } catch (err) { console.warn('[IndexedDB]', err); return null; }
}

export async function deleteTrack(id: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['tracks', 'audioBlobs', 'favorites'], 'readwrite');
    await tx.objectStore('tracks').delete(id);
    await tx.objectStore('audioBlobs').delete(id);
    await tx.objectStore('favorites').delete(id);
    await tx.done;
  } catch (err) { console.warn('[IndexedDB]', err); return; }
}

export async function clearAllTracks(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['tracks', 'audioBlobs', 'favorites'], 'readwrite');
    await tx.objectStore('tracks').clear();
    await tx.objectStore('audioBlobs').clear();
    await tx.objectStore('favorites').clear();
    await tx.done;
  } catch (err) { console.warn('[IndexedDB]', err); return; }
}

// Favorites Operations
export async function getFavoriteIds(): Promise<string[]> {
  try {
    const db = await getDB();
    const allFavs = await db.getAll('favorites');
    return allFavs.map((f) => f.id);
  } catch (err) { console.warn('[IndexedDB]', err); return []; }
}

export async function toggleFavorite(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    const existing = await db.get('favorites', id);
    if (existing) {
      await db.delete('favorites', id);
      return false;
    } else {
      await db.put('favorites', { id, addedAt: Date.now() });
      return true;
    }
  } catch (err) { console.warn('[IndexedDB]', err); return false; }
}

// Playlists
export async function getAllPlaylists(): Promise<Playlist[]> {
  try {
    const db = await getDB();
    return await db.getAll('playlists');
  } catch (err) { console.warn('[IndexedDB]', err); return []; }
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  try {
    const db = await getDB();
    await db.put('playlists', playlist);
  } catch (err) { console.warn('[IndexedDB]', err); return; }
}

export async function deletePlaylist(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('playlists', id);
  } catch (err) { console.warn('[IndexedDB]', err); return; }
}

// Settings
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    const val = await db.get('settings', key);
    return val !== undefined ? val : defaultValue;
  } catch (err) { console.warn('[IndexedDB]', err); return defaultValue; }
}

export async function saveSetting(key: string, val: any): Promise<void> {
  try {
    const db = await getDB();
    await db.put('settings', val, key);
  } catch (err) { console.warn('[IndexedDB]', err); return; }
}

