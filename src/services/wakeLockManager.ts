/**
 * AURA.WAV Screen Wake Lock Manager
 * 
 * Keeps the screen awake during playback (especially useful when reading synchronized lyrics
 * or using DJ FX in foreground) and releases gracefully when paused to preserve battery.
 */

class WakeLockManager {
  private static instance: WakeLockManager;
  private wakeLock: any = null;
  private isRequested = false;

  private constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRequested) {
          this.acquire();
        }
      });
    }
  }

  public static getInstance(): WakeLockManager {
    if (!WakeLockManager.instance) {
      WakeLockManager.instance = new WakeLockManager();
    }
    return WakeLockManager.instance;
  }

  public async request(): Promise<void> {
    this.isRequested = true;
    await this.acquire();
  }

  public async release(): Promise<void> {
    this.isRequested = false;
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
  }

  private async acquire(): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    try {
      if (!this.wakeLock || this.wakeLock.released) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch {
      // Non-critical; ignore when tab is backgrounded or system policy forbids
    }
  }
}

export const wakeLockManager = WakeLockManager.getInstance();
