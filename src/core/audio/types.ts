import { Track } from '../../types';

export const EQ_BANDS = [
  { freq: 60, type: 'lowshelf' as BiquadFilterType, label: '60Hz (Sub)' },
  { freq: 250, type: 'peaking' as BiquadFilterType, label: '250Hz (Bass)' },
  { freq: 1000, type: 'peaking' as BiquadFilterType, label: '1kHz (Mid)' },
  { freq: 4000, type: 'peaking' as BiquadFilterType, label: '4kHz (Treble)' },
  { freq: 16000, type: 'highshelf' as BiquadFilterType, label: '16kHz (Air)' },
] as const;

export type AutoMixStyle = 'crossfade' | 'vinyl_brake' | 'echo_out' | 'filter_sweep';
export type ReverbSpace = 'off' | 'studio' | 'arena' | 'car' | 'vinyl_lounge';
export type DeckChannelName = 'A' | 'B';

export interface EngineCallbacks {
  onTrackEnd?: () => void;
  onPositionUpdate?: (currentTime: number, duration: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onAutoMixStart?: (style: AutoMixStyle, duration: number) => void;
  onAutoMixEnd?: () => void;
  onPreloadRequest?: (nextTrack: Track) => void;
  onBufferPreloaded?: (trackId: string, channel: DeckChannelName) => void;
}

export interface DeckChannelState {
  name: DeckChannelName;
  track: Track | null;
  isPlaying: boolean;
  isPreloaded: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}
