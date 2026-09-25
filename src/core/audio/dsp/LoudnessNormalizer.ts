import { Track } from '../../types';

/**
 * LoudnessNormalizer: EBU R128 / ReplayGain Volume Normalization Engine.
 * 
 * Target Loudness: -14 LUFS (Industry standard for streaming music)
 * Automatically adjusts channel preamp gain to ensure consistent perceived loudness
 * between tracks of varying production eras and master volume levels.
 */
export class LoudnessNormalizer {
  private isEnabled = true;
  private targetLufs = -14.0;

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setTargetLufs(target: number): void {
    this.targetLufs = target;
  }

  /**
   * Calculate linear gain multiplier (1.0 = unity) for a given track based on LUFS or ReplayGain metadata
   */
  public computeLinearGain(track: Track | null): number {
    if (!this.isEnabled || !track) {
      return 1.0;
    }

    // 1. Direct LUFS metadata (e.g. track.lufs = -11.5)
    const trackLufs = (track as any).lufs;
    if (typeof trackLufs === 'number' && isFinite(trackLufs) && trackLufs < 0) {
      const diffDb = this.targetLufs - trackLufs;
      // Clamp between -12dB (0.25x) and +5dB (1.77x) to prevent excessive amplification
      const clampedDiff = Math.max(-12.0, Math.min(5.0, diffDb));
      return Math.pow(10, clampedDiff / 20);
    }

    // 2. ReplayGain metadata (e.g. track.gain = -2.8 dB)
    const trackGain = (track as any).gain;
    if (typeof trackGain === 'number' && isFinite(trackGain)) {
      const clampedGain = Math.max(-12.0, Math.min(5.0, trackGain));
      return Math.pow(10, clampedGain / 20);
    }

    return 1.0;
  }
}
