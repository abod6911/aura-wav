import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Play, Pause, SkipForward, Loader2 } from 'lucide-react';
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
        className="h-full transition-all duration-150 bg-[#FA2D48]"
        style={{
          width: `${initialPct()}%`,
        }}
      />
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
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);

  if (!currentTrack) return null;

  const handleExpand = () => {
    triggerHaptic('light');
    setMobilePlayerOpen(true);
    onExpand?.();
  };

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.25, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -20 || info.velocity.y < -120) {
          handleExpand();
        }
      }}
      data-testid="mini-player"
      style={{
        bottom: 'calc(54px + env(safe-area-inset-bottom, 0px) + 8px)',
        touchAction: 'manipulation',
      }}
      className="fixed inset-x-3 z-40 h-[60px] rounded-2xl px-2.5 flex items-center gap-3 bg-[#1C1C22]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-hidden select-none cursor-pointer pointer-events-auto"
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
        {/* Play / Pause Button */}
        <button
          type="button"
          data-testid="mini-play-pause-btn"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('medium');
            togglePlayPause();
          }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white cursor-pointer active:scale-90 transition-transform touch-manipulation"
          aria-label={isPlaying ? t.pause : t.play}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-white text-white" />
          ) : playbackState === 'buffering' ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
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
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer active:scale-90 transition-transform touch-manipulation"
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
