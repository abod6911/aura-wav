import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getActiveLyricIndex } from '../../services/lyricsParser';
import { TimelineSlider } from '../player/TimelineSlider';
import { getTrackLyrics } from '../../services/lyricsService';
import { triggerHaptic } from '../../utils/haptics';
import { useTranslation } from '../../i18n/useTranslation';
import {
  X,
  Sparkles,
  Music2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Mic2,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SyncedLyrics: React.FC = () => {
  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen);
  const hasTrack = usePlayerStore((state) => !!state.currentTrack);

  return (
    <AnimatePresence>
      {isLyricsOpen && hasTrack && <SyncedLyricsModal />}
    </AnimatePresence>
  );
};

interface LyricLineRowProps {
  time: number;
  text: string;
  idx: number;
  isActive: boolean;
  onSeek: (time: number) => void;
  activeLineRef: React.RefObject<HTMLDivElement | null> | null;
}

/**
 * Isolated Memoized Lyric Line
 * Re-renders ONLY when becoming active or inactive.
 */
const LyricLineRow: React.FC<LyricLineRowProps> = memo(({
  time,
  text,
  isActive,
  onSeek,
  activeLineRef,
}) => {
  const isArabic = /[\u0600-\u06FF]/.test(text);

  return (
    <div
      ref={isActive ? activeLineRef : null}
      onClick={() => {
        triggerHaptic('light');
        onSeek(time);
      }}
      className={`cursor-pointer transition-all duration-200 py-3.5 px-5 rounded-2xl select-none ${
        isActive
          ? 'bg-white/[0.07] border border-white/[0.10]'
          : 'hover:bg-white/[0.02]'
      } ${isArabic ? 'text-right' : 'text-left'}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <p
        className={`tracking-tight font-sans transition-all duration-200 leading-relaxed ${
          isActive
            ? 'text-[22px] font-black text-white scale-100 opacity-100'
            : 'text-[18px] font-semibold text-white/40 scale-[0.98] hover:text-white/60'
        }`}
      >
        <bdi dir="auto">{text}</bdi>
      </p>
    </div>
  );
});
LyricLineRow.displayName = 'LyricLineRow';

const SyncedLyricsModal: React.FC = () => {
  const { isRTL } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack!);
  const duration = usePlayerStore((state) => state.duration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const karaokeMode = usePlayerStore((state) => state.karaokeMode);
  const setKaraokeMode = usePlayerStore((state) => state.setKaraokeMode);

  const seek = usePlayerStore((state) => state.seek);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);
  const addToast = usePlayerStore((state) => state.addToast);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<any>(null);
  const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);

  const lyrics = useMemo(() => currentTrack.syncedLyrics || [], [currentTrack.syncedLyrics]);

  const [activeIndex, setActiveIndex] = useState(() =>
    getActiveLyricIndex(lyrics, usePlayerStore.getState().currentTime)
  );

  // High performance subscription: only trigger re-render when active index actually changes!
  useEffect(() => {
    return usePlayerStore.subscribe((state) => {
      const nextIdx = getActiveLyricIndex(lyrics, state.currentTime);
      setActiveIndex((prev) => (prev !== nextIdx ? nextIdx : prev));
    });
  }, [lyrics]);

  // Smooth scroll into center ONLY when active line index changes
  useEffect(() => {
    if (activeLineRef.current && !userIsScrolling) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, userIsScrolling]);

  const handleUserScroll = () => {
    setUserIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false);
    }, 2500);
  };

  const handleSearchLyrics = async () => {
    setIsSearchingLyrics(true);
    try {
      const res = await getTrackLyrics(currentTrack);
      if (res && (res.syncedLyrics?.length || res.plainLyrics)) {
        await usePlayerStore.getState().updateTrackMetadata(currentTrack.id, {
          syncedLyrics: res.syncedLyrics,
          lyrics: res.plainLyrics || currentTrack.lyrics,
        });
        addToast(isRTL ? 'تم جلب الكلمات المتزامنة بنجاح!' : 'Synced lyrics fetched successfully!', undefined, 'success');
      } else {
        addToast(isRTL ? 'لم يتم العثور على كلمات مطابقة عبر الإنترنت' : 'No matching lyrics found online', undefined, 'info');
      }
    } catch {
      addToast(isRTL ? 'حدث خطأ أثناء البحث عن الكلمات' : 'Error searching lyrics', undefined, 'warning');
    } finally {
      setIsSearchingLyrics(false);
    }
  };

  const accentColor = currentTrack.accentColor || currentTrack.dominantColor || '#FA243C';

  return (
    <motion.div
      data-testid="lyrics-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-[#060609] flex flex-col select-none overflow-hidden"
    >
      {/* Subtle Ambient Tint (Apple Music Style) */}
      <div
        className="absolute -top-[20%] -left-[15%] w-[75vw] h-[75vw] rounded-full filter blur-[140px] opacity-15 pointer-events-none transition-all duration-1000 ease-out"
        style={{ backgroundColor: accentColor }}
      />
      <div className="absolute inset-0 -z-10 bg-black/45 backdrop-blur-[50px] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full px-4 sm:px-6 md:px-10 pt-[max(env(safe-area-inset-top,0px),12px)] pb-2.5 sm:pb-3.5 flex items-center justify-between border-b border-white/[0.08] z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[11px] font-bold text-white">
            <Sparkles className="w-3.5 h-3.5 text-[#FA243C]" />
            <span>{isRTL ? 'كلمات متزامنة' : 'LIVE LYRICS'}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setKaraokeMode(!karaokeMode);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              karaokeMode
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-lg shadow-[#FA243C]/35 ring-1 ring-white/20'
                : 'bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10'
            }`}
          >
            <Mic2 className="w-3 h-3" />
            <span>{isRTL ? 'عزل المغني' : 'SING'}</span>
          </button>
        </div>

        <button
          type="button"
          data-testid="close-lyrics-btn"
          onClick={() => {
            triggerHaptic('light');
            setLyricsOpen(false);
          }}
          className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer active:scale-90"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center overflow-hidden min-h-0 relative">
        <div
          ref={containerRef}
          onScroll={handleUserScroll}
          className="flex-1 w-full h-full overflow-y-auto px-4 sm:px-8 py-20 space-y-4 scroll-smooth select-none relative"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          }}
        >
          {lyrics.length > 0 ? (
            lyrics.map((line, idx) => (
              <LyricLineRow
                key={`${line.time}_${idx}`}
                time={line.time}
                text={line.text}
                idx={idx}
                isActive={idx === activeIndex}
                onSeek={seek}
                activeLineRef={activeLineRef}
              />
            ))
          ) : currentTrack.lyrics ? (
            <div className="text-center py-20 px-4 text-zinc-300 space-y-4 whitespace-pre-line text-base sm:text-lg leading-loose max-w-lg mx-auto">
              <Music2 className="w-10 h-10 mx-auto text-[#FA243C] opacity-70" />
              <p className="text-white text-xl font-bold">{isRTL ? 'كلمات الأغنية' : 'Lyrics'}</p>
              <div className="text-zinc-300">{currentTrack.lyrics}</div>
            </div>
          ) : (
            <div className="text-center py-28 px-6 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto shadow-inner">
                <Music2 className="w-8 h-8 text-[#FA243C]" />
              </div>
              <h4 className="text-white text-xl font-bold">
                {isRTL ? 'لا توجد كلمات متزامنة متاحة' : 'No Synced Lyrics Available'}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isRTL
                  ? 'يمكنك البحث عن كلمات هذه الأغنية عبر الإنترنت ومزامنتها لحظياً.'
                  : 'You can search for synced lyrics online and sing along live.'}
              </p>
              <button
                type="button"
                onClick={handleSearchLyrics}
                disabled={isSearchingLyrics}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white text-xs font-bold shadow-lg shadow-[#FA243C]/30 active:scale-95 transition-transform flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearchingLyrics ? (isRTL ? 'جاري البحث...' : 'Searching...') : (isRTL ? 'البحث عن الكلمات الآن' : 'Search Lyrics Online')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Mini-Controls (Always locked at bottom) */}
      <div className="w-full px-4 sm:px-6 md:px-10 pt-2 sm:pt-3 pb-[max(env(safe-area-inset-bottom,0px),14px)] border-t border-white/[0.08] bg-[#07070a]/95 backdrop-blur-2xl flex flex-col gap-1.5 z-20 shrink-0">
        <TimelineSlider
          duration={duration}
          onSeek={seek}
          showTimestamps={true}
          accentColor={accentColor}
        />

        <div className="flex items-center justify-between pt-1" dir="ltr">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
            <img
              src={currentTrack.artworkUrl || currentTrack.coverUrl || '/logo.svg'}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-xl object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
              <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                toggleShuffle();
              }}
              className={`p-2 rounded-full cursor-pointer transition-colors ${shuffle ? 'text-[#FA243C]' : 'text-zinc-500'}`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                previousTrack();
              }}
              className="text-white p-2 cursor-pointer active:scale-90"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                togglePlayPause();
              }}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-md cursor-pointer active:scale-90 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black translate-x-0.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                nextTrack({ forceImmediate: true });
              }}
              className="text-white p-2 cursor-pointer active:scale-90"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                cycleRepeat();
              }}
              className={`p-2 rounded-full cursor-pointer transition-colors ${repeatMode !== 'off' ? 'text-[#FA243C]' : 'text-zinc-500'}`}
              title="Repeat"
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
