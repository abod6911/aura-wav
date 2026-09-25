import { Track, LyricLine } from '../types';
import { parseLRC } from './lyricsParser';
import { getLyricsFromDexie, saveLyricsToDexie } from '../db/dexieDB';

/**
 * Clean track title and artist from noise (e.g. "(feat. X)", "[Remastered]", etc.)
 */
function cleanSearchQuery(text: string): string {
  return text
    .replace(/\s*[\(\[](?:feat|with|remastered|bonus|version|slowed|sped up|remix).*?[\)\]]/gi, '')
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SyncedLyricsResult {
  syncedLyrics: LyricLine[];
  plainLyrics?: string;
  rawLrc?: string;
  source: 'local' | 'cache' | 'lrclib';
}

/**
 * Multi-tier Automated Lyrics Service
 * Priority:
 * 1. Track object's embedded syncedLyrics or .lrc string
 * 2. Dexie.js offline cached .lrc record
 * 3. LRCLIB API network fetch with automatic Dexie.js offline caching
 */
export async function getTrackLyrics(track: Track): Promise<SyncedLyricsResult | null> {
  if (!track) return null;

  // Tier 1: Check track object directly
  if (track.syncedLyrics && track.syncedLyrics.length > 0) {
    return {
      syncedLyrics: track.syncedLyrics,
      plainLyrics: track.lyrics,
      source: 'local',
    };
  }

  if (track.lyrics && track.lyrics.includes('[00:')) {
    const parsed = parseLRC(track.lyrics);
    if (parsed.length > 0) {
      return {
        syncedLyrics: parsed,
        rawLrc: track.lyrics,
        source: 'local',
      };
    }
  }

  // Tier 2: Check Dexie.js offline persistent cache
  try {
    const cachedLrc = await getLyricsFromDexie(track.id);
    if (cachedLrc) {
      const parsed = parseLRC(cachedLrc);
      if (parsed.length > 0) {
        return {
          syncedLyrics: parsed,
          rawLrc: cachedLrc,
          source: 'cache',
        };
      }
    }
  } catch (err) {
    console.warn('[LyricsService] Dexie cache lookup notice:', err);
  }

  // Tier 3: Query LRCLIB API
  try {
    const cleanTitle = cleanSearchQuery(track.title);
    const cleanArtist = cleanSearchQuery(track.artist);

    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });
    if (track.duration && track.duration > 0) {
      params.append('duration', Math.round(track.duration).toString());
    }

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'AURA.WAV Music Ecosystem (https://github.com/aura-wav)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics) {
        const rawLrc = data.syncedLyrics as string;
        const parsed = parseLRC(rawLrc);

        // Cache into Dexie.js for offline instant retrieval
        await saveLyricsToDexie(track.id, rawLrc);

        return {
          syncedLyrics: parsed,
          plainLyrics: data.plainLyrics,
          rawLrc,
          source: 'lrclib',
        };
      } else if (data.plainLyrics) {
        return {
          syncedLyrics: [],
          plainLyrics: data.plainLyrics,
          source: 'lrclib',
        };
      }
    }

    // Fallback: LRCLIB search endpoint
    const searchRes = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`
    );
    if (searchRes.ok) {
      const results = await searchRes.json();
      if (Array.isArray(results) && results.length > 0) {
        const best = results[0];
        if (best.syncedLyrics) {
          const rawLrc = best.syncedLyrics as string;
          const parsed = parseLRC(rawLrc);
          await saveLyricsToDexie(track.id, rawLrc);
          return {
            syncedLyrics: parsed,
            plainLyrics: best.plainLyrics,
            rawLrc,
            source: 'lrclib',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[LyricsService] Online fetch notice:', err);
  }

  return null;
}
