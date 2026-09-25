/**
 * HapticsEngine: Audio-reactive sub-bass vibration engine.
 * 
 * Performs real-time FFT frequency peak detection targeting 60-120Hz sub-bass transients.
 * Emits calibrated, throttled vibration pulses via navigator.vibrate() to simulate
 * physical subwoofer kick drums and bass drops on supported mobile devices.
 */
export class HapticsEngine {
  private isEnabled = true;
  private lastHapticTime = 0;
  private cooldownMs = 110; // Minimum interval between physical pulses
  private energyHistory: number[] = [];
  private historySize = 16;
  private tempFreqBuffer: Uint8Array | null = null;

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Process an audio analysis frame and trigger physical haptic feedback on sub-bass kicks
   */
  public processFrame(analyser: AnalyserNode, sampleRate: number): void {
    if (!this.isEnabled) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

    const now = performance.now();
    if (now - this.lastHapticTime < this.cooldownMs) return;

    const fftSize = analyser.fftSize;
    if (!this.tempFreqBuffer || this.tempFreqBuffer.length !== analyser.frequencyBinCount) {
      this.tempFreqBuffer = new Uint8Array(analyser.frequencyBinCount);
    }

    analyser.getByteFrequencyData(this.tempFreqBuffer as any);

    // Map 60Hz to 120Hz frequency band to FFT bins
    const binWidth = sampleRate / fftSize;
    const startBin = Math.max(1, Math.floor(55 / binWidth));
    const endBin = Math.min(this.tempFreqBuffer.length - 1, Math.ceil(130 / binWidth));

    let bandEnergy = 0;
    let count = 0;
    for (let i = startBin; i <= endBin; i++) {
      bandEnergy += this.tempFreqBuffer[i];
      count++;
    }

    if (count === 0) return;
    const avgEnergy = bandEnergy / count; // 0 to 255

    // Track rolling energy average for dynamic thresholding
    this.energyHistory.push(avgEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    const baseline = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    // Transient detection: current frame significantly exceeds recent baseline
    const isTransient = avgEnergy > 160 && avgEnergy > baseline * 1.28;

    if (isTransient) {
      this.lastHapticTime = now;
      try {
        const pulseStrength = avgEnergy > 210 ? 30 : 18;
        navigator.vibrate(pulseStrength);
      } catch {}
    }
  }

  /**
   * Trigger a manual UI haptic tap
   */
  public triggerManualTap(durationMs = 15): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(durationMs);
      } catch {}
    }
  }
}
