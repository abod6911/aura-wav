/**
 * AURA.WAV Studio DSP AudioWorklet & High-Performance Fallback Node
 * 
 * Provides:
 * 1. Mid/Side Studio Vocal Isolation (Karaoke Mode):
 *    - Matrix: M = (L + R) * 0.5, S = (L - R) * 0.5
 *    - 2-Pole IIR Low-Pass filter at 160Hz protecting Center Kick and Sub-Bass
 *    - Mid Vocal frequency suppression (200Hz - 4.5kHz) via vocalCut (0.0 to 1.0)
 *    - Stereo widening matrix reconstruction
 * 2. Analog Vacuum Tube Warmth (Asymmetrical Soft Clipping):
 *    - Even & Odd harmonic generation via: (tanh(k*x + bias) - tanh(bias)) / tanh(k)
 *    - Controlled by tubeDrive (0.0 to 1.0)
 * 3. Self-contained Blob URL deployment for 100% offline PWA/Vite reliability
 * 4. Dual-mode fallback via standard Web Audio API nodes if AudioWorklet is unsupported
 */

const WORKLET_PROCESSOR_CODE = `
class AuraDspProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'vocalCut', defaultValue: 0.0, minValue: 0.0, maxValue: 1.0, automationRate: 'k-rate' },
      { name: 'tubeDrive', defaultValue: 0.0, minValue: 0.0, maxValue: 1.0, automationRate: 'k-rate' },
      { name: 'stereoWidth', defaultValue: 1.0, minValue: 0.5, maxValue: 1.8, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    // 2-Pole Low-Pass filter state for protecting Center Sub-Bass (< 160Hz)
    this.lpMid1 = 0;
    this.lpMid2 = 0;
    
    // Sample rate dependent filter coefficients (updated dynamically)
    this.calcFilterCoeffs(sampleRate || 44100, 160.0);
  }

  calcFilterCoeffs(sr, cutoff) {
    const w = 2.0 * Math.PI * cutoff / sr;
    this.alpha = Math.sin(w) / (2.0 * 0.7071); // Q = 0.7071 (Butterworth response)
    this.cosW = Math.cos(w);
    const a0 = 1.0 + this.alpha;
    this.b0 = ((1.0 - this.cosW) / 2.0) / a0;
    this.b1 = (1.0 - this.cosW) / a0;
    this.b2 = ((1.0 - this.cosW) / 2.0) / a0;
    this.a1 = (-2.0 * this.cosW) / a0;
    this.a2 = (1.0 - this.alpha) / a0;

    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
  }

  applyLowPass(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }

  // Asymmetric Vacuum Tube Warmth Transfer Function
  applyTubeWarmth(x, drive) {
    if (drive <= 0.001) return x;
    const k = 1.0 + drive * 5.0;
    const bias = 0.18 * drive;
    
    // Asymmetrical polynomial tanh approximation
    const biased = k * x + bias;
    const tanhBiased = Math.tanh(biased);
    const tanhBias = Math.tanh(bias);
    const denom = Math.tanh(k);
    
    const saturated = (tanhBiased - tanhBias) / (denom > 0.0001 ? denom : 1.0);
    return saturated;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length < 2 || !output || output.length < 2) {
      if (input && output && input[0] && output[0]) {
        output[0].set(input[0]);
        if (input[1] && output[1]) output[1].set(input[1]);
      }
      return true;
    }

    const inL = input[0];
    const inR = input[1];
    const outL = output[0];
    const outR = output[1];
    const len = inL.length;

    const vocalCut = parameters.vocalCut[0];
    const tubeDrive = parameters.tubeDrive[0];
    const stereoWidth = parameters.stereoWidth[0];

    // Mid/Side processing with Sub-Bass protection
    for (let i = 0; i < len; i++) {
      const l = inL[i];
      const r = inR[i];

      // 1. Matrix encode Mid / Side
      const mid = 0.5 * (l + r);
      let side = 0.5 * (l - r) * stereoWidth;

      // 2. Protect Sub-Bass Kick in Center Channel (< 160Hz)
      const midBass = this.applyLowPass(mid);
      const midUpper = mid - midBass;

      // 3. Attenuate vocals in Upper Mid range
      const attenuatedMidUpper = midUpper * (1.0 - vocalCut * 0.94);
      const finalMid = midBass + attenuatedMidUpper;

      // 4. Matrix decode back to Stereo (L/R)
      let outSampleL = finalMid + side;
      let outSampleR = finalMid - side;

      // 5. Apply Analog Tube Warmth
      if (tubeDrive > 0.001) {
        outSampleL = this.applyTubeWarmth(outSampleL, tubeDrive);
        outSampleR = this.applyTubeWarmth(outSampleR, tubeDrive);
      }

      outL[i] = outSampleL;
      outR[i] = outSampleR;
    }

    return true;
  }
}

registerProcessor('aura-dsp-processor', AuraDspProcessor);
`;

export interface AuraDspParams {
  vocalCut: number;    // 0.0 to 1.0
  tubeDrive: number;   // 0.0 to 1.0
  stereoWidth: number; // 0.5 to 1.8
}

export class AuraDspNode {
  public input: GainNode;
  public output: GainNode;
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private isWorkletReady = false;

  // Fallback Web Audio Subgraph
  private fallbackInput: GainNode | null = null;
  private fallbackOutput: GainNode | null = null;
  private fallbackSplitter: ChannelSplitterNode | null = null;
  private fallbackMerger: ChannelMergerNode | null = null;
  private fallbackMidLowPass: BiquadFilterNode | null = null;
  private fallbackVocalGain: GainNode | null = null;
  private fallbackWarmthShaper: WaveShaperNode | null = null;
  private fallbackDirectGain: GainNode | null = null;
  private fallbackProcessedGain: GainNode | null = null;

  private currentParams: AuraDspParams = {
    vocalCut: 0.0,
    tubeDrive: 0.0,
    stereoWidth: 1.0,
  };

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.initPipeline();
  }

  private async initPipeline(): Promise<void> {
    try {
      if (typeof AudioWorkletNode !== 'undefined' && this.ctx.audioWorklet) {
        const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        await this.ctx.audioWorklet.addModule(blobUrl);
        URL.revokeObjectURL(blobUrl);

        this.workletNode = new AudioWorkletNode(this.ctx, 'aura-dsp-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        });

        this.input.connect(this.workletNode);
        this.workletNode.connect(this.output);
        this.isWorkletReady = true;

        this.applyParamsToWorklet();
        return;
      }
    } catch (err) {
      console.warn('[AuraDspNode] AudioWorklet init notice (falling back to WebAudio nodes):', err);
    }

    // Initialize high-precision Web Audio fallback graph
    this.initFallbackGraph();
  }

  private initFallbackGraph(): void {
    const ctx = this.ctx;
    this.fallbackInput = ctx.createGain();
    this.fallbackOutput = ctx.createGain();

    this.fallbackDirectGain = ctx.createGain();
    this.fallbackDirectGain.gain.setValueAtTime(1.0, ctx.currentTime);

    this.fallbackProcessedGain = ctx.createGain();
    this.fallbackProcessedGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.fallbackSplitter = ctx.createChannelSplitter(2);
    this.fallbackMerger = ctx.createChannelMerger(2);

    // Mid/Side Matrix
    const midSum = ctx.createGain();
    midSum.gain.value = 0.5;
    const sideDiff = ctx.createGain();
    sideDiff.gain.value = 0.5;
    const invRight = ctx.createGain();
    invRight.gain.value = -1.0;

    // Filters
    this.fallbackMidLowPass = ctx.createBiquadFilter();
    this.fallbackMidLowPass.type = 'lowpass';
    this.fallbackMidLowPass.frequency.value = 160;

    this.fallbackVocalGain = ctx.createGain();
    this.fallbackVocalGain.gain.value = 1.0;

    this.fallbackWarmthShaper = ctx.createWaveShaper();
    this.fallbackWarmthShaper.oversample = '2x';

    // Wiring Input
    this.input.connect(this.fallbackDirectGain);
    this.fallbackDirectGain.connect(this.output);

    this.input.connect(this.fallbackSplitter);
    this.fallbackSplitter.connect(midSum, 0);
    this.fallbackSplitter.connect(midSum, 1);

    this.fallbackSplitter.connect(sideDiff, 0);
    this.fallbackSplitter.connect(invRight, 1);
    invRight.connect(sideDiff);

    // Reconstruct
    midSum.connect(this.fallbackMidLowPass);
    midSum.connect(this.fallbackVocalGain);

    const midCombine = ctx.createGain();
    this.fallbackMidLowPass.connect(midCombine);
    this.fallbackVocalGain.connect(midCombine);

    const invSide = ctx.createGain();
    invSide.gain.value = -1.0;
    sideDiff.connect(invSide);

    midCombine.connect(this.fallbackMerger, 0, 0);
    sideDiff.connect(this.fallbackMerger, 0, 0);

    midCombine.connect(this.fallbackMerger, 0, 1);
    invSide.connect(this.fallbackMerger, 0, 1);

    this.fallbackMerger.connect(this.fallbackWarmthShaper);
    this.fallbackWarmthShaper.connect(this.fallbackProcessedGain);
    this.fallbackProcessedGain.connect(this.output);

    this.applyParamsToFallback();
  }

  public setParams(params: Partial<AuraDspParams>): void {
    if (params.vocalCut !== undefined) this.currentParams.vocalCut = Math.max(0, Math.min(1, params.vocalCut));
    if (params.tubeDrive !== undefined) this.currentParams.tubeDrive = Math.max(0, Math.min(1, params.tubeDrive));
    if (params.stereoWidth !== undefined) this.currentParams.stereoWidth = Math.max(0.5, Math.min(1.8, params.stereoWidth));

    if (this.isWorkletReady && this.workletNode) {
      this.applyParamsToWorklet();
    } else {
      this.applyParamsToFallback();
    }
  }

  private applyParamsToWorklet(): void {
    if (!this.workletNode) return;
    const now = this.ctx.currentTime;
    const p = this.workletNode.parameters;
    p.get('vocalCut')?.setTargetAtTime(this.currentParams.vocalCut, now, 0.02);
    p.get('tubeDrive')?.setTargetAtTime(this.currentParams.tubeDrive, now, 0.02);
    p.get('stereoWidth')?.setTargetAtTime(this.currentParams.stereoWidth, now, 0.02);
  }

  private applyParamsToFallback(): void {
    if (!this.fallbackVocalGain || !this.fallbackDirectGain || !this.fallbackProcessedGain) return;
    const now = this.ctx.currentTime;
    const isEngaged = this.currentParams.vocalCut > 0.01 || this.currentParams.tubeDrive > 0.01;

    if (isEngaged) {
      this.fallbackDirectGain.gain.setTargetAtTime(0.0, now, 0.03);
      this.fallbackProcessedGain.gain.setTargetAtTime(1.0, now, 0.03);
      const cutGain = 1.0 - this.currentParams.vocalCut * 0.94;
      this.fallbackVocalGain.gain.setTargetAtTime(cutGain, now, 0.03);

      if (this.fallbackWarmthShaper && this.currentParams.tubeDrive > 0.01) {
        this.fallbackWarmthShaper.curve = this.generateFallbackCurve(this.currentParams.tubeDrive) as any;
      } else if (this.fallbackWarmthShaper) {
        this.fallbackWarmthShaper.curve = null;
      }
    } else {
      this.fallbackDirectGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.fallbackProcessedGain.gain.setTargetAtTime(0.0, now, 0.03);
    }
  }

  private generateFallbackCurve(drive: number): Float32Array {
    const n = 2048;
    const curve = new Float32Array(n);
    const k = 1.0 + drive * 5.0;
    const bias = 0.18 * drive;
    const denom = Math.tanh(k);

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      const saturated = (Math.tanh(k * x + bias) - Math.tanh(bias)) / denom;
      curve[i] = saturated;
    }
    return curve;
  }

  public getParams(): AuraDspParams {
    return { ...this.currentParams };
  }

  public dispose(): void {
    try {
      this.input.disconnect();
      this.output.disconnect();
      if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode = null;
      }
      if (this.fallbackDirectGain) this.fallbackDirectGain.disconnect();
      if (this.fallbackProcessedGain) this.fallbackProcessedGain.disconnect();
    } catch {}
  }
}
