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

  // 8D Binaural HRTF Crossover Subgraph (Center Bass Anchored < 140Hz)
  private hrtfPanner: PannerNode;
  private lowCrossover: BiquadFilterNode;
  private highCrossover: BiquadFilterNode;
  private centerBassGain: GainNode;
  private hrtfGain: GainNode;

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

    // 8D HRTF Binaural setup
    this.hrtfPanner = ctx.createPanner();
    this.hrtfPanner.panningModel = 'HRTF';
    this.hrtfPanner.distanceModel = 'inverse';
    this.hrtfPanner.refDistance = 1;
    this.hrtfPanner.maxDistance = 10000;
    this.hrtfPanner.rolloffFactor = 1;
    this.hrtfPanner.coneInnerAngle = 360;

    this.lowCrossover = ctx.createBiquadFilter();
    this.lowCrossover.type = 'lowpass';
    this.lowCrossover.frequency.value = 140;

    this.highCrossover = ctx.createBiquadFilter();
    this.highCrossover.type = 'highpass';
    this.highCrossover.frequency.value = 140;

    this.centerBassGain = ctx.createGain();
    this.centerBassGain.gain.value = 0.0;

    this.hrtfGain = ctx.createGain();
    this.hrtfGain.gain.value = 0.0;

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

    // 8D Crossover Paths:
    // 1. Center Bass: input -> lowCrossover -> centerBassGain -> output (Zero panning vertigo!)
    this.input.connect(this.lowCrossover);
    this.lowCrossover.connect(this.centerBassGain);
    this.centerBassGain.connect(this.output);

    // 2. High 8D: input -> highCrossover -> hrtfPanner -> hrtfGain -> output
    this.input.connect(this.highCrossover);
    this.highCrossover.connect(this.hrtfPanner);
    this.hrtfPanner.connect(this.hrtfGain);
    this.hrtfGain.connect(this.output);
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
        this.centerBassGain.gain.setTargetAtTime(0.0, now, rampTime);
        this.hrtfGain.gain.setTargetAtTime(0.0, now, rampTime);
        break;

      case 'concert':
        // Grand amphitheater / live stage
        this.convolver.buffer = this.generateImpulse(2.6, 3.4);
        this.dryGain.gain.setTargetAtTime(0.82, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.44, now, rampTime);
        this.roomEq.gain.setTargetAtTime(2.5, now, rampTime);
        this.panner.pan.setTargetAtTime(0, now, rampTime);
        this.centerBassGain.gain.setTargetAtTime(0.0, now, rampTime);
        this.hrtfGain.gain.setTargetAtTime(0.0, now, rampTime);
        break;

      case 'studio':
        // Intimate acoustically treated studio
        this.convolver.buffer = this.generateImpulse(0.65, 5.8);
        this.dryGain.gain.setTargetAtTime(0.96, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.20, now, rampTime);
        this.roomEq.gain.setTargetAtTime(1.0, now, rampTime);
        this.panner.pan.setTargetAtTime(0, now, rampTime);
        this.centerBassGain.gain.setTargetAtTime(0.0, now, rampTime);
        this.hrtfGain.gain.setTargetAtTime(0.0, now, rampTime);
        break;

      case 'club':
        // Deep bass lounge & sound system
        this.convolver.buffer = this.generateImpulse(1.4, 4.0);
        this.dryGain.gain.setTargetAtTime(0.88, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.36, now, rampTime);
        this.roomEq.gain.setTargetAtTime(5.5, now, rampTime);
        this.panner.pan.setTargetAtTime(0, now, rampTime);
        this.centerBassGain.gain.setTargetAtTime(0.0, now, rampTime);
        this.hrtfGain.gain.setTargetAtTime(0.0, now, rampTime);
        break;

      case '8d':
        // 8D rotating binaural HRTF experience:
        // Mid/Highs orbit 360 degrees around head, Sub-Bass (<140Hz) stays locked in center
        this.dryGain.gain.setTargetAtTime(0.0, now, rampTime);
        this.wetGain.gain.setTargetAtTime(0.0, now, rampTime);
        this.centerBassGain.gain.setTargetAtTime(1.0, now, rampTime);
        this.hrtfGain.gain.setTargetAtTime(1.0, now, rampTime);
        this.start8DAnimation();
        break;
    }
  }

  private start8DAnimation(): void {
    const step = () => {
      if (this.currentMode !== '8d') return;
      this.pannerAngle += 0.016; // Smooth ~6-second orbital cycle
      const radius = 2.5;
      const x = Math.sin(this.pannerAngle) * radius;
      const z = -Math.cos(this.pannerAngle) * radius;

      if (this.ctx.state === 'running') {
        const now = this.ctx.currentTime;
        if (this.hrtfPanner.positionX) {
          this.hrtfPanner.positionX.setValueAtTime(x, now);
          this.hrtfPanner.positionZ.setValueAtTime(z, now);
          this.hrtfPanner.positionY.setValueAtTime(0, now);
        } else {
          // Fallback for older Web Audio implementations
          (this.hrtfPanner as any).setPosition(x, 0, z);
        }
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
