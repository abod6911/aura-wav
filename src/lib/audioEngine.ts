import { Track } from '../types';
import { createTimerWorker, TimerWorkerController } from './timerWorker';

export const EQ_BANDS = [
  { freq: 60, type: 'lowshelf' as BiquadFilterType, label: '60Hz (Sub)' },
  { freq: 250, type: 'peaking' as BiquadFilterType, label: '250Hz (Bass)' },
  { freq: 1000, type: 'peaking' as BiquadFilterType, label: '1kHz (Mid)' },
  { freq: 4000, type: 'peaking' as BiquadFilterType, label: '4kHz (Treble)' },
  { freq: 16000, type: 'highshelf' as BiquadFilterType, label: '16kHz (Air)' },
] as const;

export type AutoMixStyle = 'crossfade' | 'vinyl_brake' | 'echo_out' | 'filter_sweep';

/**
 * Mathematical Equal-Power Crossfade Curve Generator
 * Outgoing: cos(t * PI / 2)
 * Incoming: sin(t * PI / 2)
 * Constant acoustic power: cos²(x) + sin²(x) = 1.0 (Zero midpoint volume drop)
 */
export function generateEqualPowerCurves(points = 64): {
  outgoingCurve: Float32Array;
  incomingCurve: Float32Array;
} {
  const outgoing = new Float32Array(points);
  const incoming = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1); // 0.0 to 1.0
    outgoing[i] = Math.cos(progress * 0.5 * Math.PI);
    incoming[i] = Math.sin(progress * 0.5 * Math.PI);
  }
  return { outgoingCurve: outgoing, incomingCurve: incoming };
}

interface Channel {
  name: 'A' | 'B';
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  filter: BiquadFilterNode | null;
  track: Track | null;
  objectUrl: string | null;
  isPreloaded: boolean;
  gainValue: number;
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

  // Unthrottled Background Timer Worker
  private timerWorker: TimerWorkerController | null = null;

  // Platform capability detection
  private isMobileOrSafari: boolean = false;
  private isUnlocked: boolean = false;

  // Configuration & States
  private automixEnabled: boolean = true;
  private automixDuration: number = 5; // seconds
  private automixStyle: AutoMixStyle = 'crossfade';
  private isCrossfading: boolean = false;
  private autoMixTriggered: boolean = false;
  private preloadTriggered: boolean = false;
  private crossfadeStartTime: number = 0;
  private currentTransitionDuration: number = 5;
  private midpointFired: boolean = false;
  private incomingTrackUnderTransition: Track | null = null;

  private volume: number = 0.9;
  private playbackRate: number = 1.0;
  private currentEqGains: [number, number, number, number, number] = [0, 0, 0, 0, 0];

  // Callbacks
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private onTrackEndedCallback?: () => void;
  private onPreloadNeededCallback?: (currentTrack: Track) => void;
  private onAutoMixNeededCallback?: () => void;
  private onAutoMixStateChangeCallback?: (isMixing: boolean, style: AutoMixStyle) => void;
  private onMidpointReachedCallback?: (incomingTrack: Track) => void;
  private onTransitionCompleteCallback?: (newTrack: Track) => void;
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

    // Initialize Unthrottled Background Timer Worker
    this.initTimerWorker();

    // Setup visibility listener to resume context if suspended
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      });
    }
  }

  private initTimerWorker(): void {
    if (typeof window === 'undefined') return;
    this.timerWorker = createTimerWorker();
    this.timerWorker.onTick(() => {
      this.handleEngineTick();
    });
  }

  private handleEngineTick(): void {
    const active = this.getActive();
    if (!active.audio.src) return;

    const cur = active.audio.currentTime;
    const dur = active.audio.duration;

    if (!isFinite(cur) || !isFinite(dur) || dur <= 0) return;

    // 1. High-frequency UI timeupdate callback
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(cur, dur);
    }

    // 2. Pre-warming & lookahead trigger (12–15s prior to track end)
    const timeRemaining = dur - cur;
    if (
      this.automixEnabled &&
      dur > 15 &&
      timeRemaining <= 14 &&
      timeRemaining > this.automixDuration &&
      !this.preloadTriggered &&
      !this.isCrossfading &&
      active.track
    ) {
      this.preloadTriggered = true;
      if (this.onPreloadNeededCallback) {
        this.onPreloadNeededCallback(active.track);
      }
    }

    // 3. AutoMix Transition trigger
    if (
      this.automixEnabled &&
      dur > Math.max(6, this.automixDuration * 1.2) &&
      timeRemaining <= this.automixDuration &&
      timeRemaining > 0.3 &&
      !this.autoMixTriggered &&
      !this.isCrossfading
    ) {
      this.autoMixTriggered = true;
      if (this.onAutoMixNeededCallback) {
        this.onAutoMixNeededCallback();
      }
    }

    // 4. In-flight Crossfade monitoring (Midpoint MediaSession & Completion)
    if (this.isCrossfading && this.crossfadeStartTime > 0) {
      const elapsed = (performance.now() - this.crossfadeStartTime) / 1000;
      const progress = Math.min(1.0, elapsed / Math.max(0.5, this.currentTransitionDuration));

      // Exact Midpoint trigger (progress = 0.5) to switch lock screen metadata
      if (progress >= 0.5 && !this.midpointFired && this.incomingTrackUnderTransition) {
        this.midpointFired = true;
        if (this.onMidpointReachedCallback) {
          this.onMidpointReachedCallback(this.incomingTrackUnderTransition);
        }
      }

      // Transition complete
      if (progress >= 1.0) {
        this.finalizeTransition();
      }
    }
  }

  private createChannel(name: 'A' | 'B'): Channel {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    // Attach to DOM so WebKit registers audio output pipeline for MediaSession & NowPlaying
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

    audio.addEventListener('ended', () => {
      if (this.activeChannelName === name && !this.isCrossfading) {
        this.autoMixTriggered = false;
        this.preloadTriggered = false;
        if (this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      }
    });

    audio.addEventListener('play', () => {
      if (this.activeChannelName === name && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(true);
      }
      this.timerWorker?.start(50);
    });

    audio.addEventListener('playing', () => {
      if (this.activeChannelName === name && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(true);
      }
    });

    audio.addEventListener('pause', () => {
      if (this.activeChannelName === name && !this.isCrossfading && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(false);
      }
      if (!this.isPlaying()) {
        this.timerWorker?.stop();
      }
    });

    audio.addEventListener('error', (e) => {
      console.warn(`[DJAudioEngine] Channel ${name} error:`, audio.error || e);
    });

    return {
      name,
      audio,
      source: null,
      gain: null,
      filter: null,
      track: null,
      objectUrl: null,
      isPreloaded: false,
      gainValue: name === 'A' ? 1.0 : 0.0,
    };
  }

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

        // Complete Studio Audio Processing Chain:
        // Channel Gains -> Channel Filters -> BassBoost -> EQ[0] -> ... -> EQ[4] -> Compressor -> Spatial -> Analyser -> MasterGain -> Destination
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
        delayL.delayTime.setValueAtTime(0.014, this.ctx.currentTime);
        delayR.delayTime.setValueAtTime(0.014, this.ctx.currentTime);

        this.spatialCrossGain = this.ctx.createGain();
        this.spatialCrossGain.gain.setValueAtTime(this.spatialAudioEnabled ? 0.45 : 0, this.ctx.currentTime);

        this.compressor.connect(merger, 0, 0);
        this.compressor.connect(merger, 0, 1);

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

        this.spatialCrossGain.connect(merger, 0, 1);
        this.spatialCrossGain.connect(merger, 0, 0);

        merger.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Bind both Ping-Pong channels to the audio graph
        this.bindChannelToGraph(this.channelA, 1.0);
        this.bindChannelToGraph(this.channelB, 0.0);
      } catch (err) {
        console.warn('[DJAudioEngine] AudioContext initialization fallback:', err);
        this.ctx = null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {}
    }

    return this.ctx;
  }

  /**
   * Unlock both audio channels during user interaction gesture
   * Permanently permits programmatic background dual-playback on iOS Safari / WebKit
   */
  public async unlockEngines(): Promise<void> {
    if (this.isUnlocked) return;
    try {
      await this.initContext();
      const silentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      
      if (!this.channelA.audio.src) {
        this.channelA.audio.src = silentWav;
        await this.channelA.audio.play().catch(() => {});
        this.channelA.audio.pause();
      }
      if (!this.channelB.audio.src) {
        this.channelB.audio.src = silentWav;
        await this.channelB.audio.play().catch(() => {});
        this.channelB.audio.pause();
      }
      this.isUnlocked = true;
    } catch (err) {
      console.warn('[DJAudioEngine] Audio unlock notice:', err);
    }
  }

  private bindChannelToGraph(channel: Channel, initialGain: number) {
    if (!this.ctx || channel.source) return;
    try {
      channel.source = this.ctx.createMediaElementSource(channel.audio);
      channel.gain = this.ctx.createGain();
      channel.gain.gain.setValueAtTime(initialGain, this.ctx.currentTime);
      channel.gainValue = initialGain;

      channel.filter = this.ctx.createBiquadFilter();
      channel.filter.type = 'lowpass';
      channel.filter.frequency.setValueAtTime(20000, this.ctx.currentTime);
      channel.filter.Q.setValueAtTime(0.707, this.ctx.currentTime);

      channel.source.connect(channel.gain);
      channel.gain.connect(channel.filter);

      if (this.bassBoostFilter) {
        channel.filter.connect(this.bassBoostFilter);
      } else if (this.eqFilters[0]) {
        channel.filter.connect(this.eqFilters[0]);
      }
    } catch (e) {
      console.warn('[DJAudioEngine] Channel graph bind error:', e);
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
    channel.audio.title = `${track.title} - ${track.artist}`;
    channel.isPreloaded = true;
  }

  /**
   * Lookahead Pre-warming (10–15s prior to track end):
   * Preloads the next track into the standby channel while muted, ready for gapless transition.
   */
  public preloadNextTrack(track: Track): void {
    const inactive = this.getInactive();
    if (inactive.track?.id === track.id && inactive.isPreloaded && inactive.audio.readyState >= 2) {
      return; // Already warmed up
    }

    try {
      this.prepareTrackInChannel(inactive, track);
      inactive.audio.volume = 0;
      if (inactive.gain && this.ctx) {
        inactive.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      }
      inactive.audio.load();
    } catch (err) {
      console.warn('[DJAudioEngine] Preload notice:', err);
    }
  }

  public async playTrack(track: Track): Promise<void> {
    this.cancelActiveTransitions(true);
    await this.unlockEngines();

    this.isCrossfading = false;
    this.autoMixTriggered = false;
    this.preloadTriggered = false;

    const active = this.getActive();
    const inactive = this.getInactive();

    inactive.audio.pause();
    inactive.audio.currentTime = 0;
    inactive.isPreloaded = false;

    this.prepareTrackInChannel(active, track);

    if (active.gain && this.ctx) {
      try {
        active.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        active.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        active.gainValue = 1.0;
      } catch {}
    }
    if (inactive.gain && this.ctx) {
      try {
        inactive.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        inactive.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
        inactive.gainValue = 0.0;
      } catch {}
    }

    active.audio.volume = 1.0;
    inactive.audio.volume = 0.0;

    try {
      await active.audio.play();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[DJAudioEngine] Play track notice:', err);
      }
    }
  }

  public async transitionTo(nextTrack: Track, style?: AutoMixStyle): Promise<void> {
    const selectedStyle = style || this.automixStyle;
    if (!this.automixEnabled) {
      return this.playTrack(nextTrack);
    }
    await this.unlockEngines();

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
   * Enterprise Equal-Power Sinusoidal AutoMix Crossfade
   * Hardware-scheduled via Web Audio setValueCurveAtTime with 0 dB volume drop
   */
  public async crossfadeTo(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }

    this.cancelActiveTransitions(false);
    this.setCrossfadingState(true);

    const duration = Math.max(2, Math.min(12, this.automixDuration));
    this.currentTransitionDuration = duration;
    this.crossfadeStartTime = performance.now();
    this.midpointFired = false;
    this.incomingTrackUnderTransition = nextTrack;

    const active = this.getActive();
    const inactive = this.getInactive();

    // Ensure inactive channel has the track ready
    if (!inactive.track || inactive.track.id !== nextTrack.id || !inactive.isPreloaded) {
      this.prepareTrackInChannel(inactive, nextTrack);
    }

    inactive.audio.currentTime = 0;
    inactive.audio.playbackRate = this.playbackRate;

    // Pre-calculate Equal-Power curves
    const { outgoingCurve, incomingCurve } = generateEqualPowerCurves(64);

    if (this.ctx && active.gain && inactive.gain) {
      const now = this.ctx.currentTime;
      // Hardware-level AudioParam scheduling
      active.gain.gain.cancelScheduledValues(now);
      inactive.gain.gain.cancelScheduledValues(now);

      active.gain.gain.setValueCurveAtTime(outgoingCurve, now, duration);
      inactive.gain.gain.setValueCurveAtTime(incomingCurve, now, duration);

      active.audio.volume = 1.0;
      inactive.audio.volume = 1.0;

      try {
        await inactive.audio.play();
      } catch (err) {
        console.warn('[DJAudioEngine] Crossfade inactive channel play notice:', err);
        // Fallback to single-element transition if dual playback was blocked
        return this.resilientSingleElementCrossfade(active, nextTrack, duration);
      }
    } else {
      // Software fallback using Equal-Power mathematical curve
      try {
        inactive.audio.volume = 0;
        await inactive.audio.play();
        this.softwareEqualPowerCrossfade(active, inactive, duration);
      } catch {
        return this.resilientSingleElementCrossfade(active, nextTrack, duration);
      }
    }
  }

  private softwareEqualPowerCrossfade(active: Channel, inactive: Channel, durationSec: number): void {
    const steps = 30;
    const intervalTime = (durationSec * 1000) / steps;
    let step = 0;

    const intId = setInterval(() => {
      step++;
      const progress = step / steps;
      active.audio.volume = Math.max(0, Math.cos(progress * 0.5 * Math.PI));
      inactive.audio.volume = Math.min(1.0, Math.sin(progress * 0.5 * Math.PI));

      if (step >= steps) {
        clearInterval(intId);
        this.finalizeTransition();
      }
    }, intervalTime);
  }

  private async resilientSingleElementCrossfade(active: Channel, nextTrack: Track, durationSec: number): Promise<void> {
    const halfTime = (durationSec * 1000) / 2;
    const steps = 15;
    const stepDuration = halfTime / steps;
    let step = 0;

    const fadeOutInterval = setInterval(async () => {
      step++;
      const ratio = step / steps;
      active.audio.volume = Math.max(0.01, Math.cos(ratio * 0.5 * Math.PI));

      if (step >= steps) {
        clearInterval(fadeOutInterval);
        try {
          this.prepareTrackInChannel(active, nextTrack);
          active.audio.currentTime = 0;
          active.audio.volume = 0.05;
          await active.audio.play();

          if (this.onMidpointReachedCallback) {
            this.onMidpointReachedCallback(nextTrack);
          }

          let inStep = 0;
          const fadeInInterval = setInterval(() => {
            inStep++;
            const inRatio = inStep / steps;
            active.audio.volume = Math.min(1.0, Math.sin(inRatio * 0.5 * Math.PI));

            if (inStep >= steps) {
              clearInterval(fadeInInterval);
              active.audio.volume = 1.0;
              this.setCrossfadingState(false);
              this.autoMixTriggered = false;
              this.preloadTriggered = false;
              if (this.onTransitionCompleteCallback) {
                this.onTransitionCompleteCallback(nextTrack);
              }
            }
          }, stepDuration);
        } catch (e) {
          console.warn('[DJAudioEngine] Resilient crossfade notice:', e);
          this.playTrack(nextTrack);
        }
      }
    }, stepDuration);
  }

  /**
   * DJ Vinyl Brake Transition
   * Turntable motor deceleration curve on playbackRate + scratch drop + clean punch-in
   */
  public async vinylBrakeTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }
    this.cancelActiveTransitions(false);
    this.setCrossfadingState(true);

    const duration = 1.3;
    this.currentTransitionDuration = duration;
    this.crossfadeStartTime = performance.now();
    this.midpointFired = false;
    this.incomingTrackUnderTransition = nextTrack;

    const active = this.getActive();
    const inactive = this.getInactive();
    const initialRate = this.playbackRate;

    // Trigger procedural turntable scratch drop
    this.playDJSound('scratch');

    // Decelerate motor inertia curve
    const brakeSteps = 16;
    const stepDuration = (duration * 1000) / brakeSteps;
    let step = 0;

    const brakeInterval = setInterval(async () => {
      step++;
      const ratio = step / brakeSteps;
      active.audio.playbackRate = Math.max(0.04, initialRate * (1 - Math.pow(ratio, 0.75)));

      if (step === Math.floor(brakeSteps / 2) && !this.midpointFired) {
        this.midpointFired = true;
        if (this.onMidpointReachedCallback) {
          this.onMidpointReachedCallback(nextTrack);
        }
      }

      if (step >= brakeSteps) {
        clearInterval(brakeInterval);
        active.audio.playbackRate = initialRate;

        // Punch in next track on inactive channel
        this.prepareTrackInChannel(inactive, nextTrack);
        inactive.audio.currentTime = 0;
        inactive.audio.playbackRate = initialRate;

        if (this.ctx && inactive.gain) {
          inactive.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
          active.gain?.gain.setValueAtTime(0.0, this.ctx.currentTime);
        }
        inactive.audio.volume = 1.0;
        active.audio.volume = 0.0;

        try {
          await inactive.audio.play();
        } catch {
          // Fallback on active
          this.prepareTrackInChannel(active, nextTrack);
          active.audio.volume = 1.0;
          await active.audio.play();
        } finally {
          this.finalizeTransition();
        }
      }
    }, stepDuration);
  }

  /**
   * DJ Echo Out & Reverb Tail Transition
   */
  public async echoOutTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }
    this.cancelActiveTransitions(false);
    this.setCrossfadingState(true);

    const duration = 1.4;
    this.currentTransitionDuration = duration;
    this.crossfadeStartTime = performance.now();
    this.midpointFired = false;
    this.incomingTrackUnderTransition = nextTrack;

    const active = this.getActive();
    const inactive = this.getInactive();

    // Club echo drop boom
    this.playDJSound('echo_drop');

    if (this.ctx && active.gain && inactive.gain) {
      const now = this.ctx.currentTime;
      active.gain.gain.setValueAtTime(1.0, now);
      active.gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      this.prepareTrackInChannel(inactive, nextTrack);
      inactive.audio.currentTime = 0;
      inactive.gain.gain.setValueAtTime(0.0, now);
      inactive.gain.gain.linearRampToValueAtTime(1.0, now + 0.9);

      active.audio.volume = 1.0;
      inactive.audio.volume = 1.0;

      try {
        await inactive.audio.play();
      } catch {
        this.prepareTrackInChannel(active, nextTrack);
        await active.audio.play();
      }
    } else {
      this.resilientSingleElementCrossfade(active, nextTrack, duration);
    }
  }

  /**
   * DJ Filter Sweep Transition (Resonant Cut & Punch)
   */
  public async filterSweepTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      return this.playTrack(nextTrack);
    }
    this.cancelActiveTransitions(false);
    this.setCrossfadingState(true);

    const duration = 1.6;
    this.currentTransitionDuration = duration;
    this.crossfadeStartTime = performance.now();
    this.midpointFired = false;
    this.incomingTrackUnderTransition = nextTrack;

    const active = this.getActive();
    const inactive = this.getInactive();

    if (this.ctx && active.filter && inactive.filter && active.gain && inactive.gain) {
      const now = this.ctx.currentTime;
      // Sweep outgoing lowpass filter down to 250Hz
      active.filter.frequency.cancelScheduledValues(now);
      active.filter.frequency.setValueAtTime(20000, now);
      active.filter.frequency.exponentialRampToValueAtTime(250, now + 1.1);

      active.gain.gain.cancelScheduledValues(now);
      active.gain.gain.setValueAtTime(1.0, now);
      active.gain.gain.linearRampToValueAtTime(0.1, now + 1.1);

      this.prepareTrackInChannel(inactive, nextTrack);
      inactive.audio.currentTime = 0;

      // Sweep incoming filter up from 300Hz to 20000Hz
      inactive.filter.frequency.cancelScheduledValues(now);
      inactive.filter.frequency.setValueAtTime(300, now + 0.5);
      inactive.filter.frequency.exponentialRampToValueAtTime(20000, now + 1.5);

      inactive.gain.gain.cancelScheduledValues(now);
      inactive.gain.gain.setValueAtTime(0.0, now);
      inactive.gain.gain.linearRampToValueAtTime(1.0, now + 1.5);

      active.audio.volume = 1.0;
      inactive.audio.volume = 1.0;

      try {
        await inactive.audio.play();
      } catch {
        this.resilientSingleElementCrossfade(active, nextTrack, duration);
      }
    } else {
      this.resilientSingleElementCrossfade(active, nextTrack, duration);
    }
  }

  private finalizeTransition(): void {
    const previous = this.getActive();
    const next = this.getInactive();

    previous.audio.pause();
    previous.audio.currentTime = 0;
    previous.audio.volume = 0;
    previous.isPreloaded = false;

    if (this.ctx && previous.gain && next.gain) {
      const now = this.ctx.currentTime;
      previous.gain.gain.cancelScheduledValues(now);
      previous.gain.gain.setValueAtTime(0.0, now);
      previous.gainValue = 0.0;

      next.gain.gain.cancelScheduledValues(now);
      next.gain.gain.setValueAtTime(1.0, now);
      next.gainValue = 1.0;

      if (previous.filter) {
        previous.filter.frequency.setValueAtTime(20000, now);
      }
      if (next.filter) {
        next.filter.frequency.setValueAtTime(20000, now);
      }
    }

    next.audio.volume = 1.0;

    // Swap active channel pointer
    this.activeChannelName = this.activeChannelName === 'A' ? 'B' : 'A';

    this.setCrossfadingState(false);
    this.autoMixTriggered = false;
    this.preloadTriggered = false;

    const completedTrack = next.track;
    if (completedTrack && this.onTransitionCompleteCallback) {
      this.onTransitionCompleteCallback(completedTrack);
    }
    this.incomingTrackUnderTransition = null;
  }

  public cancelActiveTransitions(immediateCut = true): void {
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.channelA.gain) {
        this.channelA.gain.gain.cancelScheduledValues(now);
      }
      if (this.channelB.gain) {
        this.channelB.gain.gain.cancelScheduledValues(now);
      }
      if (this.channelA.filter) {
        this.channelA.filter.frequency.cancelScheduledValues(now);
        this.channelA.filter.frequency.setValueAtTime(20000, now);
      }
      if (this.channelB.filter) {
        this.channelB.filter.frequency.cancelScheduledValues(now);
        this.channelB.filter.frequency.setValueAtTime(20000, now);
      }

      if (immediateCut) {
        const active = this.getActive();
        const inactive = this.getInactive();
        active.gain?.gain.setValueAtTime(1.0, now);
        inactive.gain?.gain.setValueAtTime(0.0, now);
        active.gainValue = 1.0;
        inactive.gainValue = 0.0;
      }
    }

    if (immediateCut) {
      const inactive = this.getInactive();
      inactive.audio.pause();
      inactive.audio.currentTime = 0;
      inactive.audio.volume = 0;
    }

    this.setCrossfadingState(false);
    this.autoMixTriggered = false;
    this.preloadTriggered = false;
    this.midpointFired = false;
    this.incomingTrackUnderTransition = null;
  }

  private setCrossfadingState(isMixing: boolean): void {
    this.isCrossfading = isMixing;
    if (this.onAutoMixStateChangeCallback) {
      try {
        this.onAutoMixStateChangeCallback(isMixing, this.automixStyle);
      } catch {}
    }
  }

  /**
   * Procedural DJ Soundboard Generator (100% Offline, Zero Latency)
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
    await this.unlockEngines();
    const active = this.getActive();
    const inactive = this.getInactive();

    if (active.audio.src) {
      try {
        await active.audio.play();
        if (this.isCrossfading && inactive.audio.src) {
          await inactive.audio.play().catch(() => {});
        }
        if (this.onPlaybackStateChangeCallback) {
          this.onPlaybackStateChangeCallback(true);
        }
        this.timerWorker?.start(50);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[DJAudioEngine] Play notice:', err);
        }
      }
    }
  }

  public pause(): void {
    // Retain current gains for seamless un-pause mid-crossfade
    this.channelA.audio.pause();
    this.channelB.audio.pause();
    this.timerWorker?.stop();

    if (this.onPlaybackStateChangeCallback) {
      this.onPlaybackStateChangeCallback(false);
    }
  }

  public stop(): void {
    this.cancelActiveTransitions(true);
    this.pause();
    this.channelA.audio.currentTime = 0;
    this.channelB.audio.currentTime = 0;
  }

  public seek(time: number): void {
    if (this.isCrossfading) {
      this.cancelActiveTransitions(true);
    }
    const active = this.getActive();
    if (isFinite(time)) {
      const dur = isFinite(active.audio.duration) ? active.audio.duration : 0;
      active.audio.currentTime = dur > 0 ? Math.max(0, Math.min(time, dur)) : Math.max(0, time);
      if (dur > 0 && dur - time > this.automixDuration + 2) {
        this.autoMixTriggered = false;
        this.preloadTriggered = false;
      }
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    } else {
      this.channelA.audio.volume = this.volume;
      this.channelB.audio.volume = this.volume;
    }
  }

  public fadeVolume(targetVol: number, durationSecs: number): void {
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, targetVol)), now + durationSecs);
    } else {
      const active = this.getActive();
      const startVol = active.audio.volume;
      const steps = 15;
      const interval = (durationSecs * 1000) / steps;
      let s = 0;
      const iv = setInterval(() => {
        s++;
        active.audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * (s / steps)));
        if (s >= steps) clearInterval(iv);
      }, interval);
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

  public setAutoMixStyle(style: AutoMixStyle): void {
    this.automixStyle = style;
  }

  public getAutoMixStyle(): AutoMixStyle {
    return this.automixStyle;
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
    onPreloadNeeded?: (currentTrack: Track) => void;
    onAutoMixNeeded?: () => void;
    onAutoMixStateChange?: (isMixing: boolean, style: AutoMixStyle) => void;
    onMidpointReached?: (incomingTrack: Track) => void;
    onTransitionComplete?: (newTrack: Track) => void;
    onPlaybackStateChange?: (isPlaying: boolean) => void;
  }): void {
    this.onTimeUpdateCallback = cbs.onTimeUpdate;
    this.onTrackEndedCallback = cbs.onTrackEnded;
    this.onPreloadNeededCallback = cbs.onPreloadNeeded;
    this.onAutoMixNeededCallback = cbs.onAutoMixNeeded;
    this.onAutoMixStateChangeCallback = cbs.onAutoMixStateChange;
    this.onMidpointReachedCallback = cbs.onMidpointReached;
    this.onTransitionCompleteCallback = cbs.onTransitionComplete;
    this.onPlaybackStateChangeCallback = cbs.onPlaybackStateChange;
  }
}

export const djAudioEngine = new DJAudioEngine();
