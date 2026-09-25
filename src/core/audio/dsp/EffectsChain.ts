import { EQBands, ReverbPreset, ReverbSpace } from '../types';

export class EffectsChain {
  private ctx!: AudioContext;
  public inputNode!: GainNode;
  public outputNode!: GainNode;

  // 5-Band Equalizer Nodes
  private subEq!: BiquadFilterNode;
  private bassEq!: BiquadFilterNode;
  private midEq!: BiquadFilterNode;
  private trebleEq!: BiquadFilterNode;
  private airEq!: BiquadFilterNode;

  // Dynamic Bass Boost Compressor
  private bassBoostFilter!: BiquadFilterNode;
  private bassBoostGainNode!: GainNode;

  // Analog Tape Warmth (WaveShaper)
  private waveshaperNode!: WaveShaperNode;

  // Convolver Reverb
  private convolverNode!: ConvolverNode;
  private dryGainNode!: GainNode;
  private wetGainNode!: GainNode;

  // Karaoke & Spatial additions for full ecosystem compatibility
  private isKaraokeActive = false;
  private isSpatialActive = false;

  constructor(ctx?: AudioContext) {
    if (ctx) {
      this.init(ctx);
    }
  }

  public init(ctx: AudioContext, destinationNode?: AudioNode): { input: GainNode; output: GainNode } {
    this.ctx = ctx;
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();

    // 1. Initialize EQ
    this.subEq = this.createFilter('lowshelf', 60);
    this.bassEq = this.createFilter('peaking', 250);
    this.midEq = this.createFilter('peaking', 1000);
    this.trebleEq = this.createFilter('peaking', 4000);
    this.airEq = this.createFilter('highshelf', 16000);

    // 2. Initialize Bass Boost
    this.bassBoostFilter = this.createFilter('lowpass', 110);
    this.bassBoostGainNode = this.ctx.createGain();
    this.bassBoostGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 3. Initialize Analog Saturation
    this.waveshaperNode = this.ctx.createWaveShaper();
    this.waveshaperNode.curve = this.generateSaturationCurve(0) as any;
    this.waveshaperNode.oversample = '4x';

    // 4. Initialize Convolver
    this.convolverNode = this.ctx.createConvolver();
    this.dryGainNode = this.ctx.createGain();
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

  private buildGraph(): void {
    // Chain EQ: Input -> Sub -> Bass -> Mid -> Treble -> Air
    this.inputNode.connect(this.subEq);
    this.subEq.connect(this.bassEq);
    this.bassEq.connect(this.midEq);
    this.midEq.connect(this.trebleEq);
    this.trebleEq.connect(this.airEq);

    // Parallel Bass Boost
    this.subEq.connect(this.bassBoostFilter);
    this.bassBoostFilter.connect(this.bassBoostGainNode);

    // Merge to Waveshaper
    this.airEq.connect(this.waveshaperNode);
    this.bassBoostGainNode.connect(this.waveshaperNode);

    // Split to Dry/Wet Reverb
    this.waveshaperNode.connect(this.dryGainNode);
    this.waveshaperNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);

    // Connect to Master Output
    this.dryGainNode.connect(this.outputNode);
    this.wetGainNode.connect(this.outputNode);
  }

  public setEQ(bands: EQBands): void {
    if (!this.ctx) return;
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

  public setAnalogWarmth(amount: number): void {
    if (!this.waveshaperNode) return;
    // Support either 0.0 to 1.0 or 0 to 100
    const normalized = amount > 1 ? amount / 100 : amount;
    const clamped = Math.max(0, Math.min(1, normalized));
    this.waveshaperNode.curve = this.generateSaturationCurve(clamped) as any;
  }

  private generateSaturationCurve(amount: number): Float32Array {
    const k = amount * 10;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        // Tanh-like soft clipping saturation
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
      this.dryGainNode.gain.setTargetAtTime(1, now, 0.05);
      return;
    }

    const configs = {
      studio: { duration: 1.2, decay: 2.0, wet: 0.25 },
      arena: { duration: 3.5, decay: 3.0, wet: 0.45 },
      car: { duration: 0.6, decay: 1.2, wet: 0.18 },
      'vinyl-lounge': { duration: 2.0, decay: 2.5, wet: 0.3 },
    };

    const config = configs[preset as keyof typeof configs] || configs.studio;
    this.convolverNode.buffer = this.generateSyntheticImpulse(config.duration, config.decay);
    this.wetGainNode.gain.setTargetAtTime(config.wet, now, 0.05);
    this.dryGainNode.gain.setTargetAtTime(1 - config.wet * 0.5, now, 0.05);
  }

  public setReverbSpace(space: ReverbSpace): void {
    // Map snake_case to kebab-case preset names
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

  public setBassBoostGain(db: number): void {
    if (!this.ctx || !this.bassBoostGainNode) return;
    const linear = Math.pow(10, Math.min(db, 18) / 20);
    this.bassBoostGainNode.gain.setTargetAtTime(linear, this.ctx.currentTime, 0.05);
  }

  public setBassBoost(db: number): void {
    this.setBassBoostGain(db);
  }

  public setKaraokeMode(enabled: boolean): void {
    this.isKaraokeActive = enabled;
    // Invert mid band phase or lower mid gain to attenuate center-panned vocal frequencies
    if (this.midEq && this.ctx) {
      const targetGain = enabled ? -18 : 0;
      this.midEq.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public setSpatialAudio(enabled: boolean): void {
    this.isSpatialActive = enabled;
    if (this.airEq && this.ctx) {
      // Subtle high-shelf presence boost for binaural spatialization
      const targetGain = enabled ? 2.5 : 0;
      this.airEq.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public static generateTubeWarmthCurve(samples = 2048): Float32Array {
    const curve = new Float32Array(samples);
    const drive = 2.2;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = Math.tanh(x * drive);
    }
    return curve;
  }

  public static generateImpulseResponse(ctx: AudioContext, space: ReverbSpace): AudioBuffer | null {
    if (space === 'off') return null;
    const duration = space === 'arena' ? 3.5 : space === 'car' ? 0.6 : 1.5;
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
