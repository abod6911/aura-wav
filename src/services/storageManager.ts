/**
 * AURA.WAV Enterprise Persistent Audio Storage Engine
 * Dual-Engine Architecture:
 * 1. Origin Private File System (OPFS) via navigator.storage.getDirectory()
 *    - Sandboxed, high-performance, native filesystem performance
 *    - Zero user prompts on subsequent app launches (100% persistent!)
 *    - Available on Chrome, Edge, Firefox, and iOS Safari 15.2+
 * 2. IndexedDB AudioBlobs fallback
 *    - Atomic per-track transactions avoiding single-transaction timeout/quota bugs
 */

import { getDB } from '../db/indexedDB';
import { dexieDB } from '../db/dexieDB';

const OPFS_DIR_NAME = 'aura_audio_vault';

export interface StorageStats {
  trackCount: number;
  totalSizeBytes: number;
  formattedSize: string;
  quotaBytes?: number;
  usageBytes?: number;
  usagePercentage: number;
  engine: 'opfs' | 'indexeddb';
}

/**
 * Format raw bytes into human-readable Arabic/English units
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 ميجابايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت', 'تيرابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

/**
 * Check whether OPFS (Origin Private File System) is supported in current environment
 */
export function isOPFSSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

/**
 * Get or create the OPFS directory handle for audio files
 */
async function getOPFSDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isOPFSSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
  } catch (err) {
    console.warn('[StorageManager] OPFS directory access error:', err);
    return null;
  }
}

/**
 * Save raw audio blob/file permanently into OPFS (with IndexedDB fallback)
 */
export async function saveAudioFileToStorage(
  trackId: string,
  blobOrFile: Blob | File
): Promise<'opfs' | 'indexeddb'> {
  const opfsDir = await getOPFSDirectory();

  if (opfsDir) {
    try {
      const sanitizedId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileHandle = await opfsDir.getFileHandle(sanitizedId, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(blobOrFile);
      await writable.close();
      return 'opfs';
    } catch (opfsErr) {
      console.warn(`[StorageManager] OPFS write failed for ${trackId}, falling back to IndexedDB:`, opfsErr);
    }
  }

  // Fallback: Atomic write into Dexie & IndexedDB audioBlobs
  try {
    await dexieDB.audioBlobs.put({ id: trackId, blob: blobOrFile });
  } catch {}

  const db = await getDB();
  const tx = db.transaction('audioBlobs', 'readwrite');
  await tx.store.put({ id: trackId, blob: blobOrFile });
  await tx.done;
  return 'indexeddb';
}

/**
 * Retrieve raw audio Blob from OPFS, Dexie.js, or IndexedDB
 */
export async function getAudioFileFromStorage(trackId: string): Promise<Blob | null> {
  // 1. Try OPFS first
  const opfsDir = await getOPFSDirectory();
  if (opfsDir) {
    try {
      const sanitizedId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileHandle = await opfsDir.getFileHandle(sanitizedId);
      const file = await fileHandle.getFile();
      if (file && file.size > 0) {
        return file;
      }
    } catch {
      // Not found in OPFS or error, continue to Dexie check
    }
  }

  // 2. Try Dexie.js next
  try {
    const dexieRec = await dexieDB.audioBlobs.get(trackId);
    if (dexieRec && dexieRec.blob) {
      return dexieRec.blob;
    }
  } catch {}

  // 2. Try IndexedDB audioBlobs
  try {
    const db = await getDB();
    const item = await db.get('audioBlobs', trackId);
    if (item && item.blob) {
      return item.blob;
    }
  } catch (idbErr) {
    console.warn(`[StorageManager] IndexedDB retrieval error for ${trackId}:`, idbErr);
  }

  return null;
}

/**
 * Delete an audio file from OPFS and IndexedDB
 */
export async function deleteAudioFileFromStorage(trackId: string): Promise<void> {
  const opfsDir = await getOPFSDirectory();
  if (opfsDir) {
    try {
      const sanitizedId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
      await opfsDir.removeEntry(sanitizedId);
    } catch {}
  }

  try {
    const db = await getDB();
    await db.delete('audioBlobs', trackId);
  } catch {}
}

/**
 * Clear the entire local library (OPFS files + IndexedDB records)
 */
export async function clearAllLocalStorage(): Promise<void> {
  // Clear OPFS directory
  if (isOPFSSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(OPFS_DIR_NAME, { recursive: true });
    } catch (e) {
      console.warn('[StorageManager] Clear OPFS error:', e);
    }
  }

  // Clear IndexedDB tables
  try {
    const db = await getDB();
    const tx = db.transaction(['tracks', 'audioBlobs', 'favorites', 'playlists'], 'readwrite');
    await tx.objectStore('tracks').clear();
    await tx.objectStore('audioBlobs').clear();
    await tx.objectStore('favorites').clear();
    await tx.objectStore('playlists').clear();
    await tx.done;

    // Reset saved folder metadata in settings
    await db.delete('settings', 'savedFolderName');
    await db.delete('settings', 'savedFolderTrackCount');
    await db.delete('settings', 'savedFolderTimestamp');
    await db.delete('settings', 'savedDirectoryHandle');
    await db.delete('settings', 'savedDirectoryName');
  } catch (idbErr) {
    console.warn('[StorageManager] Clear IndexedDB error:', idbErr);
  }
}

/**
 * Calculate comprehensive storage statistics
 */
export async function getStorageStatistics(): Promise<StorageStats> {
  const db = await getDB();
  const allTracks = await db.getAll('tracks');
  const trackCount = allTracks.length;

  let totalSizeBytes = 0;

  // 1. Calculate actual sizes of stored blobs in IndexedDB
  try {
    const allBlobs = await db.getAll('audioBlobs');
    for (const item of allBlobs) {
      if (item && item.blob) {
        totalSizeBytes += item.blob.size;
      }
    }
  } catch {}

  // 2. Add OPFS file sizes if supported
  const opfsDir = await getOPFSDirectory();
  if (opfsDir) {
    try {
      for await (const entry of (opfsDir as any).values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          totalSizeBytes += file.size;
        }
      }
    } catch {}
  }

  // 3. Browser Storage Quota Estimate
  let quotaBytes = 0;
  let usageBytes = 0;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota || 0;
      usageBytes = estimate.usage || totalSizeBytes;
    } catch {}
  }

  const usagePercentage =
    quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100)) : 0;

  return {
    trackCount,
    totalSizeBytes: totalSizeBytes > 0 ? totalSizeBytes : usageBytes,
    formattedSize: formatBytes(totalSizeBytes > 0 ? totalSizeBytes : usageBytes),
    quotaBytes,
    usageBytes,
    usagePercentage,
    engine: opfsDir ? 'opfs' : 'indexeddb',
  };
}
