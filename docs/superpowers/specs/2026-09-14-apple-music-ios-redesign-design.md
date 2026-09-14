# AURA.WAV: Apple Music iOS Redesign & Full Bilingual (AR/EN) Specification

- **Date**: 2026-09-14
- **Status**: Validated & Approved
- **Scope**: Complete visual overhaul, Mobile-first iOS ergonomics, and Full Bilingual (Arabic ⇋ English) i18n architecture.

---

## 1. Executive Summary & Vision

AURA.WAV will undergo a complete transformation into a native-feeling, ultra-premium **Apple Music iOS** web audio experience. The app will prioritize mobile ergonomics (thumb-zone touch targets, floating glass elements, fluid gestures, and zero-delay haptics) while seamlessly scaling up to tablets and desktops.

Additionally, a comprehensive, native-grade **Bilingual System (Arabic ⇋ English)** will be integrated, supporting bidirectional layout switching (RTL ⇋ LTR), typography pairing (`Readex Pro` for Arabic, `Plus Jakarta Sans` for Latin), and professional audio terminology mirroring Apple Music and Spotify.

---

## 2. Visual Architecture & Design System (Liquid Glassmorphism)

### 2.1 Color Palette & Ambient Aura
- **Deep Base Canvas**: `#08080c` to `#121216` deep OLED obsidian for high contrast and battery efficiency.
- **Brand Accent**: Apple Music Crimson (`#FA243C` primary, `#FF375F` hover/glow) paired with Spotify Emerald (`#1DB954`) for audio DSP accents.
- **Dynamic Ambient Glow**: A multi-layered radial blurred backdrop (`blur(90px-120px)`) that extracts the dominant hue of the active track's artwork and diffuses it organically behind the UI with breathing opacity.
- **Glass Primitives**:
  - `glass-ios-card`: `rgba(255, 255, 255, 0.05)` with `backdrop-blur-2xl` and `border: 1px solid rgba(255, 255, 255, 0.08)`.
  - `glass-ios-dock`: `rgba(15, 15, 20, 0.85)` with `backdrop-blur-3xl` and `border-top: 1px solid rgba(255, 255, 255, 0.1)`.
  - `glass-ios-sheet`: Deep glass blur layer for modal dialogs and full-screen player sheets.

### 2.2 Typography & Directional Alignment (Arabic RTL + English LTR)
- **Arabic Typography**: Primary font `Readex Pro` with optical line heights (`1.6 - 1.8`) to ensure diacritics and ligatures do not clip.
- **Latin / Numeric Typography**: Primary font `Plus Jakarta Sans` for English titles, artist names, track timings, and numerical values.
- **Bidirectional Flipping**:
  - Document element updates: `html[dir="rtl"][lang="ar"]` vs `html[dir="ltr"][lang="en"]`.
  - Layout spacing: CSS logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`).
  - Media Controls Exception: Audio timeline scrubbing and playback control arrays remain strictly standardized in universal left-to-right temporal order.

---

## 3. Mobile-First Ergonomics & Component Specifications

### 3.1 Floating Glass Mini-Player (`MiniPlayer.tsx`)
- **Docking**: Floats persistently above the bottom navigation dock (`bottom-[78px] sm:bottom-[84px]`, margins on left/right `mx-3`).
- **Visuals**:
  - Rounded glass pill (`rounded-2xl`).
  - Hairline progress indicator on top edge (`h-[2.5px]` with glowing accent).
  - High-res artwork with curved corners (`w-11 h-11 rounded-xl`).
  - Track title (auto-scrolling marquee if truncated) + artist name.
  - Large tactile Play/Pause button (`44px` hit target) and Next Track button.
- **Gestures**:
  - Tap or **Swipe Up** smoothly transitions into the full-screen Expanded Player sheet via Framer Motion spring physics.

### 3.2 Full-Screen iOS Player Sheet (`ExpandedPlayer.tsx`)
- **Header**:
  - Drag handle indicator (pill grab-bar) at the very top.
  - Collapse chevron button (`ChevronDown`) for one-tap dismissal.
  - Centered album / playlist name with subtle typography.
  - Quick action menu button for Audio Settings / Equalizer.
- **Artwork Stage**:
  - Generous squircle artwork (`rounded-3xl`) with dynamic specular border and 3D floating shadow.
  - Swipe gestures: Swipe left for next track, swipe right for previous track.
  - DSP status badges: Vocal Isolation (Karaoke), Analog Warmth %, 3D Reverb Space.
- **Metadata & Favorite**:
  - Large bold title (`text-2xl font-black`) + readable artist label.
  - Favorite Heart with spring scale feedback animation on toggle.
- **Scrubber & Playback Controls**:
  - Thick, tactile scrub bar (`TimelineSlider`) with prominent thumb for comfortable thumb seeking.
  - Elapsed and remaining time in clean mono/sans numerals.
  - Apple Music style extra-large center Play/Pause (`w-18 h-18 rounded-full`), flanked by Skip Previous/Next, Shuffle, and Repeat mode buttons.
- **Footer Toolbar**:
  - Direct toggle button for **Live Synced Lyrics** (`Mic2`).
  - Direct toggle button for **Vocal Isolation / Karaoke** (`MicOff`).
  - Quick access buttons for **Equalizer & DSP** (`Sliders`) and **Queue** (`ListMusic`).
- **Dismissal Physics**:
  - Drag down gesture with threshold velocity detection to minimize back to the mini-player.

### 3.3 Floating Glass Navigation Dock (`MobileNavDock.tsx`)
- Fixed at the bottom of the viewport with strict iOS safe-area support (`pb-[calc(env(safe-area-inset-bottom,8px)+6px)]`).
- Four core tabs:
  1. **Listen Now / الرئيسية**: Home showcase and curated carousels.
  2. **Search / بحث**: Instant search and genre exploration.
  3. **Library / مكتبتي**: Offline tracks, folders, and albums.
  4. **Favorites / المفضلة**: Liked songs quick view.
- Tactile bounce micro-interaction on tab switch + haptic vibration (`navigator.vibrate(8)`).

### 3.4 Home Screen "Listen Now" (`SpotifyHomeView.tsx`)
- **Top Greeting & Header Bar**:
  - Time-aware dynamic greeting ("Good Morning" / "Good Evening" / "صباح الخير" / "مساء الخير").
  - Integrated settings button, quick import folder button, and sleep timer indicator.
- **Hero Spotlight Showcase**:
  - Grand visual banner highlighting the currently active track or top playlist with frosted glass backdrop and prominent instant-play button.
- **Horizontal Snap Carousels (`scroll-snap-x`)**:
  - **Recently Played**: Sleek square cards with smooth horizontal glide.
  - **Top Artists**: Circular artist bubbles with gradient borders.
  - **Genres & Moods**: Vibrantly colored bento cards (Pop, Hip-Hop, Rock, EDM, R&B).
- **Track Lists & Lists of Songs**:
  - 60px thumb-friendly touch rows with artwork, title, artist, duration, and touch feedback.

---

## 4. Bilingual Internationalization System (i18n)

### 4.1 Architecture
- Central translation module at `src/i18n/index.ts` with full type safety (`TranslationKeys`).
- Supported locales:
  - `ar`: العربية (Arabic - Default)
  - `en`: English (US - Native music player terminology)
- Persisted in `usePlayerStore` and `localStorage.getItem('aura_lang')`.
- Hook / helper `useTranslation()` returning current locale, translated strings, and `setLanguage()`.

### 4.2 Translation Matrix Coverage
- **Navigation**: Listen Now / الرئيسية, Search / بحث, Your Library / مكتبتك, Liked Songs / الأغاني المفضلة, Settings / الإعدادات.
- **Player**: Play / تشغيل, Pause / إيقاف مؤقت, Next / التالي, Previous / السابق, Shuffle / خلط, Repeat / تكرار, Vocal Isolation / عزل الصوت (كاريوكي), Lyrics / الكلمات, Queue / قائمة الانتظار, Equalizer / المعادل الصوتي.
- **Dialogs & Toasts**: Storage info, import instructions, sleep timer countdown, offline status, folder scan progress.

### 4.3 Settings Modal (`SettingsModal.tsx`)
- **iOS Grouped Card Layout**:
  - **Language & Display**: Language picker with segmented pill button (العربية / English), ambient glow toggle.
  - **Pro Audio Engine**: AutoMix transition style, Crossfade duration slider, Analog Warmth, 3D Reverb.
  - **Library & Storage**: Stored songs count, cached audio storage usage (MB), Re-scan folder, Clear cache.
  - **About AURA.WAV**: Version 2.0, Progressive Web App offline guarantee.

---

## 5. Verification & Testing Plan

1. **Mobile Responsiveness Verification**:
   - Verify layout on 375px (iPhone SE), 390px (iPhone 14/15), 414px (iPhone Plus/Max), and 768px+ (iPad/Desktop).
   - Confirm safe-area padding avoids dynamic island and home indicator overlap.
2. **Gesture & Ergonomics Testing**:
   - Verify swipe up on mini-player opens sheet; swipe down closes sheet.
   - Verify swipe left/right on album art changes tracks smoothly.
   - Confirm all tap targets are >= 44x44px.
3. **Bilingual & Directional Testing**:
   - Switch language to English: verify `dir="ltr"`, font switches to `Plus Jakarta Sans`, all labels render in fluent English, audio controls remain intuitive.
   - Switch language back to Arabic: verify `dir="rtl"`, font switches to `Readex Pro`, right-aligned text and mirrored icons.
4. **Build & Quality Check**:
   - `npm run build` / `oxlint` with zero errors.
