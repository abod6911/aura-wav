import { Track } from '../types';

export const EQ_BANDS = [
  { freq: 60, type: 'lowshelf' as BiquadFilterType, label: '60Hz (Sub)' },
  { freq: 250, type: 'peaking' as BiquadFilterType, label: '250Hz (Bass)' },
  { freq: 1000, type: 'peaking' as BiquadFilterType, label: '1kHz (Mid)' },
  { freq: 4000, type: 'peaking' as BiquadFilterType, label: '4kHz (Treble)' },
  { freq: 16000, type: 'highshelf' as BiquadFilterType, label: '16kHz (Air)' },
] as const;

interface Channel {
  name: 'A' | 'B';
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  track: Track | null;
  objectUrl: string | null;
}

export class DJAudioEngine {
  private ctx: AudioContext | null = null;
  private channelA: Channel;
  private channelB: Channel;
  private activeChannelName: 'A' | 'B' = 'A';
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassBoostFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private currentBassBoost: number = 0; // 0 to 18 dB
  private spatialCrossGain: GainNode | null = null;
  private spatialAudioEnabled: boolean = false;

  // Platform capability detection
  private isMobileOrSafari: boolean = false;

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
    if (typeof navigator !== 'undefined') {
      this.isMobileOrSafari =
        /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));

      if ('audioSession' in navigator) {
        try {
          (navigator as any).audioSession.type = 'playback';
        } catch {}
      }
    }

    this.channelA = this.createChannel('A');
    this.channelB = this.createChannel('B');

    // Setup visibility listener to keep context alive on desktop
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      });
    }
  }

  private createChannel(name: 'A' | 'B'): Channel {
    const audio = new Audio();
    audio.preload = 'auto';
    // On mobile / iOS, do not enforce crossOrigin as it can break range requests without CORS headers
    if (!this.isMobileOrSafari) {
      audio.crossOrigin = 'anonymous';
    }

    // Attach to DOM so iOS WebKit creates a valid layout renderer for MediaSession & NowPlaying
    if (typeof document !== 'undefined' && document.body) {
      audio.style.position = 'fixed';
      audio.style.bottom = '0';
      audio.style.left = '0';
      audio.style.width = '1px';
      audio.style.height = '1px';
      audio.style.opacity = '0.001';
      audio.style.pointerEvents = 'none';
      audio.style.zIndex = '-1';
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      document.body.appendChild(audio);
    }

    audio.addEventListener('timeupdate', () => {
      if (this.activeChannelName === name && !this.isCrossfading) {
        const cur = audio.currentTime;
        const dur = audio.duration || 0;
        if (this.onTimeUpdateCallback && isFinite(cur)) {
          this.onTimeUpdateCallback(cur, dur);
        }

        // Trigger DJ AutoMix crossfade in last N seconds
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

    audio.addEventListener('playing', () => {
      if (this.activeChannelName === name && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(true);
      }
    });

    audio.addEventListener('loadedmetadata', () => {
      if (this.activeChannelName === name && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(true);
      }
    });

    audio.addEventListener('pause', () => {
      if (this.activeChannelName === name && !this.isCrossfading && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(false);
      }
    });

    audio.addEventListener('error', (e) => {
      console.warn(`[AudioEngine] Channel ${name} error:`, audio.error || e);
    });

    return {
      name,
      audio,
      source: null,
      gain: null,
      track: null,
      objectUrl: null,
    };
  }

  private currentEqGains: [number, number, number, number, number] = [0, 0, 0, 0, 0];

  public async initContext(): Promise<AudioContext | null> {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();

        // Master output gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        // Spectrum Analyser
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.82;

        // Dedicated Mega Bass Boost Filter (LowShelf @ 80Hz)
        this.bassBoostFilter = this.ctx.createBiquadFilter();
        this.bassBoostFilter.type = 'lowshelf';
        this.bassBoostFilter.frequency.setValueAtTime(80, this.ctx.currentTime);
        this.bassBoostFilter.gain.setValueAtTime(this.currentBassBoost, this.ctx.currentTime);

        // 5-Band Equalizer Filters with stored initial gains
        this.eqFilters = EQ_BANDS.map((band, idx) => {
          const filter = this.ctx!.createBiquadFilter();
          filter.type = band.type;
          filter.frequency.setValueAtTime(band.freq, this.ctx!.currentTime);
          if (band.type === 'peaking') {
            filter.Q.setValueAtTime(1.1, this.ctx!.currentTime);
          }
          const initialGain = this.currentEqGains[idx] || 0;
          filter.gain.setValueAtTime(initialGain, this.ctx!.currentTime);
          return filter;
        });

        // Studio Dynamics Compressor (Prevents clipping when bass/EQ are boosted)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        // Complete Studio Audio Chain:
        // BassBoost -> EQ[0] -> ... -> EQ[4] -> Compressor -> SpatialWidener -> Analyser -> MasterGain -> Destination
        this.bassBoostFilter.connect(this.eqFilters[0]);

        let prevNode: AudioNode = this.eqFilters[0];
        for (let i = 1; i < this.eqFilters.length; i++) {
          prevNode.connect(this.eqFilters[i]);
          prevNode = this.eqFilters[i];
        }
        prevNode.connect(this.compressor);

        // Apple Music Style Spatial Audio Expander (Binaural 3D Haas processor)
        const splitter = this.ctx.createChannelSplitter(2);
        const merger = this.ctx.createChannelMerger(2);
        const delayL = this.ctx.createDelay();
        const delayR = this.ctx.createDelay();
        delayL.delayTime.setValueAtTime(0.014, this.ctx.currentTime); // 14ms psychoacoustic Haas delay
        delayR.delayTime.setValueAtTime(0.014, this.ctx.currentTime);

        this.spatialCrossGain = this.ctx.createGain();
        this.spatialCrossGain.gain.setValueAtTime(this.spatialAudioEnabled ? 0.45 : 0, this.ctx.currentTime);

        // Direct path
        this.compressor.connect(merger, 0, 0);
        this.compressor.connect(merger, 0, 1);

        // Wet spatial crossfeed path
        this.compressor.connect(splitter);
        splitter.connect(delayL, 0);
        splitter.connect(delayR, 1);

        const invL = this.ctx.createGain();
        invL.gain.setValueAtTime(-0.8, this.ctx.currentTime);
        const invR = this.ctx.createGain();
        invR.gain.setValueAtTime(-0.8, this.ctx.currentTime);

        delayL.connect(invL);
        delayR.connect(invR);

        invL.connect(this.spatialCrossGain);
        invR.connect(this.spatialCrossGain);

        this.spatialCrossGain.connect(merger, 0, 1); // Cross L to R
        this.spatialCrossGain.connect(merger, 0, 0); // Cross R to L

        merger.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Connect both channels
        this.bindChannelToGraph(this.channelA, 1.0);
        this.bindChannelToGraph(this.channelB, 0.0);

        // Prime channel B silently during user gesture on iOS
        if (!this.channelB.audio.src) {
          this.channelB.audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
          this.channelB.audio.load();
        }
      } catch (err) {
        console.warn('AudioContext initialization fallback to direct playback:', err);
        this.ctx = null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // ignore
      }
    }

    return this.ctx;
  }

  private bindChannelToGraph(channel: Channel, initialGain: number) {
    if (!this.ctx || channel.source) return;
    try {
      channel.source = this.ctx.createMediaElementSource(channel.audio);
      channel.gain = this.ctx.createGain();
      channel.gain.gain.setValueAtTime(initialGain, this.ctx.currentTime);

      channel.source.connect(channel.gain);
      if (this.bassBoostFilter) {
        channel.gain.connect(this.bassBoostFilter);
      } else if (this.eqFilters[0]) {
        channel.gain.connect(this.eqFilters[0]);
      }
    } catch (e) {
      console.warn('Channel graph bind error:', e);
    }
  }

  private getActive(): Channel {
    return this.activeChannelName === 'A' ? this.channelA : this.channelB;
  }

  private getInactive(): Channel {
    return this.activeChannelName === 'A' ? this.channelB : this.channelA;
  }

  private prepareTrackInChannel(channel: Channel, track: Track): void {
    if (channel.objectUrl) {
      URL.revokeObjectURL(channel.objectUrl);
      channel.objectUrl = null;
    }
    channel.track = track;

    let src = '';
    if (track.file) {
      channel.objectUrl = URL.createObjectURL(track.file);
      src = channel.objectUrl;
    } else if (track.blob) {
      channel.objectUrl = URL.createObjectURL(track.blob);
      src = channel.objectUrl;
    } else if (track.audioUrl) {
      src = track.audioUrl;
    }

    channel.audio.src = src;
    channel.audio.playbackRate = this.playbackRate;
    channel.audio.volume = this.volume;
    channel.audio.title = `${track.title} - ${track.artist}`;
  }

  public async playTrack(track: Track): Promise<void> {
    try {
      await this.initContext();
    } catch (err) {
      console.warn('AudioContext init notice:', err);
    }
    this.isCrossfading = false;

    const active = this.getActive();
    const inactive = this.getInactive();

    inactive.audio.pause();
    inactive.audio.currentTime = 0;

    this.prepareTrackInChannel(active, track);

    if (active.gain && this.ctx) {
      try {
        active.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        active.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      } catch {}
    }

    try {
      await active.audio.play();
    } catch (err: any) {
      // If AbortError (interrupted by new song selection), ignore
      if (err.name !== 'AbortError') {
        console.warn('Play track notice:', err);
      }
    }
  }

  /**
   * DJ Equal-Power Sinusoidal AutoMix Crossfade
   * Eliminates abrupt volume dips by maintaining constant combined acoustic power
   */
  public async crossfadeTo(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }

    const currentChannel = this.getActive();
    const nextChannel = this.getInactive();
    const duration = Math.max(2, Math.min(12, this.automixDuration));

    this.isCrossfading = true;

    try {
      this.prepareTrackInChannel(nextChannel, nextTrack);

      if (this.ctx && currentChannel.gain && nextChannel.gain) {
        const now = this.ctx.currentTime;
        const steps = 64;
        const curveOut = new Float32Array(steps);
        const curveIn = new Float32Array(steps);

        for (let i = 0; i < steps; i++) {
          const ratio = i / (steps - 1);
          // Equal power crossfade curves: cos(theta) and sin(theta)
          curveOut[i] = Math.cos(ratio * 0.5 * Math.PI);
          curveIn[i] = Math.sin(ratio * 0.5 * Math.PI);
        }

        currentChannel.gain.gain.cancelScheduledValues(now);
        currentChannel.gain.gain.setValueCurveAtTime(curveOut, now, duration);

        nextChannel.gain.gain.cancelScheduledValues(now);
        nextChannel.gain.gain.setValueCurveAtTime(curveIn, now, duration);

        await nextChannel.audio.play();

        // Swap active channel pointer
        this.activeChannelName = this.activeChannelName === 'A' ? 'B' : 'A';

        setTimeout(() => {
          currentChannel.audio.pause();
          currentChannel.audio.currentTime = 0;
          if (currentChannel.gain && this.ctx) {
            currentChannel.gain.gain.setValueAtTime(0, this.ctx.currentTime);
          }
          this.isCrossfading = false;
        }, duration * 1000 + 100);
      } else {
        // High-fidelity fallback crossfade using dual element volume
        await nextChannel.audio.play();
        this.activeChannelName = this.activeChannelName === 'A' ? 'B' : 'A';

        const steps = 20;
        const intervalTime = (duration * 1000) / steps;
        let step = 0;
        const fadeTimer = setInterval(() => {
          step++;
          const progress = step / steps;
          currentChannel.audio.volume = Math.max(0, this.volume * Math.cos(progress * 0.5 * Math.PI));
          nextChannel.audio.volume = Math.min(this.volume, this.volume * Math.sin(progress * 0.5 * Math.PI));

          if (step >= steps) {
            clearInterval(fadeTimer);
            currentChannel.audio.pause();
            currentChannel.audio.currentTime = 0;
            currentChannel.audio.volume = this.volume;
            nextChannel.audio.volume = this.volume;
            this.isCrossfading = false;
          }
        }, intervalTime);
      }
    } catch (err) {
      console.warn('Crossfade fallback to direct play:', err);
      this.isCrossfading = false;
      await this.playTrack(nextTrack);
    }
  }

  public async play(): Promise<void> {
    await this.initContext();
    const active = this.getActive();
    if (active.audio.src) {
      try {
        await active.audio.play();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Play notice:', err);
        }
      }
    }
  }

  public pause(): void {
    this.getActive().audio.pause();
  }

  public seek(time: number): void {
    const active = this.getActive();
    if (isFinite(time) && isFinite(active.audio.duration)) {
      active.audio.currentTime = Math.max(0, Math.min(time, active.audio.duration));
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.channelA.audio.volume = this.volume;
    this.channelB.audio.volume = this.volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public fadeVolume(targetVol: number, durationSecs: number): void {
    const active = this.getActive();
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, targetVol)), now + durationSecs);
    } else {
      let step = 0;
      const totalSteps = 20;
      const startVol = active.audio.volume;
      const stepDuration = (durationSecs * 1000) / totalSteps;
      const interval = setInterval(() => {
        step++;
        active.audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * (step / totalSteps)));
        if (step >= totalSteps) {
          clearInterval(interval);
        }
      }, stepDuration);
    }
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    this.channelA.audio.playbackRate = rate;
    this.channelB.audio.playbackRate = rate;
  }

  public setAutoMix(enabled: boolean, durationSecs: number): void {
    this.automixEnabled = enabled;
    this.automixDuration = Math.max(2, Math.min(12, durationSecs));
  }

  public setEqGains(gains: [number, number, number, number, number]): void {
    this.currentEqGains = [...gains];
    if (!this.ctx) return;
    this.eqFilters.forEach((filter, idx) => {
      const val = Math.max(-15, Math.min(15, gains[idx]));
      try {
        filter.gain.setTargetAtTime(val, this.ctx!.currentTime, 0.05);
      } catch {
        filter.gain.setValueAtTime(val, this.ctx!.currentTime);
      }
    });
  }

  public setBassBoost(gain: number): void {
    this.currentBassBoost = Math.max(0, Math.min(18, gain));
    if (!this.ctx || !this.bassBoostFilter) return;
    try {
      this.bassBoostFilter.gain.setTargetAtTime(this.currentBassBoost, this.ctx.currentTime, 0.05);
    } catch {
      this.bassBoostFilter.gain.setValueAtTime(this.currentBassBoost, this.ctx.currentTime);
    }
  }

  public getBassBoost(): number {
    return this.currentBassBoost;
  }

  public setSpatialAudio(enabled: boolean): void {
    this.spatialAudioEnabled = enabled;
    if (!this.ctx || !this.spatialCrossGain) return;
    try {
      this.spatialCrossGain.gain.setTargetAtTime(enabled ? 0.45 : 0, this.ctx.currentTime, 0.05);
    } catch {
      this.spatialCrossGain.gain.setValueAtTime(enabled ? 0.45 : 0, this.ctx.currentTime);
    }
  }

  public isSpatialAudioEnabled(): boolean {
    return this.spatialAudioEnabled;
  }

  public getVisualizerData(arr: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(arr as any);
    } else {
      // If analyser is not active, synthesize subtle natural bars while playing
      if (this.isPlaying()) {
        const time = Date.now() * 0.005;
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(100 + Math.sin(time + i * 0.3) * 60 + Math.cos(time * 0.7 + i) * 40);
        }
      } else {
        arr.fill(0);
      }
    }
  }

  public getCurrentTime(): number {
    return this.getActive().audio.currentTime || 0;
  }

  public getDuration(): number {
    return this.getActive().audio.duration || 0;
  }

  public isPlaying(): boolean {
    return !this.getActive().audio.paused;
  }

  public setCallbacks(cbs: {
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onTrackEnded?: () => void;
    onAutoMixNeeded?: () => void;
    onPlaybackStateChange?: (isPlaying: boolean) => void;
  }): void {
    this.onTimeUpdateCallback = cbs.onTimeUpdate;
    this.onTrackEndedCallback = cbs.onTrackEnded;
    this.onAutoMixNeededCallback = cbs.onAutoMixNeeded;
    this.onPlaybackStateChangeCallback = cbs.onPlaybackStateChange;
  }
}

export const djAudioEngine = new DJAudioEngine();
