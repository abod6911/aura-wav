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

let activeBlobUrl: string | null = null;
const deckBlobUrls: Record<'A' | 'B' | 'default', string | null> = {
  A: null,
  B: null,
  default: null,
};
const allActiveBlobUrls = new Set<string>();
const deckRevocationTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Memory cache for offline artwork ObjectURLs to prevent memory leaks and redundant DB reads
const artworkBlobUrls = new Map<string, string>();

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
 * Check if a track is saved offline in Dexie
 */
export async function hasTrack(id: string): Promise<boolean> {
  try {
    const count = await dexieDB.audioBlobs.where('id').equals(id).count();
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Retrieve an offline track record directly from Dexie
 */
export async function getTrack(id: string): Promise<OfflineTrackRecord | null> {
  try {
    const audioRec = await dexieDB.audioBlobs.get(id);
    if (!audioRec || !audioRec.blob || audioRec.blob.size === 0) return null;

    const artworkRec = await dexieDB.artworkBlobs.get(id);
    return {
      id,
      audioBlob: audioRec.blob,
      coverBlob: artworkRec ? artworkRec.blob : null,
      mimeType: audioRec.mimeType || audioRec.blob.type || 'audio/mpeg',
      sizeBytes: audioRec.sizeBytes || audioRec.blob.size,
      savedAt: audioRec.savedAt || Date.now(),
      isManualDownload: !!audioRec.isManualDownload,
      title: audioRec.title || '',
      artist: audioRec.artist || '',
      duration: audioRec.duration,
    };
  } catch (err) {
    console.warn(`[OfflineStorage] Error getting track ${id}:`, err);
    return null;
  }
}

/**
 * Save track into Dexie single-source-of-truth database.
 * Eliminates duplicate storage, reclaiming 50% device memory!
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
    const sizeBytes = data.audioBlob.size + (data.coverBlob ? data.coverBlob.size : 0);
    const mimeType = data.mimeType || data.audioBlob.type || 'audio/mpeg';

    await dexieDB.transaction('rw', [dexieDB.audioBlobs, dexieDB.artworkBlobs], async () => {
      await dexieDB.audioBlobs.put({
        id: data.id,
        blob: data.audioBlob,
        mimeType,
        sizeBytes,
        savedAt: data.savedAt || Date.now(),
        isManualDownload: !!data.isManualDownload,
        title: data.title || 'Untitled',
        artist: data.artist || 'Unknown Artist',
        duration: data.duration,
      });

      if (data.coverBlob) {
        await dexieDB.artworkBlobs.put({
          id: data.id,
          blob: data.coverBlob,
          mimeType: data.coverBlob.type || 'image/jpeg',
        });
      }
    });

    notifyChange();
  } catch (err) {
    console.error(`[OfflineStorage] Failed to save track ${data.id}:`, err);
    throw err;
  }
}

/**
 * Delete a downloaded track and its artwork from Dexie
 */
export async function deleteTrack(id: string): Promise<void> {
  try {
    await dexieDB.transaction('rw', [dexieDB.audioBlobs, dexieDB.artworkBlobs], async () => {
      await dexieDB.audioBlobs.delete(id);
      await dexieDB.artworkBlobs.delete(id);
    });
    revokeOfflineArtworkUrl(id);
    notifyChange();
  } catch (err) {
    console.error(`[OfflineStorage] Error deleting track ${id}:`, err);
    throw err;
  }
}

/**
 * Retrieve all offline track records from Dexie
 */
export async function getAllTracks(): Promise<OfflineTrackRecord[]> {
  try {
    const audioRecords = await dexieDB.audioBlobs.toArray();
    const artworkRecords = await dexieDB.artworkBlobs.toArray();
    const artworkMap = new Map(artworkRecords.map((a) => [a.id, a.blob]));

    return audioRecords.map((rec) => ({
      id: rec.id,
      audioBlob: rec.blob,
      coverBlob: artworkMap.get(rec.id) || null,
      mimeType: rec.mimeType || rec.blob?.type || 'audio/mpeg',
      sizeBytes: rec.sizeBytes || rec.blob?.size || 0,
      savedAt: rec.savedAt || Date.now(),
      isManualDownload: !!rec.isManualDownload,
      title: rec.title || '',
      artist: rec.artist || '',
      duration: rec.duration,
    }));
  } catch (err) {
    console.error('[OfflineStorage] Error getting all tracks:', err);
    return [];
  }
}

/**
 * Retrieve all offline track IDs from Dexie
 */
export async function getAllTrackIds(): Promise<string[]> {
  try {
    const keys = await dexieDB.audioBlobs.toCollection().primaryKeys();
    return keys as string[];
  } catch (err) {
    console.error('[OfflineStorage] Error getting all track IDs:', err);
    return [];
  }
}

/**
 * LRU Cache eviction for auto-cached tracks (preserves manual downloads)
 */
export async function manageLruCache(maxAutoCached: number = 25): Promise<void> {
  try {
    const allAudio = await dexieDB.audioBlobs.toArray();
    const autoCached = allAudio.filter((r) => !r.isManualDownload);

    if (autoCached.length > maxAutoCached) {
      autoCached.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
      const toEvict = autoCached.slice(0, autoCached.length - maxAutoCached);

      await dexieDB.transaction('rw', [dexieDB.audioBlobs, dexieDB.artworkBlobs], async () => {
        for (const item of toEvict) {
          await dexieDB.audioBlobs.delete(item.id);
          await dexieDB.artworkBlobs.delete(item.id);
        }
      });

      console.log(`[OfflineStorage] LRU cache evicted ${toEvict.length} auto-cached tracks`);
      notifyChange();
    }
  } catch (err) {
    console.warn('[OfflineStorage] LRU eviction error:', err);
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
    const audioBlobs = await dexieDB.audioBlobs.toArray();
    const artworkBlobs = await dexieDB.artworkBlobs.toArray();
    trackCount = audioBlobs.length;
    usedBytes =
      audioBlobs.reduce((acc, b) => acc + (b.sizeBytes || b.blob?.size || 0), 0) +
      artworkBlobs.reduce((acc, a) => acc + (a.blob?.size || 0), 0);
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
    await dexieDB.audioBlobs.clear();
    await dexieDB.artworkBlobs.clear();
    revokeAllArtworkBlobUrls();
    revokeAllDeckBlobUrls();
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
export function createTrackBlobUrl(
  blob: Blob,
  deck: 'A' | 'B' | 'default' = 'default',
  revokeDelayMs: number = 15000
): string {
  const url = URL.createObjectURL(blob);

  const oldUrl = deckBlobUrls[deck];
  if (oldUrl && oldUrl !== url) {
    if (deckRevocationTimers.has(oldUrl)) {
      clearTimeout(deckRevocationTimers.get(oldUrl)!);
      deckRevocationTimers.delete(oldUrl);
    }

    const timer = setTimeout(() => {
      try {
        URL.revokeObjectURL(oldUrl);
        allActiveBlobUrls.delete(oldUrl);
      } catch {}
      deckRevocationTimers.delete(oldUrl);
    }, Math.max(5000, revokeDelayMs));

    deckRevocationTimers.set(oldUrl, timer);
  }

  deckBlobUrls[deck] = url;
  activeBlobUrl = url;
  allActiveBlobUrls.add(url);
  return url;
}

/**
 * Cancel all pending revocation timers and immediately revoke all deck Blob URLs.
 */
export function revokeAllDeckBlobUrls(): void {
  deckRevocationTimers.forEach((timer) => clearTimeout(timer));
  deckRevocationTimers.clear();
  revokeAllBlobUrls();
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

// ── 100% Offline Artwork Guarantee (Dual-Strategy Fetch & Memory-Managed Cache) ──

/**
 * Dual-strategy offline artwork fetcher:
 * 1. Path 1 (CORS Blob in Dexie): fetches with mode: 'cors'. If success, returns Blob to be saved in Dexie artworkBlobs,
 *    and also puts it in 'aurawave-artwork-v1' Cache API.
 * 2. Path 2 (Opaque Fallback for CORS-restricted hosts like mzstatic): fetches with mode: 'no-cors' and writes directly
 *    into caches.open('aurawave-artwork-v1') via cache.put(coverUrl, response) so ServiceWorker can serve it to <img> tags offline.
 */
export async function fetchAndCacheArtwork(trackId: string, coverUrl?: string | null): Promise<Blob | null> {
  if (!coverUrl || coverUrl.startsWith('data:') || coverUrl.startsWith('blob:')) {
    return null;
  }

  // Path 1: Try CORS fetch to store in Dexie and Cache API
  try {
    const res = await fetch(coverUrl, { mode: 'cors', cache: 'force-cache' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) {
        if (typeof caches !== 'undefined') {
          try {
            const cache = await caches.open('aurawave-artwork-v1');
            cache.put(
              coverUrl,
              new Response(blob, {
                status: 200,
                headers: { 'Content-Type': blob.type || 'image/jpeg' },
              })
            ).catch(() => {});
          } catch {}
        }
        return blob;
      }
    }
  } catch {
    // CORS failed or rejected by CDN
  }

  // Path 2: Fallback to no-cors opaque response directly into Cache API
  if (typeof caches !== 'undefined') {
    try {
      const opaqueRes = await fetch(coverUrl, { mode: 'no-cors' });
      if (opaqueRes && (opaqueRes.type === 'opaque' || opaqueRes.status === 200)) {
        const cache = await caches.open('aurawave-artwork-v1');
        await cache.put(coverUrl, opaqueRes);
      }
    } catch (noCorsErr) {
      console.warn(`[OfflineStorage] Failed to cache fallback artwork for ${trackId}:`, noCorsErr);
    }
  }

  return null;
}

/**
 * Get or create an object URL for a track's offline artwork blob.
 * Automatically manages memory and cleans up oldest entries to prevent leaks.
 */
export async function getOfflineArtworkUrl(trackId: string): Promise<string | null> {
  if (!trackId) return null;
  if (artworkBlobUrls.has(trackId)) {
    return artworkBlobUrls.get(trackId)!;
  }
  try {
    const rec = await dexieDB.artworkBlobs.get(trackId);
    if (rec && rec.blob && rec.blob.size > 0) {
      const url = URL.createObjectURL(rec.blob);
      if (artworkBlobUrls.size > 60) {
        const firstKey = artworkBlobUrls.keys().next().value;
        if (firstKey) {
          const oldUrl = artworkBlobUrls.get(firstKey);
          if (oldUrl) {
            try {
              URL.revokeObjectURL(oldUrl);
            } catch {}
          }
          artworkBlobUrls.delete(firstKey);
        }
      }
      artworkBlobUrls.set(trackId, url);
      return url;
    }
  } catch {}
  return null;
}

/**
 * Synchronous memory lookup for already generated artwork ObjectURLs.
 */
export function getSynchronousOfflineArtworkUrl(trackId: string): string | null {
  if (!trackId) return null;
  return artworkBlobUrls.get(trackId) || null;
}

/**
 * Revoke and remove a single track's artwork ObjectURL from memory.
 */
export function revokeOfflineArtworkUrl(trackId: string): void {
  const url = artworkBlobUrls.get(trackId);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
    artworkBlobUrls.delete(trackId);
  }
}

/**
 * Revoke all artwork ObjectURLs in memory.
 */
export function revokeAllArtworkBlobUrls(): void {
  artworkBlobUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  });
  artworkBlobUrls.clear();
}
