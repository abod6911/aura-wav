import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Volume2
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
  const [isQuickListOpen, setIsQuickListOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

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

  // 3. Touch Gesture Navigation (Safe Swiping for Drivers)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX;

    // Minimum swipe threshold: 50px
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swiped right -> In RTL this represents next track or previous
        previousTrack();
      } else {
        // Swiped left
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

  if (!isCarModeOpen) return null;

  const activeFav = currentTrack ? favorites.includes(currentTrack.id) : false;
  const accentColor = currentTrack?.accentColor || currentTrack?.dominantColor || '#FA243C';
  const favoriteTracks = tracks.filter((t) => favorites.includes(t.id));
  const displayTracks: Track[] = favoriteTracks.length > 0 ? favoriteTracks : tracks.slice(0, 20);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[9999] bg-[#0A0A0E] text-white flex flex-col select-none overflow-hidden font-sans"
        dir="rtl"
      >
        {/* Dynamic Subtle In-Car Ambient Glow */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none transition-all duration-700 blur-[120px]"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${accentColor} 0%, transparent 70%)`,
          }}
        />

        {/* --- In-Car Top System Bar --- */}
        <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl">
          {/* Clock & CarPlay Status */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/10 text-white font-mono text-base font-bold">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>{currentTimeFormatted}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FA243C]/20 border border-[#FA243C]/40 text-[#FA243C] text-xs font-black tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apple CarPlay Mode</span>
            </div>

            {isWakeLockActive && (
              <span className="hidden sm:inline-flex text-[11px] font-semibold text-zinc-400 px-2.5 py-0.5 rounded-md bg-white/[0.04]">
                الشاشة نشطة دائماً للقيادة
              </span>
            )}
          </div>

          {/* Quick List & Exit Action */}
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setIsQuickListOpen(!isQuickListOpen)}
              className={`min-h-[48px] px-4 rounded-2xl flex items-center gap-2 border font-bold text-sm transition-all cursor-pointer ${
                isQuickListOpen
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/10'
              }`}
            >
              <ListMusic className="w-5 h-5" />
              <span className="hidden sm:inline">قائمة القيادة</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setCarModeOpen(false)}
              className="min-h-[48px] min-w-[48px] rounded-2xl bg-white/[0.08] hover:bg-red-500/20 hover:text-red-400 border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
              title="خروج من وضع السيارة"
            >
              <X className="w-6 h-6" />
            </motion.button>
          </div>
        </header>

        {/* --- Main Driving Viewport (Adaptive: Landscape 2-Column / Portrait Stacked) --- */}
        <main
          className="relative z-10 flex-1 flex flex-col landscape:flex-row items-center justify-center p-4 sm:p-8 landscape:p-4 gap-4 sm:gap-10 landscape:gap-8 overflow-hidden w-full max-w-7xl mx-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Column 1: Giant Artwork & Track Metadata */}
          <div className="flex-1 w-full flex flex-col items-center justify-center max-w-md landscape:max-w-sm text-center">
            {/* Massive Album Artwork with Single Tap Play/Pause */}
            <motion.div
              whileTap={{ scale: 0.97 }}
              onClick={togglePlayPause}
              className="relative w-44 h-44 xs:w-52 xs:h-52 sm:w-64 sm:h-64 landscape:w-36 landscape:h-36 md:landscape:w-44 md:landscape:h-44 rounded-3xl overflow-hidden border-2 border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] cursor-pointer group shrink-0"
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

              {/* Center Play Overlay on Hover/Pause */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
                    <Play className="w-7 h-7 fill-black translate-x-0.5" />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Track Info (Oversized for Quick Glance) */}
            <div className="mt-3 landscape:mt-2 w-full px-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl landscape:text-xl font-black text-white truncate tracking-tight">
                {currentTrack?.title || 'لا يوجد ملف قيد التشغيل'}
              </h1>
              <p className="text-sm sm:text-base landscape:text-sm text-zinc-300 font-semibold truncate mt-0.5">
                {currentTrack?.artist || 'اختر أغنية للبدء'}
              </p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Lossless Hi-Fi Studio Master</span>
              </div>
            </div>

            {/* High-Contrast In-Car Scrubber */}
            <div className="w-full mt-3 landscape:mt-2 px-2 max-w-sm">
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
          </div>

          {/* Column 2: Oversized In-Car Transport Controls */}
          <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center">
            {/* Primary Controls Row (Strictly LTR for standard music ergonomics) */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 landscape:gap-3 w-full" dir="ltr">
              {/* Skip Back 15s */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => seek(Math.max(0, currentTime - 15))}
                className="w-12 h-12 sm:w-14 sm:h-14 landscape:w-11 landscape:h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
                title="ترجيع 15 ثانية"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>

              {/* Previous Track */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => previousTrack()}
                className="w-14 h-14 sm:w-18 sm:h-18 landscape:w-14 landscape:h-14 rounded-2xl sm:rounded-3xl bg-white/[0.12] hover:bg-white/[0.18] border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer shadow-lg active:scale-95"
                title="المسار السابق"
              >
                <SkipBack className="w-7 h-7 sm:w-8 sm:h-8" />
              </motion.button>

              {/* Giant Play/Pause Button */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={togglePlayPause}
                className="w-18 h-18 sm:w-22 sm:h-22 landscape:w-16 landscape:h-16 md:landscape:w-20 md:landscape:h-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_15px_45px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-black" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-black translate-x-0.5" />
                )}
              </motion.button>

              {/* Next Track */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => nextTrack({ forceImmediate: true })}
                className="w-14 h-14 sm:w-18 sm:h-18 landscape:w-14 landscape:h-14 rounded-2xl sm:rounded-3xl bg-white/[0.12] hover:bg-white/[0.18] border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer shadow-lg active:scale-95"
                title="المسار التالي"
              >
                <SkipForward className="w-7 h-7 sm:w-8 sm:h-8" />
              </motion.button>

              {/* Skip Forward 15s */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => seek(Math.min(duration, currentTime + 15))}
                className="w-12 h-12 sm:w-14 sm:h-14 landscape:w-11 landscape:h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
                title="تقديم 15 ثانية"
              >
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>
            </div>

            {/* Secondary Ergonomic Controls Row (Favorite, Shuffle, Repeat) */}
            <div className="flex items-center justify-center gap-6 mt-6 sm:mt-8 landscape:mt-4">
              {/* Shuffle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleShuffle}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                  shuffle
                    ? 'bg-[#FA243C] text-white border-[#FA243C] shadow-lg shadow-[#FA243C]/30'
                    : 'bg-white/[0.08] text-zinc-400 border-white/10 hover:text-white'
                }`}
                title="خلط الأغاني"
              >
                <Shuffle className="w-6 h-6" />
              </motion.button>

              {/* Favorite Heart */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => currentTrack && toggleFavorite(currentTrack.id)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                  activeFav
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                    : 'bg-white/[0.08] text-zinc-400 border-white/10 hover:text-white'
                }`}
                title={activeFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              >
                <Heart className={`w-7 h-7 ${activeFav ? 'fill-current' : ''}`} />
              </motion.button>

              {/* Repeat */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={cycleRepeat}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                  repeatMode !== 'off'
                    ? 'bg-[#FA243C] text-white border-[#FA243C] shadow-lg shadow-[#FA243C]/30'
                    : 'bg-white/[0.08] text-zinc-400 border-white/10 hover:text-white'
                }`}
                title={`وضع التكرار: ${repeatMode}`}
              >
                <Repeat className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </main>

        {/* --- Quick Driving Playlist Drawer (Oversized rows for fast tap while stopped) --- */}
        <AnimatePresence>
          {isQuickListOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 top-16 z-30 bg-[#0F0F14]/95 backdrop-blur-2xl border-t border-white/10 flex flex-col p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-6 h-6 text-[#FA243C]" />
                  <h2 className="text-xl font-black text-white">قائمة القيادة السريعة</h2>
                </div>
                <button
                  onClick={() => setIsQuickListOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              {/* Scrollable Large Track Rows */}
              <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1">
                {displayTracks.map((tr) => (
                  <motion.div
                    key={tr.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playTrack(tr);
                      setIsQuickListOpen(false);
                    }}
                    className={`min-h-[64px] flex items-center justify-between px-4 py-3 rounded-2xl border cursor-pointer transition-all ${
                      currentTrack?.id === tr.id
                        ? 'bg-white/[0.14] border-[#FA243C] text-white'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                        {tr.artworkUrl || tr.coverUrl ? (
                          <img
                            src={tr.artworkUrl || tr.coverUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                            ♪
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-base text-white truncate">{tr.title}</div>
                        <div className="text-xs text-zinc-400 font-semibold truncate">{tr.artist}</div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {currentTrack?.id === tr.id && isPlaying && (
                        <div className="flex items-center gap-0.5 px-2 py-1 rounded bg-[#FA243C]/20 text-[#FA243C] text-xs font-bold font-mono">
                          قيد التشغيل
                        </div>
                      )}
                      <span className="text-xs font-mono text-zinc-400">
                        {formatTime(tr.duration || 0)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
