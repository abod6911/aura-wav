import React, { useState, useEffect, useRef } from 'react';

interface TimelineSliderProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  showTimestamps?: boolean;
}

/**
 * Bulletproof time formatter avoiding NaN:NaN
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  currentTime,
  duration,
  onSeek,
  className = '',
  showTimestamps = true,
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // When not actively scrubbing, sync with audio playback
  useEffect(() => {
    if (!isScrubbing) {
      setScrubTime(currentTime);
    }
  }, [currentTime, isScrubbing]);

  const validDuration = isFinite(duration) && duration > 0 ? duration : 0;
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = validDuration > 0 ? Math.min(100, Math.max(0, (displayTime / validDuration) * 100)) : 0;

  const calculateTimeFromPointer = (clientX: number): number => {
    if (!trackRef.current || validDuration <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * validDuration;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsScrubbing(true);
    const newTime = calculateTimeFromPointer(e.clientX);
    setScrubTime(newTime);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    const newTime = calculateTimeFromPointer(e.clientX);
    setScrubTime(newTime);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    const finalTime = calculateTimeFromPointer(e.clientX);
    onSeek(finalTime);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`w-full flex items-center gap-3 select-none ${className}`} dir="ltr">
      {showTimestamps && (
        <span className="text-[11px] font-mono font-medium text-zinc-400 w-10 text-right tabular-nums">
          {formatTime(displayTime)}
        </span>
      )}

      {/* Interactive Track Container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="group relative flex-1 h-6 flex items-center cursor-pointer touch-none"
      >
        {/* Subtle Dark Background Rail */}
        <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden transition-all group-hover:h-2">
          {/* Glowing Filled Progress Bar */}
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Subtle light sheen */}
            <div className="absolute inset-0 bg-white/20" />
          </div>
        </div>

        {/* Glassmorphic Circular Thumb */}
        <div
          className={`absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] border border-white/60 pointer-events-none transition-transform duration-75 ${
            isScrubbing ? 'scale-125 ring-4 ring-indigo-500/30' : 'group-hover:scale-110'
          }`}
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {showTimestamps && (
        <span className="text-[11px] font-mono font-medium text-zinc-500 w-10 text-left tabular-nums">
          {formatTime(validDuration)}
        </span>
      )}
    </div>
  );
};
