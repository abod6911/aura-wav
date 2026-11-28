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

// ── Tab / Page Transitions (Silky spatial fade + slight scale settle) ──
export const TAB_TRANSITION_VARIANTS: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.992 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: APPLE_EASE_SHEET },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.995,
    transition: { duration: 0.12, ease: APPLE_EASE_MICRO },
  },
};

// ── Expanded Player Artwork Scale (Apple Music Signature Animation) ──
export const ARTWORK_SCALE_TRANSITION: Transition = {
  duration: 0.38,
  ease: APPLE_EASE_ARTWORK,
};

// ── Shared Smooth Springs for Pills, Indicators & Tactile Presses ──
export const LUXURY_SPRING: Transition = {
  type: 'spring',
  stiffness: 440,
  damping: 31,
  mass: 0.8,
};

export const SPRING_GLIDE: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 34,
  mass: 0.72,
};

// ── Staggered Luxury Container & Item Variants (supports both initial/animate and hidden/visible) ──
export const STAGGER_CONTAINER: Variants = {
  initial: { opacity: 0 },
  hidden: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.042,
      delayChildren: 0.015,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.042,
      delayChildren: 0.015,
    },
  },
};

export const STAGGER_ITEM: Variants = {
  initial: { opacity: 0, y: 11, scale: 0.985 },
  hidden: { opacity: 0, y: 11, scale: 0.985 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 360,
      damping: 28,
      mass: 0.78,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 360,
      damping: 28,
      mass: 0.78,
    },
  },
};

export const CARD_TAP_ANIMATION = {
  whileHover: { y: -2, transition: { duration: 0.18, ease: APPLE_EASE_MICRO } },
  whileTap: { scale: 0.965, transition: { duration: 0.1 } },
};

// ── Play/Pause & Icon Morph Spring ──
export const PLAY_ICON_SPRING: Transition = {
  type: 'spring',
  stiffness: 560,
  damping: 30,
  mass: 0.6,
};

// ── Editorial Hero Artwork / Header Entrance ──
export const VIEW_HERO_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.36, ease: APPLE_EASE_ARTWORK },
  },
};

// ── Artwork Crossfade on Track Switch ──
export const ARTWORK_CROSSFADE_TRANSITION: Transition = {
  duration: 0.22,
  ease: APPLE_EASE_ARTWORK,
};

// ── Pop-In Badge / Toast / Floating Pill ──
export const POP_IN_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 460, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: -6,
    transition: { duration: 0.15, ease: APPLE_EASE_MICRO },
  },
};
