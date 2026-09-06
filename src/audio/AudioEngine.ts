import { Track } from '../types';

export const EQ_FREQUENCIES = [60, 250, 1000, 4000, 16000] as const;

interface Channel {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  currentTrack: Track | null;
  objectUrl: string | null;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private channelA: Channel;
  private channelB: Channel;
  private activeChannelName: 'A' | 'B' = 'A';
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];

  // Configuration
  private automixEnabled: boolean = true;
  private automixDuration: number = 5; // seconds
  private isCrossfading: boolean = false;
  private volume: number = 0.9;
  private playbackRate: number = 1.0;

  // Callbacks
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private onTrackEndedCallback?: () => void;
  private onAutoMixNeededCallback?: () => void;
  private onPlaybackStateChangeCallback?: (isPlaying: boolean) => void;

  constructor() {
    this.channelA = this.createChannel('A');
    this.channelB = this.createChannel('B');
  }

  private createChannel(name: 'A' | 'B'): Channel {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    audio.addEventListener('timeupdate', () => {
      if (this.activeChannelName === name && !this.isCrossfading) {
        const cur = audio.currentTime;
        const dur = audio.duration || 0;
        if (this.onTimeUpdateCallback && isFinite(cur)) {
          this.onTimeUpdateCallback(cur, dur);
        }

        // Check if AutoMix crossfade should start
        if (
          this.automixEnabled &&
          dur > 15 &&
          dur - cur <= this.automixDuration &&
          dur - cur > 0.5 &&
          !this.isCrossfading
        ) {
          if (this.onAutoMixNeededCallback) {
            this.onAutoMixNeededCallback();
          }
        }
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeChannelName === name && !this.isCrossfading) {
        if (this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      }
    });

    audio.addEventListener('play', () => {
      if (this.activeChannelName === name && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(true);
      }
    });

    audio.addEventListener('pause', () => {
      if (this.activeChannelName === name && !this.isCrossfading && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(false);
      }
    });

    return {
      audio,
      source: null,
      gain: null,
      currentTrack: null,
      objectUrl: null,
    };
  }

  /**
   * Initializes Web Audio context on user gesture
   */
  public async initAudioContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Analyser Node for Visualizer
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.85;

      // 5-Band Equalizer Filters
      this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.setValueAtTime(1.2, this.ctx!.currentTime);
        }
        filter.frequency.setValueAtTime(freq, this.ctx!.currentTime);
        filter.gain.setValueAtTime(0, this.ctx!.currentTime);
        return filter;
      });

      // Connect Equalizer Chain: Filter0 -> Filter1 -> ... -> Filter4 -> Analyser -> MasterGain -> Destination
      let lastNode: AudioNode = this.eqFilters[0];
      for (let i = 1; i < this.eqFilters.length; i++) {
        lastNode.connect(this.eqFilters[i]);
        lastNode = this.eqFilters[i];
      }
      lastNode.connect(this.analyser);
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Connect Channels to EQ Input
      this.setupChannelAudioGraph(this.channelA, 1.0);
      this.setupChannelAudioGraph(this.channelB, 0.0);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    return this.ctx;
  }

  private setupChannelAudioGraph(channel: Channel, initialGain: number) {
    if (!this.ctx || channel.source) return;

    try {
      channel.source = this.ctx.createMediaElementSource(channel.audio);
      channel.gain = this.ctx.createGain();
      channel.gain.gain.setValueAtTime(initialGain, this.ctx.currentTime);

      channel.source.connect(channel.gain);
      channel.gain.connect(this.eqFilters[0]);
    } catch (err) {
      console.warn('Error setting up channel audio graph:', err);
    }
  }

  private getActiveChannel(): Channel {
    return this.activeChannelName === 'A' ? this.channelA : this.channelB;
  }

  private getInactiveChannel(): Channel {
    return this.activeChannelName === 'A' ? this.channelB : this.channelA;
  }

  /**
   * Loads a track URL or File into a given channel
   */
  private async loadTrackIntoChannel(channel: Channel, track: Track): Promise<void> {
    // Revoke old URL if object URL was generated
    if (channel.objectUrl) {
      URL.revokeObjectURL(channel.objectUrl);
      channel.objectUrl = null;
    }

    channel.currentTrack = track;

    let src = '';
    if (track.file) {
      channel.objectUrl = URL.createObjectURL(track.file);
      src = channel.objectUrl;
    } else if (track.blob) {
      channel.objectUrl = URL.createObjectURL(track.blob);
      src = channel.objectUrl;
    }

    channel.audio.src = src;
    channel.audio.playbackRate = this.playbackRate;
    await channel.audio.load();
  }

  /**
   * Starts playback of a track immediately on active channel
   */
  public async playTrack(track: Track): Promise<void> {
    await this.initAudioContext();

    this.isCrossfading = false;
    const active = this.getActiveChannel();
    const inactive = this.getInactiveChannel();

    // Stop inactive channel
    inactive.audio.pause();
    inactive.audio.currentTime = 0;

    await this.loadTrackIntoChannel(active, track);

    if (active.gain && this.ctx) {
      active.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      active.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }

    await active.audio.play();
  }

  /**
   * Dual-Channel AutoMix Crossfade transition to the next track
   */
  public async crossfadeToTrack(nextTrack: Track): Promise<void> {
    if (this.isCrossfading || !this.ctx) {
      return this.playTrack(nextTrack);
    }

    const currentChannel = this.getActiveChannel();
    const nextChannel = this.getInactiveChannel();
    const duration = Math.max(1, this.automixDuration);

    this.isCrossfading = true;

    try {
      await this.loadTrackIntoChannel(nextChannel, nextTrack);

      const now = this.ctx.currentTime;

      // Current channel ramps down to 0
      if (currentChannel.gain) {
        currentChannel.gain.gain.cancelScheduledValues(now);
        currentChannel.gain.gain.setValueAtTime(currentChannel.gain.gain.value, now);
        currentChannel.gain.gain.linearRampToValueAtTime(0.0001, now + duration);
      }

      // Next channel ramps up from 0 to 1
      if (nextChannel.gain) {
        nextChannel.gain.gain.cancelScheduledValues(now);
        nextChannel.gain.gain.setValueAtTime(0.0001, now);
        nextChannel.gain.gain.linearRampToValueAtTime(1.0, now + duration);
      }

      await nextChannel.audio.play();

      // Swap active channel pointer
      this.activeChannelName = this.activeChannelName === 'A' ? 'B' : 'A';

      // Schedule cleanup after crossfade duration
      setTimeout(() => {
        currentChannel.audio.pause();
        currentChannel.audio.currentTime = 0;
        this.isCrossfading = false;
      }, duration * 1000 + 100);
    } catch (err) {
      console.warn('Crossfade error, falling back to direct play:', err);
      this.isCrossfading = false;
      await this.playTrack(nextTrack);
    }
  }

  public async play(): Promise<void> {
    await this.initAudioContext();
    const active = this.getActiveChannel();
    if (active.audio.src) {
      await active.audio.play();
    }
  }

  public pause(): void {
    const active = this.getActiveChannel();
    active.audio.pause();
  }

  public seek(time: number): void {
    const active = this.getActiveChannel();
    if (isFinite(time) && isFinite(active.audio.duration)) {
      active.audio.currentTime = Math.min(Math.max(0, time), active.audio.duration);
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    this.channelA.audio.playbackRate = rate;
    this.channelB.audio.playbackRate = rate;
  }

  public setAutoMix(enabled: boolean, durationSeconds: number): void {
    this.automixEnabled = enabled;
    this.automixDuration = Math.min(Math.max(2, durationSeconds), 12);
  }

  public setEqGains(gains: [number, number, number, number, number]): void {
    if (!this.ctx) return;
    this.eqFilters.forEach((filter, idx) => {
      const gainVal = Math.min(Math.max(-12, gains[idx]), 12);
      filter.gain.setValueAtTime(gainVal, this.ctx!.currentTime);
    });
  }

  public getVisualizerData(dataArray: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray as any);
    } else {
      dataArray.fill(0);
    }
  }

  public getCurrentTime(): number {
    return this.getActiveChannel().audio.currentTime || 0;
  }

  public getDuration(): number {
    return this.getActiveChannel().audio.duration || 0;
  }

  public isPlaying(): boolean {
    return !this.getActiveChannel().audio.paused;
  }

  // Event Listeners
  public setCallbacks(callbacks: {
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onTrackEnded?: () => void;
    onAutoMixNeeded?: () => void;
    onPlaybackStateChange?: (isPlaying: boolean) => void;
  }): void {
    this.onTimeUpdateCallback = callbacks.onTimeUpdate;
    this.onTrackEndedCallback = callbacks.onTrackEnded;
    this.onAutoMixNeededCallback = callbacks.onAutoMixNeeded;
    this.onPlaybackStateChangeCallback = callbacks.onPlaybackStateChange;
  }
}

// Global Singleton
export const audioEngine = new AudioEngine();
