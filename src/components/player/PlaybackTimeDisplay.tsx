import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { formatDuration } from './TimelineSlider';

export interface PlaybackTimeDisplayProps {
  type?: 'current' | 'remaining' | 'duration';
  className?: string;
  durationOverride?: number;
}

/**
 * High-performance transient time display component.
 * Subscribes directly to Zustand state updates without triggering
 * re-renders of parent components or surrounding UI.
 */
export const PlaybackTimeDisplay: React.FC<PlaybackTimeDisplayProps> = ({
  type = 'current',
  className = '',
  durationOverride,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return usePlayerStore.subscribe((state) => {
      if (!spanRef.current) return;
      const cur = state.currentTime;
      const dur = durationOverride !== undefined ? durationOverride : (state.duration || 0);

      if (type === 'current') {
        spanRef.current.textContent = formatDuration(cur);
      } else if (type === 'remaining') {
        spanRef.current.textContent = `-${formatDuration(Math.max(0, dur - cur))}`;
      } else {
        spanRef.current.textContent = formatDuration(dur);
      }
    });
  }, [type, durationOverride]);

  const getInitialValue = () => {
    const s = usePlayerStore.getState();
    const cur = s.currentTime;
    const dur = durationOverride !== undefined ? durationOverride : (s.duration || 0);
    if (type === 'current') return formatDuration(cur);
    if (type === 'remaining') return `-${formatDuration(Math.max(0, dur - cur))}`;
    return formatDuration(dur);
  };

  return (
    <span ref={spanRef} className={`font-mono tabular-nums ${className}`}>
      {getInitialValue()}
    </span>
  );
};
