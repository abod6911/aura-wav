import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatTime } from '../../utils/formatters';
export { formatTime };

interface TimelineSliderProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  showTimestamps?: boolean;
  accentColor?: string;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  currentTime,
  duration,
  onSeek,
  className = '',
  showTimestamps = true,
  accentColor = '#FA243C',
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);

  // Optimistic seek lock to prevent audio engine position bounce-back upon release
  const [optimisticSeekTime, setOptimisticSeekTime] = useState<number | null>(null);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const validDuration = isFinite(duration) && duration > 0 ? duration : 0;

  // Clear optimistic seek lock once audio engine time catches up to within 0.8s
  useEffect(() => {
    if (optimisticSeekTime !== null) {
      if (Math.abs(currentTime - optimisticSeekTime) < 0.8) {
        setOptimisticSeekTime(null);
      }
    }
  }, [currentTime, optimisticSeekTime]);

  // Sync currentTime to local state when NOT scrubbing and not in optimistic lock
  useEffect(() => {
    if (!isScrubbing && optimisticSeekTime === null) {
      setScrubTime(currentTime);
    }
  }, [currentTime, isScrubbing, optimisticSeekTime]);

  const displayTime = isScrubbing
    ? scrubTime
    : optimisticSeekTime !== null
    ? optimisticSeekTime
    : currentTime;

  const progressPercent =
    validDuration > 0
      ? Math.min(100, Math.max(0, (displayTime / validDuration) * 100))
      : 0;

  const hoverPercent =
    validDuration > 0
      ? Math.min(100, Math.max(0, (hoverTime / validDuration) * 100))
      : 0;

  const calculateTimeFromPointer = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || validDuration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * validDuration;
    },
    [validDuration]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newTime = calculateTimeFromPointer(e.clientX);
    setIsScrubbing(true);
    setScrubTime(newTime);
    activePointerIdRef.current = e.pointerId;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const time = calculateTimeFromPointer(e.clientX);
    setHoverTime(time);

    if (isScrubbing) {
      setScrubTime(time);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    setIsScrubbing(false);

    const finalTime = calculateTimeFromPointer(e.clientX);
    setOptimisticSeekTime(finalTime);
    onSeek(finalTime);

    if (activePointerIdRef.current !== null) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(activePointerIdRef.current);
      } catch {}
      activePointerIdRef.current = null;
    }
  };

  const handlePointerCancel = () => {
    if (isScrubbing) {
      setIsScrubbing(false);
      setOptimisticSeekTime(null);
      activePointerIdRef.current = null;
    }
  };

  const activeTimeBubblePercent = isScrubbing ? progressPercent : hoverPercent;
  const activeBubbleTime = isScrubbing ? scrubTime : hoverTime;

  return (
    <div className={`w-full flex items-center gap-2.5 sm:gap-3 select-none ${className}`} dir="ltr">
      {showTimestamps && (
        <span className="text-[11px] font-mono font-medium text-zinc-400 w-10 text-right tabular-nums">
          {formatTime(displayTime)}
        </span>
      )}

      {/* Interactive Track Container with Extended Ergonomic Hit Area */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerEnter={(e) => {
          setIsHovered(true);
          setHoverTime(calculateTimeFromPointer(e.clientX));
        }}
        onPointerLeave={() => setIsHovered(false)}
        className="group relative flex-1 h-9 flex items-center cursor-pointer touch-none"
      >
        {/* Floating Time Bubble on Hover / Scrub */}
        {(isHovered || isScrubbing) && validDuration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0c0c14]/95 border border-white/20 backdrop-blur-md text-white text-[11px] font-mono font-bold shadow-[0_4px_16px_rgba(0,0,0,0.85)] pointer-events-none z-30 transition-all duration-75 animate-fadeIn"
            style={{
              left: `${Math.max(5, Math.min(95, activeTimeBubblePercent))}%`,
            }}
          >
            {formatTime(activeBubbleTime)}
          </div>
        )}

        {/* Dynamic Rail: 4px expanding to 7px on hover/scrub */}
        <div className="w-full h-[4px] bg-white/[0.12] rounded-full overflow-hidden transition-[height] duration-200 group-hover:h-[6.5px] relative">
          {isHovered && !isScrubbing && (
            <div
              className="absolute top-0 bottom-0 left-0 bg-white/20 rounded-full pointer-events-none"
              style={{ width: `${hoverPercent}%` }}
            />
          )}

          {/* Glowing Filled Progress Bar */}
          <div
            className={`h-full rounded-full relative ${isScrubbing ? '' : 'transition-[width] duration-75'}`}
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${accentColor}, #FF375F)`,
              boxShadow: `0 0 12px ${accentColor}80`,
            }}
          >
            <div className="absolute inset-0 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Apple-Grade Tactile Thumb */}
        <div
          className={`absolute -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)] border-2 pointer-events-none ${
            isScrubbing
              ? 'scale-125 ring-4 ring-white/25'
              : 'group-hover:scale-110 transition-transform duration-100'
          }`}
          style={{
            left: `${progressPercent}%`,
            borderColor: accentColor,
            boxShadow: `0 0 12px ${accentColor}99`,
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
