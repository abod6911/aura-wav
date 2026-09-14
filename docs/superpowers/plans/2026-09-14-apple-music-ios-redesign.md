# Apple Music iOS Experience & Full Bilingual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AURA.WAV into a world-class, ultra-premium Apple Music iOS web audio experience with mobile-first ergonomics, dynamic ambient glow, fluid gestures, and a native-grade bilingual (Arabic ⇋ English) system.

**Architecture:**
1. Unified i18n translation engine with instant bidirectional RTL/LTR layout flipping and typography switching (`Readex Pro` ⇋ `Plus Jakarta Sans`).
2. Liquid glassmorphism CSS design system (`backdrop-blur-3xl`, multi-layer specular borders, safe-area insets).
3. Mobile-first interactive shell: Floating Glass Mini-Player + Full-Screen iOS Sheet Player with swipe gestures, haptics, and thumb-friendly controls.
4. "Listen Now" home screen overhaul featuring a Hero Spotlight Showcase and horizontal snap carousels.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, Lucide React, Web Audio API / DSP.

## Global Constraints
- Every UI label must support both Arabic (`ar`) and English (`en`) via the translation store.
- Audio timeline scrubbing and playback control bars must always maintain universal left-to-right temporal progression.
- Minimum mobile touch target must be 44x44px.
- Zero Oxlint or TypeScript compilation errors (`npm run build` must succeed).
- Strict adherence to iOS safe areas (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).

---

### Task 1: Bilingual i18n Foundation & Glassmorphism Design System

**Files:**
- Create: `src/i18n/translations.ts`
- Create: `src/i18n/useTranslation.ts`
- Modify: `src/store/usePlayerStore.ts`
- Modify: `index.html`
- Modify: `src/index.css`
- Modify: `tailwind.config.js`

**Interfaces:**
- Produces: `useTranslation()` hook returning `{ t, language, setLanguage, isRTL, dir }`.
- Produces: `usePlayerStore.getState().language` and `usePlayerStore.getState().setLanguage(lang: 'ar' | 'en')`.
- Produces: CSS classes `.glass-ios-card`, `.glass-ios-dock`, `.glass-ios-sheet`, `.ambient-glow-mesh`.

- [ ] **Step 1: Create translations dictionary**
Create `src/i18n/translations.ts` with complete Arabic and English dictionary covering all navigation, player controls, settings, DSP labels, and toasts.

- [ ] **Step 2: Create useTranslation hook and integrate into Zustand store**
Update `src/store/usePlayerStore.ts` with `language: 'ar' | 'en'` persisted in `localStorage`. Create `src/i18n/useTranslation.ts` to automatically update `document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')` and `document.documentElement.setAttribute('lang', lang)`.

- [ ] **Step 3: Update `index.html`, `index.css`, and `tailwind.config.js`**
Add Google Fonts (`Readex Pro` and `Plus Jakarta Sans`), define CSS glass tokens, Apple red palette (`#FA243C`), and safe-area utilities.

- [ ] **Step 4: Verify TypeScript compilation**
Run: `npm run lint`
Expected: PASS with zero errors.

- [ ] **Step 5: Commit foundation changes**
```bash
git add src/i18n src/store/usePlayerStore.ts index.html src/index.css tailwind.config.js
git commit -m "feat(i18n): add bilingual translation engine and iOS liquid glassmorphism design tokens"
```

---

### Task 2: iOS Grouped Settings Modal & Language Switcher

**Files:**
- Modify: `src/components/SettingsModal.tsx`

**Interfaces:**
- Consumes: `useTranslation()`, `usePlayerStore.setLanguage`.
- Produces: Visual iOS grouped preferences card modal with live segmented language toggle (العربية / English), audio DSP toggles, and storage gauge.

- [ ] **Step 1: Refactor `SettingsModal.tsx` to iOS grouped card design**
Implement segmented pill button for Language Selection (`العربية` | `English`) that switches UI language immediately with smooth feedback.
Add sections:
1. Language & Appearance (Segmented toggle, ambient glow toggle).
2. Pro Audio & DSP (AutoMix, Vocal Isolation, Analog Warmth indicator).
3. Library & Storage (Calculated cache usage in MB, re-scan button, clear storage).
4. About AURA.WAV (Version 2.0, offline PWA badge).

- [ ] **Step 2: Test language toggle and persistence**
Verify clicking `English` switches document direction to LTR and updates text. Verify clicking `العربية` switches back to RTL.

- [ ] **Step 3: Commit Settings Modal changes**
```bash
git add src/components/SettingsModal.tsx
git commit -m "feat(settings): overhaul SettingsModal with iOS grouped cards and bilingual switcher"
```

---

### Task 3: Translucent Apple-Style Header Bar

**Files:**
- Modify: `src/components/Header.tsx`

**Interfaces:**
- Consumes: `useTranslation()`, `usePlayerStore`.
- Produces: Translucent glass header bar with bilingual dynamic greetings, profile/settings trigger, quick import folder button, sleep timer status, and search trigger.

- [ ] **Step 1: Overhaul `Header.tsx`**
Update mobile and desktop headers with:
- Dynamic time-aware greeting in active language ("Good Morning" / "صباح الخير").
- Clean brand indicator `AURA.WAV` with red glass accent.
- Quick import folder button with folder name and track count.
- Sleep timer pill badge with active countdown.
- Settings button with avatar trigger.

- [ ] **Step 2: Test Header responsiveness**
Ensure header scales cleanly from 375px mobile screens to wide desktop layouts.

- [ ] **Step 3: Commit Header changes**
```bash
git add src/components/Header.tsx
git commit -m "feat(header): revamp Header with Apple Music translucent aesthetic and bilingual support"
```

---

### Task 4: Floating Glass Mini-Player with Marquee & Gestures

**Files:**
- Modify: `src/components/player/MiniPlayer.tsx`
- Modify: `src/components/MobilePlayerSheet.tsx` (sync with MiniPlayer)

**Interfaces:**
- Consumes: `usePlayerStore` (track, isPlaying, progress, nextTrack, togglePlayPause).
- Produces: Floating glass pill docked above bottom navigation (`bottom-[78px]`), with glowing hairline progress bar, auto-marquee title, rounded artwork, play/pause, next track, and swipe-up to expand gesture.

- [ ] **Step 1: Overhaul `MiniPlayer.tsx`**
Style with `glass-ios-card`, position at `bottom-[78px]`, add `framer-motion` swipe-up gesture (`drag="y"`, `dragConstraints={{ top: 0, bottom: 0 }}`) to trigger `setMobilePlayerOpen(true)`.
Add top hairline progress bar with track dominant accent color.

- [ ] **Step 2: Verify touch interaction and animations**
Verify tapping anywhere (except play/next buttons) or dragging up smoothly opens the expanded player.

- [ ] **Step 3: Commit MiniPlayer changes**
```bash
git add src/components/player/MiniPlayer.tsx
git commit -m "feat(player): upgrade MiniPlayer with floating liquid glass, top progress line, and swipe-up gesture"
```

---

### Task 5: Full-Screen Apple Music Mobile Player Sheet (`ExpandedPlayer.tsx`)

**Files:**
- Modify: `src/components/player/ExpandedPlayer.tsx`
- Modify: `src/components/player/TimelineSlider.tsx`

**Interfaces:**
- Consumes: `useTranslation()`, `usePlayerStore`, `djAudioEngine`.
- Produces: Full-screen iOS modal sheet with:
  - Sheet grab handle + ChevronDown collapse button.
  - Deep dynamic ambient blur backdrop extracted from album artwork.
  - Large squircle artwork (`rounded-3xl`) with 3D drop shadow and swipe left/right to skip tracks.
  - Apple Music style oversized center play/pause button (`w-18 h-18`).
  - Tactile thumb scrubber bar (`TimelineSlider.tsx`).
  - Direct quick action toolbar: Synced Lyrics, Vocal Isolation (Karaoke), Queue drawer, and Equalizer/DSP.

- [ ] **Step 1: Refactor `ExpandedPlayer.tsx`**
Update layout to match native iOS 18 Apple Music full-screen sheet with drag-down to close physics (`drag="y"`, `dragElastic={0.4}`, onDragEnd threshold).
Add dominant color ambient glow radiating behind artwork.
Ensure all labels and tooltips use `useTranslation()`.

- [ ] **Step 2: Update `TimelineSlider.tsx` for mobile thumb ergonomics**
Ensure scrubber slider has comfortable hit area, smooth dragging without stutter, and clean mono timestamps in active language.

- [ ] **Step 3: Verify gestures and audio control actions**
Verify swipe left/right skips tracks, swipe down collapses sheet, and play/pause/seek work instantaneously.

- [ ] **Step 4: Commit ExpandedPlayer changes**
```bash
git add src/components/player/ExpandedPlayer.tsx src/components/player/TimelineSlider.tsx
git commit -m "feat(player): overhaul ExpandedPlayer with iOS sheet physics, ambient glow, and tactile scrubber"
```

---

### Task 6: Mobile Floating Glass Navigation Dock (`MobileNavDock.tsx`)

**Files:**
- Modify: `src/components/MobileNavDock.tsx`

**Interfaces:**
- Consumes: `useTranslation()`, `usePlayerStore`.
- Produces: Floating glass bottom dock with 4 primary tabs:
  1. Listen Now / الرئيسية (`Home`)
  2. Search / بحث (`Search`)
  3. Library / مكتبتك (`Library`)
  4. Favorites / المفضلة (`Heart`)

- [ ] **Step 1: Overhaul `MobileNavDock.tsx`**
Apply `glass-ios-dock` with backdrop blur, safe-area bottom padding (`env(safe-area-inset-bottom)`), Spring tap micro-interactions, haptic feedback (`navigator.vibrate(8)`), and bilingual labels.

- [ ] **Step 2: Test tab switching and responsive visibility**
Verify active tab indicator uses Apple red / emerald accent, and dock is hidden on desktop (`md:hidden`).

- [ ] **Step 3: Commit MobileNavDock changes**
```bash
git add src/components/MobileNavDock.tsx
git commit -m "feat(nav): modernize MobileNavDock with floating liquid glass and iOS spring haptics"
```

---

### Task 7: Apple Music "Listen Now" Home View (`SpotifyHomeView.tsx`)

**Files:**
- Modify: `src/components/SpotifyHomeView.tsx`

**Interfaces:**
- Consumes: `useTranslation()`, `usePlayerStore`.
- Produces: Apple Music "Listen Now" home view with:
  - Hero Spotlight Showcase card with frosted glass play button and dynamic ambient glow.
  - Horizontal snap carousels (`scroll-snap-x`):
    - Recently Played (smooth square cards).
    - Top Artists (circular avatars with gradient ring).
    - Curated Genres & Moods (vibrant bento cards).
    - Liked Songs quick access card.
  - Modern responsive track cards with thumb-friendly touch targets.

- [ ] **Step 1: Redesign `SpotifyHomeView.tsx` to Apple Music "Listen Now"**
Implement the Hero Spotlight banner and horizontal snap carousels with smooth scrolling, card hover/active elevation, and bilingual headers.

- [ ] **Step 2: Test on mobile viewports**
Verify horizontal carousels swipe smoothly with touch and snap correctly without breaking horizontal page boundaries.

- [ ] **Step 3: Commit Home View changes**
```bash
git add src/components/SpotifyHomeView.tsx
git commit -m "feat(home): transform home view to Apple Music Listen Now with Hero Spotlight and snap carousels"
```

---

### Task 8: Search, Library & Synced Lyrics UI Refinement

**Files:**
- Modify: `src/components/InfiniteSearchView.tsx`
- Modify: `src/components/library/TrackList.tsx`
- Modify: `src/components/lyrics/SyncedLyrics.tsx`

**Interfaces:**
- Consumes: `useTranslation()`, `usePlayerStore`.
- Produces: Consistent Apple Music glass styling across Search, Library, and full-screen Synced Lyrics.

- [ ] **Step 1: Update Search & Library views**
Apply rounded glass search input with instant clear button, iOS segmented filter pills, and 60px touch rows with swipe actions.

- [ ] **Step 2: Update Synced Lyrics for Apple Music karaoke experience**
Style lyrics with large fluid typography, blurred inactive lines, vibrant glowing active line, and tap-to-seek timestamp alignment.

- [ ] **Step 3: Commit Search, Library, and Lyrics refinements**
```bash
git add src/components/InfiniteSearchView.tsx src/components/library/TrackList.tsx src/components/lyrics/SyncedLyrics.tsx
git commit -m "feat(ui): refine Search, Library, and SyncedLyrics with Apple Music glass styling and bilingual text"
```

---

### Task 9: Full Verification, Build Validation & Quality Assurance

**Files:**
- Test all components across mobile (375px, 390px, 414px) and desktop (1280px+).

- [ ] **Step 1: Run linter and typecheck**
Run: `npm run lint` and `npx tsc --noEmit`
Expected: Zero warnings or errors.

- [ ] **Step 2: Run production build**
Run: `npm run build`
Expected: Build succeeds and generates `/dist` assets without issues.

- [ ] **Step 3: Final verification commit**
```bash
git commit --allow-empty -m "chore: verify full Apple Music iOS redesign and bilingual implementation"
```
