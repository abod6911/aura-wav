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
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
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
  const trackRef = useRef<HTMLDivElement | null>(null);

  const effectiveTime = isDragging ? scrubSeconds : currentTime;
  const safeDuration = duration > 0 ? duration : 1;
  const progressPercent = Math.min(100, Math.max(0, (effectiveTime / safeDuration) * 100));
  const bufferPercent = Math.min(100, Math.max(0, (bufferedTime / safeDuration) * 100));

  const calculateSecondsFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return clickRatio * duration;
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const newSeconds = calculateSecondsFromPointer(e.clientX);
    setScrubSeconds(newSeconds);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newSeconds = calculateSecondsFromPointer(e.clientX);
    setScrubSeconds(newSeconds);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }
    const finalSeconds = calculateSecondsFromPointer(e.clientX);
    setIsDragging(false);
    onSeek(finalSeconds);
  };

  return (
    <div 
      className={`w-full flex flex-col select-none touch-none py-2 ${className}`} 
      dir="ltr" // Guarantees global temporal linearity regardless of RTL mode
    >
      {/* Visual & Hit Area Container (44px touch ergonomics) */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        className="relative h-9 flex items-center cursor-pointer group"
      >
        {/* Track Background */}
        <div className="w-full h-1.5 group-hover:h-2 transition-all duration-150 rounded-full bg-white/10 overflow-hidden relative">
          {/* Buffer Bar */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300"
            style={{ width: `${bufferPercent}%` }}
          />
          {/* Playback Progress Bar */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-white rounded-full"
            style={{ 
              width: `${progressPercent}%`,
              backgroundColor: accentColor || undefined,
            }}
          />
        </div>

        {/* Thumb Knob */}
        <div
          className={`absolute -ml-2.5 w-5 h-5 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-black/10 transition-transform duration-100 ${
            isDragging ? 'scale-125 ring-4 ring-white/30' : 'scale-0 group-hover:scale-100'
          }`}
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Timestamp Indicators */}
      {showTimestamps && (
        <div className="flex justify-between items-center text-[11px] font-mono tracking-tight font-medium text-white/50 -mt-1 px-0.5">
          <span>{formatDuration(effectiveTime)}</span>
          <span>-{formatDuration(Math.max(0, duration - effectiveTime))}</span>
        </div>
      )}
    </div>
  );
});

TimelineSlider.displayName = 'TimelineSlider';
