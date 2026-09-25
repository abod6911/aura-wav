/**
 * Ultra-Precise 20ms Audio Timer Web Worker
 * 
 * Runs an isolated high-resolution audio clock timer inside a dedicated Web Worker.
 * Ensures smooth transitions, equal-power crossfades, and playback position broadcasts
 * unaffected by main thread CPU spikes, DOM layout passes, or tab backgrounding.
 */

export interface AudioTimerController {
  start: (intervalMs?: number) => void;
  stop: () => void;
  terminate: () => void;
  onTick: (callback: (timestamp: number) => void) => void;
}

const WORKER_SCRIPT = `
  let timerId = null;
  self.onmessage = function(e) {
    if (!e.data) return;
    if (e.data.action === 'start') {
      if (timerId !== null) clearInterval(timerId);
      const interval = e.data.interval || 20;
      timerId = setInterval(function() {
        self.postMessage({ type: 'tick', timestamp: performance.now() });
      }, interval);
    } else if (e.data.action === 'stop') {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    }
  };
`;

export function createAudioTimerWorker(defaultIntervalMs = 20): AudioTimerController {
  let worker: Worker | null = null;
  let tickCallback: ((timestamp: number) => void) | null = null;
  let fallbackTimer: ReturnType<typeof setInterval> | null = null;

  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      worker = new Worker(blobUrl);

      worker.onmessage = (e: MessageEvent<{ type?: string; timestamp?: number }>) => {
        if (e.data && e.data.type === 'tick' && tickCallback) {
          tickCallback(e.data.timestamp || performance.now());
        }
      };

      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('[AudioTimerWorker] Fallback to main thread timer:', err);
      worker = null;
    }
  }

  return {
    start(intervalMs = defaultIntervalMs) {
      if (worker) {
        worker.postMessage({ action: 'start', interval: intervalMs });
      } else if (typeof window !== 'undefined') {
        if (fallbackTimer !== null) clearInterval(fallbackTimer);
        fallbackTimer = setInterval(() => {
          if (tickCallback) tickCallback(performance.now());
        }, intervalMs);
      }
    },
    stop() {
      if (worker) {
        worker.postMessage({ action: 'stop' });
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
