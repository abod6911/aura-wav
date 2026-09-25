# AURA.WAV: Comprehensive Architectural Overhaul & Feature Expansion Spec

## Overview
A complete, non-breaking architectural overhaul, performance upgrade, and feature expansion across the AURA.WAV PWA music ecosystem. 

---

## 1. Workstream 1: Core Audio Engine Refactoring & DSP Hardening

### 1.1 Modular Architecture (`src/core/audio/`)
Refactor the monolithic `audioEngine.ts` into a decoupled, high-performance module structure under `src/core/audio/`:
- `DeckChannel.ts`: Encapsulates Channel A and Channel B audio graphs:
  - Source nodes: `MediaElementAudioSourceNode` and `AudioBufferSourceNode` (for preloaded audio buffers).
  - Preamp GainNode (incorporates ReplayGain / LUFS target attenuation).
  - Channel Volume GainNode (for crossfading and channel balance).
  - DJ BiquadFilterNode (neutral/lowpass/highpass sweep filter).
  - StereoPannerNode (for spatial and stereo placement).
  - Lifecycle: Strict `.disconnect()` before garbage collection and explicit node disposal pipeline.
- `dsp/AutoMixController.ts`:
  - Mathematical equal-power crossfade curves: $cos(t \cdot \pi / 2)$ and $sin(t \cdot \pi / 2)$ ensuring constant acoustic power $cos^2(x) + sin^2(x) = 1.0$.
  - Turntable vinyl brake simulation: exponential playbackRate ramp-down from 1.0 to 0.0 with lowpass filter cutoff drop.
  - Filter sweep: Highpass resonant sweep on outgoing deck while lowpass opens on incoming deck.
  - Feedback delay echo out: High-feedback tempo-synced delay with lowpass damping.
- `dsp/EffectsChain.ts`:
  - 5-band biquad filter EQ (60Hz lowshelf, 250Hz peaking, 1kHz peaking, 4kHz peaking, 16kHz highshelf).
  - Procedural analog tube/tape saturation curve using hyperbolic tangent `Math.tanh(x * drive)` with dry/wet mixing.
  - Convolver reverb with offline procedural impulse responses (studio, arena, car, vinyl lounge).
  - Dynamic Bass Boost compressor (low-frequency peaking boost paired with fast dynamics compressor to prevent clipping).
  - Vocal cancellation / Karaoke mid-side filter.
- `dsp/HapticsEngine.ts`:
  - FFT energy analyzer targeting 60-120Hz sub-bass frequencies.
  - Dynamic beat thresholding with cooldown throttling (minimum 120ms between pulses) triggering `navigator.vibrate(25)`.
- `dsp/LoudnessNormalizer.ts`:
  - Target loudness: -14 LUFS (EBU R128 standard).
  - Dynamically calculates gain adjustments based on track metadata (`track.gain` or `track.lufs`) and sets deck preamp nodes accordingly.
- `workers/audioTimer.worker.ts`:
  - Dedicated Web Worker running a 20ms interval audio clock.
  - Dispatches tick messages to the main thread for accurate transition curve updates and position synchronization independent of DOM layout thrashing.
- `DJAudioEngineFacade.ts`:
  - Singleton facade coordinating the channels, DSP effects, automix, worker, and preloading.
  - Preserves 100% backward compatibility with existing method signatures in `src/lib/audioEngine.ts`.
  - Re-exports `djAudioEngine` and types from `src/lib/audioEngine.ts` and `src/core/audio/index.ts`.

### 1.2 Dual-Deck Buffer Preloading (Zero-Latency Guarantee)
- When the active track reaches `duration - 15` seconds, the engine automatically checks the next queue track.
- If audio data is available via OPFS, IndexedDB, or URL, the audio is fetched as an ArrayBuffer and decoded via `ctx.decodeAudioData()`.
- The decoded `AudioBuffer` is loaded into the idle deck channel's memory ready for immediate playback, eliminating disk I/O or network delays during track transitions.

### 1.3 AudioContext Resiliency & Background Integrity
- Listens for `statechange` events on `AudioContext`.
- Handles browser lifecycle events: `visibilitychange`, `pageshow`, and pointer events.
- On wake, automatically attempts `ctx.resume()`. If blocked by browser power policy, sets up a one-time gesture listener.

---

## 2. Workstream 2: Rendering Performance & UI/UX Ergonomics (120 FPS Target)

### 2.1 Decoupled Ambient Glow (`AtmosphereBackground.tsx`)
- WebGL Fragment Shader implementation for dynamic background aurora mesh.
- Uses GPU-accelerated canvas with smooth color interpolation between extracted primary, secondary, and accent colors.
- Fallback to GPU composite layers (`will-change: transform; transform: translate3d(0,0,0)`).
- Completely offloaded from React render loops, avoiding re-renders when audio time advances.

### 2.2 Lag-Free Timeline Scrubbing (`TimelineSlider.tsx`)
- Optimistic local state updates during pointer dragging.
- The visual progress bar and time indicator decouple from the audio engine position while scrubbing.
- Pointer capture (`setPointerCapture`) with graceful fallback to window listeners.
- Audio engine `seek` is only invoked upon `onPointerUp` / `onChangeEnd`, eliminating audio crackle and slider jitter.

### 2.3 MediaSession API Integration (`src/audio/mediaSession.ts`)
- Multi-scale artwork arrays (96x96, 128x128, 192x192, 256x256, 384x384, 512x512) for Apple Watch, lock screens, and CarPlay/Android Auto.
- Action handlers: `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`, `seekbackward`, `seekforward`, `stop`.
- Throttled position synchronization via `navigator.mediaSession.setPositionState()` with jump detection.

### 2.4 Storage Quota & Resilience (`src/services/storageManager.ts`)
- Reactive Zustand store `useStorageStore` for storage health monitoring.
- Tracks `usedBytes`, `quotaBytes`, `percentage`, and `engine` via `navigator.storage.estimate()`.
- Automatically emits visual warning flags when storage exceeds 90% quota.

---

## 3. Workstream 3: Groundbreaking Functional Additions

### 3.1 Fluid 3D WebGL Audio Visualizer (`src/components/player/VisualizerCanvas.tsx`)
- Interactive fluid 3D glass sphere/wave built with raw WebGL GLSL shaders running at 120 FPS.
- Vertex displacement driven by sub-bass (60-120Hz) and mid-range frequencies from `AnalyserNode`.
- Procedural glass refraction, specular highlight, and chromatic aberration.
- Color palette synchronized with real-time extracted album colors from `colorSampler.ts`.
- Mouse / touch rotation interactivity.

### 3.2 Automated Synced Lyrics Fetcher (`src/services/lyricsService.ts`)
- Multi-tier retrieval strategy:
  1. Check OPFS for local `.lrc` file or embedded tags.
  2. Check Dexie.js `lyrics` table.
  3. Query LRCLIB API (`https://lrclib.net/api/get?artist_name=...&track_name=...&duration=...`).
- Stores fetched `.lrc` strings inside Dexie.js for instant offline retrieval.
- Synchronized lines parsed via `lyricsParser.ts`.

### 3.3 Smart Sleep Timer with Exponential Fade-Out (`src/components/player/SleepTimerModal.tsx`)
- Countdown presets: 15m, 30m, 45m, 60m, End of Current Track.
- During the final 60 seconds, smoothly fades master volume from current level down to 0.0001 using `gainNode.gain.exponentialRampToValueAtTime`, followed by a clean pause.
- Smooth visual countdown display with cancel option.

### 3.4 Harmonic Key Matching & BPM Engine (`src/core/audio/bpmDetector.ts`)
- In-browser rhythmic peak-energy detection & autocorrelation on audio buffer to detect BPM (60-200 BPM range).
- Frequency band energy profiling to estimate key and map to Camelot Wheel (1A-12A, 1B-12B).
- Harmonic compatibility helper (`isHarmonicallyCompatible(keyA, keyB)`) enabling DJ queue badges (Exact Match, Energy Boost +1, Relative Major/Minor).

### 3.5 Real-time Sync Listening Sessions (`src/services/syncPartyService.ts`)
- Supabase Realtime Broadcast channel (`listening-room:${roomId}`).
- Enables users to create or join a listening room.
- Auto-drift clock synchronization:
  - If listener's `currentTime` deviates by >150ms from host, gracefully adjust `playbackRate` (0.98x - 1.02x) until aligned.
  - If deviation > 2.0s, hard seek to host time.
- Offline / local fallback via `BroadcastChannel` for testing across browser tabs.

### 3.6 In-App ID3 Metadata & Artwork Editor (`src/components/library/MetadataEditorModal.tsx`)
- Modal for editing song title, artist, album, genre, and year, plus selecting or uploading artwork.
- Saves changes directly to OPFS file records and updates Dexie.js `tracks` table immediately.
- Emits player store updates so currently playing track reflects changes instantly.

---

## 4. Workstream 4: Python Automation & Data Pipelines

### 4.1 Enhanced `download_catalog.py` & `download_all_songs.py`
- Concurrent LRCLIB API fetch during download to save `.lrc` files alongside downloaded `.mp3` tracks.
- Integrated LUFS calculation via `ffmpeg -filter_complex ebur128=peak=true` filter, embedded into ID3 `TXXX:replaygain_track_gain`.
- Audio analysis in Python (via numpy) to estimate BPM and key, tagging ID3 `TBPM` and `TKEY` fields.

---

## 5. Non-Breaking Architecture & Verification Strategy
- Backward Compatibility: `src/lib/audioEngine.ts` exports `djAudioEngine` and all existing types, proxying to `src/core/audio/`.
- TypeScript verification: `npx tsc --noEmit` must pass with zero errors.
- Linter verification: `npm run lint` must pass with zero errors.
- Production build: `npm run build` must complete cleanly.
