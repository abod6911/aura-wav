import { Track } from '../types';

export interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
}

const ARTWORK_SIZES = ['512x512', '384x384', '256x256', '192x192', '128x128', '96x96'];

function buildArtworkObjects(url: string) {
  const isPng = url.toLowerCase().endsWith('.png');
  return ARTWORK_SIZES.map((size) => ({
    src: url,
    sizes: size,
    type: isPng ? 'image/png' : 'image/jpeg',
  }));
}

/**
 * Native OS, Dynamic Island & Lock screen MediaSession API integration
 */
export function updateMediaSession(
  track: Track | null,
  isPlaying: boolean,
  callbacks: MediaSessionCallbacks
) {
  if (!('mediaSession' in navigator) || !track) {
    return;
  }

  // Declare audio intent on iOS 16.4+
  if ('audioSession' in navigator) {
    try {
      (navigator as any).audioSession.type = 'playback';
    } catch {}
  }

  // 1. Sync Document Title for iOS AVPlayer fallback
  if (typeof document !== 'undefined') {
    document.title = `${track.title} — ${track.artist} | AURA.WAV`;
  }

  let rawArtwork = track.artworkUrl || '/icons/icon-512.png';
  if (rawArtwork.includes('.svg') || rawArtwork.startsWith('data:image/svg')) {
    rawArtwork = '/icons/icon-512.png';
  }

  let fullArtworkUrl: string;
  try {
    if (rawArtwork.startsWith('http://') || rawArtwork.startsWith('https://')) {
      fullArtworkUrl = rawArtwork;
    } else {
      fullArtworkUrl = new URL(rawArtwork, window.location.origin).href;
    }
  } catch {
    fullArtworkUrl = `${window.location.origin}/icons/icon-512.png`;
  }

  // 2. Set Immediate Metadata with Absolute URL (Native iOS WebKit MPNowPlayingInfoCenter)
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'AURA.WAV',
      artwork: buildArtworkObjects(fullArtworkUrl),
    });
  } catch (err) {
    console.warn('Initial MediaMetadata error:', err);
  }

  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  } catch (err) {
    console.warn('PlaybackState error:', err);
  }

  // 3. Set Action Handlers
  try {
    navigator.mediaSession.setActionHandler('play', () => callbacks.onPlay());
    navigator.mediaSession.setActionHandler('pause', () => callbacks.onPause());
    navigator.mediaSession.setActionHandler('nexttrack', () => callbacks.onNext());
    navigator.mediaSession.setActionHandler('previoustrack', () => callbacks.onPrevious());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        callbacks.onSeek(details.seekTime);
      }
    });
  } catch (err) {
    console.warn('MediaSession action handler error:', err);
  }
}

let lastPositionUpdate = 0;
let lastReportedTime = 0;

export function updateMediaSessionPosition(duration: number, currentTime: number) {
  if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) {
    return;
  }
  const now = Date.now();
  const timeJump = Math.abs(currentTime - lastReportedTime) > 2;
  // Throttle to avoid flooding WebKit/mediaremoted IPC on iOS
  if (!timeJump && now - lastPositionUpdate < 1500) {
    return;
  }
  lastPositionUpdate = now;
  lastReportedTime = currentTime;

  if (isFinite(duration) && duration > 0 && isFinite(currentTime) && currentTime >= 0) {
    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(duration, 0.1),
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // ignore
    }
  }
}
