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
  ListMusic,
  Sparkles,
  Compass,
  Moon,
  Trash2,
  Check,
  Zap,
  Gauge,
  Download,
  CheckCircle2
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

  const [activeTab, setActiveTab] = useState<TabType>('player');
  const inlineActiveLineRef = useRef<HTMLParagraphElement | null>(null);

  // Trigger subtle mobile haptic feedback if available
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
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

  const isMobilePlayerOpen = usePlayerStore((state) => state.isMobilePlayerOpen);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
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

  if (!effectiveOpen || !currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const isAutoMixing =
    automixEnabled && duration > 15 && duration - currentTime <= automixDuration;

  const cycleRate = () => {
    const rates = [0.75, 1.0, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.y > 140 || info.velocity.y > 450) {
            handleClose();
          }
        }}
        className="fixed inset-0 z-50 bg-[#07070b] flex flex-col justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] select-none overflow-hidden touch-pan-y"
      >
        {/* Apple Music Drag Handle Pill */}
        <div
          onClick={handleClose}
          className="w-10 h-1.5 rounded-full bg-white/25 hover:bg-white/40 mx-auto mb-2 flex-shrink-0 cursor-pointer transition-colors"
        />

        {/* Dynamic Hardware-Accelerated Ambient Radial Mesh (Zero GPU stall on iOS) */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none transition-all duration-700 opacity-35"
          style={{
            background: `radial-gradient(circle at 50% 25%, ${currentTrack.dominantColor || '#6366f1'} 0%, transparent 60%), radial-gradient(circle at 80% 75%, ${currentTrack.secondaryColor || '#a855f7'} 0%, transparent 55%), #07070b`,
            transform: 'translateZ(0)',
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#07070b]/50 via-[#07070b]/85 to-[#07070b] pointer-events-none" />

        {/* 1. Top Header Bar */}
        <div className="flex items-center justify-between pt-1 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleClose}
            className="w-10 h-10 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.button>

          <div className="text-center">
            <span className="text-[10px] font-mono tracking-widest text-[#FA243C] uppercase font-extrabold">
              APPLE MUSIC EDITION
            </span>
            <h5 className="text-xs text-zinc-400 font-medium truncate max-w-[180px] sm:max-w-xs">
              {currentTrack.album || 'Single'}
            </h5>
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setSleepTimerOpen(true)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
                sleepTimerRemaining !== null
                  ? 'bg-[#FA243C] text-white shadow-lg shadow-[#FA243C]/30'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300'
              }`}
              title="مؤقت النوم"
            >
              <Moon className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setEqualizerOpen(true)}
              className="w-10 h-10 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-[#FF2D55] flex items-center justify-center transition-colors cursor-pointer"
              title="المعادل الصوتي"
            >
              <Sliders className="w-4 h-4" />
            </motion.button>
          </div>
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
                className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.85)] border border-white/[0.12] group cursor-grab active:cursor-grabbing touch-pan-y"
              >
                <img
                  src={currentTrack.artworkUrl || '/logo.svg'}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isPlaying ? 'scale-105' : 'scale-100'
                  }`}
                />

                {isAutoMixing && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#FA243C]/90 backdrop-blur-md text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AutoMix جارٍ</span>
                  </div>
                )}
                {/* Change Artwork Overlay Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChangeArtworkModal(true, currentTrack);
                  }}
                  title="تغيير الغلاف والبحث أونلاين"
                  className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF456E]" />
                  <span>تغيير الغلاف 🎨</span>
                </button>
              </motion.div>

              {/* Real-time Current Lyric Line Snippet */}
              {lyrics.length > 0 && activeLyricIndex >= 0 && (
                <p
                  dir="auto"
                  onClick={() => setActiveTab('lyrics')}
                  className="text-xs sm:text-sm text-[#FF456E] font-semibold text-center mt-4 px-4 py-1.5 rounded-full bg-[#FA243C]/10 border border-[#FA243C]/25 max-w-sm truncate cursor-pointer hover:bg-[#FA243C]/20 transition-colors animate-fadeIn"
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
                  <ListMusic className="w-4 h-4 text-[#FA243C]" />
                  <span className="text-sm font-bold text-white">قائمة التالي ({queue.length})</span>
                </div>

                {/* Smart Autoplay Toggle */}
                <button
                  onClick={toggleSmartAutoplay}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    smartAutoplay
                      ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
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
              {/* Apple Music Style Hi-Res Lossless & Spatial Audio Badge */}
              <div className="flex items-center gap-2 mt-1.5">
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
                  <span className={spatialAudio ? 'text-[#FF456E] font-extrabold' : ''}>
                    {spatialAudio ? 'Spatial Audio 3D 🎧 (مُفعل)' : 'Spatial Audio'}
                  </span>
                </motion.button>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Playback Rate Button */}
              <button
                onClick={cycleRate}
                className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono font-bold text-zinc-300 transition-colors cursor-pointer"
                title="سرعة التشغيل"
              >
                {playbackRate}x
              </button>

              {/* Offline Download Button */}
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => downloadTrackForOffline(currentTrack.id)}
                className="p-2 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                title={downloadedTrackIds.includes(currentTrack.id) ? 'محفوظ أوفلاين ⚡' : 'حفظ للتشغيل بدون إنترنت'}
              >
                {downloadedTrackIds.includes(currentTrack.id) ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Download className="w-6 h-6 text-zinc-400 hover:text-white" />
                )}
              </motion.button>

              {/* Favorite Heart */}
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => toggleFavorite(currentTrack.id)}
                className="p-2 text-zinc-400 hover:text-[#FA243C] transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-6 h-6 transition-colors ${
                    isFav ? 'text-[#FA243C] fill-[#FA243C]' : 'text-zinc-500'
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
          />
        </div>

        {/* 4. Main Playback Controls */}
        <div className="flex items-center justify-between px-2 my-2 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={toggleShuffle}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              shuffle ? 'text-[#FA243C] bg-[#FA243C]/15' : 'text-zinc-500'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={previousTrack}
            className="p-2.5 text-white hover:text-[#FF456E] transition-colors cursor-pointer"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlayPause}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-black" />
            ) : (
              <Play className="w-7 h-7 fill-black translate-x-0.5" />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => nextTrack(false)}
            className="p-2.5 text-white hover:text-[#FF456E] transition-colors cursor-pointer"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              repeatMode !== 'off' ? 'text-[#FA243C] bg-[#FA243C]/15' : 'text-zinc-500'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* 5. Apple Music 3 Tabs Selector */}
        <div className="flex items-center justify-around pt-2 pb-1 border-t border-white/[0.08] text-xs font-bold flex-shrink-0 select-none">
          <button
            onClick={() => setActiveTab(activeTab === 'up_next' ? 'player' : 'up_next')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'up_next'
                ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>التالي (Up Next)</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'lyrics' ? 'player' : 'lyrics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'lyrics'
                ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic2 className="w-4 h-4" />
            <span>الكلمات (Lyrics)</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'related' ? 'player' : 'related')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'related'
                ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>مشابهة (Related)</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
