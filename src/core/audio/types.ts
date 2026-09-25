import { Track } from '../../types';

// Core Dual-Deck & DSP Types for AudioEngine
export type DeckId = 'deckA' | 'deckB';

export type AutoMixMode = 'crossfade' | 'vinyl-brake' | 'echo-out' | 'filter-sweep';

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  duration: number;
  url: string;
  lufs?: number; // Target: -14 LUFS
  bpm?: number;
  key?: string;
}

export interface EQBands {
  sub: number;    // 60 Hz
  bass: number;   // 250 Hz
  mid: number;    // 1 kHz
  treble: number; // 4 kHz
  air: number;    // 16 kHz
}

export type ReverbPreset = 'off' | 'studio' | 'arena' | 'car' | 'vinyl-lounge';

export interface AudioEngineState {
  activeDeck: DeckId;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isKaraokeActive: boolean;
  analogWarmth: number; // 0.0 to 1.0
  bassBoostGain: number; // dB
  eq: EQBands;
  reverbPreset: ReverbPreset;
  autoMixMode: AutoMixMode;
}

// Backward-compatible types for DJAudioEngineFacade & UI
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
