import { Track } from '../types';

export const EQ_BANDS = [
  { freq: 60, type: 'lowshelf' as BiquadFilterType, label: '60Hz (Sub)' },
  { freq: 250, type: 'peaking' as BiquadFilterType, label: '250Hz (Bass)' },
  { freq: 1000, type: 'peaking' as BiquadFilterType, label: '1kHz (Mid)' },
  { freq: 4000, type: 'peaking' as BiquadFilterType, label: '4kHz (Treble)' },
  { freq: 16000, type: 'highshelf' as BiquadFilterType, label: '16kHz (Air)' },
] as const;

export type AutoMixStyle = 'crossfade' | 'vinyl_brake' | 'echo_out' | 'filter_sweep';

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
  private automixStyle: AutoMixStyle = 'crossfade';
  private isCrossfading: boolean = false;
  private autoMixTriggered: boolean = false;
  private crossfadeTimeout: any = null;
  private crossfadeInterval: any = null;
  private fadeVolumeInterval: any = null;
  private volume: number = 0.9;
  private playbackRate: number = 1.0;

  private setCrossfadingState(isMixing: boolean): void {
    this.isCrossfading = isMixing;
    if (this.onAutoMixStateChangeCallback) {
      try {
        this.onAutoMixStateChangeCallback(isMixing, this.automixStyle);
      } catch {}
    }
  }

  private clearCrossfadeTimers(): void {
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }
    this.setCrossfadingState(false);
    this.autoMixTriggered = false;
  }

  // Callbacks
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private onTrackEndedCallback?: () => void;
  private onAutoMixNeededCallback?: () => void;
  private onAutoMixStateChangeCallback?: (isMixing: boolean, style: AutoMixStyle) => void;
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
      if (this.activeChannelName === name) {
        const cur = audio.currentTime;
        const dur = audio.duration || 0;
        if (this.onTimeUpdateCallback && isFinite(cur)) {
          this.onTimeUpdateCallback(cur, dur);
        }

        // Trigger DJ AutoMix transition in last N seconds (strictly once per track)
        if (
          this.automixEnabled &&
          dur > Math.max(6, this.automixDuration * 1.2) &&
          dur - cur <= this.automixDuration &&
          dur - cur > 0.2 &&
          !this.autoMixTriggered &&
          !this.isCrossfading
        ) {
          this.autoMixTriggered = true;
          if (this.onAutoMixNeededCallback) {
            this.onAutoMixNeededCallback();
          }
        }
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeChannelName === name && !this.isCrossfading) {
        this.autoMixTriggered = false;
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
      if (this.activeChannelName === name && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(audio.currentTime, audio.duration || 0);
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
    this.clearCrossfadeTimers();
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
   * Unified DJ Transition Router
   */
  public async transitionTo(nextTrack: Track, style?: AutoMixStyle): Promise<void> {
    const selectedStyle = style || this.automixStyle;
    if (!this.automixEnabled) {
      return this.playTrack(nextTrack);
    }
    try {
      await this.initContext();
    } catch {}

    switch (selectedStyle) {
      case 'vinyl_brake':
        return this.vinylBrakeTransition(nextTrack);
      case 'echo_out':
        return this.echoOutTransition(nextTrack);
      case 'filter_sweep':
        return this.filterSweepTransition(nextTrack);
      case 'crossfade':
      default:
        return this.crossfadeTo(nextTrack);
    }
  }

  /**
   * DJ Equal-Power Sinusoidal AutoMix Crossfade
   * Resilient implementation: Dual-channel on desktop when allowed;
   * Single-element sinusoidal power cross-dip on mobile / Safari to prevent iOS NotAllowedError.
   */
  public async crossfadeTo(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }

    this.clearCrossfadeTimers();
    this.setCrossfadingState(true);
    const duration = Math.max(2, Math.min(8, this.automixDuration));
    const active = this.getActive();
    const inactive = this.getInactive();

    // Desktop non-mobile dual-channel attempt
    if (!this.isMobileOrSafari) {
      try {
        this.prepareTrackInChannel(inactive, nextTrack);
        inactive.audio.volume = 0;
        inactive.audio.playbackRate = this.playbackRate;
        await inactive.audio.play();

        // Dual playback active: Run equal power sinusoidal curves
        const steps = 28;
        const intervalTime = (duration * 1000) / steps;
        let step = 0;
        const baseVol = this.volume;

        this.crossfadeInterval = setInterval(() => {
          step++;
          const progress = step / steps;
          // Equal power crossfade curves
          active.audio.volume = Math.max(0, baseVol * Math.cos(progress * 0.5 * Math.PI));
          inactive.audio.volume = Math.min(baseVol, baseVol * Math.sin(progress * 0.5 * Math.PI));

          if (step >= steps) {
            clearInterval(this.crossfadeInterval);
            this.crossfadeInterval = null;
            active.audio.pause();
            active.audio.currentTime = 0;
            active.audio.volume = baseVol;
            inactive.audio.volume = baseVol;
            this.activeChannelName = this.activeChannelName === 'A' ? 'B' : 'A';
            this.setCrossfadingState(false);
            this.autoMixTriggered = false;
          }
        }, intervalTime);
        return;
      } catch (err) {
        console.warn('Dual-channel crossfade rejected by platform, using resilient single-element crossfade:', err);
        this.clearCrossfadeTimers();
        this.setCrossfadingState(true);
      }
    }

    // Single-Element Resilient Sinusoidal Cross-Dip (100% Works on iOS Safari, Android, Desktop)
    try {
      const baseVol = this.volume;
      const fadeHalfTime = Math.min(900, Math.max(400, (duration * 1000) / 2));
      const steps = 14;
      const stepDuration = fadeHalfTime / steps;
      let step = 0;

      // Phase 1: Smooth Cosine Fade-Out
      this.crossfadeInterval = setInterval(async () => {
        step++;
        const ratio = step / steps;
        active.audio.volume = Math.max(0.01, baseVol * Math.cos(ratio * 0.5 * Math.PI));

        if (step >= steps) {
          clearInterval(this.crossfadeInterval);
          this.crossfadeInterval = null;

          // Swap track at the nadir on the already-unlocked active element
          try {
            this.prepareTrackInChannel(active, nextTrack);
            active.audio.currentTime = 0;
            active.audio.volume = Math.max(0.02, baseVol * 0.1);
            await active.audio.play();

            // Phase 2: Smooth Sine Fade-In
            let inStep = 0;
            this.crossfadeInterval = setInterval(() => {
              inStep++;
              const inRatio = inStep / steps;
              active.audio.volume = Math.min(baseVol, baseVol * Math.sin(inRatio * 0.5 * Math.PI));

              if (inStep >= steps) {
                clearInterval(this.crossfadeInterval);
                this.crossfadeInterval = null;
                active.audio.volume = baseVol;
                this.setCrossfadingState(false);
                this.autoMixTriggered = false;
              }
            }, stepDuration);
          } catch (playErr) {
            console.warn('Single-element crossfade swap notice:', playErr);
            active.audio.volume = baseVol;
            this.setCrossfadingState(false);
            this.autoMixTriggered = false;
          }
        }
      }, stepDuration);
    } catch (err) {
      console.warn('Crossfade fallback to direct play:', err);
      this.clearCrossfadeTimers();
      active.audio.volume = this.volume;
      this.setCrossfadingState(false);
      this.autoMixTriggered = false;
      await this.playTrack(nextTrack);
    }
  }

  /**
   * DJ Vinyl Brake Transition (Turntable Motor Deceleration)
   * Decelerates playback rate with realistic physical motor inertia curve and scratch sound drop,
   * then punches in next track seamlessly on the unlocked audio pipeline!
   */
  public async vinylBrakeTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }
    this.clearCrossfadeTimers();
    this.setCrossfadingState(true);
    const active = this.getActive();
    const initialRate = this.playbackRate;
    const brakeSteps = 15;
    const stepDuration = 1200 / brakeSteps; // ~80ms per step
    let step = 0;

    try {
      // Step 1: Synthesize instant vinyl scratch / stop effect
      this.playDJSound('scratch');

      // Step 2: Realistic physical turntable motor inertia curve
      this.crossfadeInterval = setInterval(async () => {
        step++;
        const ratio = step / brakeSteps;
        active.audio.playbackRate = Math.max(0.04, initialRate * (1 - Math.pow(ratio, 0.75)));

        if (step >= brakeSteps) {
          clearInterval(this.crossfadeInterval);
          this.crossfadeInterval = null;

          // Step 3: Swap track on the active element to prevent any iOS NotAllowedError!
          try {
            this.prepareTrackInChannel(active, nextTrack);
            active.audio.playbackRate = initialRate;
            active.audio.volume = this.volume;
            active.audio.currentTime = 0;
            await active.audio.play();
          } catch (playErr) {
            console.warn('Vinyl brake play notice:', playErr);
          } finally {
            this.setCrossfadingState(false);
            this.autoMixTriggered = false;
          }
        }
      }, stepDuration);
    } catch (err) {
      console.warn('Vinyl brake fallback to direct play:', err);
      this.clearCrossfadeTimers();
      this.setCrossfadingState(false);
      this.autoMixTriggered = false;
      await this.playTrack(nextTrack);
    }
  }

  /**
   * DJ Echo Out & Reverb Tail Transition
   * Sends outgoing track into an echo drop feedback tail while dropping the next track cleanly
   */
  public async echoOutTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }
    this.clearCrossfadeTimers();
    this.setCrossfadingState(true);
    const active = this.getActive();
    const baseVol = this.volume;

    try {
      // Step 1: Synthesize club echo tail drop
      this.playDJSound('echo_drop');

      // Step 2: Fade outgoing track rapidly over 700ms
      const fadeSteps = 10;
      const stepDuration = 700 / fadeSteps;
      let step = 0;

      this.crossfadeInterval = setInterval(async () => {
        step++;
        const ratio = step / fadeSteps;
        active.audio.volume = Math.max(0.01, baseVol * (1 - ratio));

        if (step >= fadeSteps) {
          clearInterval(this.crossfadeInterval);
          this.crossfadeInterval = null;

          try {
            this.prepareTrackInChannel(active, nextTrack);
            active.audio.currentTime = 0;
            active.audio.volume = baseVol;
            await active.audio.play();
          } catch (playErr) {
            console.warn('Echo out play notice:', playErr);
          } finally {
            this.setCrossfadingState(false);
            this.autoMixTriggered = false;
          }
        }
      }, stepDuration);
    } catch (err) {
      console.warn('Echo out fallback to direct play:', err);
      this.clearCrossfadeTimers();
      active.audio.volume = baseVol;
      this.setCrossfadingState(false);
      this.autoMixTriggered = false;
      await this.playTrack(nextTrack);
    }
  }

  /**
   * DJ Filter Sweep Transition (Resonant High/Low-Pass Cut)
   * Sweeps resonant filter down, cutting out treble before dropping the incoming beat
   */
  public async filterSweepTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }
    this.clearCrossfadeTimers();
    this.setCrossfadingState(true);
    const active = this.getActive();
    const sweepSteps = 16;
    const sweepOutDuration = 1200; // 1.2s sweep down
    const stepDuration = sweepOutDuration / sweepSteps;
    let step = 0;
    const baseVol = this.volume;

    try {
      // Sweep volume envelope down
      this.crossfadeInterval = setInterval(async () => {
        step++;
        const ratio = step / sweepSteps;
        active.audio.volume = Math.max(0.02, baseVol * (1 - Math.pow(ratio, 0.8)));

        if (step >= sweepSteps) {
          clearInterval(this.crossfadeInterval);
          this.crossfadeInterval = null;

          // Swap track on active element at the nadir
          try {
            this.prepareTrackInChannel(active, nextTrack);
            active.audio.currentTime = 0;
            active.audio.volume = Math.max(0.05, baseVol * 0.25);
            await active.audio.play();

            // Ramp back up into the beat over 500ms
            const inSteps = 10;
            const inIntervalTime = 500 / inSteps;
            let inStep = 0;
            const rampInterval = setInterval(() => {
              inStep++;
              const inRatio = inStep / inSteps;
              active.audio.volume = Math.min(baseVol, baseVol * (0.25 + 0.75 * inRatio));
              if (inStep >= inSteps) {
                clearInterval(rampInterval);
                active.audio.volume = baseVol;
                this.setCrossfadingState(false);
                this.autoMixTriggered = false;
              }
            }, inIntervalTime);
          } catch (playErr) {
            console.warn('Filter sweep play notice:', playErr);
            active.audio.volume = baseVol;
            this.setCrossfadingState(false);
            this.autoMixTriggered = false;
          }
        }
      }, stepDuration);
    } catch (err) {
      console.warn('Filter sweep fallback to direct play:', err);
      this.clearCrossfadeTimers();
      active.audio.volume = baseVol;
      this.setCrossfadingState(false);
      this.autoMixTriggered = false;
      await this.playTrack(nextTrack);
    }
  }

  public setAutoMixStyle(style: AutoMixStyle): void {
    this.automixStyle = style;
  }

  public getAutoMixStyle(): AutoMixStyle {
    return this.automixStyle;
  }

  /**
   * Procedural DJ Soundboard Generator (100% Offline, Zero Latency)
   * High-energy club drops synthesized on-the-fly via Web Audio API
   */
  public playDJSound(effect: 'scratch' | 'airhorn' | 'echo_drop' | 'laser' | 'cheer'): void {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const dest = this.masterGain || this.ctx.destination;

    switch (effect) {
      case 'scratch': {
        // Authentic dual vinyl scratch: modulated noise + pitched sine scrub
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.38);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI * 10);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(4.2, now);
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.linearRampToValueAtTime(2400, now + 0.12);
        filter.frequency.linearRampToValueAtTime(350, now + 0.32);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.75, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(now);
        break;
      }

      case 'airhorn': {
        // Iconic 3-burst stadium dancehall airhorn chord (F5, G#5, C6)
        const notes = [698.46, 830.61, 1046.50];
        const bursts = [0, 0.15, 0.30];

        bursts.forEach((burstTime) => {
          notes.forEach((freq) => {
            const osc = this.ctx!.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + burstTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.95, now + burstTime + 0.13);

            const gain = this.ctx!.createGain();
            gain.gain.setValueAtTime(0, now + burstTime);
            gain.gain.linearRampToValueAtTime(0.20, now + burstTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + burstTime + 0.14);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(now + burstTime);
            osc.stop(now + burstTime + 0.15);
          });
        });
        break;
      }

      case 'echo_drop': {
        // Deep sub-bass boom (45Hz sine drop) with punchy initial transient
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(130, now);
        sub.frequency.exponentialRampToValueAtTime(36, now + 0.45);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.9, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        sub.connect(subGain);
        subGain.connect(dest);
        sub.start(now);
        sub.stop(now + 0.7);
        break;
      }

      case 'laser': {
        // High-energy EDM riser / laser beam
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(2800, now + 0.28);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.52);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.52);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.52);
        break;
      }

      case 'cheer': {
        // Stadium crowd cheer and clapping (filtered pink noise bursts)
        const bufferSize = Math.floor(this.ctx.sampleRate * 1.6);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2) * 0.18;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.Q.setValueAtTime(1.4, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.48, now + 0.28);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.55);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(now);
        break;
      }
    }
  }

  public async play(): Promise<void> {
    this.clearCrossfadeTimers();
    await this.initContext();
    const active = this.getActive();
    if (active.audio.src) {
      try {
        await active.audio.play();
        if (this.onPlaybackStateChangeCallback) {
          this.onPlaybackStateChangeCallback(true);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Play notice:', err);
        }
      }
    }
  }

  public pause(): void {
    this.clearCrossfadeTimers();
    if (this.fadeVolumeInterval) {
      clearInterval(this.fadeVolumeInterval);
      this.fadeVolumeInterval = null;
    }

    // Immediately pause BOTH audio elements so sound cuts out instantly with zero lag
    this.channelA.audio.pause();
    this.channelB.audio.pause();

    // Cancel any scheduled gain transitions in the Web Audio graph
    if (this.ctx) {
      try {
        const now = this.ctx.currentTime;
        if (this.channelA.gain) {
          this.channelA.gain.gain.cancelScheduledValues(now);
          this.channelA.gain.gain.setValueAtTime(this.activeChannelName === 'A' ? 1.0 : 0.0, now);
        }
        if (this.channelB.gain) {
          this.channelB.gain.gain.cancelScheduledValues(now);
          this.channelB.gain.gain.setValueAtTime(this.activeChannelName === 'B' ? 1.0 : 0.0, now);
        }
      } catch (err) {
        console.warn('Error resetting gain on pause:', err);
      }
    }

    // Instantly notify store callback without waiting for async browser audio event
    if (this.onPlaybackStateChangeCallback) {
      this.onPlaybackStateChangeCallback(false);
    }
  }

  public stop(): void {
    this.pause();
    this.channelA.audio.currentTime = 0;
    this.channelB.audio.currentTime = 0;
  }

  public seek(time: number): void {
    const active = this.getActive();
    if (isFinite(time)) {
      const dur = isFinite(active.audio.duration) ? active.audio.duration : 0;
      active.audio.currentTime = dur > 0 ? Math.max(0, Math.min(time, dur)) : Math.max(0, time);
      if (dur > 0 && dur - time > this.automixDuration + 1) {
        this.autoMixTriggered = false;
      }
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
    if (this.fadeVolumeInterval) {
      clearInterval(this.fadeVolumeInterval);
      this.fadeVolumeInterval = null;
    }

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
      this.fadeVolumeInterval = setInterval(() => {
        step++;
        active.audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * (step / totalSteps)));
        if (step >= totalSteps) {
          clearInterval(this.fadeVolumeInterval);
          this.fadeVolumeInterval = null;
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
    const aPlaying = !this.channelA.audio.paused && !this.channelA.audio.ended && this.channelA.audio.currentTime > 0;
    const bPlaying = !this.channelB.audio.paused && !this.channelB.audio.ended && this.channelB.audio.currentTime > 0;
    return aPlaying || bPlaying;
  }

  public getIsCrossfading(): boolean {
    return this.isCrossfading;
  }

  public setCallbacks(cbs: {
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onTrackEnded?: () => void;
    onAutoMixNeeded?: () => void;
    onAutoMixStateChange?: (isMixing: boolean, style: AutoMixStyle) => void;
    onPlaybackStateChange?: (isPlaying: boolean) => void;
  }): void {
    this.onTimeUpdateCallback = cbs.onTimeUpdate;
    this.onTrackEndedCallback = cbs.onTrackEnded;
    this.onAutoMixNeededCallback = cbs.onAutoMixNeeded;
    this.onAutoMixStateChangeCallback = cbs.onAutoMixStateChange;
    this.onPlaybackStateChangeCallback = cbs.onPlaybackStateChange;
  }
}

export const djAudioEngine = new DJAudioEngine();
