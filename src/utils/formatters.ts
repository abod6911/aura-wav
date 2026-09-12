/**
 * Unified Time & Duration Formatting Utilities (DRY Principle)
 * Replaces duplicated time formatting implementations across TimelineSlider,
 * MobilePlayerSheet, Header, TrackList, and PlaylistsView.
 */

/**
 * Formats a duration in seconds into 'm:ss' or 'h:mm:ss' format.
 * Safe against NaN, Infinity, and negative values.
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const rounded = Math.floor(seconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }

  return `${mins}:${paddedSecs}`;
}

/**
 * Formats countdown or sleep timer remaining seconds into 'mm:ss' or 'h:mm:ss'.
 */
export function formatTimerRemaining(seconds: number): string {
  return formatTime(seconds);
}

/**
 * Formats total seconds into localized Arabic summary (e.g., '3 ساعات و 45 دقيقة').
 */
export function formatDurationArabic(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0 دقيقة';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours} س و ${minutes} د`;
  }
  if (hours > 0) {
    return `${hours} ساعة`;
  }
  return `${minutes} دقيقة`;
}
