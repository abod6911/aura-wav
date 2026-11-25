import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { WaveformTimeline } from './WaveformTimeline';
import { usePlayerStore } from '../../store/usePlayerStore';

export { WaveformTimeline };

export interface TimelineSliderProps {
  currentTime?: number;
  duration: number;
  bufferedTime?: number;
  onSeek: (targetSeconds: number) => void;
  disabled?: boolean;
  className?: string;
  showTimestamps?: boolean;
  accentColor?: string;
  showWaveform?: boolean;
  trackId?: string;
  layout?: 'stacked' | 'inline';
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
  currentTime: propCurrentTime,
  duration,
  bufferedTime = 0,
  onSeek,
  disabled = false,
  className = '',
  showTimestamps = true,
  accentColor,
  showWaveform = false,
  trackId,
  layout = 'stacked',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [scrubSeconds, setScrubSeconds] = useState(0);
  const [showRemaining, setShowRemaining] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const playbackState = usePlayerStore((state) => state.playbackState);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillBarRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const elapsedTextRef = useRef<HTMLSpanElement | null>(null);
  const remainingTextRef = useRef<HTMLSpanElement | null>(null);
  const previewBubbleRef = useRef<HTMLDivElement>(null);
  const previewTextRef = useRef<HTMLSpanElement>(null);

  const isDraggingRef = useRef(false);
  const showRemainingRef = useRef(false);

  isDraggingRef.current = isDragging;
  showRemainingRef.current = showRemaining;

  // Initial time resolution with safeguard against freeze at track end
  const stateTime = usePlayerStore.getState().currentTime;
  const stateDur = usePlayerStore.getState().duration;
  const initialTime = propCurrentTime !== undefined
    ? propCurrentTime
    : (stateTime >= stateDur && stateDur > 0 ? 0 : stateTime);
  const safeDuration = duration > 0 ? duration : 1;
  const initialPercent = Math.min(100, Math.max(0, (initialTime / safeDuration) * 100));
  const bufferPercent = Math.min(100, Math.max(0, (bufferedTime / safeDuration) * 100));

  // High-performance Transient Subscription to Zustand store
  useEffect(() => {
    return usePlayerStore.subscribe((state) => {
      if (isDraggingRef.current) return;
      const cur = state.currentTime;
      const dur = state.duration > 0 ? state.duration : (duration > 0 ? duration : 0);
      const isActuallyEnded = state.playbackState === 'idle' && cur >= dur && dur > 0;
      const displayCur = dur === 0 ? 0 : (cur >= dur && !isActuallyEnded && !state.isPlaying ? 0 : cur);
      const pct = dur > 0 ? Math.min(100, Math.max(0, (displayCur / dur) * 100)) : 0;

      if (fillBarRef.current) {
        fillBarRef.current.style.width = `${pct}%`;
      }
      if (thumbRef.current) {
        thumbRef.current.style.left = `${pct}%`;
      }
      if (elapsedTextRef.current) {
        elapsedTextRef.current.textContent = formatDuration(displayCur);
      }
      if (remainingTextRef.current) {
        remainingTextRef.current.textContent = showRemainingRef.current
          ? `-${formatDuration(Math.max(0, dur - displayCur))}`
          : formatDuration(dur);
      }
    });
  }, [duration]);

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
    const { seconds, percent } = calculateFromPointer(e.clientX);
    setScrubSeconds(seconds);

    if (fillBarRef.current) fillBarRef.current.style.width = `${percent}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${percent}%`;
    if (elapsedTextRef.current) elapsedTextRef.current.textContent = formatDuration(seconds);
    if (remainingTextRef.current) {
      remainingTextRef.current.textContent = showRemainingRef.current
        ? `-${formatDuration(Math.max(0, duration - seconds))}`
        : formatDuration(duration);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { seconds, percent } = calculateFromPointer(e.clientX);
    if (isDragging) {
      setScrubSeconds(seconds);
      if (fillBarRef.current) fillBarRef.current.style.width = `${percent}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${percent}%`;
      if (elapsedTextRef.current) elapsedTextRef.current.textContent = formatDuration(seconds);
      if (remainingTextRef.current) {
        remainingTextRef.current.textContent = showRemainingRef.current
          ? `-${formatDuration(Math.max(0, duration - seconds))}`
          : formatDuration(duration);
      }
    } else {
      if (previewBubbleRef.current && previewTextRef.current) {
        previewBubbleRef.current.style.left = `${percent}%`;
        previewTextRef.current.textContent = formatDuration(seconds);
      }
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
      requestAnimationFrame(() => {
        if (previewBubbleRef.current && previewTextRef.current) {
          previewBubbleRef.current.style.left = `${percent}%`;
          previewTextRef.current.textContent = formatDuration(seconds);
        }
      });
    }
  };

  const handlePointerLeave = () => {
    setIsHovering(false);
  };

  if (showWaveform) {
    return (
      <WaveformTimeline
        trackId={trackId}
        currentTime={initialTime}
        duration={duration}
        onSeek={onSeek}
        accentColor={accentColor}
        disabled={disabled}
        className={className}
      />
    );
  }

  if (layout === 'inline') {
    return (
      <div 
        className={`w-full flex items-center gap-2.5 select-none touch-none ${className}`} 
        dir="ltr"
      >
        {/* Elapsed Time */}
        {showTimestamps && (
          <span 
            ref={elapsedTextRef}
            className="text-[11px] font-mono tabular-nums font-bold text-zinc-400 w-9 text-right shrink-0 select-none"
          >
            {formatDuration(isDragging ? scrubSeconds : initialTime)}
          </span>
        )}

        {/* Compact Scrubber Groove & Thumb */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setIsDragging(false)}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          className="relative flex-1 h-8 flex items-center cursor-pointer group py-1"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={isDragging ? scrubSeconds : initialTime}
          aria-label="شريط تقدم الأغنية"
        >
          {/* Spotify Groove Background */}
          <div className="w-full h-1.5 group-hover:h-2 transition-[height] duration-150 rounded-full bg-white/20 overflow-hidden relative">
            {/* Buffer Bar */}
            <div
              className="absolute left-0 top-0 h-full bg-white/30 rounded-full pointer-events-none transition-[width] duration-300"
              style={{ width: `${bufferPercent}%` }}
            />
            {/* Progress Fill */}
            <div
              ref={fillBarRef}
              className="absolute left-0 top-0 h-full rounded-full pointer-events-none z-10 bg-[#1DB954] transition-colors duration-150"
              style={{ width: `${initialPercent}%` }}
            />
          </div>

          {/* Time Preview Bubble */}
          {(isDragging || isHovering) && duration > 0 && (
            <div
              ref={previewBubbleRef}
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#282828] border border-white/10 text-[11px] font-mono font-bold text-white shadow-lg pointer-events-none z-30 flex items-center gap-1"
              style={{ left: `${isDragging ? (scrubSeconds / safeDuration) * 100 : 0}%` }}
            >
              <span ref={previewTextRef}>{formatDuration(isDragging ? scrubSeconds : 0)}</span>
            </div>
          )}

          {/* Always-Visible Progress Dot Thumb (Scales on hover/drag for precision seeking) */}
          <div
            ref={thumbRef}
            className={`absolute -ml-[7px] w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.65)] ring-2 ring-[#1DB954]/80 pointer-events-none z-20 transition-transform duration-150 ${
              isDragging || isHovering ? 'scale-125' : 'scale-100'
            }`}
            style={{ left: `${initialPercent}%` }}
          />
        </div>

        {/* Total Duration / Remaining */}
        {showTimestamps && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowRemaining((prev) => !prev);
            }}
            title={showRemaining ? 'عرض إجمالي مدة الأغنية (انقر للتبديل)' : 'عرض الوقت المتبقي (انقر للتبديل)'}
            className="text-[11px] font-mono tabular-nums font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer w-9 text-left shrink-0 select-none py-0.5"
          >
            <span ref={remainingTextRef}>
              {showRemaining
                ? `-${formatDuration(Math.max(0, duration - initialTime))}`
                : formatDuration(duration)}
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`w-full flex flex-col select-none touch-none py-1.5 ${className}`} 
      dir="ltr"
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
        aria-valuenow={isDragging ? scrubSeconds : initialTime}
        aria-label="شريط تقدم الأغنية"
      >
        {/* Track Groove Background */}
        <div className="w-full h-1.5 group-hover:h-2 transition-[height] duration-150 rounded-full bg-white/20 overflow-hidden relative">
          {/* Buffer Bar (Pre-loaded audio) */}
          <div
            className="absolute left-0 top-0 h-full bg-white/30 rounded-full pointer-events-none transition-[width] duration-300"
            style={{ width: `${bufferPercent}%` }}
          />
          {/* Active Playback Progress Fill */}
          <div
            ref={fillBarRef}
            className="absolute left-0 top-0 h-full rounded-full pointer-events-none z-10 bg-[#1DB954] transition-colors duration-150"
            style={{ width: `${initialPercent}%` }}
          />
        </div>

        {/* Floating Time Preview Bubble */}
        {(isDragging || isHovering) && duration > 0 && (
          <div
            ref={previewBubbleRef}
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#282828] border border-white/10 text-[11px] font-mono font-bold text-white shadow-lg pointer-events-none z-30 flex items-center gap-1"
            style={{ left: `${isDragging ? (scrubSeconds / safeDuration) * 100 : 0}%` }}
          >
            <span ref={previewTextRef}>{formatDuration(isDragging ? scrubSeconds : 0)}</span>
          </div>
        )}

        {/* Always-Visible Progress Dot Thumb (Visible on touch & desktop for immediate scrubbing) */}
        <div
          ref={thumbRef}
          className={`absolute -ml-2 w-4 h-4 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.65)] ring-2 ring-[#1DB954]/80 pointer-events-none z-20 transition-transform duration-150 ${
            isDragging || isHovering ? 'scale-125' : 'scale-100'
          }`}
          style={{ left: `${initialPercent}%` }}
        />
      </div>

      {/* Timestamp Indicators */}
      {showTimestamps && (
        <div className="flex justify-between items-center text-[12px] font-mono tabular-nums text-white/50 -mt-0.5 px-1 select-none">
          {/* Current Elapsed Time */}
          <span ref={elapsedTextRef} className="hover:text-white transition-colors" title="الوقت المنقضي">
            {formatDuration(isDragging ? scrubSeconds : initialTime)}
          </span>

          {/* Total Duration with Remaining Countdown Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowRemaining((prev) => !prev);
            }}
            title={showRemaining ? 'عرض إجمالي مدة الأغنية (انقر للتبديل)' : 'عرض الوقت المتبقي (انقر للتبديل)'}
            className="text-white/50 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group/dur py-0.5 px-1 rounded hover:bg-white/[0.06]"
          >
            <span ref={remainingTextRef}>
              {showRemaining
                ? `-${formatDuration(Math.max(0, duration - initialTime))}`
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
