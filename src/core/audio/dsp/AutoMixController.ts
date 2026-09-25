import { DeckChannel as CoreDeckChannel } from '../core/DeckChannel';
import { DeckChannel as LegacyDeckChannel } from '../DeckChannel';
import { AutoMixMode, AutoMixStyle } from '../types';

export class AutoMixController {
  private ctx: AudioContext | null = null;
  private isTransitionActive = false;
  private activeAbortController: AbortController | null = null;

  // Echo Out Web Audio DSP Nodes
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;

  constructor(ctx?: AudioContext) {
    if (ctx) {
      this.ctx = ctx;
    }
  }

  public setContext(ctx: AudioContext): void {
    this.ctx = ctx;
  }

  public getIsTransitionActive(): boolean {
    return this.isTransitionActive;
  }

  public cancelTransition(deckA?: any, deckB?: any): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.isTransitionActive = false;

    if (deckA) {
      if (typeof deckA.resetFilter === 'function') deckA.resetFilter();
      if (typeof deckA.setPlaybackRate === 'function') deckA.setPlaybackRate(1.0);
      if (typeof deckA.setFaderGain === 'function') deckA.setFaderGain(1.0, 0);
      if (typeof deckA.setVolume === 'function') deckA.setVolume(1.0, 0);
    }
    if (deckB) {
      if (typeof deckB.resetFilter === 'function') deckB.resetFilter();
      if (typeof deckB.setPlaybackRate === 'function') deckB.setPlaybackRate(1.0);
      if (typeof deckB.setFaderGain === 'function') deckB.setFaderGain(0, 0);
      if (typeof deckB.setVolume === 'function') deckB.setVolume(0, 0);
    }
    this.teardownEchoNodes();
  }

  public async executeTransition(
    outgoingDeck: any,
    incomingDeck: any,
    mode: AutoMixMode | AutoMixStyle = 'crossfade',
    durationSec: number = 4,
    ctxOverride?: AudioContext | null,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (ctxOverride) {
      this.ctx = ctxOverride;
    }

    const clampedDuration = Math.max(1.0, Math.min(30.0, durationSec));
    const normalizedMode = (mode || 'crossfade').toString().replace('_', '-') as AutoMixMode;

    // Check if this is the new Core DeckChannel (with getFaderGainNode)
    if (typeof outgoingDeck.getFaderGainNode === 'function' && typeof incomingDeck.getFaderGainNode === 'function') {
      return this.executeCoreTransition(outgoingDeck, incomingDeck, normalizedMode, clampedDuration);
    }

    // Otherwise run legacy DeckChannel transition
    this.cancelTransition(outgoingDeck, incomingDeck);
    this.isTransitionActive = true;
    const abortCtrl = new AbortController();
    this.activeAbortController = abortCtrl;

    try {
      switch (mode) {
        case 'vinyl_brake':
        case 'vinyl-brake':
          await this.runVinylBrake(outgoingDeck, incomingDeck, clampedDuration, abortCtrl.signal, onProgress);
          break;
        case 'filter_sweep':
        case 'filter-sweep':
          await this.runFilterSweep(outgoingDeck, incomingDeck, clampedDuration, abortCtrl.signal, onProgress);
          break;
        case 'echo_out':
        case 'echo-out':
          await this.runEchoOut(outgoingDeck, incomingDeck, clampedDuration, this.ctx, abortCtrl.signal, onProgress);
          break;
        case 'crossfade':
        default:
          await this.runEqualPowerCrossfade(outgoingDeck, incomingDeck, clampedDuration, abortCtrl.signal, onProgress);
          break;
      }
    } finally {
      this.isTransitionActive = false;
      this.activeAbortController = null;
      if (outgoingDeck.resetFilter) outgoingDeck.resetFilter();
      if (outgoingDeck.setPlaybackRate) outgoingDeck.setPlaybackRate(1.0);
      if (incomingDeck.resetFilter) incomingDeck.resetFilter();
      if (incomingDeck.setPlaybackRate) incomingDeck.setPlaybackRate(1.0);
      this.teardownEchoNodes();
    }
  }

  // --- Core DeckChannel (Mathematical Web Audio Curves) ---

  private executeCoreTransition(
    outgoingDeck: CoreDeckChannel,
    incomingDeck: CoreDeckChannel,
    mode: AutoMixMode,
    durationSec: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ctx) {
        outgoingDeck.pause();
        incomingDeck.play(0);
        resolve();
        return;
      }

      const now = this.ctx.currentTime;
      incomingDeck.play(0);

      switch (mode) {
        case 'crossfade':
          this.applyEqualPowerCrossfade(outgoingDeck, incomingDeck, now, durationSec);
          break;
        case 'vinyl-brake':
          this.applyVinylBrake(outgoingDeck, incomingDeck, now, durationSec);
          break;
        case 'echo-out':
          this.applyEchoOut(outgoingDeck, incomingDeck, now, durationSec);
          break;
        case 'filter-sweep':
          this.applyFilterSweep(outgoingDeck, incomingDeck, now, durationSec);
          break;
        default:
          this.applyEqualPowerCrossfade(outgoingDeck, incomingDeck, now, durationSec);
          break;
      }

      setTimeout(() => {
        outgoingDeck.pause();
        resolve();
      }, durationSec * 1000);
    });
  }

  private applyEqualPowerCrossfade(
    outDeck: CoreDeckChannel,
    inDeck: CoreDeckChannel,
    startTime: number,
    duration: number
  ): void {
    const steps = 30;
    const interval = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const t = startTime + i * interval;
      const progress = i / steps;
      const gainOut = Math.cos(progress * 0.5 * Math.PI);
      const gainIn = Math.sin(progress * 0.5 * Math.PI);

      outDeck.getFaderGainNode().gain.setValueAtTime(gainOut, t);
      inDeck.getFaderGainNode().gain.setValueAtTime(gainIn, t);
    }
  }

  private applyVinylBrake(
    outDeck: CoreDeckChannel,
    inDeck: CoreDeckChannel,
    startTime: number,
    duration: number
  ): void {
    const filter = outDeck.getFilterNode();
    filter.frequency.setValueAtTime(20000, startTime);
    filter.frequency.exponentialRampToValueAtTime(120, startTime + duration * 0.8);

    outDeck.getFaderGainNode().gain.setValueAtTime(1.0, startTime);
    outDeck.getFaderGainNode().gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    inDeck.setFaderGain(0, 0);
    inDeck.getFaderGainNode().gain.linearRampToValueAtTime(1.0, startTime + duration * 0.5);
  }

  private applyEchoOut(
    outDeck: CoreDeckChannel,
    inDeck: CoreDeckChannel,
    startTime: number,
    duration: number
  ): void {
    if (!this.ctx) return;
    const delay = this.ctx.createDelay();
    const feedback = this.ctx.createGain();

    delay.delayTime.setValueAtTime(0.35, startTime);
    feedback.gain.setValueAtTime(0.65, startTime);
    feedback.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    outDeck.outputNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.ctx.destination);

    outDeck.getFaderGainNode().gain.setValueAtTime(1.0, startTime);
    outDeck.getFaderGainNode().gain.setValueAtTime(0.0, startTime + 0.1);

    inDeck.getFaderGainNode().gain.setValueAtTime(0, startTime);
    inDeck.getFaderGainNode().gain.linearRampToValueAtTime(1.0, startTime + 0.8);

    setTimeout(() => {
      try {
        delay.disconnect();
        feedback.disconnect();
      } catch {}
    }, duration * 1000);
  }

  private applyFilterSweep(
    outDeck: CoreDeckChannel,
    inDeck: CoreDeckChannel,
    startTime: number,
    duration: number
  ): void {
    const outFilter = outDeck.getFilterNode();
    outFilter.Q.setValueAtTime(8, startTime);
    outFilter.frequency.setValueAtTime(20000, startTime);
    outFilter.frequency.exponentialRampToValueAtTime(200, startTime + duration);

    outDeck.getFaderGainNode().gain.linearRampToValueAtTime(0.0, startTime + duration);

    const inFilter = inDeck.getFilterNode();
    inFilter.frequency.setValueAtTime(250, startTime);
    inFilter.frequency.exponentialRampToValueAtTime(20000, startTime + duration);
    inDeck.getFaderGainNode().gain.linearRampToValueAtTime(1.0, startTime + duration * 0.7);
  }

  // --- Legacy DeckChannel Algorithms ---

  private async runEqualPowerCrossfade(
    outgoing: any,
    incoming: any,
    durationSec: number,
    signal: AbortSignal,
    onProgress?: (p: number) => void
  ): Promise<void> {
    const startTime = performance.now();
    const durationMs = durationSec * 1000;

    incoming.setVolume(0);
    await incoming.play();

    return new Promise<void>((resolve, reject) => {
      const step = () => {
        if (signal.aborted) {
          return reject(new Error('AutoMix transition aborted'));
        }

        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);

        const outVol = Math.cos(progress * 0.5 * Math.PI);
        const inVol = Math.sin(progress * 0.5 * Math.PI);

        outgoing.setVolume(outVol, 0.02);
        incoming.setVolume(inVol, 0.02);

        if (onProgress) onProgress(progress);

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          outgoing.stop();
          outgoing.setVolume(0);
          incoming.setVolume(1.0);
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  private async runVinylBrake(
    outgoing: any,
    incoming: any,
    durationSec: number,
    signal: AbortSignal,
    onProgress?: (p: number) => void
  ): Promise<void> {
    const brakeDuration = Math.min(durationSec * 0.65, 3.5);
    const brakeMs = brakeDuration * 1000;
    const startTime = performance.now();

    return new Promise<void>((resolve, reject) => {
      const step = () => {
        if (signal.aborted) {
          return reject(new Error('Vinyl brake aborted'));
        }

        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / brakeMs);

        const rate = Math.max(0.01, Math.pow(1.0 - progress, 2.2));
        outgoing.setPlaybackRate(rate);

        const cutoff = Math.max(80, 18000 * Math.pow(1.0 - progress, 1.8));
        outgoing.setFilter('lowpass', cutoff, 2.0, 0.02);

        outgoing.setVolume(Math.cos(progress * 0.5 * Math.PI), 0.02);

        if (onProgress) onProgress(progress * 0.5);

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          outgoing.stop();
          outgoing.setVolume(0);
          outgoing.setPlaybackRate(1.0);
          outgoing.resetFilter();

          incoming.setVolume(1.0);
          incoming.play().then(() => {
            if (onProgress) onProgress(1.0);
            resolve();
          }).catch(reject);
        }
      };

      requestAnimationFrame(step);
    });
  }

  private async runFilterSweep(
    outgoing: any,
    incoming: any,
    durationSec: number,
    signal: AbortSignal,
    onProgress?: (p: number) => void
  ): Promise<void> {
    const durationMs = durationSec * 1000;
    const startTime = performance.now();

    incoming.setVolume(0);
    incoming.setFilter('lowpass', 250, 1.5, 0);
    await incoming.play();

    return new Promise<void>((resolve, reject) => {
      const step = () => {
        if (signal.aborted) {
          return reject(new Error('Filter sweep aborted'));
        }

        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);

        const outFreq = 20 + 9000 * Math.pow(progress, 1.8);
        outgoing.setFilter('highpass', outFreq, 2.0, 0.02);
        outgoing.setVolume(Math.cos(progress * 0.5 * Math.PI), 0.02);

        const inFreq = 250 + 19750 * Math.pow(progress, 1.5);
        incoming.setFilter('lowpass', inFreq, 1.2, 0.02);
        incoming.setVolume(Math.sin(progress * 0.5 * Math.PI), 0.02);

        if (onProgress) onProgress(progress);

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          outgoing.stop();
          outgoing.resetFilter();
          outgoing.setVolume(0);
          incoming.resetFilter();
          incoming.setVolume(1.0);
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  private async runEchoOut(
    outgoing: any,
    incoming: any,
    durationSec: number,
    ctx: AudioContext | null,
    signal: AbortSignal,
    onProgress?: (p: number) => void
  ): Promise<void> {
    const durationMs = durationSec * 1000;
    const startTime = performance.now();

    incoming.setVolume(0);
    await incoming.play();

    return new Promise<void>((resolve, reject) => {
      const step = () => {
        if (signal.aborted) {
          return reject(new Error('Echo out aborted'));
        }

        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);

        const outVol = Math.max(0, Math.cos(progress * 0.5 * Math.PI) * (1.0 - progress * 0.5));
        const inVol = Math.sin(progress * 0.5 * Math.PI);

        outgoing.setVolume(outVol, 0.02);
        incoming.setVolume(inVol, 0.02);

        if (onProgress) onProgress(progress);

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          outgoing.stop();
          outgoing.setVolume(0);
          incoming.setVolume(1.0);
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  private teardownEchoNodes(): void {
    if (this.delayNode) {
      try { this.delayNode.disconnect(); } catch {}
      this.delayNode = null;
    }
    if (this.delayFeedbackGain) {
      try { this.delayFeedbackGain.disconnect(); } catch {}
      this.delayFeedbackGain = null;
    }
    if (this.delayFilter) {
      try { this.delayFilter.disconnect(); } catch {}
      this.delayFilter = null;
    }
  }

  public static generateEqualPowerCurves(points = 64): {
    outgoingCurve: Float32Array;
    incomingCurve: Float32Array;
  } {
    const outgoing = new Float32Array(points);
    const incoming = new Float32Array(points);
    for (let i = 0; i < points; i++) {
      const x = i / (points - 1);
      outgoing[i] = Math.cos(x * 0.5 * Math.PI);
      incoming[i] = Math.sin(x * 0.5 * Math.PI);
    }
    return { outgoingCurve: outgoing, incomingCurve: incoming };
  }
}
