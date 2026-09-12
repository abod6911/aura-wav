import React, { useState, useEffect, useRef } from 'react';

interface TimelineSliderProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  showTimestamps?: boolean;
  accentColor?: string;
}

import { formatTime } from '../../utils/formatters';
export { formatTime };

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  currentTime,
  duration,
  onSeek,
  className = '',
  showTimestamps = true,
  accentColor = '#1DB954',
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
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
  const hoverPercent = validDuration > 0 ? Math.min(100, Math.max(0, (hoverTime / validDuration) * 100)) : 0;

  const calculateTimeFromPointer = (clientX: number): number => {
    if (!trackRef.current || validDuration <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * validDuration;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsScrubbing(true);
    const newTime = calculateTimeFromPointer(e.clientX);
    setScrubTime(newTime);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const time = calculateTimeFromPointer(e.clientX);
    setHoverTime(time);
    if (!isScrubbing) return;
    setScrubTime(time);
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

  const activeTimeBubblePercent = isScrubbing ? progressPercent : hoverPercent;
  const activeBubbleTime = isScrubbing ? scrubTime : hoverTime;

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
        onPointerEnter={(e) => {
          setIsHovered(true);
          setHoverTime(calculateTimeFromPointer(e.clientX));
        }}
        onPointerLeave={() => setIsHovered(false)}
        className="group relative flex-1 h-7 flex items-center cursor-pointer touch-none"
      >
        {/* Floating Time Bubble on Hover / Scrub */}
        {(isHovered || isScrubbing) && validDuration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0c0c14]/90 border border-white/20 backdrop-blur-md text-white text-[11px] font-mono font-bold shadow-[0_4px_16px_rgba(0,0,0,0.8)] pointer-events-none z-30 transition-all duration-75 animate-fadeIn"
            style={{
              left: `${Math.max(4, Math.min(96, activeTimeBubblePercent))}%`,
            }}
          >
            {formatTime(activeBubbleTime)}
          </div>
        )}

        {/* Dynamic Width Rail: 3.5px expanding to 6px on hover/scrub */}
        <div className="w-full h-[3.5px] bg-white/[0.1] rounded-full overflow-hidden transition-[height] duration-200 group-hover:h-[6px] relative">
          {/* Subtle Hover Target Track */}
          {isHovered && !isScrubbing && (
            <div
              className="absolute top-0 bottom-0 left-0 bg-white/15 rounded-full pointer-events-none"
              style={{ width: `${hoverPercent}%` }}
            />
          )}

          {/* Glowing Filled Progress Bar with Dynamic Accent Hue */}
          <div
            className="h-full rounded-full relative transition-[width] duration-75"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${accentColor}, #1ed760)`,
              boxShadow: `0 0 14px ${accentColor}`,
            }}
          >
            {/* Subtle light sheen highlight */}
            <div className="absolute inset-0 bg-white/25 rounded-full" />
          </div>
        </div>

        {/* Apple-Grade Frosted Glass Thumb */}
        <div
          className={`absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)] border border-white/70 pointer-events-none transition-transform duration-100 ${
            isScrubbing ? 'scale-125 ring-4' : 'group-hover:scale-110'
          }`}
          style={{
            left: `${progressPercent}%`,
            borderColor: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
          }}
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
