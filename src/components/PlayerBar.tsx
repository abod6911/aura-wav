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

  const isFav = currentTrack ? favorites.includes(currentTrack.id) : false;

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
        className="hidden md:flex fixed bottom-0 left-0 right-0 h-22 z-40 bg-[#0d0d14]/92 backdrop-blur-3xl px-4 sm:px-6 items-center justify-between border-t border-white/[0.12] select-none shadow-[0_-12px_40px_rgba(0,0,0,0.85)]"
      >
        {/* 1. Track Info (Left) */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-0">
          <div
            onClick={() => setMobilePlayerOpen(true)}
            className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-lg flex-shrink-0 group cursor-pointer"
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
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </AnimatePresence>
          </div>

          <div className="min-w-0 flex-1">
            <h4
              onClick={() => setMobilePlayerOpen(true)}
              className="text-sm font-bold text-white truncate hover:underline cursor-pointer tracking-tight"
              title={currentTrack?.title}
            >
              {currentTrack?.title || (isRTL ? 'اختر أغنية للتشغيل' : 'Select a track to play')}
            </h4>
            <p className="text-xs text-zinc-400 truncate mt-0.5 hover:underline cursor-pointer">
              {currentTrack?.artist || 'AURA.WAV'}
            </p>
          </div>

          {currentTrack && (
            <button
              onClick={() => toggleFavorite(currentTrack.id)}
              className="p-2 text-zinc-400 hover:text-[#FA243C] transition-colors cursor-pointer"
              title={isFav ? t.favoriteRemoved : t.favoriteAdded}
            >
              <Heart
                className={`w-4 h-4 transition-transform active:scale-125 ${
                  isFav ? 'text-[#FA243C] fill-[#FA243C]' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* 2. Main Playback Controls & Scrubber (Center) */}
        <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
          {/* Controls Row */}
          <div className="flex items-center gap-5">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              title={t.shuffle}
              className={`p-1.5 transition-colors cursor-pointer ${
                shuffle ? 'text-[#FA243C]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={previousTrack}
              title={t.previous}
              className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-90"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play/Pause Button (Apple Music Style High Contrast) */}
            <button
              onClick={togglePlayPause}
              title={isPlaying ? t.pause : t.play}
              className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_4px_20px_rgba(250,36,60,0.3)] cursor-pointer"
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
              className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-90"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              title={repeatMode === 'one' ? t.repeatOne : t.repeatAll}
              className={`p-1.5 transition-colors cursor-pointer relative ${
                repeatMode !== 'off' ? 'text-[#FA243C]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Minimal Scrubber */}
          <TimelineSlider
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
            accentColor={accentColor}
            className="w-full"
          />
        </div>

        {/* 3. Utility Tools & Volume (Right) */}
        <div className="flex items-center justify-end gap-2 w-1/4">
          {/* Synced Lyrics Toggle */}
          <button
            onClick={() => setLyricsOpen(!isLyricsOpen)}
            title={t.syncedLyrics}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLyricsOpen ? 'text-[#FA243C] bg-white/[0.08]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic2 className="w-4.5 h-4.5" />
          </button>

          {/* Equalizer Quick Modal */}
          <button
            onClick={() => setIsAudioSettingsOpen(true)}
            title={t.equalizer}
            className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4.5 h-4.5 text-red-400" />
              ) : (
                <Volume2 className="w-4.5 h-4.5" />
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
              className="w-20 accent-[#FA243C] cursor-pointer"
            />
          </div>

          {/* Full Screen Sheet Expand */}
          <button
            onClick={() => setMobilePlayerOpen(true)}
            title={isRTL ? 'تكبير المشغل' : 'Expand Player'}
            className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
