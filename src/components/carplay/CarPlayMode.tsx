import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Heart,
  Shuffle,
  Repeat,
  X,
  ListMusic,
  Clock,
  Sparkles,
  Volume2,
  Search,
  Disc3,
  Radio
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Track } from '../../types';

export const CarPlayMode: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seek,
    isCarModeOpen,
    setCarModeOpen,
    favorites,
    toggleFavorite,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    playTrack,
    tracks,
  } = usePlayerStore();

  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Tab for Portrait Mode: 'now_playing' | 'playlist'
  // Defaults immediately to 'playlist' if no track is playing, or 'now_playing' if audio is active
  const [portraitTab, setPortraitTab] = useState<'now_playing' | 'playlist'>(
    currentTrack ? 'now_playing' : 'playlist'
  );

  // Filter & Search inside the Driving Playlist
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Maintain Digital In-Car Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeFormatted(`${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Screen Wake Lock API (Keep display active during driving)
  useEffect(() => {
    if (!isCarModeOpen) return;

    let isMounted = true;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          if (isMounted) setIsWakeLockActive(true);

          wakeLockRef.current.addEventListener('release', () => {
            if (isMounted) setIsWakeLockActive(false);
          });
        }
      } catch (err) {
        console.warn('[CarPlayMode] Screen Wake Lock not acquired:', err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isCarModeOpen) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      setIsWakeLockActive(false);
    };
  }, [isCarModeOpen]);

  // 3. Touch Gesture Navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        previousTrack();
      } else {
        nextTrack({ forceImmediate: true });
      }
    }
    setTouchStartX(null);
  };

  // Helper format seconds
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Compute all tracks according to active filter and search
  const favoriteTracks = useMemo(() => {
    return tracks.filter((t) => favorites.includes(t.id));
  }, [tracks, favorites]);

  const displayedTracks = useMemo(() => {
    const base = filterMode === 'favorites' ? favoriteTracks : tracks;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q))
    );
  }, [filterMode, favoriteTracks, tracks, searchQuery]);

  if (!isCarModeOpen) return null;

  const activeFav = currentTrack ? favorites.includes(currentTrack.id) : false;
  const accentColor = currentTrack?.accentColor || currentTrack?.dominantColor || '#FA243C';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[9999] bg-[#0A0A0E] text-white flex flex-col select-none overflow-hidden font-sans"
        dir="rtl"
      >
        {/* Dynamic Subtle In-Car Ambient Glow */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 blur-[130px]"
          style={{
            background: `radial-gradient(circle at 50% 25%, ${accentColor} 0%, transparent 70%)`,
          }}
        />

        {/* --- In-Car Top System Header --- */}
        <header className="relative z-20 flex flex-col landscape:flex-row landscape:items-center justify-between px-4 sm:px-8 py-2.5 sm:py-3 border-b border-white/[0.08] bg-black/60 backdrop-blur-xl gap-2.5 landscape:gap-4">
          <div className="flex items-center justify-between w-full landscape:w-auto">
            {/* Clock & CarPlay Brand Badge */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/[0.08] border border-white/10 text-white font-mono text-xs sm:text-sm font-bold">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentTimeFormatted}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#FA243C]/20 border border-[#FA243C]/40 text-[#FA243C] text-[11px] sm:text-xs font-black tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                <span>Apple CarPlay</span>
              </div>

              {isWakeLockActive && (
                <span className="hidden md:inline-flex text-[11px] font-semibold text-zinc-400 px-2.5 py-0.5 rounded-md bg-white/[0.04]">
                  الشاشة نشطة دائماً
                </span>
              )}
            </div>

            {/* Mobile Close Button */}
            <div className="flex landscape:hidden items-center">
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => setCarModeOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/[0.08] hover:bg-red-500/20 hover:text-red-400 border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
                title="خروج من وضع السيارة"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Segmented Switcher for Portrait Mode */}
          <div className="flex landscape:hidden items-center p-1 rounded-xl bg-white/[0.08] border border-white/10 w-full">
            <button
              onClick={() => setPortraitTab('playlist')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portraitTab === 'playlist'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span>قائمة الأغاني ({tracks.length})</span>
            </button>

            <button
              onClick={() => setPortraitTab('now_playing')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portraitTab === 'now_playing'
                  ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Disc3 className="w-4 h-4" />
              <span>المشغل الآن</span>
            </button>
          </div>

          {/* Landscape Close Button */}
          <div className="hidden landscape:flex items-center">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setCarModeOpen(false)}
              className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-red-500/20 hover:text-red-400 border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
              title="خروج من وضع السيارة"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </header>

        {/* --- In-Car Main Body Viewport --- */}
        <div className="relative z-10 flex-1 flex flex-col landscape:flex-row overflow-hidden w-full">
          
          {/* ========================================================================= */}
          {/* SECTION A: NOW PLAYING CONTROLS (Always shown on Landscape, or Tab on Portrait) */}
          {/* ========================================================================= */}
          <div
            className={`flex-1 flex flex-col items-center justify-center p-4 sm:p-6 landscape:p-4 overflow-y-auto landscape:overflow-hidden ${
              portraitTab === 'playlist' ? 'hidden landscape:flex' : 'flex'
            }`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Artwork Container */}
            <motion.div
              whileTap={{ scale: 0.97 }}
              onClick={togglePlayPause}
              className="relative w-40 h-40 xs:w-48 xs:h-48 sm:w-56 sm:h-56 landscape:w-36 landscape:h-36 md:landscape:w-44 md:landscape:h-44 rounded-3xl overflow-hidden border-2 border-white/15 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] cursor-pointer group shrink-0"
            >
              {currentTrack?.artworkUrl || currentTrack?.coverUrl ? (
                <img
                  src={currentTrack.artworkUrl || currentTrack.coverUrl}
                  alt={currentTrack?.title || 'Track Artwork'}
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E1E26] to-[#0A0A0E]"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, #0A0A0E 100%)`,
                  }}
                >
                  <Volume2 className="w-16 h-16 text-white/40" />
                </div>
              )}

              {/* Center Play Overlay when Paused */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
                    <Play className="w-7 h-7 fill-black translate-x-0.5" />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Track Info (Bold & High-Contrast) */}
            <div className="mt-3 landscape:mt-2 text-center w-full max-w-sm px-2">
              <h1 className="text-xl sm:text-2xl landscape:text-lg font-black text-white truncate tracking-tight">
                {currentTrack?.title || 'اختر أغنية من القائمة للبدء'}
              </h1>
              <p className="text-sm sm:text-base landscape:text-xs text-zinc-300 font-semibold truncate mt-0.5">
                {currentTrack?.artist || 'جاهز للتشغيل بأعلى جودة'}
              </p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-mono text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Lossless Hi-Fi Studio Master</span>
              </div>
            </div>

            {/* In-Car Scrubber */}
            <div className="w-full mt-3 landscape:mt-2 max-w-sm px-2">
              <div
                className="relative h-3.5 bg-white/15 rounded-full overflow-hidden cursor-pointer touch-none"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  seek(ratio * duration);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-[#FA243C] to-rose-400 rounded-full transition-all duration-100"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 mt-1.5 font-bold">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Oversized Transport Controls (Strictly LTR) */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 landscape:gap-2.5 mt-4 landscape:mt-3 w-full max-w-md" dir="ltr">
              {/* Skip Back 15s */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => seek(Math.max(0, currentTime - 15))}
                className="w-12 h-12 sm:w-13 sm:h-13 landscape:w-11 landscape:h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
                title="ترجيع 15 ثانية"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>

              {/* Previous Track */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => previousTrack()}
                className="w-14 h-14 sm:w-16 sm:h-16 landscape:w-13 landscape:h-13 rounded-2xl sm:rounded-3xl bg-white/[0.12] hover:bg-white/[0.18] border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer shadow-lg active:scale-95"
                title="المسار السابق"
              >
                <SkipBack className="w-7 h-7 sm:w-8 sm:h-8" />
              </motion.button>

              {/* Giant Center Play/Pause Button */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={togglePlayPause}
                className="w-18 h-18 sm:w-20 sm:h-20 landscape:w-16 landscape:h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_15px_45px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-9 sm:h-9 fill-black" />
                ) : (
                  <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-black translate-x-0.5" />
                )}
              </motion.button>

              {/* Next Track */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => nextTrack({ forceImmediate: true })}
                className="w-14 h-14 sm:w-16 sm:h-16 landscape:w-13 landscape:h-13 rounded-2xl sm:rounded-3xl bg-white/[0.12] hover:bg-white/[0.18] border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer shadow-lg active:scale-95"
                title="المسار التالي"
              >
                <SkipForward className="w-7 h-7 sm:w-8 sm:h-8" />
              </motion.button>

              {/* Skip Forward 15s */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => seek(Math.min(duration, currentTime + 15))}
                className="w-12 h-12 sm:w-13 sm:h-13 landscape:w-11 landscape:h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
                title="تقديم 15 ثانية"
              >
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>
            </div>

            {/* Secondary Controls Row (Shuffle, Favorite, Repeat) */}
            <div className="flex items-center justify-center gap-6 mt-4 landscape:mt-2.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleShuffle}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                  shuffle
                    ? 'bg-[#FA243C] text-white border-[#FA243C] shadow-lg shadow-[#FA243C]/30'
                    : 'bg-white/[0.08] text-zinc-400 border-white/10 hover:text-white'
                }`}
                title="خلط الأغاني"
              >
                <Shuffle className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => currentTrack && toggleFavorite(currentTrack.id)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                  activeFav
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                    : 'bg-white/[0.08] text-zinc-400 border-white/10 hover:text-white'
                }`}
                title={activeFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              >
                <Heart className={`w-6 h-6 ${activeFav ? 'fill-current' : ''}`} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={cycleRepeat}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                  repeatMode !== 'off'
                    ? 'bg-[#FA243C] text-white border-[#FA243C] shadow-lg shadow-[#FA243C]/30'
                    : 'bg-white/[0.08] text-zinc-400 border-white/10 hover:text-white'
                }`}
                title={`وضع التكرار: ${repeatMode}`}
              >
                <Repeat className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION B: COMPLETE IN-CAR PLAYLIST (Displayed immediately!) */}
          {/* ========================================================================= */}
          <div
            className={`flex-1 flex flex-col border-t landscape:border-t-0 landscape:border-r border-white/[0.08] bg-black/30 backdrop-blur-md p-4 sm:p-6 overflow-hidden ${
              portraitTab === 'now_playing' ? 'hidden landscape:flex' : 'flex'
            }`}
          >
            {/* Playlist Header & Search / Filter Pills */}
            <div className="flex flex-col gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-[#FA243C]" />
                  <h2 className="text-lg sm:text-xl font-black text-white">قائمة الأغاني</h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-400 text-xs font-mono font-bold">
                    {displayedTracks.length}
                  </span>
                </div>

                {/* Filter Pills: All Tracks vs Favorites */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.06] border border-white/10">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    الكل ({tracks.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('favorites')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'favorites'
                        ? 'bg-[#FA243C] text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    المفضلة ({favoriteTracks.length})
                  </button>
                </div>
              </div>

              {/* Instant Driving Search Bar */}
              <div className="relative w-full">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث سريع في أغانيك..."
                  className="w-full bg-white/[0.06] border border-white/10 focus:border-[#FA243C] rounded-xl pr-10 pl-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Tracks List (Instant One-Tap Play) */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 custom-scrollbar">
              {displayedTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                  <ListMusic className="w-12 h-12 stroke-[1.5] mb-2 opacity-50" />
                  <p className="text-sm font-bold">لا توجد مسارات مطابقة</p>
                  <p className="text-xs text-zinc-600 mt-1">تأكد من كتابة اسم المسار أو الفنان بشكل صحيح</p>
                </div>
              ) : (
                displayedTracks.map((tr, index) => {
                  const isCurrent = currentTrack?.id === tr.id;
                  return (
                    <motion.div
                      key={tr.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        playTrack(tr);
                        // On mobile portrait, switch to Now Playing view after selection for smooth flow
                        if (window.innerWidth < 640 && window.innerHeight > window.innerWidth) {
                          setPortraitTab('now_playing');
                        }
                      }}
                      className={`min-h-[56px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl border cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-white/[0.14] border-[#FA243C] text-white shadow-md'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/5 text-zinc-300'
                      }`}
                    >
                      {/* Left: Thumbnail & Titles */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                          {tr.artworkUrl || tr.coverUrl ? (
                            <img
                              src={tr.artworkUrl || tr.coverUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-xs">
                              ♪
                            </div>
                          )}

                          {isCurrent && isPlaying && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-[#FA243C] animate-ping" />
                            </div>
                          )}
                        </div>

                        <div className="truncate">
                          <div className={`font-bold text-sm truncate ${isCurrent ? 'text-white' : 'text-zinc-200'}`}>
                            {tr.title}
                          </div>
                          <div className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                            {tr.artist}
                          </div>
                        </div>
                      </div>

                      {/* Right: Playing Status / Duration */}
                      <div className="shrink-0 flex items-center gap-2.5">
                        {isCurrent && isPlaying && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FA243C]/20 border border-[#FA243C]/40 text-[#FA243C] text-[10px] font-black font-mono">
                            <Radio className="w-3 h-3 animate-pulse" />
                            <span>يعمل الآن</span>
                          </div>
                        )}
                        <span className="text-xs font-mono text-zinc-400 font-bold">
                          {formatTime(tr.duration || 0)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
