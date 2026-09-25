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
      {/* Visual & Hit Area Container (Enlarged 44px touch ergonomics) */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        className="relative h-11 flex items-center cursor-pointer group"
      >
        {/* Track Background */}
        <div className="w-full h-1.5 group-hover:h-2.5 transition-all duration-200 rounded-full bg-white/[0.08] border border-white/[0.04] overflow-hidden relative backdrop-blur-sm">
          {/* Buffer Bar */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300 rounded-full"
            style={{ width: `${bufferPercent}%` }}
          />
          {/* Playback Progress Bar */}
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-75"
            style={{ 
              width: `${progressPercent}%`,
              background: accentColor 
                ? `linear-gradient(90deg, ${accentColor}cc, ${accentColor})` 
                : 'linear-gradient(90deg, rgba(255,255,255,0.8), #ffffff)',
              boxShadow: accentColor ? `0 0 10px ${accentColor}80` : '0 0 10px rgba(255,255,255,0.5)',
            }}
          />
        </div>

        {/* Glowing Playhead Thumb Knob */}
        <div
          className={`absolute -ml-3 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-150 pointer-events-none ${
            isDragging 
              ? 'scale-125' 
              : 'scale-75 opacity-80 group-hover:scale-100 group-hover:opacity-100'
          }`}
          style={{ left: `${progressPercent}%` }}
        >
          <div 
            className="w-4 h-4 rounded-full bg-white border border-black/20 shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_14px_rgba(255,255,255,0.85)]"
            style={{
              backgroundColor: isDragging ? '#ffffff' : (accentColor || '#ffffff'),
              boxShadow: isDragging 
                ? '0 0 16px rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.8)' 
                : (accentColor ? `0 0 12px ${accentColor}` : '0 0 12px rgba(255,255,255,0.8)'),
            }}
          />
        </div>
      </div>

      {/* Timestamp Indicators */}
      {showTimestamps && (
        <div className="flex justify-between items-center text-xs font-mono tabular-nums tracking-tight font-semibold text-white/50 -mt-1 px-1 select-none">
          <span>{formatDuration(effectiveTime)}</span>
          <span className="text-white/40">-{formatDuration(Math.max(0, duration - effectiveTime))}</span>
        </div>
      )}
    </div>
  );
});

TimelineSlider.displayName = 'TimelineSlider';
