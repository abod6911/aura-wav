/**
 * AURA.WAV Audio Engine Compatibility Facade
 * 
 * Re-exports the modular core audio engine from src/core/audio/
 * to maintain 100% backward compatibility with all existing imports.
 */

export * from '../core/audio';

import {
  djAudioEngine,
  DJAudioEngineFacade,
  EffectsChain,
  AutoMixController,
  EQ_BANDS,
  AutoMixStyle,
  ReverbSpace,
} from '../core/audio';

export {
  djAudioEngine,
  EQ_BANDS,
};

export type {
  AutoMixStyle,
  ReverbSpace,
};

export const DJAudioEngine = DJAudioEngineFacade;

export function generateTubeWarmthCurve(samples = 2048): Float32Array {
  return EffectsChain.generateTubeWarmthCurve(samples);
}

export function generateImpulseResponse(
  ctx: AudioContext,
  space: ReverbSpace
): AudioBuffer | null {
  return EffectsChain.generateImpulseResponse(ctx, space);
}

export function generateEqualPowerCurves(points = 64): {
  outgoingCurve: Float32Array;
  incomingCurve: Float32Array;
} {
  return AutoMixController.generateEqualPowerCurves(points);
}
