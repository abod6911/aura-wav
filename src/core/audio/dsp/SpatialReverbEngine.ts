export type SpatialMode = 'off' | 'concert' | 'studio' | 'club' | '8d';

/**
 * Procedural Web Audio 3D Spatializer & Environmental Reverb Engine
 * Provides authentic acoustic room models and dynamic 8D orbital spatialization
 * with zero external network asset dependencies.
 */
export class SpatialReverbEngine {
  private ctx: AudioContext;
  public input: GainNode;
  public output: GainNode;

  private dryGain: GainNode;
  private wetGain: GainNode;
  private convolver: ConvolverNode;
  private panner: StereoPannerNode;
  private roomEq: BiquadFilterNode;

  private currentMode: SpatialMode = 'off';
  private animFrameId: number | null = null;
  private pannerAngle: number = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1.0;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.0;

    this.convolver = ctx.createConvolver();
    this.panner = ctx.createStereoPanner();

    this.roomEq = ctx.createBiquadFilter();
    this.roomEq.type = 'lowshelf';
    this.roomEq.frequency.value = 180;
    this.roomEq.gain.value = 0;

    // Direct dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.panner);

    // Wet spatial reverb path
    this.input.connect(this.convolver);
    this.convolver.connect(this.roomEq);
    this.roomEq.connect(this.wetGain);
    this.wetGain.connect(this.panner);

    // Panner to output
    this.panner.connect(this.output);
  }

  /**
   * Procedural velvet-noise impulse response generator for organic acoustics
   */
  private generateImpulse(durationSec: number, decayRate: number, sampleRate?: number): AudioBuffer {
    const rate = sampleRate || this.ctx.sampleRate || 44100;
    const length = Math.floor(rate * durationSec);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Exponential decay envelope
      const env = Math.exp(-t * decayRate);
      // Diffused stereo reflections
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    return impulse;
  }

  public setMode(mode: SpatialMode): void {
    this.currentMode = mode;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const now = this.ctx.currentTime;
    const rampTime = 0.06;

    switch (mode) {
      case 'off':
        this.dryGain.gain.setTargetAtTime(1.0, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.0, now, rampTime);
        this.roomEq.gain.setTargetAtTime(0, now, rampTime);
        this.panner.pan.setTargetAtTime(0, now, rampTime);
        break;

      case 'concert':
        // Grand amphitheater / live stage
        this.convolver.buffer = this.generateImpulse(2.6, 3.4);
        this.dryGain.gain.setTargetAtTime(0.82, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.44, now, rampTime);
        this.roomEq.gain.setTargetAtTime(2.5, now, rampTime);
        this.panner.pan.setTargetAtTime(0, now, rampTime);
        break;

      case 'studio':
        // Intimate acoustically treated studio
        this.convolver.buffer = this.generateImpulse(0.65, 5.8);
        this.dryGain.gain.setTargetAtTime(0.96, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.20, now, rampTime);
        this.roomEq.gain.setTargetAtTime(1.0, now, rampTime);
        this.panner.pan.setTargetAtTime(0, now, rampTime);
        break;

      case 'club':
        // Deep bass lounge & sound system
        this.convolver.buffer = this.generateImpulse(1.4, 4.0);
        this.dryGain.gain.setTargetAtTime(0.88, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.36, now, rampTime);
        this.roomEq.gain.setTargetAtTime(5.5, now, rampTime);
        this.panner.pan.setTargetAtTime(0, now, rampTime);
        break;

      case '8d':
        // 8D rotating headphone experience
        this.convolver.buffer = this.generateImpulse(1.2, 4.2);
        this.dryGain.gain.setTargetAtTime(0.86, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.32, now, rampTime);
        this.roomEq.gain.setTargetAtTime(2.0, now, rampTime);
        this.start8DAnimation();
        break;
    }
  }

  private start8DAnimation(): void {
    const step = () => {
      if (this.currentMode !== '8d') return;
      this.pannerAngle += 0.018; // Smooth 360 degree orbital speed
      const pan = Math.sin(this.pannerAngle) * 0.88;
      if (this.ctx.state === 'running') {
        this.panner.pan.setValueAtTime(pan, this.ctx.currentTime);
      }
      this.animFrameId = requestAnimationFrame(step);
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  public getMode(): SpatialMode {
    return this.currentMode;
  }

  public dispose(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
