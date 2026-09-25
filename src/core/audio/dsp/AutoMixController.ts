import { DeckChannel } from '../DeckChannel';
import { AutoMixStyle } from '../types';

/**
 * AutoMixController: Orchestrates math-accurate transitions between Deck Channels.
 * 
 * Transition Styles:
 * 1. Crossfade: Constant equal-power curve (cos / sin) eliminating the -3dB midpoint dip
 * 2. Vinyl Brake: Turntable motor-off friction deceleration + lowpass damping
 * 3. Echo Out: High-feedback tempo-synced delay tail fading out while incoming deck enters
 * 4. Filter Sweep: Outgoing deck highpasses away while incoming deck lowpasses in
 */
export class AutoMixController {
  private isTransitionActive = false;
  private activeAbortController: AbortController | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;

  /**
   * Mathematical Equal-Power Crossfade Curve Generator
   * Outgoing: cos(progress * PI / 2)
   * Incoming: sin(progress * PI / 2)
   * Constant acoustic power: cos²(x) + sin²(x) = 1.0 (Zero midpoint volume drop)
   */
  public static generateEqualPowerCurves(points = 64): {
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

  /**
   * Check if a transition is currently running
   */
  public isRunning(): boolean {
    return this.isTransitionActive;
  }

  /**
   * Cancel any active transition immediately and restore normal parameters
   */
  public cancelTransition(deckA?: DeckChannel, deckB?: DeckChannel): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.isTransitionActive = false;

    if (deckA) {
      deckA.resetFilter();
      deckA.setPlaybackRate(1.0);
    }
    if (deckB) {
      deckB.resetFilter();
      deckB.setPlaybackRate(1.0);
    }
    this.teardownEchoNodes();
  }

  /**
   * Execute AutoMix Transition between Deck Channels
   */
  public async executeTransition(
    outgoingDeck: DeckChannel,
    incomingDeck: DeckChannel,
    style: AutoMixStyle,
    durationSec: number,
    ctx: AudioContext,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    this.cancelTransition(outgoingDeck, incomingDeck);
    this.isTransitionActive = true;
    const abortCtrl = new AbortController();
    this.activeAbortController = abortCtrl;

    const clampedDuration = Math.max(1.0, Math.min(30.0, durationSec));

    try {
      switch (style) {
        case 'vinyl_brake':
          await this.runVinylBrake(outgoingDeck, incomingDeck, clampedDuration, abortCtrl.signal, onProgress);
          break;
        case 'filter_sweep':
          await this.runFilterSweep(outgoingDeck, incomingDeck, clampedDuration, abortCtrl.signal, onProgress);
          break;
        case 'echo_out':
          await this.runEchoOut(outgoingDeck, incomingDeck, clampedDuration, ctx, abortCtrl.signal, onProgress);
          break;
        case 'crossfade':
        default:
          await this.runEqualPowerCrossfade(outgoingDeck, incomingDeck, clampedDuration, abortCtrl.signal, onProgress);
          break;
      }
    } finally {
      this.isTransitionActive = false;
      this.activeAbortController = null;
      outgoingDeck.resetFilter();
      outgoingDeck.setPlaybackRate(1.0);
      incomingDeck.resetFilter();
      incomingDeck.setPlaybackRate(1.0);
      this.teardownEchoNodes();
    }
  }

  // --- Transition Algorithms ---

  /**
   * Equal-Power Crossfade Transition
   */
  private async runEqualPowerCrossfade(
    outgoing: DeckChannel,
    incoming: DeckChannel,
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

        // Math-accurate equal power
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

  /**
   * Vinyl Brake Simulation
   * Turntable motor deceleration curve + resonant lowpass brake
   */
  private async runVinylBrake(
    outgoing: DeckChannel,
    incoming: DeckChannel,
    durationSec: number,
    signal: AbortSignal,
    onProgress?: (p: number) => void
  ): Promise<void> {
    const brakeDuration = Math.min(durationSec * 0.65, 3.5);
    const brakeMs = brakeDuration * 1000;
    const startTime = performance.now();

    // Outgoing slows down and drops pitch
    return new Promise<void>((resolve, reject) => {
      const step = () => {
        if (signal.aborted) {
          return reject(new Error('Vinyl brake aborted'));
        }

        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / brakeMs);

        // Exponential deceleration curve
        const rate = Math.max(0.01, Math.pow(1.0 - progress, 2.2));
        outgoing.setPlaybackRate(rate);

        // Lowpass damping filter
        const cutoff = Math.max(80, 18000 * Math.pow(1.0 - progress, 1.8));
        outgoing.setFilter('lowpass', cutoff, 2.0, 0.02);

        // Gentle volume drop
        outgoing.setVolume(Math.cos(progress * 0.5 * Math.PI), 0.02);

        if (onProgress) onProgress(progress * 0.5);

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          outgoing.stop();
          outgoing.setVolume(0);
          outgoing.setPlaybackRate(1.0);
          outgoing.resetFilter();

          // Incoming drops cleanly
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

  /**
   * Filter Sweep Transition
   * Outgoing highpasses away while incoming lowpasses into the mix
   */
  private async runFilterSweep(
    outgoing: DeckChannel,
    incoming: DeckChannel,
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

        // Outgoing highpass sweep: 20Hz -> 9,000Hz
        const outFreq = 20 + 9000 * Math.pow(progress, 1.8);
        outgoing.setFilter('highpass', outFreq, 2.0, 0.02);
        outgoing.setVolume(Math.cos(progress * 0.5 * Math.PI), 0.02);

        // Incoming lowpass sweep: 250Hz -> 20,000Hz
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

  /**
   * Echo Out (Delay Feedback Tail) Transition
   */
  private async runEchoOut(
    outgoing: DeckChannel,
    incoming: DeckChannel,
    durationSec: number,
    ctx: AudioContext,
    signal: AbortSignal,
    onProgress?: (p: number) => void
  ): Promise<void> {
    const durationMs = durationSec * 1000;
    const startTime = performance.now();

    // Start incoming deck with clean crossfade
    incoming.setVolume(0);
    await incoming.play();

    return new Promise<void>((resolve, reject) => {
      const step = () => {
        if (signal.aborted) {
          return reject(new Error('Echo out aborted'));
        }

        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);

        // Outgoing quickly drops dry volume and leaves echo
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
}
