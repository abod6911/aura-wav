import React, { useState, useRef, useCallback, memo } from 'react';

export interface TimelineSliderProps {
  currentTime: number;
  duration: number;
  bufferedTime?: number;
  onSeek: (targetSeconds: number) => void;
  disabled?: boolean;
  className?: string;
  showTimestamps?: boolean;
  accentColor?: string;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  
  if (hours > 0) {
    return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const formatTime = formatDuration;

export const TimelineSlider: React.FC<TimelineSliderProps> = memo(({
  currentTime,
  duration,
  bufferedTime = 0,
  onSeek,
  disabled = false,
  className = '',
  showTimestamps = true,
  accentColor,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [scrubSeconds, setScrubSeconds] = useState(0);
  const [showRemaining, setShowRemaining] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{ percent: number; seconds: number } | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const effectiveTime = isDragging ? scrubSeconds : currentTime;
  const safeDuration = duration > 0 ? duration : 1;
  const progressPercent = Math.min(100, Math.max(0, (effectiveTime / safeDuration) * 100));
  const bufferPercent = Math.min(100, Math.max(0, (bufferedTime / safeDuration) * 100));

  const calculateFromPointer = useCallback((clientX: number): { seconds: number; percent: number } => {
    if (!trackRef.current) return { seconds: 0, percent: 0 };
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return {
      seconds: ratio * duration,
      percent: ratio * 100,
    };
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture fallback
    }
    setIsDragging(true);
    const { seconds } = calculateFromPointer(e.clientX);
    setScrubSeconds(seconds);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { seconds, percent } = calculateFromPointer(e.clientX);
    if (isDragging) {
      setScrubSeconds(seconds);
    } else {
      setHoverPosition({ seconds, percent });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }
    const { seconds } = calculateFromPointer(e.clientX);
    setIsDragging(false);
    onSeek(seconds);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!disabled && duration > 0) {
      setIsHovering(true);
      const { seconds, percent } = calculateFromPointer(e.clientX);
      setHoverPosition({ seconds, percent });
    }
  };

  const handlePointerLeave = () => {
    setIsHovering(false);
    setHoverPosition(null);
  };

  return (
    <div 
      className={`w-full flex flex-col select-none touch-none py-1.5 ${className}`} 
      dir="ltr" // Guarantees global temporal linearity regardless of RTL mode
    >
      {/* Visual & Hit Area Container (Enlarged 44px touch ergonomics) */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className="relative h-11 flex items-center cursor-pointer group py-2"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={effectiveTime}
        aria-label="شريط تقدم الأغنية"
      >
        {/* Track Groove Background */}
        <div className="w-full h-2.5 sm:h-3 group-hover:h-3.5 transition-[height] duration-200 rounded-full bg-white/[0.14] border border-white/[0.12] shadow-[inset_0_1px_3px_rgba(0,0,0,0.7)] overflow-hidden relative backdrop-blur-md">
          {/* Buffer Bar (Pre-loaded audio) */}
          <div
            className="absolute left-0 top-0 h-full bg-white/20 rounded-full pointer-events-none transition-[width] duration-300"
            style={{ width: `${bufferPercent}%` }}
          />
          {/* Active Playback Progress Fill (Vibrant Apple Red/Pink Gradient with Maximum Contrast) */}
          <div
            className="absolute left-0 top-0 h-full rounded-full pointer-events-none z-10 transition-[width] duration-75 overflow-hidden"
            style={{ 
              width: `${progressPercent}%`,
              backgroundColor: '#FA243C',
              backgroundImage: 'linear-gradient(90deg, #FA243C 0%, #FF375F 60%, #FF758F 100%)',
              boxShadow: '0 0 14px rgba(250, 36, 60, 0.75), inset 0 1px 1px rgba(255,255,255,0.4)',
            }}
          >
            {/* Luminous Leading Edge Sweep */}
            <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/95 rounded-full shadow-[0_0_8px_#ffffff]" />
          </div>
        </div>

        {/* Floating Time Preview Bubble (When Dragging or Hovering) */}
        {(isDragging || (isHovering && hoverPosition)) && duration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-zinc-900/95 border border-white/20 text-[11px] font-mono font-bold text-white shadow-xl pointer-events-none z-30 flex items-center gap-1 backdrop-blur-md"
            style={{ left: `${isDragging ? progressPercent : hoverPosition?.percent || 0}%` }}
          >
            <span>{formatDuration(isDragging ? scrubSeconds : hoverPosition?.seconds || 0)}</span>
          </div>
        )}

        {/* Glowing Playhead Thumb Knob (Always Visible & Tactile) */}
        <div
          className={`absolute -ml-3 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-100 pointer-events-none z-20 ${
            isDragging ? 'scale-125' : 'scale-100 group-hover:scale-110'
          }`}
          style={{ left: `${progressPercent}%` }}
        >
          <div 
            className="w-4.5 h-4.5 rounded-full bg-white border border-white/90 shadow-[0_0_12px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.8)] flex items-center justify-center"
          >
            <div className="w-2 h-2 rounded-full bg-[#FA243C]" />
          </div>
        </div>
      </div>

      {/* Timestamp Indicators */}
      {showTimestamps && (
        <div className="flex justify-between items-center text-xs font-mono tabular-nums tracking-tight font-bold text-zinc-300 -mt-0.5 px-1 select-none">
          {/* Current Elapsed Time */}
          <span className="hover:text-white transition-colors" title="الوقت المنقضي">
            {formatDuration(effectiveTime)}
          </span>

          {/* Total Duration with Remaining Countdown Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowRemaining((prev) => !prev);
            }}
            title={showRemaining ? 'عرض إجمالي مدة الأغنية (انقر للتبديل)' : 'عرض الوقت المتبقي (انقر للتبديل)'}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group/dur py-0.5 px-1 rounded hover:bg-white/[0.06]"
          >
            <span>
              {showRemaining
                ? `-${formatDuration(Math.max(0, duration - effectiveTime))}`
                : formatDuration(duration)}
            </span>
            <span className="text-[10px] text-zinc-500 group-hover/dur:text-zinc-300 transition-colors">
              {showRemaining ? '⏳' : ''}
            </span>
          </button>
        </div>
      )}
    </div>
  );
});

TimelineSlider.displayName = 'TimelineSlider';

