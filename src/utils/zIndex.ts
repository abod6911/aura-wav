/**
 * AuraWave Global Z-Index Hierarchy Architecture
 * 
 * Defines strict visual layering to prevent z-index collisions across modals,
 * drawers, floating players, and notifications.
 * 
 * Strict Layer Order:
 * - z-30: Sidebar, RightSidebar
 * - z-40: MobileNavDock, MiniPlayer, Desktop PlayerBar
 * - z-50: ExpandedPlayer (full-screen music player)
 * - z-60: Over-player drawers & sheets (QueueDrawer, SyncedLyrics, DJFxSheet)
 * - z-70: Dialogs & modals (EqualizerModal, SettingsModal, MetadataEditor, etc.)
 * - z-80: Quick action sheets, context menus, and floating popovers
 * - z-[100]: Notifications, banners, toasts, and full-screen drag overlays
 * - z-[120]: AuthScreen (authentication barrier)
 * - z-[999]: CarPlayMode (full-screen driving mode)
 * - z-[9999]: Global ErrorBoundary (fatal crash screen)
 */

export const Z_LAYERS = {
  SIDEBAR: 'z-30',
  BOTTOM_NAV: 'z-40',
  MINI_PLAYER: 'z-40',
  PLAYER_BAR: 'z-40',
  EXPANDED_PLAYER: 'z-50',
  DRAWER: 'z-60',
  MODAL: 'z-70',
  ACTION_SHEET: 'z-80',
  BANNER: 'z-[100]',
  TOAST: 'z-[100]',
  AUTH: 'z-[120]',
  CARPLAY: 'z-[999]',
  FATAL_ERROR: 'z-[9999]',
} as const;

export default Z_LAYERS;
