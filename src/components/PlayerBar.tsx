import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TimelineSlider } from './player/TimelineSlider';
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
  Mic2,
  Sliders,
  ListMusic,
  Heart,
  Sparkles,
  Moon,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const PlayerBar: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const volume = usePlayerStore((state) => state.volume);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seek = usePlayerStore((state) => state.seek);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setPlaybackRate = usePlayerStore((state) => state.setPlaybackRate);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);

  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);

  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);
  const isEqualizerOpen = usePlayerStore((state) => state.isEqualizerOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const isQueueOpen = usePlayerStore((state) => state.isQueueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const isSleepTimerOpen = usePlayerStore((state) => state.isSleepTimerOpen);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining);

  const isFav = currentTrack ? favorites.includes(currentTrack.id) : false;
  const isCrossfadingSoon =
    automixEnabled && duration > 15 && duration - currentTime <= automixDuration;

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1.0, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
  };

  return (
    <footer
      dir="ltr"
      className="hidden md:flex fixed bottom-0 left-0 right-0 h-24 z-40 bg-[#0a0a0f]/90 backdrop-blur-3xl px-6 items-center justify-between border-t border-white/[0.08] select-none shadow-[0_-8px_32px_rgba(0,0,0,0.6)]"
    >
      {/* 1. Track Info (Left) */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-0">
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-lg flex-shrink-0 group">
          <img
            src={currentTrack?.artworkUrl || '/logo.svg'}
            alt={currentTrack?.title || 'No Track'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-white truncate tracking-tight">
            {currentTrack?.title || 'Select a track'}
          </h4>
          <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
            {currentTrack?.artist || 'AURA.WAV'}
          </p>
          {currentTrack && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/[0.08] text-zinc-300 border border-white/10 tracking-wider uppercase font-mono">
                Lossless
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 tracking-wider uppercase font-mono">
                Spatial
              </span>
            </div>
          )}
        </div>

        {currentTrack && (
          <button
            onClick={() => toggleFavorite(currentTrack.id)}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors"
            aria-label="Favorite"
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isFav ? 'text-red-500 fill-red-500' : 'text-zinc-500'
              }`}
            />
          </button>
        )}
      </div>

      {/* 2. Main Playback Controls & Bulletproof Scrubber (Center) */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
        {/* Buttons Row */}
        <div className="flex items-center gap-5">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            title="خلط الأغاني"
            className={`p-2 rounded-full transition-colors ${
              shuffle ? 'text-indigo-400 bg-indigo-500/15' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous */}
          <button
            onClick={previousTrack}
            title="السابق"
            className="p-2 rounded-full text-white/90 hover:text-white hover:scale-110 active:scale-95 transition-all"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Large Hero Play/Pause Button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={togglePlayPause}
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.3)] relative group cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black translate-x-0.5" />
            )}
          </motion.button>

          {/* Next */}
          <button
            onClick={() => nextTrack(false)}
            title="التالي"
            className="p-2 rounded-full text-white/90 hover:text-white hover:scale-110 active:scale-95 transition-all"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            title="تكرار"
            className={`p-2 rounded-full transition-colors ${
              repeatMode !== 'off'
                ? 'text-indigo-400 bg-indigo-500/15'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>

          {/* AutoMix Pill Status */}
          {automixEnabled && (
            <div
              title={`AutoMix نشط (${automixDuration}s Crossfade)`}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                isCrossfadingSoon
                  ? 'bg-purple-600/30 text-purple-200 border-purple-400 animate-pulse'
                  : 'bg-white/[0.04] text-purple-400 border-purple-500/30'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>AUTOMIX</span>
            </div>
          )}
        </div>

        {/* Bulletproof Timeline Slider */}
        <TimelineSlider
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          showTimestamps={true}
        />
      </div>

      {/* 3. Utility Actions & Volume (Right) */}
      <div className="flex items-center justify-end gap-3 w-1/4">
        {/* Playback Speed */}
        <button
          onClick={cyclePlaybackRate}
          title="سرعة التشغيل"
          className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          {playbackRate}x
        </button>

        {/* Synced Lyrics Toggle */}
        <button
          onClick={() => setLyricsOpen(!isLyricsOpen)}
          title="الكلمات المتزامنة"
          className={`p-2 rounded-xl transition-all ${
            isLyricsOpen
              ? 'bg-white text-black shadow-md'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Equalizer & AutoMix Modal Toggle */}
        <button
          onClick={() => setEqualizerOpen(!isEqualizerOpen)}
          title="المعادل الصوتي و AutoMix"
          className={`p-2 rounded-xl transition-all ${
            isEqualizerOpen
              ? 'bg-white text-black shadow-md'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Queue Drawer Toggle */}
        <button
          onClick={() => setQueueOpen(!isQueueOpen)}
          title="قائمة الانتظار"
          className={`p-2 rounded-xl transition-all ${
            isQueueOpen
              ? 'bg-white text-black shadow-md'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Sleep Timer Toggle */}
        <button
          onClick={() => setSleepTimerOpen(!isSleepTimerOpen)}
          title="مؤقت النوم الذكي"
          className={`relative p-2 rounded-xl transition-all ${
            isSleepTimerOpen || sleepTimerRemaining !== null
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
        >
          <Moon className="w-4 h-4" />
          {sleepTimerRemaining !== null && (
            <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-indigo-400 text-black text-[9px] font-bold rounded-full">
              {Math.ceil(sleepTimerRemaining / 60)}m
            </span>
          )}
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={() => setVolume(volume === 0 ? 0.9 : 0)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 accent-white cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
};
