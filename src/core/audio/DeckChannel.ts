import { Track } from '../../types';
import { DeckChannelName } from './types';

/**
 * DeckChannel: Encapsulates AudioNode graphs and playback mechanisms
 * for an independent DJ deck (Channel A or Channel B).
 * 
 * Features:
 * - Dual playback paths: HTMLAudioElement (standard/streaming) & AudioBufferSourceNode (zero-latency preloaded)
 * - Strict .disconnect() node disposal pipeline preventing audio memory leaks
 * - Built-in Preamp Gain (ReplayGain / LUFS normalization)
 * - Channel Fader Gain (Equal-power crossfade & volume)
 * - DJ Filter Sweep BiquadFilterNode
 * - Stereo Panner
 */
export class DeckChannel {
  public readonly name: DeckChannelName;
  public audio: HTMLAudioElement;
  public track: Track | null = null;
  public objectUrl: string | null = null;
  public decodedBuffer: AudioBuffer | null = null;
  public isPreloaded = false;

  private ctx: AudioContext | null = null;
  private destination: AudioNode | null = null;

  // Audio Graph Nodes
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bufferSourceNode: AudioBufferSourceNode | null = null;
  private preampGainNode: GainNode | null = null;
  private channelGainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;

  // State
  private volumeLevel = 1.0;
  private isBufferPlayback = false;
  private bufferStartTime = 0;
  private bufferOffset = 0;
  private isBufferPlaying = false;

  constructor(name: DeckChannelName) {
    this.name = name;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    // Optimize mobile audio element behavior
    (this.audio as any).playsInline = true;
  }

  /**
   * Bind the channel's AudioNode graph to the shared AudioContext and master input bus
   */
  public bindAudioGraph(ctx: AudioContext, destination: AudioNode): void {
    if (this.ctx === ctx && this.channelGainNode) {
      return; // Already initialized on this context
    }

    this.disposeNodes();
    this.ctx = ctx;
    this.destination = destination;

    try {
      // 1. Preamp Gain for ReplayGain / LUFS Normalization
      this.preampGainNode = ctx.createGain();
      this.preampGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

      // 2. Channel Volume Gain Node
      this.channelGainNode = ctx.createGain();
      this.channelGainNode.gain.setValueAtTime(this.volumeLevel, ctx.currentTime);

      // 3. DJ Biquad Filter Node (Default neutral)
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'allpass';
      this.filterNode.frequency.setValueAtTime(1000, ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.0, ctx.currentTime);

      // 4. Stereo Panner Node
      if (typeof ctx.createStereoPanner === 'function') {
        this.pannerNode = ctx.createStereoPanner();
        this.pannerNode.pan.setValueAtTime(0, ctx.currentTime);
      }

      // Connect sub-graph: Preamp -> Filter -> ChannelGain -> [Panner] -> Destination
      this.preampGainNode.connect(this.filterNode);
      if (this.pannerNode) {
        this.filterNode.connect(this.pannerNode);
        this.pannerNode.connect(this.channelGainNode);
      } else {
        this.filterNode.connect(this.channelGainNode);
      }
      this.channelGainNode.connect(destination);

      // Connect HTMLAudioElement source if available
      try {
        this.sourceNode = ctx.createMediaElementSource(this.audio);
        this.sourceNode.connect(this.preampGainNode);
      } catch (err) {
        console.warn(`[DeckChannel ${this.name}] MediaElementSource already connected or notice:`, err);
      }
    } catch (err) {
      console.error(`[DeckChannel ${this.name}] Error creating audio graph:`, err);
    }
  }

  /**
   * Strict AudioNode disposal pipeline: explicitly disconnects all nodes
   * before garbage collection to eliminate audio context memory leaks.
   */
  public disposeNodes(): void {
    if (this.bufferSourceNode) {
      try {
        this.bufferSourceNode.stop();
        this.bufferSourceNode.disconnect();
      } catch {}
      this.bufferSourceNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.preampGainNode) {
      try {
        this.preampGainNode.disconnect();
      } catch {}
      this.preampGainNode = null;
    }

    if (this.filterNode) {
      try {
        this.filterNode.disconnect();
      } catch {}
      this.filterNode = null;
    }

    if (this.pannerNode) {
      try {
        this.pannerNode.disconnect();
      } catch {}
      this.pannerNode = null;
    }

    if (this.channelGainNode) {
      try {
        this.channelGainNode.disconnect();
      } catch {}
      this.channelGainNode = null;
    }
  }

  /**
   * Load track audio URL into deck HTMLAudioElement
   */
  public loadTrackUrl(track: Track, url: string, isObjectUrl = false): void {
    this.revokeCurrentUrl();
    this.track = track;
    this.objectUrl = isObjectUrl ? url : null;
    this.decodedBuffer = null;
    this.isBufferPlayback = false;
    this.isPreloaded = false;

    this.audio.crossOrigin = 'anonymous';
    this.audio.src = url;
    this.audio.load();
  }

  /**
   * Preload decoded AudioBuffer into memory for zero-latency hot-swapping
   */
  public loadPreloadedBuffer(track: Track, buffer: AudioBuffer, url?: string): void {
    this.track = track;
    this.decodedBuffer = buffer;
    this.isPreloaded = true;
    if (url) {
      this.audio.src = url;
    }
  }

  /**
   * Set Deck Channel Volume (0.0 to 1.0) with optional smooth ramp
   */
  public setVolume(volume: number, rampDuration = 0.05): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.volumeLevel = clamped;

    if (this.channelGainNode && this.ctx) {
      const now = this.ctx.currentTime;
      this.channelGainNode.gain.cancelScheduledValues(now);
      if (rampDuration > 0) {
        this.channelGainNode.gain.setValueAtTime(this.channelGainNode.gain.value, now);
        this.channelGainNode.gain.linearRampToValueAtTime(clamped, now + rampDuration);
      } else {
        this.channelGainNode.gain.setValueAtTime(clamped, now);
      }
    } else {
      this.audio.volume = clamped;
    }
  }

  /**
   * Set ReplayGain Preamp Gain (Linear multiplier, e.g. 0.8 to 1.25)
   */
  public setPreampGain(linearGain: number): void {
    const safeGain = Math.max(0.1, Math.min(4.0, linearGain));
    if (this.preampGainNode && this.ctx) {
      const now = this.ctx.currentTime;
      this.preampGainNode.gain.cancelScheduledValues(now);
      this.preampGainNode.gain.setTargetAtTime(safeGain, now, 0.05);
    }
  }

  /**
   * Configure DJ Filter Sweep (lowpass, highpass, allpass neutral)
   */
  public setFilter(type: BiquadFilterType, frequency: number, q = 1.0, rampSec = 0.05): void {
    if (!this.filterNode || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.filterNode.type = type;
    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.Q.cancelScheduledValues(now);

    if (rampSec > 0) {
      this.filterNode.frequency.setValueAtTime(this.filterNode.frequency.value, now);
      this.filterNode.frequency.exponentialRampToValueAtTime(
        Math.max(20, Math.min(20000, frequency)),
        now + rampSec
      );
      this.filterNode.Q.setValueAtTime(q, now);
    } else {
      this.filterNode.frequency.setValueAtTime(Math.max(20, Math.min(20000, frequency)), now);
      this.filterNode.Q.setValueAtTime(q, now);
    }
  }

  /**
   * Reset filter to neutral pass-through
   */
  public resetFilter(): void {
    if (!this.filterNode || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.filterNode.type = 'allpass';
    this.filterNode.frequency.setValueAtTime(1000, now);
    this.filterNode.Q.setValueAtTime(1.0, now);
  }

  /**
   * Set stereo pan (-1.0 Left to +1.0 Right)
   */
  public setPan(pan: number): void {
    if (this.pannerNode && this.ctx) {
      const clamped = Math.max(-1, Math.min(1, pan));
      this.pannerNode.pan.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  /**
   * Play deck
   */
  public async play(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    if (this.isBufferPlayback && this.decodedBuffer && this.ctx && this.preampGainNode) {
      this.startBufferPlayback(this.bufferOffset);
      return;
    }

    try {
      await this.audio.play();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.warn(`[DeckChannel ${this.name}] Autoplay blocked: user gesture required`);
      }
      throw err;
    }
  }

  /**
   * Pause deck
   */
  public pause(): void {
    if (this.isBufferPlayback && this.isBufferPlaying) {
      this.stopBufferPlayback();
    }
    this.audio.pause();
  }

  /**
   * Stop and reset deck position
   */
  public stop(): void {
    this.pause();
    this.seek(0);
  }

  /**
   * Seek deck to target timestamp in seconds
   */
  public seek(seconds: number): void {
    const safeTime = Math.max(0, seconds);
    if (this.isBufferPlayback) {
      this.bufferOffset = safeTime;
      if (this.isBufferPlaying) {
        this.startBufferPlayback(safeTime);
      }
    } else {
      if (isFinite(this.audio.duration) && this.audio.duration > 0) {
        this.audio.currentTime = Math.min(safeTime, this.audio.duration);
      } else {
        this.audio.currentTime = safeTime;
      }
    }
  }

  /**
   * Playback rate control (0.5x to 2.0x)
   */
  public setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.25, Math.min(4.0, rate));
    this.audio.playbackRate = clamped;
    if (this.bufferSourceNode) {
      this.bufferSourceNode.playbackRate.setValueAtTime(
        clamped,
        this.ctx ? this.ctx.currentTime : 0
      );
    }
  }

  /**
   * Get current playback timestamp
   */
  public getCurrentTime(): number {
    if (this.isBufferPlayback && this.isBufferPlaying && this.ctx) {
      return this.bufferOffset + (this.ctx.currentTime - this.bufferStartTime);
    }
    return this.audio.currentTime || 0;
  }

  /**
   * Get current duration
   */
  public getDuration(): number {
    if (this.decodedBuffer) {
      return this.decodedBuffer.duration;
    }
    return isFinite(this.audio.duration) ? this.audio.duration : this.track?.duration || 0;
  }

  /**
   * Check if deck is playing
   */
  public isPlaying(): boolean {
    if (this.isBufferPlayback) {
      return this.isBufferPlaying;
    }
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 2;
  }

  /**
   * Revoke existing ObjectURL to free blob memory
   */
  public revokeCurrentUrl(): void {
    if (this.objectUrl) {
      try {
        URL.revokeObjectURL(this.objectUrl);
      } catch {}
      this.objectUrl = null;
    }
  }

  /**
   * Full teardown of deck channel
   */
  public dispose(): void {
    this.stop();
    this.revokeCurrentUrl();
    this.disposeNodes();
    this.audio.src = '';
    this.decodedBuffer = null;
    this.track = null;
  }

  // --- Internal Buffer Helpers ---
  private startBufferPlayback(offsetSec: number): void {
    if (!this.ctx || !this.decodedBuffer || !this.preampGainNode) return;
    this.stopBufferPlayback();

    try {
      this.bufferSourceNode = this.ctx.createBufferSource();
      this.bufferSourceNode.buffer = this.decodedBuffer;
      this.bufferSourceNode.connect(this.preampGainNode);

      this.bufferStartTime = this.ctx.currentTime;
      this.bufferOffset = offsetSec;
      this.isBufferPlaying = true;
      this.bufferSourceNode.start(0, offsetSec);

      this.bufferSourceNode.onended = () => {
        this.isBufferPlaying = false;
      };
    } catch (err) {
      console.warn(`[DeckChannel ${this.name}] Buffer playback error:`, err);
    }
  }

  private stopBufferPlayback(): void {
    if (this.bufferSourceNode) {
      try {
        this.bufferSourceNode.stop();
        this.bufferSourceNode.disconnect();
      } catch {}
      this.bufferSourceNode = null;
    }
    this.isBufferPlaying = false;
  }
}
