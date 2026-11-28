/**
 * Cross-platform Fullscreen Manager
 * Supports standard Fullscreen API (Android Chrome, Edge, desktop browsers)
 * with graceful fallback and PWA Home Screen guidance for iOS Safari.
 */

type FullscreenChangeCallback = (isFullscreen: boolean) => void;

const listeners = new Set<FullscreenChangeCallback>();

if (typeof document !== 'undefined') {
  const handleChange = () => {
    const isFs = isFullscreenActive();
    listeners.forEach((cb) => {
      try { cb(isFs); } catch {}
    });
  };

  document.addEventListener('fullscreenchange', handleChange);
  document.addEventListener('webkitfullscreenchange', handleChange);
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Toggles native fullscreen.
 * Returns { success: boolean, isIos: boolean, isFullscreen: boolean }
 */
export async function toggleNativeFullscreen(): Promise<{
  success: boolean;
  isIos: boolean;
  isFullscreen: boolean;
}> {
  if (typeof document === 'undefined') {
    return { success: false, isIos: false, isFullscreen: false };
  }

  // 1. If currently fullscreen, exit
  if (isFullscreenActive()) {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
      return { success: true, isIos: false, isFullscreen: false };
    } catch (e) {
      console.warn('Exit fullscreen error:', e);
      return { success: false, isIos: false, isFullscreen: false };
    }
  }

  // 2. If iOS Safari (not in standalone PWA mode)
  if (isIOS() && !isStandalonePWA()) {
    return { success: false, isIos: true, isFullscreen: false };
  }

  // 3. Request fullscreen on standard browsers
  const elem = document.documentElement as any;
  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen({ navigationUI: 'hide' });
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
    } else {
      return { success: false, isIos: isIOS(), isFullscreen: false };
    }
    return { success: true, isIos: false, isFullscreen: true };
  } catch (err) {
    console.warn('Request fullscreen failed:', err);
    return { success: false, isIos: isIOS(), isFullscreen: false };
  }
}

export function onFullscreenChange(cb: FullscreenChangeCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
