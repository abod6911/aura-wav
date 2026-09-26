# Apple CarPlay & In-Car Dashboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Apple CarPlay compatibility for AURA.WAV, providing native CarPlay dashboard support (iOS Swift templates, steering wheel controls, and Capacitor bridge) together with a dedicated high-contrast, distraction-free in-app Car Mode with screen wake lock and gesture navigation for dashboard-mounted iPhones.

**Architecture:** A unified dual-channel model:
1. Native iOS Layer: Uses Apple's CarPlay framework (`CPTemplateApplicationSceneDelegate`, `CPTabBarTemplate`, `CPListTemplate`, `CPNowPlayingTemplate`) via Capacitor bridge (`CarPlayBridgePlugin.swift`) with background audio entitlement (`com.apple.developer.carplay-audio`).
2. Web/In-App Layer: Full-screen `CarPlayMode.tsx` component with Screen Wake Lock (`navigator.wakeLock`), responsive Landscape/Portrait layouts, touch targets $\ge 64\text{px}$, swipe gestures, and synced state via `usePlayerStore`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Capacitor 6/7 (`@capacitor/core`, `@capacitor/ios`), Apple CarPlay Framework (Swift 5.9+), Web Screen Wake Lock API, MediaSession API.

## Global Constraints
- Studio Master Audio (0.0 dBFS) graph integrity must remain untouched.
- Touch targets in Car Mode must strictly be $\ge 64\text{px} \times 64\text{px}$ to comply with in-car ergonomic safety.
- Screen Wake Lock must acquire cleanly and release gracefully on exit without blocking the UI thread.
- Zero compilation errors on `npm run build`.

---

### Task 1: Store & State Foundation for Car Mode

**Files:**
- Modify: `src/store/usePlayerStore.ts`
- Test: `scripts/testCarPlayState.mjs`

**Interfaces:**
- Produces: `isCarModeOpen: boolean`, `setCarModeOpen: (open: boolean) => void`, `toggleCarMode: () => void`.

- [ ] **Step 1: Write verification test for Car Mode state in store**
Create `scripts/testCarPlayState.mjs`:
```javascript
import { usePlayerStore } from '../src/store/usePlayerStore.ts';
// Ensure initial isCarModeOpen is false, toggle works, and setCarModeOpen functions correctly
```

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/testCarPlayState.mjs`
Expected: FAIL ("isCarModeOpen is not a property of usePlayerStore").

- [ ] **Step 3: Update `src/store/usePlayerStore.ts` with Car Mode state**
Add `isCarModeOpen: boolean;` and `setCarModeOpen: (open: boolean) => void; toggleCarMode: () => void;` to `PlayerStore` interface and implementation.

- [ ] **Step 4: Run test to verify it passes**
Run: `node scripts/testCarPlayState.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/store/usePlayerStore.ts scripts/testCarPlayState.mjs
git commit -m "feat(carplay): add car mode state to player store"
```

---

### Task 2: Build the High-Contrast In-App Car Mode Component (`CarPlayMode.tsx`)

**Files:**
- Create: `src/components/carplay/CarPlayMode.tsx`
- Modify: `src/App.tsx`
- Test: `scripts/testCarPlayModeRender.mjs`

**Interfaces:**
- Consumes: `usePlayerStore` (currentTrack, isPlaying, playTrack, togglePlay, nextTrack, previousTrack, isCarModeOpen, setCarModeOpen, isFavorite, toggleFavorite, queue, tracks).
- Produces: `<CarPlayMode />` component supporting landscape/portrait, WakeLock, gesture swipe, and quick playlist picker.

- [ ] **Step 1: Write test to verify CarPlayMode rendering and WakeLock hook**
Create `scripts/testCarPlayModeRender.mjs` to mount the component in a simulated headless environment and test props/state.

- [ ] **Step 2: Run test to verify failure**
Run: `node scripts/testCarPlayModeRender.mjs`
Expected: FAIL (CarPlayMode module not found).

- [ ] **Step 3: Implement `src/components/carplay/CarPlayMode.tsx`**
Implement full Car Mode:
- Screen Wake Lock API (`navigator.wakeLock.request('screen')`) on mount, release on unmount.
- Landscape 16:9 layout (two-column: left column album artwork + track details + progress; right column oversized transport controls + quick drawer).
- Portrait layout (stacked: top header with speed/clock + giant artwork + progress + giant controls + quick drawer).
- Touch targets $\ge 64\text{px}$ with glowing active states and high-contrast labels.
- Touch swipe handlers (`onTouchStart`, `onTouchEnd`) to trigger next/previous track.
- Exit Car Mode button with clear contrast.

- [ ] **Step 4: Mount in `src/App.tsx`**
Render `<CarPlayMode />` conditionally when `isCarModeOpen` is true with `<AnimatePresence>`.

- [ ] **Step 5: Run tests and verify rendering**
Run: `node scripts/testCarPlayModeRender.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/components/carplay/CarPlayMode.tsx src/App.tsx scripts/testCarPlayModeRender.mjs
git commit -m "feat(carplay): implement in-app CarPlayMode with wake lock and ergonomic controls"
```

---

### Task 3: Entry Points in Header & ExpandedPlayer

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/player/ExpandedPlayer.tsx`
- Test: `scripts/testCarPlayButtons.mjs`

**Interfaces:**
- Consumes: `usePlayerStore.getState().toggleCarMode()`.

- [ ] **Step 1: Write test to verify Car Mode button presence**
Create `scripts/testCarPlayButtons.mjs` using Playwright to inspect Header and ExpandedPlayer for the Car Mode button.

- [ ] **Step 2: Run test to verify failure**
Run: `node scripts/testCarPlayButtons.mjs`
Expected: FAIL (Car Mode button not present).

- [ ] **Step 3: Add Car Mode button to `Header.tsx` and `ExpandedPlayer.tsx`**
Add a car icon button (`Car` from `lucide-react`) with tooltip "وضع السيارة / CarPlay Mode":
- In `Header.tsx`: placed next to Sleep Timer and Settings.
- In `ExpandedPlayer.tsx`: placed in the action bar next to Equalizer and Sleep Timer.

- [ ] **Step 4: Run test to verify passes**
Run: `node scripts/testCarPlayButtons.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/Header.tsx src/components/player/ExpandedPlayer.tsx scripts/testCarPlayButtons.mjs
git commit -m "feat(carplay): add Car Mode triggers to Header and ExpandedPlayer"
```

---

### Task 4: Native iOS Capacitor & CarPlay Scaffolding

**Files:**
- Create: `capacitor.config.ts`
- Create: `ios/App/App/CarPlaySceneDelegate.swift`
- Create: `ios/App/App/CarPlayBridgePlugin.swift`
- Create: `ios/App/App/App.entitlements`
- Modify: `ios/App/App/Info.plist` (or create scaffolding)
- Create: `src/services/carPlayBridge.ts`
- Test: `scripts/testCarPlayNativeBridge.mjs`

**Interfaces:**
- Consumes: `Capacitor`, `usePlayerStore`.
- Produces: Two-way communication between iOS Swift CarPlay framework and web player.

- [ ] **Step 1: Write test for `src/services/carPlayBridge.ts`**
Create `scripts/testCarPlayNativeBridge.mjs` to test sync functions and listener bindings.

- [ ] **Step 2: Run test to verify failure**
Run: `node scripts/testCarPlayNativeBridge.mjs`
Expected: FAIL (`carPlayBridge.ts` not found).

- [ ] **Step 3: Setup Capacitor and iOS files**
1. Add `capacitor.config.ts`:
   - `appId: 'com.aurawav.player'`
   - `appName: 'AURA.WAV'`
   - `webDir: 'dist'`
2. Implement `src/services/carPlayBridge.ts`:
   - Graceful fallback when not in native iOS wrapper.
   - Syncs tracks to native CarPlay (`syncLibrary`, `syncFavorites`).
   - Syncs playback state (`updatePlaybackState`).
   - Listens for CarPlay remote events (`playTrack`, `togglePlay`, `next`, `prev`).
3. Scaffold `ios/App/App/CarPlaySceneDelegate.swift`:
   - `CPTemplateApplicationSceneDelegate` implementation.
   - TabBarTemplate with Library and Favorites.
   - NowPlayingTemplate connection and `MPRemoteCommandCenter` handlers.
4. Scaffold `ios/App/App/CarPlayBridgePlugin.swift`:
   - Capacitor plugin exposing bridge endpoints.
5. Create `ios/App/App/App.entitlements` with `com.apple.developer.carplay-audio`.

- [ ] **Step 4: Run test to verify passes**
Run: `node scripts/testCarPlayNativeBridge.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add capacitor.config.ts ios/ src/services/carPlayBridge.ts scripts/testCarPlayNativeBridge.mjs
git commit -m "feat(carplay): setup Capacitor and native iOS Apple CarPlay templates and bridge"
```

---

### Task 5: End-to-End Build & Visual Verification

**Files:**
- Test: `scripts/verifyCarPlayE2E.mjs`

- [ ] **Step 1: Write E2E test for Car Mode Landscape and Portrait in Playwright**
Create `scripts/verifyCarPlayE2E.mjs` to:
- Open application on mobile portrait viewport ($390\times 844$).
- Trigger Car Mode and verify full-screen display, giant buttons, and wake lock.
- Rotate viewport to landscape ($844\times 390$) and capture screenshot.
- Verify touch targets $\ge 64\text{px}$.

- [ ] **Step 2: Execute E2E test**
Run: `node scripts/verifyCarPlayE2E.mjs`
Expected: PASS and generate verification screenshots.

- [ ] **Step 3: Execute `npm run build`**
Run: `npm run build`
Expected: PASS with 0 compilation errors.

- [ ] **Step 4: Commit**
```bash
git add scripts/verifyCarPlayE2E.mjs
git commit -m "test(carplay): add end-to-end verification tests and visual audits"
```
