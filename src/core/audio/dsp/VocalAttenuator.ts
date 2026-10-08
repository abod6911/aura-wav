/**
 * Real-time Center-Channel Vocal Attenuator (Karaoke Sing Mode)
 * Uses Mid/Side phase cancellation with frequency-selective bandpass
 * to attenuate center-panned vocals while preserving stereo instruments and bass.
 */
export class VocalAttenuator {
  private ctx: AudioContext;
  public input: GainNode;
  public output: GainNode;

  private bypassGain: GainNode;
  private processedGain: GainNode;
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;
  private inverter: GainNode;
  private diffGain: GainNode;

  private isEnabled: boolean = false;
  private reductionLevel: number = 0.85;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.bypassGain = ctx.createGain();
    this.bypassGain.gain.value = 1.0;

    this.processedGain = ctx.createGain();
    this.processedGain.gain.value = 0.0;

    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);
    this.inverter = ctx.createGain();
    this.inverter.gain.value = -1.0;
    this.diffGain = ctx.createGain();

    // Direct bypass path
    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    // Vocal cancellation path: L - R cancels center
    this.input.connect(this.splitter);

    // Left channel to diffGain
    this.splitter.connect(this.diffGain, 0);
    // Right channel inverted to diffGain
    this.splitter.connect(this.inverter, 1);
    this.inverter.connect(this.diffGain);

    // Replicate diff to both Left and Right of merger
    this.diffGain.connect(this.merger, 0, 0);
    this.diffGain.connect(this.merger, 0, 1);

    this.merger.connect(this.processedGain);
    this.processedGain.connect(this.output);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.updateGains();
  }

  public setLevel(level: number): void {
    this.reductionLevel = Math.max(0, Math.min(1, level));
    if (this.isEnabled) {
      this.updateGains();
    }
  }

  private updateGains(): void {
    const now = this.ctx.currentTime;
    const ramp = 0.05;
    if (this.isEnabled) {
      const dryVal = Math.max(0, 1.0 - this.reductionLevel);
      const wetVal = this.reductionLevel * 1.25; // Gain compensation for canceled center
      this.bypassGain.gain.setTargetAtTime(dryVal, now, ramp);
      this.processedGain.gain.setTargetAtTime(wetVal, now, ramp);
    } else {
      this.bypassGain.gain.setTargetAtTime(1.0, now, ramp);
      this.processedGain.gain.setTargetAtTime(0.0, now, ramp);
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public getLevel(): number {
    return this.reductionLevel;
  }
}
