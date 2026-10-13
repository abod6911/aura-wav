import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { TimelineSlider, formatDuration } from './TimelineSlider';
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
  Compass,
  Moon,
  Trash2,
  Zap,
  Gauge,
  Download,
  CheckCircle2,
  Disc3,
  MoreVertical,
  Palette,
  Headphones,
  Tag,
  Car,
  Volume1,
  Volume2,
  Activity,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpandedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'player' | 'up_next' | 'lyrics' | 'studio' | 'related';

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
  const { t, isRTL, dir } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack!);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const setPlaybackRate = usePlayerStore((state) => state.setPlaybackRate);
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);

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
  const setChangeArtworkModal = usePlayerStore((state) => state.setChangeArtworkModal);
  const setMetadataEditorModal = usePlayerStore((state) => state.setMetadataEditorModal);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
  const setCarModeOpen = usePlayerStore((state) => state.setCarModeOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);
  const playDJSound = usePlayerStore((state) => state.playDJSound);
  const isAutoMixingLive = usePlayerStore((state) => state.isAutoMixingLive);

  const spatialMode = usePlayerStore((state) => state.spatialMode);
  const setSpatialMode = usePlayerStore((state) => state.setSpatialMode);
  const karaokeMode = usePlayerStore((state) => state.karaokeMode);
  const setKaraokeMode = usePlayerStore((state) => state.setKaraokeMode);
  const karaokeVocalLevel = usePlayerStore((state) => state.karaokeVocalLevel);
  const setKaraokeVocalLevel = usePlayerStore((state) => state.setKaraokeVocalLevel);
  const bassBoost = usePlayerStore((state) => state.bassBoost);
  const setBassBoost = usePlayerStore((state) => state.setBassBoost);
  const analogWarmth = usePlayerStore((state) => state.analogWarmth);
  const setAnalogWarmth = usePlayerStore((state) => state.setAnalogWarmth);

  const [activeTab, setActiveTab] = useState<TabType>('player');
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);
  const [activeDJPHand, setActiveDJPHand] = useState<string | null>(null);
  const [showWaveform, setShowWaveform] = useState(false);
  const inlineActiveLineRef = useRef<HTMLParagraphElement | null>(null);

  // 3D Artwork Tilt Reaction
  const [artworkTilt, setArtworkTilt] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const handleArtworkPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    rafRef.current = requestAnimationFrame(() => {
      const px = (clientX - rect.left) / rect.width - 0.5;
      const py = (clientY - rect.top) / rect.height - 0.5;
      setArtworkTilt({ x: -(py * 16), y: px * 16 });
      rafRef.current = null;
    });
  };
  const handleArtworkPointerLeave = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setArtworkTilt({ x: 0, y: 0 });
  };

  // Trigger subtle mobile haptic feedback if available
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const djTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (djTimeoutRef.current) clearTimeout(djTimeoutRef.current);
    };
  }, []);

  const handleQuickDJDrop = (effect: 'scratch' | 'airhorn' | 'echo_drop' | 'laser' | 'cheer') => {
    triggerHaptic();
    setActiveDJPHand(effect);
    playDJSound(effect);
    if (djTimeoutRef.current) clearTimeout(djTimeoutRef.current);
    djTimeoutRef.current = setTimeout(() => {
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

  const handleClose = () => {
    setMobilePlayerOpen(false);
    onClose?.();
  };

  const lyrics = currentTrack?.syncedLyrics || [];
  const activeLyricIndex = getActiveLyricIndex(lyrics, currentTime);

  // Auto-scroll active lyric in Expanded Player inline view
  useEffect(() => {
    if (activeTab === 'lyrics' && inlineActiveLineRef.current) {
      inlineActiveLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeTab, activeLyricIndex]);

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
        className="fixed inset-0 z-50 bg-[#0c0c14] flex flex-col justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] select-none overflow-hidden touch-pan-y contain-paint-layout gpu-accelerated"
        dir={dir}
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
            background: `radial-gradient(circle at 50% 25%, ${currentTrack.accentColor || currentTrack.dominantColor || '#FA243C'} 0%, transparent 60%), radial-gradient(circle at 80% 75%, ${currentTrack.secondaryColor || '#FF375F'} 0%, transparent 55%), #08080c`,
            transform: 'translateZ(0)',
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#08080c]/50 via-[#08080c]/85 to-[#08080c] pointer-events-none" />

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

          <div className="flex items-center gap-1.5">
            <motion.button
              data-testid="carplay-mode-btn"
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                triggerHaptic();
                onClose();
                setMobilePlayerOpen(false);
                setCarModeOpen(true);
              }}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-[#FA243C] flex items-center justify-center transition-colors cursor-pointer"
              title="وضع السيارة / CarPlay Mode"
              aria-label="CarPlay Mode"
            >
              <Car className="w-5 h-5" strokeWidth={1.8} />
            </motion.button>

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
        </div>

        {/* 2. Apple Music Split Cinema Layout on Desktop, Fluid Ergonomic Sheet on Mobile */}
        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center lg:items-stretch overflow-hidden px-2 sm:px-4 md:px-6 py-2 gap-6 lg:gap-10 min-h-0">
          
          {/* ========================================================================= */}
          {/* COLUMN 1 (START): ARTWORK + TRACK META + SCRUBBER + TRANSPORT + VOLUME */}
          {/* Always visible on Desktop (42% width), or when activeTab === 'player' on Mobile */}
          {/* ========================================================================= */}
          <div
            className={`w-full lg:w-[42%] max-w-[420px] flex-col justify-between gap-3 sm:gap-4 shrink-0 ${
              activeTab === 'player' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Grand Squircle Artwork */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-1">
              <motion.div
                data-testid="expanded-artwork-container"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onPointerMove={handleArtworkPointerMove}
                onPointerLeave={handleArtworkPointerLeave}
                animate={{
                  rotateX: artworkTilt.x,
                  rotateY: artworkTilt.y,
                  scale: isPlaying ? 1.03 : 1,
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -55 || info.velocity.x < -200) {
                    triggerHaptic();
                    if (isRTL) previousTrack();
                    else nextTrack(false);
                  } else if (info.offset.x > 55 || info.velocity.x > 200) {
                    triggerHaptic();
                    if (isRTL) nextTrack(false);
                    else previousTrack();
                  }
                }}
                style={{
                  perspective: 1000,
                  transformStyle: 'preserve-3d',
                  boxShadow: `0 25px 80px -10px ${currentTrack.dominantColor || currentTrack.accentColor || 'rgba(250, 36, 60, 0.45)'}`,
                }}
                className="group relative w-56 h-56 xs:w-64 xs:h-64 sm:w-72 sm:h-72 lg:w-full lg:max-w-[390px] aspect-square rounded-[28px] overflow-hidden border border-white/[0.14] cursor-grab active:cursor-grabbing touch-pan-y shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] mx-auto"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setChangeArtworkModal(true, currentTrack);
                }}
              >
                {/* Glossy Glass Light Sheen Sweep */}
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-[28px]">
                  <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/15 to-transparent transform -rotate-45 translate-x-[-150%] group-hover:translate-x-[250%] transition-transform duration-1000 ease-in-out" />
                </div>

                {/* Vinyl Spin Status Badge */}
                <div className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 z-20 pointer-events-none shadow-md">
                  <Disc3 className={`w-3.5 h-3.5 text-white/90 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                  <span className="text-[10px] font-mono text-white/80 font-bold uppercase tracking-wider">{isPlaying ? 'Vinyl 33' : 'Paused'}</span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentTrack.id}
                    src={currentTrack.artworkUrl || currentTrack.coverUrl || '/logo.svg'}
                    alt={currentTrack.title}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: isPlaying ? 1.05 : 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Track Info & Badges */}
            <div className="space-y-2.5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pe-3 text-start">
                  <h2 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                    <bdi dir="auto">{currentTrack.title}</bdi>
                  </h2>
                  <p className="text-sm text-zinc-400 truncate mt-0.5 font-medium">
                    <bdi dir="auto">{currentTrack.artist}</bdi>
                  </p>
                  
                  {/* Apple Badges */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                    <span className="apple-badge bg-white/[0.08] text-white/90 text-[9px] sm:text-[10px]">
                      APPLE MASTER
                    </span>
                    <div
                      dir="ltr"
                      className="apple-badge bg-emerald-500/10 border-emerald-500/25 text-emerald-400 text-[9px] sm:text-[10px]"
                      title="صوت استوديو نقي عالي الدقة (Lossless 24-bit)"
                    >
                      <Headphones className="w-2.5 h-2.5 text-emerald-400" />
                      <span>LOSSLESS 24-BIT</span>
                    </div>
                    {spatialMode !== 'off' && (
                      <span className="apple-badge bg-purple-500/15 border-purple-500/30 text-purple-300 text-[9px] sm:text-[10px]">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>SPATIAL {spatialMode.toUpperCase()}</span>
                      </span>
                    )}
                    {karaokeMode && (
                      <span className="apple-badge bg-[#FA243C]/20 border-[#FA243C]/40 text-[#FF375F] text-[9px] sm:text-[10px]">
                        <Mic2 className="w-2.5 h-2.5" />
                        <span>SING ACTIVE</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Heart Button */}
                <motion.button
                  data-testid="expanded-favorite-btn"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => {
                    triggerHaptic();
                    toggleFavorite(currentTrack.id);
                  }}
                  className="w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-[#FA243C] transition-colors cursor-pointer rounded-full apple-spring flex-shrink-0"
                  aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                >
                  <Heart
                    className={`w-6 h-6 transition-transform ${
                      isFav ? 'text-[#FA243C] fill-[#FA243C] drop-shadow-[0_0_12px_rgba(250,36,60,0.65)] scale-110' : 'text-zinc-500'
                    }`}
                  />
                </motion.button>
              </div>

              {/* Scrubber */}
              <TimelineSlider
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
                showTimestamps={true}
                showWaveform={showWaveform}
                trackId={currentTrack.id}
                accentColor={currentTrack.accentColor || currentTrack.dominantColor || '#FA243C'}
              />

              {/* Playback Transport Buttons (Strictly LTR: Prev -> Play -> Next) */}
              <div 
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center justify-between px-2 sm:px-3 pt-1 select-none w-full"
                style={{ touchAction: 'manipulation' }}
                dir="ltr"
              >
                {/* 1. Shuffle Button */}
                <motion.button
                  data-testid="expanded-shuffle-btn"
                  whileTap={{ scale: 0.86 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    triggerHaptic();
                    toggleShuffle();
                  }}
                  className={`relative w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-all cursor-pointer select-none ${
                    shuffle 
                      ? 'bg-[#FA243C]/20 border border-[#FA243C]/60 text-[#FF375F] shadow-[0_0_18px_rgba(250,36,60,0.45)]' 
                      : 'bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-white'
                  }`}
                  title="تشغيل عشوائي ذكي (Smart Shuffle)"
                  aria-label="Shuffle"
                >
                  <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                  {shuffle && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#FA243C] shadow-[0_0_6px_#FF375F]" />}
                </motion.button>

                {/* 2. Previous Track */}
                <motion.button
                  data-testid="expanded-prev-btn"
                  whileTap={{ scale: 0.88 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    triggerHaptic();
                    previousTrack();
                  }}
                  className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] flex items-center justify-center text-white cursor-pointer select-none transition-all active:scale-90"
                  title="السابق (Previous)"
                  aria-label="Previous track"
                >
                  <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white" />
                </motion.button>

                {/* 3. Center Master Play/Pause Statement Button */}
                <motion.button
                  data-testid="expanded-play-pause-btn"
                  whileTap={{ scale: 0.90 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    triggerHaptic();
                    togglePlayPause();
                  }}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-b from-white via-zinc-100 to-zinc-200 border border-white/80 shadow-[0_12px_32px_rgba(0,0,0,0.65),0_0_35px_rgba(255,255,255,0.45)] text-black flex items-center justify-center cursor-pointer select-none flex-shrink-0 relative group transition-transform active:scale-90"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  <div 
                    className="absolute inset-0 rounded-full blur-xl opacity-45 group-hover:opacity-80 transition-opacity pointer-events-none -z-10"
                    style={{ backgroundColor: currentTrack.accentColor || currentTrack.dominantColor || '#FA243C' }}
                  />
                  {isPlaying ? (
                    <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-[#09090b] text-[#09090b]" />
                  ) : (
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-[#09090b] text-[#09090b] translate-x-0.5" />
                  )}
                </motion.button>

                {/* 4. Next Track */}
                <motion.button
                  data-testid="expanded-next-btn"
                  whileTap={{ scale: 0.88 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    triggerHaptic();
                    nextTrack({ forceImmediate: true });
                  }}
                  className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] flex items-center justify-center text-white cursor-pointer select-none transition-all active:scale-90"
                  title="التالي (Next)"
                  aria-label="Next track"
                >
                  <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white" />
                </motion.button>

                {/* 5. Repeat Button */}
                <motion.button
                  data-testid="expanded-repeat-btn"
                  whileTap={{ scale: 0.86 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    triggerHaptic();
                    cycleRepeat();
                  }}
                  className={`relative w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-all cursor-pointer select-none ${
                    repeatMode !== 'off' 
                      ? 'bg-[#FA243C]/20 border border-[#FA243C]/60 text-[#FF375F] shadow-[0_0_18px_rgba(250,36,60,0.45)]' 
                      : 'bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-white'
                  }`}
                  title="تكرار (Repeat)"
                  aria-label="Repeat"
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
                  {repeatMode !== 'off' && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#FA243C] shadow-[0_0_6px_#FF375F]" />}
                </motion.button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-3 px-3 pt-1">
                <Volume1 className="w-4 h-4 text-white/50 flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, rgba(255,255,255,0.7) ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)` }}
                />
                <Volume2 className="w-4 h-4 text-white/50 flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLUMN 2 (END): DYNAMIC STAGE (58% Width on Desktop) */}
          {/* Lyrics, 3D Studio, Queue, or Related. Seamless side-by-side transition! */}
          {/* ========================================================================= */}
          <div
            className={`w-full lg:w-[58%] flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
              activeTab !== 'player' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Desktop & Mobile Dynamic Stage Tabs Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setActiveTab('lyrics')}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'lyrics' || (activeTab === 'player' && typeof window !== 'undefined' && window.innerWidth >= 1024)
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  <span>{t.syncedLyrics}</span>
                </button>

                <button
                  onClick={() => setActiveTab('studio')}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'studio'
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'الاستوديو 3D' : 'Studio 3D'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('up_next')}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'up_next'
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>{t.queue}</span>
                </button>

                <button
                  onClick={() => setActiveTab('related')}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'related'
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                      : 'bg-white/[0.05] text-zinc-300 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'مقترحة' : 'Related'}</span>
                </button>
              </div>

              {/* Mobile Back-to-Artwork Button */}
              <button
                onClick={() => setActiveTab('player')}
                className="lg:hidden text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.06] cursor-pointer"
              >
                {isRTL ? 'عرض الغلاف' : 'Cover Art'}
              </button>
            </div>

            {/* Dynamic Stage Viewport */}
            <div className="flex-1 overflow-hidden relative pt-2">
              <AnimatePresence mode="wait">
                {/* STAGE A: SYNCHRONIZED LYRICS (Border-none, transparent background, optical gradient mask) */}
                {(activeTab === 'lyrics' || (activeTab === 'player' && typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
                  <motion.div
                    key="stage-lyrics"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full flex flex-col overflow-hidden"
                  >
                    <div
                      className="flex-1 overflow-y-auto space-y-6 py-12 px-4 text-start scroll-smooth select-none no-scrollbar"
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
                              className={`cursor-pointer transition-all duration-300 py-2.5 px-4 rounded-2xl font-black origin-start leading-relaxed ${
                                isActive
                                  ? 'text-white text-2xl sm:text-3xl lg:text-4xl drop-shadow-[0_0_28px_rgba(255,255,255,0.9)] scale-[1.03] bg-white/[0.04]'
                                  : 'text-white/35 hover:text-white/70 text-base sm:text-xl lg:text-2xl filter blur-[0.4px]'
                              }`}
                            >
                              <bdi dir="auto">{l.text}</bdi>
                            </p>
                          );
                        })
                      ) : (
                        <div className="py-24 text-center text-zinc-500 font-bold text-sm">
                          {isRTL ? 'لا توجد كلمات متزامنة لهذا المسار' : 'No synced lyrics available for this track'}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STAGE B: 3D SOUND STUDIO (Embedded side-by-side without moving cover!) */}
                {activeTab === 'studio' && (
                  <motion.div
                    key="stage-studio"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-y-auto p-3 sm:p-5 space-y-5 apple-glass-card rounded-[28px] border border-white/[0.08]"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] text-white">
                          <Sparkles className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-base font-black text-white">استوديو الصوت ثلاثي الأبعاد</h4>
                          <p className="text-[11px] text-zinc-400">Web Audio Hi-Fi DSP & Spatial Reverbs</p>
                        </div>
                      </div>
                      <span className="apple-badge bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
                        Hi-Res 24-bit
                      </span>
                    </div>

                    {/* Spatial Presets Grid */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-zinc-300">البيئة الصوتية ثلاثية الأبعاد (Spatial Reverb):</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          { id: 'off', label: 'ستيريو مباشر', icon: '⏹️', desc: 'Stereo Direct' },
                          { id: 'concert', label: 'قاعة حفلات', icon: '🏛️', desc: 'Live Concert' },
                          { id: 'studio', label: 'استوديو نقي', icon: '🎙️', desc: 'Acoustic Studio' },
                          { id: 'club', label: 'نادي ليلي', icon: '🎛️', desc: 'Club & Bass' },
                          { id: '8d', label: 'صوت فضائي 8D', icon: '🎧', desc: '360° Orbit' },
                        ].map((preset) => {
                          const isSelected = spatialMode === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => {
                                triggerHaptic();
                                setSpatialMode(preset.id as any);
                              }}
                              className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-gradient-to-tr from-[#FA243C]/25 to-[#FF375F]/15 border-[#FA243C] shadow-lg shadow-[#FA243C]/20 text-white'
                                  : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                              }`}
                            >
                              <span className="text-lg mb-1">{preset.icon}</span>
                              <span className="text-xs font-bold block">{preset.label}</span>
                              <span className="text-[10px] text-zinc-400">{preset.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Karaoke Sing Mode Card */}
                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">🎤</span>
                          <div>
                            <h5 className="text-sm font-black text-white">وضع Apple Sing وعزل صوت المغني</h5>
                            <p className="text-[11px] text-zinc-400">Center-Channel Vocal Attenuation Filter</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            triggerHaptic();
                            setKaraokeMode(!karaokeMode);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                            karaokeMode
                              ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/35'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {karaokeMode ? 'مفعل' : 'معطل'}
                        </button>
                      </div>

                      {karaokeMode && (
                        <div className="pt-2 border-t border-white/[0.08] space-y-2">
                          <div className="flex justify-between text-xs text-zinc-300">
                            <span>نسبة خفض صوت المغني:</span>
                            <span className="font-mono font-bold text-[#FF375F]">
                              {Math.round(karaokeVocalLevel * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={karaokeVocalLevel}
                            onChange={(e) => setKaraokeVocalLevel(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/20 rounded-full appearance-none accent-[#FA243C] cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Bass Boost & Analog Warmth */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2">
                        <div className="flex justify-between text-xs font-bold text-white">
                          <span>⚡ Mega Bass Boost:</span>
                          <span className="text-[#FA243C] font-mono">+{bassBoost} dB</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="0.5"
                          value={bassBoost}
                          onChange={(e) => setBassBoost(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-white/20 rounded-full appearance-none accent-[#FA243C] cursor-pointer"
                        />
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2">
                        <div className="flex justify-between text-xs font-bold text-white">
                          <span>📻 Analog Warmth:</span>
                          <span className="text-amber-400 font-mono">{analogWarmth}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={analogWarmth}
                          onChange={(e) => setAnalogWarmth(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-white/20 rounded-full appearance-none accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STAGE C: QUEUE */}
                {activeTab === 'up_next' && (
                  <motion.div
                    key="stage-queue"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full flex flex-col apple-glass-card rounded-[28px] border border-white/[0.08] p-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <ListMusic className="w-4 h-4 text-[#FA243C]" />
                        <span className="text-sm font-bold text-white">قائمة التالي ({queue.length})</span>
                      </div>
                      <button
                        onClick={toggleSmartAutoplay}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          smartAutoplay
                            ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-extrabold shadow-md'
                            : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        <span>تشغيل تلقائي ذكي</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 py-2 pe-1">
                      {queue.map((t, idx) => {
                        const isCur = t.id === currentTrack.id;
                        return (
                          <div
                            key={`${t.id}_${idx}`}
                            onClick={() => playTrack(t)}
                            className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors ${
                              isCur ? 'bg-[#FA243C]/20 border border-[#FA243C]/35' : 'hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={t.artworkUrl || '/logo.svg'} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                              <div className="min-w-0 text-start">
                                <h5 className={`text-xs font-bold truncate ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                                  <bdi dir="auto">{t.title}</bdi>
                                </h5>
                                <p className="text-[11px] text-zinc-400 truncate"><bdi dir="auto">{t.artist}</bdi></p>
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

                {/* STAGE D: RELATED */}
                {activeTab === 'related' && (
                  <motion.div
                    key="stage-related"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-y-auto apple-glass-card rounded-[28px] border border-white/[0.08] p-4 space-y-5"
                  >
                    {moreByArtist.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          المزيد من أغاني {currentTrack.artist}:
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {moreByArtist.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => playTrack(t)}
                              className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.05] cursor-pointer transition-colors"
                            >
                              <img src={t.artworkUrl || '/logo.svg'} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                              <div className="min-w-0 text-start">
                                <h5 className="text-xs font-bold text-white truncate"><bdi dir="auto">{t.title}</bdi></h5>
                                <p className="text-[11px] text-zinc-400 truncate"><bdi dir="auto">{t.album || 'Single'}</bdi></p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5 pt-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        أغانٍ مقترحة بنفس النمط:
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {similarTracks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => playTrack(t)}
                            className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.05] cursor-pointer transition-colors"
                          >
                            <img src={t.artworkUrl || '/logo.svg'} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                            <div className="min-w-0 text-start">
                              <h5 className="text-xs font-bold text-white truncate"><bdi dir="auto">{t.title}</bdi></h5>
                              <p className="text-[11px] text-zinc-400 truncate"><bdi dir="auto">{t.artist}</bdi></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 5. Mobile Only Tab Dock Indicator */}
        <div className="lg:hidden flex items-center justify-around pt-2 pb-1 border-t border-white/[0.08] text-xs font-bold flex-shrink-0 select-none">
          <button
            onClick={() => setActiveTab(activeTab === 'player' ? 'lyrics' : 'player')}
            className={`flex items-center gap-2 h-10 px-4 rounded-full transition-all cursor-pointer ${
              activeTab === 'player'
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Disc3 className="w-4 h-4" />
            <span>المشغل</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'lyrics' ? 'player' : 'lyrics')}
            className={`flex items-center gap-2 h-10 px-4 rounded-full transition-all cursor-pointer ${
              activeTab === 'lyrics'
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic2 className="w-4 h-4" />
            <span>الكلمات</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'studio' ? 'player' : 'studio')}
            className={`flex items-center gap-1.5 h-10 px-3.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'studio'
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>3D Studio</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'up_next' ? 'player' : 'up_next')}
            className={`flex items-center gap-2 h-10 px-4 rounded-full transition-all cursor-pointer ${
              activeTab === 'up_next'
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>التالي</span>
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

                  {/* Edit ID3 Metadata */}
                  <button
                    onClick={() => {
                      triggerHaptic();
                      setIsOptionsSheetOpen(false);
                      setMetadataEditorModal(true, currentTrack);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/[0.06] text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Tag className="w-5 h-5 text-[#FA243C]" />
                      <span>تعديل بيانات الأغنية (ID3 Tags)</span>
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
                              ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-extrabold shadow-md'
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
  );
};
