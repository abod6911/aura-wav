import * as mm from 'music-metadata-browser';
import { Track } from '../types';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
  artworkBlobs: {
    key: string;
    value: { id: string; blob: Blob };
  };
  playlists: {
    key: string;
    value: any;
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

const DB_NAME = 'aura_wav_db_v2';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<AuraDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<AuraDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('by-artist', 'artist');
          trackStore.createIndex('by-album', 'album');
          trackStore.createIndex('by-date', 'dateAdded');
        }
        if (!db.objectStoreNames.contains('audioBlobs')) {
          db.createObjectStore('audioBlobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('artworkBlobs')) {
          db.createObjectStore('artworkBlobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('favorites')) {
          db.createObjectStore('favorites', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Generates a deterministic, luxurious geometric gradient cover using the track's title hash
 * and the artist's first initials, eliminating generic flat placeholders.
 */
export function generateLuxuriousGeometricCover(title: string, artist: string): string {
  const initial = (artist || title || 'A').trim().charAt(0).toUpperCase();

  // Color palettes based on luxury obsidian / neon styling
  const palettes = [
    { bg1: '#1a103c', bg2: '#0d0920', accent1: '#7928ca', accent2: '#ff0080', glow: '#a855f7' },
    { bg1: '#07242b', bg2: '#041014', accent1: '#0070f3', accent2: '#00dfd8', glow: '#06b6d4' },
    { bg1: '#260a1d', bg2: '#12040d', accent1: '#f81ce5', accent2: '#eb3678', glow: '#ec4899' },
    { bg1: '#1c1b0a', bg2: '#0f0e04', accent1: '#f5a623', accent2: '#ff4949', glow: '#eab308' },
    { bg1: '#0a1e17', bg2: '#040d0a', accent1: '#00df8f', accent2: '#0070f3', glow: '#10b981' },
    { bg1: '#160d2e', bg2: '#0a0517', accent1: '#6366f1', accent2: '#d946ef', glow: '#818cf8' },
  ];

  let hash = 0;
  for (let i = 0; i < (title + artist).length; i++) {
    hash = (hash << 5) - hash + (title + artist).charCodeAt(i);
    hash |= 0;
  }
  const pal = palettes[Math.abs(hash) % palettes.length];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <defs>
        <radialGradient id="luxBg" cx="40%" cy="30%" r="90%">
          <stop offset="0%" stop-color="${pal.bg1}" />
          <stop offset="100%" stop-color="${pal.bg2}" />
        </radialGradient>
        <linearGradient id="luxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${pal.accent1}" />
          <stop offset="100%" stop-color="${pal.accent2}" />
        </linearGradient>
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Obsidian Luxury Background -->
      <rect width="500" height="500" rx="40" fill="url(#luxBg)" />

      <!-- Ambient Glow Orb -->
      <circle cx="250" cy="220" r="140" fill="${pal.glow}" opacity="0.22" filter="url(#neonGlow)" />

      <!-- Geometric Prisms / Vinyl Rings -->
      <circle cx="250" cy="250" r="180" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
      <circle cx="250" cy="250" r="130" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1.5" stroke-dasharray="8 6" />
      <circle cx="250" cy="250" r="85" fill="none" stroke="url(#luxGrad)" stroke-width="3" opacity="0.75" />

      <!-- Luxury Typography Initial -->
      <text x="250" y="285" font-family="'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" font-size="120" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-4" filter="url(#neonGlow)">
        ${initial}
      </text>

      <!-- Gloss Highlight -->
      <path d="M 40 40 Q 250 10 460 40 L 460 160 Q 250 190 40 160 Z" fill="rgba(255,255,255,0.04)" />
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Parses clean artist, title, and track number from typical audio filenames
 */
export function parseFilenameMetadata(filename: string): { title: string; artist: string; trackNumber?: number } {
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim();

  // Pattern: "001 - Artist - Title"
  const matchNumbered = withoutExt.match(/^(\d+)\s*[-_.]\s*(.*?)\s*[-_.]\s*(.+)$/);
  if (matchNumbered) {
    return {
      trackNumber: parseInt(matchNumbered[1], 10),
      artist: matchNumbered[2].trim(),
      title: matchNumbered[3].trim(),
    };
  }

  // Pattern: "Artist - Title"
  const matchArtistTitle = withoutExt.match(/^(.*?)\s*[-_.]\s*(.+)$/);
  if (matchArtistTitle) {
    return {
      artist: matchArtistTitle[1].trim(),
      title: matchArtistTitle[2].trim(),
    };
  }

  return {
    artist: 'Unknown Artist',
    title: withoutExt,
  };
}

/**
 * Generates a 512x512 high-resolution raster PNG cover Blob using HTML5 Canvas.
 * Unlike SVG data URIs, PNG blobs are 100% supported by iOS Dynamic Island, Lock Screen, and CarPlay!
 */
export async function generateLuxuryCanvasArtwork(title: string, artist: string): Promise<Blob> {
  if (typeof document === 'undefined') {
    return new Blob([], { type: 'image/png' });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new Blob([], { type: 'image/png' });
  }

  const initial = (artist || title || 'A').trim().charAt(0).toUpperCase();

  const themes = [
    { bg1: '#1a103c', bg2: '#080512', c1: '#8b5cf6', c2: '#ec4899', glow: '#a855f7' },
    { bg1: '#07242b', bg2: '#020b0e', c1: '#06b6d4', c2: '#3b82f6', glow: '#00dfd8' },
    { bg1: '#260a1d', bg2: '#0d020a', c1: '#f43f5e', c2: '#fb923c', glow: '#fb7185' },
    { bg1: '#1c1b0a', bg2: '#0a0902', c1: '#eab308', c2: '#f97316', glow: '#fde047' },
    { bg1: '#092318', bg2: '#020c08', c1: '#10b981', c2: '#06b6d4', glow: '#34d399' },
    { bg1: '#13112c', bg2: '#060512', c1: '#6366f1', c2: '#a855f7', glow: '#818cf8' },
  ];

  let hash = 0;
  for (let i = 0; i < (title + artist).length; i++) {
    hash = (hash << 5) - hash + (title + artist).charCodeAt(i);
    hash |= 0;
  }
  const theme = themes[Math.abs(hash) % themes.length];

  // 1. Dark radial gradient background
  const radGrad = ctx.createRadialGradient(256, 200, 40, 256, 256, 320);
  radGrad.addColorStop(0, theme.bg1);
  radGrad.addColorStop(1, theme.bg2);
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Ambient glow orb
  const glowGrad = ctx.createRadialGradient(256, 210, 10, 256, 210, 160);
  glowGrad.addColorStop(0, theme.glow + '55');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(256, 210, 160, 0, Math.PI * 2);
  ctx.fill();

  // 3. Concentric vinyl / geometric rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 230, 180, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(256, 230, 135, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Inner glowing ring
  const ringGrad = ctx.createLinearGradient(160, 130, 350, 330);
  ringGrad.addColorStop(0, theme.c1);
  ringGrad.addColorStop(1, theme.c2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 4;
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(256, 230, 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 5. Large initial letter
  ctx.font = '900 96px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 24;
  ctx.fillText(initial, 256, 230);
  ctx.shadowBlur = 0;

  // 6. Header Badge: "AURA HI-RES AUDIO"
  ctx.font = 'bold 12px monospace';
  ctx.letterSpacing = '3px';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('AURA • 24-BIT MASTER', 256, 45);

  // 7. Track Title & Artist at Bottom
  const displayTitle = title.length > 24 ? title.slice(0, 22) + '...' : title;
  const displayArtist = artist.length > 28 ? artist.slice(0, 26) + '...' : artist;

  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(displayTitle, 256, 435);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(displayArtist, 256, 465);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob([], { type: 'image/png' }));
    }, 'image/png');
  });
}

/**
 * Fetches high-res official artwork from iTunes Search API with fallback multi-query logic
 */
export async function fetchOnlineArtwork(title: string, artist: string): Promise<Blob | null> {
  try {
    const cleanTitle = title
      .replace(/^\d+[\s-_.]+/g, '') // Remove track numbers like "01 - "
      .replace(/\s*[\(\[].*?[\)\]]/g, '') // Remove (Official Video), [Remix], etc.
      .replace(/\.[a-zA-Z0-9]{2,4}$/, '') // Remove extension
      .trim();

    const isUnknownArtist =
      !artist ||
      artist.toLowerCase().includes('unknown') ||
      artist.toLowerCase().startsWith('track_') ||
      artist.toLowerCase() === 'audio';

    const cleanArtist = isUnknownArtist ? '' : artist.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();

    const queries: string[] = [];
    if (cleanArtist && cleanTitle) {
      queries.push(`${cleanArtist} ${cleanTitle}`);
    }
    if (cleanTitle) {
      queries.push(cleanTitle);
    }

    for (const q of queries) {
      try {
        const encoded = encodeURIComponent(q);
        const res = await fetch(`https://itunes.apple.com/search?term=${encoded}&entity=song&limit=1`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.resultCount > 0 && data.results[0]?.artworkUrl100) {
          const highResUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
          const imgRes = await fetch(highResUrl);
          if (imgRes.ok) {
            return await imgRes.blob();
          }
        }
      } catch {
        // try next query
      }
    }
    return null;
  } catch {
    return null;
  }
}

export interface ArtworkCandidate {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
}

export async function searchOnlineArtworkCandidates(query: string): Promise<ArtworkCandidate[]> {
  try {
    const cleanQ = query
      .replace(/^\d+[\s-_.]+/g, '')
      .replace(/\.[a-zA-Z0-9]{2,4}$/, '')
      .trim();
    if (!cleanQ) return [];

    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=8`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((r: any, idx: number) => ({
      id: `${r.trackId || idx}`,
      title: r.trackName || '',
      artist: r.artistName || '',
      album: r.collectionName || '',
      artworkUrl: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    }));
  } catch {
    return [];
  }
}

/**
 * Full in-browser metadata extraction using music-metadata-browser
 */
export async function parseAudioMetadata(file: File): Promise<{
  title: string;
  artist: string;
  album: string;
  year?: number;
  trackNumber?: number;
  genre?: string;
  duration: number;
  artworkBlob?: Blob;
  artworkUrl?: string;
  lyrics?: string;
}> {
  const fallback = parseFilenameMetadata(file.name);

  try {
    const metadata = await mm.parseBlob(file, { duration: true, skipCovers: false });
    const common = metadata.common;

    const title = (common.title && common.title.trim()) || fallback.title;
    const artist = (common.artist && common.artist.trim()) || fallback.artist;
    const album = (common.album && common.album.trim()) || 'Single';
    const year = common.year;
    const trackNumber = common.track?.no || fallback.trackNumber;
    const genre = common.genre?.[0];
    const duration = metadata.format.duration || 0;
    const rawLyrics = common.lyrics?.[0];
    const lyrics = typeof rawLyrics === 'string' ? rawLyrics : (rawLyrics as any)?.text;

    let artworkBlob: Blob | undefined = undefined;
    let artworkUrl: string | undefined = undefined;

    // Check for embedded picture frame (APIC / covr)
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      artworkBlob = new Blob([pic.data as any], { type: pic.format });
      artworkUrl = URL.createObjectURL(artworkBlob);
    }

    return {
      title,
      artist,
      album,
      year,
      trackNumber,
      genre,
      duration,
      artworkBlob,
      artworkUrl,
      lyrics,
    };
  } catch (err) {
    // Graceful fallback on parse error
    return {
      title: fallback.title,
      artist: fallback.artist,
      album: 'Local Audio',
      trackNumber: fallback.trackNumber,
      duration: 0,
    };
  }
}
