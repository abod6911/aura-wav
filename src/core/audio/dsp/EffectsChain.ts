import { EQBands, ReverbPreset, ReverbSpace } from '../types';

export class EffectsChain {
  private ctx!: AudioContext;
  public inputNode!: GainNode;
  public outputNode!: GainNode;

  // 5-Band Equalizer Nodes (Serial connection)
  private subEq!: BiquadFilterNode;
  private bassEq!: BiquadFilterNode;
  private midEq!: BiquadFilterNode;
  private trebleEq!: BiquadFilterNode;
  private airEq!: BiquadFilterNode;

  // Professional Dual-Stage Mega Bass Boost Engine (In-Series: Zero Phase Cancellation)
  private subBassFilter!: BiquadFilterNode;   // 70 Hz Lowshelf - Sub-bass foundation
  private punchBassFilter!: BiquadFilterNode; // 105 Hz Peaking - Hard-hitting kick punch
  private bassHeadroomGain!: GainNode;        // Dynamic Headroom Compensation

  // Peak Safety Ceiling Limiter (Mastering transparent ceiling at 0.0dBFS - NEVER squashes normal music!)
  private limiterNode!: DynamicsCompressorNode;

  // Analog Tape Warmth (WaveShaper)
  private waveshaperNode!: WaveShaperNode;

  // Convolver Reverb
  private convolverNode!: ConvolverNode;
  private dryGainNode!: GainNode;
  private wetGainNode!: GainNode;

  // State
  private isKaraokeActive = false;
  private isSpatialActive = false;
  private currentBassDb = 0;
  private currentEQ: EQBands = { sub: 0, bass: 0, mid: 0, treble: 0, air: 0 };

  constructor(ctx?: AudioContext) {
    if (ctx) {
      this.init(ctx);
    }
  }

  public init(ctx: AudioContext, destinationNode?: AudioNode): { input: GainNode; output: GainNode } {
    this.ctx = ctx;
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();

    // 1. Initialize 5-Band EQ
    this.subEq = this.createFilter('lowshelf', 60);
    this.bassEq = this.createFilter('peaking', 250);
    this.midEq = this.createFilter('peaking', 1000);
    this.trebleEq = this.createFilter('peaking', 4000);
    this.airEq = this.createFilter('highshelf', 16000);
    this.setEQ(this.currentEQ);

    // 2. Initialize Dual-Stage Mega Bass Boost
    this.subBassFilter = this.ctx.createBiquadFilter();
    this.subBassFilter.type = 'lowshelf';
    this.subBassFilter.frequency.setValueAtTime(70, this.ctx.currentTime);
    this.subBassFilter.gain.setValueAtTime(this.currentBassDb, this.ctx.currentTime);

    this.punchBassFilter = this.ctx.createBiquadFilter();
    this.punchBassFilter.type = 'peaking';
    this.punchBassFilter.frequency.setValueAtTime(105, this.ctx.currentTime);
    this.punchBassFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
    this.punchBassFilter.gain.setValueAtTime(this.currentBassDb * 0.55, this.ctx.currentTime);

    this.bassHeadroomGain = this.ctx.createGain();
    this.bassHeadroomGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 3. Initialize Peak Safety Ceiling Limiter (Mastering transparent ceiling - 0.0dBFS, zero pumping)
    this.limiterNode = this.ctx.createDynamicsCompressor();
    this.limiterNode.threshold.setValueAtTime(0.0, this.ctx.currentTime);
    this.limiterNode.knee.setValueAtTime(0.0, this.ctx.currentTime);
    this.limiterNode.ratio.setValueAtTime(20.0, this.ctx.currentTime);
    this.limiterNode.attack.setValueAtTime(0.001, this.ctx.currentTime);
    this.limiterNode.release.setValueAtTime(0.05, this.ctx.currentTime);

    // 4. Initialize Analog Warmth Waveshaper (Default: null and 'none' oversample for 100% bit-perfect pass-through)
    this.waveshaperNode = this.ctx.createWaveShaper();
    this.waveshaperNode.curve = null;
    this.waveshaperNode.oversample = 'none';

    // 5. Initialize Reverb (Default: off, 100% dry, 0% wet)
    this.convolverNode = this.ctx.createConvolver();
    this.dryGainNode = this.ctx.createGain();
    this.dryGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.wetGainNode = this.ctx.createGain();
    this.wetGainNode.gain.setValueAtTime(0, this.ctx.currentTime);

    this.buildGraph();

    if (destinationNode) {
      this.outputNode.connect(destinationNode);
    }

    return { input: this.inputNode, output: this.outputNode };
  }

  private createFilter(type: BiquadFilterType, frequency: number): BiquadFilterNode {
    const node = this.ctx.createBiquadFilter();
    node.type = type;
    node.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    node.gain.setValueAtTime(0, this.ctx.currentTime);
    return node;
  }

  /**
   * Pure serial high-fidelity audio graph:
   * Input -> 5-Band EQ -> Dual-Stage Mega Bass Boost -> Headroom Gain -> Safety Limiter -> Waveshaper -> Reverb -> Output
   * Zero parallel summation = ZERO comb filtering or phase smearing!
   */
  private buildGraph(): void {
    // 1. 5-Band EQ in series
    this.inputNode.connect(this.subEq);
    this.subEq.connect(this.bassEq);
    this.bassEq.connect(this.midEq);
    this.midEq.connect(this.trebleEq);
    this.trebleEq.connect(this.airEq);

    // 2. Dual-Stage Mega Bass Boost & Headroom in series
    this.airEq.connect(this.subBassFilter);
    this.subBassFilter.connect(this.punchBassFilter);
    this.punchBassFilter.connect(this.bassHeadroomGain);

    // 3. Transparent Safety Limiter (0dBFS Ceiling)
    this.bassHeadroomGain.connect(this.limiterNode);

    // 4. Analog Warmth
    this.limiterNode.connect(this.waveshaperNode);

    // 5. Dry / Wet Reverb split
    this.waveshaperNode.connect(this.dryGainNode);
    this.waveshaperNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);

    // 6. Master Output
    this.dryGainNode.connect(this.outputNode);
    this.wetGainNode.connect(this.outputNode);
  }

  public setEQ(bands: EQBands): void {
    this.currentEQ = { ...bands };
    if (!this.ctx || !this.subEq) return;
    const now = this.ctx.currentTime;
    this.subEq.gain.setTargetAtTime(bands.sub, now, 0.05);
    this.bassEq.gain.setTargetAtTime(bands.bass, now, 0.05);
    this.midEq.gain.setTargetAtTime(bands.mid, now, 0.05);
    this.trebleEq.gain.setTargetAtTime(bands.treble, now, 0.05);
    this.airEq.gain.setTargetAtTime(bands.air, now, 0.05);
  }

  public setEqGains(gains: [number, number, number, number, number]): void {
    this.setEQ({
      sub: gains[0] ?? 0,
      bass: gains[1] ?? 0,
      mid: gains[2] ?? 0,
      treble: gains[3] ?? 0,
      air: gains[4] ?? 0,
    });
  }

  /**
   * Dual-Stage Mega Bass Boost:
   * Boosts true sub-bass (< 70Hz) by up to +18dB, and kick punch (105Hz) by up to +10dB.
   * At 0dB, the filters are completely flat with zero coloration, zero phase distortion, and headroom gain = 1.0.
   * When boosted, dynamically compensates headroom so the bass is massive and punchy without digital clipping.
   */
  public setBassBoostGain(db: number): void {
    if (!this.ctx || !this.subBassFilter || !this.punchBassFilter) return;
    const clamped = Math.max(0, Math.min(18, isNaN(db) ? 0 : db));
    this.currentBassDb = clamped;
    const now = this.ctx.currentTime;

    if (clamped <= 0.01) {
      this.subBassFilter.gain.setTargetAtTime(0, now, 0.03);
      this.punchBassFilter.gain.setTargetAtTime(0, now, 0.03);
      if (this.bassHeadroomGain) {
        this.bassHeadroomGain.gain.setTargetAtTime(1.0, now, 0.03);
      }
      if (this.limiterNode) {
        this.limiterNode.threshold.setTargetAtTime(0.0, now, 0.03);
      }
      return;
    }

    // Sub-bass foundation shelf (70Hz)
    this.subBassFilter.gain.setTargetAtTime(clamped, now, 0.03);

    // Kick punch peak (105Hz)
    this.punchBassFilter.gain.setTargetAtTime(clamped * 0.55, now, 0.03);

    // Headroom compensation: gently scales level so massive bass does not clip
    if (this.bassHeadroomGain) {
      const makeupDb = -(clamped / 18.0) * 3.5;
      const linearMakeup = Math.pow(10, makeupDb / 20);
      this.bassHeadroomGain.gain.setTargetAtTime(linearMakeup, now, 0.03);
    }

    if (this.limiterNode) {
      const targetThreshold = clamped > 9 ? -0.8 : -0.2;
      this.limiterNode.threshold.setTargetAtTime(targetThreshold, now, 0.03);
    }
  }

  public setBassBoost(db: number): void {
    this.setBassBoostGain(db);
  }

  public setAnalogWarmth(amount: number): void {
    if (!this.waveshaperNode) return;
    const normalized = amount > 1 ? amount / 100 : amount;
    const clamped = Math.max(0, Math.min(1, isNaN(normalized) ? 0 : normalized));
    if (clamped <= 0.005) {
      this.waveshaperNode.curve = null;
      this.waveshaperNode.oversample = 'none';
    } else {
      this.waveshaperNode.oversample = '2x';
      this.waveshaperNode.curve = this.generateSaturationCurve(clamped) as any;
    }
  }

  private generateSaturationCurve(amount: number): Float32Array {
    const k = amount * 8;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  public setReverbPreset(preset: ReverbPreset): void {
    if (!this.ctx || !this.wetGainNode || !this.dryGainNode) return;
    const now = this.ctx.currentTime;
    if (preset === 'off') {
      this.wetGainNode.gain.setTargetAtTime(0, now, 0.05);
      this.dryGainNode.gain.setTargetAtTime(1.0, now, 0.05);
      return;
    }

    const configs = {
      studio: { duration: 1.0, decay: 2.2, wet: 0.20 },
      arena: { duration: 3.0, decay: 3.0, wet: 0.35 },
      car: { duration: 0.5, decay: 1.5, wet: 0.15 },
      'vinyl-lounge': { duration: 1.8, decay: 2.4, wet: 0.25 },
    };

    const config = configs[preset as keyof typeof configs] || configs.studio;
    this.convolverNode.buffer = this.generateSyntheticImpulse(config.duration, config.decay);
    this.wetGainNode.gain.setTargetAtTime(config.wet, now, 0.05);
    this.dryGainNode.gain.setTargetAtTime(1.0, now, 0.05);
  }

  public setReverbSpace(space: ReverbSpace): void {
    const normalized = space === 'vinyl_lounge' ? 'vinyl-lounge' : space;
    this.setReverbPreset(normalized as ReverbPreset);
  }

  private generateSyntheticImpulse(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  public setKaraokeMode(enabled: boolean): void {
    this.isKaraokeActive = enabled;
    if (this.midEq && this.ctx) {
      const targetGain = enabled ? -16 : (this.currentEQ.mid || 0);
      this.midEq.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public setSpatialAudio(_enabled: boolean): void {
    // 3D Spatial Audio disabled for transparent bit-perfect fidelity
    this.isSpatialActive = false;
  }

  public static generateTubeWarmthCurve(samples = 2048): Float32Array {
    const curve = new Float32Array(samples);
    const drive = 2.0;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = Math.tanh(x * drive);
    }
    return curve;
  }

  public static generateImpulseResponse(ctx: AudioContext, space: ReverbSpace): AudioBuffer | null {
    if (space === 'off') return null;
    const duration = space === 'arena' ? 3.0 : space === 'car' ? 0.5 : 1.2;
    const decay = space === 'arena' ? 3.0 : 2.0;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }
}
