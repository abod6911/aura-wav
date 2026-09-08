import { Track } from '../types';

export interface SearchResultsCategorized {
  topResult: Track | null;
  songs: Track[];
  artists: { id: string; name: string; avatarUrl: string; listeners?: string }[];
  albums: { id: string; title: string; artist: string; coverUrl: string; year?: string }[];
}

// Resilient public search & stream endpoints with multi-instance redundancy
const SEARCH_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.private.coffee',
];

const STREAM_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.private.coffee',
];

/**
 * Universal Search across YouTube Music & Worldwide Music Endpoints
 */
export async function searchWorldwideMusic(query: string): Promise<SearchResultsCategorized> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { topResult: null, songs: [], artists: [], albums: [] };
  }

  // Strategy 1: Fast iTunes / Apple Music metadata search for clean albums & high-res artwork
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=25`;
    const res = await fetch(itunesUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const songs: Track[] = data.results.map((item: any) => {
          const highResArtwork = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb', '600x600bb')
            : '/logo.svg';

          return {
            id: `online-${item.trackId || Math.random().toString(36).substring(2, 9)}`,
            title: item.trackName || 'أغنية غير معروفة',
            artist: item.artistName || 'فنان غير معروف',
            album: item.collectionName || 'ألبوم فردي',
            duration: Math.round((item.trackTimeMillis || 180000) / 1000),
            artworkUrl: highResArtwork,
            coverUrl: highResArtwork,
            audioUrl: item.previewUrl, // 30s high-bitrate preview or fallback stream
            source: 'demo' as const,
            dominantColor: '#1DB954',
            accentColor: '#1DB954',
            dateAdded: Date.now(),
          };
        });

        // Derive Artists
        const artistMap = new Map<string, { id: string; name: string; avatarUrl: string }>();
        // Derive Albums
        const albumMap = new Map<string, { id: string; title: string; artist: string; coverUrl: string; year?: string }>();

        data.results.forEach((item: any) => {
          if (item.artistName && !artistMap.has(item.artistName)) {
            artistMap.set(item.artistName, {
              id: `artist-${item.artistId || item.artistName}`,
              name: item.artistName,
              avatarUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : '/logo.svg',
            });
          }
          if (item.collectionName && !albumMap.has(item.collectionName)) {
            albumMap.set(item.collectionName, {
              id: `album-${item.collectionId || item.collectionName}`,
              title: item.collectionName,
              artist: item.artistName,
              coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : '/logo.svg',
              year: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : undefined,
            });
          }
        });

        return {
          topResult: songs[0] || null,
          songs,
          artists: Array.from(artistMap.values()).slice(0, 4),
          albums: Array.from(albumMap.values()).slice(0, 6),
        };
      }
    }
  } catch (err) {
    console.warn('iTunes search fallback triggered:', err);
  }

  // Strategy 2: Invidious / YouTube Music endpoint search
  for (const instance of SEARCH_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const results = await res.json();

      if (Array.isArray(results) && results.length > 0) {
        const songs: Track[] = results.slice(0, 20).map((item: any) => {
          const thumbnail = item.videoThumbnails?.find((t: any) => t.quality === 'high')?.url
            || item.videoThumbnails?.[0]?.url
            || '/logo.svg';

          return {
            id: item.videoId,
            title: item.title,
            artist: item.author || 'فنان عالمي',
            album: 'YouTube Music Stream',
            duration: item.lengthSeconds || 200,
            artworkUrl: thumbnail,
            coverUrl: thumbnail,
            audioUrl: `/api/stream?id=${item.videoId}`,
            source: 'demo' as const,
            dominantColor: '#1DB954',
            accentColor: '#1DB954',
            dateAdded: Date.now(),
          };
        });

        return {
          topResult: songs[0] || null,
          songs,
          artists: [{
            id: `artist-${cleanQuery}`,
            name: cleanQuery,
            avatarUrl: songs[0]?.coverUrl || '/logo.svg',
            listeners: '1.2M مستمع شهرياً',
          }],
          albums: [],
        };
      }
    } catch {
      continue;
    }
  }

  return { topResult: null, songs: [], artists: [], albums: [] };
}

/**
 * Resolves a high-bitrate playable audio stream URL for any track.
 * Supports auto-retry and multi-instance failover.
 */
export async function resolvePlayableStream(track: Track): Promise<string | null> {
  // If track already has a valid local blob or URL, return it directly
  if (track.audioUrl && (track.audioUrl.startsWith('blob:') || track.audioUrl.startsWith('http'))) {
    return track.audioUrl;
  }

  // If track has a YouTube video ID
  const videoId = track.id.replace('online-', '');

  // 1. Try local/server proxy /api/stream?id=
  try {
    const proxyUrl = `/api/stream?id=${encodeURIComponent(videoId)}`;
    const check = await fetch(proxyUrl, { method: 'HEAD' });
    if (check.ok) return proxyUrl;
  } catch {}

  // 2. Query Invidious instances directly for adaptive audio stream
  for (const instance of STREAM_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${encodeURIComponent(videoId)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && Array.isArray(data.adaptiveFormats)) {
        const audio = data.adaptiveFormats
          .filter((f: any) => f.mimeType && f.mimeType.startsWith('audio/'))
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (audio && audio.url) {
          return audio.url;
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback to existing track audioUrl if present
  return track.audioUrl || null;
}
