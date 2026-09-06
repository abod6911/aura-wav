import { LyricLine } from '../types';

/**
 * Parses standard LRC timestamped string into an array of LyricLine objects
 * e.g. [01:23.45] Hello world -> { time: 83.45, text: "Hello world" }
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText) return [];

  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Matches all timestamps on the line (some lines have multiple timestamps)
    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    const text = trimmed.replace(timeRegex, '').trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = match[3] || '0';
      const millis = parseInt(millisStr.padEnd(3, '0').slice(0, 3), 10);

      const totalSeconds = minutes * 60 + seconds + millis / 1000;

      result.push({
        time: totalSeconds,
        text: text || '♪',
      });
    }
  }

  // Sort chronologically
  return result.sort((a, b) => a.time - b.time);
}

/**
 * Finds the index of the current active lyric based on playback time
 */
export function getActiveLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (!lyrics || lyrics.length === 0) return -1;

  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return activeIndex;
}

/**
 * Clean track title and artist from tags like "(feat. X)", "[Remastered]", etc.
 * to maximize LRCLIB API match rate.
 */
function cleanSongSearchString(str: string): string {
  return str
    .replace(/\s*[\(\[](?:feat|with|remastered|bonus|version|slowed|sped up|remix).*?[\)\]]/gi, '')
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Free LRCLIB API fallback to fetch synced lyrics for songs without local .lrc
 */
export async function fetchLyricsOnline(
  title: string,
  artist: string,
  duration?: number
): Promise<{ syncedLyrics?: LyricLine[]; plainLyrics?: string } | null> {
  try {
    const cleanTitle = cleanSongSearchString(title);
    const cleanArtist = cleanSongSearchString(artist);

    // Try exact search first
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });
    if (duration && duration > 0) {
      params.append('duration', Math.round(duration).toString());
    }

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'AURA.WAV Music Player v1.0 (https://github.com/aura-wav)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics) {
        return {
          syncedLyrics: parseLRC(data.syncedLyrics),
          plainLyrics: data.plainLyrics,
        };
      } else if (data.plainLyrics) {
        return { plainLyrics: data.plainLyrics };
      }
    }

    // Try fallback search query
    const searchRes = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`
    );
    if (searchRes.ok) {
      const results = await searchRes.json();
      if (Array.isArray(results) && results.length > 0) {
        const best = results[0];
        if (best.syncedLyrics) {
          return {
            syncedLyrics: parseLRC(best.syncedLyrics),
            plainLyrics: best.plainLyrics,
          };
        } else if (best.plainLyrics) {
          return { plainLyrics: best.plainLyrics };
        }
      }
    }

    return null;
  } catch (err) {
    // Quietly fail offline or if network is blocked
    return null;
  }
}
