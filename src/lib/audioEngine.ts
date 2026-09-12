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
export type ReverbSpace = 'off' | 'studio' | 'arena' | 'car' | 'vinyl_lounge';

/**
 * Procedural Analog Tube / Tape Warmth Curve
 * Soft hyperbolic tangent saturation curve introducing warm even/odd harmonic presence
 */
export function generateTubeWarmthCurve(samples = 2048): Float32Array {
  const curve = new Float32Array(samples);
  const drive = 2.2;
  for (let i = 0; i < samples; ++i) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(x * drive);
  }
  return curve;
}

/**
 * Procedural Convolver Impulse Response Generator
 * Generates natural acoustic spaces without downloading external audio files (100% offline)
 */
export function generateImpulseResponse(
  ctx: AudioContext,
  space: ReverbSpace
): AudioBuffer | null {
  if (space === 'off') return null;

  let durationSec = 1.5;
  let decay = 2.5;
  let dampFreq = 6000;

  switch (space) {
    case 'studio':
      durationSec = 0.6;
      decay = 3.8;
      dampFreq = 8500;
      break;
    case 'arena':
      durationSec = 3.2;
      decay = 1.8;
      dampFreq = 5000;
      break;
    case 'car':
      durationSec = 0.35;
      decay = 5.2;
      dampFreq = 4200;
      break;
    case 'vinyl_lounge':
      durationSec = 1.4;
      decay = 2.8;
      dampFreq = 5500;
      break;
  }

  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  const dampFactor = Math.exp(-2 * Math.PI * (dampFreq / sampleRate));
  let prevL = 0;
  let prevR = 0;

  for (let i = 0; i < length; i++) {
    const progress = i / length;
    const envelope = Math.pow(1 - progress, decay);
    const whiteL = (Math.random() * 2 - 1) * envelope;
    const whiteR = (Math.random() * 2 - 1) * envelope;

    prevL = whiteL * (1 - dampFactor) + prevL * dampFactor;
    prevR = whiteR * (1 - dampFactor) + prevR * dampFactor;

    left[i] = prevL;
    right[i] = prevR;
  }
  return impulse;
}

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

  // Pro Studio DSP Nodes & States
  private channelPreBus: GainNode | null = null;
  private karaokeDryGain: GainNode | null = null;
  private karaokeWetGain: GainNode | null = null;
  private karaokeBassFilter: BiquadFilterNode | null = null;
  private karaokeEnabled: boolean = false;

  private warmthDryGain: GainNode | null = null;
  private warmthWetGain: GainNode | null = null;
  private warmthShaper: WaveShaperNode | null = null;
  private warmthPostBus: GainNode | null = null;
  private currentWarmth: number = 0; // 0 to 100%

  private convolverNode: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private currentReverbSpace: ReverbSpace = 'off';

  private normGain: GainNode | null = null;
  private loudnessNormEnabled: boolean = true;

  private hapticsEnabled: boolean = false;
  private lastHapticTime: number = 0;
  private bassFreqData: Uint8Array = new Uint8Array(8);

  // Unthrottled Background Timer Worker
  private timerWorker: TimerWorkerController | null = null;

  // Platform capability detection
  private isMobileOrSafari: boolean = false;
  private isUnlocked: boolean = false;
  private pendingGaplessFallbackTrack: Track | null = null;

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
  private lastUiTimeUpdate: number = 0;

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

    // Attach global gesture priming on very first touch/click anywhere on document
    if (typeof window !== 'undefined') {
      const gesturePriming = () => {
        this.primeDecks();
      };
      ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) => {
        window.addEventListener(evt, gesturePriming, { capture: true, passive: true });
      });
    }

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

    // 1. High-efficiency UI timeupdate callback with lockscreen scrubber sync
    // Throttled to ~120ms (~8 updates/sec) to avoid React state re-render thrashing and ensure 60fps UI fluidity
    const isHidden = typeof document !== 'undefined' && document.hidden;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!isHidden && this.onTimeUpdateCallback && (now - this.lastUiTimeUpdate >= 120)) {
      this.lastUiTimeUpdate = now;
      if (this.isCrossfading && this.midpointFired) {
        const inactive = this.getInactive();
        const inCur = inactive.audio.currentTime;
        const inDur = inactive.audio.duration;
        if (isFinite(inCur) && isFinite(inDur) && inDur > 0) {
          this.onTimeUpdateCallback(inCur, inDur);
        } else {
          this.onTimeUpdateCallback(cur, dur);
        }
      } else {
        this.onTimeUpdateCallback(cur, dur);
      }
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

    // 5. Low-end Haptic Bass Feedback Trigger
    if (this.hapticsEnabled && this.isPlaying()) {
      this.checkBassHaptics();
    }
  }

  private createChannel(name: 'A' | 'B'): Channel {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    const channel: Channel = {
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
      // PREVENT ACCIDENTAL AUTOPLAY: Ignore ended events if channel has no real user track (e.g. silent priming)
      if (!channel.track) {
        return;
      }

      // If outgoing track finished while crossfading, finalize immediately to prevent transition stall
      if (this.isCrossfading && this.activeChannelName === name) {
        this.finalizeTransition();
        return;
      }

      if (this.activeChannelName === name && !this.isCrossfading) {
        if (this.onPlaybackStateChangeCallback) {
          this.onPlaybackStateChangeCallback(false);
        }

        // Gapless fallback on already-unlocked primary deck if iOS previously rejected secondary deck
        if (this.pendingGaplessFallbackTrack) {
          const next = this.pendingGaplessFallbackTrack;
          this.pendingGaplessFallbackTrack = null;
          this.autoMixTriggered = false;
          this.preloadTriggered = false;
          this.gaplessSwapAndPlay(this.getActive(), next);
          return;
        }

        this.autoMixTriggered = false;
        this.preloadTriggered = false;
        if (this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      }
    });

    audio.addEventListener('play', () => {
      // Ignore silent priming events
      if (!channel.track) {
        return;
      }
      if (this.activeChannelName === name && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(true);
      }
      this.timerWorker?.start(50);
    });

    audio.addEventListener('playing', () => {
      if (!channel.track) {
        return;
      }
      if (this.activeChannelName === name && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(true);
      }
    });

    audio.addEventListener('pause', () => {
      if (!channel.track) {
        return;
      }
      if (this.activeChannelName === name && !this.isCrossfading && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(false);
      }
      if (!this.isPlaying()) {
        this.timerWorker?.stop();
      }
    });

    audio.addEventListener('error', (e) => {
      console.warn(`[DJAudioEngine] Channel ${name} error:`, audio.error || e);
      if (this.activeChannelName === name && this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(false);
      }
      this.timerWorker?.stop();
    });

    return channel;
  }

  public async initContext(): Promise<AudioContext | null> {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } catch (err) {
        console.warn('[DJAudioEngine] AudioContext creation error:', err);
      }
    }

    if (this.ctx && !this.masterGain) {
      try {
        // Auto-resume audio graph if mobile browser or power-saving suspends it while playing
        this.ctx.addEventListener('statechange', () => {
          if (this.ctx && this.ctx.state === 'suspended' && this.isPlaying()) {
            this.ctx.resume().catch(() => {});
          }
        });

        // Master output gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        // Spectrum Analyser
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.82;

        // Dedicated Pre-Bus summing both deck channels
        this.channelPreBus = this.ctx.createGain();
        this.channelPreBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

        // 1. Real-Time Vocal Remover / Karaoke Mode (Mid-Side Cancellation with Bass Bypass)
        this.karaokeDryGain = this.ctx.createGain();
        this.karaokeDryGain.gain.setValueAtTime(this.karaokeEnabled ? 0 : 1.0, this.ctx.currentTime);
        this.channelPreBus.connect(this.karaokeDryGain);

        this.karaokeWetGain = this.ctx.createGain();
        this.karaokeWetGain.gain.setValueAtTime(this.karaokeEnabled ? 1.0 : 0, this.ctx.currentTime);

        // Bass preservation filter (<180Hz) to keep centered punchy kicks & basslines
        this.karaokeBassFilter = this.ctx.createBiquadFilter();
        this.karaokeBassFilter.type = 'lowpass';
        this.karaokeBassFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
        this.karaokeBassFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);
        this.channelPreBus.connect(this.karaokeBassFilter);

        // High-pass filter (>180Hz) for mid/side lead vocal subtraction
        const kHighFilter = this.ctx.createBiquadFilter();
        kHighFilter.type = 'highpass';
        kHighFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
        kHighFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);
        this.channelPreBus.connect(kHighFilter);

        const kSplitter = this.ctx.createChannelSplitter(2);
        const kMerger = this.ctx.createChannelMerger(2);
        kHighFilter.connect(kSplitter);

        const kGainL = this.ctx.createGain();
        kGainL.gain.setValueAtTime(0.707, this.ctx.currentTime);
        const kGainRInv = this.ctx.createGain();
        kGainRInv.gain.setValueAtTime(-0.707, this.ctx.currentTime);

        kSplitter.connect(kGainL, 0);
        kSplitter.connect(kGainRInv, 1);

        const kSubSum = this.ctx.createGain();
        kGainL.connect(kSubSum);
        kGainRInv.connect(kSubSum);

        const kSubSumInv = this.ctx.createGain();
        kSubSumInv.gain.setValueAtTime(-1.0, this.ctx.currentTime);
        kSubSum.connect(kSubSumInv);

        kSubSum.connect(kMerger, 0, 0);       // Left channel: + (L - R)
        kSubSumInv.connect(kMerger, 0, 1);    // Right channel: - (L - R) = (R - L)

        this.karaokeBassFilter.connect(kMerger, 0, 0);
        this.karaokeBassFilter.connect(kMerger, 0, 1);

        kMerger.connect(this.karaokeWetGain);

        // Sum Dry & Wet Karaoke into the Bass Boost & Equalizer
        const preEqSum = this.ctx.createGain();
        this.karaokeDryGain.connect(preEqSum);
        this.karaokeWetGain.connect(preEqSum);

        // Dedicated Mega Bass Boost Filter (LowShelf @ 80Hz)
        this.bassBoostFilter = this.ctx.createBiquadFilter();
        this.bassBoostFilter.type = 'lowshelf';
        this.bassBoostFilter.frequency.setValueAtTime(80, this.ctx.currentTime);
        this.bassBoostFilter.gain.setValueAtTime(this.currentBassBoost, this.ctx.currentTime);
        preEqSum.connect(this.bassBoostFilter);

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

        this.bassBoostFilter.connect(this.eqFilters[0]);

        let prevNode: AudioNode = this.eqFilters[0];
        for (let i = 1; i < this.eqFilters.length; i++) {
          prevNode.connect(this.eqFilters[i]);
          prevNode = this.eqFilters[i];
        }

        // 2. Analog Tape & Tube Warmth Stage (WaveShaper with Soft Sigmoid Distortion)
        const warmthDry = 1.0 - (this.currentWarmth / 100) * 0.25;
        const warmthWet = (this.currentWarmth / 100) * 0.65;

        this.warmthDryGain = this.ctx.createGain();
        this.warmthDryGain.gain.setValueAtTime(warmthDry, this.ctx.currentTime);

        this.warmthWetGain = this.ctx.createGain();
        this.warmthWetGain.gain.setValueAtTime(warmthWet, this.ctx.currentTime);

        this.warmthShaper = this.ctx.createWaveShaper();
        this.warmthShaper.curve = generateTubeWarmthCurve() as any;
        this.warmthShaper.oversample = '2x';

        prevNode.connect(this.warmthDryGain);
        prevNode.connect(this.warmthShaper);
        this.warmthShaper.connect(this.warmthWetGain);

        this.warmthPostBus = this.ctx.createGain();
        this.warmthDryGain.connect(this.warmthPostBus);
        this.warmthWetGain.connect(this.warmthPostBus);

        // 3. 3D Convolver Reverb Spaces (Acoustic IR generator)
        this.reverbDryGain = this.ctx.createGain();
        this.reverbWetGain = this.ctx.createGain();
        this.convolverNode = this.ctx.createConvolver();

        if (this.currentReverbSpace !== 'off') {
          const ir = generateImpulseResponse(this.ctx, this.currentReverbSpace);
          if (ir) this.convolverNode.buffer = ir;
          this.reverbDryGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
          this.reverbWetGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        } else {
          this.reverbDryGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
          this.reverbWetGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
        }

        this.warmthPostBus.connect(this.reverbDryGain);
        this.warmthPostBus.connect(this.convolverNode);
        this.convolverNode.connect(this.reverbWetGain);

        // 4. Studio Dynamics Compressor & Smart Loudness Normalization (EBU R128)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.normGain = this.ctx.createGain();

        if (this.loudnessNormEnabled) {
          this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(4.5, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.20, this.ctx.currentTime);
          this.normGain.gain.setValueAtTime(1.32, this.ctx.currentTime);
        } else {
          this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(2.0, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.01, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
          this.normGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        }

        this.reverbDryGain.connect(this.compressor);
        this.reverbWetGain.connect(this.compressor);
        this.compressor.connect(this.normGain);

        // 5. Apple Music Style Spatial Audio Expander (Binaural 3D Haas processor)
        const splitter = this.ctx.createChannelSplitter(2);
        const merger = this.ctx.createChannelMerger(2);
        const delayL = this.ctx.createDelay();
        const delayR = this.ctx.createDelay();
        delayL.delayTime.setValueAtTime(0.014, this.ctx.currentTime);
        delayR.delayTime.setValueAtTime(0.014, this.ctx.currentTime);

        this.spatialCrossGain = this.ctx.createGain();
        this.spatialCrossGain.gain.setValueAtTime(this.spatialAudioEnabled ? 0.45 : 0, this.ctx.currentTime);

        this.normGain.connect(merger, 0, 0);
        this.normGain.connect(merger, 1, 1);

        this.normGain.connect(splitter);
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

        // MediaStreamDestination Bridge to prevent background audio throttling on iOS/Android
        if (this.ctx.createMediaStreamDestination && typeof document !== 'undefined') {
          try {
            const streamDest = this.ctx.createMediaStreamDestination();
            this.masterGain.connect(streamDest);
            let bridgeAudio = document.getElementById('aura-background-bridge') as HTMLAudioElement;
            if (!bridgeAudio) {
              bridgeAudio = document.createElement('audio');
              bridgeAudio.id = 'aura-background-bridge';
              bridgeAudio.setAttribute('playsinline', 'true');
              bridgeAudio.setAttribute('webkit-playsinline', 'true');
              bridgeAudio.style.position = 'fixed';
              bridgeAudio.style.left = '-9999px';
              bridgeAudio.style.opacity = '0.001';
              bridgeAudio.style.pointerEvents = 'none';
              document.body.appendChild(bridgeAudio);
            }
            bridgeAudio.srcObject = streamDest.stream;
            bridgeAudio.play().catch(() => {});
          } catch (bridgeErr) {
            console.warn('[DJAudioEngine] MediaStream bridge warning:', bridgeErr);
          }
        }

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

  public ensureChannelsAttached(): void {
    if (typeof document === 'undefined' || !document.body) return;
    [this.channelA, this.channelB].forEach((ch) => {
      if (ch && ch.audio && !document.body.contains(ch.audio)) {
        ch.audio.style.position = 'fixed';
        ch.audio.style.bottom = '0';
        ch.audio.style.left = '0';
        ch.audio.style.width = '1px';
        ch.audio.style.height = '1px';
        ch.audio.style.opacity = '0.001';
        ch.audio.style.pointerEvents = 'none';
        ch.audio.style.zIndex = '-1';
        ch.audio.setAttribute('playsinline', 'true');
        ch.audio.setAttribute('webkit-playsinline', 'true');
        document.body.appendChild(ch.audio);
      }
    });
  }

  /**
   * User Gesture Audio Priming (Dual-Deck Unlocking):
   * Synchronously instantiates and primes BOTH audio instances (deckA and deckB)
   * on the first user interaction (touch/click event).
   * Plays a fraction of silence on both decks simultaneously and pauses/mutes
   * the secondary deck immediately inside the touch handler.
   * This registers BOTH elements with iOS WebKit as "user-activated", permanently
   * permitting programmatic background and lock-screen playback without user gestures.
   */
  public primeDecks(): void {
    try {
      this.ensureChannelsAttached();
      this.initContext().catch(() => {});

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      if (this.isUnlocked) return;

      const SILENT_AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

      // Prime Deck A if not already holding user track
      if (!this.channelA.audio.src) {
        this.channelA.audio.src = SILENT_AUDIO;
        this.channelA.audio.volume = 0;
        this.channelA.audio.play().catch(() => {});
      }

      // Prime Deck B (secondary deck)
      if (!this.channelB.audio.src) {
        this.channelB.audio.src = SILENT_AUDIO;
        this.channelB.audio.volume = 0;
        const playB = this.channelB.audio.play();
        if (playB !== undefined) {
          playB
            .then(() => {
              this.channelB.audio.pause();
              this.channelB.audio.currentTime = 0;
            })
            .catch(() => {});
        } else {
          this.channelB.audio.pause();
          this.channelB.audio.currentTime = 0;
        }
      }

      this.isUnlocked = true;
    } catch (err) {
      console.warn('[DJAudioEngine] Deck priming notice:', err);
    }
  }

  public async unlockEngines(): Promise<void> {
    await this.initContext();
    this.primeDecks();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {}
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

      if (this.channelPreBus) {
        channel.filter.connect(this.channelPreBus);
      } else if (this.bassBoostFilter) {
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

  public async safePlay(audio: HTMLAudioElement): Promise<boolean> {
    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      // If audio is stuck at or near duration end, rewind to 0 before playing
      if (isFinite(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration - 0.2) {
        audio.currentTime = 0;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      return true;
    } catch (error: any) {
      console.warn('[DJAudioEngine] Autoplay blocked or playback aborted:', error);
      if (this.onPlaybackStateChangeCallback) {
        this.onPlaybackStateChangeCallback(false);
      }
      return false;
    }
  }

  public getActiveAudio(): HTMLAudioElement {
    return this.getActive().audio;
  }

  /**
   * Track Swap Lifecycle & Time Reset:
   * Explicitly pauses the channel, resets currentTime = 0, loads new resource,
   * and awaits canplay/loadedmetadata before playback to eliminate iOS stream deadlocks.
   */
  public async loadTrackIntoChannel(channel: Channel, track: Track): Promise<boolean> {
    try {
      channel.audio.pause();
    } catch {}
    channel.audio.currentTime = 0;

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

    if (!src) return false;

    channel.audio.src = src;
    channel.audio.playbackRate = this.playbackRate;
    channel.audio.title = `${track.title} - ${track.artist}`;
    channel.isPreloaded = true;
    channel.audio.currentTime = 0;

    try {
      channel.audio.load();
      channel.audio.currentTime = 0;
    } catch {}

    return new Promise<boolean>((resolve) => {
      if (channel.audio.readyState >= 2) {
        return resolve(true);
      }
      let settled = false;
      const onReady = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(true);
        }
      };
      const onError = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(false);
        }
      };
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(channel.audio.readyState >= 1);
        }
      }, 2500);

      const cleanup = () => {
        clearTimeout(timeout);
        channel.audio.removeEventListener('canplay', onReady);
        channel.audio.removeEventListener('loadedmetadata', onReady);
        channel.audio.removeEventListener('error', onError);
      };

      channel.audio.addEventListener('canplay', onReady, { once: true });
      channel.audio.addEventListener('loadedmetadata', onReady, { once: true });
      channel.audio.addEventListener('error', onError, { once: true });
    });
  }

  private prepareTrackInChannel(channel: Channel, track: Track): void {
    this.loadTrackIntoChannel(channel, track).catch(() => {});
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
      this.loadTrackIntoChannel(inactive, track).catch(() => {});
      inactive.audio.volume = 0;
      if (inactive.gain && this.ctx) {
        inactive.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      }
    } catch (err) {
      console.warn('[DJAudioEngine] Preload notice:', err);
    }
  }

  public async playTrack(track: Track): Promise<boolean> {
    this.cancelActiveTransitions(true);
    await this.unlockEngines();

    this.isCrossfading = false;
    this.autoMixTriggered = false;
    this.preloadTriggered = false;

    const active = this.getActive();
    const inactive = this.getInactive();

    // 50ms micro-fade out on currently active deck if playing to prevent speaker pops
    if (this.ctx && this.isPlaying() && active.gain) {
      try {
        const now = this.ctx.currentTime;
        active.gain.gain.cancelScheduledValues(now);
        active.gain.gain.setValueAtTime(active.gain.gain.value, now);
        active.gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        await new Promise((r) => setTimeout(r, 42));
      } catch {}
    }

    // STRICT AUDIO ISOLATION: Explicitly pause and reset BOTH channels before playing new track
    this.channelA.audio.pause();
    this.channelB.audio.pause();
    this.channelA.audio.currentTime = 0;
    this.channelB.audio.currentTime = 0;
    this.channelA.audio.volume = 0.0;
    this.channelB.audio.volume = 0.0;
    this.channelA.isPreloaded = false;
    this.channelB.isPreloaded = false;

    // Reset progress tracking callback immediately so UI scrubber is at 0:00
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(0, track.duration || 0);
    }

    const loaded = await this.loadTrackIntoChannel(active, track);
    if (!loaded) {
      this.onPlaybackStateChangeCallback?.(false);
      return false;
    }

    // 60ms micro-fade in to eliminate transient pop / audio click
    if (active.gain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        active.gain.gain.cancelScheduledValues(now);
        active.gain.gain.setValueAtTime(0.001, now);
        active.gain.gain.linearRampToValueAtTime(1.0, now + 0.06);
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

    const success = await this.safePlay(active.audio);
    if (success) {
      this.timerWorker?.start(50);
    } else {
      this.onPlaybackStateChangeCallback?.(false);
    }
    return success;
  }

  public async transitionTo(nextTrack: Track, style?: AutoMixStyle): Promise<void> {
    const selectedStyle = style || this.automixStyle;
    if (!this.automixEnabled) {
      await this.playTrack(nextTrack);
      return;
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
   * Hardened against iOS WebKit autoplay policies with pre-flight verification & gapless fallback
   */
  public async crossfadeTo(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      await this.playTrack(nextTrack);
      return;
    }

    const duration = Math.max(2, Math.min(12, this.automixDuration));
    const active = this.getActive();
    const inactive = this.getInactive();

    // Ensure inactive channel has the track ready
    if (!inactive.track || inactive.track.id !== nextTrack.id || !inactive.isPreloaded) {
      await this.loadTrackIntoChannel(inactive, nextTrack);
    }

    inactive.audio.currentTime = 0;
    inactive.audio.playbackRate = this.playbackRate;

    // STEP 1: Mute secondary channel before attempting playback
    inactive.audio.volume = 0.0;
    if (this.ctx && inactive.gain) {
      inactive.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      inactive.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      inactive.gainValue = 0.0;
    }

    // STEP 2: Strict Pre-flight verification for iOS WebKit:
    // Attempt secondary deck playback BEFORE touching or fading the active track!
    const secondaryPlaySuccess = await this.safePlay(inactive.audio);

    // STEP 3: Fallback recovery if iOS rejected secondary deck playback:
    if (!secondaryPlaySuccess) {
      // Abort crossfade attempt immediately
      this.setCrossfadingState(false);
      this.incomingTrackUnderTransition = null;

      // Keep active track playing at 100% volume with ZERO disruption to its natural end
      if (this.ctx && active.gain) {
        active.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        active.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        active.gainValue = 1.0;
      }
      active.audio.volume = 1.0;

      // If active track is already ended or near end (within 0.4s), immediately gapless swap!
      if (active.audio.ended || (isFinite(active.audio.duration) && active.audio.duration > 0 && active.audio.currentTime >= active.audio.duration - 0.4)) {
        console.warn('[DJAudioEngine] Active track already at end during secondary deck block. Instant gapless swap.');
        this.gaplessSwapAndPlay(active, nextTrack);
        return;
      }

      // Register fallback track to swap seamlessly on 'ended' of the primary deck
      this.pendingGaplessFallbackTrack = nextTrack;
      return;
    }

    // STEP 4: Secondary deck confirmed playing: wait until it actively emits audio
    await new Promise<void>((resolve) => {
      if (!inactive.audio.paused && (inactive.audio.currentTime > 0 || inactive.audio.readyState >= 3)) {
        return resolve();
      }
      let resolved = false;
      const onPlaying = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve();
        }
      };
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve();
        }
      }, 350);

      const cleanup = () => {
        clearTimeout(timeout);
        inactive.audio.removeEventListener('playing', onPlaying);
        inactive.audio.removeEventListener('timeupdate', onPlaying);
      };

      inactive.audio.addEventListener('playing', onPlaying, { once: true });
      inactive.audio.addEventListener('timeupdate', onPlaying, { once: true });
    });

    // STEP 5: Both decks are confirmed running: schedule hardware Equal-Power curves
    this.cancelActiveTransitions(false);
    this.setCrossfadingState(true);
    this.currentTransitionDuration = duration;
    this.crossfadeStartTime = performance.now();
    this.midpointFired = false;
    this.incomingTrackUnderTransition = nextTrack;

    const { outgoingCurve, incomingCurve } = generateEqualPowerCurves(64);

    if (this.ctx && active.gain && inactive.gain) {
      const now = this.ctx.currentTime;
      active.gain.gain.cancelScheduledValues(now);
      inactive.gain.gain.cancelScheduledValues(now);

      active.gain.gain.setValueCurveAtTime(outgoingCurve, now, duration);
      inactive.gain.gain.setValueCurveAtTime(incomingCurve, now, duration);

      active.audio.volume = 1.0;
      inactive.audio.volume = 1.0;
    } else {
      this.softwareEqualPowerCrossfade(active, inactive, duration);
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
        if (inactive.audio.currentTime > 0 || !inactive.audio.paused) {
          this.finalizeTransition();
        } else {
          setTimeout(() => this.finalizeTransition(), 200);
        }
      }
    }, intervalTime);
  }

  /**
   * Gapless source swap on active audio element (used as fallback when iOS blocks secondary deck)
   * Guaranteed to work on iOS WebKit without user gesture because the element is already playing.
   */
  public async gaplessSwapAndPlay(channel: Channel, track: Track): Promise<void> {
    this.pendingGaplessFallbackTrack = null;
    this.incomingTrackUnderTransition = null;
    this.setCrossfadingState(false);

    // Reset progress tracking callback immediately so UI scrubber is at 0:00
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(0, track.duration || 0);
    }
    if (this.onMidpointReachedCallback) {
      this.onMidpointReachedCallback(track);
    }

    const loaded = await this.loadTrackIntoChannel(channel, track);
    if (!loaded) {
      this.onPlaybackStateChangeCallback?.(false);
      return;
    }

    channel.audio.playbackRate = this.playbackRate;
    channel.audio.volume = 1.0;
    if (this.ctx && channel.gain) {
      channel.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      channel.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      channel.gainValue = 1.0;
    }

    const success = await this.safePlay(channel.audio);
    if (success) {
      this.timerWorker?.start(50);
      if (this.onTransitionCompleteCallback) {
        this.onTransitionCompleteCallback(track);
      }
    } else {
      this.onPlaybackStateChangeCallback?.(false);
      if (this.onTrackEndedCallback) {
        this.onTrackEndedCallback();
      }
    }
  }

  /**
   * DJ Vinyl Brake Transition
   * Turntable motor deceleration curve on playbackRate + scratch drop + clean punch-in
   */
  public async vinylBrakeTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      await this.playTrack(nextTrack);
      return;
    }

    const active = this.getActive();
    const inactive = this.getInactive();

    await this.loadTrackIntoChannel(inactive, nextTrack);
    inactive.audio.currentTime = 0;
    inactive.audio.volume = 0.0;
    if (this.ctx && inactive.gain) {
      inactive.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      inactive.gainValue = 0.0;
    }

    const secondaryPlaySuccess = await this.safePlay(inactive.audio);

    if (!secondaryPlaySuccess) {
      this.setCrossfadingState(false);
      this.incomingTrackUnderTransition = null;
      if (this.ctx && active.gain) {
        active.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }
      active.audio.volume = 1.0;
      if (active.audio.ended || (isFinite(active.audio.duration) && active.audio.duration > 0 && active.audio.currentTime >= active.audio.duration - 0.4)) {
        this.gaplessSwapAndPlay(active, nextTrack);
        return;
      }
      this.pendingGaplessFallbackTrack = nextTrack;
      return;
    }

    this.cancelActiveTransitions(false);
    this.setCrossfadingState(true);

    const duration = 1.3;
    this.currentTransitionDuration = duration;
    this.crossfadeStartTime = performance.now();
    this.midpointFired = false;
    this.incomingTrackUnderTransition = nextTrack;
    const initialRate = this.playbackRate;

    this.playDJSound('scratch');

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

        if (this.ctx && inactive.gain && active.gain) {
          inactive.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
          active.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
        }
        inactive.audio.volume = 1.0;
        active.audio.volume = 0.0;
        this.finalizeTransition();
      }
    }, stepDuration);
  }

  /**
   * DJ Echo Out & Reverb Tail Transition
   */
  public async echoOutTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      await this.playTrack(nextTrack);
      return;
    }

    const active = this.getActive();
    const inactive = this.getInactive();

    await this.loadTrackIntoChannel(inactive, nextTrack);
    inactive.audio.currentTime = 0;
    inactive.audio.volume = 0.0;
    if (this.ctx && inactive.gain) {
      inactive.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      inactive.gainValue = 0.0;
    }

    const secondaryPlaySuccess = await this.safePlay(inactive.audio);

    if (!secondaryPlaySuccess) {
      this.setCrossfadingState(false);
      this.incomingTrackUnderTransition = null;
      if (this.ctx && active.gain) {
        active.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }
      active.audio.volume = 1.0;
      if (active.audio.ended || (isFinite(active.audio.duration) && active.audio.duration > 0 && active.audio.currentTime >= active.audio.duration - 0.4)) {
        this.gaplessSwapAndPlay(active, nextTrack);
        return;
      }
      this.pendingGaplessFallbackTrack = nextTrack;
      return;
    }

    this.cancelActiveTransitions(false);
    this.setCrossfadingState(true);

    const duration = 1.4;
    this.currentTransitionDuration = duration;
    this.crossfadeStartTime = performance.now();
    this.midpointFired = false;
    this.incomingTrackUnderTransition = nextTrack;

    this.playDJSound('echo_drop');

    if (this.ctx && active.gain && inactive.gain) {
      const now = this.ctx.currentTime;
      active.gain.gain.setValueAtTime(1.0, now);
      active.gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      inactive.gain.gain.setValueAtTime(0.0, now);
      inactive.gain.gain.linearRampToValueAtTime(1.0, now + 0.9);

      active.audio.volume = 1.0;
      inactive.audio.volume = 1.0;
    } else {
      this.softwareEqualPowerCrossfade(active, inactive, duration);
    }
  }

  /**
   * DJ Filter Sweep Transition (Resonant Cut & Punch)
   */
  public async filterSweepTransition(nextTrack: Track): Promise<void> {
    if (this.isCrossfading) {
      await this.playTrack(nextTrack);
      return;
    }

    const active = this.getActive();
    const inactive = this.getInactive();

    await this.loadTrackIntoChannel(inactive, nextTrack);
    inactive.audio.currentTime = 0;
    inactive.audio.volume = 0.0;
    if (this.ctx && inactive.gain) {
      inactive.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      inactive.gainValue = 0.0;
    }

    const secondaryPlaySuccess = await this.safePlay(inactive.audio);

    if (!secondaryPlaySuccess) {
      this.setCrossfadingState(false);
      this.incomingTrackUnderTransition = null;
      if (this.ctx && active.gain) {
        active.gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }
      active.audio.volume = 1.0;
      if (active.audio.ended || (isFinite(active.audio.duration) && active.audio.duration > 0 && active.audio.currentTime >= active.audio.duration - 0.4)) {
        this.gaplessSwapAndPlay(active, nextTrack);
        return;
      }
      this.pendingGaplessFallbackTrack = nextTrack;
      return;
    }

    this.cancelActiveTransitions(false);
    this.setCrossfadingState(true);

    const duration = 1.6;
    this.currentTransitionDuration = duration;
    this.crossfadeStartTime = performance.now();
    this.midpointFired = false;
    this.incomingTrackUnderTransition = nextTrack;

    if (this.ctx && active.filter && inactive.filter && active.gain && inactive.gain) {
      const now = this.ctx.currentTime;
      active.filter.frequency.cancelScheduledValues(now);
      active.filter.frequency.setValueAtTime(20000, now);
      active.filter.frequency.exponentialRampToValueAtTime(250, now + 1.1);

      active.gain.gain.cancelScheduledValues(now);
      active.gain.gain.setValueAtTime(1.0, now);
      active.gain.gain.linearRampToValueAtTime(0.1, now + 1.1);

      inactive.filter.frequency.cancelScheduledValues(now);
      inactive.filter.frequency.setValueAtTime(300, now + 0.5);
      inactive.filter.frequency.exponentialRampToValueAtTime(20000, now + 1.5);

      inactive.gain.gain.cancelScheduledValues(now);
      inactive.gain.gain.setValueAtTime(0.0, now);
      inactive.gain.gain.linearRampToValueAtTime(1.0, now + 1.5);

      active.audio.volume = 1.0;
      inactive.audio.volume = 1.0;
    } else {
      this.softwareEqualPowerCrossfade(active, inactive, duration);
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
    this.pendingGaplessFallbackTrack = null;
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

  public async play(): Promise<boolean> {
    await this.unlockEngines();
    const active = this.getActive();
    const inactive = this.getInactive();

    if (active.audio.src) {
      if (isFinite(active.audio.duration) && active.audio.duration > 0 && active.audio.currentTime >= active.audio.duration - 0.2) {
        active.audio.currentTime = 0;
      }
      const success = await this.safePlay(active.audio);
      if (success) {
        if (this.isCrossfading && inactive.audio.src) {
          await this.safePlay(inactive.audio).catch(() => {});
        }
        if (this.onPlaybackStateChangeCallback) {
          this.onPlaybackStateChangeCallback(true);
        }
        this.timerWorker?.start(50);
        return true;
      } else {
        if (this.onPlaybackStateChangeCallback) {
          this.onPlaybackStateChangeCallback(false);
        }
        return false;
      }
    }
    return false;
  }

  public pause(): void {
    // Micro-fade before pause to eliminate abrupt clicks
    if (this.ctx && this.masterGain) {
      try {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.025);
      } catch {}
    }
    setTimeout(() => {
      this.channelA.audio.pause();
      this.channelB.audio.pause();
      if (this.ctx && this.masterGain) {
        try {
          this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        } catch {}
      }
    }, 25);
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
    this.lastUiTimeUpdate = 0;
    if (this.isCrossfading) {
      this.cancelActiveTransitions(true);
    }
    const active = this.getActive();
    if (isFinite(time)) {
      const dur = isFinite(active.audio.duration) ? active.audio.duration : 0;
      const targetTime = dur > 0 ? Math.max(0, Math.min(time, dur)) : Math.max(0, time);

      // Micro-ramp volume to eliminate pops during seeks
      if (this.ctx && active.gain) {
        try {
          const now = this.ctx.currentTime;
          active.gain.gain.cancelScheduledValues(now);
          active.gain.gain.setValueAtTime(active.gain.gain.value, now);
          active.gain.gain.linearRampToValueAtTime(0.001, now + 0.015);
          setTimeout(() => {
            active.audio.currentTime = targetTime;
            if (this.ctx && active.gain) {
              const rNow = this.ctx.currentTime;
              active.gain.gain.setValueAtTime(0.001, rNow);
              active.gain.gain.linearRampToValueAtTime(1.0, rNow + 0.035);
            }
          }, 18);
        } catch {
          active.audio.currentTime = targetTime;
        }
      } else {
        active.audio.currentTime = targetTime;
      }

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
    if (!this.masterGain || !this.ctx) {
      this.initContext().catch(() => {});
    }
    if (!this.ctx || this.eqFilters.length === 0) return;
    this.eqFilters.forEach((filter, idx) => {
      const rawVal = gains[idx];
      const val = Math.max(-15, Math.min(15, isNaN(rawVal) ? 0 : rawVal));
      try {
        filter.gain.cancelScheduledValues(this.ctx!.currentTime);
        filter.gain.setValueAtTime(filter.gain.value, this.ctx!.currentTime);
        filter.gain.setTargetAtTime(val, this.ctx!.currentTime, 0.04);
      } catch {
        filter.gain.setValueAtTime(val, this.ctx!.currentTime);
      }
    });
  }

  public setBassBoost(gain: number): void {
    const rawVal = isNaN(gain) ? 0 : gain;
    this.currentBassBoost = Math.max(0, Math.min(18, rawVal));
    if (!this.masterGain || !this.ctx) {
      this.initContext().catch(() => {});
    }
    if (!this.ctx || !this.bassBoostFilter) return;
    try {
      this.bassBoostFilter.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bassBoostFilter.gain.setValueAtTime(this.bassBoostFilter.gain.value, this.ctx.currentTime);
      this.bassBoostFilter.gain.setTargetAtTime(this.currentBassBoost, this.ctx.currentTime, 0.04);
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

  // --- Pro Web Audio & DSP Control Methods ---

  public setAnalogWarmth(level: number): void {
    this.currentWarmth = Math.max(0, Math.min(100, isNaN(level) ? 0 : level));
    if (!this.masterGain || !this.ctx) {
      this.initContext().catch(() => {});
    }
    if (!this.ctx || !this.warmthDryGain || !this.warmthWetGain) return;
    const wet = (this.currentWarmth / 100) * 0.65;
    const dry = 1.0 - (this.currentWarmth / 100) * 0.25;
    try {
      this.warmthDryGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.warmthWetGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.warmthDryGain.gain.setValueAtTime(this.warmthDryGain.gain.value, this.ctx.currentTime);
      this.warmthWetGain.gain.setValueAtTime(this.warmthWetGain.gain.value, this.ctx.currentTime);
      this.warmthDryGain.gain.setTargetAtTime(dry, this.ctx.currentTime, 0.04);
      this.warmthWetGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.04);
    } catch {
      this.warmthDryGain.gain.setValueAtTime(dry, this.ctx.currentTime);
      this.warmthWetGain.gain.setValueAtTime(wet, this.ctx.currentTime);
    }
  }

  public getAnalogWarmth(): number {
    return this.currentWarmth;
  }

  public setKaraokeMode(enabled: boolean): void {
    this.karaokeEnabled = enabled;
    if (!this.masterGain || !this.ctx) {
      this.initContext().catch(() => {});
    }
    if (!this.ctx || !this.karaokeDryGain || !this.karaokeWetGain) return;
    const dry = enabled ? 0.0 : 1.0;
    const wet = enabled ? 1.0 : 0.0;
    try {
      this.karaokeDryGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.karaokeWetGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.karaokeDryGain.gain.setValueAtTime(this.karaokeDryGain.gain.value, this.ctx.currentTime);
      this.karaokeWetGain.gain.setValueAtTime(this.karaokeWetGain.gain.value, this.ctx.currentTime);
      this.karaokeDryGain.gain.setTargetAtTime(dry, this.ctx.currentTime, 0.05);
      this.karaokeWetGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.05);
    } catch {
      this.karaokeDryGain.gain.setValueAtTime(dry, this.ctx.currentTime);
      this.karaokeWetGain.gain.setValueAtTime(wet, this.ctx.currentTime);
    }
  }

  public isKaraokeModeEnabled(): boolean {
    return this.karaokeEnabled;
  }

  public setReverbSpace(space: ReverbSpace): void {
    this.currentReverbSpace = space;
    if (!this.masterGain || !this.ctx) {
      this.initContext().catch(() => {});
    }
    if (!this.ctx || !this.convolverNode || !this.reverbDryGain || !this.reverbWetGain) return;

    if (space === 'off') {
      try {
        this.reverbDryGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.reverbWetGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.reverbDryGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.04);
        this.reverbWetGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.04);
      } catch {
        this.reverbDryGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.reverbWetGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      }
      return;
    }

    try {
      const irBuffer = generateImpulseResponse(this.ctx, space);
      if (irBuffer) {
        this.convolverNode.buffer = irBuffer;
      }
      let wet = 0.25;
      let dry = 0.92;
      if (space === 'studio') {
        wet = 0.20;
        dry = 0.95;
      } else if (space === 'arena') {
        wet = 0.38;
        dry = 0.82;
      } else if (space === 'car') {
        wet = 0.16;
        dry = 0.98;
      } else if (space === 'vinyl_lounge') {
        wet = 0.28;
        dry = 0.90;
      }

      this.reverbDryGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.reverbWetGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.reverbDryGain.gain.setTargetAtTime(dry, this.ctx.currentTime, 0.05);
      this.reverbWetGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.05);
    } catch (e) {
      console.warn('[DJAudioEngine] Reverb space switch error:', e);
    }
  }

  public getReverbSpace(): ReverbSpace {
    return this.currentReverbSpace;
  }

  public setLoudnessNormalization(enabled: boolean): void {
    this.loudnessNormEnabled = enabled;
    if (!this.masterGain || !this.ctx) {
      this.initContext().catch(() => {});
    }
    if (!this.ctx || !this.compressor || !this.normGain) return;
    try {
      const time = this.ctx.currentTime;
      if (enabled) {
        this.compressor.threshold.setTargetAtTime(-18, time, 0.05);
        this.compressor.knee.setTargetAtTime(24, time, 0.05);
        this.compressor.ratio.setTargetAtTime(4.5, time, 0.05);
        this.compressor.attack.setTargetAtTime(0.005, time, 0.05);
        this.compressor.release.setTargetAtTime(0.20, time, 0.05);
        this.normGain.gain.setTargetAtTime(1.32, time, 0.05);
      } else {
        this.compressor.threshold.setTargetAtTime(-6, time, 0.05);
        this.compressor.knee.setTargetAtTime(30, time, 0.05);
        this.compressor.ratio.setTargetAtTime(2.0, time, 0.05);
        this.compressor.attack.setTargetAtTime(0.01, time, 0.05);
        this.compressor.release.setTargetAtTime(0.25, time, 0.05);
        this.normGain.gain.setTargetAtTime(1.0, time, 0.05);
      }
    } catch {
      if (enabled) {
        this.normGain.gain.setValueAtTime(1.32, this.ctx.currentTime);
      } else {
        this.normGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }
    }
  }

  public isLoudnessNormalizationEnabled(): boolean {
    return this.loudnessNormEnabled;
  }

  public setHapticFeedback(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  public isHapticFeedbackEnabled(): boolean {
    return this.hapticsEnabled;
  }

  private checkBassHaptics(): void {
    if (!this.analyser || !this.hapticsEnabled) return;
    this.analyser.getByteFrequencyData(this.bassFreqData as any);
    const subBass = this.bassFreqData[0];
    const kickPunch = (this.bassFreqData[0] + this.bassFreqData[1]) * 0.5;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if ((subBass > 215 || kickPunch > 200) && now - this.lastHapticTime > 190) {
      this.lastHapticTime = now;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(15);
        } catch {}
      }
    }
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

  public syncPlaybackState(): {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    currentTrack: Track | null;
  } {
    const active = this.getActive();
    const cur = active.audio.currentTime || 0;
    const dur = active.audio.duration || 0;
    return {
      currentTime: isFinite(cur) ? cur : 0,
      duration: isFinite(dur) ? dur : 0,
      isPlaying: this.isPlaying(),
      currentTrack: active.track,
    };
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
if (typeof window !== 'undefined') {
  (window as any).djAudioEngine = djAudioEngine;
}
