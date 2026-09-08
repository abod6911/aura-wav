import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { TimelineSlider } from './TimelineSlider';
import { getActiveLyricIndex } from '../../services/lyricsParser';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ChevronDown,
  Heart,
  Mic2,
  Sliders,
  SlidersHorizontal,
  ListMusic,
  Sparkles,
  Compass,
  Moon,
  Trash2,
  Check,
  Zap,
  Gauge,
  Download,
  CheckCircle2,
  Flame,
  Disc,
  Disc3,
  MoreVertical,
  Palette,
  Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpandedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'player' | 'up_next' | 'lyrics' | 'related';

export const ExpandedPlayer: React.FC<ExpandedPlayerProps> = ({ isOpen, onClose }) => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const setPlaybackRate = usePlayerStore((state) => state.setPlaybackRate);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seek = usePlayerStore((state) => state.seek);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const playTrack = usePlayerStore((state) => state.playTrack);

  const queue = usePlayerStore((state) => state.queue);
  const tracks = usePlayerStore((state) => state.tracks);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const smartAutoplay = usePlayerStore((state) => state.smartAutoplay);
  const toggleSmartAutoplay = usePlayerStore((state) => state.toggleSmartAutoplay);

  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const downloadTrackForOffline = usePlayerStore((state) => state.downloadTrackForOffline);

  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);
  const setChangeArtworkModal = usePlayerStore((state) => state.setChangeArtworkModal);
  const spatialAudio = usePlayerStore((state) => state.spatialAudio);
  const toggleSpatialAudio = usePlayerStore((state) => state.toggleSpatialAudio);

  const isSoundboardOpen = usePlayerStore((state) => state.isSoundboardOpen);
  const setSoundboardOpen = usePlayerStore((state) => state.setSoundboardOpen);
  const setAutoMixModalOpen = usePlayerStore((state) => state.setAutoMixModalOpen);
  const automixStyle = usePlayerStore((state) => state.automixStyle);
  const playDJSound = usePlayerStore((state) => state.playDJSound);
  const isAutoMixingLive = usePlayerStore((state) => state.isAutoMixingLive);
  const isMobilePlayerOpen = usePlayerStore((state) => state.isMobilePlayerOpen);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);

  const [activeTab, setActiveTab] = useState<TabType>('player');
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);
  const [activeDJPHand, setActiveDJPHand] = useState<string | null>(null);
  const inlineActiveLineRef = useRef<HTMLParagraphElement | null>(null);

  // Trigger subtle mobile haptic feedback if available
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const handleQuickDJDrop = (effect: 'scratch' | 'airhorn' | 'echo_drop' | 'laser' | 'cheer') => {
    triggerHaptic();
    setActiveDJPHand(effect);
    playDJSound(effect);
    setTimeout(() => {
      setActiveDJPHand((curr) => (curr === effect ? null : curr));
    }, 350);
  };

  // Related songs computation (More by same artist, or matching genre)
  const moreByArtist = useMemo(() => {
    if (!currentTrack) return [];
    const primaryArtist = currentTrack.artist.split(',')[0].trim().toLowerCase();
    return tracks.filter(
      (t) => t.id !== currentTrack.id && t.artist.toLowerCase().includes(primaryArtist)
    ).slice(0, 6);
  }, [currentTrack?.id, tracks.length]);

  const similarTracks = useMemo(() => {
    if (!currentTrack) return [];
    // Choose tracks with similar duration (+/- 30s) or same genre
    return tracks.filter((t) => {
      if (t.id === currentTrack.id) return false;
      if (currentTrack.genre && t.genre === currentTrack.genre) return true;
      return Math.abs(t.duration - currentTrack.duration) < 25;
    }).slice(0, 6);
  }, [currentTrack?.id, tracks.length]);

  const effectiveOpen = isOpen || isMobilePlayerOpen;

  const handleClose = () => {
    setMobilePlayerOpen(false);
    onClose?.();
  };

  const lyrics = currentTrack?.syncedLyrics || [];
  const activeLyricIndex = getActiveLyricIndex(lyrics, currentTime);

  // Auto-scroll active lyric in Expanded Player inline view
  useEffect(() => {
    if (effectiveOpen && activeTab === 'lyrics' && inlineActiveLineRef.current) {
      inlineActiveLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [effectiveOpen, activeTab, activeLyricIndex]);

  const isFav = currentTrack ? favorites.includes(currentTrack.id) : false;
  const isAutoMixing =
    isAutoMixingLive ||
    (automixEnabled && duration > 10 && duration - currentTime <= automixDuration && duration - currentTime > 0.2);

  const cycleRate = () => {
    const rates = [0.75, 1.0, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
  };

  return (
    <AnimatePresence>
      {effectiveOpen && currentTrack && (
        <motion.div
          key="expanded-player-sheet"
          data-testid="expanded-player-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 300) {
            handleClose();
          }
        }}
        className="fixed inset-0 z-50 bg-[#121212] flex flex-col justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] select-none overflow-hidden touch-pan-y contain-paint-layout gpu-accelerated"
      >
        {/* Drag Handle Pill */}
        <div
          onClick={handleClose}
          className="w-10 h-1.5 rounded-full bg-white/25 hover:bg-white/40 mx-auto mb-2 flex-shrink-0 cursor-pointer transition-colors"
        />

        {/* Dynamic Hardware-Accelerated Ambient Radial Mesh */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none transition-all duration-700 opacity-40"
          style={{
            background: `radial-gradient(circle at 50% 25%, ${currentTrack.accentColor || currentTrack.dominantColor || '#1DB954'} 0%, transparent 60%), radial-gradient(circle at 80% 75%, ${currentTrack.secondaryColor || '#1ed760'} 0%, transparent 55%), #121212`,
            transform: 'translateZ(0)',
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#121212]/50 via-[#121212]/85 to-[#121212] pointer-events-none" />

        {/* 1. Top Header Bar (Ergonomic Minimalist Top 15%) */}
        <div className="flex items-center justify-between pt-1 px-1 flex-shrink-0">
          <motion.button
            data-testid="minimize-player-btn"
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              triggerHaptic();
              handleClose();
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white/90 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close player"
          >
            <ChevronDown className="w-6 h-6" strokeWidth={2} />
          </motion.button>

          <div className="text-center min-w-0 px-2 flex-1">
            <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-semibold block font-mono">
              AURA.WAV
            </span>
            <h5 className="text-xs text-zinc-300 font-medium truncate max-w-[200px] sm:max-w-xs mx-auto">
              {currentTrack.album || currentTrack.title}
            </h5>
          </div>

          <motion.button
            data-testid="more-options-btn"
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              triggerHaptic();
              setIsOptionsSheetOpen(true);
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white/90 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" strokeWidth={1.8} />
          </motion.button>
        </div>

        {/* 2. Main Dynamic Body Area (Tab Switcher) */}
        <div className="flex-1 my-3 overflow-hidden flex flex-col justify-center">
          {/* TAB A: MAIN COVER ART */}
          {activeTab === 'player' && (
            <motion.div
              key="player"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="flex-1 flex flex-col items-center justify-center relative min-h-0"
            >
              <motion.div
                data-testid="expanded-artwork-container"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -200) {
                    triggerHaptic();
                    nextTrack(false);
                  } else if (info.offset.x > 60 || info.velocity.x > 200) {
                    triggerHaptic();
                    previousTrack();
                  }
                }}
                style={{
                  boxShadow: `0 25px 80px -10px ${currentTrack.dominantColor || 'rgba(250, 36, 60, 0.45)'}`,
                }}
                className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden border border-white/[0.12] cursor-grab active:cursor-grabbing touch-pan-y shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setChangeArtworkModal(true, currentTrack);
                }}
              >
                <img
                  src={currentTrack.artworkUrl || '/logo.svg'}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isPlaying ? 'scale-105' : 'scale-100'
                  }`}
                />
              </motion.div>

              {/* Real-time Current Lyric Line Snippet */}
              {lyrics.length > 0 && activeLyricIndex >= 0 && (
                <p
                  dir="auto"
                  onClick={() => setActiveTab('lyrics')}
                  className="text-xs sm:text-sm text-[#1ed760] font-semibold text-center mt-4 px-4 py-1.5 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/25 max-w-sm truncate cursor-pointer hover:bg-[#1DB954]/20 transition-colors animate-fadeIn"
                >
                  "{lyrics[activeLyricIndex].text}"
                </p>
              )}
            </motion.div>
          )}

          {/* TAB B: UP NEXT QUEUE (YouTube Music Style) */}
          {activeTab === 'up_next' && (
            <motion.div
              key="up_next"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="flex-1 flex flex-col min-h-0 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-4 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-[#1DB954]" />
                  <span className="text-sm font-bold text-white">قائمة التالي ({queue.length})</span>
                </div>

                {/* Smart Autoplay Toggle */}
                <button
                  onClick={toggleSmartAutoplay}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    smartAutoplay
                      ? 'bg-[#1DB954] text-black font-extrabold shadow-md shadow-[#1DB954]/30'
                      : 'bg-white/5 text-zinc-400'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>تشغيل تلقائي ذكي</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1" dir="ltr">
                {queue.map((t, idx) => {
                  const isCur = t.id === currentTrack.id;
                  return (
                    <div
                      key={`${t.id}_${idx}`}
                      onClick={() => playTrack(t)}
                      className={`flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-colors ${
                        isCur ? 'bg-[#FA243C]/20 border border-[#FA243C]/35' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={t.artworkUrl || '/logo.svg'}
                          alt={t.title}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div className="min-w-0 text-left">
                          <h5 className={`text-xs font-bold truncate ${isCur ? 'text-[#FF456E]' : 'text-white'}`}>
                            {t.title}
                          </h5>
                          <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>

                      {!isCur && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(idx);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-[#FA243C]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB C: INLINE SYNCHRONIZED LYRICS */}
          {activeTab === 'lyrics' && (
            <motion.div
              key="lyrics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="flex-1 flex flex-col min-h-0 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-4 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] flex-shrink-0">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Mic2 className="w-4 h-4 text-[#FA243C]" />
                  <span>الكلمات المتزامنة</span>
                </span>
                <span className="text-[11px] text-zinc-400">انقر على أي سطر للانتقال</span>
              </div>

              <div
                className="flex-1 overflow-y-auto space-y-4 py-8 px-2 text-center scroll-smooth select-none"
                dir="auto"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                }}
              >
                {lyrics.length > 0 ? (
                  lyrics.map((l, idx) => {
                    const isActive = idx === activeLyricIndex;
                    return (
                      <p
                        key={idx}
                        ref={isActive ? inlineActiveLineRef : null}
                        onClick={() => {
                          triggerHaptic();
                          seek(l.time);
                        }}
                        className={`cursor-pointer transition-all duration-300 py-2 px-3 rounded-2xl font-bold origin-center ${
                          isActive
                            ? 'text-white text-xl sm:text-2xl drop-shadow-[0_0_24px_rgba(255,255,255,0.85)] scale-105 bg-white/[0.06]'
                            : 'text-zinc-500 hover:text-zinc-300 text-sm sm:text-base opacity-40 hover:opacity-80'
                        }`}
                      >
                        {l.text}
                      </p>
                    );
                  })
                ) : (
                  <div className="py-20 text-zinc-500 text-sm">لا توجد كلمات متزامنة لهذا المسار</div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB D: RELATED SONGS (YouTube Music Style Discovery) */}
          {activeTab === 'related' && (
            <motion.div
              key="related"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="flex-1 flex flex-col min-h-0 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-4 overflow-y-auto space-y-4"
            >
              {/* More by this artist */}
              {moreByArtist.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    المزيد من أغاني {currentTrack.artist}:
                  </span>
                  <div className="grid grid-cols-1 gap-2" dir="ltr">
                    {moreByArtist.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => playTrack(t)}
                        className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.05] cursor-pointer transition-colors"
                      >
                        <img src={t.artworkUrl || '/logo.svg'} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                        <div className="min-w-0 text-left">
                          <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                          <p className="text-[11px] text-zinc-400 truncate">{t.album || 'Single'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar vibe tracks */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  أغانٍ مقترحة بنفس النمط:
                </span>
                <div className="grid grid-cols-1 gap-2" dir="ltr">
                  {similarTracks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => playTrack(t)}
                      className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.05] cursor-pointer transition-colors"
                    >
                      <img src={t.artworkUrl || '/logo.svg'} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="min-w-0 text-left">
                        <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                        <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* 3. Track Details & Scrubber */}
        <div className="space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3 text-right">
              <h2 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                {currentTrack.title}
              </h2>
              <p className="text-sm text-zinc-400 truncate mt-0.5 font-medium">
                {currentTrack.artist}
              </p>
              {/* Apple Music Style Hi-Res Lossless & Spatial Audio Badges (Monochromatic & Clean) */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <motion.button
                  data-testid="spatial-audio-badge"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    triggerHaptic();
                    toggleSpatialAudio();
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    spatialAudio
                      ? 'bg-gradient-to-r from-[#FA243C]/30 to-[#FF2D55]/30 border-[#FA243C]/50 text-[#FF456E] shadow-[#FA243C]/20'
                      : 'bg-white/[0.05] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                  title="انقر لتفعيل أو تعطيل الصوت المكاني ثلاثي الأبعاد"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Lossless 24-bit</span>
                  <span className="text-white/20">|</span>
                  <Headphones className="w-3 h-3 text-current" />
                  <span className={spatialAudio ? 'text-[#FF456E] font-extrabold' : ''}>
                    Spatial 3D
                  </span>
                </motion.button>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Favorite Heart (44x44px minimum touch target) */}
              <motion.button
                data-testid="expanded-favorite-btn"
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  triggerHaptic();
                  toggleFavorite(currentTrack.id);
                }}
                className="w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-[#1DB954] transition-colors cursor-pointer rounded-full"
                aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
              >
                <Heart
                  className={`w-6 h-6 transition-colors ${
                    isFav ? 'text-[#1DB954] fill-[#1DB954]' : 'text-zinc-500'
                  }`}
                />
              </motion.button>
            </div>
          </div>

          <TimelineSlider
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
            showTimestamps={true}
            accentColor={currentTrack.accentColor || currentTrack.dominantColor || '#1DB954'}
          />
        </div>

        {/* 4. Luxury Hi-Fi Master Playback Controls (Strictly dir="ltr": Left=Prev, Right=Next) */}
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center justify-between px-3 my-2 flex-shrink-0 select-none"
          style={{ touchAction: 'manipulation' }}
          dir="ltr"
        >
          {/* 1. Shuffle Button (Far Left) */}
          <motion.button
            data-testid="expanded-shuffle-btn"
            whileTap={{ scale: 0.86 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              triggerHaptic();
              toggleShuffle();
            }}
            style={{ touchAction: 'manipulation' }}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer select-none ${
              shuffle 
                ? 'bg-[#1DB954]/20 border border-[#1DB954]/60 text-[#1ed760] shadow-[0_0_18px_rgba(29,185,84,0.45)]' 
                : 'bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.1]'
            }`}
            title="تشغيل عشوائي ذكي (Smart Shuffle)"
            aria-label="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </motion.button>

          {/* 2. Previous Track Button (Left of Play -> |<<) */}
          <motion.button
            data-testid="expanded-prev-btn"
            whileTap={{ scale: 0.88 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              triggerHaptic();
              previousTrack();
            }}
            style={{ touchAction: 'manipulation' }}
            className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.22] backdrop-blur-xl border border-white/[0.14] shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center text-white cursor-pointer select-none transition-all"
            title="السابق (Previous)"
            aria-label="Previous track"
          >
            <SkipBack className="w-6 h-6 fill-white text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
          </motion.button>

          {/* 3. Master Luxury Hi-Fi Play/Pause Button (Center) */}
          <motion.button
            data-testid="expanded-play-pause-btn"
            whileTap={{ scale: 0.91 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              triggerHaptic();
              togglePlayPause();
            }}
            style={{ 
              touchAction: 'manipulation',
              ['--aura-glow' as any]: currentTrack.accentColor || currentTrack.dominantColor || 'rgba(29, 185, 84, 0.45)'
            }}
            className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-b from-white via-zinc-100 to-zinc-200 border border-white/80 shadow-[0_12px_32px_rgba(0,0,0,0.65),0_0_25px_rgba(255,255,255,0.4)] text-black flex items-center justify-center cursor-pointer select-none flex-shrink-0 relative group transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {/* Dynamic artwork aura backlight */}
            <div 
              className="absolute inset-0 rounded-full blur-xl opacity-45 group-hover:opacity-80 transition-opacity pointer-events-none -z-10"
              style={{ backgroundColor: currentTrack.accentColor || currentTrack.dominantColor || '#1DB954' }}
            />
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-[#09090b] text-[#09090b] transition-transform active:scale-95" />
            ) : (
              <Play className="w-8 h-8 fill-[#09090b] text-[#09090b] translate-x-0.5 transition-transform active:scale-95" />
            )}
          </motion.button>

          {/* 4. Next Track Button (Right of Play -> >>|) */}
          <motion.button
            data-testid="expanded-next-btn"
            whileTap={{ scale: 0.88 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              triggerHaptic();
              nextTrack({ forceImmediate: true });
            }}
            style={{ touchAction: 'manipulation' }}
            className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.22] backdrop-blur-xl border border-white/[0.14] shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center text-white cursor-pointer select-none transition-all"
            title="التالي (Next)"
            aria-label="Next track"
          >
            <SkipForward className="w-6 h-6 fill-white text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
          </motion.button>

          {/* 5. Repeat Button (Far Right) */}
          <motion.button
            data-testid="expanded-repeat-btn"
            whileTap={{ scale: 0.86 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              triggerHaptic();
              cycleRepeat();
            }}
            style={{ touchAction: 'manipulation' }}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all cursor-pointer select-none ${
              repeatMode !== 'off' 
                ? 'bg-[#1DB954]/20 border border-[#1DB954]/60 text-[#1ed760] shadow-[0_0_18px_rgba(29,185,84,0.45)]' 
                : 'bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.1]'
            }`}
            title="تكرار (Repeat)"
            aria-label="Repeat"
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* 4.5 Balanced Mobile Thumb-Zone Pills: AutoMix & DJ Tools */}
        <div className="flex items-center justify-center gap-3 flex-shrink-0 select-none py-1">
          <motion.button
            data-testid="automix-pill"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              triggerHaptic();
              setAutoMixModalOpen(true);
            }}
            className={`luxury-capsule h-11 px-5 rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              automixEnabled ? 'luxury-capsule-active text-purple-300' : 'text-zinc-400 hover:text-white'
            }`}
            title="إعدادات الـ AutoMix"
          >
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
            <span>AutoMix</span>
            {automixEnabled && (
              <span className={`w-2 h-2 rounded-full ${isAutoMixingLive ? 'bg-emerald-400 animate-ping' : 'bg-purple-400'}`} />
            )}
          </motion.button>

          <motion.button
            data-testid="dj-tools-pill"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              triggerHaptic();
              setSoundboardOpen(true);
            }}
            className="luxury-capsule h-11 px-5 rounded-full text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all hover:text-white"
            title="أدوات ومؤثرات الـ DJ"
          >
            <Disc3 className={`w-4 h-4 text-[#FA243C] ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            <span>DJ Tools</span>
            {playbackRate !== 1.0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#FA243C] text-[10px] font-mono text-white">
                {playbackRate}x
              </span>
            )}
          </motion.button>
        </div>

        {/* 5. Apple Music 3 Tabs Selector */}
        <div className="flex items-center justify-around pt-2 pb-1 border-t border-white/[0.08] text-xs font-bold flex-shrink-0 select-none">
          <button
            onClick={() => setActiveTab(activeTab === 'up_next' ? 'player' : 'up_next')}
            className={`flex items-center gap-2 h-11 px-4 rounded-full transition-all cursor-pointer ${
              activeTab === 'up_next'
                ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>التالي</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'lyrics' ? 'player' : 'lyrics')}
            className={`flex items-center gap-2 h-11 px-4 rounded-full transition-all cursor-pointer ${
              activeTab === 'lyrics'
                ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic2 className="w-4 h-4" />
            <span>الكلمات</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'related' ? 'player' : 'related')}
            className={`flex items-center gap-2 h-11 px-4 rounded-full transition-all cursor-pointer ${
              activeTab === 'related'
                ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>مشابهة</span>
          </button>
        </div>

        {/* 6. iOS Draggable Secondary Options Bottom Sheet */}
        <AnimatePresence>
          {isOptionsSheetOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOptionsSheetOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 500) {
                    setIsOptionsSheetOpen(false);
                  }
                }}
                className="relative w-full max-w-lg bg-[#18181b]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[32px] p-6 pb-10 shadow-2xl space-y-4 z-10"
                dir="rtl"
              >
                {/* Drag Handle */}
                <div className="w-12 h-1.5 rounded-full bg-white/25 mx-auto -mt-2 mb-4" />

                {/* Header Info */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <img
                    src={currentTrack.artworkUrl || '/logo.svg'}
                    alt={currentTrack.title}
                    className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                  />
                  <div className="min-w-0 flex-1 text-right">
                    <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
                    <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
                  </div>
                </div>

                {/* Action Items */}
                <div className="space-y-1 text-sm font-medium">
                  {/* Equalizer */}
                  <button
                    onClick={() => {
                      triggerHaptic();
                      setIsOptionsSheetOpen(false);
                      setEqualizerOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.06] text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <SlidersHorizontal className="w-5 h-5 text-[#FA243C]" />
                      <span>المعادل الصوتي (Equalizer)</span>
                    </div>
                  </button>

                  {/* Sleep Timer */}
                  <button
                    onClick={() => {
                      triggerHaptic();
                      setIsOptionsSheetOpen(false);
                      setSleepTimerOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.06] text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <span>مؤقت النوم (Sleep Timer)</span>
                    </div>
                    {sleepTimerRemaining && (
                      <span className="text-xs text-indigo-400 font-mono">
                        {Math.ceil(sleepTimerRemaining / 60)} دقيقة
                      </span>
                    )}
                  </button>

                  {/* Change Artwork */}
                  <button
                    onClick={() => {
                      triggerHaptic();
                      setIsOptionsSheetOpen(false);
                      setChangeArtworkModal(true, currentTrack);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.06] text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Palette className="w-5 h-5 text-amber-400" />
                      <span>تغيير غلاف الأغنية</span>
                    </div>
                  </button>

                  {/* Download / Offline */}
                  <button
                    onClick={() => {
                      triggerHaptic();
                      downloadTrackForOffline(currentTrack.id);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.06] text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {downloadedTrackIds.includes(currentTrack.id) ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Download className="w-5 h-5 text-zinc-400" />
                      )}
                      <span>
                        {downloadedTrackIds.includes(currentTrack.id)
                          ? 'محفوظ للتشغيل بدون إنترنت'
                          : 'حفظ للتشغيل بدون إنترنت'}
                      </span>
                    </div>
                  </button>

                  {/* Playback Speed Selector */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03]">
                    <div className="flex items-center gap-3 text-zinc-300">
                      <Gauge className="w-5 h-5 text-cyan-400" />
                      <span>سرعة التشغيل</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            triggerHaptic();
                            setPlaybackRate(rate);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-[#FA243C] text-white'
                              : 'bg-white/[0.06] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cancel / Dismiss Button */}
                <button
                  onClick={() => setIsOptionsSheetOpen(false)}
                  className="w-full py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-bold text-sm transition-colors cursor-pointer mt-2"
                >
                  إلغاء
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
