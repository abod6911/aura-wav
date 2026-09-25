# AURA.WAV: Comprehensive Architectural Overhaul & Feature Expansion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute a complete, non-breaking architectural overhaul, performance upgrade (120 FPS target), and feature expansion across the AURA.WAV ecosystem across 4 workstreams.

**Architecture:** Refactor the 2,100+ line `audioEngine.ts` into a decoupled modular structure under `src/core/audio/` with an API-compatible facade. Add a high-performance WebGL shader ambient backdrop and 3D fluid audio visualizer. Implement LRCLIB synced lyrics caching, smart exponential fade-out sleep timer, Camelot Wheel harmonic key/BPM engine, Supabase Realtime listening rooms with auto-drift clock sync, in-app OPFS ID3 editor, and enhanced Python download pipelines.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Web Audio API, WebGL GLSL, Zustand, Dexie.js, OPFS, Supabase Realtime (`@supabase/supabase-js`), Python 3.12, ffmpeg (`ebur128`), mutagen, numpy.

## Global Constraints
- React 19 standards: functional components, clean effects, zero redundant re-renders.
- Strict TypeScript: zero `any`, fully typed interfaces and return values.
- Non-breaking architecture: `src/lib/audioEngine.ts` must maintain complete backwards compatibility with existing consumers.
- Bilingual UI preservation: maintain English/Arabic typography (`Readex Pro` & `Plus Jakarta Sans`) and preserve global LTR temporal playback behavior in RTL mode.
- Zero placeholder logic.

---

### Task 1: Core Audio Engine Refactoring & Modular Breakdown (`src/core/audio/`)

**Files:**
- Create: `src/core/audio/types.ts`
- Create: `src/core/audio/DeckChannel.ts`
- Create: `src/core/audio/dsp/AutoMixController.ts`
- Create: `src/core/audio/dsp/EffectsChain.ts`
- Create: `src/core/audio/dsp/HapticsEngine.ts`
- Create: `src/core/audio/dsp/LoudnessNormalizer.ts`
- Create: `src/core/audio/workers/audioTimer.worker.ts`
- Create: `src/core/audio/DJAudioEngineFacade.ts`
- Create: `src/core/audio/index.ts`
- Modify: `src/lib/audioEngine.ts` (convert to clean re-export facade with complete backward compatibility)

**Interfaces:**
- Consumes: `Track` from `src/types`, Dexie and OPFS storage APIs.
- Produces: `djAudioEngine`, `DJAudioEngine`, `EQ_BANDS`, `AutoMixStyle`, `ReverbSpace`.

- [ ] **Step 1: Create `src/core/audio/types.ts`**
  Define all channel interfaces, EQ presets, automix styles, reverb spaces, and engine callback definitions.

- [ ] **Step 2: Create `src/core/audio/workers/audioTimer.worker.ts`**
  Implement dedicated 20ms precision Web Worker audio clock emitting transition and position tick messages.

- [ ] **Step 3: Create `src/core/audio/DeckChannel.ts`**
  Encapsulate AudioNode graph for individual decks (A & B):
  - `MediaElementAudioSourceNode`, `AudioBufferSourceNode` (for preloaded memory buffers).
  - Preamp gain (normalization), Deck volume gain, BiquadFilterNode (DJ filter sweep), StereoPannerNode.
  - Strict node disposal and `.disconnect()` pipeline.

- [ ] **Step 4: Create `src/core/audio/dsp/AutoMixController.ts`**
  Implement math-accurate equal-power crossfader ($cos/sin$), vinyl brake deceleration simulation, resonant filter sweeps, and feedback delay echo-out.

- [ ] **Step 5: Create `src/core/audio/dsp/EffectsChain.ts`**
  Implement 5-band biquad EQ, hyperbolic tangent tube/tape warmth shaper (`Math.tanh`), procedural convolver reverb (studio, arena, car, vinyl lounge), dynamic bass boost compressor, and karaoke vocal cancellation.

- [ ] **Step 6: Create `src/core/audio/dsp/HapticsEngine.ts`**
  Implement FFT peak detector on sub-frequencies (60-120Hz) with dynamic energy thresholds and throttled `navigator.vibrate(25)`.

- [ ] **Step 7: Create `src/core/audio/dsp/LoudnessNormalizer.ts`**
  Implement ReplayGain / EBU R128 dynamic target (-14 LUFS) calculation and preamp gain node adjustment.

- [ ] **Step 8: Create `src/core/audio/DJAudioEngineFacade.ts` & `src/core/audio/index.ts`**
  Integrate dual decks, automated 15-second buffer preloading, AudioContext lifecycle resilience (`suspended`, tab visibility, wake-lock), and expose the unified `djAudioEngine` API.

- [ ] **Step 9: Refactor `src/lib/audioEngine.ts`**
  Turn `src/lib/audioEngine.ts` into a clean export facade re-exporting `djAudioEngine`, `DJAudioEngine`, and all constants from `src/core/audio/`.

- [ ] **Step 10: Verify TypeCheck on Audio Engine**
  Run `npx tsc --noEmit` and verify zero errors in audio modules.

---

### Task 2: Rendering Performance & UI/UX Ergonomics (120 FPS Target)

**Files:**
- Modify: `src/components/AtmosphereBackground.tsx`
- Modify: `src/components/player/TimelineSlider.tsx`
- Modify: `src/audio/mediaSession.ts`
- Modify: `src/services/storageManager.ts`

**Interfaces:**
- Consumes: `usePlayerStore`, `colorSampler`, `navigator.storage`, `navigator.mediaSession`.
- Produces: `useStorageStore`, optimized `AtmosphereBackground`, lag-free `TimelineSlider`.

- [ ] **Step 1: Refactor `AtmosphereBackground.tsx` to WebGL Fragment Shader / GPU Composite**
  Offload the ambient glow from the React render loop using a lightweight WebGL canvas shader with smooth chromatic blending and GPU compositing layers (`transform: translate3d(0,0,0)`).

- [ ] **Step 2: Upgrade `TimelineSlider.tsx` with Optimistic Scrubbing**
  Decouple visual scrub bar position and hover bubble from audio engine position during user pointer interactions. Emit `onSeek` strictly on `onPointerUp`/`onChangeEnd`. Eliminate pointer capture clipping and audio popping.

- [ ] **Step 3: Enhance `src/audio/mediaSession.ts`**
  Ensure multi-scale artwork arrays (96x96 to 512x512) are provided for watchOS/lock screen/CarPlay. Bind all native handlers (`play`, `pause`, `previoustrack`, `nexttrack`, `seekto`, `seekbackward`, `seekforward`, `stop`) and synchronize position state with throttled `setPositionState()`.

- [ ] **Step 4: Implement Reactive Storage Store in `storageManager.ts`**
  Create `useStorageStore` Zustand hook monitoring `navigator.storage.estimate()` (used bytes, quota percentage, remaining storage) and triggering visual warning flags when storage exceeds 90% quota.

---

### Task 3: Groundbreaking Functional Additions (New Modules)

**Files:**
- Create: `src/components/player/VisualizerCanvas.tsx`
- Create: `src/services/lyricsService.ts`
- Modify: `src/db/dexieDB.ts` (add `lyrics` table)
- Modify: `src/components/player/SleepTimerModal.tsx` & `src/components/SleepTimerModal.tsx`
- Create: `src/core/audio/bpmDetector.ts`
- Create: `src/services/syncPartyService.ts`
- Create: `src/components/library/MetadataEditorModal.tsx`
- Modify: `src/types/index.ts` (support `bpm`, `key`, `lufs`, `gain`)

**Interfaces:**
- Consumes: Web Audio `AnalyserNode`, LRCLIB API, Supabase Realtime, OPFS/Dexie.
- Produces: 3D Visualizer, Synced Lyrics service, Smart Sleep Timer, BPM/Camelot detector, Sync Listening service, Metadata editor modal.

- [ ] **Step 1: Install `@supabase/supabase-js`**
  Install dependency into `aura-wav/package.json`.

- [ ] **Step 2: Update `src/types/index.ts` and `src/db/dexieDB.ts`**
  Add `bpm`, `key`, `lufs`, and `gain` fields to `Track`. Add `lyrics` table to Dexie schema with `{ id: string, lrc: string, updatedAt: number }`.

- [ ] **Step 3: Create `src/components/player/VisualizerCanvas.tsx`**
  Build interactive 3D WebGL glass sphere/wave visualizer with sub-bass and mid-range audio reactivity, mouse/touch rotation, and dynamic palette synchronization.

- [ ] **Step 4: Create `src/services/lyricsService.ts`**
  Implement automatic synced lyrics fetcher: checks OPFS/local `.lrc` -> queries LRCLIB API (`https://lrclib.net/api/get`) -> caches in Dexie.js `lyrics` table.

- [ ] **Step 5: Enhance `SleepTimerModal.tsx` with Exponential Fade-Out**
  Implement countdown timer with options (15m, 30m, 45m, End of Current Track). In the final 60 seconds, trigger `gainNode.gain.exponentialRampToValueAtTime(0.0001, ...)` followed by clean pause.

- [ ] **Step 6: Create `src/core/audio/bpmDetector.ts`**
  Implement in-browser rhythmic peak energy detection, autocorrelation BPM calculation, Camelot Wheel harmonic key estimation (1A-12B), and harmonic compatibility checker.

- [ ] **Step 7: Create `src/services/syncPartyService.ts`**
  Implement Supabase Realtime broadcast listening rooms with auto-drift clock synchronization (adjusting `playbackRate` between 0.98x and 1.02x if drift > 150ms) and multi-tab fallback.

- [ ] **Step 8: Create `src/components/library/MetadataEditorModal.tsx`**
  Build ID3 metadata & artwork editor allowing users to modify title, artist, album, genre, year, and cover art, saving directly to OPFS files and updating Dexie.js indices.

---

### Task 4: Python Automation & Data Pipelines

**Files:**
- Modify: `download_catalog.py`
- Modify: `download_all_songs.py`

**Interfaces:**
- Consumes: `spotify_full_catalog_1750.csv`, `spotify_liked_tracks_full.json`, `ffmpeg`, `mutagen`, `numpy`.
- Produces: Downloaded 320kbps MP3s tagged with Title, Artist, Album, Genre, Track Number, ReplayGain (`TXXX:replaygain_track_gain`), BPM (`TBPM`), Camelot Key (`TKEY`), and accompanied by synced `.lrc` files.

- [ ] **Step 1: Enhance `download_catalog.py`**
  - Add concurrent LRCLIB API fetch to save `.lrc` files alongside downloaded `.mp3` tracks.
  - Add `ffmpeg -filter_complex ebur128=peak=true` filter execution to calculate integrated LUFS and tag `TXXX:replaygain_track_gain`.
  - Add numpy-based tempo/BPM and key analysis, writing ID3 `TBPM` and `TKEY` tags.

- [ ] **Step 2: Enhance `download_all_songs.py`**
  - Mirror the LRCLIB synced lyrics download, LUFS replaygain calculation, and BPM/Key tagging into `download_all_songs.py`.

- [ ] **Step 3: Test Python Scripts**
  Run `--help` or dry-run validation on both Python scripts to ensure imports and argument parsers succeed without errors.

---

### Task 5: Ecosystem UI Integration, Verification & Build

**Files:**
- Modify: `src/components/player/ExpandedPlayer.tsx`
- Modify: `src/components/PlayerBar.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/library/TrackList.tsx`
- Modify: `src/store/usePlayerStore.ts`

- [ ] **Step 1: Integrate New Modals and Visualizer into Player & UI**
  Wire `VisualizerCanvas`, `MetadataEditorModal`, `SleepTimerModal`, and storage quota warnings into the main UI and store actions.

- [ ] **Step 2: Run Full Typecheck (`npx tsc --noEmit`)**
  Ensure zero TypeScript compiler errors.

- [ ] **Step 3: Run Linter (`npm run lint`)**
  Ensure zero linter errors.

- [ ] **Step 4: Run Production Build (`npm run build`)**
  Verify complete Vite bundling and service worker generation.
