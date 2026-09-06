import { Track } from '../types';
import { parseAudioMetadata, fetchOnlineArtwork, generateLuxuriousGeometricCover, generateLuxuryCanvasArtwork, getDB } from '../lib/metadata';
import { parseLRC } from './lyricsParser';
import { extractPaletteFromImage } from '../lib/colorSampler';
import { resolveCatalogCover } from '../data/tracksCatalog';

const SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.webm'];

export interface ScanProgress {
  current: number;
  total: number;
  currentFileName: string;
}

export function isAudioFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isLrcFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.lrc');
}

async function scanDirectoryHandle(
  dirHandle: any,
  audioFiles: File[],
  lrcMap: Map<string, string>
) {
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      if (isAudioFile(file.name)) {
        audioFiles.push(file);
      } else if (isLrcFile(file.name)) {
        try {
          const lrcText = await file.text();
          const base = file.name.replace(/\.lrc$/i, '').toLowerCase();
          lrcMap.set(base, lrcText);
        } catch {
          // ignore
        }
      }
    } else if (entry.kind === 'directory') {
      await scanDirectoryHandle(entry, audioFiles, lrcMap);
    }
  }
}

export async function processAudioFiles(
  files: File[],
  lrcFiles: File[] = [],
  onProgress?: (progress: ScanProgress) => void
): Promise<Track[]> {
  const lrcMap = new Map<string, string>();
  for (const lrc of lrcFiles) {
    try {
      const text = await lrc.text();
      const base = lrc.name.replace(/\.lrc$/i, '').toLowerCase();
      lrcMap.set(base, text);
    } catch {
      // ignore
    }
  }

  const audioFiles = files.filter((f) => isAudioFile(f.name));
  const total = audioFiles.length;
  const tracks: Track[] = [];
  const db = await getDB();
  const tx = db.transaction(['tracks', 'audioBlobs', 'artworkBlobs'], 'readwrite');
  const trackStore = tx.objectStore('tracks');
  const audioBlobStore = tx.objectStore('audioBlobs');
  const artworkBlobStore = tx.objectStore('artworkBlobs');

  // Load existing tracks to match and enrich rather than creating duplicate entries
  const existingTracks = (await trackStore.getAll()) as Track[];
  const trackByFile = new Map<string, Track>();
  const trackByNumber = new Map<number, Track>();
  const trackBySignature = new Map<string, Track>();

  for (const tr of existingTracks) {
    if (tr.fileName) {
      trackByFile.set(tr.fileName.toLowerCase().trim(), tr);
    }
    if (tr.trackNumber) {
      trackByNumber.set(tr.trackNumber, tr);
    }
    const sig = `${tr.title.toLowerCase().trim()}::${tr.artist.toLowerCase().trim()}`;
    trackBySignature.set(sig, tr);
  }

  for (let i = 0; i < total; i++) {
    const file = audioFiles[i];
    if (onProgress) {
      onProgress({ current: i + 1, total, currentFileName: file.name });
    }

    try {
      // Parse with music-metadata-browser
      const meta = await parseAudioMetadata(file);
      const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();

      // Check for companion LRC
      let lyricsText = meta.lyrics;
      if (!lyricsText && lrcMap.has(baseName)) {
        lyricsText = lrcMap.get(baseName);
      }

      const syncedLyrics = lyricsText ? parseLRC(lyricsText) : undefined;

      // Check if file matches an existing catalog or previously scanned track
      const fileKey = file.name.toLowerCase().trim();
      const metaSig = `${meta.title.toLowerCase().trim()}::${meta.artist.toLowerCase().trim()}`;
      const matched =
        trackByFile.get(fileKey) ||
        (meta.trackNumber ? trackByNumber.get(meta.trackNumber) : undefined) ||
        trackBySignature.get(metaSig);

      const trackId = matched?.id || `track_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;

      let artworkUrl = matched?.artworkUrl || meta.artworkUrl;
      let artworkBlob = meta.artworkBlob;

      // 1. Check local catalog first (100% offline, 640x640 official artwork)
      const catalogCover = resolveCatalogCover(meta.title, meta.artist, file.name, meta.trackNumber);
      if (catalogCover) {
        artworkUrl = catalogCover;
      } else if (!artworkBlob && (!artworkUrl || artworkUrl.startsWith('data:image/svg') || artworkUrl === '/logo.svg')) {
        // Attempt online fetch
        artworkBlob = (await fetchOnlineArtwork(meta.title, meta.artist)) || undefined;
        if (artworkBlob) {
          artworkUrl = URL.createObjectURL(artworkBlob);
        }
      }

      // If still no artwork, generate high-res luxury canvas raster PNG (iOS Dynamic Island & Lock Screen supported!)
      if (!artworkBlob && (!artworkUrl || artworkUrl.startsWith('data:image/svg') || artworkUrl === '/logo.svg')) {
        artworkBlob = await generateLuxuryCanvasArtwork(meta.title, meta.artist);
        artworkUrl = URL.createObjectURL(artworkBlob);
      }

      const palette = artworkUrl ? await extractPaletteFromImage(artworkUrl) : { primary: '#6366f1', secondary: '#a855f7' };

      // Convert File to pure Blob via ArrayBuffer to prevent iOS Safari DataCloneError in IndexedDB
      const arrayBuf = await file.arrayBuffer();
      const pureAudioBlob = new Blob([arrayBuf], { type: file.type || 'audio/mpeg' });

      const track: Track = {
        id: trackId,
        title: matched?.title || meta.title,
        artist: matched?.artist || meta.artist,
        album: matched?.album || meta.album,
        duration: meta.duration || matched?.duration || 180,
        trackNumber: meta.trackNumber || matched?.trackNumber,
        year: meta.year || matched?.year,
        genre: meta.genre || matched?.genre,
        artworkUrl: artworkUrl || matched?.artworkUrl || '/logo.svg',
        dominantColor: palette.primary,
        secondaryColor: palette.secondary,
        lyrics: lyricsText || matched?.lyrics,
        syncedLyrics: syncedLyrics || matched?.syncedLyrics,
        file,
        blob: pureAudioBlob,
        fileName: file.name,
        source: 'local',
        dateAdded: matched?.dateAdded || Date.now(),
      };

      tracks.push(track);

      // Save serializable track (without file/blob reference in track record)
      const { file: _f, blob: _b, ...serializable } = track;
      await trackStore.put(serializable as Track);

      // Safely store pure Audio Blob
      try {
        await audioBlobStore.put({ id: trackId, blob: pureAudioBlob });
      } catch (err) {
        console.warn(`Could not store audio blob for ${file.name} in IndexedDB:`, err);
      }

      // Store artwork blob
      if (artworkBlob) {
        try {
          await artworkBlobStore.put({ id: trackId, blob: artworkBlob });
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn(`Failed to process ${file.name}:`, err);
    }
  }

  await tx.done;
  return tracks;
}

export async function pickLocalDirectory(
  onProgress?: (progress: ScanProgress) => void
): Promise<Track[]> {
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
      // Persist directory handle in IndexedDB
      try {
        const db = await getDB();
        await db.put('settings', dirHandle, 'savedDirectoryHandle');
        await db.put('settings', dirHandle.name, 'savedDirectoryName');
      } catch (err) {
        console.warn('Could not persist directory handle:', err);
      }

      const audioFiles: File[] = [];
      const lrcMap = new Map<string, string>();

      await scanDirectoryHandle(dirHandle, audioFiles, lrcMap);
      return await processAudioFiles(audioFiles, [], onProgress);
    } catch (err: any) {
      if (err.name === 'AbortError') return [];
      throw err;
    }
  } else {
    throw new Error('DIRECTORY_PICKER_NOT_SUPPORTED');
  }
}
