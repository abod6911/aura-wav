import { Track } from '../types';

export interface ArtistSummary {
  name: string;
  trackCount: number;
  albumCount: number;
  artworkUrl: string;
  topGenre: string;
  tracks: Track[];
}

export interface AlbumSummary {
  name: string;
  artist: string;
  artworkUrl: string;
  trackCount: number;
  totalDuration: number;
  genre: string;
  year?: string | number;
  tracks: Track[];
}

export interface ArtistProfile {
  name: string;
  tracks: Track[];
  albums: AlbumSummary[];
  artworkUrl: string;
  totalDuration: number;
  topGenre: string;
  similarArtists: ArtistSummary[];
}

export type AlbumDetails = AlbumSummary;

export interface GenreDetails {
  name: string;
  tracks: Track[];
  artists: ArtistSummary[];
  albums: AlbumSummary[];
  totalDuration: number;
}

/**
 * Smart Multi-Artist Parser
 * Splits strings like "Flo Rida, Kesha", "Naughty Boy, Sam Smith",
 * "Major Lazer & DJ Snake feat. MØ" into clean individual artist names.
 */
export function splitArtists(artistString?: string | null): string[] {
  if (!artistString) return [];
  const normalized = artistString
    .replace(/\s+(?:feat\.|feat|ft\.|ft|with)\s+/gi, ', ')
    .replace(/\s+&\s+/g, ', ')
    .replace(/\s+\/\s+/g, ', ');

  return normalized
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0 && a !== '-' && a.toLowerCase() !== 'unknown');
}

/**
 * Checks if a track includes a given artist name.
 */
export function trackIncludesArtist(track: Track, artistName: string): boolean {
  if (!track.artist) return false;
  const target = artistName.trim().toLowerCase();
  const list = splitArtists(track.artist);
  return list.some((a) => a.toLowerCase() === target) || track.artist.toLowerCase().includes(target);
}

// In-Memory Cache for 0ms re-computations
let cachedTracksRef: Track[] | null = null;
let cachedArtists: ArtistSummary[] | null = null;
let cachedAlbums: AlbumSummary[] | null = null;

function ensureCache(tracks: Track[]) {
  if (cachedTracksRef === tracks && cachedArtists && cachedAlbums) {
    return;
  }

  // 1. Group artists
  const artistMap = new Map<string, { name: string; tracks: Track[]; albums: Set<string>; genres: Map<string, number> }>();

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const names = splitArtists(t.artist);
    const validNames = names.length > 0 ? names : (t.artist?.trim() ? [t.artist.trim()] : ['Unknown Artist']);

    for (const name of validNames) {
      const key = name.toLowerCase();
      let record = artistMap.get(key);
      if (!record) {
        record = {
          name,
          tracks: [],
          albums: new Set(),
          genres: new Map(),
        };
        artistMap.set(key, record);
      }

      record.tracks.push(t);
      if (t.album && t.album.trim() && t.album.toLowerCase() !== 'unknown album') {
        record.albums.add(t.album.trim());
      }
      if (t.genre && t.genre.trim()) {
        const g = t.genre.trim();
        record.genres.set(g, (record.genres.get(g) || 0) + 1);
      }
    }
  }

  const artists: ArtistSummary[] = [];
  for (const record of artistMap.values()) {
    let topGenre = 'Pop';
    let maxGCount = 0;
    for (const [g, count] of record.genres.entries()) {
      if (count > maxGCount) {
        maxGCount = count;
        topGenre = g;
      }
    }

    const firstArt = record.tracks.find((t) => t.coverUrl || t.artworkUrl);
    const artworkUrl = firstArt?.coverUrl || firstArt?.artworkUrl || '/logo.svg';

    artists.push({
      name: record.name,
      trackCount: record.tracks.length,
      albumCount: record.albums.size || 1,
      artworkUrl,
      topGenre,
      tracks: record.tracks,
    });
  }

  // Sort artists by track count descending
  artists.sort((a, b) => b.trackCount - a.trackCount);

  // 2. Group albums
  const albumMap = new Map<string, { name: string; artist: string; tracks: Track[]; genre: string; year?: string | number }>();

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const albumName = (t.album || '').trim();
    if (!albumName || albumName.toLowerCase() === 'unknown album' || albumName === '-') {
      continue;
    }

    const key = albumName.toLowerCase();
    let record = albumMap.get(key);
    if (!record) {
      record = {
        name: albumName,
        artist: t.artist || 'Unknown Artist',
        tracks: [],
        genre: t.genre || 'Music',
        year: t.year,
      };
      albumMap.set(key, record);
    }

    record.tracks.push(t);
    if (!record.year && t.year) record.year = t.year;
  }

  const albums: AlbumSummary[] = [];
  for (const record of albumMap.values()) {
    const firstArt = record.tracks.find((t) => t.coverUrl || t.artworkUrl);
    const artworkUrl = firstArt?.coverUrl || firstArt?.artworkUrl || '/logo.svg';
    const totalDuration = record.tracks.reduce((acc, trk) => acc + (trk.duration || 0), 0);

    // Pick most representative artist for the album
    const albumArtist = record.tracks.length > 1 && record.tracks.some((tr) => tr.artist !== record.artist)
      ? 'Various Artists'
      : record.artist;

    albums.push({
      name: record.name,
      artist: albumArtist,
      artworkUrl,
      trackCount: record.tracks.length,
      totalDuration,
      genre: record.genre,
      year: record.year,
      tracks: record.tracks,
    });
  }

  // Sort albums by track count descending
  albums.sort((a, b) => b.trackCount - a.trackCount);

  cachedTracksRef = tracks;
  cachedArtists = artists;
  cachedAlbums = albums;
}

/**
 * Returns all unique artists sorted by track count descending.
 */
export function getAllArtists(tracks: Track[]): ArtistSummary[] {
  ensureCache(tracks);
  return cachedArtists || [];
}

/**
 * Returns complete profile for an artist including tracks, albums, and similar artists.
 */
export function getArtistProfile(tracks: Track[], artistName: string): ArtistProfile {
  ensureCache(tracks);
  const all = cachedArtists || [];
  const cleanTarget = artistName.trim().toLowerCase();

  const found = all.find((a) => a.name.toLowerCase() === cleanTarget);

  // If not found in cache directly, filter tracks dynamically
  const artistTracks = found
    ? found.tracks
    : tracks.filter((t) => trackIncludesArtist(t, artistName));

  const totalDuration = artistTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const firstArt = artistTracks.find((t) => t.coverUrl || t.artworkUrl);
  const artworkUrl = firstArt?.coverUrl || firstArt?.artworkUrl || '/logo.svg';
  const topGenre = found?.topGenre || artistTracks[0]?.genre || 'Pop';

  // Find albums containing this artist's tracks
  const allAlbums = cachedAlbums || [];
  const artistAlbums = allAlbums.filter((alb) =>
    alb.tracks.some((t) => trackIncludesArtist(t, artistName))
  );

  // Similar artists: top artists with matching genre (excluding current artist)
  const similarArtists = all
    .filter((a) => a.name.toLowerCase() !== cleanTarget && a.topGenre.toLowerCase() === topGenre.toLowerCase())
    .slice(0, 8);

  return {
    name: found?.name || artistName.trim(),
    tracks: artistTracks,
    albums: artistAlbums,
    artworkUrl,
    totalDuration,
    topGenre,
    similarArtists,
  };
}

/**
 * Returns all unique albums.
 */
export function getAllAlbums(tracks: Track[]): AlbumSummary[] {
  ensureCache(tracks);
  return cachedAlbums || [];
}

/**
 * Returns album details with tracks sorted by trackNumber.
 */
export function getAlbumDetails(tracks: Track[], albumName: string, artistHint?: string): AlbumDetails {
  ensureCache(tracks);
  const all = cachedAlbums || [];
  const cleanTarget = albumName.trim().toLowerCase();

  let found = all.find((a) => a.name.toLowerCase() === cleanTarget);

  if (!found && artistHint) {
    const cleanHint = artistHint.trim().toLowerCase();
    found = all.find((a) => a.name.toLowerCase() === cleanTarget && a.artist.toLowerCase().includes(cleanHint));
  }

  const albumTracks = found
    ? [...found.tracks]
    : tracks.filter((t) => (t.album || '').trim().toLowerCase() === cleanTarget);

  // Sort tracks by trackNumber ascending if available
  albumTracks.sort((a, b) => {
    const numA = typeof a.trackNumber === 'number' && a.trackNumber > 0 ? a.trackNumber : 9999;
    const numB = typeof b.trackNumber === 'number' && b.trackNumber > 0 ? b.trackNumber : 9999;
    return numA - numB;
  });

  const totalDuration = albumTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const firstArt = albumTracks.find((t) => t.coverUrl || t.artworkUrl);

  return {
    name: found?.name || albumName.trim(),
    artist: found?.artist || albumTracks[0]?.artist || 'Unknown Artist',
    artworkUrl: firstArt?.coverUrl || firstArt?.artworkUrl || '/logo.svg',
    trackCount: albumTracks.length,
    totalDuration,
    genre: found?.genre || albumTracks[0]?.genre || 'Music',
    year: found?.year || albumTracks[0]?.year,
    tracks: albumTracks,
  };
}

/**
 * Returns genre details with tracks, prominent artists, and albums.
 */
export function getGenreDetails(tracks: Track[], genreName: string): GenreDetails {
  ensureCache(tracks);
  const cleanGenre = genreName.trim().toLowerCase();

  const genreTracks = tracks.filter((t) => {
    if (!t.genre) return false;
    const g = t.genre.toLowerCase();
    return g === cleanGenre || g.includes(cleanGenre) || cleanGenre.includes(g);
  });

  const totalDuration = genreTracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  // Prominent artists in this genre
  const allArtists = cachedArtists || [];
  const artistsInGenre = allArtists
    .filter((a) => a.tracks.some((t) => t.genre && t.genre.toLowerCase().includes(cleanGenre)))
    .slice(0, 10);

  // Prominent albums in this genre
  const allAlbums = cachedAlbums || [];
  const albumsInGenre = allAlbums
    .filter((a) => a.genre && a.genre.toLowerCase().includes(cleanGenre))
    .slice(0, 10);

  return {
    name: genreName,
    tracks: genreTracks,
    artists: artistsInGenre,
    albums: albumsInGenre,
    totalDuration,
  };
}
