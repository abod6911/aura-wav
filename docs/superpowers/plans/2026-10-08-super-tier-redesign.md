# AURA.WAV Super-Tier Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AURA.WAV into a world-class, audiophile-grade music platform with Web Audio 3D spatial soundscapes, procedural environmental reverbs, karaoke vocal attenuation, floating crystal UI, interactive waveform timeline, and modern Bento discovery.

**Architecture:** Extend Web Audio DSP engine with a modular node graph (`SpatialReverbEngine`, `VocalAttenuator`, procedural impulse response generator). Connect the DSP nodes cleanly to `usePlayerStore`. Re-architect `PlayerBar`, `ExpandedPlayer`, and `SpotifyHomeView` with Apple Music / Spotify killer aesthetics, dynamic chromatic aura, 3D tilt physics, and 120fps spring micro-interactions.

**Tech Stack:** React 19, TypeScript, Web Audio API (Convolver, Panner, BiquadFilter, ChannelSplitter/Merger), Tailwind CSS, Framer Motion, Zustand, Vite.

## Global Constraints
- Must maintain offline functionality, PWA Service Worker caching, and zero-latency CDN streaming compatibility.
- Procedural audio DSP only — no external impulse response files to avoid network latency and offline failures.
- No layout shifts (CLS = 0) and smooth 60-120fps rendering across both mobile and desktop viewports.
- All code must pass `npm run build` and `npm run lint` with zero errors.

---

### Task 1: Spatial 3D Audio & Procedural Environmental Reverb Engine

**Files:**
- Create: `src/core/audio/dsp/SpatialReverbEngine.ts`
- Modify: `src/store/usePlayerStore.ts`
- Modify: `src/lib/audioEngine.ts`

**Interfaces:**
- Consumes: AudioContext from `audioEngine`
- Produces: `SpatialReverbEngine` class with `setMode(mode: 'off' | 'concert' | 'studio' | 'club' | '8d')`, `input: GainNode`, `output: GainNode`.

- [ ] **Step 1: Create `SpatialReverbEngine.ts` with procedural impulse generation and 8D panning**

Create `src/core/audio/dsp/SpatialReverbEngine.ts`:
```typescript
export type SpatialMode = 'off' | 'concert' | 'studio' | 'club' | '8d';

export class SpatialReverbEngine {
  private ctx: AudioContext;
  public input: GainNode;
  public output: GainNode;

  private dryGain: GainNode;
  private wetGain: GainNode;
  private convolver: ConvolverNode;
  private panner: StereoPannerNode;
  private lowBoost: BiquadFilterNode;

  private currentMode: SpatialMode = 'off';
  private animFrameId: number | null = null;
  private pannerAngle: number = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;

    this.convolver = ctx.createConvolver();
    this.panner = ctx.createStereoPanner();
    this.lowBoost = ctx.createBiquadFilter();
    this.lowBoost.type = 'lowshelf';
    this.lowBoost.frequency.value = 160;
    this.lowBoost.gain.value = 0;

    // Node graph:
    // input -> dryGain -> panner -> output
    // input -> convolver -> lowBoost -> wetGain -> panner
    this.input.connect(this.dryGain);
    this.input.connect(this.convolver);
    this.convolver.connect(this.lowBoost);
    this.lowBoost.connect(this.wetGain);

    this.dryGain.connect(this.panner);
    this.wetGain.connect(this.panner);
    this.panner.connect(this.output);
  }

  private generateImpulseResponse(durationSec: number, decayRate: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * durationSec);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const decay = Math.exp(-n * decayRate);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    return impulse;
  }

  public setMode(mode: SpatialMode) {
    this.currentMode = mode;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const t = this.ctx.currentTime + 0.05;

    switch (mode) {
      case 'off':
        this.dryGain.gain.setValueAtTime(1.0, t);
        this.wetGain.gain.setValueAtTime(0.0, t);
        this.lowBoost.gain.setValueAtTime(0, t);
        this.panner.pan.setValueAtTime(0, t);
        break;

      case 'concert':
        this.convolver.buffer = this.generateImpulseResponse(2.4, 3.8);
        this.dryGain.gain.setValueAtTime(0.85, t);
        this.wetGain.gain.setValueAtTime(0.48, t);
        this.lowBoost.gain.setValueAtTime(3.0, t);
        this.panner.pan.setValueAtTime(0, t);
        break;

      case 'studio':
        this.convolver.buffer = this.generateImpulseResponse(0.7, 5.5);
        this.dryGain.gain.setValueAtTime(0.95, t);
        this.wetGain.gain.setValueAtTime(0.22, t);
        this.lowBoost.gain.setValueAtTime(1.5, t);
        this.panner.pan.setValueAtTime(0, t);
        break;

      case 'club':
        this.convolver.buffer = this.generateImpulseResponse(1.5, 4.2);
        this.dryGain.gain.setValueAtTime(0.9, t);
        this.wetGain.gain.setValueAtTime(0.38, t);
        this.lowBoost.gain.setValueAtTime(6.0, t);
        this.panner.pan.setValueAtTime(0, t);
        break;

      case '8d':
        this.convolver.buffer = this.generateImpulseResponse(1.2, 4.5);
        this.dryGain.gain.setValueAtTime(0.88, t);
        this.wetGain.gain.setValueAtTime(0.35, t);
        this.lowBoost.gain.setValueAtTime(2.0, t);
        this.start8DAnimation();
        break;
    }
  }

  private start8DAnimation() {
    const animate = () => {
      if (this.currentMode !== '8d') return;
      this.pannerAngle += 0.015;
      const panValue = Math.sin(this.pannerAngle) * 0.85;
      this.panner.pan.setValueAtTime(panValue, this.ctx.currentTime);
      this.animFrameId = requestAnimationFrame(animate);
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  public getMode(): SpatialMode {
    return this.currentMode;
  }
}
```

- [ ] **Step 2: Add `spatialMode` and actions to `usePlayerStore.ts`**

Update `src/store/usePlayerStore.ts` to include:
- `spatialMode: SpatialMode` (default `'off'`)
- `setSpatialMode: (mode: SpatialMode) => void`
- Wire `setSpatialMode` to trigger `djAudioEngine.setSpatialMode(mode)`

- [ ] **Step 3: Connect `SpatialReverbEngine` into `src/lib/audioEngine.ts` / `AudioEngine.ts`**

Hook `SpatialReverbEngine` into the master output chain in `src/lib/audioEngine.ts`.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/audio/dsp/SpatialReverbEngine.ts src/store/usePlayerStore.ts src/lib/audioEngine.ts
git commit -m "feat(audio): add Web Audio procedural 3D spatializer and reverb rooms"
```

---

### Task 2: Real-Time Vocal Attenuator (Karaoke Sing Mode)

**Files:**
- Create: `src/core/audio/dsp/VocalAttenuator.ts`
- Modify: `src/store/usePlayerStore.ts`
- Modify: `src/lib/audioEngine.ts`

**Interfaces:**
- Produces: `VocalAttenuator` class with `setEnabled(active: boolean)`, `setLevel(level: number)`, `input: GainNode`, `output: GainNode`.

- [ ] **Step 1: Create `VocalAttenuator.ts` using Mid/Side phase cancellation**

Create `src/core/audio/dsp/VocalAttenuator.ts`:
```typescript
export class VocalAttenuator {
  private ctx: AudioContext;
  public input: GainNode;
  public output: GainNode;

  private bypassGain: GainNode;
  private processedGain: GainNode;
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;
  private inverter: GainNode;
  private bandpass: BiquadFilterNode;

  private isEnabled: boolean = false;
  private vocalReductionLevel: number = 0.85; // 0 (normal) to 1 (full cancellation)

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.bypassGain = ctx.createGain();
    this.bypassGain.gain.value = 1;

    this.processedGain = ctx.createGain();
    this.processedGain.gain.value = 0;

    // Mid/Side vocal cancellation: L - R cancels center content
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);

    this.inverter = ctx.createGain();
    this.inverter.gain.value = -1;

    // Vocal presence bandpass filter (approx 300Hz to 3500Hz)
    this.bandpass = ctx.createBiquadFilter();
    this.bandpass.type = 'bandpass';
    this.bandpass.frequency.value = 1000;
    this.bandpass.Q.value = 0.7;

    // Input connects to both bypass path and processing path
    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    this.input.connect(this.splitter);
    
    // Left minus Right (subtract center channel)
    const diffNode = ctx.createGain();
    this.splitter.connect(diffNode, 0); // +Left
    this.splitter.connect(this.inverter, 1); // -Right
    this.inverter.connect(diffNode);

    diffNode.connect(this.merger, 0, 0);
    diffNode.connect(this.merger, 0, 1);

    this.merger.connect(this.processedGain);
    this.processedGain.connect(this.output);
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    const t = this.ctx.currentTime + 0.05;
    if (enabled) {
      this.bypassGain.gain.setValueAtTime(1 - this.vocalReductionLevel, t);
      this.processedGain.gain.setValueAtTime(this.vocalReductionLevel, t);
    } else {
      this.bypassGain.gain.setValueAtTime(1.0, t);
      this.processedGain.gain.setValueAtTime(0.0, t);
    }
  }

  public setLevel(level: number) {
    this.vocalReductionLevel = Math.max(0, Math.min(1, level));
    if (this.isEnabled) {
      const t = this.ctx.currentTime + 0.05;
      this.bypassGain.gain.setValueAtTime(1 - this.vocalReductionLevel, t);
      this.processedGain.gain.setValueAtTime(this.vocalReductionLevel, t);
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }
}
```

- [ ] **Step 2: Add karaoke state to `usePlayerStore.ts`**

Update `src/store/usePlayerStore.ts` with `isKaraokeOpen: boolean`, `karaokeVocalLevel: number`, `setKaraokeActive`, `setKaraokeVocalLevel`.

- [ ] **Step 3: Wire into audio chain in `src/lib/audioEngine.ts`**

Connect `VocalAttenuator` after `DeckChannel` inputs and before `SpatialReverbEngine`.

- [ ] **Step 4: Verify TypeScript build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/audio/dsp/VocalAttenuator.ts src/store/usePlayerStore.ts src/lib/audioEngine.ts
git commit -m "feat(audio): add real-time center-channel vocal attenuator for karaoke mode"
```

---

### Task 3: Interactive Audio Waveform Timeline Scrubber

**Files:**
- Create: `src/components/player/WaveformTimeline.tsx`
- Modify: `src/components/player/TimelineSlider.tsx`

**Interfaces:**
- Consumes: `currentTime`, `duration`, `seek`, `accentColor`, `isPlaying`
- Produces: Visual waveform timeline bars with dynamic height, playhead glow, and mouse scrub preview.

- [ ] **Step 1: Create `WaveformTimeline.tsx`**

Build 64-bar pseudo-random seeded deterministic waveform generator per track id:
- Renders high-precision SVG/canvas bars.
- Bars before `currentTime / duration` filled with glowing accent color; future bars in glass opacity.
- Tooltip displays scrub timestamp on mouse move.

- [ ] **Step 2: Integrate into `TimelineSlider.tsx`**

Allow users to toggle between "Classic Slim Line" and "Audiophile Waveform" or render the waveform as the primary rich timeline.

- [ ] **Step 3: Test and verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/player/WaveformTimeline.tsx src/components/player/TimelineSlider.tsx
git commit -m "feat(ui): add interactive audio waveform timeline scrubber with dynamic glow"
```

---

### Task 4: Next-Gen Floating Crystal PlayerBar

**Files:**
- Modify: `src/components/PlayerBar.tsx`

- [ ] **Step 1: Modernize `PlayerBar.tsx` markup and styling**
- Convert to floating obsidian glass pill (`rounded-2xl`, subtle bottom margin on desktop).
- Add dynamic ambient glow layer (`box-shadow: 0 16px 40px -10px <accentColor>33`).
- Add vinyl spin animation to album cover when `isPlaying`.
- Add quick access pills:
  - Spatial Mode toggle button with tooltip (Off / Concert / Studio / Club / 8D).
  - Karaoke Sing Mode toggle button with microphone icon and active glow.
  - Lyrics toggle button.
  - Audio Settings / Equalizer button.

- [ ] **Step 2: Test and verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerBar.tsx
git commit -m "feat(ui): redesign PlayerBar into floating crystal dock with spatial and karaoke controls"
```

---

### Task 5: Cinematic ExpandedPlayer & Audiophile Sound Studio

**Files:**
- Modify: `src/components/player/ExpandedPlayer.tsx`

- [ ] **Step 1: Add 3D Parallax Tilt to Cover Art in `ExpandedPlayer.tsx`**
- Implement mouse move and touch parallax tilt (`transform: perspective(1000px) rotateX(...) rotateY(...)`).
- Add realistic ambient drop shadow that breathes in sync with audio beat.

- [ ] **Step 2: Add "Sound Studio" Sub-Panel**
- Interactive grid for Spatial Audio presets:
  - 🏛️ Concert Hall
  - 🎙️ Intimate Studio
  - 🎛️ Club Lounge
  - 🎧 8D Orbit
- Karaoke Sing Mode card:
  - Active toggle.
  - Vocal reduction slider (0% to 100%).
- Bass Boost / Warmth slider.

- [ ] **Step 3: Apple Music-style lyrics rendering**
- Enhance `lyrics` tab with glowing active lyric highlighting, smooth auto-scroll, and responsive typography.

- [ ] **Step 4: Test and verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/player/ExpandedPlayer.tsx
git commit -m "feat(ui): add 3D parallax tilt, audiophile studio panel, and cinematic lyrics to ExpandedPlayer"
```

---

### Task 6: Modern Bento Grid Home View & Mood Radar Filter

**Files:**
- Modify: `src/components/SpotifyHomeView.tsx`

- [ ] **Step 1: Add Mood / Vibe Radar Filter Bar**
Pills at the top of the home view:
- ⚡ طاقة وحماس (High Energy)
- 🌙 هدوء وليل (Midnight Chill)
- 🎧 تركيز وعمل (Deep Focus)
- 💔 ذكريات وحنين (Melancholy)
- 🚗 خط وسفر (Road Trip)
Clicking filters the catalog instantaneously.

- [ ] **Step 2: Build Bento Grid Layout**
- Hero Bento Card: "Mix of the Day" with dynamic color gradient, Play button, and track counter.
- Circular 3D Artist Cards with scale-up hover animations and glow rings.
- Dynamic Animated Equalizer bars on playing track row.

- [ ] **Step 3: Test and verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/SpotifyHomeView.tsx
git commit -m "feat(ui): add Bento Grid home layout, 3D artist cards, and Mood Radar filter"
```

---

### Task 7: Full System Verification & Production Build

**Files:**
- Check all modified files.

- [ ] **Step 1: Run linter**
Run: `npm run lint` in `aura-wav`
Expected: 0 warnings, 0 errors.

- [ ] **Step 2: Run production TypeScript and Vite build**
Run: `npm run build` in `aura-wav`
Expected: Build passes with dist output.

- [ ] **Step 3: Commit final integration**
```bash
git add -A
git commit -m "chore: complete super-tier transformation and verification"
```
