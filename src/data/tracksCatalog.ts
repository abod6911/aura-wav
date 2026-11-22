import { Track } from '../types';

// Auto-generated catalog interface for 100% offline cover art, audio streaming, and metadata resolution
export interface CatalogItem {
  number: number;
  title: string;
  artists: string;
  album: string;
  genre?: string;
  category?: string;
  duration: string;
  durationSecs?: number;
  coverUrl: string;
  fileName: string;
  audioUrl: string;
}

// In-memory runtime catalog populated asynchronously from /data/cloudCatalog.json
export const TRACKS_CATALOG: CatalogItem[] = [];

let catalogFetchPromise: Promise<Track[]> | null = null;
let cachedLibraryTracks: Track[] = [];

function cleanStr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Asynchronously loads /data/cloudCatalog.json on application boot.
 * Populates TRACKS_CATALOG and cachedLibraryTracks.
 */
export async function fetchCatalogTracks(): Promise<Track[]> {
  if (cachedLibraryTracks.length > 0) return cachedLibraryTracks;
  if (catalogFetchPromise) return catalogFetchPromise;

  catalogFetchPromise = (async () => {
    try {
      const res = await fetch('/data/cloudCatalog.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Track[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedLibraryTracks = data;
        TRACKS_CATALOG.length = 0;
        for (let i = 0; i < data.length; i++) {
          const t = data[i];
          const durSecs = typeof t.duration === 'number' ? t.duration : 210;
          const mins = Math.floor(durSecs / 60);
          const secs = Math.floor(durSecs % 60).toString().padStart(2, '0');
          TRACKS_CATALOG.push({
            number: t.trackNumber || (i + 1),
            title: t.title,
            artists: t.artist,
            album: t.album || 'AuraWave Master',
            genre: t.genre,
            category: t.category,
            duration: `${mins}:${secs}`,
            durationSecs: durSecs,
            coverUrl: t.artworkUrl || t.coverUrl || '/logo.svg',
            fileName: t.fileName || `${t.title}.mp3`,
            audioUrl: t.audioUrl || '',
          });
        }
        return data;
      }
    } catch (err) {
      console.warn('[tracksCatalog] Failed to fetch /data/cloudCatalog.json:', err);
    }
    return cachedLibraryTracks;
  })();

  return catalogFetchPromise;
}

/**
 * Returns loaded catalog tracks synchronously (empty array until fetch completes)
 */
export function getDefaultLibraryTracks(): Track[] {
  return cachedLibraryTracks;
}

/**
 * Resolves high-resolution official album artwork for any track.
 */
export function resolveCatalogCover(
  title?: string,
  artist?: string,
  filename?: string,
  trackNumber?: number
): string | null {
  // 1. Check exact filename match in catalog
  if (filename) {
    const cleanF = filename.toLowerCase().replace(/\.[^/.]+$/, '').trim();
    for (const item of TRACKS_CATALOG) {
      const itemF = item.fileName.toLowerCase().replace(/\.[^/.]+$/, '').trim();
      if (cleanF === itemF || cleanF.includes(itemF) || itemF.includes(cleanF)) {
        return item.coverUrl;
      }
    }
  }

  // 2. Direct track number
  if (trackNumber && trackNumber >= 1 && trackNumber <= TRACKS_CATALOG.length) {
    return TRACKS_CATALOG[trackNumber - 1].coverUrl;
  }

  // 3. Check filename prefix (e.g. "001 - ...", "0001 - ...")
  if (filename) {
    const match = filename.match(/^(\d+)\s*[-_.]/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= TRACKS_CATALOG.length) {
        return TRACKS_CATALOG[num - 1].coverUrl;
      }
    }
  }

  // 4. Match by clean title and artist
  if (title) {
    const cleanT = cleanStr(title);
    const cleanA = artist ? cleanStr(artist) : '';
    const primaryA = cleanA.split(' ')[0] || '';

    for (const item of TRACKS_CATALOG) {
      const itemT = cleanStr(item.title);
      const itemA = cleanStr(item.artists);

      if (cleanT === itemT) {
        return item.coverUrl;
      }
      if (cleanT.length > 3 && (cleanT.includes(itemT) || itemT.includes(cleanT))) {
        if (!cleanA || itemA.includes(primaryA) || cleanA.includes(itemA.split(' ')[0])) {
          return item.coverUrl;
        }
      }
    }
  }

  return null;
}

/**
 * Resolves a file and metadata to a specific CatalogItem (1 to 1750).
 */
export function resolveCatalogTrackItem(
  filename?: string,
  title?: string,
  artist?: string,
  trackNumber?: number
): CatalogItem | null {
  // 1. Check exact or normalized filename
  if (filename) {
    const cleanF = filename.toLowerCase().replace(/\.[^/.]+$/, '').trim();
    for (const item of TRACKS_CATALOG) {
      const itemF = item.fileName.toLowerCase().replace(/\.[^/.]+$/, '').trim();
      if (cleanF === itemF || (cleanF.length >= 8 && (cleanF.includes(itemF) || itemF.includes(cleanF)))) {
        return item;
      }
    }
  }

  // 2. Match by clean title and artist
  if (title) {
    const cleanT = cleanStr(title);
    const cleanA = artist ? cleanStr(artist) : '';
    const primaryA = cleanA.split(' ')[0] || '';

    for (const item of TRACKS_CATALOG) {
      const itemT = cleanStr(item.title);
      const itemA = cleanStr(item.artists);

      if (cleanT === itemT) {
        return item;
      }
      if (cleanT.length > 3 && (cleanT.includes(itemT) || itemT.includes(cleanT))) {
        if (!cleanA || itemA.includes(primaryA) || cleanA.includes(itemA.split(' ')[0])) {
          return item;
        }
      }
    }
  }

  // 3. Check direct track number
  if (trackNumber && trackNumber >= 1 && trackNumber <= TRACKS_CATALOG.length) {
    return TRACKS_CATALOG[trackNumber - 1];
  }

  // 4. Check filename prefix (e.g. "001 - ...", "0001 - ...", "1. ...")
  if (filename) {
    const match = filename.match(/^(?:track\s*[-_.]?\s*)?0*(\d{1,4})(?:[-_.\s]|$)/i) || filename.match(/^(\d+)\s*[-_.]/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= TRACKS_CATALOG.length) {
        return TRACKS_CATALOG[num - 1];
      }
    }
  }

  return null;
}
