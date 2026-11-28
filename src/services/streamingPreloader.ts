import { Track } from '../types';
import { djAudioEngine } from '../lib/audioEngine';
import { resolveTrackAudioSource } from '../store/usePlayerStore';
import { normalizeStreamUrl } from '../utils/urlUtils';

class StreamingPreloader {
  private static instance: StreamingPreloader | null = null;
  private preloaderAudio: HTMLAudioElement | null = null;
  private preloadedTrackId: string | null = null;
  private inFlightTrackId: string | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        let el = document.getElementById('aura-hidden-preloader') as HTMLAudioElement;
        if (!el) {
          el = document.createElement('audio');
          el.id = 'aura-hidden-preloader';
          el.preload = 'auto';
          el.style.position = 'fixed';
          el.style.width = '1px';
          el.style.height = '1px';
          el.style.opacity = '0.0001';
          el.style.pointerEvents = 'none';
          el.style.zIndex = '-100';
          el.setAttribute('playsinline', 'true');
          el.setAttribute('webkit-playsinline', 'true');
          document.body.appendChild(el);
        }
        this.preloaderAudio = el;
      } catch {}
    }
  }

  public static getInstance(): StreamingPreloader {
    if (!StreamingPreloader.instance) {
      StreamingPreloader.instance = new StreamingPreloader();
    }
    return StreamingPreloader.instance;
  }

  /**
   * Check if current playback position meets the lookahead threshold
   * (15s remaining OR 75% track progress) and silently warm up next track.
   */
  public checkAndPreload(
    currentTime: number,
    duration: number,
    nextTrack: Track | null
  ): void {
    if (!nextTrack || !isFinite(duration) || duration <= 5) return;
    if (this.preloadedTrackId === nextTrack.id || this.inFlightTrackId === nextTrack.id) return;

    const remaining = duration - currentTime;
    const progress = currentTime / duration;

    if (remaining <= 15 || progress >= 0.75) {
      this.warmUpTrack(nextTrack);
    }
  }

  /**
   * Silently pre-warm next track audio via lightweight preloader and dual-deck engine
   */
  public async warmUpTrack(track: Track): Promise<void> {
    if (!track || this.preloadedTrackId === track.id || this.inFlightTrackId === track.id) return;

    this.inFlightTrackId = track.id;

    try {
      const resolved = await resolveTrackAudioSource(track);
      this.preloadedTrackId = track.id;

      // 1. Prime dual-deck engine inactive channel
      djAudioEngine.preloadNextTrack(resolved).catch(() => {});

      // 2. Warm up HTTP stream cache on background audio element if URL exists
      if (this.preloaderAudio && resolved.audioUrl) {
        let safeUrl = resolved.audioUrl;
        if (safeUrl.startsWith('http') || safeUrl.startsWith('/')) {
          safeUrl = normalizeStreamUrl(safeUrl);
        }
        this.preloaderAudio.src = safeUrl;
        this.preloaderAudio.load();
      }
    } catch (err) {
      console.warn('[StreamingPreloader] Preload error:', err);
    } finally {
      this.inFlightTrackId = null;
    }
  }

  /**
   * Invalidate preloaded track if queue order changes, shuffle is toggled, or track skips
   */
  public cancelOrInvalidate(): void {
    this.preloadedTrackId = null;
    this.inFlightTrackId = null;
    if (this.preloaderAudio) {
      try {
        this.preloaderAudio.removeAttribute('src');
        this.preloaderAudio.load();
      } catch {}
    }
  }
}

export const streamingPreloader = StreamingPreloader.getInstance();
