import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Play, Pause, SkipForward, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);

  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);

  if (!currentTrack) return null;

  const validDuration = isFinite(duration) && duration > 0 ? duration : 1;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / validDuration) * 100));

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const handleExpand = () => {
    triggerHaptic();
    setMobilePlayerOpen(true);
    onExpand?.();
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.25}
      onDragEnd={(_, info) => {
        if (info.offset.x < -60 || info.velocity.x < -250) {
          triggerHaptic();
          nextTrack({ forceImmediate: true });
        } else if (info.offset.x > 60 || info.velocity.x > 250) {
          triggerHaptic();
          previousTrack();
        }
      }}
      data-testid="mini-player"
      className="md:hidden fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 bg-[#242424]/95 backdrop-blur-2xl border border-white/[0.12] rounded-xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center gap-3 select-none overflow-hidden touch-pan-y contain-paint-layout gpu-accelerated"
    >
      {/* Album Artwork */}
      <div
        onClick={handleExpand}
        className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-black/60 border border-white/10 shadow-md cursor-pointer"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentTrack.id}
            src={currentTrack.coverUrl || currentTrack.artworkUrl || '/logo.svg'}
            alt={currentTrack.title}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: isPlaying ? 1.05 : 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>
      </div>

      {/* Track Info */}
      <div onClick={handleExpand} className="flex-1 min-w-0 cursor-pointer">
        <h4 className="text-xs font-bold text-white truncate tracking-tight">
          {currentTrack.title}
        </h4>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[11px] text-zinc-400 truncate font-medium">
            {currentTrack.artist}
          </p>
          {/* Subtle Swipe Indicator */}
          <span className="hidden xs:inline-flex items-center text-[9px] text-zinc-500 font-medium">
            • اسحب للتخطي
          </span>
        </div>
      </div>

      {/* Play Controls with Spring Feedback */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 flex-shrink-0"
        style={{ touchAction: 'manipulation' }}
      >
        <motion.button
          data-testid="mini-play-pause-btn"
          whileTap={{ scale: 0.88 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic();
            togglePlayPause();
          }}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center cursor-pointer select-none flex-shrink-0 shadow-md hover:scale-105 transition-transform"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-black text-black" />
          ) : (
            <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic();
            nextTrack({ forceImmediate: true });
          }}
          style={{ touchAction: 'manipulation' }}
          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer select-none flex-shrink-0"
          aria-label="Next track"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </motion.button>
      </div>

      {/* Spotify Signature Green Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/[0.08]">
        <div
          className="h-full bg-[#1DB954] transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </motion.div>
  );
};
