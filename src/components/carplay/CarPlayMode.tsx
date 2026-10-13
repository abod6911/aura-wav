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
  Disc3,
  Radio,
  Sun,
  Moon,
  Zap
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Track } from '../../types';

const CarPlayScrubber: React.FC = () => {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
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
  );
};

export const CarPlayMode: React.FC = () => {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const duration = usePlayerStore(s => s.duration);
  const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
  const nextTrack = usePlayerStore(s => s.nextTrack);
  const previousTrack = usePlayerStore(s => s.previousTrack);
  const seek = usePlayerStore(s => s.seek);
  const isCarModeOpen = usePlayerStore(s => s.isCarModeOpen);
  const setCarModeOpen = usePlayerStore(s => s.setCarModeOpen);
  const favorites = usePlayerStore(s => s.favorites);
  const toggleFavorite = usePlayerStore(s => s.toggleFavorite);
  const shuffle = usePlayerStore(s => s.shuffle);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const cycleRepeat = usePlayerStore(s => s.cycleRepeat);
  const playTrack = usePlayerStore(s => s.playTrack);
  const tracks = usePlayerStore(s => s.tracks);
  const volume = usePlayerStore(s => s.volume);
  const setVolume = usePlayerStore(s => s.setVolume);

  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [highContrastMode, setHighContrastMode] = useState<'night' | 'day'>('night');
  const lastTapRef = useRef<number>(0);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Tab for Portrait Mode: 'now_playing' | 'playlist'
  // Defaults immediately to 'playlist' if no track is playing, or 'now_playing' if audio is active
  const [portraitTab, setPortraitTab] = useState<'now_playing' | 'playlist'>(
    currentTrack ? 'now_playing' : 'playlist'
  );

  // 4 Tactile Driving Filter Modes
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'energy' | 'chill'>('all');

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

  // 3. Touch Gesture Navigation (Zero-Glance Controls)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const now = performance.now();

    // Check for Double-Tap (Play/Pause)
    if (Math.abs(diffX) < 15 && Math.abs(diffY) < 15) {
      if (now - lastTapRef.current < 320) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(30); } catch {}
        }
        togglePlayPause();
        lastTapRef.current = 0;
        setTouchStartX(null);
        setTouchStartY(null);
        return;
      }
      lastTapRef.current = now;
    }

    // Horizontal Swipe: Track Prev / Next
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        previousTrack();
      } else {
        nextTrack({ forceImmediate: true });
      }
    } 
    // Vertical Swipe: Volume Up / Down
    else if (Math.abs(diffY) > 40 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY < 0) {
        setVolume(Math.min(1.0, volume + 0.1));
      } else {
        setVolume(Math.max(0.0, volume - 0.1));
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(15); } catch {}
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Helper format seconds
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Compute tracks according to active tactile filter mode
  const favoriteTracks = useMemo(() => {
    return tracks.filter((t) => favorites.includes(t.id));
  }, [tracks, favorites]);

  const energyTracks = useMemo(() => {
    const list = tracks.filter((t) => 
      (t.bpm && t.bpm >= 120) || 
      (t.genre && /dance|electronic|hip-hop|rap|rock|techno|house|pop|edm|party|energy|gym/i.test(t.genre))
    );
    return list.length > 0 ? list : tracks.slice(0, Math.ceil(tracks.length / 2));
  }, [tracks]);

  const chillTracks = useMemo(() => {
    const list = tracks.filter((t) => 
      (t.bpm && t.bpm > 0 && t.bpm < 115) || 
      (t.genre && /chill|ambient|acoustic|lo-fi|lofi|jazz|classical|r&b|soul|relax|night|calm/i.test(t.genre))
    );
    return list.length > 0 ? list : tracks.slice(Math.floor(tracks.length / 2));
  }, [tracks]);

  const displayedTracks = useMemo(() => {
    switch (filterMode) {
      case 'favorites':
        return favoriteTracks;
      case 'energy':
        return energyTracks;
      case 'chill':
        return chillTracks;
      case 'all':
      default:
        return tracks;
    }
  }, [filterMode, favoriteTracks, energyTracks, chillTracks, tracks]);

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
        className={`fixed inset-0 z-[9999] flex flex-col select-none overflow-hidden font-sans transition-colors duration-300 ${
          highContrastMode === 'day' ? 'bg-[#F2F2F7] text-[#1C1C1E]' : 'bg-[#0A0A0E] text-white'
        }`}
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
        <header className={`relative z-20 flex flex-col landscape:flex-row landscape:items-center justify-between px-4 sm:px-8 py-2.5 sm:py-3 border-b gap-2.5 landscape:gap-4 backdrop-blur-xl transition-colors duration-300 ${
          highContrastMode === 'day' ? 'border-black/10 bg-white/80' : 'border-white/[0.08] bg-black/60'
        }`}>
          <div className="flex items-center justify-between w-full landscape:w-auto">
            {/* Clock & CarPlay Brand Badge & Daylight Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border font-mono text-xs sm:text-sm font-bold ${
                highContrastMode === 'day' ? 'bg-black/[0.05] border-black/10 text-black' : 'bg-white/[0.08] border-white/10 text-white'
              }`}>
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>{currentTimeFormatted}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#FA243C]/20 border border-[#FA243C]/40 text-[#FA243C] text-[11px] sm:text-xs font-black tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                <span>Apple CarPlay</span>
              </div>

              {/* Day / Night High Contrast Switcher */}
              <button
                onClick={() => setHighContrastMode(m => m === 'night' ? 'day' : 'night')}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  highContrastMode === 'day'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                    : 'bg-white/[0.08] text-zinc-300 border-white/10 hover:text-white'
                }`}
                title={highContrastMode === 'day' ? 'التبديل إلى الوضع الليلي' : 'التبديل إلى وضع النهار عالي التباين'}
              >
                {highContrastMode === 'day' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">نهاري</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">ليلي</span>
                  </>
                )}
              </button>

              {isWakeLockActive && (
                <span className={`hidden md:inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
                  highContrastMode === 'day' ? 'text-zinc-600 bg-black/[0.04]' : 'text-zinc-400 bg-white/[0.04]'
                }`}>
                  الشاشة نشطة دائماً
                </span>
              )}
            </div>

            {/* Mobile Close Button */}
            <div className="flex landscape:hidden items-center">
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => setCarModeOpen(false)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  highContrastMode === 'day' ? 'bg-black/[0.05] border-black/10 text-zinc-800' : 'bg-white/[0.08] hover:bg-red-500/20 hover:text-red-400 border-white/10 text-zinc-300'
                }`}
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
              <h1 className={`text-xl sm:text-2xl landscape:text-lg font-black truncate tracking-tight ${
                highContrastMode === 'day' ? 'text-black' : 'text-white'
              }`}>
                <bdi dir="auto">{currentTrack?.title || 'اختر أغنية من القائمة للبدء'}</bdi>
              </h1>
              <p className={`text-sm sm:text-base landscape:text-xs font-semibold truncate mt-0.5 ${
                highContrastMode === 'day' ? 'text-zinc-700' : 'text-zinc-300'
              }`}>
                <bdi dir="auto">{currentTrack?.artist || 'جاهز للتشغيل بأعلى جودة'}</bdi>
              </p>
              <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono ${
                highContrastMode === 'day' ? 'bg-black/[0.05] border-black/10 text-zinc-600' : 'bg-white/[0.06] border-white/10 text-zinc-400'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Lossless Hi-Fi Studio Master</span>
              </div>
            </div>

            <CarPlayScrubber />

            {/* Oversized Transport Controls (Strictly LTR for universal in-car layout) */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 landscape:gap-3 mt-4 landscape:mt-3 w-full max-w-lg" dir="ltr">
              {/* Skip Back 15s */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => seek(Math.max(0, usePlayerStore.getState().currentTime - 15))}
                className="w-12 h-12 sm:w-14 sm:h-14 landscape:w-12 landscape:h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
                title="ترجيع 15 ثانية"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>

              {/* Previous Track (70x70px minimum touch target) */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => previousTrack()}
                className="w-[70px] h-[70px] sm:w-[76px] sm:h-[76px] landscape:w-[68px] landscape:h-[68px] rounded-3xl bg-white/[0.14] hover:bg-white/[0.22] border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shadow-xl active:scale-95"
                title="المسار السابق"
              >
                <SkipBack className="w-8 h-8 sm:w-9 sm:h-9" />
              </motion.button>

              {/* Giant Center Play/Pause Button (80x80px to 96x96px) */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={togglePlayPause}
                className="w-20 h-20 sm:w-24 sm:h-24 landscape:w-20 landscape:h-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_15px_45px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? (
                  <Pause className="w-9 h-9 sm:w-11 sm:h-11 fill-black" />
                ) : (
                  <Play className="w-9 h-9 sm:w-11 sm:h-11 fill-black translate-x-0.5" />
                )}
              </motion.button>

              {/* Next Track (70x70px minimum touch target) */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => nextTrack({ forceImmediate: true })}
                className="w-[70px] h-[70px] sm:w-[76px] sm:h-[76px] landscape:w-[68px] landscape:h-[68px] rounded-3xl bg-white/[0.14] hover:bg-white/[0.22] border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shadow-xl active:scale-95"
                title="المسار التالي"
              >
                <SkipForward className="w-8 h-8 sm:w-9 sm:h-9" />
              </motion.button>

              {/* Skip Forward 15s */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => seek(Math.min(duration, usePlayerStore.getState().currentTime + 15))}
                className="w-12 h-12 sm:w-14 sm:h-14 landscape:w-12 landscape:h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-zinc-300 transition-all cursor-pointer"
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
            {/* Quick Tactile Driving Filters (Zero-Distraction / Giant Tap Targets) */}
            <div className="flex flex-col gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-[#FA243C]" />
                  <h2 className="text-base sm:text-lg font-black text-white">قائمة القيادة السريعة</h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/[0.08] text-zinc-300 text-xs font-mono font-black">
                  {displayedTracks.length} مسار
                </span>
              </div>

              {/* 4 Giant Tactile Filter Buttons (No Typing Distraction) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* 1. All */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setFilterMode('all')}
                  className={`h-13 sm:h-14 px-3 sm:px-4 rounded-2xl flex items-center justify-between border font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md select-none ${
                    filterMode === 'all'
                      ? 'bg-white text-black border-white shadow-white/20'
                      : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ListMusic className="w-4 h-4 shrink-0" />
                    <span>الكل</span>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    filterMode === 'all' ? 'bg-black/10 text-black' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {tracks.length}
                  </span>
                </motion.button>

                {/* 2. Favorites */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setFilterMode('favorites')}
                  className={`h-13 sm:h-14 px-3 sm:px-4 rounded-2xl flex items-center justify-between border font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md select-none ${
                    filterMode === 'favorites'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
                      : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 shrink-0 fill-current" />
                    <span>المفضلة</span>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    filterMode === 'favorites' ? 'bg-white/20 text-white' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {favoriteTracks.length}
                  </span>
                </motion.button>

                {/* 3. Energy (>120 BPM) */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setFilterMode('energy')}
                  className={`h-13 sm:h-14 px-3 sm:px-4 rounded-2xl flex items-center justify-between border font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md select-none ${
                    filterMode === 'energy'
                      ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/30 font-black'
                      : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 shrink-0 fill-current" />
                    <span>⚡ حماس وطاقة</span>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    filterMode === 'energy' ? 'bg-black/15 text-black' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {energyTracks.length}
                  </span>
                </motion.button>

                {/* 4. Chill (<115 BPM) */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setFilterMode('chill')}
                  className={`h-13 sm:h-14 px-3 sm:px-4 rounded-2xl flex items-center justify-between border font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md select-none ${
                    filterMode === 'chill'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30'
                      : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 shrink-0 fill-current" />
                    <span>🌙 هدوء وليل</span>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    filterMode === 'chill' ? 'bg-white/20 text-white' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {chillTracks.length}
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Scrollable Tracks List (Glanceable 74px Rows & 56x56 Artwork) */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 pr-1 custom-scrollbar">
              {displayedTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                  <ListMusic className="w-12 h-12 stroke-[1.5] mb-2 opacity-50" />
                  <p className="text-sm font-bold">لا توجد مسارات في هذا التصنيف</p>
                  <p className="text-xs text-zinc-600 mt-1">اختر تصنيفاً آخر لتصفح مكتبتك</p>
                </div>
              ) : (
                displayedTracks.map((tr) => {
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
                      className={`min-h-[74px] h-[74px] flex items-center justify-between px-4 py-2.5 rounded-2xl border cursor-pointer transition-all select-none ${
                        isCurrent
                          ? 'bg-white/[0.16] border-[#FA243C] text-white shadow-lg ring-1 ring-[#FA243C]/40'
                          : highContrastMode === 'day'
                          ? 'bg-black/[0.03] hover:bg-black/[0.07] border-black/10 text-zinc-800'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/5 text-zinc-300'
                      }`}
                    >
                      {/* Left: 56x56 Artwork Squircle & Glanceable Titles */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-zinc-800 shrink-0 border border-white/15 shadow-sm">
                          {tr.artworkUrl || tr.coverUrl ? (
                            <img
                              src={tr.artworkUrl || tr.coverUrl}
                              alt=""
                              className="w-full h-full object-cover select-none"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-sm">
                              ♪
                            </div>
                          )}

                          {isCurrent && isPlaying && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#FA243C] animate-ping" />
                            </div>
                          )}
                        </div>

                        <div className="truncate flex-1 pr-1">
                          <div className={`font-black text-base sm:text-lg truncate tracking-tight ${
                            isCurrent ? 'text-[#FA243C]' : highContrastMode === 'day' ? 'text-black' : 'text-white'
                          }`}>
                            <bdi dir="auto">{tr.title}</bdi>
                          </div>
                          <div className={`text-xs sm:text-sm font-semibold truncate mt-0.5 ${
                            highContrastMode === 'day' ? 'text-zinc-600' : 'text-zinc-400'
                          }`}>
                            <bdi dir="auto">{tr.artist}</bdi>
                          </div>
                        </div>
                      </div>

                      {/* Right: BPM badge + Playing Status / Duration */}
                      <div className="shrink-0 flex items-center gap-2.5 pl-1">
                        {tr.bpm ? (
                          <span className="hidden sm:inline-flex text-[11px] font-mono font-bold text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/5">
                            {tr.bpm} BPM
                          </span>
                        ) : null}

                        {isCurrent && isPlaying ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FA243C]/20 border border-[#FA243C]/40 text-[#FA243C] text-xs font-black font-mono">
                            <Radio className="w-3.5 h-3.5 animate-pulse" />
                            <span className="hidden xs:inline">يعمل الآن</span>
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm font-mono text-zinc-400 font-bold">
                            {formatTime(tr.duration || 0)}
                          </span>
                        )}
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
