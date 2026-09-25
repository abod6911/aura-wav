import { AudioTrackMetadata } from '../core/audio/types';

export interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeekTo: (seconds: number) => void;
  onSeekBy: (offsetSeconds: number) => void;
}

export class MediaSessionManager {
  private static instance: MediaSessionManager;
  private callbacks: MediaSessionCallbacks | null = null;
  private isSupported: boolean;

  private constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  }

  public static getInstance(): MediaSessionManager {
    if (!MediaSessionManager.instance) {
      MediaSessionManager.instance = new MediaSessionManager();
    }
    return MediaSessionManager.instance;
  }

  public registerHandlers(callbacks: MediaSessionCallbacks) {
    if (!this.isSupported) return;
    this.callbacks = callbacks;

    const ms = navigator.mediaSession;

    ms.setActionHandler('play', () => this.callbacks?.onPlay());
    ms.setActionHandler('pause', () => this.callbacks?.onPause());
    ms.setActionHandler('previoustrack', () => this.callbacks?.onPrevious());
    ms.setActionHandler('nexttrack', () => this.callbacks?.onNext());

    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        this.callbacks?.onSeekTo(details.seekTime);
      }
    });

    ms.setActionHandler('seekbackward', (details) => {
      const offset = details.seekOffset || 10;
      this.callbacks?.onSeekBy(-offset);
    });

    ms.setActionHandler('seekforward', (details) => {
      const offset = details.seekOffset || 10;
      this.callbacks?.onSeekBy(offset);
    });

    ms.setActionHandler('stop', () => this.callbacks?.onPause());
  }

  public updateMetadata(track: AudioTrackMetadata | null) {
    if (!this.isSupported) return;

    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const cover = track.coverUrl || '/icons/default_album_art.png';

    // Multi-scale icons for Wearables, Smart Displays & Lock Screens
    const artwork: MediaImage[] = [
      { src: cover, sizes: '96x96', type: 'image/png' },
      { src: cover, sizes: '128x128', type: 'image/png' },
      { src: cover, sizes: '192x192', type: 'image/png' },
      { src: cover, sizes: '256x256', type: 'image/png' },
      { src: cover, sizes: '384x384', type: 'image/png' },
      { src: cover, sizes: '512x512', type: 'image/png' },
    ];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'AURA.WAV Library',
      artwork,
    });
  }

  public updatePlaybackState(isPlaying: boolean) {
    if (!this.isSupported) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }

  public updatePositionState(duration: number, currentTime: number, playbackRate = 1.0) {
    if (!this.isSupported || !('setPositionState' in navigator.mediaSession)) return;

    if (
      Number.isFinite(duration) &&
      Number.isFinite(currentTime) &&
      duration > 0 &&
      currentTime >= 0 &&
      currentTime <= duration
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate,
          position: currentTime,
        });
      } catch {
        // Guard against transient browser validation race conditions
      }
    }
  }

  public clear() {
    if (!this.isSupported) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
}
