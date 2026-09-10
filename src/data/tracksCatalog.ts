import { Track } from '../types';
import catalogData1750 from './tracksCatalog1750.json';

// Auto-generated catalog for 100% offline cover art, audio streaming, and metadata resolution
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

export const TRACKS_CATALOG: CatalogItem[] = catalogData1750 as CatalogItem[];

function cleanStr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
      if (cleanF === itemF || cleanF.includes(itemF) || itemF.includes(cleanF)) {
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

/**
 * Returns the complete initial 1,750 tracks library ready for instant playback.
 */
export function getDefaultLibraryTracks(): Track[] {
  return TRACKS_CATALOG.map((item) => {
    const parts = item.duration.split(':').map(Number);
    const durSecs = item.durationSecs || (parts.length === 2 ? parts[0] * 60 + parts[1] : 210);

    return {
      id: `track_catalog_${item.number}`,
      title: item.title,
      artist: item.artists,
      album: item.album,
      genre: item.genre,
      category: item.category,
      duration: durSecs,
      trackNumber: item.number,
      artworkUrl: item.coverUrl,
      coverUrl: item.coverUrl,
      audioUrl: item.audioUrl,
      fileName: item.fileName,
      source: 'local',
      dateAdded: 1700000000000 + item.number,
      dominantColor: '#1DB954',
      accentColor: '#1DB954',
    };
  });
}
