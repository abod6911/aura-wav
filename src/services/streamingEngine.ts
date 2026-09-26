import { Track } from '../types';
import { TRACKS_CATALOG, resolveCatalogTrackItem } from '../data/tracksCatalog';

export interface SearchResultsCategorized {
  topResult: Track | null;
  songs: Track[];
  artists: { id: string; name: string; avatarUrl: string; listeners?: string }[];
  albums: { id: string; title: string; artist: string; coverUrl: string; year?: string }[];
}

function cleanStr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Universal Search across Local Catalog & Worldwide Music Endpoints
 * Prioritizes 100% full-length local studio tracks first, and resolves
 * full-length high quality streams for worldwide / Arabic tracks.
 */
export async function searchWorldwideMusic(query: string): Promise<SearchResultsCategorized> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { topResult: null, songs: [], artists: [], albums: [] };
  }

  const normalizedQuery = cleanStr(cleanQuery);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  // 1. Search Local Catalog & Library (over 1,750 high-fidelity master tracks)
  const localMatchingSongs: Track[] = [];
  const artistMap = new Map<string, { id: string; name: string; avatarUrl: string; listeners?: string }>();
  const albumMap = new Map<string, { id: string; title: string; artist: string; coverUrl: string; year?: string }>();

  for (const item of TRACKS_CATALOG) {
    const itemTitle = cleanStr(item.title || '');
    const itemArtist = cleanStr(item.artists || '');
    const itemAlbum = cleanStr(item.album || '');
    const itemGenre = cleanStr(item.genre || '');

    const isMatch =
      itemTitle.includes(normalizedQuery) ||
      itemArtist.includes(normalizedQuery) ||
      itemAlbum.includes(normalizedQuery) ||
      itemGenre.includes(normalizedQuery) ||
      (queryTokens.length > 1 && queryTokens.every(tok => itemTitle.includes(tok) || itemArtist.includes(tok)));

    if (isMatch) {
      const durSecs = item.durationSecs || 210;
      const track: Track = {
        id: `track_catalog_${item.number}`,
        title: item.title,
        artist: item.artists,
        album: item.album || 'Studio Master',
        duration: durSecs, // Full track length in seconds
        trackNumber: item.number,
        artworkUrl: item.coverUrl,
        coverUrl: item.coverUrl,
        audioUrl: item.audioUrl, // Direct local studio master
        fileName: item.fileName,
        source: 'local',
        dominantColor: '#1DB954',
        accentColor: '#1DB954',
        dateAdded: Date.now(),
      };
      localMatchingSongs.push(track);

      if (item.artists && !artistMap.has(item.artists)) {
        artistMap.set(item.artists, {
          id: `artist-${item.artists}`,
          name: item.artists,
          avatarUrl: item.coverUrl,
          listeners: 'مسار محلي كامل',
        });
      }

      if (item.album && !albumMap.has(item.album)) {
        albumMap.set(item.album, {
          id: `album-${item.album}`,
          title: item.album,
          artist: item.artists,
          coverUrl: item.coverUrl,
        });
      }
    }
  }

  // Sort local matches: exact match on title or artist first
  localMatchingSongs.sort((a, b) => {
    const aExact = cleanStr(a.title) === normalizedQuery || cleanStr(a.artist) === normalizedQuery;
    const bExact = cleanStr(b.title) === normalizedQuery || cleanStr(b.artist) === normalizedQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });

  // 2. Query Apple Music / iTunes Worldwide Search for official album artwork & track metadata
  const onlineSongs: Track[] = [];
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=30`;
    const res = await fetch(itunesUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        for (const item of data.results) {
          const highResArtwork = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb', '600x600bb')
            : '/logo.svg';

          const trackTitle = item.trackName || 'أغنية غير معروفة';
          const trackArtist = item.artistName || 'فنان غير معروف';
          const trackAlbum = item.collectionName || 'ألبوم فردي';
          const fullDuration = Math.round((item.trackTimeMillis || 210000) / 1000);

          // Check if this online track matches a local catalog song
          const matchedLocal = localMatchingSongs.find(lt => {
            const ltTitle = cleanStr(lt.title);
            const itTitle = cleanStr(trackTitle);
            return ltTitle.includes(itTitle) || itTitle.includes(ltTitle);
          });

          // If local master exists, play the local studio file!
          // Otherwise route through full-length /api/stream endpoint!
          const streamAudioUrl = matchedLocal?.audioUrl ||
            `/api/stream?query=${encodeURIComponent(`${trackArtist} - ${trackTitle}`)}&dur=${item.trackTimeMillis || 210000}&preview=${encodeURIComponent(item.previewUrl || '')}`;

          onlineSongs.push({
            id: matchedLocal ? matchedLocal.id : `online-${item.trackId || Math.random().toString(36).substring(2, 9)}`,
            title: trackTitle,
            artist: trackArtist,
            album: trackAlbum,
            duration: fullDuration, // FULL DURATION (e.g. 240s, 310s - NOT 30s!)
            artworkUrl: highResArtwork,
            coverUrl: highResArtwork,
            audioUrl: streamAudioUrl, // Full audio stream
            source: matchedLocal ? 'local' : 'online',
            dominantColor: '#FA243C',
            accentColor: '#FA243C',
            dateAdded: Date.now(),
          });

          if (trackArtist && !artistMap.has(trackArtist)) {
            artistMap.set(trackArtist, {
              id: `artist-${item.artistId || trackArtist}`,
              name: trackArtist,
              avatarUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : '/logo.svg',
            });
          }

          if (trackAlbum && !albumMap.has(trackAlbum)) {
            albumMap.set(trackAlbum, {
              id: `album-${item.collectionId || trackAlbum}`,
              title: trackAlbum,
              artist: trackArtist,
              coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : '/logo.svg',
              year: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : undefined,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[WorldwideSearch] iTunes search error:', err);
  }

  // Combine results: local catalog tracks first, followed by non-duplicate online songs
  const seenKeys = new Set<string>();
  const mergedSongs: Track[] = [];

  for (const track of [...localMatchingSongs, ...onlineSongs]) {
    const key = `${cleanStr(track.title)}:::${cleanStr(track.artist)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      mergedSongs.push(track);
    }
  }

  return {
    topResult: mergedSongs[0] || null,
    songs: mergedSongs,
    artists: Array.from(artistMap.values()).slice(0, 6),
    albums: Array.from(albumMap.values()).slice(0, 8),
  };
}

// In-memory stream cache to avoid redundant network lookups
const resolvedStreamCache = new Map<string, string>();

/**
 * Resolves a high-bitrate playable audio stream URL for any track.
 * Strictly guarantees full-length track playback (never 30-second previews).
 */
export async function resolvePlayableStream(track: Track): Promise<string | null> {
  if (!track) return null;

  // 1. Direct blob in track object
  if (track.blob) {
    try {
      return URL.createObjectURL(track.blob);
    } catch {}
  }

  const cacheKey = `${track.title}:::${track.artist}`.toLowerCase().trim();
  if (resolvedStreamCache.has(cacheKey)) {
    return resolvedStreamCache.get(cacheKey)!;
  }

  // 2. Direct local /songs/ path
  if (track.audioUrl && track.audioUrl.startsWith('/songs/')) {
    try {
      const decoded = decodeURIComponent(track.audioUrl);
      return encodeURI(decoded);
    } catch {
      return track.audioUrl;
    }
  }

  // 3. /api/stream endpoint (our full-length backend streamer)
  if (track.audioUrl && track.audioUrl.startsWith('/api/stream')) {
    return track.audioUrl;
  }

  // 4. Check if track matches catalog item
  const catItem = resolveCatalogTrackItem(track.fileName, track.title, track.artist, track.trackNumber);
  if (catItem && catItem.audioUrl) {
    resolvedStreamCache.set(cacheKey, catItem.audioUrl);
    return catItem.audioUrl;
  }

  // 5. If track has an iTunes 30s preview URL (e.g. mzstatic.com / AudioPreview):
  // DO NOT return the 30-second preview! Re-route through full stream endpoint
  const isItunesPreview = track.audioUrl && (
    track.audioUrl.includes('mzstatic.com') ||
    track.audioUrl.includes('itunes.apple.com') ||
    track.audioUrl.includes('/AudioPreview')
  );

  const cleanTitle = (track.title || '')
    .replace(/^\d+\s*[-_.]\s*/, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/ft\..*$/i, '')
    .replace(/feat\..*$/i, '')
    .trim();

  const cleanArtist = (track.artist || '')
    .replace(/feat\..*$/i, '')
    .replace(/ft\..*$/i, '')
    .replace(/,.*$/, '')
    .trim();

  const fullStreamQuery = `${cleanArtist} ${cleanTitle}`.trim();

  if (isItunesPreview) {
    const fullStreamUrl = `/api/stream?query=${encodeURIComponent(fullStreamQuery)}&preview=${encodeURIComponent(track.audioUrl || '')}`;
    resolvedStreamCache.set(cacheKey, fullStreamUrl);
    return fullStreamUrl;
  }

  // 6. Direct HTTP/HTTPS audio URL that is NOT a preview
  if (track.audioUrl && track.audioUrl.startsWith('http') && !isItunesPreview) {
    return track.audioUrl;
  }

  // 7. Fallback to full stream endpoint for any track
  const fallbackUrl = `/api/stream?query=${encodeURIComponent(fullStreamQuery)}`;
  resolvedStreamCache.set(cacheKey, fallbackUrl);
  return fallbackUrl;
}
