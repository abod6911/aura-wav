/**
 * CarPlay Bridge Service
 * Handles bi-directional synchronization between AURA.WAV store and Apple CarPlay.
 * Supports both Native iOS Capacitor Bridge and Fallback MediaSession API for in-car head units.
 */

import { Track } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';

export interface CarPlayBridgeItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artworkUrl?: string;
}

let isBridgeInitialized = false;

// Check if running inside native Capacitor environment
const isCapacitorNative = (): boolean => {
  return typeof (window as any)?.Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
};

/**
 * Synchronize the entire library to Apple CarPlay List Template
 */
export function syncLibraryToCarPlay(tracks: Track[]): void {
  const items: CarPlayBridgeItem[] = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album || 'Studio Master',
    duration: t.duration || 0,
    artworkUrl: t.artworkUrl || t.coverUrl,
  }));

  if (isCapacitorNative() && (window as any).Capacitor?.Plugins?.CarPlayBridge) {
    (window as any).Capacitor.Plugins.CarPlayBridge.syncTracks({ tracks: items }).catch((err: any) => {
      console.warn('[CarPlayBridge] syncLibrary error:', err);
    });
  }
}

/**
 * Synchronize favorite tracks to Apple CarPlay Favorites Tab
 */
export function syncFavoritesToCarPlay(favorites: Track[]): void {
  const items: CarPlayBridgeItem[] = favorites.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album || 'Favorites',
    duration: t.duration || 0,
    artworkUrl: t.artworkUrl || t.coverUrl,
  }));

  if (isCapacitorNative() && (window as any).Capacitor?.Plugins?.CarPlayBridge) {
    (window as any).Capacitor.Plugins.CarPlayBridge.syncFavorites({ tracks: items }).catch((err: any) => {
      console.warn('[CarPlayBridge] syncFavorites error:', err);
    });
  }
}

/**
 * Synchronize current playback state to Apple CarPlay Now Playing Template
 */
export function syncStateToCarPlay(
  track: Track | null,
  isPlaying: boolean,
  currentTime: number,
  duration: number
): void {
  if (!track) return;

  if (isCapacitorNative() && (window as any).Capacitor?.Plugins?.CarPlayBridge) {
    (window as any).Capacitor.Plugins.CarPlayBridge.updatePlaybackState({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || 'Studio Master',
      duration: duration || track.duration || 0,
      currentTime,
      isPlaying,
      artworkUrl: track.artworkUrl || track.coverUrl,
    }).catch((err: any) => {
      console.warn('[CarPlayBridge] updatePlaybackState error:', err);
    });
  }
}

/**
 * Initialize listeners for commands coming from Apple CarPlay (touchscreen or steering wheel)
 */
export function initCarPlayBridge(): void {
  if (isBridgeInitialized) return;
  isBridgeInitialized = true;

  if (isCapacitorNative() && (window as any).Capacitor?.Plugins?.CarPlayBridge) {
    const plugin = (window as any).Capacitor.Plugins.CarPlayBridge;

    // 1. When user taps a track on the car's screen
    plugin.addListener('onCarPlayTrackSelected', (data: { trackId: string }) => {
      const store = usePlayerStore.getState();
      const target = store.tracks.find((t) => t.id === data.trackId);
      if (target) {
        store.playTrack(target);
      }
    });

    // 2. When user presses play/pause on car screen or steering wheel
    plugin.addListener('onCarPlayTogglePlay', () => {
      usePlayerStore.getState().togglePlayPause();
    });

    // 3. When user presses next track on steering wheel
    plugin.addListener('onCarPlayNext', () => {
      usePlayerStore.getState().nextTrack({ forceImmediate: true });
    });

    // 4. When user presses previous track on steering wheel
    plugin.addListener('onCarPlayPrevious', () => {
      usePlayerStore.getState().previousTrack();
    });

    // 5. When user seeks on car dash
    plugin.addListener('onCarPlaySeek', (data: { time: number }) => {
      usePlayerStore.getState().seek(data.time);
    });
  }
}
