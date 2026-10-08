import React, { useMemo, useRef, useState, useCallback, memo } from 'react';
import { formatDuration } from './TimelineSlider';

export interface WaveformTimelineProps {
  trackId?: string;
  currentTime: number;
  duration: number;
  onSeek: (targetSeconds: number) => void;
  accentColor?: string;
  disabled?: boolean;
  className?: string;
  barCount?: number;
  height?: number;
}

/**
 * Procedural Deterministic Waveform Generator
 * Produces realistic musical dynamics (verse, chorus peaks, bridge, drop) based on trackId seed.
 */
function generateWaveformProfile(trackId: string = 'default', barCount: number = 64): number[] {
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash << 5) - hash + trackId.charCodeAt(i);
    hash |= 0;
  }

  const bars: number[] = [];
  const seed = Math.abs(hash) || 12345;

  for (let i = 0; i < barCount; i++) {
    const progress = i / barCount;
    // Macro musical envelope: Intro (quiet), Verse 1, Chorus 1 (peak), Bridge, Chorus 2 (climax), Outro
    let macroEnvelope = 0.4;
    if (progress < 0.12) {
      macroEnvelope = 0.25 + progress * 2.5; // Intro buildup
    } else if (progress < 0.35) {
      macroEnvelope = 0.55 + Math.sin(progress * Math.PI * 4) * 0.15; // Verse
    } else if (progress < 0.58) {
      macroEnvelope = 0.85 + Math.sin(progress * Math.PI * 6) * 0.15; // Chorus 1
    } else if (progress < 0.72) {
      macroEnvelope = 0.45 + Math.cos(progress * Math.PI * 4) * 0.15; // Bridge breakdown
    } else if (progress < 0.90) {
      macroEnvelope = 0.95 + Math.sin(progress * Math.PI * 8) * 0.05; // Drop / Climax
    } else {
      macroEnvelope = 0.75 - (progress - 0.90) * 5; // Outro fade
    }

    // Micro pseudo-random fluctuation
    const micro = Math.abs(Math.sin((seed + i * 37) * 9999)) * 0.45 + 0.55;
    const heightNorm = Math.max(0.12, Math.min(1.0, macroEnvelope * micro));
    bars.push(heightNorm);
  }

  return bars;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = memo(({
  trackId = 'default',
  currentTime,
  duration,
  onSeek,
  accentColor = '#FA243C',
  disabled = false,
  className = '',
  barCount = 60,
  height = 36,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubSeconds, setScrubSeconds] = useState(0);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [hoverSeconds, setHoverSeconds] = useState<number>(0);

  const bars = useMemo(() => generateWaveformProfile(trackId, barCount), [trackId, barCount]);

  const safeDuration = duration > 0 ? duration : 1;
  const effectiveTime = isDragging ? scrubSeconds : currentTime;
  const currentRatio = Math.min(1, Math.max(0, effectiveTime / safeDuration));

  const calculateTarget = useCallback((clientX: number) => {
    if (!containerRef.current) return { seconds: 0, ratio: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return {
      seconds: ratio * duration,
      ratio,
    };
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    const { seconds } = calculateTarget(e.clientX);
    setScrubSeconds(seconds);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { seconds, ratio } = calculateTarget(e.clientX);
    setHoverPercent(ratio * 100);
    setHoverSeconds(seconds);
    if (isDragging) {
      setScrubSeconds(seconds);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const { seconds } = calculateTarget(e.clientX);
    setIsDragging(false);
    onSeek(seconds);
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverPercent(null);
    }
  };

  return (
    <div className={`relative flex flex-col justify-center select-none ${className}`}>
      {/* Waveform Scrubber Surface */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{ height }}
        className={`group relative w-full flex items-center justify-between gap-[2px] sm:gap-[3px] py-1 cursor-pointer transition-opacity ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'opacity-95 hover:opacity-100'
        }`}
      >
        {bars.map((normHeight, idx) => {
          const barRatio = idx / barCount;
          const isPlayed = barRatio <= currentRatio;
          const isHovered = hoverPercent !== null && barRatio <= (hoverPercent / 100);

          return (
            <div
              key={idx}
              className="flex-1 flex items-center justify-center h-full min-w-[2px]"
            >
              <div
                style={{
                  height: `${Math.round(normHeight * 100)}%`,
                  backgroundColor: isPlayed ? accentColor : undefined,
                  boxShadow: isPlayed ? `0 0 8px ${accentColor}66` : undefined,
                }}
                className={`w-full rounded-full transition-all duration-150 ${
                  isPlayed
                    ? 'scale-y-100'
                    : isHovered
                    ? 'bg-white/40 scale-y-105'
                    : 'bg-white/18 group-hover:bg-white/25 scale-y-95'
                }`}
              />
            </div>
          );
        })}

        {/* Hover Time Bubble */}
        {hoverPercent !== null && !disabled && (
          <div
            style={{ left: `${hoverPercent}%` }}
            className="absolute -top-7 -translate-x-1/2 pointer-events-none z-30 px-2 py-0.5 rounded-md bg-[#181822]/95 border border-white/15 text-[11px] font-mono font-bold text-white shadow-xl backdrop-blur-md"
          >
            {formatDuration(hoverSeconds)}
          </div>
        )}

        {/* Glowing Playhead Pin */}
        <div
          style={{
            left: `${currentRatio * 100}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
          }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-white pointer-events-none transition-transform duration-75 group-hover:scale-125"
        />
      </div>

      {/* Timestamps */}
      <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 font-semibold px-0.5 mt-0.5">
        <span className="tabular-nums text-white/80">{formatDuration(effectiveTime)}</span>
        <span className="tabular-nums text-white/50">{formatDuration(duration)}</span>
      </div>
    </div>
  );
});
