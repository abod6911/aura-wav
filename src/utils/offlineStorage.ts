import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { dexieDB } from '../db/dexieDB';

export interface OfflineTrackRecord {
  id: string;
  audioBlob: Blob;
  coverBlob?: Blob | null;
  mimeType: string;
  sizeBytes: number;
  savedAt: number;
  isManualDownload: boolean;
  title: string;
  artist: string;
  duration?: number;
}

interface AuraWaveOfflineDBSchema extends DBSchema {
  tracks: {
    key: string;
    value: OfflineTrackRecord;
    indexes: {
      by_manual: number; // 1 for true, 0 for false
      by_saved: number;
    };
  };
}

const DB_NAME = 'AuraWaveOfflineDB';
const DB_VERSION = 1;
const ARTWORK_CACHE_NAME = 'aurawave-artwork-v1';

let dbPromise: Promise<IDBPDatabase<AuraWaveOfflineDBSchema>> | null = null;
let activeBlobUrl: string | null = null;
const deckBlobUrls: Record<'A' | 'B' | 'default', string | null> = {
  A: null,
  B: null,
  default: null,
};
const allActiveBlobUrls = new Set<string>();

type StorageChangeCallback = () => void;
const changeListeners = new Set<StorageChangeCallback>();

export function onOfflineStorageChange(cb: StorageChangeCallback): () => void {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}

function notifyChange(): void {
  changeListeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

/**
 * Initializes AuraWaveOfflineDB and requests persistent storage from the browser
 */
export async function getOfflineDB(): Promise<IDBPDatabase<AuraWaveOfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<AuraWaveOfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tracks')) {
          const store = db.createObjectStore('tracks', { keyPath: 'id' });
          store.createIndex('by_manual', 'isManualDownload');
          store.createIndex('by_saved', 'savedAt');
        }
      },
    });

    // Request persistent storage from iOS Safari / Chrome
    requestPersistence().catch(() => {});
  }
  return dbPromise;
}

/**
 * Request persistent storage quota to prevent iOS Safari from evicting saved songs
 */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log(`[OfflineStorage] Persistent storage granted: ${granted}`);
        return granted;
      }
      return true;
    } catch (e) {
      console.warn('[OfflineStorage] Error requesting persistent storage:', e);
    }
  }
  return false;
}

/**
 * Check if a track is saved offline
 */
export async function hasTrack(id: string): Promise<boolean> {
  try {
    const db = await getOfflineDB();
    const count = await db.count('tracks', id);
    if (count > 0) return true;

    // Fallback check in Dexie
    const dexieCount = await dexieDB.audioBlobs.where('id').equals(id).count();
    return dexieCount > 0;
  } catch {
    return false;
  }
}

/**
 * Retrieve an offline track record
 */
export async function getTrack(id: string): Promise<OfflineTrackRecord | null> {
  try {
    const db = await getOfflineDB();
    const record = await db.get('tracks', id);
    if (record && record.audioBlob && record.audioBlob.size > 0) {
      return record;
    }

    // Fallback: check Dexie audioBlobs
    const dexieItem = await dexieDB.audioBlobs.get(id);
    if (dexieItem && dexieItem.blob) {
      return {
        id,
        audioBlob: dexieItem.blob,
        mimeType: dexieItem.blob.type || 'audio/mpeg',
        sizeBytes: dexieItem.blob.size,
        savedAt: Date.now(),
        isManualDownload: false,
        title: '',
        artist: '',
      };
    }
  } catch (err) {
    console.warn(`[OfflineStorage] Error getting track ${id}:`, err);
  }
  return null;
}

/**
 * Save track into AuraWaveOfflineDB + Dexie dual-engine
 */
export async function saveTrack(data: {
  id: string;
  audioBlob: Blob;
  coverBlob?: Blob | null;
  mimeType?: string;
  sizeBytes?: number;
  savedAt?: number;
  isManualDownload?: boolean;
  title: string;
  artist: string;
  duration?: number;
}): Promise<void> {
  try {
    const db = await getOfflineDB();
    const sizeBytes = data.audioBlob.size + (data.coverBlob ? data.coverBlob.size : 0);
    const mimeType = data.mimeType || data.audioBlob.type || 'audio/mpeg';

    const record: OfflineTrackRecord = {
      id: data.id,
      audioBlob: data.audioBlob,
      coverBlob: data.coverBlob || null,
      mimeType,
      sizeBytes,
      savedAt: Date.now(),
      isManualDownload: !!data.isManualDownload,
      title: data.title || 'Untitled',
      artist: data.artist || 'Unknown Artist',
      duration: data.duration,
    };

    await db.put('tracks', record);

    // Sync to Dexie audioBlobs for complete dual-engine persistence
    try {
      await dexieDB.audioBlobs.put({ id: data.id, blob: data.audioBlob });
      if (data.coverBlob) {
        await dexieDB.artworkBlobs.put({ id: data.id, blob: data.coverBlob, mimeType: data.coverBlob.type });
      }
    } catch {}

    // Also populate Service Worker artwork cache for offline visual guarantees
    if (data.coverBlob && typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(ARTWORK_CACHE_NAME);
        const artworkUrl = `/offline-artwork/${data.id}`;
        await cache.put(artworkUrl, new Response(data.coverBlob, {
          headers: { 'Content-Type': data.coverBlob.type || 'image/jpeg' },
        }));
      } catch {}
    }

    notifyChange();
  } catch (err) {
    console.error(`[OfflineStorage] Failed to save track ${data.id}:`, err);
    throw err;
  }
}

/**
 * Delete a track from offline storage
 */
export async function deleteTrack(id: string): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.delete('tracks', id);

    try {
      await dexieDB.audioBlobs.delete(id);
      await dexieDB.artworkBlobs.delete(id);
    } catch {}

    notifyChange();
  } catch (err) {
    console.warn(`[OfflineStorage] Error deleting track ${id}:`, err);
  }
}

/**
 * Get all downloaded track IDs
 */
export async function getAllTrackIds(): Promise<string[]> {
  try {
    const db = await getOfflineDB();
    const keys = await db.getAllKeys('tracks');
    const ids = new Set<string>(keys);

    // Also include any in Dexie audioBlobs
    try {
      const dexieKeys = await dexieDB.audioBlobs.toCollection().primaryKeys();
      dexieKeys.forEach((k) => ids.add(k));
    } catch {}

    return Array.from(ids);
  } catch {
    return [];
  }
}

/**
 * Get all downloaded track records
 */
export async function getAllTracks(): Promise<OfflineTrackRecord[]> {
  try {
    const db = await getOfflineDB();
    return await db.getAll('tracks');
  } catch {
    return [];
  }
}

/**
 * Smart LRU Cache Management:
 * Keeps the most recent `maxAutoCached` songs played (default: 25).
 * NEVER evicts manual downloads (`isManualDownload === true`).
 */
export async function manageLruCache(maxAutoCached = 25): Promise<void> {
  try {
    const db = await getOfflineDB();
    const all = await db.getAll('tracks');

    // Filter to auto-cached tracks only
    const autoCached = all.filter((t) => !t.isManualDownload);

    if (autoCached.length > maxAutoCached) {
      // Sort oldest first
      autoCached.sort((a, b) => a.savedAt - b.savedAt);
      const toRemove = autoCached.slice(0, autoCached.length - maxAutoCached);

      for (const track of toRemove) {
        await deleteTrack(track.id);
        console.log(`[OfflineStorage] LRU evicted auto-cached track: ${track.title}`);
      }
    }
  } catch (err) {
    console.warn('[OfflineStorage] Error in LRU eviction:', err);
  }
}

/**
 * Query storage statistics (used bytes, track count, total quota)
 */
export async function getStorageStats(): Promise<{
  usedBytes: number;
  trackCount: number;
  formattedSize: string;
  quotaBytes?: number;
  usagePercentage: number;
}> {
  let usedBytes = 0;
  let trackCount = 0;

  try {
    const tracks = await getAllTracks();
    trackCount = tracks.length;
    usedBytes = tracks.reduce((acc, t) => acc + (t.sizeBytes || t.audioBlob?.size || 0), 0);
  } catch {}

  let quotaBytes: number | undefined;
  let usagePercentage = 0;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      if (estimate.usage && estimate.quota) {
        usagePercentage = Math.min(100, Math.round((estimate.usage / estimate.quota) * 100));
      }
    } catch {}
  }

  return {
    usedBytes,
    trackCount,
    formattedSize: formatBytes(usedBytes),
    quotaBytes,
    usagePercentage,
  };
}

/**
 * Clear all downloaded offline tracks
 */
export async function clearAllDownloads(): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.clear('tracks');

    try {
      await dexieDB.audioBlobs.clear();
      await dexieDB.artworkBlobs.clear();
    } catch {}

    revokeActiveBlobUrl();
    notifyChange();
  } catch (err) {
    console.error('[OfflineStorage] Error clearing downloads:', err);
    throw err;
  }
}

/**
 * Create a managed Blob URL for iOS Safari playback.
 * Supports dual-deck channel tracking ('A' | 'B' | 'default') so that when a new track is loaded
 * on Deck B during an AutoMix crossfade, the active audio stream on Deck A is preserved
 * without premature destruction.
 */
export function createTrackBlobUrl(blob: Blob, deck: 'A' | 'B' | 'default' = 'default'): string {
  const url = URL.createObjectURL(blob);

  // If there was a previous URL on this exact deck, defer its revocation
  // with a safety margin (5 seconds) so that hardware decoding finishes smoothly
  const oldUrl = deckBlobUrls[deck];
  if (oldUrl && oldUrl !== url) {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(oldUrl);
        allActiveBlobUrls.delete(oldUrl);
      } catch {}
    }, 5000);
  }

  deckBlobUrls[deck] = url;
  activeBlobUrl = url;
  allActiveBlobUrls.add(url);
  return url;
}

/**
 * Revoke the Object URL for a specific deck channel after a safety delay.
 */
export function revokeDeckBlobUrl(deck: 'A' | 'B' | 'default', delayMs: number = 3000): void {
  const url = deckBlobUrls[deck];
  if (url) {
    deckBlobUrls[deck] = null;
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
        allActiveBlobUrls.delete(url);
      } catch {}
    }, delayMs);
  }
}

/**
 * Revoke the currently active Object URL with optional immediate flag.
 * Defers revocation to prevent cutting off active crossfades on iOS Safari.
 */
export function revokeActiveBlobUrl(immediate: boolean = false): void {
  if (immediate) {
    if (activeBlobUrl) {
      try {
        URL.revokeObjectURL(activeBlobUrl);
        allActiveBlobUrls.delete(activeBlobUrl);
      } catch {}
      activeBlobUrl = null;
    }
    return;
  }

  // Graceful deferred retirement (4 seconds)
  const candidate = activeBlobUrl;
  if (candidate) {
    setTimeout(() => {
      if (candidate !== deckBlobUrls.A && candidate !== deckBlobUrls.B) {
        try {
          URL.revokeObjectURL(candidate);
          allActiveBlobUrls.delete(candidate);
        } catch {}
      }
    }, 4000);
    activeBlobUrl = null;
  }
}

/**
 * Revoke all created Object URLs (for app teardown)
 */
export function revokeAllBlobUrls(): void {
  deckBlobUrls.A = null;
  deckBlobUrls.B = null;
  deckBlobUrls.default = null;
  allActiveBlobUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  });
  allActiveBlobUrls.clear();
  activeBlobUrl = null;
}

/**
 * Human-readable byte formatter
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 ميجابايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}
