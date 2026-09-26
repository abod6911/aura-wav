# Apple CarPlay & In-Car Dashboard Integration Design Document

**Date:** 2026-09-26  
**Status:** Approved  
**Author:** Antigravity Team  
**Project:** AURA.WAV Studio Master Audio Player  

---

## 1. Executive Summary

This document specifies the end-to-end design for bringing **Apple CarPlay** support to AURA.WAV. The solution provides a dual-layer driving experience:
1. **Native Apple CarPlay Dashboard Integration (iOS Swift + CarPlay Framework)**: When connected via cable or Wireless CarPlay, AURA.WAV appears directly on the car's infotainment screen as a first-class media app. Drivers can browse tracks, explore favorites, and control playback via the car's touchscreen, rotary controller (e.g. BMW iDrive, Audi MMI), and steering wheel buttons.
2. **Apple CarPlay-Styled In-App Car Mode (Web / Mobile UI)**: When the iPhone is mounted on a car dash mount, a dedicated high-contrast, distraction-free Car Mode provides giant touch targets ($\ge 64\text{px}$), swipe gestures, and active Screen Wake Lock (`navigator.wakeLock`) to keep the display on during journeys.

---

## 2. System Architecture

```
+--------------------------------------------------------------------------------+
|                                Car Infotainment                                |
|  [Steering Wheel Controls]       [Car Display (16:9 / 21:9)]       [Rotary Knob] |
+----------------------------------------+---------------------------------------+
                                         | Apple CarPlay Protocol (USB / Wireless)
+----------------------------------------v---------------------------------------+
|                               iPhone iOS App                                   |
|                                                                                |
|  +--------------------------------------------------------------------------+  |
|  |               CarPlaySceneDelegate.swift (CarPlay Framework)             |  |
|  |  - CPTemplateApplicationSceneDelegate                                     |  |
|  |  - CPTabBarTemplate: [ المكتبة (Tracks), المفضلة (Favorites) ]             |  |
|  |  - CPNowPlayingTemplate.shared: High-Res Cover, Scrubber, Transport Ctrl |  |
|  |  - MPRemoteCommandCenter: Next, Prev, Play/Pause, Seek                   |  |
|  +-------------------------------------+------------------------------------+  |
|                                        | Bi-directional Event Channel          |
|  +-------------------------------------v------------------------------------+  |
|  |                     CarPlayBridgePlugin.swift (Capacitor)                |  |
|  |  - Exports: syncLibrary(tracks), syncFavorites(tracks), updateState()    |  |
|  |  - Events: onCarPlayPlayTrack(id), onCarPlayTogglePlay()                |  |
|  +-------------------------------------+------------------------------------+  |
|                                        | Capacitor JavaScript Bridge           |
|  +-------------------------------------v------------------------------------+  |
|  |                        AURA.WAV Web Application                         |  |
|  |  - usePlayerStore / audioGraphEngine (0.0 dBFS Studio Master)             |  |
|  |  - mediaSession.ts (MediaSession API for fallback & system OS)           |  |
|  |  - CarPlayMode.tsx (Full-screen In-Car driving interface on iPhone)     |  |
|  +--------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 Native iOS CarPlay Architecture (`ios/App/App/`)

#### 3.1.1 CarPlay Scene Registration (`CarPlaySceneDelegate.swift`)
- Implements `CPTemplateApplicationSceneDelegate`.
- Handles `templateApplicationScene(_:didConnect:to:)` when the iPhone connects to CarPlay.
- Configures the root `CPTabBarTemplate`:
  - **Tab 1: المكتبة (Music Library)**: Renders a `CPListTemplate` containing all local tracks, indexed with high-contrast album artwork thumbnails, track duration, and subtitle (artist name).
  - **Tab 2: المفضلة (Favorites)**: Renders a `CPListTemplate` populated with the user's favorited songs for immediate one-tap playback.
  - **Now Playing Button**: Quick jump to `CPNowPlayingTemplate.shared`.

#### 3.1.2 Now Playing Screen (`CPNowPlayingTemplate`)
- Enables native transport controls:
  - Play / Pause / Toggle
  - Next Track / Previous Track
  - Jump Forward (15s) / Jump Backward (15s)
  - Scrubber / Timeline bar synchronized with actual playback duration
- Displays high-resolution album artwork up to $512\times 512$ with fallback to studio master gradient branding.

#### 3.1.3 Steering Wheel & Head Unit Remote Controls (`MPRemoteCommandCenter`)
- Registers native handlers for:
  - `playCommand`, `pauseCommand`, `togglePlayPauseCommand`
  - `nextTrackCommand`, `previousTrackCommand`
  - `changePlaybackPositionCommand` (scrubbing from car dash)

#### 3.1.4 Capacitor CarPlay Bridge (`CarPlayPlugin.swift`)
- Exposes native methods to JavaScript:
  - `syncPlaylist(tracks: Array<{ id, title, artist, album, duration, artwork }>)`
  - `updatePlaybackState(trackId, isPlaying, currentTime, duration)`
- Emits events to JavaScript:
  - `carPlayTrackSelected`: User selected a song from the car screen.
  - `carPlayAction`: User pressed play/pause/skip on the car interface.

---

### 3.2 In-App Car Mode UI (`src/components/carplay/CarPlayMode.tsx`)

For users mounting their iPhone on a dashboard magnetic mount:
1. **Ergonomic Design & Human Factors**:
   - Touch targets $\ge 64\text{px} \times 64\text{px}$ with high-contrast outlines to eliminate driving distraction.
   - Dual orientation: Seamlessly adapts between **Horizontal (Landscape 16:9)** and **Vertical (Portrait)** layouts.
   - High-contrast typography using Apple system fonts (SF Pro / Tajawal) with bold weights and high legibility.
2. **Screen Wake Lock API**:
   - Automatically activates `navigator.wakeLock.request('screen')` upon entering Car Mode, preventing the phone display from dimming or locking while navigating.
   - Gracefully releases wake lock when exiting Car Mode.
3. **Gesture Navigation**:
   - Swipe Left / Right on the large artwork card to switch tracks.
   - Single tap on artwork to Toggle Play / Pause.
4. **Quick Driving Tabs**:
   - "المشغل" (Now Playing View): Giant artwork, title, artist, prominent transport bar.
   - "المفضلة السريعة" (Quick Favorites Drawer): Oversized rows for instant selection at traffic stops.
5. **Entry Points**:
   - Prominent Car icon (`Car` from Lucide) in `ExpandedPlayer` and `Header` for 1-tap activation.

---

### 3.3 Configuration & Entitlements

#### 3.3.1 `ios/App/App/App.entitlements`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.carplay-audio</key>
    <true/>
</dict>
</plist>
```

#### 3.3.2 `ios/App/App/Info.plist`
- `UIBackgroundModes`: includes `audio`.
- `UIApplicationSceneManifest`: specifies `CPTemplateApplicationSceneSessionRoleApplication` pointing to `CarPlaySceneDelegate`.

---

## 4. Error Handling & Edge Cases

1. **CarPlay Disconnection / Reconnection**:
   - Gracefully saves last playback position and restores state when the car session resumes.
2. **Empty Track Library**:
   - Displays a clean `CPListTemplate` with a friendly Arabic message: "لا توجد أغانٍ محملة حالياً، أضف أغانيك من التطبيق".
3. **Screen Wake Lock Incompatibility**:
   - Falls back gracefully without crashing if `navigator.wakeLock` is unsupported or rejected by system battery-saver mode.

---

## 5. Verification Plan

1. **TypeScript & Build Integrity**:
   - Execute `npm run build` ensuring 0 compilation and packaging errors.
2. **Car Mode UI Validation**:
   - Test portrait ($390\times 844$) and landscape ($844\times 390$) viewports via browser simulation.
   - Verify gesture recognition (touch swipe, giant buttons).
3. **MediaSession & Remote Control Verification**:
   - Verify all MediaSession actions (`play`, `pause`, `nexttrack`, `previoustrack`, `seekto`) respond accurately.
4. **Capacitor & iOS Scaffolding**:
   - Verify Capacitor iOS directory structure, Swift files, `Info.plist`, and `App.entitlements`.
