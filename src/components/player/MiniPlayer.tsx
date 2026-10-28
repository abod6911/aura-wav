import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Play, Pause, SkipForward, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedCoverUrl } from '../../utils/imageOptimizer';
import { triggerHaptic } from '../../utils/haptics';

interface MiniPlayerProps {
  onExpand: () => void;
}

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
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.1] overflow-hidden pointer-events-none rounded-b-[20px]">
      <div
        ref={barRef}
        className="h-full transition-all duration-150 rounded-full"
        style={{
          width: `${initialPct()}%`,
          backgroundColor: '#FA243C',
          backgroundImage: 'linear-gradient(90deg, #FA243C, #FF375F)',
          boxShadow: '0 0 10px rgba(250, 36, 60, 0.8)',
        }}
      />
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
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);

  if (!currentTrack) return null;

  const isDownloaded = downloadedTrackIds.includes(currentTrack.id);

  const handleExpand = () => {
    triggerHaptic('light');
    setMobilePlayerOpen(true);
    onExpand?.();
  };

  const accentColor = currentTrack.dominantColor || currentTrack.accentColor || '#FA243C';

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.28}
      onDragEnd={(_, info) => {
        // Swipe Up to open Full Player Sheet
        if (info.offset.y < -35 || info.velocity.y < -200) {
          handleExpand();
          return;
        }
        // Horizontal swipe to skip tracks with physical spring feel
        if (info.offset.x < -50 || info.velocity.x < -250) {
          triggerHaptic('light');
          if (isRTL) {
            previousTrack();
          } else {
            nextTrack({ forceImmediate: true });
          }
        } else if (info.offset.x > 50 || info.velocity.x > 250) {
          triggerHaptic('light');
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
        touchAction: 'manipulation',
      }}
      className="w-[calc(100%-1.5rem)] max-w-md mx-auto mb-1.5 h-[58px] apple-glass-dock rounded-[20px] px-3 py-1 flex items-center gap-2.5 select-none overflow-hidden touch-pan-y cursor-pointer aura-tap-btn border border-white/[0.14] shrink-0"
      dir={dir}
    >
      {/* Shared Layout Album Artwork with Ambient Shadow */}
      <motion.div
        layoutId="shared-track-artwork"
        onClick={handleExpand}
        className="relative w-11 h-11 rounded-[14px] overflow-hidden flex-shrink-0 bg-black/60 border border-white/15 shadow-md"
        transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
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
      </motion.div>

      {/* Track Info with BiDi support & strictly truncated */}
      <div onClick={handleExpand} className="flex-1 min-w-0 pe-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <motion.h4
            layoutId="shared-track-title"
            className="text-xs sm:text-sm font-black text-white truncate tracking-tight leading-tight"
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
          >
            <bdi dir="auto">{currentTrack.title}</bdi>
          </motion.h4>
          {isDownloaded && (
            <span className="shrink-0 text-emerald-400" title={isRTL ? 'جاهزة بدون إنترنت' : 'Offline ready'}>
              <CheckCircle2 className="w-3 h-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 leading-tight">
          <p className="text-[11px] text-white/65 truncate font-medium">
            <bdi dir="auto">{currentTrack.artist}</bdi>
          </p>
          <span className="hidden xs:inline-flex items-center text-[9px] text-white/40 font-medium shrink-0">
            • {isRTL ? 'اسحب للتخطي' : 'Swipe to skip'}
          </span>
        </div>
      </div>

      {/* Play / Next Controls with 40px Tactile Targets */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 flex-shrink-0"
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
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white text-black flex items-center justify-center cursor-pointer select-none flex-shrink-0 shadow-lg aura-tap-btn"
          aria-label={isPlaying ? t.pause : t.play}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-black text-black" />
          ) : playbackState === 'buffering' ? (
            <Loader2 className="w-4 h-4 animate-spin text-black" />
          ) : (
            <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
          )}
        </motion.button>

        <motion.button
          data-testid="mini-next-btn"
          whileTap={{ scale: 0.88 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic();
            nextTrack({ forceImmediate: true });
          }}
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/90 hover:text-white cursor-pointer select-none flex-shrink-0 aura-tap-btn border border-white/10"
          aria-label={t.next}
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </motion.button>
      </div>

      {/* Bottom Hairline 2px Progress Line with Zero-Rerender DOM Ref */}
      <MiniPlayerProgressBar />
    </motion.div>
  );
};
