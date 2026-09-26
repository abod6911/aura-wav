import { DeckChannel } from './core/DeckChannel';
import { EffectsChain } from './dsp/EffectsChain';
import { AutoMixController } from './dsp/AutoMixController';
import { HapticsEngine } from './dsp/HapticsEngine';
import { TrackMetadata, EQBands, ReverbPreset, AutoMixMode } from './types';

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private ctx!: AudioContext;

  private deckA!: DeckChannel;
  private deckB!: DeckChannel;
  private activeDeckId: 'deckA' | 'deckB' = 'deckA';

  private masterBus!: GainNode;
  private effectsChain!: EffectsChain;
  private autoMixController!: AutoMixController;
  private hapticsEngine!: HapticsEngine;

  private timerWorker: Worker | null = null;
  private currentTrack: TrackMetadata | null = null;
  private upcomingTrack: TrackMetadata | null = null;
  private hasPreloadedNext: boolean = false;

  private onPositionUpdateCallback?: (current: number, duration: number) => void;
  private onTrackEndedCallback?: () => void;

  private constructor() {
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'playback' });

    this.masterBus = this.ctx.createGain();
    this.effectsChain = new EffectsChain(this.ctx);
    this.autoMixController = new AutoMixController(this.ctx);

    // Deck Channels Connect into Effects Chain Input
    this.deckA = new DeckChannel('deckA', this.ctx, this.effectsChain.inputNode);
    this.deckB = new DeckChannel('deckB', this.ctx, this.effectsChain.inputNode);

    // Effects Chain Connects to Master Bus -> Destination
    this.effectsChain.outputNode.connect(this.masterBus);
    this.masterBus.connect(this.ctx.destination);

    // Initialize Haptics Engine on Master Output
    this.hapticsEngine = new HapticsEngine(this.ctx, this.masterBus);

    this.setupContextResilience();
    this.initTimerWorker();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private setupContextResilience(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        (navigator as unknown as { audioSession: { type: string } }).audioSession.type = 'playback';
      } catch {}
    }

    const resumeContext = async () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        try {
          await this.ctx.resume();
        } catch {}
      }
      const bridge = document.getElementById('aura-core-background-bridge') as HTMLAudioElement;
      if (bridge && bridge.paused && this.isPlaying()) {
        bridge.play().catch(() => {});
      }
    };

    window.addEventListener('click', resumeContext, { once: true });
    window.addEventListener('touchstart', resumeContext, { once: true });
    window.addEventListener('focus', resumeContext);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) resumeContext();
    });
    window.addEventListener('pageshow', resumeContext);
  }

  private initTimerWorker(): void {
    if (typeof Worker === 'undefined') return;

    try {
      this.timerWorker = new Worker(
        new URL('./workers/audioTimer.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.timerWorker.onmessage = (e) => {
        if (e.data?.type === 'tick') {
          this.handleTick();
        }
      };
      this.timerWorker.postMessage({ command: 'start' });
    } catch (err) {
      console.warn('Worker initialization failed; falling back to requestAnimationFrame', err);
    }
  }

  private handleTick(): void {
    const activeDeck = this.getActiveDeck();
    const currentTime = activeDeck.getCurrentTime();
    const duration = activeDeck.getDuration();

    if (this.onPositionUpdateCallback && duration > 0) {
      this.onPositionUpdateCallback(currentTime, duration);
    }

    // Haptics Pulse
    this.hapticsEngine.processFrame();

    // Zero-Latency Preload Trigger: 15 seconds before track end
    if (duration > 0 && duration - currentTime <= 15 && !this.hasPreloadedNext && this.upcomingTrack) {
      this.triggerUpcomingTrackPreload();
    }

    // Auto-Transition Trigger when track reaches final 4 seconds
    if (duration > 0 && duration - currentTime <= 4 && duration > 10 && this.upcomingTrack) {
      this.triggerAutoMix();
    }
  }

  private ensureBridgePlayback(playing: boolean): void {
    if (typeof document === 'undefined') return;
    try {
      const bridge = document.getElementById('aura-core-background-bridge') as HTMLAudioElement;
      if (!bridge) return;
      if (playing) {
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

  public async playTrack(track: TrackMetadata, arrayBuffer?: ArrayBuffer): Promise<void> {
    await this.ensureContextActive();
    this.currentTrack = track;
    this.hasPreloadedNext = false;

    const activeDeck = this.getActiveDeck();
    const idleDeck = this.getIdleDeck();

    idleDeck.disposeSource();
    activeDeck.setFaderGain(1.0, 0);

    if (arrayBuffer) {
      await activeDeck.preloadBuffer(track, arrayBuffer);
    } else {
      const audio = new Audio(track.url);
      audio.crossOrigin = 'anonymous';
      activeDeck.loadAudioElement(track, audio);
    }

    activeDeck.play(0);
    this.ensureBridgePlayback(true);
  }

  public setUpcomingTrack(track: TrackMetadata): void {
    this.upcomingTrack = track;
    this.hasPreloadedNext = false;
  }

  private async triggerUpcomingTrackPreload(): Promise<void> {
    if (!this.upcomingTrack) return;
    this.hasPreloadedNext = true;
    const idleDeck = this.getIdleDeck();

    try {
      const response = await fetch(this.upcomingTrack.url);
      const buffer = await response.arrayBuffer();
      await idleDeck.preloadBuffer(this.upcomingTrack, buffer);
    } catch {
      // Stream fallback if buffer fetch fails
      const audio = new Audio(this.upcomingTrack.url);
      audio.crossOrigin = 'anonymous';
      idleDeck.loadAudioElement(this.upcomingTrack, audio);
    }
  }

  public async triggerAutoMix(mode: AutoMixMode = 'crossfade'): Promise<void> {
    const outgoingDeck = this.getActiveDeck();
    const incomingDeck = this.getIdleDeck();

    this.activeDeckId = this.activeDeckId === 'deckA' ? 'deckB' : 'deckA';
    this.currentTrack = this.upcomingTrack;
    this.upcomingTrack = null;
    this.hasPreloadedNext = false;

    await this.autoMixController.executeTransition(outgoingDeck, incomingDeck, mode, 4);

    if (this.onTrackEndedCallback) {
      this.onTrackEndedCallback();
    }
  }

  public togglePlay(): void {
    const activeDeck = this.getActiveDeck();
    if (activeDeck.isPlaying()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public pause(): void {
    this.getActiveDeck().pause();
    this.ensureBridgePlayback(false);
  }

  public resume(): void {
    const active = this.getActiveDeck();
    active.play(active.getCurrentTime());
    this.ensureBridgePlayback(true);
  }

  public isPlaying(): boolean {
    return this.getActiveDeck().isPlaying();
  }

  public getCurrentTime(): number {
    return this.getActiveDeck().getCurrentTime();
  }

  public getDuration(): number {
    return this.getActiveDeck().getDuration();
  }

  public getCurrentTrack(): TrackMetadata | null {
    return this.currentTrack;
  }

  public getUpcomingTrack(): TrackMetadata | null {
    return this.upcomingTrack;
  }

  public getActiveDeckId(): 'deckA' | 'deckB' {
    return this.activeDeckId;
  }

  public getAudioContext(): AudioContext {
    return this.ctx;
  }

  public getEffectsChain(): EffectsChain {
    return this.effectsChain;
  }

  public getHapticsEngine(): HapticsEngine {
    return this.hapticsEngine;
  }

  public seek(seconds: number): void {
    this.getActiveDeck().play(seconds);
  }

  public setVolume(vol: number): void {
    if (!this.ctx || !this.masterBus) return;
    this.masterBus.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
  }

  public setEQ(bands: EQBands): void {
    this.effectsChain.setEQ(bands);
  }

  public setAnalogWarmth(amount: number): void {
    this.effectsChain.setAnalogWarmth(amount);
  }

  public setReverb(preset: ReverbPreset): void {
    this.effectsChain.setReverbPreset(preset);
  }

  public setBassBoost(db: number): void {
    this.effectsChain.setBassBoostGain(db);
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.hapticsEngine.setEnabled(enabled);
  }

  public onPositionUpdate(cb: (current: number, duration: number) => void): void {
    this.onPositionUpdateCallback = cb;
  }

  public onTrackEnded(cb: () => void): void {
    this.onTrackEndedCallback = cb;
  }

  private getActiveDeck(): DeckChannel {
    return this.activeDeckId === 'deckA' ? this.deckA : this.deckB;
  }

  private getIdleDeck(): DeckChannel {
    return this.activeDeckId === 'deckA' ? this.deckB : this.deckA;
  }

  private async ensureContextActive(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {}
    }
  }

  public destroy(): void {
    if (this.timerWorker) {
      this.timerWorker.postMessage({ command: 'stop' });
      this.timerWorker.terminate();
      this.timerWorker = null;
    }
    this.deckA?.destroy();
    this.deckB?.destroy();
    this.masterBus?.disconnect();
    if (typeof document !== 'undefined') {
      const bridge = document.getElementById('aura-core-background-bridge') as HTMLAudioElement;
      if (bridge) {
        bridge.pause();
        bridge.srcObject = null;
        bridge.remove();
      }
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    AudioEngine.instance = null;
  }
}
