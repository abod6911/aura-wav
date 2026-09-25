import { Track } from '../../types';
import { DeckChannel } from './DeckChannel';
import { AutoMixController } from './dsp/AutoMixController';
import { EffectsChain } from './dsp/EffectsChain';
import { HapticsEngine } from './dsp/HapticsEngine';
import { LoudnessNormalizer } from './dsp/LoudnessNormalizer';
import { createAudioTimerWorker, AudioTimerController } from './workers/audioTimer.worker';
import { AutoMixStyle, DeckChannelName, ReverbSpace, EQ_BANDS } from './types';
import { getAudioFileFromStorage } from '../../services/storageManager';
import { resolvePlayableStream } from '../../services/streamingEngine';

export interface DJEngineCallbacks {
  onTrackEnded?: () => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPreloadNeeded?: (track: Track) => void;
  onAutoMixNeeded?: (style: AutoMixStyle, duration: number) => void;
  onMidpointReached?: (track: Track) => void;
  onTransitionComplete?: (track: Track) => void;
  onAutoMixStateChange?: (isMixing: boolean, style: AutoMixStyle) => void;
}

export class DJAudioEngineFacade {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Deck Channels
  public channelA: DeckChannel;
  public channelB: DeckChannel;
  private activeChannelName: DeckChannelName = 'A';

  // Subsystems
  private autoMix: AutoMixController;
  private effects: EffectsChain;
  private haptics: HapticsEngine;
  private normalizer: LoudnessNormalizer;
  private timerWorker: AudioTimerController;

  // AutoMix & Transition Configuration
  private automixEnabled = true;
  private automixDuration = 6.0;
  private automixStyle: AutoMixStyle = 'crossfade';
  private isAutoMixing = false;
  private autoMixTriggered = false;
  private preloadTriggered = false;
  private isUnlocked = false;
  private isSwitchingTrack = false;

  // Master Volume & Fade
  private masterVolume = 1.0;

  // Callbacks
  private callbacks: DJEngineCallbacks = {};

  // Timing throttle
  private lastTimeUpdate = 0;

  constructor() {
    this.channelA = new DeckChannel('A');
    this.channelB = new DeckChannel('B');
    this.autoMix = new AutoMixController();
    this.effects = new EffectsChain();
    this.haptics = new HapticsEngine();
    this.normalizer = new LoudnessNormalizer();
    this.timerWorker = createAudioTimerWorker(20);

    this.setupAudioListeners(this.channelA);
    this.setupAudioListeners(this.channelB);
    this.setupTimerLoop();
    this.setupVisibilityAndResumeHandlers();
  }

  // --- AudioContext Initialization & Priming ---

  public async initContext(): Promise<AudioContext | null> {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx({ latencyHint: 'interactive' });
        }
      } catch (err) {
        console.warn('[DJAudioEngine] AudioContext creation error:', err);
      }
    }

    if (this.ctx && !this.masterGain) {
      try {
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

        // Initialize EffectsChain
        const chainNodes = this.effects.init(this.ctx, this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Bind Deck Channels into EffectsChain input bus
        this.channelA.bindAudioGraph(this.ctx, chainNodes.input);
        this.channelB.bindAudioGraph(this.ctx, chainNodes.input);

        // MediaStream Bridge for mobile background continuity
        this.setupBackgroundMediaStreamBridge();
      } catch (err) {
        console.warn('[DJAudioEngine] DSP initialization notice:', err);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {}
    }

    if (this.ctx) {
      this.ctx.onstatechange = () => {
        if (this.ctx?.state === 'suspended' && this.isPlaying()) {
          this.ctx.resume().catch(() => {});
        }
      };
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
   * User Gesture Audio Priming: Unlocks both deck channels in iOS WebKit
   */
  public primeDecks(): void {
    try {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
        try {
          (navigator as unknown as { audioSession: { type: string } }).audioSession.type = 'playback';
        } catch {}
      }

      this.ensureChannelsAttached();
      this.initContext().catch(() => {});

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      if (typeof document !== 'undefined') {
        const bridge = document.getElementById('aura-background-bridge') as HTMLAudioElement;
        if (bridge && bridge.paused) {
          bridge.play().catch(() => {});
        }
      }

      if (this.isUnlocked) return;

      const SILENT_AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      if (!this.channelA.audio.src) {
        this.channelA.audio.src = SILENT_AUDIO;
        this.channelA.audio.volume = 0;
        this.channelA.audio.play().catch(() => {});
      }
      if (!this.channelB.audio.src) {
        this.channelB.audio.src = SILENT_AUDIO;
        this.channelB.audio.volume = 0;
        this.channelB.audio.play().catch(() => {});
      }

      this.isUnlocked = true;
    } catch {}
  }

  // --- Playback Controls ---

  public async playTrack(track: Track): Promise<boolean> {
    this.isSwitchingTrack = true;
    await this.initContext();
    this.primeDecks();

    this.autoMix.cancelTransition(this.channelA, this.channelB);
    this.isAutoMixing = false;
    this.autoMixTriggered = false;
    this.preloadTriggered = false;

    const active = this.getActiveDeck();
    const inactive = this.getInactiveDeck();

    // Check if track is already preloaded and ready in inactive deck
    if (inactive.track?.id === track.id && inactive.audio.src) {
      active.stop();
      active.setVolume(0);

      this.swapActiveDecks();
      const newActive = this.getActiveDeck();
      newActive.setVolume(1.0);
      newActive.setPreampGain(this.normalizer.computeLinearGain(track));
      try {
        await newActive.play();
        this.notifyPlaybackState(true);
        this.timerWorker.start(20);
        this.isSwitchingTrack = false;
        return true;
      } catch (err) {
        console.warn('[DJAudioEngine] Hot-swap play error, falling back:', err);
      }
    }

    // Direct playback path on current active deck
    inactive.stop();
    inactive.setVolume(0);

    const targetGain = this.normalizer.computeLinearGain(track);
    active.setPreampGain(targetGain);

    try {
      const audioUrl = await this.resolveTrackUrl(track);
      active.loadTrackUrl(track, audioUrl, audioUrl.startsWith('blob:'));
      active.setVolume(1.0);

      await active.play();
      this.notifyPlaybackState(true);
      this.timerWorker.start(20);
      this.isSwitchingTrack = false;
      return true;
    } catch (err) {
      console.warn('[DJAudioEngine] Playback error:', err);
      this.notifyPlaybackState(false);
      this.isSwitchingTrack = false;
      return false;
    }
  }

  public async play(): Promise<boolean> {
    await this.initContext();
    this.primeDecks();
    const active = this.getActiveDeck();
    try {
      await active.play();
      this.notifyPlaybackState(true);
      this.timerWorker.start(20);
      return true;
    } catch (err) {
      console.warn('[DJAudioEngine] Resume error:', err);
      this.notifyPlaybackState(false);
      return false;
    }
  }

  public pause(): void {
    this.getActiveDeck().pause();
    this.getInactiveDeck().pause();
    if (typeof document !== 'undefined') {
      const bridge = document.getElementById('aura-background-bridge') as HTMLAudioElement;
      if (bridge && !bridge.paused) {
        bridge.pause();
      }
    }
    this.notifyPlaybackState(false);
  }

  public stop(): void {
    this.autoMix.cancelTransition(this.channelA, this.channelB);
    this.channelA.stop();
    this.channelB.stop();
    this.timerWorker.stop();
    if (typeof document !== 'undefined') {
      const bridge = document.getElementById('aura-background-bridge') as HTMLAudioElement;
      if (bridge && !bridge.paused) {
        bridge.pause();
      }
    }
    this.notifyPlaybackState(false);
  }

  public seek(seconds: number): void {
    this.getActiveDeck().seek(seconds);
  }

  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    } else {
      this.getActiveDeck().audio.volume = this.masterVolume;
    }
  }

  public fadeVolume(targetVol: number, durationSec: number): void {
    const clamped = Math.max(0.0001, Math.min(1, targetVol));
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(clamped, now + durationSec);
    }
  }

  public setPlaybackRate(rate: number): void {
    this.getActiveDeck().setPlaybackRate(rate);
  }

  // --- AutoMix & Preloading ---

  public setAutoMix(enabled: boolean, durationSec = 6.0): void {
    this.automixEnabled = enabled;
    this.automixDuration = durationSec;
  }

  public setAutoMixStyle(style: AutoMixStyle): void {
    this.automixStyle = style;
  }

  public cancelActiveTransitions(immediateCut = true): void {
    this.autoMix.cancelTransition(this.channelA, this.channelB);
    this.isAutoMixing = false;
    this.autoMixTriggered = false;
    this.preloadTriggered = false;

    if (immediateCut) {
      const active = this.getActiveDeck();
      const inactive = this.getInactiveDeck();
      active.setVolume(1.0);
      inactive.stop();
      inactive.setVolume(0);
    }

    if (this.callbacks.onAutoMixStateChange) {
      this.callbacks.onAutoMixStateChange(false, this.automixStyle);
    }
  }

  public async transitionTo(targetTrack: Track, style: AutoMixStyle = this.automixStyle, durationSec = this.automixDuration): Promise<void> {
    await this.initContext();
    if (!this.ctx) {
      await this.playTrack(targetTrack);
      return;
    }

    const outgoing = this.getActiveDeck();
    const incoming = this.getInactiveDeck();

    try {
      // Prepare incoming deck
      const targetGain = this.normalizer.computeLinearGain(targetTrack);
      incoming.setPreampGain(targetGain);

      if (!incoming.track || incoming.track.id !== targetTrack.id) {
        const audioUrl = await this.resolveTrackUrl(targetTrack);
        incoming.loadTrackUrl(targetTrack, audioUrl, audioUrl.startsWith('blob:'));
      }

      this.isAutoMixing = true;
      if (this.callbacks.onAutoMixStateChange) {
        this.callbacks.onAutoMixStateChange(true, style);
      }

      await this.autoMix.executeTransition(
        outgoing,
        incoming,
        style,
        durationSec,
        this.ctx,
        (progress) => {
          if (progress >= 0.5 && this.callbacks.onMidpointReached && incoming.track) {
            this.callbacks.onMidpointReached(incoming.track);
          }
        }
      );

      // Swap active pointer to incoming deck
      this.swapActiveDecks();
      this.isAutoMixing = false;
      this.autoMixTriggered = false;
      this.preloadTriggered = false;

      if (this.callbacks.onTransitionComplete && incoming.track) {
        this.callbacks.onTransitionComplete(incoming.track);
      }
      if (this.callbacks.onAutoMixStateChange) {
        this.callbacks.onAutoMixStateChange(false, style);
      }
    } catch (err) {
      console.warn('[DJAudioEngine] Transition error, performing clean cut:', err);
      this.cancelActiveTransitions(true);
      await this.playTrack(targetTrack);
    }
  }

  /**
   * Preload Next Track (Zero-Latency Dual-Deck Buffer Preloading)
   */
  public async preloadNextTrack(track: Track): Promise<void> {
    if (!track) return;
    const idleDeck = this.getInactiveDeck();

    // Skip if already preloaded
    if (idleDeck.track?.id === track.id && idleDeck.audio.src) {
      return;
    }

    try {
      const blob = await getAudioFileFromStorage(track.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        idleDeck.loadTrackUrl(track, url, true);
        idleDeck.setVolume(0);
      } else {
        const url = await this.resolveTrackUrl(track);
        if (url) {
          idleDeck.loadTrackUrl(track, url, url.startsWith('blob:'));
          idleDeck.setVolume(0);
        }
      }
    } catch (err) {
      console.warn('[DJAudioEngine] Preload notice:', err);
    }
  }

  // --- DSP & Effects Controls ---

  public setEqGains(gains: [number, number, number, number, number]): void {
    this.effects.setEqGains(gains);
  }

  public setBassBoost(dbGain: number): void {
    this.effects.setBassBoost(dbGain);
  }

  public setAnalogWarmth(percent: number): void {
    this.effects.setAnalogWarmth(percent);
  }

  public setKaraokeMode(enabled: boolean): void {
    this.effects.setKaraokeMode(enabled);
  }

  public setSpatialAudio(enabled: boolean): void {
    this.effects.setSpatialAudio(enabled);
  }

  public setReverbSpace(space: ReverbSpace): void {
    this.effects.setReverbSpace(space);
  }

  public setLoudnessNormalization(enabled: boolean): void {
    this.normalizer.setEnabled(enabled);
    const active = this.getActiveDeck();
    if (active.track) {
      active.setPreampGain(this.normalizer.computeLinearGain(active.track));
    }
  }

  public setHapticFeedback(enabled: boolean): void {
    this.haptics.setEnabled(enabled);
  }

  public triggerHaptic(durationMs = 15): void {
    this.haptics.triggerManualTap(durationMs);
  }

  public getVisualizerData(dataArray: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray as any);
    } else {
      dataArray.fill(0);
    }
  }

  // --- Soundboard Effects ---

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
        const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(1.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(now);
        break;
      }
    }
  }

  // --- Getters & Queries ---

  public getActiveDeck(): DeckChannel {
    return this.activeChannelName === 'A' ? this.channelA : this.channelB;
  }

  public getInactiveDeck(): DeckChannel {
    return this.activeChannelName === 'A' ? this.channelB : this.channelA;
  }

  public getActiveChannelName(): DeckChannelName {
    return this.activeChannelName;
  }

  public getActiveAudio(): HTMLAudioElement {
    return this.getActiveDeck().audio;
  }

  public getActiveTrack(): Track | null {
    return this.getActiveDeck().track;
  }

  public getCurrentTime(): number {
    return this.getActiveDeck().getCurrentTime();
  }

  public getDuration(): number {
    return this.getActiveDeck().getDuration();
  }

  public isPlaying(): boolean {
    return this.getActiveDeck().isPlaying();
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public syncPlaybackState(): { isPlaying: boolean; currentTime: number; duration: number } {
    const active = this.getActiveDeck();
    return {
      isPlaying: active.isPlaying(),
      currentTime: active.getCurrentTime(),
      duration: active.getDuration(),
    };
  }

  public setCallbacks(callbacks: DJEngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // --- Internal Helpers ---

  private swapActiveDecks(): void {
    this.activeChannelName = this.activeChannelName === 'A' ? 'B' : 'A';
  }

  private syncBridgePlayback(isPlaying: boolean): void {
    if (typeof document === 'undefined') return;
    try {
      const bridge = document.getElementById('aura-background-bridge') as HTMLAudioElement;
      if (!bridge) return;
      if (isPlaying) {
        if (bridge.paused) {
          bridge.play().catch(() => {});
        }
      } else {
        if (!bridge.paused) {
          bridge.pause();
        }
      }
    } catch {}
  }

  private notifyPlaybackState(isPlaying: boolean): void {
    this.syncBridgePlayback(isPlaying);
    if (this.callbacks.onPlaybackStateChange) {
      try {
        this.callbacks.onPlaybackStateChange(isPlaying);
      } catch {}
    }
  }

  private setupAudioListeners(channel: DeckChannel): void {
    channel.audio.addEventListener('ended', () => {
      if (this.activeChannelName === channel.name && !this.isAutoMixing) {
        if (this.callbacks.onTrackEnded) {
          this.callbacks.onTrackEnded();
        }
      }
    });

    channel.audio.addEventListener('play', () => {
      if (this.activeChannelName === channel.name) {
        this.notifyPlaybackState(true);
      }
    });

    channel.audio.addEventListener('pause', () => {
      if (this.activeChannelName === channel.name && !this.isAutoMixing && !this.isSwitchingTrack) {
        this.notifyPlaybackState(false);
      }
    });
  }

  private setupTimerLoop(): void {
    this.timerWorker.onTick(() => {
      const active = this.getActiveDeck();
      const cur = active.getCurrentTime();
      const dur = active.getDuration();

      if (!isFinite(cur) || !isFinite(dur) || dur <= 0) return;

      const now = performance.now();
      if (now - this.lastTimeUpdate >= 100) {
        this.lastTimeUpdate = now;
        if (this.callbacks.onTimeUpdate) {
          this.callbacks.onTimeUpdate(cur, dur);
        }
      }

      // Check Preload Threshold: 15s remaining (only when playback is well underway)
      const remaining = dur - cur;
      if (cur >= 3.0 && remaining <= 15 && !this.preloadTriggered && active.track) {
        this.preloadTriggered = true;
        if (this.callbacks.onPreloadNeeded) {
          this.callbacks.onPreloadNeeded(active.track);
        }
      }

      // Check AutoMix Threshold (Guard against false-positives at track start)
      if (
        this.automixEnabled &&
        !this.isAutoMixing &&
        !this.autoMixTriggered &&
        cur >= 3.0 &&
        dur > this.automixDuration + 2.0 &&
        remaining <= this.automixDuration &&
        remaining > 0.5
      ) {
        this.autoMixTriggered = true;
        if (this.callbacks.onAutoMixNeeded) {
          this.callbacks.onAutoMixNeeded(this.automixStyle, this.automixDuration);
        }
      }

      // Haptics loop
      if (this.analyser && this.ctx && this.isPlaying()) {
        this.haptics.processFrame(this.analyser, this.ctx.sampleRate);
      }
    });
  }

  private setupVisibilityAndResumeHandlers(): void {
    if (typeof window === 'undefined') return;

    const handleResume = () => {
      if (this.ctx && this.ctx.state === 'suspended' && this.isPlaying()) {
        this.ctx.resume().catch(() => {});
      }
    };

    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        handleResume();
      });
    }
  }

  private setupBackgroundMediaStreamBridge(): void {
    if (!this.ctx || !this.ctx.createMediaStreamDestination || typeof document === 'undefined') return;
    try {
      const streamDest = this.ctx.createMediaStreamDestination();
      if (this.masterGain) {
        this.masterGain.connect(streamDest);
      }
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
      bridgeAudio.volume = 0.001;
      bridgeAudio.srcObject = streamDest.stream;
      bridgeAudio.play().catch(() => {});
    } catch {}
  }

  private async resolveTrackUrl(track: Track): Promise<string> {
    if (track.blob) return URL.createObjectURL(track.blob);
    const storedBlob = await getAudioFileFromStorage(track.id);
    if (storedBlob) {
      return URL.createObjectURL(storedBlob);
    }
    const stream = await resolvePlayableStream(track);
    if (stream) return stream;
    if (track.audioUrl) return track.audioUrl;
    return '';
  }
}
