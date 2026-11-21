import React, { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Play, Pause, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedCoverUrl } from '../../utils/imageOptimizer';
import { triggerHaptic } from '../../utils/haptics';

interface MiniPlayerProps {
  onExpand: () => void;
}

/**
 * Isolated hairline 2px progress bar subscribing directly to usePlayerStore.
 * Zero re-renders of the parent MiniPlayer on every 100ms tick.
 */
const MiniPlayerProgressBar: React.FC = () => {
  const barRef = useRef<HTMLDivElement>(null);
  const playbackState = usePlayerStore((state) => state.playbackState);

  useEffect(() => {
    return usePlayerStore.subscribe((state) => {
      if (!barRef.current) return;
      const cur = state.currentTime;
      const dur = state.duration > 0 ? state.duration : 1;
      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
      barRef.current.style.width = `${pct}%`;
    });
  }, []);

  const initialPct = () => {
    const s = usePlayerStore.getState();
    const dur = s.duration > 0 ? s.duration : 1;
    return Math.min(100, Math.max(0, (s.currentTime / dur) * 100));
  };

  return (
    <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/[0.08] overflow-hidden pointer-events-none">
      <div
        ref={barRef}
        className="h-full relative transition-all duration-150 bg-[#FA2D48]"
        style={{
          width: `${initialPct()}%`,
        }}
      >
        {playbackState === 'buffering' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer" />
        )}
      </div>
    </div>
  );
};

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { t, dir } = useTranslation();
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
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="mini-player"
      style={{
        bottom: 'calc(54px + max(12px, env(safe-area-inset-bottom, 0px)) + 8px)',
        transform: `translate3d(${dragX}px, 0, 0)`,
        transition: dragX === 0 ? 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
        touchAction: 'pan-y',
      }}
      className="fixed inset-x-3 z-40 h-[60px] rounded-2xl px-2.5 flex items-center gap-3 bg-[#1C1C22]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-hidden select-none cursor-pointer pointer-events-auto apple-row-press"
      dir={dir}
      onClick={handleExpand}
    >
      {/* 1. Artwork (44x44 rounded-lg) */}
      <motion.div
        layoutId="aura-player-artwork"
        className="relative w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-lg overflow-hidden shrink-0 bg-black/60 border border-white/10 shadow-md aspect-square"
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
              (e.target as HTMLImageElement).src = '/logo.svg';
            }}
          />
        </AnimatePresence>
      </motion.div>

      {/* 2. Track Title & Artist (Clean BiDi Truncation at end) */}
      <div className="flex-1 min-w-0">
        <h4 dir="auto" className="text-[13px] font-bold text-white truncate block text-start leading-tight">
          {currentTrack.title}
        </h4>
        <p dir="auto" className="text-[11px] text-zinc-400 truncate block text-start mt-0.5 font-normal leading-tight">
          {currentTrack.artist}
        </p>
      </div>

      {/* 3. Sleek Controls: Play/Pause (44px touch area) + Next Track (44px touch area) */}
      <div
        className="flex items-center gap-0.5 shrink-0 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Play / Pause Button with Pulsing Buffering Ring */}
        <button
          type="button"
          data-testid="mini-play-pause-btn"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('medium');
            togglePlayPause();
          }}
          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white cursor-pointer apple-play-btn touch-manipulation overflow-hidden ${
            playbackState === 'buffering' ? 'ring-2 ring-white/40' : ''
          }`}
          aria-label={isPlaying ? t.pause : t.play}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isPlaying ? 'pause' : playbackState === 'buffering' ? 'buffering' : 'play'}
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.72 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="flex items-center justify-center"
            >
              {playbackState === 'buffering' ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-white text-white" />
              ) : (
                <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
              )}
            </motion.div>
          </AnimatePresence>
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
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer apple-btn-tactile apple-next-btn touch-manipulation"
          aria-label={t.next}
        >
          <SkipForward className="w-4.5 h-4.5 fill-current" />
        </button>
      </div>

      {/* 4. Bottom 2px hairline progress bar */}
      <MiniPlayerProgressBar />
    </motion.div>
  );
};
