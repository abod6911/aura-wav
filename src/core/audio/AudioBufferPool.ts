/**
 * AURA.WAV Smart AudioBuffer Pool & Garbage Collection Architecture
 * 
 * Prevents tab crashes and OOM memory leaks by:
 * 1. Enforcing an LRU cache limited to at most 3 uncompressed PCM Float32 AudioBuffers:
 *    - Current playing track
 *    - Next up track (pre-buffered 25 seconds ahead)
 *    - Immediate previous track (for zero-latency back-skip)
 * 2. Explicitly decoupling and releasing stale buffers from memory.
 * 3. Proactive Lookahead: triggering background fetch and decoding of the next track
 *    exactly 25 seconds before the current track reaches duration.
 */

import { Track } from '../../types';

export class SmartAudioBufferPool {
  private static instance: SmartAudioBufferPool | null = null;
  private cache = new Map<string, { buffer: AudioBuffer; lastUsed: number }>();
  private readonly maxBuffers = 3;
  private ctx: AudioContext | null = null;
  private prefetchInFlight = new Set<string>();

  private constructor() {}

  public static getInstance(): SmartAudioBufferPool {
    if (!SmartAudioBufferPool.instance) {
      SmartAudioBufferPool.instance = new SmartAudioBufferPool();
    }
    return SmartAudioBufferPool.instance;
  }

  public setContext(ctx: AudioContext): void {
    this.ctx = ctx;
  }

  public has(trackId: string): boolean {
    return this.cache.has(trackId);
  }

  public get(trackId: string): AudioBuffer | null {
    const entry = this.cache.get(trackId);
    if (entry) {
      entry.lastUsed = Date.now();
      return entry.buffer;
    }
    return null;
  }

  /**
   * Put decoded AudioBuffer into pool, evicting the least recently used buffer if limit reached
   */
  public put(trackId: string, buffer: AudioBuffer): void {
    if (this.cache.size >= this.maxBuffers && !this.cache.has(trackId)) {
      this.evictLRU();
    }
    this.cache.set(trackId, { buffer, lastUsed: Date.now() });
  }

  /**
   * Decode and cache track audio into the pool
   */
  public async loadAndCache(track: Track, arrayBuffer: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    if (this.cache.has(track.id)) {
      return this.get(track.id);
    }

    try {
      // Decode audio on dedicated Web Audio decoding thread
      const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      this.put(track.id, decoded);
      return decoded;
    } catch (err) {
      console.warn(`[AudioBufferPool] Failed to decode audio for track ${track.id}:`, err);
      return null;
    }
  }

  /**
   * Pre-fetch next track buffer 25s before track end
   */
  public checkAndPrefetchNextTrack(
    currentTime: number,
    duration: number,
    nextTrack: Track | null,
    fetchBlobFn: (track: Track) => Promise<Blob | null>
  ): void {
    if (!nextTrack || !this.ctx || duration < 35) return;
    const remainingTime = duration - currentTime;

    // Trigger lookahead at 25 seconds remaining
    if (remainingTime <= 25 && !this.has(nextTrack.id) && !this.prefetchInFlight.has(nextTrack.id)) {
      this.prefetchInFlight.add(nextTrack.id);
      fetchBlobFn(nextTrack)
        .then(async (blob) => {
          if (blob) {
            const arrBuffer = await blob.arrayBuffer();
            await this.loadAndCache(nextTrack, arrBuffer);
          }
        })
        .catch((err) => {
          console.warn('[AudioBufferPool] Prefetch error:', err);
        })
        .finally(() => {
          this.prefetchInFlight.delete(nextTrack.id);
        });
    }
  }

  public clearAll(): void {
    this.cache.clear();
    this.prefetchInFlight.clear();
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, val] of this.cache.entries()) {
      if (val.lastUsed < oldestTime) {
        oldestTime = val.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

export const audioBufferPool = SmartAudioBufferPool.getInstance();
