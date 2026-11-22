import { Transition, Variants } from 'framer-motion';

/**
 * AuraWave Zero-Glitch 60-120fps Apple Motion System
 * Enforces hardware-accelerated GPU transitions (transform & opacity only)
 * Eliminates layout thrashing, sticky opacity bugs, and stutter.
 */

// ── Timing & Easing Curves ──
export const APPLE_EASE_SHEET = [0.32, 0.72, 0, 1] as const;
export const APPLE_EASE_MICRO = [0.2, 0, 0, 1] as const;
export const APPLE_EASE_ARTWORK = [0.32, 0.72, 0, 1] as const;

// ── Unified Spring Physics ──
export const APPLE_SPRING_SHEET: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 38,
  mass: 0.9,
};

export const APPLE_SPRING_FAST: Transition = {
  type: 'spring',
  stiffness: 450,
  damping: 32,
};

export const APPLE_SPRING_BOUNCE: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

// ── Modal & Bottom Sheet Variants ──
export const BACKDROP_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: APPLE_EASE_MICRO },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.16, ease: APPLE_EASE_MICRO },
  },
};

export const BOTTOM_SHEET_VARIANTS: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: { duration: 0.28, ease: APPLE_EASE_SHEET },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.22, ease: APPLE_EASE_SHEET },
  },
};

export const DIALOG_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.28, ease: APPLE_EASE_SHEET },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.18, ease: APPLE_EASE_MICRO },
  },
};

// ── Tab / Page Transitions ──
export const TAB_TRANSITION_VARIANTS: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.16, ease: APPLE_EASE_MICRO },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

// ── Expanded Player Artwork Scale (Apple Music Signature Animation) ──
export const ARTWORK_SCALE_TRANSITION: Transition = {
  duration: 0.38,
  ease: APPLE_EASE_ARTWORK,
};
