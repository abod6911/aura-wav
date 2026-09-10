import * as mm from 'music-metadata-browser';
import { Track } from '../types';

/**
 * Memory Management: Registry of active Object URLs created for album art and audio blobs.
 * Used to properly revoke URLs when tracks are deleted, replaced, or re-uploaded.
 */
const activeObjectUrls = new Set<string>();

export function registerObjectUrl(url: string): string {
  if (url && url.startsWith('blob:')) {
    activeObjectUrls.add(url);
  }
  return url;
}

export function revokeObjectUrl(url?: string): void {
  if (url && url.startsWith('blob:') && activeObjectUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
      activeObjectUrls.delete(url);
    } catch (e) {
      console.warn('[MetadataParser] Failed to revoke object URL:', e);
    }
  }
}

export function revokeAllObjectUrls(): void {
  for (const url of activeObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  activeObjectUrls.clear();
}

/**
 * Generates an aesthetic, deterministic SVG Vector cover with artist initials and gradient.
 * Used when an audio file lacks embedded album artwork.
 */
export function generateSvgCover(title: string, artist: string): string {
  const cleanTitle = (title || 'Audio').trim();
  const cleanArtist = (artist || 'Unknown').trim();
  const initial = (cleanArtist !== 'Unknown' && cleanArtist !== 'Unknown Artist' ? cleanArtist : cleanTitle).charAt(0).toUpperCase() || 'A';

  const gradients = [
    { start: '#1DB954', mid: '#10B981', end: '#047857' }, // Spotify Emerald
    { start: '#6366F1', mid: '#8B5CF6', end: '#4F46E5' }, // Neon Violet
    { start: '#EC4899', mid: '#F43F5E', end: '#BE123C' }, // Crimson Rose
    { start: '#3B82F6', mid: '#06B6D4', end: '#0284C7' }, // Electric Blue
    { start: '#F59E0B', mid: '#EA580C', end: '#C2410C' }, // Solar Amber
    { start: '#8B5CF6', mid: '#D946EF', end: '#7C3AED' }, // Deep Purple
  ];

  let hash = 0;
  const str = cleanTitle + cleanArtist;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const grad = gradients[Math.abs(hash) % gradients.length];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <defs>
        <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${grad.start}" />
          <stop offset="50%" stop-color="${grad.mid}" />
          <stop offset="100%" stop-color="${grad.end}" />
        </linearGradient>
        <radialGradient id="meshG" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.45" />
        </radialGradient>
      </defs>
      <rect width="500" height="500" rx="32" fill="url(#bgG)" />
      <rect width="500" height="500" rx="32" fill="url(#meshG)" />
      
      <!-- Vinyl record grooved rings -->
      <circle cx="250" cy="250" r="190" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
      <circle cx="250" cy="250" r="140" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" stroke-dasharray="6 4" />
      <circle cx="250" cy="250" r="90" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />

      <!-- Center Typography initial -->
      <text x="250" y="290" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="120" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-3">
        ${initial}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Sanitizes and parses filenames like:
 * "01. Artist - Song.mp3" -> { title: "Song", artist: "Artist", trackNumber: 1 }
 * "Song.flac" -> { title: "Song", artist: "Unknown Artist" }
 */
export function sanitizeFilename(filename: string): { title: string; artist: string; trackNumber?: number } {
  const withoutExt = filename.replace(/\.[a-zA-Z0-9]{2,5}$/, '').trim();

  // Pattern: "01 - Artist - Title" or "01. Artist - Title"
  const matchNumberedArtistTitle = withoutExt.match(/^(\d+)[\s._-]+(.*?)\s*[-_–—]\s*(.+)$/);
  if (matchNumberedArtistTitle) {
    const num = parseInt(matchNumberedArtistTitle[1], 10);
    const art = matchNumberedArtistTitle[2].trim();
    const tit = matchNumberedArtistTitle[3].trim();
    return {
      trackNumber: isNaN(num) ? undefined : num,
      artist: art || 'Unknown Artist',
      title: tit || withoutExt,
    };
  }

  // Pattern: "Artist - Title"
  const matchArtistTitle = withoutExt.match(/^(.*?)\s*[-_–—]\s*(.+)$/);
  if (matchArtistTitle) {
    const art = matchArtistTitle[1].trim();
    const tit = matchArtistTitle[2].trim();
    return {
      artist: art || 'Unknown Artist',
      title: tit || withoutExt,
    };
  }

  // Pattern: "01 - Title" or "01. Title"
  const matchNumberedTitle = withoutExt.match(/^(\d+)[\s._-]+(.+)$/);
  if (matchNumberedTitle) {
    const num = parseInt(matchNumberedTitle[1], 10);
    const tit = matchNumberedTitle[2].trim();
    return {
      trackNumber: isNaN(num) ? undefined : num,
      artist: 'Unknown Artist',
      title: tit || withoutExt,
    };
  }

  return {
    artist: 'Unknown Artist',
    title: withoutExt || 'Untitled Track',
  };
}

export interface ParsedAudioMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  trackNumber?: number;
  year?: number;
  genre?: string;
  artworkBlob?: Blob;
  artworkUrl: string;
  lyrics?: string;
}

/**
 * Robust Client-Side Audio File Metadata & Cover Art Extractor.
 * Parses ID3/Vorbis/FLAC/MP4 tags, safely converts picture APIC buffers to Blob URLs,
 * and falls back gracefully to sanitized filenames and vector SVG covers.
 */
export async function parseAudioFileMetadata(file: File): Promise<ParsedAudioMetadata> {
  const fallback = sanitizeFilename(file.name);

  try {
    const metadata = await mm.parseBlob(file, { duration: true, skipCovers: false });
    const common = metadata.common;

    // Track Title (with fallback to sanitized filename if missing)
    const title = (common.title && common.title.trim()) ? common.title.trim() : fallback.title;

    // Artist Name (with fallback to "Unknown Artist")
    const artist = (common.artist && common.artist.trim()) ? common.artist.trim() : fallback.artist;

    // Album Name
    const album = (common.album && common.album.trim()) ? common.album.trim() : 'Local Audio';

    // Track Duration
    const duration = metadata.format.duration && !isNaN(metadata.format.duration) && metadata.format.duration > 0
      ? Math.round(metadata.format.duration)
      : 0;

    const trackNumber = common.track?.no || fallback.trackNumber;
    const year = common.year;
    const genre = common.genre?.[0];

    const rawLyrics = common.lyrics?.[0];
    const lyrics = typeof rawLyrics === 'string' ? rawLyrics : (rawLyrics as any)?.text;

    let artworkBlob: Blob | undefined;
    let artworkUrl: string | undefined;

    // Convert raw image APIC / covr buffer into a safe Blob URL via URL.createObjectURL
    if (common.picture && common.picture.length > 0) {
      try {
        const pic = common.picture[0];
        const mimeType = pic.format || 'image/jpeg';
        artworkBlob = new Blob([new Uint8Array(pic.data)], { type: mimeType });
        artworkUrl = registerObjectUrl(URL.createObjectURL(artworkBlob));
      } catch (err) {
        console.warn(`[MetadataParser] Failed to convert picture blob for ${file.name}:`, err);
      }
    }

    // Fallback to SVG Vector Cover if file lacks an embedded picture
    if (!artworkUrl) {
      artworkUrl = generateSvgCover(title, artist);
    }

    return {
      title,
      artist,
      album,
      duration,
      trackNumber,
      year,
      genre,
      artworkBlob,
      artworkUrl,
      lyrics,
    };
  } catch (err) {
    console.warn(`[MetadataParser] Failed to parse tags for ${file.name}, using fallback:`, err);
    return {
      title: fallback.title,
      artist: fallback.artist,
      album: 'Local Audio',
      duration: 0,
      trackNumber: fallback.trackNumber,
      artworkUrl: generateSvgCover(fallback.title, fallback.artist),
    };
  }
}
