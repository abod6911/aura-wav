import { Track } from '../types';
import { fetchOnlineArtwork, generateLuxuriousGeometricCover, generateLuxuryCanvasArtwork, getDB } from '../lib/metadata';
import { parseAudioFileMetadata, registerObjectUrl } from './metadataParser';
import { parseLRC } from './lyricsParser';
import { extractPaletteFromImage } from '../lib/colorSampler';
import { resolveCatalogCover, resolveCatalogTrackItem } from '../data/tracksCatalog';
import { saveAudioFileToStorage } from './storageManager';
import { bulkSaveTracksToDexie } from '../db/dexieDB';

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

  const CHUNK_SIZE = 12;

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = audioFiles.slice(i, i + CHUNK_SIZE);
    const chunkTracks: Track[] = [];

    await Promise.all(
      chunk.map(async (file, chunkIdx) => {
        const fileIdx = i + chunkIdx;
        if (onProgress) {
          onProgress({ current: fileIdx + 1, total, currentFileName: file.name });
        }

        try {
          // Parse ID3/Vorbis/FLAC tags with music-metadata-browser
          const meta = await parseAudioFileMetadata(file);
          const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();

          // Check for companion LRC
          let lyricsText = meta.lyrics;
          if (!lyricsText && lrcMap.has(baseName)) {
            lyricsText = lrcMap.get(baseName);
          }

          const syncedLyrics = lyricsText ? parseLRC(lyricsText) : undefined;

          // Check if file matches our predefined catalog (1 to 261)
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
            // Respect parsed tags if user file has them, otherwise fallback to catalog
            finalTitle = (meta.title && meta.title !== file.name) ? meta.title : catalogItem.title;
            finalArtist = (meta.artist && meta.artist !== 'Unknown Artist') ? meta.artist : catalogItem.artists;
            finalAlbum = (meta.album && meta.album !== 'Local Audio') ? meta.album : catalogItem.album;
            // Prefer embedded artwork; if not embedded, use catalog cover
            if (!artworkBlob) {
              artworkUrl = catalogItem.coverUrl;
            }

            const parts = catalogItem.duration.split(':').map(Number);
            const catDur = parts.length === 2 ? parts[0] * 60 + parts[1] : 180;
            finalDuration = meta.duration > 0 ? meta.duration : catDur;
          } else {
            // Matching against existing tracks in DB
            const fileKey = file.name.toLowerCase().trim();
            const metaSig = `${meta.title.toLowerCase().trim()}::${meta.artist.toLowerCase().trim()}`;
            const matched =
              trackByFile.get(fileKey) ||
              (meta.trackNumber ? trackByNumber.get(meta.trackNumber) : undefined) ||
              trackBySignature.get(metaSig);

            trackId = matched?.id || `track_${Date.now()}_${fileIdx}_${Math.random().toString(36).substring(2, 7)}`;
            trackNumber = meta.trackNumber || matched?.trackNumber;
            finalTitle = matched?.title || meta.title;
            finalArtist = matched?.artist || meta.artist;
            finalAlbum = matched?.album || meta.album;
            artworkUrl = matched?.artworkUrl || artworkUrl;

            // Artwork resolution for non-catalog tracks
            const catalogCover = resolveCatalogCover(meta.title, meta.artist, file.name, meta.trackNumber);
            if (!artworkBlob && catalogCover) {
              artworkUrl = catalogCover;
            } else if (!artworkBlob && (!artworkUrl || artworkUrl.startsWith('data:image/svg') || artworkUrl === '/logo.svg')) {
              artworkBlob = (await fetchOnlineArtwork(meta.title, meta.artist)) || undefined;
              if (artworkBlob) {
                artworkUrl = registerObjectUrl(URL.createObjectURL(artworkBlob));
              }
            }
          }

          const palette = artworkUrl && !artworkUrl.startsWith('data:image/svg')
            ? await extractPaletteFromImage(artworkUrl)
            : { primary: '#1DB954', secondary: '#10B981' };

          // Use file.slice() to create a clean Blob without duplicating full audio binary in RAM
          const pureAudioBlob = file.slice(0, file.size, file.type || 'audio/mpeg');

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

          chunkTracks.push(track);
          tracks.push(track);

          // 1. Permanently store raw audio into storage engine
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
      })
    );

    // Save batch to Dexie incrementally to prevent memory spike
    if (chunkTracks.length > 0) {
      try {
        await bulkSaveTracksToDexie(chunkTracks);
      } catch (dexieErr) {
        console.warn('Could not save chunk to Dexie:', dexieErr);
      }
    }

    // Yield control to main thread so browser renders smoothly and garbage collects
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  try {
    const dbSettings = await getDB();
    await dbSettings.put('settings', resolvedFolderName, 'savedFolderName');
    await dbSettings.put('settings', tracks.length, 'savedFolderTrackCount');
    await dbSettings.put('settings', Date.now(), 'savedFolderTimestamp');
  } catch (err) {
    console.warn('Could not persist folder settings:', err);
  }

  try {
    await bulkSaveTracksToDexie(tracks);
  } catch (dexieErr) {
    console.warn('Could not save tracks to Dexie:', dexieErr);
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
