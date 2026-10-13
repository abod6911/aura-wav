import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Play, Pause, SkipForward, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedCoverUrl } from '../../utils/imageOptimizer';

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { t, isRTL, dir } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);

  if (!currentTrack) return null;

  const isDownloaded = downloadedTrackIds.includes(currentTrack.id);
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
      style={{
        boxShadow: `0 16px 40px rgba(0,0,0,0.85), 0 0 35px -8px ${accentColor}40, inset 0 1px 1px rgba(255,255,255,0.2)`,
      }}
      className="md:hidden fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-4 max-w-md mx-auto z-30 apple-glass-dock rounded-[28px] p-2 sm:p-2.5 flex items-center gap-3 select-none overflow-hidden touch-pan-y cursor-pointer active:scale-[0.99] transition-transform transform-gpu border border-white/[0.14]"
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
        className="relative w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-black/60 border border-white/15 shadow-md"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentTrack.id}
            src={getOptimizedCoverUrl(currentTrack.coverUrl || currentTrack.artworkUrl, 'thumb')}
            alt={currentTrack.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: isPlaying ? 1.05 : 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>
      </div>

      {/* Track Info with BiDi support */}
      <div onClick={handleExpand} className="flex-1 min-w-0 pe-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-xs font-black text-white truncate tracking-tight leading-relaxed">
            <bdi dir="auto">{currentTrack.title}</bdi>
          </h4>
          {isDownloaded && (
            <span className="shrink-0 text-emerald-400" title={isRTL ? 'جاهزة بدون إنترنت' : 'Offline ready'}>
              <CheckCircle2 className="w-3 h-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 leading-relaxed">
          <p className="text-[11px] text-white/65 truncate font-medium">
            <bdi dir="auto">{currentTrack.artist}</bdi>
          </p>
          <span className="hidden xs:inline-flex items-center text-[9px] text-white/40 font-medium">
            • {isRTL ? 'اسحب للتخطي' : 'Swipe to skip'}
          </span>
        </div>
      </div>

      {/* Play / Next Controls with 44px HIG Tap Targets */}
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
          className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center cursor-pointer select-none flex-shrink-0 shadow-lg active:scale-90 transition-transform"
          aria-label={isPlaying ? t.pause : t.play}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-black text-black" />
          ) : playbackState === 'buffering' ? (
            <Loader2 className="w-5 h-5 animate-spin text-black" />
          ) : (
            <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
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
          className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/90 hover:text-white cursor-pointer select-none flex-shrink-0 active:scale-90 transition-transform border border-white/10"
          aria-label={t.next}
        >
          <SkipForward className="w-4.5 h-4.5 fill-current" />
        </motion.button>
      </div>
    </motion.div>
  );
};
