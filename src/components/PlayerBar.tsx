import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Maximize2,
  Heart,
  ListMusic,
  Mic2,
  Sliders,
  Loader2,
  CheckCircle2,
  Activity,
  Sparkles,
} from 'lucide-react';
import { TimelineSlider } from './player/TimelineSlider';
import { AudioSettingsModal } from './AudioSettingsModal';
import { getOptimizedCoverUrl } from '../utils/imageOptimizer';
import { AuraProDspHud } from './player/AuraProDspHud';
import { HarmonicSetGenerator } from './player/HarmonicSetGenerator';

export const PlayerBar: React.FC = () => {
  const { t, isRTL, dir } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const volume = usePlayerStore((state) => state.volume);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const favorites = usePlayerStore((state) => state.favorites);
  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen);
  const isRightSidebarOpen = usePlayerStore((state) => state.isRightSidebarOpen);
  const spatialMode = usePlayerStore((state) => state.spatialMode);
  const setSpatialMode = usePlayerStore((state) => state.setSpatialMode);
  const karaokeMode = usePlayerStore((state) => state.karaokeMode);
  const setKaraokeMode = usePlayerStore((state) => state.setKaraokeMode);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seek = usePlayerStore((state) => state.seek);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
  const toggleRightSidebar = usePlayerStore((state) => state.toggleRightSidebar);

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [showWaveformScrubber, setShowWaveformScrubber] = useState(false);
  const [showDspHud, setShowDspHud] = useState(false);

  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const isFav = currentTrack ? favorites.includes(currentTrack.id) : false;
  const isDownloaded = currentTrack ? downloadedTrackIds.includes(currentTrack.id) : false;

  const cycleSpatialMode = () => {
    const modes: Array<'off' | 'concert' | 'studio' | 'club' | '8d'> = ['off', 'concert', 'studio', 'club', '8d'];
    const nextIdx = (modes.indexOf(spatialMode) + 1) % modes.length;
    setSpatialMode(modes[nextIdx]);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume || 0.8);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const accentColor = currentTrack?.dominantColor || currentTrack?.accentColor || '#FA243C';

  return (
    <>
      <footer
        data-testid="player-bar"
        dir={dir}
        style={{
          boxShadow: `0 24px 64px rgba(0,0,0,0.9), 0 0 50px -10px ${accentColor}35, inset 0 1px 1px rgba(255,255,255,0.22)`,
        }}
        className="hidden md:grid grid-cols-[240px_1fr_260px] lg:grid-cols-[280px_1fr_290px] fixed bottom-3 inset-x-4 sm:bottom-4 sm:inset-x-8 max-w-7xl mx-auto h-[88px] z-40 bg-[#0c0c14]/90 backdrop-blur-3xl px-5 sm:px-7 items-center border border-white/[0.14] rounded-[34px] select-none transition-shadow duration-500 apple-glass-dock overflow-hidden"
      >
        {/* 1. Track Info (Start Column) */}
        <div className="flex items-center gap-3.5 min-w-0 w-full justify-self-start pr-1">
          <div
            onClick={() => setMobilePlayerOpen(true)}
            className={`relative w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl overflow-hidden bg-black/60 border border-white/15 shadow-xl shrink-0 group cursor-pointer transition-transform ${
              isPlaying ? 'ring-2 ring-[#FA243C]/50 shadow-[#FA243C]/30' : ''
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentTrack?.id || 'none'}
                src={getOptimizedCoverUrl(currentTrack?.coverUrl || currentTrack?.artworkUrl, 'thumb')}
                alt={currentTrack?.title || 'No Track'}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                  isPlaying ? 'animate-[pulse_4s_ease-in-out_infinite]' : ''
                }`}
              />
            </AnimatePresence>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4
                onClick={() => setMobilePlayerOpen(true)}
                className="text-sm font-black text-white truncate hover:underline cursor-pointer tracking-tight leading-normal"
                title={currentTrack?.title}
              >
                <bdi dir="auto">{currentTrack?.title || (isRTL ? 'اختر أغنية للتشغيل' : 'Select a track to play')}</bdi>
              </h4>
              <span className="apple-badge text-[8px] bg-white/[0.08] text-white/80 shrink-0">
                LOSSLESS
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-white/65 truncate hover:underline cursor-pointer font-medium">
                <bdi dir="auto">{currentTrack?.artist || 'AURA.WAV'}</bdi>
              </p>
              {isDownloaded && (
                <span
                  className="apple-badge text-[8px] bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shrink-0"
                  title={isRTL ? 'محفوظة أوفلاين للأبد' : 'Offline ready'}
                >
                  <CheckCircle2 className="w-2 h-2" />
                  <span>OFFLINE</span>
                </span>
              )}
            </div>
          </div>

          {currentTrack && (
            <button
              onClick={() => toggleFavorite(currentTrack.id)}
              className="p-1.5 text-white/60 hover:text-[#FA243C] transition-colors cursor-pointer apple-spring shrink-0"
              title={isFav ? t.favoriteRemoved : t.favoriteAdded}
              aria-label="Toggle favorite"
            >
              <Heart
                className={`w-4.5 h-4.5 transition-transform active:scale-125 ${
                  isFav ? 'text-[#FA243C] fill-[#FA243C] drop-shadow-[0_0_8px_rgba(250,36,60,0.6)]' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* 2. Main Playback Controls & Scrubber (Center Column - Mathematically Centered) */}
        <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto px-2 justify-self-center min-w-0 gap-1">
          {/* Controls Row */}
          <div className="flex items-center justify-center gap-3.5 sm:gap-4.5">
            {/* Waveform Toggle */}
            <button
              onClick={() => setShowWaveformScrubber(!showWaveformScrubber)}
              title={showWaveformScrubber ? 'العودة للشريط الكلاسيكي' : 'عرض الموجة الصوتية التفاعلية'}
              className={`p-1.5 rounded-xl apple-spring cursor-pointer ${
                showWaveformScrubber ? 'text-[#FA243C] bg-white/[0.1] border border-white/10' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              title={t.shuffle}
              className={`p-1.5 apple-spring cursor-pointer ${
                shuffle ? 'text-[#FA243C]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={previousTrack}
              title={t.previous}
              className="p-1.5 text-zinc-300 hover:text-white apple-spring cursor-pointer active:scale-90"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Apple Play/Pause Statement Button */}
            <button
              onClick={togglePlayPause}
              title={isPlaying ? t.pause : t.play}
              className="hi-fi-play-button w-11 h-11 sm:w-12 sm:h-12 rounded-full text-black flex items-center justify-center apple-spring shadow-[0_4px_20px_rgba(250,36,60,0.35)] hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black text-black" />
              ) : playbackState === 'buffering' ? (
                <Loader2 className="w-5 h-5 animate-spin text-black" />
              ) : (
                <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={() => nextTrack({ forceImmediate: true })}
              title={t.next}
              className="p-1.5 text-zinc-300 hover:text-white apple-spring cursor-pointer active:scale-90"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              title={repeatMode === 'one' ? t.repeatOne : t.repeatAll}
              className={`p-1.5 apple-spring cursor-pointer relative ${
                repeatMode !== 'off' ? 'text-[#FA243C]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Compact Inline Scrubber with left/right timestamps */}
          <TimelineSlider
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
            accentColor={accentColor}
            showWaveform={showWaveformScrubber}
            trackId={currentTrack?.id}
            layout="inline"
            className="w-full"
          />
        </div>

        {/* 3. Utility Tools & Volume (End Column) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full justify-self-end shrink-0 pl-1">
          {/* Spatial Audio Quick Pill */}
          <button
            onClick={cycleSpatialMode}
            title={`الصوت المكاني: ${spatialMode.toUpperCase()}`}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black apple-spring cursor-pointer flex items-center gap-1 border transition-all ${
              spatialMode !== 'off'
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/30 border-white/20'
                : 'apple-glass-pill text-zinc-400 hover:text-white border-white/10'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span className="tracking-wider">{spatialMode === 'off' ? '3D' : spatialMode.toUpperCase()}</span>
          </button>

          {/* Karaoke Mode Quick Toggle */}
          <button
            onClick={() => setKaraokeMode(!karaokeMode)}
            title={karaokeMode ? 'إيقاف وضع Apple Sing' : 'تفعيل وضع Apple Sing وعزل صوت المغني'}
            className={`p-1.5 sm:p-2 rounded-xl apple-spring cursor-pointer transition-all ${
              karaokeMode
                ? 'bg-[#FA243C]/20 text-[#FA243C] border border-[#FA243C]/40 shadow-md shadow-[#FA243C]/30 ring-1 ring-[#FA243C]/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Synced Lyrics Toggle */}
          <button
            data-testid="lyrics-toggle-btn"
            onClick={() => setLyricsOpen(!isLyricsOpen)}
            title={t.syncedLyrics}
            className={`px-2 py-1 rounded-xl apple-spring cursor-pointer text-[11px] font-black border transition-all ${
              isLyricsOpen 
                ? 'bg-white/[0.16] text-white border-white/25 shadow-sm' 
                : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/[0.06]'
            }`}
          >
            <span>LRC</span>
          </button>

          {/* AURA Pro DSP & DJ Live HUD Toggle */}
          <button
            onClick={() => setShowDspHud(!showDspHud)}
            title="AURA Pro DSP & DJ Live HUD"
            className={`p-1.5 sm:p-2 rounded-xl apple-spring cursor-pointer transition-all ${
              showDspHud
                ? 'bg-gradient-to-r from-red-500/30 to-purple-500/30 text-white border border-white/20 shadow-md shadow-purple-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-400" />
          </button>

          {/* Equalizer Quick Modal */}
          <button
            onClick={() => setIsAudioSettingsOpen(true)}
            title={t.equalizer}
            className="p-1.5 sm:p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer hover:bg-white/[0.05] rounded-xl"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Right Sidebar Queue Toggle */}
          <button
            onClick={toggleRightSidebar}
            title={t.queue}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
              isRightSidebarOpen ? 'text-[#FA243C] bg-white/[0.08]' : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 ms-0.5">
            <button
              onClick={toggleMute}
              className="text-white/60 hover:text-white transition-colors cursor-pointer p-1"
              aria-label="Mute toggle"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (isMuted && val > 0) setIsMuted(false);
              }}
              className="w-16 sm:w-20 accent-[#FA243C] cursor-pointer h-1.5 bg-white/20 rounded-full"
              aria-label="Volume slider"
            />
          </div>

          {/* Full Screen Sheet Expand */}
          <button
            onClick={() => setMobilePlayerOpen(true)}
            title={isRTL ? 'تكبير المشغل' : 'Expand Player'}
            className="p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer hover:bg-white/[0.08] rounded-xl"
            aria-label="Expand player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Floating Aura Pro DSP & DJ Live HUD */}
      <AnimatePresence>
        {showDspHud && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="hidden md:block fixed bottom-28 inset-x-8 max-w-5xl mx-auto z-40"
          >
            <AuraProDspHud />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Harmonic Journey Modal */}
      <HarmonicSetGenerator />

      {isAudioSettingsOpen && (
        <AudioSettingsModal isOpen={isAudioSettingsOpen} onClose={() => setIsAudioSettingsOpen(false)} />
      )}
    </>
  );
};
