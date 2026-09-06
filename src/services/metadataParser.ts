import jsmediatags from 'jsmediatags';
import { Track } from '../types';

/**
 * Creates a beautiful SVG Data URL with initials and an aesthetic modern dark gradient
 */
export function generateGradientCover(title: string, artist: string): string {
  const text = (title || 'A').trim().charAt(0).toUpperCase();
  const hues = [
    ['#4f46e5', '#7c3aed', '#ec4899'],
    ['#06b6d4', '#3b82f6', '#8b5cf6'],
    ['#10b981', '#06b6d4', '#6366f1'],
    ['#f59e0b', '#ef4444', '#ec4899'],
    ['#8b5cf6', '#d946ef', '#f43f5e'],
  ];

  // Pick deterministic palette based on sum of char codes
  const charSum = (title + artist).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palette = hues[charSum % hues.length];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}" />
          <stop offset="50%" stop-color="${palette[1]}" />
          <stop offset="100%" stop-color="${palette[2]}" />
        </linearGradient>
        <radialGradient id="meshGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.3" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" rx="32" fill="url(#bgGrad)" />
      <rect width="400" height="400" rx="32" fill="url(#meshGrad)" />
      <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
      <text x="200" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="110" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="-2">
        ${text}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Extracts metadata from a filename formatted like:
 * "001 - Artist - Title.mp3" or "Artist - Title.mp3" or "Title.mp3"
 */
export function parseFilenameMetadata(filename: string): { title: string; artist: string; trackNumber?: number } {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const clean = withoutExt.trim();

  // Pattern: "001 - Artist - Title"
  const matchNumbered = clean.match(/^(\d+)\s*[-_.]\s*(.*?)\s*[-_.]\s*(.+)$/);
  if (matchNumbered) {
    return {
      trackNumber: parseInt(matchNumbered[1], 10),
      artist: matchNumbered[2].trim(),
      title: matchNumbered[3].trim(),
    };
  }

  // Pattern: "Artist - Title"
  const matchArtistTitle = clean.match(/^(.*?)\s*[-_.]\s*(.+)$/);
  if (matchArtistTitle) {
    return {
      artist: matchArtistTitle[1].trim(),
      title: matchArtistTitle[2].trim(),
    };
  }

  return {
    artist: 'فنان غير معروف',
    title: clean,
  };
}

/**
 * Parses ID3 tags and embedded artwork from a File object
 */
export async function parseAudioFile(file: File): Promise<Partial<Track>> {
  return new Promise((resolve) => {
    const fallbackMeta = parseFilenameMetadata(file.name);

    try {
      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          const tags = tag.tags;
          let artworkUrl: string | undefined = undefined;

          if (tags.picture) {
            try {
              const { data, format } = tags.picture;
              let base64String = '';
              for (let i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
              }
              artworkUrl = `data:${format};base64,${window.btoa(base64String)}`;
            } catch (picErr) {
              artworkUrl = undefined;
            }
          }

          const parsedTrack: Partial<Track> = {
            title: (tags.title && tags.title.trim()) || fallbackMeta.title,
            artist: (tags.artist && tags.artist.trim()) || fallbackMeta.artist,
            album: (tags.album && tags.album.trim()) || 'ألبوم غير محدد',
            year: tags.year || undefined,
            trackNumber: tags.track ? parseInt(tags.track, 10) : fallbackMeta.trackNumber,
            genre: tags.genre || undefined,
            artworkUrl: artworkUrl || generateGradientCover(fallbackMeta.title, fallbackMeta.artist),
            lyrics: tags.lyrics ? (typeof tags.lyrics === 'string' ? tags.lyrics : tags.lyrics.lyrics) : undefined,
          };

          resolve(parsedTrack);
        },
        onError: () => {
          // Fallback to filename metadata
          resolve({
            title: fallbackMeta.title,
            artist: fallbackMeta.artist,
            album: 'ألبوم محلي',
            trackNumber: fallbackMeta.trackNumber,
            artworkUrl: generateGradientCover(fallbackMeta.title, fallbackMeta.artist),
          });
        },
      });
    } catch (e) {
      resolve({
        title: fallbackMeta.title,
        artist: fallbackMeta.artist,
        album: 'ألبوم محلي',
        artworkUrl: generateGradientCover(fallbackMeta.title, fallbackMeta.artist),
      });
    }
  });
}

/**
 * Gets exact duration of an audio file using an HTMLAudioElement
 */
export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(url);
      audio.src = '';
    };

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      cleanUp();
      resolve(isFinite(dur) && dur > 0 ? dur : 0);
    };

    audio.onerror = () => {
      cleanUp();
      resolve(0);
    };

    audio.src = url;
  });
}
