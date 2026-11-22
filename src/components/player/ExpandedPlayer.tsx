import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { TimelineSlider } from './TimelineSlider';
import { TrackActionSheet } from '../library/TrackActionSheet';
import { getActiveLyricIndex } from '../../services/lyricsParser';
import { Track } from '../../types';
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
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Music2,
  CheckCircle2,
  ArrowDownToLine,
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

// =========================================================================
// EMBEDDED APPLE MUSIC-STYLE SYNCED LYRICS VIEW
// =========================================================================
interface EmbeddedLyricsViewProps {
  track: Track;
  onSeek: (time: number) => void;
}

const EmbeddedLyricsView: React.FC<EmbeddedLyricsViewProps> = memo(({ track, onSeek }) => {
  const { isRTL } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(-1);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const synced = track.syncedLyrics && track.syncedLyrics.length > 0 ? track.syncedLyrics : null;
  const plain = track.lyrics || null;

  useEffect(() => {
    if (!synced) return;
    return usePlayerStore.subscribe((state) => {
      const idx = getActiveLyricIndex(synced, state.currentTime);
      setActiveIdx((prev) => (prev !== idx ? idx : prev));
    });
  }, [synced]);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIdx]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full max-h-full overflow-y-auto px-4 py-6 space-y-4 no-scrollbar select-none"
      style={{ touchAction: 'pan-y' }}
    >
      {synced ? (
        synced.map((line, idx) => {
          const isActive = idx === activeIdx;
          const isArabic = /[\u0600-\u06FF]/.test(line.text);
          return (
            <div
              key={idx + '-' + line.time}
              ref={isActive ? activeLineRef : null}
              onClick={() => {
                triggerHaptic('light');
                onSeek(line.time);
              }}
              className={`py-2.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-white/[0.08] backdrop-blur-md'
                  : 'hover:bg-white/[0.03]'
              }`}
              dir={isArabic ? 'rtl' : 'ltr'}
            >
              <p
                className={`font-sans tracking-tight transition-all duration-300 leading-relaxed ${
                  isActive
                    ? 'text-[21px] sm:text-[23px] font-black text-white scale-100 opacity-100 drop-shadow-md'
                    : 'text-[17px] sm:text-[18px] font-semibold text-white/35 scale-[0.98] blur-[0.4px] hover:blur-0 hover:text-white/70'
                }`}
              >
                <bdi dir="auto">{line.text}</bdi>
              </p>
            </div>
          );
        })
      ) : plain ? (
        <div className="py-4 px-3 text-center sm:text-start leading-loose text-white/70 font-medium text-base whitespace-pre-line">
          <bdi dir="auto">{plain}</bdi>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center px-6 space-y-3">
          <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-400">
            <Music2 className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-white/80">
            {isRTL ? 'كلمات الأغنية غير متوفرة لهذا المسار' : "Lyrics aren't available for this track"}
          </p>
          <p className="text-xs text-white/40 max-w-xs">
            {isRTL ? 'استمتع بالاستماع مع توهج الغلاف المحيطي المباشر' : 'Enjoy the audio with dynamic live ambient backdrop'}
          </p>
        </div>
      )}
    </div>
  );
});
EmbeddedLyricsView.displayName = 'EmbeddedLyricsView';

// =========================================================================
// EMBEDDED APPLE MUSIC-STYLE UP NEXT QUEUE VIEW
// =========================================================================
interface EmbeddedQueueViewProps {
  currentTrack: Track;
  isPlaying: boolean;
  userQueue: Track[];
  queue: Track[];
  playTrack: (track: Track) => void;
  reorderUserQueue: (start: number, end: number) => void;
  removeFromUserQueue: (index: number) => void;
  clearUserQueue: () => void;
}

const EmbeddedQueueView: React.FC<EmbeddedQueueViewProps> = memo(({
  currentTrack,
  isPlaying,
  userQueue,
  queue,
  playTrack,
  reorderUserQueue,
  removeFromUserQueue,
  clearUserQueue,
}) => {
  const { isRTL } = useTranslation();
  const currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
  const upcomingLibraryTracks = currentIdx >= 0 ? queue.slice(currentIdx + 1, currentIdx + 30) : queue.slice(0, 30);

  return (
    <div
      className="w-full h-full max-h-full overflow-y-auto px-2 py-3 space-y-4 no-scrollbar select-none"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-white/70">
          {isRTL ? 'قائمة التشغيل التالية (Up Next)' : 'Up Next Queue'}
        </span>
        {userQueue.length > 0 && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              clearUserQueue();
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300 cursor-pointer px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isRTL ? 'تفريغ القائمة' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* 1. NOW PLAYING */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono font-semibold uppercase text-zinc-400 px-2">
          {isRTL ? 'يتم التشغيل الآن' : 'Now Playing'}
        </span>
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.08] border border-white/10 shadow-sm">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/10 relative">
            <img
              src={currentTrack.artworkUrl || currentTrack.coverUrl || '/logo.svg'}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                <span className="w-0.5 h-3 bg-[#FA2D48] animate-pulse rounded-full" />
                <span className="w-0.5 h-4 bg-[#FA2D48] animate-pulse rounded-full delay-75" />
                <span className="w-0.5 h-2.5 bg-[#FA2D48] animate-pulse rounded-full delay-150" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h5 dir="auto" className="text-xs sm:text-sm font-bold text-white truncate leading-snug">
              {currentTrack.title}
            </h5>
            <p dir="auto" className="text-[11px] text-zinc-400 truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 shrink-0 px-2">
            {currentTrack.duration ? `${Math.floor(currentTrack.duration / 60)}:${String(Math.floor(currentTrack.duration % 60)).padStart(2, '0')}` : '3:00'}
          </span>
        </div>
      </div>

      {/* 2. PLAYING NEXT (PRIORITY QUEUE) */}
      {userQueue.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#FA2D48] px-2 flex items-center gap-1.5">
            <span>{isRTL ? 'التشغيل التالي مباشرة (Priority)' : 'Playing Next'}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#FA2D48]/20 text-[#FA2D48]">
              {userQueue.length}
            </span>
          </span>
          <div className="space-y-1">
            {userQueue.map((track, idx) => (
              <div
                key={track.id + '-uq-' + idx}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-colors group"
              >
                <div
                  onClick={() => {
                    triggerHaptic('light');
                    playTrack(track);
                  }}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 cursor-pointer"
                >
                  <img
                    src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  onClick={() => {
                    triggerHaptic('light');
                    playTrack(track);
                  }}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <h6 dir="auto" className="text-xs font-bold text-white truncate leading-tight">
                    {track.title}
                  </h6>
                  <p dir="auto" className="text-[10.5px] text-zinc-400 truncate mt-0.5">
                    {track.artist}
                  </p>
                </div>
                {/* Reorder / Remove Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        reorderUserQueue(idx, idx - 1);
                      }}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title={isRTL ? 'تحريك للأعلى' : 'Move up'}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {idx < userQueue.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        reorderUserQueue(idx, idx + 1);
                      }}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title={isRTL ? 'تحريك للأسفل' : 'Move down'}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      removeFromUserQueue(idx);
                    }}
                    className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                    title={isRTL ? 'حذف من القائمة' : 'Remove'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. UPCOMING FROM LIBRARY / PLAYLIST */}
      {upcomingLibraryTracks.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-mono font-semibold uppercase text-zinc-400 px-2">
            {isRTL ? 'قادم من المكتبة / القائمة' : 'Upcoming from Library'}
          </span>
          <div className="space-y-1">
            {upcomingLibraryTracks.map((track) => (
              <div
                key={track.id + '-upc'}
                onClick={() => {
                  triggerHaptic('light');
                  playTrack(track);
                }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10">
                  <img
                    src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h6 dir="auto" className="text-xs font-semibold text-white/90 truncate leading-tight group-hover:text-white">
                    {track.title}
                  </h6>
                  <p dir="auto" className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {track.artist}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                  {track.duration ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
EmbeddedQueueView.displayName = 'EmbeddedQueueView';

// =========================================================================
// MAIN EXPANDED PLAYER SHEET COMPONENT
// =========================================================================
const ExpandedPlayerSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { isRTL, dir } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack!);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const duration = usePlayerStore((state) => state.duration);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const userQueue = usePlayerStore((state) => state.userQueue);
  const queue = usePlayerStore((state) => state.queue);
  const favorites = usePlayerStore((state) => state.favorites);
  const trackTransitionDirection = usePlayerStore((state) => state.trackTransitionDirection);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const seek = usePlayerStore((state) => state.seek);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const downloadTrackForOffline = usePlayerStore((state) => state.downloadTrackForOffline);
  const reorderUserQueue = usePlayerStore((state) => state.reorderUserQueue);
  const removeFromUserQueue = usePlayerStore((state) => state.removeFromUserQueue);
  const clearUserQueue = usePlayerStore((state) => state.clearUserQueue);

  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);

  const [activeCenterView, setActiveCenterView] = useState<'artwork' | 'lyrics' | 'queue'>('artwork');
  const [isActionSheetOpen, setActionSheetOpen] = useState(false);

  const isFav = favorites.includes(currentTrack.id);
  const isDownloaded = downloadedTrackIds.includes(currentTrack.id);

  const handleClose = () => {
    triggerHaptic('light');
    setMobilePlayerOpen(false);
    onClose?.();
  };

  const accentColor = currentTrack.accentColor || currentTrack.dominantColor || '#FA243C';

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <motion.div
      key="expanded-player-sheet"
      data-testid="expanded-player-sheet"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      drag={activeCenterView === 'artwork' ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.1, bottom: 0.7 }}
      onDragEnd={(_, info) => {
        // 120fps Drag-to-Dismiss physics:
        // Dismiss if dragged down > 110px or fast downward velocity > 300px/s
        if (info.offset.y > 110 || info.velocity.y > 300) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 w-full h-full min-h-full flex flex-col justify-between px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+6px)] pb-[calc(env(safe-area-inset-bottom,0px)+8px)] bg-[#09090B] obsidian-grain overflow-hidden select-none"
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
          className="w-9 h-1 rounded-full bg-white/25 hover:bg-white/40 mx-auto mb-1.5 cursor-pointer transition-colors"
        />

        <div className="w-full flex items-center justify-between">
          {/* Collapse Button */}
          <button
            type="button"
            data-testid="minimize-player-btn"
            onClick={handleClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/90 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            aria-label="Collapse player"
          >
            <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
          </button>

          {/* Center Title or Live Sleep Timer Countdown Pill */}
          <div className="text-center min-w-0 px-2 flex-1 flex flex-col items-center">
            {sleepTimerRemaining !== null ? (
              <button
                type="button"
                onClick={() => setSleepTimerOpen(true)}
                className="px-2.5 py-0.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white flex items-center gap-1.5 cursor-pointer apple-btn-tactile transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-[#FA2D48] animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-white/95">
                  {formatRemaining(sleepTimerRemaining)}
                </span>
              </button>
            ) : (
              <>
                <span className="text-[9px] sm:text-[10px] tracking-wider text-zinc-400 uppercase font-semibold block font-mono">
                  {activeCenterView === 'lyrics'
                    ? isRTL ? 'الكلمات المتزامنة' : 'Synced Lyrics'
                    : activeCenterView === 'queue'
                    ? isRTL ? 'قائمة الانتظار' : 'Up Next'
                    : userQueue.length > 0
                    ? isRTL ? 'يتم التشغيل من قائمة الانتظار' : 'Playing from Queue'
                    : isRTL ? 'يتم التشغيل من المكتبة' : 'Playing from Library'}
                </span>
                <h5 dir="auto" className="text-[11.5px] sm:text-xs text-white/80 font-medium truncate max-w-[200px] mx-auto text-center block">
                  {currentTrack.album || currentTrack.title}
                </h5>
              </>
            )}
          </div>

          {/* More Options (...) Button */}
          <button
            type="button"
            data-testid="more-options-btn"
            onClick={() => {
              triggerHaptic('light');
              setActionSheetOpen(true);
            }}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/90 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 2: CENTER STAGE (ARTWORK / SYNCED LYRICS / UP NEXT QUEUE) */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-1 sm:py-2.5 overflow-hidden">
        {activeCenterView === 'artwork' ? (
          /* Large Spring-Scaled Album Artwork with Horizontal Swipe Gesture */
          <motion.div
            layoutId="aura-player-artwork"
            data-testid="expanded-artwork-container"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.45}
            onDragEnd={(_, info) => {
              // Horizontal swipe to skip tracks on artwork
              if (info.offset.x < -65 || info.velocity.x < -250) {
                triggerHaptic('light');
                nextTrack({ forceImmediate: true });
              } else if (info.offset.x > 65 || info.velocity.x > 250) {
                triggerHaptic('light');
                previousTrack();
              }
            }}
            animate={{
              scale: isPlaying ? 1 : 0.86,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.85 }}
            style={{
              boxShadow: isPlaying
                ? '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 35px -8px rgba(var(--ambient-primary-rgb, 250, 45, 72), 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                : '0 8px 20px rgba(0, 0, 0, 0.3)',
              touchAction: 'pan-y',
            }}
            className="relative w-[min(68vw,30vh,260px)] h-[min(68vw,30vh,260px)] sm:w-[min(75vw,36vh,320px)] sm:h-[min(75vw,36vh,320px)] max-h-full aspect-square rounded-[22px] sm:rounded-[28px] overflow-hidden border border-white/[0.14] select-none flex-shrink-0 shadow-2xl specular-highlight transition-[box-shadow] duration-450 cursor-grab active:cursor-grabbing"
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
        ) : activeCenterView === 'lyrics' ? (
          <EmbeddedLyricsView track={currentTrack} onSeek={seek} />
        ) : (
          <EmbeddedQueueView
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            userQueue={userQueue}
            queue={queue}
            playTrack={playTrack}
            reorderUserQueue={reorderUserQueue}
            removeFromUserQueue={removeFromUserQueue}
            clearUserQueue={clearUserQueue}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* LOWER CONTROLS CLUSTER: Unified Proportional Spacing */}
      {/* ========================================================================= */}
      <div className="w-full max-w-md mx-auto flex-shrink-0 space-y-1 sm:space-y-2.5">
        {/* LAYER 3: TRACK META & FAVORITE ACTION */}
        <div className="w-full flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0 text-start overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={currentTrack.id + '-title'}
                dir="auto"
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
                className="text-[16px] sm:text-[19px] font-bold text-white truncate tracking-tight leading-snug block"
              >
                {currentTrack.title}
              </motion.h2>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={currentTrack.id + '-artist'}
                dir="auto"
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
                className="text-[12px] sm:text-[14px] text-white/60 truncate mt-0.5 font-medium leading-snug block"
              >
                {currentTrack.artist}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Offline Download Button */}
            <button
              type="button"
              data-testid="expanded-download-btn"
              onClick={() => {
                triggerHaptic('light');
                downloadTrackForOffline(currentTrack.id);
              }}
              disabled={isDownloaded}
              className={`w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center apple-btn-tactile cursor-pointer rounded-full flex-shrink-0 transition-colors ${
                isDownloaded ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label={isDownloaded ? 'محفوظة بدون إنترنت' : 'تنزيل بدون إنترنت'}
              title={isDownloaded ? 'محفوظة للاستماع دون إنترنت' : 'تنزيل للاستماع دون إنترنت'}
            >
              {isDownloaded ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <ArrowDownToLine className="w-5 h-5" />
              )}
            </button>

            {/* Favorite Button */}
            <button
              type="button"
              data-testid="expanded-favorite-btn"
              onClick={() => {
                triggerHaptic('success');
                toggleFavorite(currentTrack.id);
              }}
              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-400 hover:text-[#FA2D48] apple-btn-tactile cursor-pointer rounded-full flex-shrink-0"
              aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            >
              <Heart
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
                  isFav ? 'text-[#FA2D48] fill-[#FA2D48] scale-105' : 'text-zinc-500'
                }`}
              />
            </button>
          </div>
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
            className={`relative w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center cursor-pointer select-none apple-btn-tactile ${
              shuffle ? 'text-[#FA2D48]' : 'text-zinc-400 hover:text-white'
            }`}
            title={isRTL ? 'تشغيل عشوائي' : 'Shuffle'}
            aria-label="Shuffle"
          >
            <Shuffle className="w-4.5 h-4.5" />
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
            <SkipBack className="w-5.5 h-5.5 fill-white text-white" />
          </button>

          {/* Center Master Play/Pause Statement Button with Buffering State */}
          <button
            type="button"
            data-testid="expanded-play-pause-btn"
            onClick={() => {
              triggerHaptic('medium');
              togglePlayPause();
            }}
            className={`w-15 h-15 min-w-[60px] min-h-[60px] rounded-full bg-white text-black flex items-center justify-center shadow-xl apple-play-btn cursor-pointer select-none flex-shrink-0 overflow-hidden ${
              playbackState === 'buffering' ? 'ring-4 ring-white/40 animate-pulse' : ''
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isPlaying ? 'pause' : playbackState === 'buffering' ? 'buffering' : 'play'}
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.72 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className="flex items-center justify-center"
              >
                {playbackState === 'buffering' ? (
                  <div className="w-6 h-6 rounded-full border-2 border-black/25 border-t-black animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6 fill-black text-black" />
                ) : (
                  <Play className="w-6 h-6 fill-black text-black translate-x-0.5" />
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
            <SkipForward className="w-5.5 h-5.5 fill-white text-white" />
          </button>

          {/* Repeat Button */}
          <button
            type="button"
            data-testid="expanded-repeat-btn"
            onClick={() => {
              triggerHaptic('light');
              cycleRepeat();
            }}
            className={`relative w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center cursor-pointer select-none apple-btn-tactile ${
              repeatMode !== 'off' ? 'text-[#FA2D48]' : 'text-zinc-400 hover:text-white'
            }`}
            title={isRTL ? 'تكرار' : 'Repeat'}
            aria-label="Repeat"
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4.5 h-4.5" /> : <Repeat className="w-4.5 h-4.5" />}
            {repeatMode !== 'off' && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#FA2D48]" />}
          </button>
        </div>

        {/* LAYER 6: BOTTOM STUDIO DOCK (APPLE MUSIC 3 TOOLS: LYRICS, EQ, UP NEXT QUEUE) */}
        <div className="flex items-center justify-around w-full pt-1 sm:pt-2 border-t border-white/[0.06] flex-shrink-0 select-none">
          {/* 1. Synced Lyrics Toggle */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveCenterView((prev) => (prev === 'lyrics' ? 'artwork' : 'lyrics'));
            }}
            className={`flex flex-col items-center justify-center min-w-[48px] min-h-[40px] gap-0.5 p-1 rounded-xl apple-btn-tactile cursor-pointer transition-colors ${
              activeCenterView === 'lyrics'
                ? 'text-[#FA2D48]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title={isRTL ? 'الكلمات المتزامنة' : 'Synced Lyrics'}
          >
            <Mic2 className="w-4.5 h-4.5" />
            <span className="text-[10px] font-medium">{isRTL ? 'الكلمات' : 'Lyrics'}</span>
          </button>

          {/* 2. EQ & Studio Effects */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setEqualizerOpen(true);
            }}
            className="flex flex-col items-center justify-center min-w-[48px] min-h-[40px] gap-0.5 p-1 rounded-xl text-zinc-400 hover:text-white apple-btn-tactile cursor-pointer transition-colors"
            title={isRTL ? 'المعادل والمؤثرات' : 'EQ & Effects'}
          >
            <Sliders className="w-4.5 h-4.5" />
            <span className="text-[10px] font-medium">{isRTL ? 'المعادل' : 'EQ'}</span>
          </button>

          {/* 3. Up Next Queue Toggle */}
          <button
            type="button"
            data-testid="expanded-queue-btn"
            onClick={() => {
              triggerHaptic('light');
              setActiveCenterView((prev) => (prev === 'queue' ? 'artwork' : 'queue'));
            }}
            className={`flex flex-col items-center justify-center min-w-[48px] min-h-[40px] gap-0.5 p-1 rounded-xl apple-btn-tactile cursor-pointer relative transition-colors ${
              activeCenterView === 'queue'
                ? 'text-[#FA2D48]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title={isRTL ? 'قائمة الانتظار' : 'Queue'}
          >
            <div className="relative">
              <ListMusic className="w-4.5 h-4.5" />
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
