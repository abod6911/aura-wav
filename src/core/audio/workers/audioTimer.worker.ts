// Web Worker for 20ms precision audio loop
let timerId: number | null = null;
const TICK_INTERVAL = 20;

if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function') {
  (self as any).onmessage = (e: MessageEvent) => {
    const { command, action, interval } = e.data || {};
    const cmd = command || action;
    const tickInterval = interval || TICK_INTERVAL;

    if (cmd === 'start') {
      if (timerId !== null) clearInterval(timerId);
      timerId = (self as any).setInterval(() => {
        (self as any).postMessage({ type: 'tick', timestamp: performance.now() });
      }, tickInterval);
    } else if (cmd === 'stop') {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    }
  };
}

export interface AudioTimerController {
  start: (intervalMs?: number) => void;
  stop: () => void;
  terminate: () => void;
  onTick: (callback: (timestamp: number) => void) => void;
}

export function createAudioTimerWorker(defaultIntervalMs = 20): AudioTimerController {
  let worker: Worker | null = null;
  let tickCallback: ((timestamp: number) => void) | null = null;
  let fallbackTimer: ReturnType<typeof setInterval> | null = null;

  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(
        new URL('./audioTimer.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent<{ type?: string; timestamp?: number }>) => {
        if (e.data && e.data.type === 'tick' && tickCallback) {
          tickCallback(e.data.timestamp || performance.now());
        }
      };
    } catch (err) {
      console.warn('[AudioTimerWorker] Fallback to main thread timer:', err);
      worker = null;
    }
  }

  return {
    start(intervalMs = defaultIntervalMs) {
      if (worker) {
        worker.postMessage({ command: 'start', interval: intervalMs });
      } else if (typeof window !== 'undefined') {
        if (fallbackTimer !== null) clearInterval(fallbackTimer);
        fallbackTimer = setInterval(() => {
          if (tickCallback) tickCallback(performance.now());
        }, intervalMs);
      }
    },
    stop() {
      if (worker) {
        worker.postMessage({ command: 'stop' });
      }
      if (fallbackTimer !== null) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
    },
    terminate() {
      this.stop();
      if (worker) {
        worker.terminate();
        worker = null;
      }
    },
    onTick(callback: (timestamp: number) => void) {
      tickCallback = callback;
    },
  };
}
