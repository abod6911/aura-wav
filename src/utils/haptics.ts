/**
 * AURA.WAV iOS / Mobile Tactile Haptics Engine
 * Provides authentic Apple Taptic Engine feedback using navigator.vibrate
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning';

export const triggerHaptic = (style: HapticStyle | number = 'light'): void => {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    if (typeof style === 'number') {
      navigator.vibrate(style);
      return;
    }

    switch (style) {
      case 'selection':
      case 'light':
        // Crisp, subtle 8ms taptic tap
        navigator.vibrate(8);
        break;
      case 'medium':
        // Prominent 15ms impact
        navigator.vibrate(15);
        break;
      case 'heavy':
        // Deep 25ms impact for sheet snaps and mode triggers
        navigator.vibrate(25);
        break;
      case 'success':
        // Double pulse for add to queue or like
        navigator.vibrate([8, 40, 14]);
        break;
      case 'warning':
        navigator.vibrate([15, 60, 20]);
        break;
      default:
        navigator.vibrate(8);
        break;
    }
  } catch {
    // Safely ignore on environments where vibration is restricted
  }
};
