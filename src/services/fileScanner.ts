import { Track } from '../types';
import { parseAudioMetadata, fetchOnlineArtwork, generateLuxuriousGeometricCover, generateLuxuryCanvasArtwork, getDB } from '../lib/metadata';
import { parseLRC } from './lyricsParser';
import { extractPaletteFromImage } from '../lib/colorSampler';
import { resolveCatalogCover, resolveCatalogTrackItem } from '../data/tracksCatalog';
import { saveAudioFileToStorage } from './storageManager';

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
  onProgress?: (progress: ScanProgress) => void,
  folderName?: string
): Promise<Track[]> {
  // Auto-detect folder name from webkitRelativePath if available
  let resolvedFolderName = folderName;
  if (!resolvedFolderName && files.length > 0) {
    const firstRel = (files[0] as any).webkitRelativePath;
    if (firstRel && typeof firstRel === 'string' && firstRel.includes('/')) {
      resolvedFolderName = firstRel.split('/')[0];
    }
  }
  if (!resolvedFolderName) {
    resolvedFolderName = 'Liked_Songs';
  }

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

  // Load existing tracks to match and enrich rather than creating duplicate entries
  const existingTracks = (await db.getAll('tracks')) as Track[];
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

      // 1. Check if file matches our predefined catalog (1 to 261)
      const catalogItem = resolveCatalogTrackItem(file.name, meta.title, meta.artist, meta.trackNumber);

      let trackId: string;
      let trackNumber: number | undefined;
      let finalTitle = meta.title;
      let finalArtist = meta.artist;
      let finalAlbum = meta.album;
      let artworkUrl = meta.artworkUrl;
      let artworkBlob = meta.artworkBlob;
      let finalDuration = meta.duration || 180;

      if (catalogItem) {
        trackId = `track_catalog_${catalogItem.number}`;
        trackNumber = catalogItem.number;
        finalTitle = catalogItem.title;
        finalArtist = catalogItem.artists;
        finalAlbum = catalogItem.album;
        artworkUrl = catalogItem.coverUrl; // 100% offline official 640x640 cover!

        const parts = catalogItem.duration.split(':').map(Number);
        const catDur = parts.length === 2 ? parts[0] * 60 + parts[1] : 180;
        finalDuration = meta.duration > 0 ? meta.duration : catDur;
      } else {
        // Fallback matching against existing tracks in DB
        const fileKey = file.name.toLowerCase().trim();
        const metaSig = `${meta.title.toLowerCase().trim()}::${meta.artist.toLowerCase().trim()}`;
        const matched =
          trackByFile.get(fileKey) ||
          (meta.trackNumber ? trackByNumber.get(meta.trackNumber) : undefined) ||
          trackBySignature.get(metaSig);

        trackId = matched?.id || `track_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
        trackNumber = meta.trackNumber || matched?.trackNumber;
        finalTitle = matched?.title || meta.title;
        finalArtist = matched?.artist || meta.artist;
        finalAlbum = matched?.album || meta.album;
        artworkUrl = matched?.artworkUrl || artworkUrl;

        // Artwork resolution for non-catalog tracks
        const catalogCover = resolveCatalogCover(meta.title, meta.artist, file.name, meta.trackNumber);
        if (catalogCover) {
          artworkUrl = catalogCover;
        } else if (!artworkBlob && (!artworkUrl || artworkUrl.startsWith('data:image/svg') || artworkUrl === '/logo.svg')) {
          artworkBlob = (await fetchOnlineArtwork(meta.title, meta.artist)) || undefined;
          if (artworkBlob) {
            artworkUrl = URL.createObjectURL(artworkBlob);
          }
        }
        if (!artworkBlob && (!artworkUrl || artworkUrl.startsWith('data:image/svg') || artworkUrl === '/logo.svg')) {
          artworkBlob = await generateLuxuryCanvasArtwork(meta.title, meta.artist);
          artworkUrl = URL.createObjectURL(artworkBlob);
        }
      }

      const palette = artworkUrl && !artworkUrl.startsWith('data:image/svg')
        ? await extractPaletteFromImage(artworkUrl)
        : { primary: '#FA243C', secondary: '#FF2D55' };

      // Convert File to pure Blob via ArrayBuffer to prevent iOS Safari DataCloneError in IndexedDB
      const arrayBuf = await file.arrayBuffer();
      const pureAudioBlob = new Blob([arrayBuf], { type: file.type || 'audio/mpeg' });

      const track: Track = {
        id: trackId,
        title: finalTitle,
        artist: finalArtist,
        album: finalAlbum,
        duration: finalDuration,
        trackNumber,
        year: meta.year,
        genre: meta.genre,
        artworkUrl: artworkUrl || '/logo.svg',
        dominantColor: palette.primary,
        secondaryColor: palette.secondary,
        lyrics: lyricsText,
        syncedLyrics,
        file,
        blob: pureAudioBlob,
        fileName: file.name,
        source: 'local',
        dateAdded: Date.now(),
      };

      tracks.push(track);

      // 1. Permanently store raw audio into OPFS / IndexedDB audio vault
      const storageEngine = await saveAudioFileToStorage(trackId, pureAudioBlob);

      // 2. Save serializable track metadata
      const { file: _f, blob: _b, ...serializable } = track;
      try {
        await db.put('tracks', { ...serializable, storageType: storageEngine } as Track);
      } catch (err) {
        console.warn(`Could not store track metadata for ${file.name}:`, err);
      }

      // 3. Store artwork blob if custom
      if (artworkBlob) {
        try {
          await db.put('artworkBlobs', { id: trackId, blob: artworkBlob });
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn(`Failed to process ${file.name}:`, err);
    }
  }

  try {
    const dbSettings = await getDB();
    await dbSettings.put('settings', resolvedFolderName, 'savedFolderName');
    await dbSettings.put('settings', tracks.length, 'savedFolderTrackCount');
    await dbSettings.put('settings', Date.now(), 'savedFolderTimestamp');
  } catch (err) {
    console.warn('Could not persist folder settings:', err);
  }

  return tracks;
}

export async function pickLocalDirectory(
  onProgress?: (progress: ScanProgress) => void
): Promise<Track[]> {
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
      // Persist directory handle and name in IndexedDB
      try {
        const db = await getDB();
        await db.put('settings', dirHandle, 'savedDirectoryHandle');
        await db.put('settings', dirHandle.name, 'savedDirectoryName');
        await db.put('settings', dirHandle.name, 'savedFolderName');
      } catch (err) {
        console.warn('Could not persist directory handle:', err);
      }

      const audioFiles: File[] = [];
      const lrcMap = new Map<string, string>();

      await scanDirectoryHandle(dirHandle, audioFiles, lrcMap);
      return await processAudioFiles(audioFiles, [], onProgress, dirHandle.name);
    } catch (err: any) {
      if (err.name === 'AbortError') return [];
      throw err;
    }
  } else {
    throw new Error('DIRECTORY_PICKER_NOT_SUPPORTED');
  }
}
