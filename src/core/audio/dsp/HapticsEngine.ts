export class HapticsEngine {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(128);
  private isEnabled: boolean = true;
  private lastVibrateTime: number = 0;
  private readonly THROTTLE_MS = 140;

  constructor(ctx?: AudioContext, sourceNode?: AudioNode) {
    if (ctx && sourceNode) {
      this.bindSource(ctx, sourceNode);
    }
  }

  public bindSource(ctx: AudioContext, sourceNode: AudioNode): void {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    sourceNode.connect(this.analyser);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public processFrame(analyser?: AnalyserNode, sampleRate?: number): void {
    if (!this.isEnabled || typeof navigator === 'undefined' || !navigator.vibrate) {
      return;
    }

    const targetAnalyser = analyser || this.analyser;
    if (!targetAnalyser) return;

    if (this.dataArray.length !== targetAnalyser.frequencyBinCount) {
      this.dataArray = new Uint8Array(targetAnalyser.frequencyBinCount);
    }

    targetAnalyser.getByteFrequencyData(this.dataArray as any);

    // Bins 1 to 4 correspond to ~43Hz - 172Hz (Sub-Bass & Kick range at 44.1kHz)
    let subEnergy = 0;
    for (let i = 1; i <= 4; i++) {
      subEnergy += this.dataArray[i];
    }
    const averageKick = subEnergy / 4;

    const now = performance.now();
    if (averageKick > 215 && now - this.lastVibrateTime > this.THROTTLE_MS) {
      this.lastVibrateTime = now;
      try {
        navigator.vibrate(28); // Snappy tactile pulse
      } catch {}
    }
  }

  public triggerManualTap(durationMs = 15): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(durationMs);
      } catch {}
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }
}
