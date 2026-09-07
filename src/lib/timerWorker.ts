/**
 * Unthrottled High-Precision Web Worker Timer
 * 
 * Runs an isolated timing loop inside a dedicated Web Worker thread (Blob URL).
 * Operating systems (iOS Safari, Android Chrome) do not throttle Worker intervals
 * when audio playback is actively running, ensuring continuous AutoMix tracking
 * even when the mobile screen is locked or the browser tab is hidden.
 */

export interface TimerWorkerController {
  start: (intervalMs?: number) => void;
  stop: () => void;
  terminate: () => void;
  onTick: (cb: (timestamp: number) => void) => void;
}

export function createTimerWorker(): TimerWorkerController {
  let worker: Worker | null = null;
  let tickCallback: ((timestamp: number) => void) | null = null;
  let fallbackInterval: any = null;

  const workerCode = `
    let timerId = null;
    self.onmessage = function(e) {
      if (e.data && e.data.action === 'start') {
        if (timerId) clearInterval(timerId);
        const ms = e.data.interval || 50;
        timerId = setInterval(function() {
          self.postMessage({ type: 'tick', timestamp: performance.now() });
        }, ms);
      } else if (e.data && e.data.action === 'stop') {
        if (timerId) clearInterval(timerId);
        timerId = null;
      }
    };
  `;

  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);

      worker.onmessage = (e) => {
        if (e.data && e.data.type === 'tick' && tickCallback) {
          tickCallback(e.data.timestamp);
        }
      };

      // Clean up object URL after worker instantiates
      URL.revokeObjectURL(workerUrl);
    } catch (err) {
      console.warn('[TimerWorker] Web Worker instantiation fallback:', err);
      worker = null;
    }
  }

  return {
    start(intervalMs = 50) {
      if (worker) {
        worker.postMessage({ action: 'start', interval: intervalMs });
      } else if (typeof window !== 'undefined') {
        if (fallbackInterval) clearInterval(fallbackInterval);
        fallbackInterval = setInterval(() => {
          if (tickCallback) tickCallback(performance.now());
        }, intervalMs);
      }
    },
    stop() {
      if (worker) {
        worker.postMessage({ action: 'stop' });
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    },
    terminate() {
      this.stop();
      if (worker) {
        worker.terminate();
        worker = null;
      }
    },
    onTick(cb: (timestamp: number) => void) {
      tickCallback = cb;
    },
  };
}
