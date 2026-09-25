import { Track } from '../types';

export interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
}

const ARTWORK_SIZES = ['512x512', '384x384', '256x256', '192x192', '128x128', '96x96'] as const;

function buildArtworkObjects(url: string): MediaImage[] {
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
 * Register global MediaSession action handlers early so iOS WebKit and Android Chrome bind the playback notification.
 */
export function initMediaSessionHandlers(callbacks: MediaSessionCallbacks): void {
  activeCallbacks = callbacks;

  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  // Declare audio intent on iOS 16.4+
  if ('audioSession' in navigator) {
    try {
      (navigator as unknown as { audioSession: { type: string } }).audioSession.type = 'playback';
    } catch {}
  }

  // Only bind OS action handlers once to prevent memory churn and redundant IPC calls
  if (isHandlersBound) {
    return;
  }
  isHandlersBound = true;

  const actions: [MediaSessionAction, (details: MediaSessionActionDetails) => void][] = [
    ['play', () => activeCallbacks?.onPlay()],
    ['pause', () => activeCallbacks?.onPause()],
    ['nexttrack', () => activeCallbacks?.onNext()],
    ['previoustrack', () => activeCallbacks?.onPrevious()],
    [
      'seekto',
      (details: MediaSessionActionDetails) => {
        if (details.seekTime !== undefined) {
          activeCallbacks?.onSeek(details.seekTime);
        }
      },
    ],
    [
      'seekbackward',
      (details: MediaSessionActionDetails) => {
        const offset = details.seekOffset || 10;
        activeCallbacks?.onSeek(Math.max(0, lastReportedTime - offset));
      },
    ],
    [
      'seekforward',
      (details: MediaSessionActionDetails) => {
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
      // Ignore unsupported platform actions
    }
  });
}

/**
 * Native OS, Dynamic Island, Lock screen, and CarPlay/Android Auto MediaSession integration
 */
export function updateMediaSession(
  track: Track | null,
  isPlaying: boolean,
  callbacks: MediaSessionCallbacks
): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !track) {
    return;
  }

  activeCallbacks = callbacks;

  // Declare audio intent on iOS 16.4+
  if ('audioSession' in navigator) {
    try {
      (navigator as unknown as { audioSession: { type: string } }).audioSession.type = 'playback';
    } catch {}
  }

  // 1. Sync Document Title
  if (typeof document !== 'undefined') {
    document.title = `${track.title} — ${track.artist} | AURA.WAV`;
  }

  let rawArtwork = track.artworkUrl || track.coverUrl || '/icons/icon-512.png';
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

  // 2. Set Immediate Metadata with Absolute URLs
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'AURA.WAV',
      artwork: buildArtworkObjects(fullArtworkUrl),
    });
  } catch (err) {
    console.warn('[MediaSession] Initial MediaMetadata error:', err);
  }

  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  } catch (err) {
    console.warn('[MediaSession] PlaybackState error:', err);
  }

  // 3. Ensure action handlers are bound to active window
  initMediaSessionHandlers(callbacks);
}

/**
 * Synchronize Lock-Screen & Dynamic Island Position State
 */
export function updateMediaSessionPosition(duration: number, currentTime: number, playbackRate = 1): void {
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
  if (!timeJump && now - lastPositionUpdate < 1000) {
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
    } catch {}
  }
}
