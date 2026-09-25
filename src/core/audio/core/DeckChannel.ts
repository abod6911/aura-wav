import { TrackMetadata } from '../types';

export class DeckChannel {
  public readonly id: 'deckA' | 'deckB';
  private ctx: AudioContext;

  // Audio Nodes
  private sourceNode: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private preampGainNode: GainNode;
  private faderGainNode: GainNode;
  private filterNode: BiquadFilterNode;
  public readonly outputNode: GainNode;

  private currentBuffer: AudioBuffer | null = null;
  private loadedMetadata: TrackMetadata | null = null;
  private startTimeOffset: number = 0;
  private playbackStartedAt: number = 0;
  private isSourcePlaying: boolean = false;

  constructor(id: 'deckA' | 'deckB', ctx: AudioContext, destinationNode: AudioNode) {
    this.id = id;
    this.ctx = ctx;

    this.preampGainNode = this.ctx.createGain();
    this.faderGainNode = this.ctx.createGain();
    this.filterNode = this.ctx.createBiquadFilter();
    this.outputNode = this.ctx.createGain();

    // Default Filter Setup
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(20000, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(0.7, this.ctx.currentTime);

    // Graph Connection: Source -> Preamp -> Filter -> Fader -> Output -> Master Destination
    this.preampGainNode.connect(this.filterNode);
    this.filterNode.connect(this.faderGainNode);
    this.faderGainNode.connect(this.outputNode);
    this.outputNode.connect(destinationNode);
  }

  public async preloadBuffer(metadata: TrackMetadata, arrayBuffer: ArrayBuffer): Promise<void> {
    this.disposeSource();
    this.loadedMetadata = metadata;
    this.currentBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    this.applyLoudnessNormalization(metadata.lufs);
  }

  public loadAudioElement(metadata: TrackMetadata, element: HTMLAudioElement): void {
    this.disposeSource();
    this.loadedMetadata = metadata;
    this.audioElement = element;
    this.sourceNode = this.ctx.createMediaElementSource(element);
    this.sourceNode.connect(this.preampGainNode);
    this.applyLoudnessNormalization(metadata.lufs);
  }

  public play(offset: number = 0): void {
    if (this.currentBuffer) {
      this.disposeBufferSourceOnly();
      const bufferSource = this.ctx.createBufferSource();
      bufferSource.buffer = this.currentBuffer;
      bufferSource.connect(this.preampGainNode);

      this.startTimeOffset = offset;
      this.playbackStartedAt = this.ctx.currentTime;
      bufferSource.start(0, offset);
      this.sourceNode = bufferSource;
      this.isSourcePlaying = true;
    } else if (this.audioElement) {
      this.audioElement.currentTime = offset;
      this.audioElement.play().catch(() => {});
      this.isSourcePlaying = true;
    }
  }

  public pause(): void {
    if (this.currentBuffer && this.isSourcePlaying) {
      this.startTimeOffset = this.getCurrentTime();
      this.disposeBufferSourceOnly();
      this.isSourcePlaying = false;
    } else if (this.audioElement) {
      this.audioElement.pause();
      this.isSourcePlaying = false;
    }
  }

  public isPlaying(): boolean {
    return this.isSourcePlaying;
  }

  public getCurrentTime(): number {
    if (this.currentBuffer && this.isSourcePlaying) {
      return this.startTimeOffset + (this.ctx.currentTime - this.playbackStartedAt);
    }
    if (this.audioElement) {
      return this.audioElement.currentTime;
    }
    return this.startTimeOffset;
  }

  public getDuration(): number {
    if (this.currentBuffer) return this.currentBuffer.duration;
    if (this.audioElement) return this.audioElement.duration || 0;
    return this.loadedMetadata?.duration || 0;
  }

  public setFaderGain(gain: number, rampDuration: number = 0.05): void {
    const target = Math.max(0, Math.min(1, gain));
    const now = this.ctx.currentTime;
    this.faderGainNode.gain.cancelScheduledValues(now);
    this.faderGainNode.gain.linearRampToValueAtTime(target, now + rampDuration);
  }

  public getFilterNode(): BiquadFilterNode {
    return this.filterNode;
  }

  public getFaderGainNode(): GainNode {
    return this.faderGainNode;
  }

  public getLoadedMetadata(): TrackMetadata | null {
    return this.loadedMetadata;
  }

  public applyLoudnessNormalization(trackLufs?: number): void {
    const TARGET_LUFS = -14.0;
    if (trackLufs === undefined || isNaN(trackLufs)) {
      this.preampGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
      return;
    }
    // Gain in dB = Target LUFS - Current Track LUFS
    const gainDb = Math.min(Math.max(TARGET_LUFS - trackLufs, -12), 6);
    const linearGain = Math.pow(10, gainDb / 20);
    this.preampGainNode.gain.setValueAtTime(linearGain, this.ctx.currentTime);
  }

  private disposeBufferSourceOnly(): void {
    if (this.sourceNode instanceof AudioBufferSourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // Source already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  public disposeSource(): void {
    this.disposeBufferSourceOnly();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      this.audioElement = null;
    }
    this.currentBuffer = null;
    this.loadedMetadata = null;
    this.startTimeOffset = 0;
    this.isSourcePlaying = false;
  }

  public destroy(): void {
    this.disposeSource();
    this.preampGainNode.disconnect();
    this.filterNode.disconnect();
    this.faderGainNode.disconnect();
    this.outputNode.disconnect();
  }
}
