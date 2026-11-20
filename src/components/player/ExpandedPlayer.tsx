import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { TimelineSlider } from './TimelineSlider';
import { TrackActionSheet } from '../library/TrackActionSheet';
import {
  ChevronDown,
  MoreHorizontal,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Mic2,
  Sliders,
  ListMusic,
  Radio,
} from 'lucide-react';

interface ExpandedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpandedPlayer: React.FC<ExpandedPlayerProps> = ({ isOpen, onClose }) => {
  const isMobilePlayerOpen = usePlayerStore((state) => state.isMobilePlayerOpen);
  const effectiveOpen = isOpen || isMobilePlayerOpen;
  const hasTrack = usePlayerStore((state) => !!state.currentTrack);

  return (
    <AnimatePresence>
      {effectiveOpen && hasTrack && <ExpandedPlayerSheet onClose={onClose} />}
    </AnimatePresence>
  );
};

const ExpandedPlayerSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { isRTL, dir } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack!);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const duration = usePlayerStore((state) => state.duration);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const userQueue = usePlayerStore((state) => state.userQueue);
  const favorites = usePlayerStore((state) => state.favorites);
  const trackTransitionDirection = usePlayerStore((state) => state.trackTransitionDirection);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seek = usePlayerStore((state) => state.seek);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);

  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);
  const setAutoMixModalOpen = usePlayerStore((state) => state.setAutoMixModalOpen);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setDeviceSwitcherOpen = usePlayerStore((state) => state.setDeviceSwitcherOpen);

  const [isActionSheetOpen, setActionSheetOpen] = useState(false);

  const isFav = favorites.includes(currentTrack.id);

  const handleClose = () => {
    triggerHaptic('light');
    setMobilePlayerOpen(false);
    onClose?.();
  };

  const accentColor = currentTrack.accentColor || currentTrack.dominantColor || '#FA243C';

  return (
    <motion.div
      key="expanded-player-sheet"
      data-testid="expanded-player-sheet"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => {
        // 120fps Drag-to-Dismiss physics:
        // Dismiss if dragged down > 55px or fast flick velocity.y > 200
        if (info.offset.y > 55 || info.velocity.y > 200) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 w-full h-full min-h-full flex flex-col justify-between px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-[calc(env(safe-area-inset-bottom,0px)+12px)] bg-[#09090B] obsidian-grain overflow-hidden select-none touch-pan-y"
      dir={dir}
    >
      {/* Dual-Layer Blurred Ambient Backdrop Crossfade (750ms Apple Easing) */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden select-none">
        <AnimatePresence mode="sync">
          <motion.div
            key={currentTrack.id + '-ambient'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 transform-gpu"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 28%, rgba(var(--ambient-primary-rgb, 250, 45, 72), 0.35) 0%, transparent 65%), radial-gradient(circle at 75% 80%, rgba(var(--ambient-accent-rgb, 250, 45, 72), 0.2) 0%, transparent 60%)`,
            }}
          />
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 1: DRAG HANDLE & COMPACT HEADER BAR */}
      {/* ========================================================================= */}
      <div className="w-full flex flex-col items-center flex-shrink-0">
        {/* Centered Drag Handle Pill */}
        <div
          onClick={handleClose}
          className="w-10 h-1 rounded-full bg-white/25 hover:bg-white/40 mx-auto mb-2 cursor-pointer transition-colors"
        />

        <div className="w-full flex items-center justify-between">
          {/* Collapse Button */}
          <button
            type="button"
            data-testid="minimize-player-btn"
            onClick={handleClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/90 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            aria-label="Collapse player"
          >
            <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
          </button>

          {/* Source Indicator & Album Context */}
          <div className="text-center min-w-0 px-2 flex-1">
            <span className="text-[9px] sm:text-[10px] tracking-wider text-zinc-400 uppercase font-semibold block font-mono">
              {userQueue.length > 0
                ? isRTL ? 'يتم التشغيل من قائمة الانتظار' : 'Playing from Queue'
                : isRTL ? 'يتم التشغيل من المكتبة' : 'Playing from Library'}
            </span>
            <h5 dir="auto" className="text-[11.5px] sm:text-xs text-white/80 font-medium truncate max-w-[200px] mx-auto text-center block">
              {currentTrack.album || currentTrack.title}
            </h5>
          </div>

          {/* More Options (...) Button */}
          <button
            type="button"
            data-testid="more-options-btn"
            onClick={() => {
              triggerHaptic('light');
              setActionSheetOpen(true);
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/90 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 2: INTERACTIVE SPRING-SCALED ALBUM ARTWORK */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-2 sm:py-3">
        <motion.div
          layoutId="aura-player-artwork"
          data-testid="expanded-artwork-container"
          animate={{
            scale: isPlaying ? 1 : 0.84,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.85 }}
          style={{
            boxShadow: isPlaying
              ? '0 24px 60px rgba(0, 0, 0, 0.5), 0 0 45px -8px rgba(var(--ambient-primary-rgb, 250, 45, 72), 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 8px 20px rgba(0, 0, 0, 0.3)',
          }}
          className="relative w-[min(78vw,38vh,320px)] h-[min(78vw,38vh,320px)] max-h-full aspect-square rounded-[22px] sm:rounded-[28px] overflow-hidden border border-white/[0.14] select-none flex-shrink-0 shadow-2xl specular-highlight transition-[box-shadow] duration-450"
        >
          <AnimatePresence mode="popLayout" custom={trackTransitionDirection} initial={false}>
            <motion.img
              key={currentTrack.id}
              src={currentTrack.artworkUrl || currentTrack.coverUrl || '/logo.svg'}
              alt={currentTrack.title}
              custom={trackTransitionDirection}
              variants={{
                enter: (direction: string) => ({
                  x: direction === 'next' ? 28 : direction === 'prev' ? -28 : 0,
                  scale: direction === 'fade' ? 0.96 : 0.94,
                  opacity: 0,
                  filter: 'blur(4px)',
                }),
                center: {
                  x: 0,
                  scale: 1,
                  opacity: 1,
                  filter: 'blur(0px)',
                },
                exit: (direction: string) => ({
                  x: direction === 'next' ? -24 : direction === 'prev' ? 24 : 0,
                  scale: 0.92,
                  opacity: 0,
                  filter: 'blur(3px)',
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.85 }}
              className="w-full h-full object-cover select-none pointer-events-none absolute inset-0"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 vinyl-sheen pointer-events-none z-10" />
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* LOWER CONTROLS CLUSTER: Unified Proportional Spacing */}
      {/* ========================================================================= */}
      <div className="w-full max-w-md mx-auto flex-shrink-0 space-y-2 sm:space-y-3">
        {/* LAYER 3: TRACK META & FAVORITE ACTION */}
        <div className="w-full flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0 text-start overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={currentTrack.id + '-title'}
                initial={{
                  opacity: 0,
                  x: trackTransitionDirection === 'next' ? 8 : trackTransitionDirection === 'prev' ? -8 : 0,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: trackTransitionDirection === 'next' ? -8 : trackTransitionDirection === 'prev' ? 8 : 0,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 28, duration: 0.28 }}
                className="text-[17px] sm:text-[19px] font-bold text-white truncate tracking-tight leading-snug"
              >
                <bdi dir="auto">{currentTrack.title}</bdi>
              </motion.h2>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={currentTrack.id + '-artist'}
                initial={{
                  opacity: 0,
                  x: trackTransitionDirection === 'next' ? 8 : trackTransitionDirection === 'prev' ? -8 : 0,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: trackTransitionDirection === 'next' ? -8 : trackTransitionDirection === 'prev' ? 8 : 0,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 28, duration: 0.28, delay: 0.04 }}
                className="text-[13px] sm:text-[14px] text-white/60 truncate mt-0.5 font-medium leading-snug"
              >
                <bdi dir="auto">{currentTrack.artist}</bdi>
              </motion.p>
            </AnimatePresence>
          </div>

          <button
            type="button"
            data-testid="expanded-favorite-btn"
            onClick={() => {
              triggerHaptic('success');
              toggleFavorite(currentTrack.id);
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[#FA2D48] apple-btn-tactile cursor-pointer rounded-full flex-shrink-0"
            aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          >
            <Heart
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
                isFav ? 'text-[#FA2D48] fill-[#FA2D48] scale-105' : 'text-zinc-500'
              }`}
            />
          </button>
        </div>

        {/* LAYER 4: ISOLATED ZERO-RERENDER TIMELINE SLIDER */}
        <div className="w-full flex-shrink-0">
          <TimelineSlider
            duration={duration}
            onSeek={seek}
            showTimestamps={true}
            accentColor={accentColor}
          />
        </div>

        {/* LAYER 5: FIVE CORE PLAYBACK CONTROLS (0ms TACTILE RESPONSE) */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center justify-between w-full px-1 select-none flex-shrink-0"
          dir="ltr"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Shuffle Button */}
          <button
            type="button"
            data-testid="expanded-shuffle-btn"
            onClick={() => {
              triggerHaptic('light');
              toggleShuffle();
            }}
            className={`relative w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center cursor-pointer select-none apple-btn-tactile ${
              shuffle ? 'text-[#FA2D48]' : 'text-zinc-400 hover:text-white'
            }`}
            title={isRTL ? 'تشغيل عشوائي' : 'Shuffle'}
            aria-label="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
            {shuffle && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#FA2D48]" />}
          </button>

          {/* Previous Track */}
          <button
            type="button"
            data-testid="expanded-prev-btn"
            onClick={() => {
              triggerHaptic('light');
              previousTrack();
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white cursor-pointer select-none apple-btn-tactile apple-prev-btn"
            title={isRTL ? 'السابق' : 'Previous'}
            aria-label="Previous track"
          >
            <SkipBack className="w-6 h-6 fill-white text-white" />
          </button>

          {/* Center Master Play/Pause Statement Button with 15deg morph */}
          <button
            type="button"
            data-testid="expanded-play-pause-btn"
            onClick={() => {
              triggerHaptic('medium');
              togglePlayPause();
            }}
            className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-white text-black flex items-center justify-center shadow-xl apple-play-btn cursor-pointer select-none flex-shrink-0 overflow-hidden"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isPlaying ? 'pause' : 'play'}
                initial={{ opacity: 0, scale: 0.72, rotate: isPlaying ? -15 : 15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.72, rotate: isPlaying ? 15 : -15 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className="flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-black text-black" />
                ) : (
                  <Play className="w-7 h-7 fill-black text-black translate-x-0.5" />
                )}
              </motion.div>
            </AnimatePresence>
          </button>

          {/* Next Track */}
          <button
            type="button"
            data-testid="expanded-next-btn"
            onClick={() => {
              triggerHaptic('light');
              nextTrack({ forceImmediate: true });
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white cursor-pointer select-none apple-btn-tactile apple-next-btn"
            title={isRTL ? 'التالي' : 'Next'}
            aria-label="Next track"
          >
            <SkipForward className="w-6 h-6 fill-white text-white" />
          </button>

          {/* Repeat Button */}
          <button
            type="button"
            data-testid="expanded-repeat-btn"
            onClick={() => {
              triggerHaptic('light');
              cycleRepeat();
            }}
            className={`relative w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center cursor-pointer select-none apple-btn-tactile ${
              repeatMode !== 'off' ? 'text-[#FA2D48]' : 'text-zinc-400 hover:text-white'
            }`}
            title={isRTL ? 'تكرار' : 'Repeat'}
            aria-label="Repeat"
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            {repeatMode !== 'off' && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#FA2D48]" />}
          </button>
        </div>

        {/* LAYER 6: BOTTOM STUDIO DOCK (CLEAN 3 TOOLS: LYRICS, EQ, QUEUE) */}
        <div className="flex items-center justify-around w-full pt-1.5 sm:pt-2 border-t border-white/[0.06] flex-shrink-0 select-none">
          {/* 1. Synced Lyrics */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setLyricsOpen(true);
            }}
            className="flex flex-col items-center justify-center min-w-[52px] min-h-[44px] gap-0.5 p-1 rounded-xl text-zinc-400 hover:text-white apple-btn-tactile cursor-pointer"
            title={isRTL ? 'الكلمات المتزامنة' : 'Synced Lyrics'}
          >
            <Mic2 className="w-5 h-5" />
            <span className="text-[10px] font-medium">{isRTL ? 'الكلمات' : 'Lyrics'}</span>
          </button>

          {/* 2. EQ & Studio Effects */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setEqualizerOpen(true);
            }}
            className="flex flex-col items-center justify-center min-w-[52px] min-h-[44px] gap-0.5 p-1 rounded-xl text-zinc-400 hover:text-white apple-btn-tactile cursor-pointer"
            title={isRTL ? 'المعادل والمؤثرات' : 'EQ & Effects'}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px] font-medium">{isRTL ? 'المعادل' : 'EQ'}</span>
          </button>

          {/* 3. Queue Drawer */}
          <button
            type="button"
            data-testid="expanded-queue-btn"
            onClick={() => {
              triggerHaptic('light');
              setQueueOpen(true);
            }}
            className="flex flex-col items-center justify-center min-w-[52px] min-h-[44px] gap-0.5 p-1 rounded-xl text-zinc-400 hover:text-white apple-btn-tactile cursor-pointer relative"
            title={isRTL ? 'قائمة الانتظار' : 'Queue'}
          >
            <div className="relative">
              <ListMusic className="w-5 h-5" />
              {userQueue.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 rounded-full bg-[#FA2D48] text-white text-[8.5px] font-mono font-bold flex items-center justify-center border border-black shadow">
                  {userQueue.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{isRTL ? 'القائمة' : 'Queue'}</span>
          </button>
        </div>
      </div>

      {/* Track Action Sheet */}
      <TrackActionSheet
        track={currentTrack}
        isOpen={isActionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
      />
    </motion.div>
  );
};
