export * from './types';
export * from './DeckChannel';
export * from './dsp/AutoMixController';
export * from './dsp/EffectsChain';
export * from './dsp/HapticsEngine';
export * from './dsp/LoudnessNormalizer';
export * from './workers/audioTimer.worker';
export * from './DJAudioEngineFacade';

import { DJAudioEngineFacade } from './DJAudioEngineFacade';

export const djAudioEngine = new DJAudioEngineFacade();
export const DJAudioEngine = DJAudioEngineFacade;

if (typeof window !== 'undefined') {
  (window as any).djAudioEngine = djAudioEngine;
}
