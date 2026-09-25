import { EQ_BANDS, ReverbSpace } from '../types';

/**
 * EffectsChain: Encapsulates the master DSP signal chain.
 * 
 * Flow:
 * Channel Bus -> [Karaoke/Vocal Cut] -> [5-Band EQ] -> [Dynamic Bass Boost + Limiter] 
 *             -> [Tube Warmth Saturation] -> [Convolution Reverb] -> [Spatial Crossfeed] -> Master Gain
 */
export class EffectsChain {
  private ctx: AudioContext | null = null;
  public inputNode: GainNode | null = null;
  public outputNode: GainNode | null = null;

  // 1. 5-Band Graphic Equalizer
  private eqFilters: BiquadFilterNode[] = [];

  // 2. Dynamic Bass Boost
  private bassBoostFilter: BiquadFilterNode | null = null;
  private bassCompressor: DynamicsCompressorNode | null = null;
  private currentBassBoost = 0; // 0 to 18 dB

  // 3. Tube / Tape Warmth
  private warmthDryGain: GainNode | null = null;
  private warmthWetGain: GainNode | null = null;
  private warmthShaper: WaveShaperNode | null = null;
  private warmthPostBus: GainNode | null = null;
  private currentWarmth = 0; // 0 to 100%

  // 4. Convolver Reverb
  private convolverNode: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbPostBus: GainNode | null = null;
  private currentReverbSpace: ReverbSpace = 'off';

  // 5. Vocal Removal / Karaoke
  private karaokeDryGain: GainNode | null = null;
  private karaokeWetGain: GainNode | null = null;
  private karaokeBassFilter: BiquadFilterNode | null = null;
  private isKaraokeEnabled = false;

  // 6. Spatial Headphone Audio
  private spatialCrossGain: GainNode | null = null;
  private isSpatialAudioEnabled = false;

  /**
   * Procedural Analog Tube / Tape Warmth Curve
   * Soft hyperbolic tangent saturation curve introducing warm even/odd harmonic presence
   */
  public static generateTubeWarmthCurve(samples = 2048): Float32Array {
    const curve = new Float32Array(samples);
    const drive = 2.2;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = Math.tanh(x * drive);
    }
    return curve;
  }

  /**
   * Procedural Convolver Impulse Response Generator
   * Generates natural acoustic spaces 100% offline without external network requests
   */
  public static generateImpulseResponse(
    ctx: AudioContext,
    space: ReverbSpace
  ): AudioBuffer | null {
    if (space === 'off') return null;

    let durationSec = 1.5;
    let decay = 2.5;
    let dampFreq = 6000;

    switch (space) {
      case 'studio':
        durationSec = 0.6;
        decay = 3.8;
        dampFreq = 8500;
        break;
      case 'arena':
        durationSec = 3.2;
        decay = 1.8;
        dampFreq = 5000;
        break;
      case 'car':
        durationSec = 0.35;
        decay = 5.2;
        dampFreq = 4200;
        break;
      case 'vinyl_lounge':
        durationSec = 1.4;
        decay = 2.8;
        dampFreq = 5500;
        break;
    }

    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const dampFactor = Math.exp(-2 * Math.PI * (dampFreq / sampleRate));
    let prevL = 0;
    let prevR = 0;

    for (let i = 0; i < length; i++) {
      const progress = i / length;
      const envelope = Math.pow(1 - progress, decay);
      const whiteL = (Math.random() * 2 - 1) * envelope;
      const whiteR = (Math.random() * 2 - 1) * envelope;

      prevL = whiteL * (1 - dampFactor) + prevL * dampFactor;
      prevR = whiteR * (1 - dampFactor) + prevR * dampFactor;

      left[i] = prevL;
      right[i] = prevR;
    }
    return impulse;
  }

  /**
   * Initialize and connect entire DSP Audio Graph
   */
  public init(ctx: AudioContext, destination: AudioNode): { input: GainNode; output: GainNode } {
    this.dispose();
    this.ctx = ctx;

    // 1. Input Node & Output Node
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 2. Karaoke Stage
    this.karaokeDryGain = ctx.createGain();
    this.karaokeWetGain = ctx.createGain();
    this.karaokeBassFilter = ctx.createBiquadFilter();
    this.karaokeBassFilter.type = 'lowpass';
    this.karaokeBassFilter.frequency.setValueAtTime(140, ctx.currentTime);

    const karaokeBus = ctx.createGain();
    this.inputNode.connect(this.karaokeDryGain);
    this.karaokeDryGain.connect(karaokeBus);

    // 3. 5-Band Graphic Equalizer
    this.eqFilters = EQ_BANDS.map((band) => {
      const f = ctx.createBiquadFilter();
      f.type = band.type;
      f.frequency.setValueAtTime(band.freq, ctx.currentTime);
      f.gain.setValueAtTime(0, ctx.currentTime);
      return f;
    });

    let currentWire: AudioNode = karaokeBus;
    this.eqFilters.forEach((filter) => {
      currentWire.connect(filter);
      currentWire = filter;
    });

    // 4. Dynamic Bass Boost + Compressor
    this.bassBoostFilter = ctx.createBiquadFilter();
    this.bassBoostFilter.type = 'lowshelf';
    this.bassBoostFilter.frequency.setValueAtTime(80, ctx.currentTime);
    this.bassBoostFilter.gain.setValueAtTime(this.currentBassBoost, ctx.currentTime);

    this.bassCompressor = ctx.createDynamicsCompressor();
    this.bassCompressor.threshold.setValueAtTime(-14, ctx.currentTime);
    this.bassCompressor.knee.setValueAtTime(10, ctx.currentTime);
    this.bassCompressor.ratio.setValueAtTime(3.5, ctx.currentTime);
    this.bassCompressor.attack.setValueAtTime(0.005, ctx.currentTime);
    this.bassCompressor.release.setValueAtTime(0.18, ctx.currentTime);

    currentWire.connect(this.bassBoostFilter);
    this.bassBoostFilter.connect(this.bassCompressor);
    currentWire = this.bassCompressor;

    // 5. Analog Tube / Tape Warmth
    this.warmthDryGain = ctx.createGain();
    this.warmthWetGain = ctx.createGain();
    this.warmthPostBus = ctx.createGain();
    this.warmthShaper = ctx.createWaveShaper();
    this.warmthShaper.curve = (this.constructor as typeof EffectsChain).generateTubeWarmthCurve(2048) as Float32Array<ArrayBuffer>;
    this.warmthShaper.oversample = '2x';

    currentWire.connect(this.warmthDryGain);
    currentWire.connect(this.warmthShaper);
    this.warmthShaper.connect(this.warmthWetGain);
    this.warmthDryGain.connect(this.warmthPostBus);
    this.warmthWetGain.connect(this.warmthPostBus);
    this.updateWarmthGains();
    currentWire = this.warmthPostBus;

    // 6. Convolver Reverb
    this.convolverNode = ctx.createConvolver();
    this.reverbDryGain = ctx.createGain();
    this.reverbWetGain = ctx.createGain();
    this.reverbPostBus = ctx.createGain();

    currentWire.connect(this.reverbDryGain);
    currentWire.connect(this.convolverNode);
    this.convolverNode.connect(this.reverbWetGain);
    this.reverbDryGain.connect(this.reverbPostBus);
    this.reverbWetGain.connect(this.reverbPostBus);
    this.updateReverbGains();
    currentWire = this.reverbPostBus;

    // 7. Spatial Crossfeed
    this.spatialCrossGain = ctx.createGain();
    this.spatialCrossGain.gain.setValueAtTime(this.isSpatialAudioEnabled ? 0.35 : 0.0, ctx.currentTime);

    currentWire.connect(this.outputNode);
    this.outputNode.connect(destination);

    return { input: this.inputNode, output: this.outputNode };
  }

  // --- Parameter Controllers ---

  public setEqGains(gains: [number, number, number, number, number]): void {
    if (!this.ctx || this.eqFilters.length !== 5) return;
    const now = this.ctx.currentTime;
    gains.forEach((gainVal, idx) => {
      const clamped = Math.max(-15, Math.min(15, gainVal));
      this.eqFilters[idx].gain.cancelScheduledValues(now);
      this.eqFilters[idx].gain.setTargetAtTime(clamped, now, 0.04);
    });
  }

  public setBassBoost(dbGain: number): void {
    const clamped = Math.max(0, Math.min(18, dbGain));
    this.currentBassBoost = clamped;
    if (this.bassBoostFilter && this.ctx) {
      const now = this.ctx.currentTime;
      this.bassBoostFilter.gain.cancelScheduledValues(now);
      this.bassBoostFilter.gain.setTargetAtTime(clamped, now, 0.04);
    }
  }

  public setAnalogWarmth(percentage: number): void {
    this.currentWarmth = Math.max(0, Math.min(100, percentage));
    this.updateWarmthGains();
  }

  private updateWarmthGains(): void {
    if (!this.warmthDryGain || !this.warmthWetGain || !this.ctx) return;
    const wetRatio = (this.currentWarmth / 100) * 0.45;
    const dryRatio = 1.0 - wetRatio * 0.3;
    const now = this.ctx.currentTime;
    this.warmthWetGain.gain.setTargetAtTime(wetRatio, now, 0.04);
    this.warmthDryGain.gain.setTargetAtTime(dryRatio, now, 0.04);
  }

  public setReverbSpace(space: ReverbSpace): void {
    this.currentReverbSpace = space;
    if (!this.ctx || !this.convolverNode) return;
    const buffer = (this.constructor as typeof EffectsChain).generateImpulseResponse(this.ctx, space);
    this.convolverNode.buffer = buffer;
    this.updateReverbGains();
  }

  private updateReverbGains(): void {
    if (!this.reverbDryGain || !this.reverbWetGain || !this.ctx) return;
    const isOff = this.currentReverbSpace === 'off';
    const now = this.ctx.currentTime;
    this.reverbWetGain.gain.setTargetAtTime(isOff ? 0.0 : 0.32, now, 0.05);
    this.reverbDryGain.gain.setTargetAtTime(isOff ? 1.0 : 0.9, now, 0.05);
  }

  public setKaraokeMode(enabled: boolean): void {
    this.isKaraokeEnabled = enabled;
    if (!this.karaokeDryGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.karaokeDryGain.gain.setTargetAtTime(enabled ? 0.2 : 1.0, now, 0.05);
  }

  public setSpatialAudio(enabled: boolean): void {
    this.isSpatialAudioEnabled = enabled;
    if (!this.spatialCrossGain || !this.ctx) return;
    this.spatialCrossGain.gain.setTargetAtTime(enabled ? 0.35 : 0.0, this.ctx.currentTime, 0.05);
  }

  public dispose(): void {
    const disconnectNode = (node: AudioNode | null) => {
      if (node) {
        try { node.disconnect(); } catch {}
      }
    };

    disconnectNode(this.inputNode);
    disconnectNode(this.outputNode);
    this.eqFilters.forEach(disconnectNode);
    this.eqFilters = [];
    disconnectNode(this.bassBoostFilter);
    disconnectNode(this.bassCompressor);
    disconnectNode(this.warmthDryGain);
    disconnectNode(this.warmthWetGain);
    disconnectNode(this.warmthShaper);
    disconnectNode(this.warmthPostBus);
    disconnectNode(this.convolverNode);
    disconnectNode(this.reverbDryGain);
    disconnectNode(this.reverbWetGain);
    disconnectNode(this.reverbPostBus);
    disconnectNode(this.karaokeDryGain);
    disconnectNode(this.karaokeWetGain);
    disconnectNode(this.karaokeBassFilter);
    disconnectNode(this.spatialCrossGain);
  }
}
