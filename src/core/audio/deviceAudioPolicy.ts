/**
 * iOS Web Audio & CoreAudio Policy Controller for AURA.WAV
 * 
 * Manages device-level detection and user policy for Web Audio routing on iOS devices.
 * 
 * - iOS Direct Native Audio Mode: Streams HTMLAudioElement directly to iOS CoreAudio
 *   bypassing AudioContext and createMediaElementSource entirely. This ensures 100% stable
 *   background, lockscreen, and AirPods playback on iOS 17/18 without CoreAudio daemon suspension.
 * 
 * - Advanced DSP Mode: Routes audio through the Web Audio graph (Equalizer, AutoMix crossfade,
 *   Spatial Reverb). Default on Desktop & Android, optional on iOS.
 */

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export const STORAGE_KEY_IOS_DSP = 'aura_ios_dsp_enabled';

/**
 * Returns whether advanced Web Audio DSP (Equalizer, AutoMix crossfade, Spatial Reverb)
 * is enabled on the current device.
 * 
 * - iOS Devices: Default is FALSE (Direct Native Audio Mode for continuous background / lockscreen playback)
 * - Desktop / Android: Always TRUE (Full Web Audio studio graph enabled)
 */
export function isIOSDspEnabled(): boolean {
  if (!isIOSDevice()) return true;
  if (typeof localStorage === 'undefined') return false;
  const val = localStorage.getItem(STORAGE_KEY_IOS_DSP);
  if (val === null) return false; // Default false on iOS
  return val === 'true';
}

export function setIOSDspEnabled(enabled: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_IOS_DSP, String(enabled));
  }
}

/**
 * Direct Native Audio Mode is active when the device is iOS and DSP is NOT enabled.
 * In this mode, HTMLAudioElement streams directly to iOS CoreAudio without Web Audio routing.
 */
export function isDirectNativeAudioMode(): boolean {
  return isIOSDevice() && !isIOSDspEnabled();
}
