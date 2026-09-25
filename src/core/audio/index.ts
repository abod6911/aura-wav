export * from './types';
export * from './DeckChannel';
export { DeckChannel as CoreDeckChannel } from './core/DeckChannel';
export * from './dsp/AutoMixController';
export * from './dsp/EffectsChain';
export * from './dsp/HapticsEngine';
export * from './dsp/LoudnessNormalizer';
export * from './workers/audioTimer.worker';
export * from './AudioEngine';
export * from './DJAudioEngineFacade';

import { DJAudioEngineFacade } from './DJAudioEngineFacade';
import { AudioEngine } from './AudioEngine';

export const djAudioEngine = new DJAudioEngineFacade();
export const DJAudioEngine = DJAudioEngineFacade;
export { AudioEngine };

if (typeof window !== 'undefined') {
  (window as any).djAudioEngine = djAudioEngine;
  (window as any).AudioEngine = AudioEngine;
}
