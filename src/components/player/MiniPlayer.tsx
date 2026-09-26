import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Play, Pause, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { t, isRTL, dir } = useTranslation();
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

  const accentColor = currentTrack.dominantColor || currentTrack.accentColor || '#FA243C';

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.28}
      onDragEnd={(_, info) => {
        // Swipe Up to open Full Player Sheet
        if (info.offset.y < -35 || info.velocity.y < -200) {
          handleExpand();
          return;
        }
        // Horizontal swipe to skip tracks
        if (info.offset.x < -50 || info.velocity.x < -250) {
          triggerHaptic();
          if (isRTL) {
            previousTrack();
          } else {
            nextTrack({ forceImmediate: true });
          }
        } else if (info.offset.x > 50 || info.velocity.x > 250) {
          triggerHaptic();
          if (isRTL) {
            nextTrack({ forceImmediate: true });
          } else {
            previousTrack();
          }
        }
      }}
      data-testid="mini-player"
      className="md:hidden fixed bottom-[calc(88px+env(safe-area-inset-bottom,0px))] inset-x-4 max-w-md mx-auto z-30 bg-[#12121a]/85 backdrop-blur-3xl border border-white/[0.12] rounded-3xl p-2 sm:p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center gap-3 select-none overflow-hidden touch-pan-y cursor-pointer active:scale-[0.99] transition-transform"
      dir={dir}
    >
      {/* Top Hairline Progress Line with Dynamic Glowing Color */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/[0.1] overflow-hidden pointer-events-none">
        <div
          className="h-full transition-all duration-150 rounded-full"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: '#FA243C',
            backgroundImage: 'linear-gradient(90deg, #FA243C, #FF375F)',
            boxShadow: '0 0 10px rgba(250, 36, 60, 0.8)',
          }}
        />
      </div>

      {/* Album Artwork with Ambient Shadow */}
      <div
        onClick={handleExpand}
        className="relative w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-black/60 border border-white/10 shadow-md"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentTrack.id}
            src={currentTrack.coverUrl || currentTrack.artworkUrl || '/logo.svg'}
            alt={currentTrack.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: isPlaying ? 1.05 : 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>
      </div>

      {/* Track Info */}
      <div onClick={handleExpand} className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs font-bold text-white truncate tracking-tight">
          {currentTrack.title}
        </h4>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[11px] text-zinc-400 truncate font-medium">
            {currentTrack.artist}
          </p>
          <span className="hidden xs:inline-flex items-center text-[9px] text-zinc-500 font-medium">
            • {t.swipeArtworkHint.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Play / Next Controls */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 flex-shrink-0"
        style={{ touchAction: 'manipulation' }}
      >
        <motion.button
          data-testid="mini-play-pause-btn"
          whileTap={{ scale: 0.86 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic();
            togglePlayPause();
          }}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center cursor-pointer select-none flex-shrink-0 shadow-lg hover:scale-105 active:scale-90 transition-transform"
          aria-label={isPlaying ? t.pause : t.play}
        >
          {isPlaying ? (
            <Pause className="w-4.5 h-4.5 fill-black text-black" />
          ) : (
            <Play className="w-4.5 h-4.5 fill-black text-black translate-x-0.5" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.86 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic();
            nextTrack({ forceImmediate: true });
          }}
          style={{ touchAction: 'manipulation' }}
          className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer select-none flex-shrink-0 active:scale-90 transition-transform"
          aria-label={t.next}
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </motion.button>
      </div>
    </motion.div>
  );
};
