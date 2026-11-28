import { Track } from '../types';
import { splitArtists } from './catalogSelectors';

export interface DailyMix {
  id: string; // 'daily-mix-1' to 'daily-mix-5'
  title: string; // 'ميكس يومي 1'
  subtitle: string; // 'The Weeknd، Drake، Post Malone والمزيد'
  badge: string;
  collageCovers: string[]; // 4 artwork URLs
  accentGradient: string;
  tracks: Track[];
  genre?: string;
}

export interface SmartMix {
  id: string; // 'daily-mix-1'..'daily-mix-5', 'on-repeat', 'rediscover'
  title: string;
  subtitle: string;
  badge: string;
  collageCovers: string[];
  accentGradient: string;
  tracks: Track[];
  genre?: string;
}

/**
 * Returns a stable daily seed number based on current UTC/local day (YYYY-MM-DD).
 * Ensures all daily mixes remain locked all day and refresh smoothly at midnight.
 */
export function getDailySeedString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getDailySeed(): number {
  const dateStr = getDailySeedString();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 123456789;
}

/**
 * Fast seeded PRNG (Mulberry32).
 */
function createRng(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded shuffle algorithm for reproducible daily randomness.
 */
export function seededShuffle<T>(array: T[], seed: number = getDailySeed()): T[] {
  const rng = createRng(seed);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Prevents two consecutive songs by the same artist.
 */
export function balanceTracksByArtist(tracks: Track[]): Track[] {
  if (tracks.length <= 2) return tracks;
  const result: Track[] = [];
  const remaining = [...tracks];

  let lastArtist = '';
  while (remaining.length > 0) {
    const nextIdx = remaining.findIndex(
      (t) => (t.artist || '').trim().toLowerCase() !== lastArtist
    );

    if (nextIdx !== -1) {
      const chosen = remaining.splice(nextIdx, 1)[0];
      result.push(chosen);
      lastArtist = (chosen.artist || '').trim().toLowerCase();
    } else {
      // All remaining tracks are by the same artist, append the rest
      result.push(...remaining);
      break;
    }
  }

  return result;
}

/**
 * Extracts up to 4 unique artwork URLs for Spotify-style 2x2 collage covers.
 */
export function extractCollageCovers(tracks: Track[]): string[] {
  const seen = new Set<string>();
  const covers: string[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const url = t.artworkUrl || t.coverUrl;
    if (url && !seen.has(url) && url !== './logo.svg') {
      seen.add(url);
      covers.push(url);
      if (covers.length === 4) break;
    }
  }

  // Fallbacks if fewer than 4 unique covers
  while (covers.length < 4) {
    covers.push(covers[0] || './logo.svg');
  }
  return covers;
}

/**
 * Formats a clean list of top 3 artists in the mix: "The Weeknd، Drake، Post Malone والمزيد"
 */
export function formatProminentArtistsSubtitle(tracks: Track[], isArabic: boolean = true): string {
  const counts = new Map<string, number>();
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const names = splitArtists(t.artist);
    const valid = names.length > 0 ? names : (t.artist ? [t.artist] : []);
    for (const n of valid) {
      counts.set(n, (counts.get(n) || 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map((e) => e[0]);

  const top3 = sorted.slice(0, 3);
  if (top3.length === 0) return isArabic ? 'مجموعة من أغانيك المفضلة' : 'Curated music for you';
  if (top3.length === 1) return top3[0];
  if (top3.length === 2) return `${top3[0]}، ${top3[1]}`;
  return isArabic ? `${top3[0]}، ${top3[1]}، ${top3[2]} والمزيد` : `${top3[0]}, ${top3[1]}, ${top3[2]} and more`;
}

// 5 Core Daily Mix Configurations mapped to catalog genres
const DAILY_MIX_CONFIGS = [
  {
    id: 'daily-mix-1',
    num: 1,
    genre: 'Pop',
    keywords: ['pop'],
    gradient: 'from-[#5F2468] via-[#220B26] to-[#121212]',
  },
  {
    id: 'daily-mix-2',
    num: 2,
    genre: 'Hip-Hop & Trap',
    keywords: ['hip', 'rap', 'trap'],
    gradient: 'from-[#8C3A00] via-[#2D1200] to-[#121212]',
  },
  {
    id: 'daily-mix-3',
    num: 3,
    genre: 'R&B & Soul',
    keywords: ['r&b', 'soul'],
    gradient: 'from-[#581896] via-[#1E0536] to-[#121212]',
  },
  {
    id: 'daily-mix-4',
    num: 4,
    genre: 'EDM & Dance',
    keywords: ['edm', 'dance', 'house', 'techno', 'electronic'],
    gradient: 'from-[#005E4D] via-[#00221B] to-[#121212]',
  },
  {
    id: 'daily-mix-5',
    num: 5,
    genre: 'Rock & Alternative',
    keywords: ['rock', 'alternative', 'indie', 'metal'],
    gradient: 'from-[#6E141C] via-[#260508] to-[#121212]',
  },
];

// In-Memory Cache for Daily Mixes
let cachedDailySeed = '';
let cachedTracksRef: Track[] | null = null;
let cachedDailyMixes: DailyMix[] | null = null;
let cachedOnRepeat: SmartMix | null = null;
let cachedRediscover: SmartMix | null = null;

/**
 * Generates the 5 Spotify Daily Mixes based on the user's catalog and listening habits.
 */
export function generateDailyMixes(
  tracks: Track[],
  favorites: string[] = [],
  playStats: Record<string, { playCount: number; lastPlayedAt: number }> = {}
): DailyMix[] {
  const seedStr = getDailySeedString();
  const seedNum = getDailySeed();

  if (cachedDailySeed === seedStr && cachedTracksRef === tracks && cachedDailyMixes) {
    return cachedDailyMixes;
  }

  const favSet = new Set(favorites);
  const mixes: DailyMix[] = [];

  for (let idx = 0; idx < DAILY_MIX_CONFIGS.length; idx++) {
    const config = DAILY_MIX_CONFIGS[idx];
    const mixSeed = seedNum + idx * 7919;

    // Filter tracks matching this genre's keywords
    const matchingTracks = tracks.filter((t) => {
      if (!t.genre) return false;
      const g = t.genre.toLowerCase();
      return config.keywords.some((kw) => g.includes(kw));
    });

    const pool = matchingTracks.length >= 10 ? matchingTracks : tracks;

    // Divide pool into: User Loved (favorite or played) & Catalog Discovery
    const lovedTracks: Track[] = [];
    const discoveryTracks: Track[] = [];

    for (let i = 0; i < pool.length; i++) {
      const t = pool[i];
      const isFav = favSet.has(t.id);
      const playCount = playStats[t.id]?.playCount || 0;
      if (isFav || playCount > 0) {
        lovedTracks.push(t);
      } else {
        discoveryTracks.push(t);
      }
    }

    // Seeded shuffle both sub-pools
    const shuffledLoved = seededShuffle(lovedTracks, mixSeed);
    const shuffledDiscovery = seededShuffle(discoveryTracks, mixSeed + 13);

    // Blend: up to 12 loved tracks + up to 18 discovery tracks (total 25-30)
    const combined: Track[] = [];
    const targetLoved = Math.min(12, shuffledLoved.length);
    const targetDiscovery = Math.min(30 - targetLoved, shuffledDiscovery.length);

    combined.push(...shuffledLoved.slice(0, targetLoved));
    combined.push(...shuffledDiscovery.slice(0, targetDiscovery));

    // If still short, backfill with remaining from pool
    if (combined.length < 25) {
      const existingIds = new Set(combined.map((t) => t.id));
      for (const t of pool) {
        if (!existingIds.has(t.id)) {
          combined.push(t);
          if (combined.length >= 25) break;
        }
      }
    }

    // Re-shuffle combined with artist anti-consecutive distribution
    const distributed = balanceTracksByArtist(seededShuffle(combined, mixSeed + 97));
    const finalTracks = distributed.slice(0, 30);

    mixes.push({
      id: config.id,
      title: `ميكس يومي ${config.num}`,
      subtitle: formatProminentArtistsSubtitle(finalTracks),
      badge: 'ميكس يومي',
      collageCovers: extractCollageCovers(finalTracks),
      accentGradient: config.gradient,
      tracks: finalTracks,
      genre: config.genre,
    });
  }

  cachedDailySeed = seedStr;
  cachedTracksRef = tracks;
  cachedDailyMixes = mixes;

  return mixes;
}

/**
 * Generates the "On Repeat" (الأكثر تكراراً) Mix based on actual playCount and recency.
 */
export function generateOnRepeatMix(
  tracks: Track[],
  playStats: Record<string, { playCount: number; lastPlayedAt: number }> = {},
  favorites: string[] = [],
  history: Track[] = []
): SmartMix {
  const seedStr = getDailySeedString();
  if (cachedDailySeed === seedStr && cachedTracksRef === tracks && cachedOnRepeat) {
    return cachedOnRepeat;
  }

  // Rank tracks by playCount descending
  const played = tracks
    .filter((t) => (playStats[t.id]?.playCount || 0) > 0)
    .sort((a, b) => {
      const countA = playStats[a.id]?.playCount || 0;
      const countB = playStats[b.id]?.playCount || 0;
      if (countB !== countA) return countB - countA;
      return (playStats[b.id]?.lastPlayedAt || 0) - (playStats[a.id]?.lastPlayedAt || 0);
    });

  const selectedIds = new Set<string>();
  const result: Track[] = [];

  for (const t of played) {
    result.push(t);
    selectedIds.add(t.id);
    if (result.length >= 25) break;
  }

  // Fallback: If user is new and has fewer than 25 played tracks, backfill with favorites & history
  if (result.length < 25) {
    const favSet = new Set(favorites);
    for (const t of tracks) {
      if (favSet.has(t.id) && !selectedIds.has(t.id)) {
        result.push(t);
        selectedIds.add(t.id);
        if (result.length >= 25) break;
      }
    }
  }

  if (result.length < 25) {
    for (const t of history) {
      if (!selectedIds.has(t.id)) {
        result.push(t);
        selectedIds.add(t.id);
        if (result.length >= 25) break;
      }
    }
  }

  if (result.length < 25) {
    const seed = getDailySeed();
    const shuffledCatalog = seededShuffle(tracks, seed);
    for (const t of shuffledCatalog) {
      if (!selectedIds.has(t.id)) {
        result.push(t);
        selectedIds.add(t.id);
        if (result.length >= 25) break;
      }
    }
  }

  const finalTracks = balanceTracksByArtist(result.slice(0, 25));

  const mix: SmartMix = {
    id: 'on-repeat',
    title: 'الأكثر تكراراً',
    subtitle: formatProminentArtistsSubtitle(finalTracks),
    badge: 'مُعدّ خصيصاً لك',
    collageCovers: extractCollageCovers(finalTracks),
    accentGradient: 'from-[#0A4834] via-[#051C14] to-[#121212]',
    tracks: finalTracks,
  };

  cachedOnRepeat = mix;
  return mix;
}

/**
 * Generates the "Rediscover" (اكتشف من مكتبتك) Mix of 30 unplayed tracks from the 1,975 catalog.
 */
export function generateRediscoverMix(
  tracks: Track[],
  playStats: Record<string, { playCount: number; lastPlayedAt: number }> = {},
  history: Track[] = []
): SmartMix {
  const seedStr = getDailySeedString();
  if (cachedDailySeed === seedStr && cachedTracksRef === tracks && cachedRediscover) {
    return cachedRediscover;
  }

  const recentHistoryIds = new Set(history.slice(-50).map((t) => t.id));

  // Find tracks with 0 play count and not in recent history
  const unplayed = tracks.filter((t) => {
    const count = playStats[t.id]?.playCount || 0;
    return count === 0 && !recentHistoryIds.has(t.id);
  });

  const pool = unplayed.length >= 30 ? unplayed : tracks;
  const seed = getDailySeed() + 4321;
  const shuffled = seededShuffle(pool, seed);
  const balanced = balanceTracksByArtist(shuffled);
  const finalTracks = balanced.slice(0, 30);

  const mix: SmartMix = {
    id: 'rediscover',
    title: 'اكتشف من مكتبتك',
    subtitle: 'كنوز ومسارات مميزة لم تستمع إليها مؤخراً',
    badge: 'كنوز لم تكتشفها',
    collageCovers: extractCollageCovers(finalTracks),
    accentGradient: 'from-[#1E3048] via-[#0B1524] to-[#121212]',
    tracks: finalTracks,
  };

  cachedRediscover = mix;
  return mix;
}

/**
 * Retrieves a SmartMix by its ID ('daily-mix-1'..'daily-mix-5', 'on-repeat', 'rediscover').
 */
export function getSmartMixById(
  mixId: string | null | undefined,
  tracks: Track[],
  favorites: string[] = [],
  playStats: Record<string, { playCount: number; lastPlayedAt: number }> = {},
  history: Track[] = []
): SmartMix | null {
  if (!mixId) return null;
  if (mixId === 'on-repeat') {
    return generateOnRepeatMix(tracks, playStats, favorites, history);
  }
  if (mixId === 'rediscover') {
    return generateRediscoverMix(tracks, playStats, history);
  }

  const dailyMixes = generateDailyMixes(tracks, favorites, playStats);
  const found = dailyMixes.find((m) => m.id === mixId);
  if (!found) return null;

  return {
    id: found.id,
    title: found.title,
    subtitle: found.subtitle,
    badge: 'مُعدّ خصيصاً لك',
    collageCovers: found.collageCovers,
    accentGradient: found.accentGradient,
    tracks: found.tracks,
    genre: found.genre,
  };
}

/**
 * Builds a cohesive 30-track Song Radio queue for a seed track.
 * Combines:
 * - The seed track itself
 * - Tracks by same artist or featuring artists (max 4)
 * - Tracks of the same genre
 * - Acoustically harmonious library tracks
 * Filters out recent history to eliminate repetitive loops.
 */
export function buildSongRadioQueue(
  seedTrack: Track,
  allTracks: Track[],
  recentHistoryIds: string[] = []
): Track[] {
  const result: Track[] = [seedTrack];
  const addedIds = new Set<string>([seedTrack.id]);
  const recentSet = new Set(recentHistoryIds.slice(-20));

  const seedArtists = splitArtists(seedTrack.artist).map((a) => a.toLowerCase());
  const seedGenre = (seedTrack.genre || '').toLowerCase().trim();

  // 1. Same artist tracks (up to 4 tracks)
  const sameArtistTracks = allTracks.filter((t) => {
    if (addedIds.has(t.id) || recentSet.has(t.id)) return false;
    const artists = splitArtists(t.artist).map((a) => a.toLowerCase());
    return artists.some((a) => seedArtists.includes(a));
  });

  const shuffledSameArtist = seededShuffle(sameArtistTracks, seedTrack.id.length * 17);
  for (const t of shuffledSameArtist.slice(0, 4)) {
    result.push(t);
    addedIds.add(t.id);
  }

  // 2. Same Genre tracks
  if (seedGenre) {
    const sameGenreTracks = allTracks.filter((t) => {
      if (addedIds.has(t.id) || recentSet.has(t.id)) return false;
      const g = (t.genre || '').toLowerCase().trim();
      return g === seedGenre || g.includes(seedGenre) || seedGenre.includes(g);
    });

    const shuffledGenre = seededShuffle(sameGenreTracks, seedTrack.id.length * 31);
    for (const t of shuffledGenre) {
      result.push(t);
      addedIds.add(t.id);
      if (result.length >= 26) break;
    }
  }

  // 3. Fallback: Complement with library tracks
  if (result.length < 30) {
    const otherTracks = allTracks.filter((t) => !addedIds.has(t.id));
    const shuffledOther = seededShuffle(otherTracks, seedTrack.id.length * 47);
    for (const t of shuffledOther) {
      result.push(t);
      addedIds.add(t.id);
      if (result.length >= 30) break;
    }
  }

  // Keep seedTrack at index 0, and balance the remaining 29 tracks
  const radioRest = balanceTracksByArtist(result.slice(1));
  return [seedTrack, ...radioRest].slice(0, 30);
}

/**
 * Intelligent Smart Autoplay resolver replacing raw Math.random().
 * Finds a harmonious track from the same genre or artist not recently heard.
 */
export function getSmartAutoplayTrack(
  currentTrack: Track,
  allTracks: Track[],
  recentHistoryIds: string[] = []
): Track | null {
  if (allTracks.length === 0) return null;
  const recentSet = new Set(recentHistoryIds.slice(-25));
  recentSet.add(currentTrack.id);

  const seedGenre = (currentTrack.genre || '').toLowerCase().trim();
  const seedArtists = splitArtists(currentTrack.artist).map((a) => a.toLowerCase());

  // Priority 1: Same Genre not in recent history
  if (seedGenre) {
    const candidates = allTracks.filter((t) => {
      if (recentSet.has(t.id)) return false;
      const g = (t.genre || '').toLowerCase().trim();
      return g === seedGenre || g.includes(seedGenre);
    });

    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx];
    }
  }

  // Priority 2: Similar Artist not in recent history
  const artistCandidates = allTracks.filter((t) => {
    if (recentSet.has(t.id)) return false;
    const artists = splitArtists(t.artist).map((a) => a.toLowerCase());
    return artists.some((a) => seedArtists.includes(a));
  });

  if (artistCandidates.length > 0) {
    const idx = Math.floor(Math.random() * artistCandidates.length);
    return artistCandidates[idx];
  }

  // Priority 3: Any track not in recent history
  const remaining = allTracks.filter((t) => !recentSet.has(t.id));
  if (remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    return remaining[idx];
  }

  // Final fallback
  const idx = Math.floor(Math.random() * allTracks.length);
  return allTracks[idx];
}
