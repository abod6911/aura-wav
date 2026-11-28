import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Play, Pause, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedCoverUrl } from '../../utils/imageOptimizer';
import { triggerHaptic } from '../../utils/haptics';
import { getOfflineArtworkUrl } from '../../utils/offlineStorage';
import { isArabicText } from '../../utils/formatters';
import { useTrackTheme } from '../../utils/colorExtractor';
import { formatDuration } from './TimelineSlider';

interface MiniPlayerProps {
  onExpand: () => void;
}

/**
 * Interactive bottom progress scrubber with always-visible progress dot
 * allowing instant seek forward/backward directly from the MiniPlayer.
 * Zero re-renders of the parent MiniPlayer on every 100ms tick.
 */
const MiniPlayerProgressBar: React.FC = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleTextRef = useRef<HTMLSpanElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const playbackState = usePlayerStore((state) => state.playbackState);
  const duration = usePlayerStore((state) => state.duration);
  const seek = usePlayerStore((state) => state.seek);

  isDraggingRef.current = isDragging;

  useEffect(() => {
    return usePlayerStore.subscribe((state) => {
      if (isDraggingRef.current) return;
      const cur = state.currentTime;
      const dur = state.duration > 0 ? state.duration : 1;
      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
      if (barRef.current) barRef.current.style.width = `${pct}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
    });
  }, []);

  const initialPct = () => {
    const s = usePlayerStore.getState();
    const dur = s.duration > 0 ? s.duration : 1;
    return Math.min(100, Math.max(0, (s.currentTime / dur) * 100));
  };

  const calcFromPointer = useCallback((clientX: number) => {
    const dur = usePlayerStore.getState().duration || duration || 0;
    if (!trackRef.current || dur <= 0) return { seconds: 0, pct: 0, dur };
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return { seconds: ratio * dur, pct: ratio * 100, dur };
  }, [duration]);

  const updateVisual = (seconds: number, pct: number, dur: number) => {
    if (barRef.current) barRef.current.style.width = `${pct}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
    if (bubbleRef.current && bubbleTextRef.current) {
      bubbleRef.current.style.left = `${Math.min(92, Math.max(8, pct))}%`;
      bubbleTextRef.current.textContent = `${formatDuration(seconds)} / ${formatDuration(dur)}`;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const dur = usePlayerStore.getState().duration || duration;
    if (dur <= 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    const { seconds, pct } = calcFromPointer(e.clientX);
    updateVisual(seconds, pct, dur);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    const { seconds, pct, dur } = calcFromPointer(e.clientX);
    updateVisual(seconds, pct, dur);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const { seconds } = calcFromPointer(e.clientX);
    setIsDragging(false);
    triggerHaptic('light');
    seek(seconds);
  };

  const startPct = initialPct();

  return (
    <div
      ref={trackRef}
      dir="ltr"
      role="slider"
      aria-label="شريط تقدم الأغنية"
      aria-valuemin={0}
      aria-valuemax={duration || 100}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setIsDragging(false)}
      className="absolute -bottom-1 inset-x-0 h-5 flex items-end cursor-pointer touch-none z-30 select-none"
    >
      {/* Live Scrubbing Time Bubble */}
      {isDragging && (
        <div
          ref={bubbleRef}
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#18181D]/95 border border-white/15 text-[10px] font-mono font-bold text-white shadow-xl pointer-events-none whitespace-nowrap"
          style={{ left: `${Math.min(92, Math.max(8, startPct))}%` }}
        >
          <span ref={bubbleTextRef}>{formatDuration(usePlayerStore.getState().currentTime)}</span>
        </div>
      )}

      {/* Track Groove */}
      <div className="w-full h-[3px] bg-white/[0.12] relative mb-1">
        <div
          ref={barRef}
          className="h-full relative bg-[#1DB954] rounded-full"
          style={{ width: `${startPct}%` }}
        >
          {playbackState === 'buffering' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Always-Visible Progress Dot */}
        <div
          ref={thumbRef}
          className={`absolute top-1/2 -translate-y-1/2 -ml-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(29,185,84,0.9)] ring-2 ring-[#1DB954] pointer-events-none transition-transform duration-100 ${
            isDragging ? 'w-3.5 h-3.5 -ml-[7px] scale-110' : 'w-2.5 h-2.5'
          }`}
          style={{ left: `${startPct}%` }}
        />
      </div>
    </div>
  );
};

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { t, isRTL, dir } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const isSwipingHorizontal = useRef(false);
  const theme = useTrackTheme(currentTrack);

  if (!currentTrack) return null;

  const handleExpand = () => {
    triggerHaptic('light');
    setMobilePlayerOpen(true);
    onExpand?.();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isSwipingHorizontal.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (!isSwipingHorizontal.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        isSwipingHorizontal.current = true;
      }
    }

    if (isSwipingHorizontal.current) {
      setDragX(dx * 0.45);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    const velocityX = Math.abs(dx) / Math.max(dt, 1);

    if (isSwipingHorizontal.current) {
      if (dx < -60 || (dx < -25 && velocityX > 0.4)) {
        triggerHaptic('light');
        nextTrack({ forceImmediate: true });
      } else if (dx > 60 || (dx > 25 && velocityX > 0.4)) {
        triggerHaptic('light');
        previousTrack();
      }
    } else if (dy < -25) {
      handleExpand();
    }

    touchStartRef.current = null;
    isSwipingHorizontal.current = false;
    setDragX(0);
  };

  return (
    <motion.div
      initial={{ y: 54, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 54, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="mini-player"
      style={{
        bottom: 'calc(var(--nav-height, 54px) + env(safe-area-inset-bottom, 0px) + 8px)',
        transform: `translate3d(${dragX}px, 0, 0)`,
        transition: dragX === 0 ? 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1), background-color 0.5s ease' : 'none',
        backgroundColor: theme.miniPlayerBg,
        touchAction: 'pan-y',
      }}
      className="fixed left-2.5 right-2.5 z-40 h-[58px] rounded-xl px-2.5 flex items-center gap-2.5 backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-visible select-none cursor-pointer pointer-events-auto"
      dir={dir}
      onClick={handleExpand}
    >
      {/* 1. Artwork (42x42 rounded-lg) */}
      <motion.div
        layoutId="aura-player-artwork"
        className="relative w-[42px] h-[42px] min-w-[42px] min-h-[42px] rounded-lg overflow-hidden shrink-0 bg-black/60 border border-white/10 shadow-md aspect-square"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentTrack.id}
            src={getOptimizedCoverUrl(currentTrack.coverUrl || currentTrack.artworkUrl, 'thumb')}
            alt={currentTrack.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-cover shrink-0 select-none pointer-events-none"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              getOfflineArtworkUrl(currentTrack.id).then((blobUrl) => {
                if (blobUrl && img.src !== blobUrl) {
                  img.src = blobUrl;
                } else {
                  img.src = './logo.svg';
                }
              }).catch(() => {
                img.src = './logo.svg';
              });
            }}
          />
        </AnimatePresence>
      </motion.div>

      {/* 2. Track Title & Artist (Clean BiDi Truncation at end) */}
      <div className="flex-1 min-w-0">
        <h4
          dir={isArabicText(currentTrack.title) ? 'rtl' : 'ltr'}
          className={`text-[13px] font-bold text-white truncate block leading-tight ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          {currentTrack.title}
        </h4>
        <p
          dir={isArabicText(currentTrack.artist) ? 'rtl' : 'ltr'}
          className={`text-[11px] text-[#B3B3B3] truncate block mt-0.5 font-normal leading-tight ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          {currentTrack.artist}
        </p>
      </div>

      {/* 3. Sleek Controls: Play/Pause (40px touch area) + Next Track (40px touch area) */}
      <div
        className="flex items-center gap-0.5 shrink-0 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Play / Pause Button (0ms instant icon swap, never disappears) */}
        <button
          type="button"
          data-testid="mini-play-pause-btn"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('medium');
            togglePlayPause();
          }}
          className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-white hover:bg-white/[0.08] cursor-pointer apple-play-btn touch-manipulation overflow-hidden transition-colors ${
            playbackState === 'buffering' ? 'ring-2 ring-white/30' : ''
          }`}
          aria-label={isPlaying ? t.pause : t.play}
        >
          {isPlaying ? (
            <Pause className="w-4.5 h-4.5 fill-white text-white" />
          ) : playbackState === 'buffering' ? (
            <div className="w-4.5 h-4.5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
          ) : (
            <Play className="w-4.5 h-4.5 fill-white text-white translate-x-0.5" />
          )}
        </button>

        {/* Skip Forward Button */}
        <button
          type="button"
          data-testid="mini-next-btn"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('light');
            nextTrack({ forceImmediate: true });
          }}
          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer apple-btn-tactile apple-next-btn touch-manipulation"
          aria-label={t.next}
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* 4. Bottom 2px hairline progress bar */}
      <MiniPlayerProgressBar />
    </motion.div>
  );
};
