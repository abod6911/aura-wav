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

export const PlayerBar: React.FC = () => {
  const { t, isRTL } = useTranslation();
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
        dir="ltr"
        style={{
          boxShadow: `0 24px 60px rgba(0,0,0,0.9), 0 0 50px -10px ${accentColor}35, inset 0 1px 1px rgba(255,255,255,0.22)`,
        }}
        className="hidden md:flex fixed bottom-3 inset-x-4 sm:bottom-4 sm:inset-x-8 max-w-7xl mx-auto h-[86px] z-40 bg-[#0d0d15]/85 backdrop-blur-3xl px-6 sm:px-8 items-center justify-between border border-white/[0.14] rounded-[28px] select-none transition-shadow duration-500"
      >
        {/* 1. Track Info (Left) */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-0">
          <div
            onClick={() => setMobilePlayerOpen(true)}
            className={`relative w-14 h-14 rounded-[18px] overflow-hidden bg-black/60 border border-white/15 shadow-xl flex-shrink-0 group cursor-pointer transition-transform ${
              isPlaying ? 'ring-2 ring-[#FA243C]/50 shadow-[#FA243C]/30' : ''
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentTrack?.id || 'none'}
                src={currentTrack?.coverUrl || currentTrack?.artworkUrl || '/logo.svg'}
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
                className="text-sm font-black text-white truncate hover:underline cursor-pointer tracking-tight"
                title={currentTrack?.title}
              >
                {currentTrack?.title || (isRTL ? 'اختر أغنية للتشغيل' : 'Select a track to play')}
              </h4>
              <span className="apple-badge text-[8px] bg-white/[0.08] text-white/80 shrink-0">
                LOSSLESS
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-zinc-400 truncate hover:underline cursor-pointer font-medium">
                {currentTrack?.artist || 'AURA.WAV'}
              </p>
              {isDownloaded && (
                <span
                  className="apple-badge text-[8px] bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shrink-0"
                  title="محفوظة أوفلاين للأبد"
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
              className="p-2 text-zinc-400 hover:text-[#FA243C] transition-colors cursor-pointer apple-spring"
              title={isFav ? t.favoriteRemoved : t.favoriteAdded}
            >
              <Heart
                className={`w-4.5 h-4.5 transition-transform active:scale-125 ${
                  isFav ? 'text-[#FA243C] fill-[#FA243C] drop-shadow-[0_0_8px_rgba(250,36,60,0.6)]' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* 2. Main Playback Controls & Scrubber (Center) */}
        <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
          {/* Controls Row */}
          <div className="flex items-center gap-5">
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
              className="p-1.5 text-zinc-300 hover:text-white apple-spring cursor-pointer"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Apple Play/Pause Statement Button */}
            <button
              onClick={togglePlayPause}
              title={isPlaying ? t.pause : t.play}
              className="hi-fi-play-button w-12 h-12 rounded-full text-black flex items-center justify-center apple-spring shadow-[0_4px_24px_rgba(250,36,60,0.35)] cursor-pointer"
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
              className="p-1.5 text-zinc-300 hover:text-white apple-spring cursor-pointer"
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

          {/* Minimal or Waveform Scrubber */}
          <TimelineSlider
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
            accentColor={accentColor}
            showWaveform={showWaveformScrubber}
            trackId={currentTrack?.id}
            className="w-full"
          />
        </div>

        {/* 3. Utility Tools & Volume (Right) */}
        <div className="flex items-center justify-end gap-2.5 w-1/4">
          {/* Spatial Audio Quick Pill (Apple Music Spatial Style) */}
          <button
            onClick={cycleSpatialMode}
            title={`الصوت المكاني: ${spatialMode.toUpperCase()}`}
            className={`px-3 py-1.5 rounded-full text-xs font-black apple-spring cursor-pointer flex items-center gap-1.5 ${
              spatialMode !== 'off'
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-lg shadow-[#FA243C]/30 border border-white/20'
                : 'apple-glass-pill text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="tracking-wider text-[11px]">{spatialMode === 'off' ? 'SPATIAL' : spatialMode.toUpperCase()}</span>
          </button>

          {/* Karaoke Mode Quick Toggle (Apple Music Sing Style) */}
          <button
            onClick={() => setKaraokeMode(!karaokeMode)}
            title={karaokeMode ? 'إيقاف وضع Apple Sing' : 'تفعيل وضع Apple Sing وعزل صوت المغني'}
            className={`p-2 rounded-xl apple-spring cursor-pointer ${
              karaokeMode
                ? 'bg-[#FA243C]/20 text-[#FA243C] border border-[#FA243C]/40 shadow-lg shadow-[#FA243C]/30 ring-1 ring-[#FA243C]/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Mic2 className="w-4.5 h-4.5" />
          </button>

          {/* Synced Lyrics Toggle */}
          <button
            onClick={() => setLyricsOpen(!isLyricsOpen)}
            title={t.syncedLyrics}
            className={`px-2.5 py-1.5 rounded-xl apple-spring cursor-pointer text-xs font-bold ${
              isLyricsOpen ? 'bg-white/[0.12] text-white border border-white/15' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>LYRICS</span>
          </button>

          {/* Equalizer Quick Modal */}
          <button
            onClick={() => setIsAudioSettingsOpen(true)}
            title={t.equalizer}
            className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer hover:bg-white/[0.05] rounded-xl"
          >
            <Sliders className="w-4.5 h-4.5" />
          </button>

          {/* Right Sidebar Queue Toggle */}
          <button
            onClick={toggleRightSidebar}
            title={t.queue}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isRightSidebarOpen ? 'text-[#FA243C] bg-white/[0.08]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4.5 h-4.5" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
              className="w-18 accent-[#FA243C] cursor-pointer"
            />
          </div>

          {/* Full Screen Sheet Expand */}
          <button
            onClick={() => setMobilePlayerOpen(true)}
            title={isRTL ? 'تكبير المشغل' : 'Expand Player'}
            className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer hover:bg-white/[0.05] rounded-xl"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {isAudioSettingsOpen && (
        <AudioSettingsModal isOpen={isAudioSettingsOpen} onClose={() => setIsAudioSettingsOpen(false)} />
      )}
    </>
  );
};
