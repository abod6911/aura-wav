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
  ListMusic,
  Sliders,
  Loader2,
} from 'lucide-react';
import { TimelineSlider } from './player/TimelineSlider';
import { getOptimizedCoverUrl } from '../utils/imageOptimizer';
import { isArabicText } from '../utils/formatters';
import { SmartSaveButton } from './common/SmartSaveButton';
import { PlayingEqualizer } from './common/PlayingEqualizer';
import { LUXURY_SPRING, PLAY_ICON_SPRING, ARTWORK_CROSSFADE_TRANSITION } from '../utils/motion';

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
  const openArtist = usePlayerStore((state) => state.openArtist);
  const openAlbum = usePlayerStore((state) => state.openAlbum);

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

  const accentColor = '#1DB954';

  return (
    <footer
      data-testid="player-bar"
      dir={dir}
      className="hidden md:grid grid-cols-[30%_40%_30%] fixed bottom-0 inset-x-0 h-[84px] z-40 bg-[#121212]/[0.96] backdrop-blur-md border-t border-white/[0.08] px-6 lg:px-8 items-center select-none"
    >
      {/* ── 1. Track Info (Right Column in RTL - 30%) ── */}
      <div className="flex items-center gap-3 min-w-0 pr-1">
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          transition={LUXURY_SPRING}
          onClick={() => setMobilePlayerOpen(true)}
          className="relative w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg overflow-hidden bg-black/60 border border-white/10 shadow-md shrink-0 cursor-pointer group"
        >
          <motion.img
            key={currentTrack?.id || 'no-track'}
            src={getOptimizedCoverUrl(currentTrack?.coverUrl || currentTrack?.artworkUrl, 'thumb')}
            alt={currentTrack?.title || 'No Track'}
            initial={{ opacity: 0.65, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={ARTWORK_CROSSFADE_TRANSITION}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {currentTrack && isPlaying && (
            <div className="absolute inset-0 bg-black/35 flex items-end justify-end p-1 pointer-events-none">
              <PlayingEqualizer isPlaying={isPlaying} size="xs" />
            </div>
          )}
        </motion.div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <motion.div
            key={currentTrack?.id || 'empty-title'}
            initial={{ opacity: 0.65, x: isRTL ? -8 : 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={ARTWORK_CROSSFADE_TRANSITION}
          >
            <h4
              onClick={() => setMobilePlayerOpen(true)}
              className="text-sm font-semibold text-white truncate hover:underline cursor-pointer tracking-tight leading-tight"
              title={currentTrack?.title}
            >
              <span
                dir={isArabicText(currentTrack?.title) ? 'rtl' : 'ltr'}
                className={`block truncate ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {currentTrack?.title || (isRTL ? 'اختر مساراً للتشغيل' : 'Select a track to play')}
              </span>
            </h4>
            <p
              onClick={() => {
                if (currentTrack?.artist) openArtist(currentTrack.artist);
              }}
              className="text-xs text-[#B3B3B3] hover:text-white truncate hover:underline cursor-pointer font-normal mt-0.5 transition-colors"
            >
              <span
                dir={isArabicText(currentTrack?.artist) ? 'rtl' : 'ltr'}
                className={`block truncate ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {currentTrack?.artist || 'AURA.WAV'}
              </span>
            </p>
          </motion.div>
        </div>

        {currentTrack && (
          <SmartSaveButton track={currentTrack} size="sm" />
        )}
      </div>

      {/* ── 2. Playback Controls & Scrubber (Center Column - 40%) ── */}
      <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto px-2 gap-1.5 min-w-0">
        {/* Buttons Row */}
        <div className="flex items-center justify-center gap-3">
          {/* Shuffle */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.86 }}
            transition={LUXURY_SPRING}
            onClick={toggleShuffle}
            title={t.shuffle}
            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors border ${
              shuffle
                ? 'bg-[#1DB954]/14 border-[#1DB954]/30 text-[#1DB954] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.1]'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </motion.button>

          {/* Previous Track */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.85, x: isRTL ? 2 : -2 }}
            transition={LUXURY_SPRING}
            onClick={previousTrack}
            title={t.previous}
            className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.1] cursor-pointer transition-colors"
          >
            <SkipBack className="w-4.5 h-4.5 fill-current" />
          </motion.button>

          {/* Clean Porcelain Circular Play/Pause Button with Spring Morph */}
          <motion.button
            type="button"
            data-testid="playerbar-play-pause-btn"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.91 }}
            transition={PLAY_ICON_SPRING}
            onClick={togglePlayPause}
            title={isPlaying ? t.pause : t.play}
            aria-label={isPlaying ? t.pause : t.play}
            className="w-10 h-10 rounded-full hi-fi-play-button text-black flex items-center justify-center cursor-pointer shrink-0 overflow-hidden"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isPlaying ? 'pause' : playbackState === 'buffering' ? 'buf' : 'play'}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={PLAY_ICON_SPRING}
                className="flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black text-black" />
                ) : playbackState === 'buffering' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {/* Next Track */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.85, x: isRTL ? -2 : 2 }}
            transition={LUXURY_SPRING}
            onClick={() => nextTrack({ forceImmediate: true })}
            title={t.next}
            className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.1] cursor-pointer transition-colors"
          >
            <SkipForward className="w-4.5 h-4.5 fill-current" />
          </motion.button>

          {/* Repeat */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.86 }}
            transition={LUXURY_SPRING}
            onClick={cycleRepeat}
            title={repeatMode === 'one' ? t.repeatOne : t.repeatAll}
            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors border ${
              repeatMode !== 'off'
                ? 'bg-[#1DB954]/14 border-[#1DB954]/30 text-[#1DB954] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.1]'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </motion.button>
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
      <div className="flex items-center justify-end gap-2 w-full shrink-0 pl-1">
        {/* Tool 1: Synced Lyrics */}
        <motion.button
          type="button"
          data-testid="lyrics-toggle-btn"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          transition={LUXURY_SPRING}
          onClick={() => setLyricsOpen(!isLyricsOpen)}
          title={t.syncedLyrics}
          className={`px-2.5 py-1 rounded-full cursor-pointer text-[11px] font-bold transition-colors border ${
            isLyricsOpen
              ? 'bg-[#1DB954]/15 text-[#1DB954] border-[#1DB954]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.09]'
          }`}
        >
          <span>LRC</span>
        </motion.button>

        {/* Tool 2: Queue Drawer / Sidebar */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={LUXURY_SPRING}
          onClick={toggleRightSidebar}
          title={t.queue}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer relative border ${
            isRightSidebarOpen
              ? 'text-[#1DB954] bg-[#1DB954]/14 border-[#1DB954]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.09]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          {userQueue.length > 0 && (
            <motion.span
              key={userQueue.length}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={PLAY_ICON_SPRING}
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#1DB954] text-black text-[8px] font-mono font-bold flex items-center justify-center border border-black shadow"
            >
              {userQueue.length}
            </motion.span>
          )}
        </motion.button>

        {/* Tool 3: Equalizer Shortcut (EQ) */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={LUXURY_SPRING}
          onClick={() => setEqualizerOpen(true)}
          title={t.equalizer}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
            isEqualizerOpen
              ? 'text-[#1DB954] bg-[#1DB954]/14 border-[#1DB954]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.09]'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </motion.button>

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
            className="w-20 accent-[#1DB954] cursor-pointer h-1 bg-white/15 rounded-full"
            aria-label="Volume slider"
          />
        </div>
      </div>
    </footer>
  );
};
