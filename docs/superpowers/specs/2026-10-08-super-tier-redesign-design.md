# Design Spec: AURA.WAV Super-Tier Transformation

**Date:** 2026-10-08  
**Status:** Approved  
**Project:** AURA.WAV Web Music Platform  

---

## 1. Vision & Objectives
Elevate AURA.WAV into a category-defining music experience that outclasses Spotify, Apple Music, and web players across three key dimensions:
1. **Audiophile & Web Audio DSP Superpowers:** Spatial 3D / 8D audio engine, environmental reverb presets (Concert Hall, Intimate Studio, Club Lounge, Vinyl Warmth), real-time vocal attenuation (Karaoke Sing Mode), and intelligent beat-matched crossfading.
2. **Next-Generation Liquid Obsidian Visual System:** Dynamic chromatic lighting projecting from album art, interactive 3D card tilt physics, floating crystal PlayerBar, and cinematic ExpandedPlayer.
3. **120fps Fluid Performance & Native Gestures:** Zero-jank spring physics, interactive waveform timeline scrubber, mobile gesture dismissals, and seamless track exploration with Bento Grid layouts and mood radar filters.

---

## 2. Architecture & Subsystems

### Subsystem A: Advanced Web Audio DSP Engine (`src/core/audio/` and `src/lib/audioEngine.ts`)
- **Spatial Audio Panner & HRTF:**
  - Introduce `SpatialReverbEngine` with Web Audio API nodes: `ConvolverNode`, `StereoPannerNode` / `PannerNode`, and dynamic Biquad filters.
  - Modes:
    - `off`: Direct pristine stream.
    - `concert`: Rich reverberation impulse response simulating a 2,000-seat amphitheater.
    - `studio`: Tight, warm reflection with slight high-shelf boost for acoustic clarity.
    - `club`: Low-end warmth and punchy acoustic compression.
    - `spatial_8d`: Smooth automated sinusoidal panning simulation creating an immersive 360-degree rotating acoustic space.
- **Center-Channel Vocal Attenuator (Karaoke Mode):**
  - Mid/Side audio processing: splits left/right channels, phase-inverts center vocals within the 300Hz-3.5kHz vocal spectrum.
  - User toggle with an intensity slider (0% to 100% vocal attenuation).
- **Interactive Audio Waveform Visualizer & Scrubber (`TimelineSlider.tsx`):**
  - Real-time/pre-computed audio peak representation for the playing track.
  - Interactive scrubbing with millisecond precision, animated playback progress, and glow matching the track's dominant accent color.

### Subsystem B: Visual & UI Overhaul (`src/components/`)
- **Floating Crystal PlayerBar (`PlayerBar.tsx`):**
  - Ultra-sleek floating glass capsule (`backdrop-filter: blur(36px) saturate(190%)`).
  - Dynamic ambient glow radiating from album cover.
  - Quick action controls for Spatial Audio, Karaoke Sing Mode, Equalizer, and Lyrics.
  - Subtle breathing animation for album art and vinyl rotation effect when playing.
- **Cinematic Expanded Player (`ExpandedPlayer.tsx`):**
  - Large interactive 3D cover art with mouse/touch parallax tilt.
  - Audiophile Sound Studio panel: toggle Spatial presets (Concert, Studio, 8D, Club), Karaoke slider, and Bass Boost.
  - Apple Music-style lyrics view with synchronized glowing text.
- **Modern Bento Grid Home View (`SpotifyHomeView.tsx`):**
  - Time-aware dynamic header greeting with glassy styling.
  - "Mood & Vibe Radar" quick filters (⚡ Energy Boost, 🌙 Midnight Chill, 🎧 Deep Focus, 💔 Nostalgia, 🚗 Road Trip).
  - High-impact Bento Grid layout: Trending hero card, circular 3D artist avatars with hover scale, and quick access mixes.
  - Interactive track rows with animated audio equalizer indicator, instant play/pause on hover, and seamless queue/favorite actions.

### Subsystem C: Motion, Gestures & Responsiveness
- **Spring Physics (`framer-motion`):**
  - Unified spring configs: `stiffness: 300, damping: 30` for natural tactile responsiveness.
- **Mobile Touch Gestures:**
  - Pull-down-to-dismiss gesture on `ExpandedPlayer` with velocity threshold.
  - Swipe gestures for next/previous track navigation.
- **Virtualization & Zero Layout Shift:**
  - High efficiency rendering for 1,750+ catalog tracks without frame drops.

---

## 3. Data Flow & State Management
- `usePlayerStore`:
  - Extend state to include:
    - `spatialMode: 'off' | 'concert' | 'studio' | 'club' | '8d'`
    - `karaokeActive: boolean`
    - `karaokeVocalLevel: number` (0 to 1)
    - `activeMoodFilter: string | null`
    - Waveform frequency peak caching.
  - Audio processing connections wired through `AudioEngine` without interrupting playback stream or CDN audio caching.

---

## 4. Error Handling & Fallbacks
- Web Audio API errors (e.g., audio context suspended before user gesture) are gracefully unlocked on first user interaction.
- Convolver impulse generation uses high-quality procedural impulse generation to avoid external asset network dependencies.
- Fallback to standard stereo playback if spatial nodes encounter browser audio policy restrictions.

---

## 5. Verification & Testing
- Automated build verification: `npm run build` and `oxlint`.
- Audio DSP verification: Verify spatial audio switching, karaoke phase inversion, and volume preservation without clipping.
- UI & Responsiveness verification: Ensure all screens render seamlessly across desktop and mobile viewports with no overflow or jank.
