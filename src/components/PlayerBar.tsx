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
  Heart,
  ListMusic,
  Sliders,
  Loader2,
} from 'lucide-react';
import { TimelineSlider } from './player/TimelineSlider';
import { getOptimizedCoverUrl } from '../utils/imageOptimizer';

export const PlayerBar: React.FC = () => {
  const { t, isRTL, dir } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const duration = usePlayerStore((state) => state.duration);
  const volume = usePlayerStore((state) => state.volume);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const favorites = usePlayerStore((state) => state.favorites);
  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen);
  const isRightSidebarOpen = usePlayerStore((state) => state.isRightSidebarOpen);
  const userQueue = usePlayerStore((state) => state.userQueue);
  const isEqualizerOpen = usePlayerStore((state) => state.isEqualizerOpen);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seek = usePlayerStore((state) => state.seek);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);
  const toggleRightSidebar = usePlayerStore((state) => state.toggleRightSidebar);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

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

  const accentColor = '#FA2D48';

  return (
    <footer
      data-testid="player-bar"
      dir={dir}
      className="hidden md:grid grid-cols-[30%_40%_30%] fixed bottom-0 inset-x-0 h-[84px] z-40 bg-[#121215]/90 backdrop-blur-2xl border-t border-white/[0.08] px-6 lg:px-8 items-center select-none"
    >
      {/* ── 1. Track Info (Right Column in RTL - 30%) ── */}
      <div className="flex items-center gap-3 min-w-0 pr-1">
        <div
          onClick={() => setMobilePlayerOpen(true)}
          className="relative w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg overflow-hidden bg-black/60 border border-white/10 shadow-md shrink-0 cursor-pointer group"
        >
          <img
            src={getOptimizedCoverUrl(currentTrack?.coverUrl || currentTrack?.artworkUrl, 'thumb')}
            alt={currentTrack?.title || 'No Track'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h4
            onClick={() => setMobilePlayerOpen(true)}
            className="text-sm font-semibold text-white truncate hover:underline cursor-pointer tracking-tight leading-tight"
            title={currentTrack?.title}
          >
            <bdi dir="auto">{currentTrack?.title || (isRTL ? 'اختر مساراً للتشغيل' : 'Select a track to play')}</bdi>
          </h4>
          <p className="text-xs text-[#8E8E93] truncate hover:underline cursor-pointer font-normal mt-0.5">
            <bdi dir="auto">{currentTrack?.artist || 'AURA.WAV'}</bdi>
          </p>
        </div>

        {currentTrack && (
          <button
            onClick={() => toggleFavorite(currentTrack.id)}
            className="p-2 text-zinc-400 hover:text-[#FA2D48] transition-colors cursor-pointer shrink-0"
            title={isFav ? t.favoriteRemoved : t.favoriteAdded}
            aria-label="Toggle favorite"
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isFav ? 'text-[#FA2D48] fill-[#FA2D48]' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* ── 2. Playback Controls & Scrubber (Center Column - 40%) ── */}
      <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto px-2 gap-1.5 min-w-0">
        {/* Buttons Row */}
        <div className="flex items-center justify-center gap-4">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            title={t.shuffle}
            className={`p-1.5 cursor-pointer apple-btn-tactile ${
              shuffle ? 'text-[#FA2D48]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous Track */}
          <button
            onClick={previousTrack}
            title={t.previous}
            className="p-1.5 text-zinc-300 hover:text-white cursor-pointer apple-btn-tactile apple-prev-btn"
          >
            <SkipBack className="w-4.5 h-4.5 fill-current" />
          </button>

          {/* Clean White Circular Play/Pause Button with Apple Spring Morph */}
          <button
            onClick={togglePlayPause}
            title={isPlaying ? t.pause : t.play}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-md apple-play-btn cursor-pointer shrink-0 overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isPlaying ? 'pause' : 'play'}
                initial={{ opacity: 0, scale: 0.75, rotate: isPlaying ? -15 : 15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.75, rotate: isPlaying ? 15 : -15 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className="flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black text-black" />
                ) : playbackState === 'buffering' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                )}
              </motion.div>
            </AnimatePresence>
          </button>

          {/* Next Track */}
          <button
            onClick={() => nextTrack({ forceImmediate: true })}
            title={t.next}
            className="p-1.5 text-zinc-300 hover:text-white cursor-pointer apple-btn-tactile apple-next-btn"
          >
            <SkipForward className="w-4.5 h-4.5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            title={repeatMode === 'one' ? t.repeatOne : t.repeatAll}
            className={`p-1.5 cursor-pointer apple-btn-tactile ${
              repeatMode !== 'off' ? 'text-[#FA2D48]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Thin Scrubber with Start/End Times in tabular-nums */}
        <div className="w-full">
          <TimelineSlider
            duration={duration}
            onSeek={seek}
            accentColor={accentColor}
            showWaveform={false}
            trackId={currentTrack?.id}
            layout="inline"
            className="w-full"
          />
        </div>
      </div>

      {/* ── 3. Four Clean Tools & Volume (Left Column in RTL - 30%) ── */}
      <div className="flex items-center justify-end gap-2.5 w-full shrink-0 pl-1">
        {/* Tool 1: Synced Lyrics */}
        <button
          data-testid="lyrics-toggle-btn"
          onClick={() => setLyricsOpen(!isLyricsOpen)}
          title={t.syncedLyrics}
          className={`px-2 py-1 rounded-lg cursor-pointer text-[11px] font-bold transition-colors border ${
            isLyricsOpen
              ? 'bg-white/[0.12] text-white border-white/20'
              : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/[0.04]'
          }`}
        >
          <span>LRC</span>
        </button>

        {/* Tool 2: Queue Drawer / Sidebar */}
        <button
          onClick={toggleRightSidebar}
          title={t.queue}
          className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
            isRightSidebarOpen
              ? 'text-[#FA2D48] bg-white/[0.06]'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          {userQueue.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#FA2D48] text-white text-[8px] font-mono font-bold flex items-center justify-center border border-black shadow">
              {userQueue.length}
            </span>
          )}
        </button>

        {/* Tool 3: Equalizer Shortcut (EQ) */}
        <button
          onClick={() => setEqualizerOpen(true)}
          title={t.equalizer}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isEqualizerOpen
              ? 'text-[#FA2D48] bg-white/[0.06]'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Tool 4: Volume Control with Smooth Slider */}
        <div className="flex items-center gap-2 ms-1">
          <button
            onClick={toggleMute}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
            aria-label="Mute toggle"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-zinc-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-zinc-400" />
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
            className="w-20 accent-[#FA2D48] cursor-pointer h-1 bg-white/15 rounded-full"
            aria-label="Volume slider"
          />
        </div>
      </div>
    </footer>
  );
};
