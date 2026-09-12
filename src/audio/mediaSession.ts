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

let activeCallbacks: MediaSessionCallbacks | null = null;
let isHandlersBound = false;
let lastPositionUpdate = 0;
let lastReportedTime = 0;

/**
 * Register global MediaSession action handlers early so iOS WebKit binds the standalone window.
 */
export function initMediaSessionHandlers(callbacks: MediaSessionCallbacks) {
  activeCallbacks = callbacks;

  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  // Declare audio intent on iOS 16.4+
  if ('audioSession' in navigator) {
    try {
      (navigator as any).audioSession.type = 'playback';
    } catch {}
  }

  // Only bind OS action handlers once to prevent memory churn and redundant IPC calls
  if (isHandlersBound) {
    return;
  }
  isHandlersBound = true;

  const actions: [MediaSessionAction, (details: any) => void][] = [
    ['play', () => activeCallbacks?.onPlay()],
    ['pause', () => activeCallbacks?.onPause()],
    ['nexttrack', () => activeCallbacks?.onNext()],
    ['previoustrack', () => activeCallbacks?.onPrevious()],
    [
      'seekto',
      (details: any) => {
        if (details.seekTime !== undefined) {
          activeCallbacks?.onSeek(details.seekTime);
        }
      },
    ],
    [
      'seekbackward',
      (details: any) => {
        const offset = details.seekOffset || 10;
        activeCallbacks?.onSeek(Math.max(0, lastReportedTime - offset));
      },
    ],
    [
      'seekforward',
      (details: any) => {
        const offset = details.seekOffset || 10;
        activeCallbacks?.onSeek(lastReportedTime + offset);
      },
    ],
    ['stop', () => activeCallbacks?.onPause()],
  ];

  actions.forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // ignore unsupported actions
    }
  });
}

/**
 * Native OS, Dynamic Island & Lock screen MediaSession API integration
 */
export function updateMediaSession(
  track: Track | null,
  isPlaying: boolean,
  callbacks: MediaSessionCallbacks
) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !track) {
    return;
  }

  activeCallbacks = callbacks;

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

  // 3. Ensure action handlers are bound to this active window
  initMediaSessionHandlers(callbacks);
}

export function updateMediaSessionPosition(duration: number, currentTime: number, playbackRate = 1) {
  if (
    typeof navigator === 'undefined' ||
    !('mediaSession' in navigator) ||
    !('setPositionState' in navigator.mediaSession)
  ) {
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
        playbackRate: playbackRate > 0 ? playbackRate : 1,
        position: Math.max(0, Math.min(currentTime, duration)),
      });
    } catch {
      // ignore
    }
  }
}
