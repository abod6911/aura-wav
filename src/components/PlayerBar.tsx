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
  Flame,
  Disc3,
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

  const isSoundboardOpen = usePlayerStore((state) => state.isSoundboardOpen);
  const setSoundboardOpen = usePlayerStore((state) => state.setSoundboardOpen);
  const isAutoMixModalOpen = usePlayerStore((state) => state.isAutoMixModalOpen);
  const setAutoMixModalOpen = usePlayerStore((state) => state.setAutoMixModalOpen);
  const automixStyle = usePlayerStore((state) => state.automixStyle);

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
      className="hidden md:flex fixed bottom-0 left-0 right-0 h-24 z-40 bg-[#0a0a0f]/90 backdrop-blur-3xl px-6 items-center justify-between border-t border-white/[0.08] select-none shadow-[0_-8px_32px_rgba(0,0,0,0.6)] contain-paint-layout gpu-accelerated"
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
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FA243C]/15 text-[#FF456E] border border-[#FA243C]/30 tracking-wider uppercase font-mono">
                Spatial
              </span>
            </div>
          )}
        </div>

        {currentTrack && (
          <button
            onClick={() => toggleFavorite(currentTrack.id)}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-[#FA243C] transition-colors"
            aria-label="Favorite"
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isFav ? 'text-[#FA243C] fill-[#FA243C]' : 'text-zinc-500'
              }`}
            />
          </button>
        )}
      </div>

      {/* 2. Main Playback Controls & Bulletproof Scrubber (Center) */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
        {/* Buttons Row */}
        <div className="flex items-center gap-4">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            title="خلط الأغاني"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              shuffle 
                ? 'bg-[#FA243C]/20 border border-[#FA243C]/50 text-[#FF456E] shadow-[0_0_12px_rgba(250,36,60,0.35)]' 
                : 'satin-metal-button text-zinc-400'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          {/* Previous */}
          <button
            onClick={previousTrack}
            title="السابق"
            className="w-10 h-10 rounded-full satin-metal-button flex items-center justify-center text-white/90 hover:text-white cursor-pointer"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          {/* Large Luxury Hi-Fi Play/Pause Button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.90 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(10); } catch {}
              }
              togglePlayPause();
            }}
            style={{ 
              touchAction: 'manipulation',
              ['--aura-glow' as any]: currentTrack?.dominantColor || 'rgba(250, 36, 60, 0.45)'
            }}
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            className="w-12 h-12 rounded-full hi-fi-play-button text-black flex items-center justify-center relative group cursor-pointer select-none"
          >
            {/* Dynamic artwork aura backlight */}
            <div 
              className="absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-75 transition-opacity pointer-events-none -z-10"
              style={{ backgroundColor: currentTrack?.dominantColor || '#FA243C' }}
            />
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-zinc-900 text-zinc-900" />
            ) : (
              <Play className="w-5 h-5 fill-zinc-900 text-zinc-900 translate-x-0.5" />
            )}
          </motion.button>

          {/* Next */}
          <button
            onClick={() => nextTrack({ forceImmediate: true })}
            title="التالي"
            className="w-10 h-10 rounded-full satin-metal-button flex items-center justify-center text-white/90 hover:text-white cursor-pointer"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            title="تكرار"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              repeatMode !== 'off'
                ? 'bg-[#FA243C]/20 border border-[#FA243C]/50 text-[#FF456E] shadow-[0_0_12px_rgba(250,36,60,0.35)]'
                : 'satin-metal-button text-zinc-400'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
          </button>

          {/* AutoMix Interactive Pill Status */}
          {automixEnabled && (
            <button
              onClick={() => setAutoMixModalOpen(true)}
              title={`AutoMix نشط (${automixDuration} ثواني - ${automixStyle}) - انقر لتغيير النمط`}
              data-testid="desktop-automix-pill"
              className={`luxury-capsule flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                isCrossfadingSoon
                  ? 'luxury-capsule-active text-[#FF456E] animate-pulse'
                  : 'text-[#FF456E] hover:bg-[#FA243C]/10'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>
                AUTOMIX • {automixStyle === 'vinyl_brake' ? 'VINYL' : automixStyle === 'echo_out' ? 'ECHO' : automixStyle === 'filter_sweep' ? 'FILTER' : 'CROSSFADE'}
              </span>
            </button>
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
          className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          {playbackRate}x
        </button>

        {/* Synced Lyrics Toggle */}
        <button
          onClick={() => setLyricsOpen(!isLyricsOpen)}
          title="الكلمات المتزامنة"
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isLyricsOpen
              ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* DJ Soundboard Live Pads Toggle */}
        <button
          onClick={() => setSoundboardOpen(!isSoundboardOpen)}
          title="لوحة مؤثرات الـ DJ الصوتية الحية (Vinyl Scratch, Airhorn, Bass Drop...)"
          data-testid="desktop-dj-soundboard-btn"
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            isSoundboardOpen
              ? 'bg-gradient-to-r from-[#FA243C] to-amber-500 text-white shadow-lg shadow-[#FA243C]/40'
              : 'hover:bg-white/[0.08] text-amber-400 hover:text-amber-300'
          }`}
        >
          <Flame className="w-4 h-4 fill-current animate-pulse" />
          <span className="hidden xl:inline text-[10px] font-mono font-black tracking-wider">DJ LIVE</span>
        </button>

        {/* Equalizer & AutoMix Modal Toggle */}
        <button
          onClick={() => setEqualizerOpen(!isEqualizerOpen)}
          title="المعادل الصوتي و AutoMix"
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isEqualizerOpen
              ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Queue Drawer Toggle */}
        <button
          onClick={() => setQueueOpen(!isQueueOpen)}
          title="قائمة الانتظار"
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isQueueOpen
              ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Sleep Timer Toggle */}
        <button
          onClick={() => setSleepTimerOpen(!isSleepTimerOpen)}
          title="مؤقت النوم الذكي"
          className={`relative p-2 rounded-xl transition-all cursor-pointer ${
            isSleepTimerOpen || sleepTimerRemaining !== null
              ? 'bg-[#FA243C] text-white shadow-md shadow-[#FA243C]/30'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
        >
          <Moon className="w-4 h-4" />
          {sleepTimerRemaining !== null && (
            <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-white text-[#FA243C] text-[9px] font-bold rounded-full">
              {Math.ceil(sleepTimerRemaining / 60)}m
            </span>
          )}
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={() => setVolume(volume === 0 ? 0.9 : 0)}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
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
            className="w-20 accent-[#FA243C] cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
};
