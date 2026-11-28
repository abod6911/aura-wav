import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { TimelineSlider } from './TimelineSlider';
import { TrackActionSheet } from '../library/TrackActionSheet';
import { getActiveLyricIndex } from '../../services/lyricsParser';
import { Track } from '../../types';
import { getOfflineArtworkUrl } from '../../utils/offlineStorage';
import { useTrackTheme } from '../../utils/colorExtractor';
import { isArabicText } from '../../utils/formatters';
import { SmartSaveButton } from '../common/SmartSaveButton';
import {
  ChevronDown,
  MoreHorizontal,
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
  Disc3,
  Loader2,
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
// EMBEDDED SYNCED LYRICS VIEW (DESKTOP STAGE & MOBILE SHEET)
// =========================================================================
interface EmbeddedLyricsViewProps {
  track: Track;
  onSeek: (time: number) => void;
  desktopMode?: boolean;
  onSwitchToQueue?: () => void;
  onOpenAlbum?: () => void;
  onOpenEqualizer?: () => void;
}

const EmbeddedLyricsView: React.FC<EmbeddedLyricsViewProps> = memo(({
  track,
  onSeek,
  desktopMode = false,
  onSwitchToQueue,
  onOpenAlbum,
  onOpenEqualizer,
}) => {
  const { isRTL } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(-1);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const synced = track.syncedLyrics && track.syncedLyrics.length > 0 ? track.syncedLyrics : null;
  const plain = track.lyrics || null;

  useEffect(() => {
    if (!synced) {
      setActiveIdx(-1);
      return;
    }
    const initIdx = getActiveLyricIndex(synced, usePlayerStore.getState().currentTime);
    setActiveIdx(initIdx);
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
      className={`w-full h-full max-h-full overflow-y-auto no-scrollbar select-none ${
        desktopMode ? 'px-5 py-6 space-y-3' : 'px-4 py-6 space-y-4'
      }`}
      style={{ touchAction: 'pan-y' }}
    >
      {synced ? (
        synced.map((line, idx) => {
          const isActive = idx === activeIdx;
          const isArabic = /[\u0600-\u06FF]/.test(line.text);
          return (
            <div
              key={`${idx}-${line.time}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => {
                triggerHaptic('light');
                onSeek(line.time);
              }}
              className={`rounded-2xl transition-[background-color,border-color,transform] duration-200 cursor-pointer border ${
                desktopMode ? 'py-3 px-4' : 'py-2.5 px-3'
              } ${
                isActive
                  ? 'bg-white/[0.09] border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'border-transparent hover:bg-white/[0.04]'
              }`}
              dir={isArabic ? 'rtl' : 'ltr'}
            >
              <p
                className={`font-sans tracking-tight transition-[color,opacity,transform] duration-200 leading-relaxed ${
                  isActive
                    ? desktopMode
                      ? 'text-[23px] lg:text-[26px] font-black text-white'
                      : 'text-[21px] sm:text-[23px] font-black text-white'
                    : desktopMode
                    ? 'text-[17px] lg:text-[19px] font-semibold text-white/55 hover:text-white/85'
                    : 'text-[17px] sm:text-[18px] font-semibold text-white/45 hover:text-white/80'
                }`}
              >
                <bdi dir="auto">{line.text}</bdi>
              </p>
            </div>
          );
        })
      ) : plain ? (
        <div
          className={`py-4 px-4 leading-loose text-white/80 font-medium whitespace-pre-line ${
            desktopMode ? 'text-lg text-start' : 'text-base text-center sm:text-start'
          }`}
        >
          <bdi dir="auto">{plain}</bdi>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center px-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-center text-zinc-300">
            <Music2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-bold text-white/90">
              {isRTL ? 'كلمات الأغنية غير متوفرة لهذا المسار' : "Lyrics aren't available for this track"}
            </p>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              {isRTL
                ? 'استمتع بجودة الصوت المحيطي أو انتقل إلى قائمة التشغيل التالية لضبط ترتيب أغانيك.'
                : 'Enjoy studio audio fidelity or switch to Up Next to arrange your upcoming queue.'}
            </p>
          </div>
          {desktopMode && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {onSwitchToQueue && (
                <button
                  type="button"
                  onClick={onSwitchToQueue}
                  className="satin-metal-button px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                >
                  <ListMusic className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>{isRTL ? 'عرض قائمة الانتظار' : 'View Up Next'}</span>
                </button>
              )}
              {onOpenEqualizer && (
                <button
                  type="button"
                  onClick={onOpenEqualizer}
                  className="satin-metal-button px-4 py-2 rounded-full text-xs font-semibold text-zinc-200 flex items-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'المعادل الصوتي' : 'Equalizer'}</span>
                </button>
              )}
              {track.album && onOpenAlbum && (
                <button
                  type="button"
                  onClick={onOpenAlbum}
                  className="satin-metal-button px-4 py-2 rounded-full text-xs font-semibold text-zinc-200 flex items-center gap-2 cursor-pointer"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'عرض الألبوم' : 'View Album'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
EmbeddedLyricsView.displayName = 'EmbeddedLyricsView';

// =========================================================================
// EMBEDDED UP NEXT QUEUE VIEW
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
      className="w-full h-full max-h-full overflow-y-auto px-3 py-3 space-y-4 no-scrollbar select-none"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-white/75">
          {isRTL ? 'قائمة التشغيل التالية (Up Next)' : 'Up Next Queue'}
        </span>
        {userQueue.length > 0 && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              clearUserQueue();
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 hover:text-red-300 cursor-pointer px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isRTL ? 'تفريغ القائمة' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* 1. NOW PLAYING */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono font-semibold uppercase text-zinc-400 px-1">
          {isRTL ? 'يتم التشغيل الآن' : 'Now Playing'}
        </span>
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.07] border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/15 relative">
            <img
              src={currentTrack.artworkUrl || currentTrack.coverUrl || './logo.svg'}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-0.5">
                <span className="w-0.5 h-3 bg-[#1DB954] aura-soundbar-1 rounded-full" />
                <span className="w-0.5 h-4 bg-[#1DB954] aura-soundbar-2 rounded-full" />
                <span className="w-0.5 h-2.5 bg-[#1DB954] aura-soundbar-3 rounded-full" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h5 dir="auto" className="text-xs sm:text-sm font-bold text-[#1DB954] truncate leading-snug">
              {currentTrack.title}
            </h5>
            <p dir="auto" className="text-[11px] text-zinc-300 truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 shrink-0 px-2 tabular-nums">
            {currentTrack.duration ? `${Math.floor(currentTrack.duration / 60)}:${String(Math.floor(currentTrack.duration % 60)).padStart(2, '0')}` : '3:00'}
          </span>
        </div>
      </div>

      {/* 2. PLAYING NEXT (PRIORITY QUEUE) */}
      {userQueue.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#1DB954] px-1 flex items-center gap-1.5">
            <span>{isRTL ? 'التشغيل التالي مباشرة (Priority)' : 'Playing Next'}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954]">
              {userQueue.length}
            </span>
          </span>
          <div className="space-y-1.5">
            {userQueue.map((track, idx) => (
              <div
                key={`${track.id}-uq-${idx}`}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-colors group"
              >
                <div
                  onClick={() => {
                    triggerHaptic('light');
                    playTrack(track);
                  }}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 cursor-pointer"
                >
                  <img
                    src={track.artworkUrl || track.coverUrl || './logo.svg'}
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
                <div className="flex items-center gap-1 shrink-0">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        reorderUserQueue(idx, idx - 1);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
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
          <span className="text-[10px] font-mono font-semibold uppercase text-zinc-400 px-1">
            {isRTL ? 'قادم من المكتبة / القائمة' : 'Upcoming from Library'}
          </span>
          <div className="space-y-1">
            {upcomingLibraryTracks.map((track) => (
              <div
                key={`${track.id}-upc`}
                onClick={() => {
                  triggerHaptic('light');
                  playTrack(track);
                }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/[0.06] transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10">
                  <img
                    src={track.artworkUrl || track.coverUrl || './logo.svg'}
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
                <span className="text-[10px] font-mono text-zinc-500 shrink-0 tabular-nums">
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
// MOBILE LYRICS PREVIEW CARD (MOUNTED BELOW CONTROLS ON MOBILE SCROLL)
// =========================================================================
interface LyricsPreviewCardProps {
  track: Track;
  cardTint: string;
  onExpand: () => void;
}

const LyricsPreviewCard: React.FC<LyricsPreviewCardProps> = memo(({ track, cardTint, onExpand }) => {
  const { isRTL } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(-1);
  const synced = track.syncedLyrics && track.syncedLyrics.length > 0 ? track.syncedLyrics : null;
  const plain = track.lyrics || null;

  useEffect(() => {
    if (!synced) return;
    return usePlayerStore.subscribe((state) => {
      const idx = getActiveLyricIndex(synced, state.currentTime);
      setActiveIdx((prev) => (prev !== idx ? idx : prev));
    });
  }, [synced]);

  const displayLines: { text: string; isActive: boolean }[] = useMemo(() => {
    if (synced && synced.length > 0) {
      if (activeIdx < 0) {
        return synced.slice(0, 3).map((l, i) => ({ text: l.text, isActive: i === 0 }));
      }
      return [
        { text: synced[activeIdx]?.text || '', isActive: true },
        ...(synced[activeIdx + 1] ? [{ text: synced[activeIdx + 1].text, isActive: false }] : []),
        ...(synced[activeIdx + 2] ? [{ text: synced[activeIdx + 2].text, isActive: false }] : []),
      ];
    } else if (plain) {
      const rawLines = plain.split('\n').filter((l) => l.trim().length > 0);
      return rawLines.slice(0, 3).map((line, idx) => ({ text: line, isActive: idx === 0 }));
    }
    return [];
  }, [synced, plain, activeIdx]);

  return (
    <div
      onClick={onExpand}
      style={{ backgroundColor: cardTint }}
      className="w-full max-w-md mx-auto rounded-2xl p-5 shadow-2xl border border-white/15 cursor-pointer transition-colors duration-500 select-none group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          {isRTL ? 'كلمات الأغنية' : 'Lyrics'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="px-3.5 py-1 rounded-full bg-black/45 hover:bg-black/65 border border-white/15 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer"
        >
          {isRTL ? 'توسيع' : 'Expand'}
        </button>
      </div>

      {displayLines.length > 0 ? (
        <div className="space-y-2 text-start">
          {displayLines.map((line, i) => (
            <p
              key={i}
              dir="auto"
              className={`text-base sm:text-lg font-bold leading-relaxed transition-opacity duration-200 ${
                line.isActive ? 'text-white' : 'text-white/65'
              }`}
            >
              {line.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="py-2 text-start">
          <p className="text-sm font-semibold text-white/90">
            {isRTL ? 'استمتع باللحن والموسيقى' : 'Enjoying the music'}
          </p>
          <span className="text-xs text-white/60 mt-1 block">
            {isRTL ? 'لا تتوفر كلمات مكتوبة لهذا المسار' : 'No lyrics available for this track'}
          </span>
        </div>
      )}
    </div>
  );
});
LyricsPreviewCard.displayName = 'LyricsPreviewCard';

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
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const seek = usePlayerStore((state) => state.seek);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const downloadingTrackIds = usePlayerStore((state) => state.downloadingTrackIds);
  const downloadTrackForOffline = usePlayerStore((state) => state.downloadTrackForOffline);
  const reorderUserQueue = usePlayerStore((state) => state.reorderUserQueue);
  const removeFromUserQueue = usePlayerStore((state) => state.removeFromUserQueue);
  const clearUserQueue = usePlayerStore((state) => state.clearUserQueue);

  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const openAlbum = usePlayerStore((state) => state.openAlbum);

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Mobile switches center slot between artwork/lyrics/queue; Desktop shows Artwork + Context Pane side-by-side
  const [activeCenterView, setActiveCenterView] = useState<'artwork' | 'lyrics' | 'queue'>('artwork');
  const [desktopContextTab, setDesktopContextTab] = useState<'lyrics' | 'queue'>('lyrics');
  const [isActionSheetOpen, setActionSheetOpen] = useState(false);
  const theme = useTrackTheme(currentTrack);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsAtTop(e.currentTarget.scrollTop <= 2);
  };

  const isDownloaded = downloadedTrackIds.includes(currentTrack.id);
  const isDownloading = downloadingTrackIds.includes(currentTrack.id);
  const artworkSrc = currentTrack.artworkUrl || currentTrack.coverUrl || './logo.svg';

  const handleClose = () => {
    triggerHaptic('light');
    setMobilePlayerOpen(false);
    onClose?.();
  };

  const accentColor = theme.accentHex;

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderPlayPauseIcon = (sizeClass: string, spinnerSizeClass: string) => {
    const stateKey = isPlaying ? 'pause' : playbackState === 'buffering' ? 'buf' : 'play';
    return (
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={stateKey}
          initial={{ scale: 0.65, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.65, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          className="flex items-center justify-center"
        >
          {isPlaying ? (
            <Pause className={`${sizeClass} fill-black text-black`} />
          ) : playbackState === 'buffering' ? (
            <div className={`${spinnerSizeClass} rounded-full border-2 border-black/25 border-t-black animate-spin`} />
          ) : (
            <Play className={`${sizeClass} fill-black text-black translate-x-0.5`} />
          )}
        </motion.span>
      </AnimatePresence>
    );
  };

  return (
    <motion.div
      key="expanded-player-sheet"
      data-testid="expanded-player-sheet"
      initial={isDesktop ? { opacity: 0, scale: 0.985 } : { y: '100%' }}
      animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
      exit={isDesktop ? { opacity: 0, scale: 0.985 } : { y: '100%' }}
      transition={{ type: 'spring', stiffness: 430, damping: 36, mass: 0.85 }}
      drag={!isDesktop && activeCenterView === 'artwork' && isAtTop ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.1, bottom: 0.7 }}
      onDragEnd={(_, info) => {
        if (!isDesktop && (info.offset.y > 110 || info.velocity.y > 300)) {
          handleClose();
        }
      }}
      style={{ backgroundColor: '#09090C' }}
      className="fixed inset-0 z-50 w-full h-full min-h-full bg-[#09090C] flex flex-col justify-between overflow-hidden select-none"
      dir={dir}
    >
      {/* 100% Opaque Obsidian Cinema Stage Backdrop + Album Tint (Zero bleed-through) */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-[#09090C]">
        <img
          src={artworkSrc}
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute inset-0 w-full h-full object-cover opacity-[0.22] blur-[90px] saturate-125 scale-125 transform-gpu transition-opacity duration-500"
        />
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 25%, rgba(${theme.primaryRgb[0]}, ${theme.primaryRgb[1]}, ${theme.primaryRgb[2]}, 0.24) 0%, transparent 60%), radial-gradient(circle at 80% 75%, rgba(${theme.primaryRgb[0]}, ${theme.primaryRgb[1]}, ${theme.primaryRgb[2]}, 0.14) 0%, transparent 55%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-[#08080B]/95" />
      </div>

      {/* ===================================================================== */}
      {/* DESKTOP / LAPTOP STUDIO STAGE (md and above)                          */}
      {/* ===================================================================== */}
      {isDesktop ? (
        <div className="w-full h-full flex flex-col min-h-0">
          {/* Desktop Top Cinema Header */}
          <header className="w-full max-w-6xl xl:max-w-7xl mx-auto px-6 lg:px-10 pt-5 pb-3 flex items-center justify-between gap-4 shrink-0">
            {/* Start: Minimize + Album Context */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                data-testid="minimize-player-btn"
                onClick={handleClose}
                className="satin-metal-button h-9 px-3.5 rounded-full text-zinc-100 flex items-center gap-2 text-xs font-semibold cursor-pointer shrink-0"
                aria-label="Minimize player"
              >
                <ChevronDown className="w-4 h-4" strokeWidth={2.2} />
                <span>{isRTL ? 'تصغير' : 'Minimize'}</span>
              </button>

              <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.045] border border-white/[0.08] backdrop-blur-md min-w-0 max-w-sm">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 shrink-0">
                  {userQueue.length > 0
                    ? isRTL ? 'من الانتظار' : 'From Queue'
                    : isRTL ? 'من المكتبة' : 'Playing from'}
                </span>
                <span className="text-white/25">•</span>
                <button
                  type="button"
                  onClick={() => {
                    if (currentTrack.album) {
                      handleClose();
                      openAlbum(currentTrack.album, currentTrack.artist);
                    }
                  }}
                  dir={isArabicText(currentTrack.album || currentTrack.title) ? 'rtl' : 'ltr'}
                  className={`text-xs font-semibold text-white/90 truncate ${
                    currentTrack.album ? 'hover:text-white hover:underline cursor-pointer' : ''
                  }`}
                >
                  {currentTrack.album || currentTrack.title}
                </button>
              </div>
            </div>

            {/* End: Machined Studio Tool Pill Cluster */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-black/45 border border-white/[0.09] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setEqualizerOpen(true);
                }}
                className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.09] transition-colors cursor-pointer"
                title={isRTL ? 'المعادل والمؤثرات الصوتية' : 'EQ & Studio Effects'}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isRTL ? 'المعادل' : 'EQ'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSleepTimerOpen(true);
                }}
                className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  sleepTimerRemaining !== null
                    ? 'bg-[#1DB954]/16 text-[#1DB954] border border-[#1DB954]/30'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.09]'
                }`}
                title={isRTL ? 'مؤقت النوم' : 'Sleep Timer'}
              >
                <Clock className={`w-3.5 h-3.5 ${sleepTimerRemaining !== null ? 'animate-pulse' : ''}`} />
                <span className={sleepTimerRemaining !== null ? 'font-mono tabular-nums' : ''}>
                  {sleepTimerRemaining !== null
                    ? formatRemaining(sleepTimerRemaining)
                    : isRTL ? 'المؤقت' : 'Timer'}
                </span>
              </button>

              <motion.button
                type="button"
                data-testid="expanded-download-btn"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  triggerHaptic('light');
                  downloadTrackForOffline(currentTrack);
                }}
                disabled={isDownloaded || isDownloading}
                className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  isDownloaded
                    ? 'text-[#1DB954] bg-[#1DB954]/12 cursor-default'
                    : isDownloading
                    ? 'text-[#1DB954] bg-white/[0.06] cursor-wait'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.09] cursor-pointer'
                }`}
                aria-label={isDownloaded ? 'محفوظة بدون إنترنت' : 'تنزيل بدون إنترنت'}
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1DB954]" />
                ) : isDownloaded ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954]" />
                ) : (
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                )}
                <span>
                  {isDownloading
                    ? (isRTL ? 'جاري الحفظ...' : 'Saving...')
                    : isDownloaded
                    ? (isRTL ? 'محفوظة' : 'Saved')
                    : (isRTL ? 'حفظ' : 'Offline')}
                </span>
              </motion.button>

              <button
                type="button"
                data-testid="more-options-btn"
                onClick={() => {
                  triggerHaptic('light');
                  setActionSheetOpen(true);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                aria-label="More options"
                title={isRTL ? 'المزيد من الخيارات' : 'More options'}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Desktop 2-Column Main Stage */}
          <div className="flex-1 w-full max-w-6xl xl:max-w-7xl mx-auto px-6 lg:px-10 pb-7 pt-2 min-h-0 grid grid-cols-12 gap-7 lg:gap-12 items-center">
            {/* Column 1: Artwork + Track Meta + Scrubber + Transport Deck */}
            <div className="col-span-5 flex flex-col items-center justify-center min-h-0">
              {/* Elevated Artwork Frame */}
              <motion.div
                data-testid="expanded-artwork-container"
                animate={{ scale: isPlaying ? 1 : 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="relative w-[min(31vw,37vh,360px)] h-[min(31vw,37vh,360px)] xl:w-[min(29vw,42vh,410px)] xl:h-[min(29vw,42vh,410px)] rounded-[22px] overflow-hidden border border-white/[0.16] shadow-[0_32px_80px_rgba(0,0,0,0.8)] bg-black/50 select-none shrink-0"
              >
                <motion.img
                  key={currentTrack.id}
                  src={artworkSrc}
                  alt={currentTrack.title}
                  initial={{ opacity: 0.35, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
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
                <div className="absolute inset-0 vinyl-sheen pointer-events-none" />
              </motion.div>

              {/* Track Title, Artist & Save Action */}
              <div className="w-full max-w-[410px] mt-5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 text-start">
                  <h2
                    dir="auto"
                    className="text-xl lg:text-[23px] font-black text-white truncate tracking-tight leading-snug"
                  >
                    {currentTrack.title}
                  </h2>
                  <p
                    dir="auto"
                    onClick={() => {
                      if (currentTrack.artist) {
                        handleClose();
                        openArtist(currentTrack.artist);
                      }
                    }}
                    className="text-sm text-zinc-300 hover:text-white hover:underline truncate mt-0.5 font-medium leading-snug cursor-pointer transition-colors"
                  >
                    {currentTrack.artist}
                  </p>
                </div>

                <SmartSaveButton
                  track={currentTrack}
                  size="md"
                  className="hover:bg-white/[0.08] shrink-0"
                />
              </div>

              {/* Scrubber */}
              <div className="w-full max-w-[410px] mt-2">
                <TimelineSlider
                  duration={duration}
                  onSeek={seek}
                  showTimestamps={true}
                  accentColor={accentColor}
                />
              </div>

              {/* Hardware Transport Controls */}
              <div
                className="flex items-center justify-between w-full max-w-[410px] mt-1 px-1 select-none"
                dir="ltr"
              >
                {/* Shuffle */}
                <motion.button
                  type="button"
                  data-testid="expanded-shuffle-btn"
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('light');
                    toggleShuffle();
                  }}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors border ${
                    shuffle
                      ? 'bg-[#1DB954]/14 border-[#1DB954]/35 text-[#1DB954] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.09] hover:border-white/[0.16]'
                  }`}
                  title={isRTL ? 'تشغيل عشوائي' : 'Shuffle'}
                  aria-label="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                  {shuffle && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-[#1DB954]" />}
                </motion.button>

                {/* Previous Track */}
                <motion.button
                  type="button"
                  data-testid="expanded-prev-btn"
                  whileTap={{ scale: 0.86 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('light');
                    previousTrack();
                  }}
                  className="w-12 h-12 rounded-full satin-metal-button flex items-center justify-center text-white cursor-pointer"
                  title={isRTL ? 'السابق' : 'Previous'}
                  aria-label="Previous track"
                >
                  <SkipBack className="w-5 h-5 fill-white text-white" />
                </motion.button>

                {/* Master Play / Pause Porcelain Disc (0ms Instant Swap — Never Disappears!) */}
                <motion.button
                  type="button"
                  data-testid="expanded-play-pause-btn"
                  whileTap={{ scale: 0.91 }}
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('medium');
                    togglePlayPause();
                  }}
                  className={`w-[64px] h-[64px] rounded-full hi-fi-play-button text-black flex items-center justify-center cursor-pointer select-none shrink-0 ${
                    playbackState === 'buffering' && !isPlaying ? 'ring-4 ring-white/25' : ''
                  }`}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {renderPlayPauseIcon('w-6 h-6', 'w-6 h-6')}
                </motion.button>

                {/* Next Track */}
                <motion.button
                  type="button"
                  data-testid="expanded-next-btn"
                  whileTap={{ scale: 0.86 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('light');
                    nextTrack({ forceImmediate: true });
                  }}
                  className="w-12 h-12 rounded-full satin-metal-button flex items-center justify-center text-white cursor-pointer"
                  title={isRTL ? 'التالي' : 'Next'}
                  aria-label="Next track"
                >
                  <SkipForward className="w-5 h-5 fill-white text-white" />
                </motion.button>

                {/* Repeat */}
                <motion.button
                  type="button"
                  data-testid="expanded-repeat-btn"
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('light');
                    cycleRepeat();
                  }}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors border ${
                    repeatMode !== 'off'
                      ? 'bg-[#1DB954]/14 border-[#1DB954]/35 text-[#1DB954] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.09] hover:border-white/[0.16]'
                  }`}
                  title={isRTL ? 'تكرار' : 'Repeat'}
                  aria-label="Repeat"
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                  {repeatMode !== 'off' && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-[#1DB954]" />}
                </motion.button>
              </div>
            </div>

            {/* Column 2: Interactive Studio Glass Context Panel (Lyrics & Up Next Queue) */}
            <div className="col-span-7 h-full max-h-[min(76vh,640px)] min-h-0 flex flex-col studio-glass-surface rounded-[28px] overflow-hidden">
              {/* Pane Header with Machined Segmented Switcher */}
              <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/25 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1 p-1 rounded-full bg-black/45 border border-white/[0.09]">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      triggerHaptic('light');
                      setDesktopContextTab('lyrics');
                    }}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                      desktopContextTab === 'lyrics'
                        ? 'text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {desktopContextTab === 'lyrics' && (
                      <motion.span
                        layoutId="expanded-desktop-tab"
                        transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-white/[0.13] border border-white/[0.16] shadow-sm"
                      />
                    )}
                    <Mic2 className={`relative z-10 w-3.5 h-3.5 ${desktopContextTab === 'lyrics' ? 'text-[#1DB954]' : ''}`} />
                    <span className="relative z-10">{isRTL ? 'كلمات الأغنية' : 'Lyrics'}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    data-testid="expanded-queue-btn"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      triggerHaptic('light');
                      setDesktopContextTab('queue');
                    }}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                      desktopContextTab === 'queue'
                        ? 'text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {desktopContextTab === 'queue' && (
                      <motion.span
                        layoutId="expanded-desktop-tab"
                        transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-white/[0.13] border border-white/[0.16] shadow-sm"
                      />
                    )}
                    <ListMusic className={`relative z-10 w-3.5 h-3.5 ${desktopContextTab === 'queue' ? 'text-[#1DB954]' : ''}`} />
                    <span className="relative z-10">{isRTL ? 'قائمة الانتظار' : 'Up Next'}</span>
                    {userQueue.length > 0 && (
                      <span className="relative z-10 px-1.5 py-0.2 rounded-full bg-[#1DB954] text-black text-[10px] font-mono font-extrabold">
                        {userQueue.length}
                      </span>
                    )}
                  </motion.button>
                </div>

                {/* Audio Quality / Offline Status Badge */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.045] border border-white/[0.08] text-[11px] font-medium text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                  <span>
                    {isDownloaded
                      ? (isRTL ? 'محفوظة للاستماع أوفلاين' : 'Saved Offline')
                      : (isRTL ? 'بث صوتي عالي الدقة' : 'Hi-Fi Audio Stream')}
                  </span>
                </div>
              </div>

              {/* Pane Content */}
              <div className="flex-1 min-h-0 overflow-hidden p-2 lg:p-3">
                <AnimatePresence mode="wait" initial={false}>
                {desktopContextTab === 'lyrics' ? (
                  <motion.div
                    key="desktop-lyrics"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full"
                  >
                  <EmbeddedLyricsView
                    track={currentTrack}
                    onSeek={seek}
                    desktopMode
                    onSwitchToQueue={() => setDesktopContextTab('queue')}
                    onOpenEqualizer={() => setEqualizerOpen(true)}
                    onOpenAlbum={
                      currentTrack.album
                        ? () => {
                            handleClose();
                            openAlbum(currentTrack.album!, currentTrack.artist);
                          }
                        : undefined
                    }
                  />
                  </motion.div>
                ) : (
                  <motion.div
                    key="desktop-queue"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full"
                  >
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
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* MOBILE NATIVE SHEET LAYOUT (< 768px)                                  */
        /* ===================================================================== */
        <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-[calc(env(safe-area-inset-bottom,0px)+10px)] overflow-hidden">
          {/* Top Drag Handle & Header */}
          <div className="w-full flex flex-col items-center shrink-0">
            <div
              onClick={handleClose}
              className="w-9 h-1 rounded-full bg-white/30 hover:bg-white/45 mx-auto mb-1.5 cursor-pointer transition-colors"
            />

            <div className="w-full flex items-center justify-between">
              <motion.button
                type="button"
                data-testid="minimize-player-btn"
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                onClick={handleClose}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full satin-metal-button text-white/95 flex items-center justify-center cursor-pointer"
                aria-label="Collapse player"
              >
                <ChevronDown className="w-5 h-5" strokeWidth={2} />
              </motion.button>

              <div className="text-center min-w-0 px-2 flex-1 flex flex-col items-center">
                {sleepTimerRemaining !== null ? (
                  <button
                    type="button"
                    onClick={() => setSleepTimerOpen(true)}
                    className="px-3 py-1 rounded-full satin-metal-button text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#1DB954] animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-white/95 tabular-nums">
                      {formatRemaining(sleepTimerRemaining)}
                    </span>
                  </button>
                ) : (
                  <>
                    <span className="text-[9.5px] tracking-wider text-zinc-400 uppercase font-semibold block font-mono">
                      {activeCenterView === 'lyrics'
                        ? isRTL ? 'الكلمات المتزامنة' : 'Synced Lyrics'
                        : activeCenterView === 'queue'
                        ? isRTL ? 'قائمة الانتظار' : 'Up Next'
                        : userQueue.length > 0
                        ? isRTL ? 'يتم التشغيل من قائمة الانتظار' : 'Playing from Queue'
                        : isRTL ? 'يتم التشغيل من المكتبة' : 'Playing from Library'}
                    </span>
                    <h5
                      dir="auto"
                      onClick={() => {
                        if (currentTrack.album) {
                          handleClose();
                          openAlbum(currentTrack.album, currentTrack.artist);
                        }
                      }}
                      className={`text-[12px] text-white/85 font-semibold truncate max-w-[210px] mx-auto text-center block ${
                        currentTrack.album ? 'hover:text-white hover:underline cursor-pointer' : ''
                      }`}
                    >
                      {currentTrack.album || currentTrack.title}
                    </h5>
                  </>
                )}
              </div>

              <motion.button
                type="button"
                data-testid="more-options-btn"
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                onClick={() => {
                  triggerHaptic('light');
                  setActionSheetOpen(true);
                }}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full satin-metal-button text-white/95 flex items-center justify-center cursor-pointer"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4.5 h-4.5" strokeWidth={2} />
              </motion.button>
            </div>
          </div>

          {/* Mobile Scrollable Body */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 w-full min-h-0 overflow-y-auto no-scrollbar"
          >
            {/* First Viewport: Artwork + Controls Fit 100% Cleanly on Any Phone */}
            <div className="min-h-full flex flex-col justify-between gap-2 pb-2">
              {/* Mobile Center Stage */}
              <div className="flex-1 min-h-[136px] flex items-center justify-center py-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                {activeCenterView === 'artwork' ? (
                  <motion.div
                    key="center-artwork"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.85 }}
                    className="w-full flex items-center justify-center"
                  >
                  <motion.div
                    data-testid="expanded-artwork-container"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.45}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -65 || info.velocity.x < -250) {
                        triggerHaptic('light');
                        nextTrack({ forceImmediate: true });
                      } else if (info.offset.x > 65 || info.velocity.x > 250) {
                        triggerHaptic('light');
                        previousTrack();
                      }
                    }}
                    animate={{ scale: isPlaying ? 1 : 0.92 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.8 }}
                    style={{
                      boxShadow: isPlaying
                        ? '0 22px 54px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.22)'
                        : '0 10px 24px rgba(0, 0, 0, 0.45)',
                      touchAction: 'pan-y',
                    }}
                    className="relative w-[min(74vw,34dvh,310px)] h-[min(74vw,34dvh,310px)] max-h-full aspect-square rounded-[24px] overflow-hidden border border-white/[0.15] select-none shrink-0 cursor-grab active:cursor-grabbing"
                  >
                  <motion.img
                    key={currentTrack.id}
                    src={artworkSrc}
                    alt={currentTrack.title}
                    initial={{ opacity: 0.72, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable={false}
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
                  <div className="absolute inset-0 vinyl-sheen pointer-events-none z-10" />
                </motion.div>
                </motion.div>
              ) : activeCenterView === 'lyrics' ? (
                <motion.div
                  key="center-lyrics"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.85 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <EmbeddedLyricsView track={currentTrack} onSeek={seek} />
                </motion.div>
              ) : (
                <motion.div
                  key="center-queue"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.85 }}
                  className="w-full h-full flex items-center justify-center"
                >
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
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Mobile Lower Controls Cluster */}
            <div className="w-full max-w-md mx-auto shrink-0 space-y-2">
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 text-start overflow-hidden">
                  <h2
                    dir="auto"
                    className="text-[17px] font-bold text-white truncate tracking-tight leading-snug block"
                  >
                    {currentTrack.title}
                  </h2>
                  <p
                    dir="auto"
                    onClick={() => {
                      if (currentTrack.artist) {
                        handleClose();
                        openArtist(currentTrack.artist);
                      }
                    }}
                    className="text-[13px] text-white/65 hover:text-white hover:underline truncate mt-0.5 font-medium leading-snug block cursor-pointer transition-colors"
                  >
                    {currentTrack.artist}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <motion.button
                    type="button"
                    data-testid="expanded-download-btn"
                    whileTap={{ scale: 0.88 }}
                    onClick={() => {
                      triggerHaptic('light');
                      downloadTrackForOffline(currentTrack);
                    }}
                    disabled={isDownloaded || isDownloading}
                    className={`w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full satin-metal-button shrink-0 ${
                      isDownloaded
                        ? 'text-[#1DB954] cursor-default'
                        : isDownloading
                        ? 'text-[#1DB954] cursor-wait'
                        : 'text-zinc-300 cursor-pointer'
                    }`}
                    aria-label={isDownloaded ? 'محفوظة بدون إنترنت' : 'تنزيل بدون إنترنت'}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin text-[#1DB954]" />
                    ) : isDownloaded ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-[#1DB954]" />
                    ) : (
                      <ArrowDownToLine className="w-4.5 h-4.5" />
                    )}
                  </motion.button>

                  <SmartSaveButton track={currentTrack} size="md" className="hover:bg-white/[0.08]" />
                </div>
              </div>

              <TimelineSlider
                duration={duration}
                onSeek={seek}
                showTimestamps={true}
                accentColor={accentColor}
              />

              {/* Mobile 5 Core Playback Controls */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center justify-between w-full px-1 select-none shrink-0"
                dir="ltr"
                style={{ touchAction: 'manipulation' }}
              >
                <motion.button
                  type="button"
                  data-testid="expanded-shuffle-btn"
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('light');
                    toggleShuffle();
                  }}
                  className={`relative w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center cursor-pointer border transition-colors ${
                    shuffle
                      ? 'bg-[#1DB954]/14 border-[#1DB954]/30 text-[#1DB954]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                  aria-label="Shuffle"
                >
                  <Shuffle className="w-4.5 h-4.5" />
                  {shuffle && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#1DB954]" />}
                </motion.button>

                <motion.button
                  type="button"
                  data-testid="expanded-prev-btn"
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('light');
                    previousTrack();
                  }}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white hover:bg-white/[0.08] cursor-pointer transition-colors"
                  aria-label="Previous track"
                >
                  <SkipBack className="w-5.5 h-5.5 fill-white text-white" />
                </motion.button>

                {/* Mobile Master Play / Pause Porcelain Disc (0ms Instant Swap — Never Disappears!) */}
                <motion.button
                  type="button"
                  data-testid="expanded-play-pause-btn"
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('medium');
                    togglePlayPause();
                  }}
                  className={`w-[62px] h-[62px] min-w-[62px] min-h-[62px] rounded-full hi-fi-play-button text-black flex items-center justify-center cursor-pointer select-none shrink-0 ${
                    playbackState === 'buffering' && !isPlaying ? 'ring-4 ring-white/25' : ''
                  }`}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {renderPlayPauseIcon('w-6 h-6', 'w-6 h-6')}
                </motion.button>

                <motion.button
                  type="button"
                  data-testid="expanded-next-btn"
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('light');
                    nextTrack({ forceImmediate: true });
                  }}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white hover:bg-white/[0.08] cursor-pointer transition-colors"
                  aria-label="Next track"
                >
                  <SkipForward className="w-5.5 h-5.5 fill-white text-white" />
                </motion.button>

                <motion.button
                  type="button"
                  data-testid="expanded-repeat-btn"
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                  onClick={() => {
                    triggerHaptic('light');
                    cycleRepeat();
                  }}
                  className={`relative w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center cursor-pointer border transition-colors ${
                    repeatMode !== 'off'
                      ? 'bg-[#1DB954]/14 border-[#1DB954]/30 text-[#1DB954]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                  aria-label="Repeat"
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4.5 h-4.5" /> : <Repeat className="w-4.5 h-4.5" />}
                  {repeatMode !== 'off' && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#1DB954]" />}
                </motion.button>
              </div>

              {/* Mobile Machined Smoked Glass Studio Dock */}
              <div className="flex items-center justify-around w-full p-1 rounded-2xl bg-black/35 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shrink-0 select-none">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveCenterView((prev) => (prev === 'lyrics' ? 'artwork' : 'lyrics'));
                  }}
                  className={`relative flex-1 flex flex-col items-center justify-center min-h-[42px] gap-0.5 py-1 rounded-xl cursor-pointer transition-colors ${
                    activeCenterView === 'lyrics'
                      ? 'text-[#1DB954]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {activeCenterView === 'lyrics' && (
                    <motion.span
                      layoutId="expanded-mobile-dock"
                      transition={{ type: 'spring', stiffness: 460, damping: 32, mass: 0.8 }}
                      className="absolute inset-0 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/25"
                    />
                  )}
                  <Mic2 className="relative z-10 w-4.5 h-4.5" />
                  <span className="relative z-10 text-[10px] font-semibold">{isRTL ? 'الكلمات' : 'Lyrics'}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    triggerHaptic('light');
                    setEqualizerOpen(true);
                  }}
                  className="flex-1 flex flex-col items-center justify-center min-h-[42px] gap-0.5 py-1 rounded-xl text-zinc-400 hover:text-white cursor-pointer transition-colors"
                >
                  <Sliders className="w-4.5 h-4.5" />
                  <span className="text-[10px] font-semibold">{isRTL ? 'المعادل' : 'EQ'}</span>
                </motion.button>

                <motion.button
                  type="button"
                  data-testid="expanded-queue-btn"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveCenterView((prev) => (prev === 'queue' ? 'artwork' : 'queue'));
                  }}
                  className={`relative flex-1 flex flex-col items-center justify-center min-h-[42px] gap-0.5 py-1 rounded-xl cursor-pointer transition-colors ${
                    activeCenterView === 'queue'
                      ? 'text-[#1DB954]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {activeCenterView === 'queue' && (
                    <motion.span
                      layoutId="expanded-mobile-dock"
                      transition={{ type: 'spring', stiffness: 460, damping: 32, mass: 0.8 }}
                      className="absolute inset-0 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/25"
                    />
                  )}
                  <div className="relative z-10">
                    <ListMusic className="w-4.5 h-4.5" />
                    {userQueue.length > 0 && (
                      <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 rounded-full bg-[#1DB954] text-black text-[8.5px] font-mono font-bold flex items-center justify-center border border-black shadow">
                        {userQueue.length}
                      </span>
                    )}
                  </div>
                  <span className="relative z-10 text-[10px] font-semibold">{isRTL ? 'القائمة' : 'Queue'}</span>
                </motion.button>
              </div>
            </div>
            </div>

            {activeCenterView === 'artwork' && (
              <div className="pt-4 pb-6 w-full shrink-0">
                <LyricsPreviewCard
                  track={currentTrack}
                  cardTint={theme.cardTint}
                  onExpand={() => setActiveCenterView('lyrics')}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Track Action Sheet */}
      <TrackActionSheet
        track={currentTrack}
        isOpen={isActionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
      />
    </motion.div>
  );
};
