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
  Sparkles,
  Sliders,
  ListMusic,
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
        // Dismiss if dragged down > 90px or fast flick velocity.y > 350
        if (info.offset.y > 90 || info.velocity.y > 350) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 h-[100dvh] w-full flex flex-col justify-between px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,8px)+6px)] pb-[calc(env(safe-area-inset-bottom,8px)+12px)] bg-[#07070b] overflow-hidden select-none touch-pan-y"
      dir={dir}
    >
      {/* Dynamic Hardware-Accelerated Ambient Backdrop */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none transition-all duration-700 opacity-40"
        style={{
          background: `radial-gradient(circle at 50% 25%, ${accentColor} 0%, transparent 65%), #07070b`,
          transform: 'translateZ(0)',
        }}
      />

      {/* ========================================================================= */}
      {/* LAYER 1: DRAG HANDLE & COMPACT HEADER BAR */}
      {/* ========================================================================= */}
      <div className="w-full flex flex-col items-center flex-shrink-0">
        {/* Centered Drag Handle Pill */}
        <div
          onClick={handleClose}
          className="w-10 h-1.5 rounded-full bg-white/25 hover:bg-white/40 mx-auto mb-2 cursor-pointer transition-colors"
        />

        <div className="w-full flex items-center justify-between">
          {/* Collapse Button */}
          <button
            type="button"
            data-testid="minimize-player-btn"
            onClick={handleClose}
            className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/90 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            aria-label="Collapse player"
          >
            <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
          </button>

          {/* Source Indicator & Album Context */}
          <div className="text-center min-w-0 px-2 flex-1">
            <span className="text-[9.5px] sm:text-[10px] tracking-wider text-zinc-400 uppercase font-semibold block font-mono">
              {userQueue.length > 0
                ? isRTL ? 'يتم التشغيل من قائمة الانتظار' : 'Playing from Queue'
                : isRTL ? 'يتم التشغيل من المكتبة' : 'Playing from Library'}
            </span>
            <h5 className="text-[11.5px] sm:text-xs text-white/80 font-medium truncate max-w-[200px] mx-auto">
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
            className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/90 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 2: INTERACTIVE SPRING-SCALED ALBUM ARTWORK */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-1 sm:py-2">
        <motion.div
          layoutId="aura-player-artwork"
          data-testid="expanded-artwork-container"
          animate={{
            scale: isPlaying ? 1 : 0.86,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
          style={{
            boxShadow: isPlaying
              ? `0 20px 50px -10px ${accentColor}80`
              : '0 10px 25px -10px rgba(0, 0, 0, 0.7)',
          }}
          className="relative w-[min(70vw,34vh,280px)] h-[min(70vw,34vh,280px)] max-h-full aspect-square rounded-[22px] sm:rounded-[26px] overflow-hidden border border-white/[0.12] select-none flex-shrink-0"
        >
          <img
            src={currentTrack.artworkUrl || currentTrack.coverUrl || '/logo.svg'}
            alt={currentTrack.title}
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.svg';
            }}
          />
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 3: TRACK META & FAVORITE ACTION */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0 text-start">
          <h2 className="text-[18px] sm:text-[20px] font-bold text-white truncate tracking-tight leading-snug">
            <bdi dir="auto">{currentTrack.title}</bdi>
          </h2>
          <p className="text-[13.5px] sm:text-[15px] text-white/60 truncate mt-0.5 font-medium leading-snug">
            <bdi dir="auto">{currentTrack.artist}</bdi>
          </p>
        </div>

        <button
          type="button"
          data-testid="expanded-favorite-btn"
          onClick={() => {
            triggerHaptic('success');
            toggleFavorite(currentTrack.id);
          }}
          className="w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-[#FA243C] transition-transform active:scale-90 cursor-pointer rounded-full flex-shrink-0"
          aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <Heart
            className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
              isFav ? 'text-[#FA243C] fill-[#FA243C] drop-shadow-[0_0_12px_rgba(250,36,60,0.65)] scale-110' : 'text-zinc-500'
            }`}
          />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 4: ISOLATED ZERO-RERENDER TIMELINE SLIDER */}
      {/* ========================================================================= */}
      <div className="w-full flex-shrink-0 my-0.5 sm:my-1">
        <TimelineSlider
          duration={duration}
          onSeek={seek}
          showTimestamps={true}
          accentColor={accentColor}
        />
      </div>

      {/* ========================================================================= */}
      {/* LAYER 5: FIVE CORE PLAYBACK CONTROLS (0ms TACTILE RESPONSE) */}
      {/* ========================================================================= */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center justify-between w-full px-1 sm:px-2 my-0.5 sm:my-1 select-none flex-shrink-0"
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
          className={`relative w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 ${
            shuffle ? 'text-[#FA243C]' : 'text-zinc-400 hover:text-white'
          }`}
          title={isRTL ? 'تشغيل عشوائي' : 'Shuffle'}
          aria-label="Shuffle"
        >
          <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
          {shuffle && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#FA243C] shadow-[0_0_6px_#FA243C]" />}
        </button>

        {/* Previous Track */}
        <button
          type="button"
          data-testid="expanded-prev-btn"
          onClick={() => {
            triggerHaptic('light');
            previousTrack();
          }}
          className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] sm:min-w-[48px] min-h-[44px] sm:min-h-[48px] rounded-full flex items-center justify-center text-white cursor-pointer select-none transition-transform active:scale-90"
          title={isRTL ? 'السابق' : 'Previous'}
          aria-label="Previous track"
        >
          <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white" />
        </button>

        {/* Center Master Play/Pause Statement Button */}
        <button
          type="button"
          data-testid="expanded-play-pause-btn"
          onClick={() => {
            triggerHaptic('medium');
            togglePlayPause();
          }}
          className="w-14 h-14 sm:w-16 sm:h-16 min-w-[56px] sm:min-w-[64px] min-h-[56px] sm:min-h-[64px] rounded-full bg-white text-black flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer select-none flex-shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-black text-black" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-black text-black translate-x-0.5" />
          )}
        </button>

        {/* Next Track */}
        <button
          type="button"
          data-testid="expanded-next-btn"
          onClick={() => {
            triggerHaptic('light');
            nextTrack({ forceImmediate: true });
          }}
          className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] sm:min-w-[48px] min-h-[44px] sm:min-h-[48px] rounded-full flex items-center justify-center text-white cursor-pointer select-none transition-transform active:scale-90"
          title={isRTL ? 'التالي' : 'Next'}
          aria-label="Next track"
        >
          <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white" />
        </button>

        {/* Repeat Button */}
        <button
          type="button"
          data-testid="expanded-repeat-btn"
          onClick={() => {
            triggerHaptic('light');
            cycleRepeat();
          }}
          className={`relative w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 ${
            repeatMode !== 'off' ? 'text-[#FA243C]' : 'text-zinc-400 hover:text-white'
          }`}
          title={isRTL ? 'تكرار' : 'Repeat'}
          aria-label="Repeat"
        >
          {repeatMode === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
          {repeatMode !== 'off' && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#FA243C] shadow-[0_0_6px_#FA243C]" />}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 6: BOTTOM STUDIO DOCK (EXACTLY 4 PROMINENT BUTTONS) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-around w-full pt-1.5 sm:pt-2 border-t border-white/[0.06] flex-shrink-0 select-none">
        {/* 1. Synced Lyrics */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setLyricsOpen(true);
          }}
          className="flex flex-col items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-90"
          title={isRTL ? 'الكلمات المتزامنة' : 'Synced Lyrics'}
        >
          <Mic2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[9.5px] sm:text-[10px] font-medium">{isRTL ? 'الكلمات' : 'Lyrics'}</span>
        </button>

        {/* 2. AutoMix & Speed */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setAutoMixModalOpen(true);
          }}
          className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer active:scale-90 ${
            automixEnabled ? 'text-purple-400' : 'text-zinc-400 hover:text-white'
          }`}
          title="AutoMix & Speed"
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[9.5px] sm:text-[10px] font-medium">AutoMix</span>
        </button>

        {/* 3. EQ & DSP */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setEqualizerOpen(true);
          }}
          className="flex flex-col items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-90"
          title={isRTL ? 'المعادل والمؤثرات' : 'EQ & Effects'}
        >
          <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[9.5px] sm:text-[10px] font-medium">{isRTL ? 'المعادل' : 'EQ'}</span>
        </button>

        {/* 4. Queue Drawer */}
        <button
          type="button"
          data-testid="expanded-queue-btn"
          onClick={() => {
            triggerHaptic('light');
            setQueueOpen(true);
          }}
          className="flex flex-col items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-90 relative"
          title={isRTL ? 'طابور الانتظار' : 'Queue'}
        >
          <div className="relative">
            <ListMusic className="w-4 h-4 sm:w-5 sm:h-5" />
            {userQueue.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 rounded-full bg-[#FA243C] text-white text-[9px] font-mono font-black flex items-center justify-center border border-black shadow">
                {userQueue.length}
              </span>
            )}
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-medium">{isRTL ? 'الطابور' : 'Queue'}</span>
        </button>
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
