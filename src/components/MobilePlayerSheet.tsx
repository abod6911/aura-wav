import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { AudioVisualizer } from './AudioVisualizer';
import { TimelineSlider } from './player/TimelineSlider';
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
  MicOff,
  Flame,
  Waves,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const MobilePlayerSheet: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const seek = usePlayerStore((state) => state.seek);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);

  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);

  const isMobilePlayerOpen = usePlayerStore((state) => state.isMobilePlayerOpen);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const automixStyle = usePlayerStore((state) => state.automixStyle);
  const isAutoMixingLive = usePlayerStore((state) => state.isAutoMixingLive);

  // Pro DSP states
  const karaokeMode = usePlayerStore((state) => state.karaokeMode);
  const setKaraokeMode = usePlayerStore((state) => state.setKaraokeMode);
  const analogWarmth = usePlayerStore((state) => state.analogWarmth);
  const reverbSpace = usePlayerStore((state) => state.reverbSpace);

  const [visualizerMode, setVisualizerMode] = useState(false);

  if (!currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isCrossfadingSoon =
    isAutoMixingLive ||
    (automixEnabled && duration > 10 && duration - currentTime <= automixDuration && duration - currentTime > 0.2);

  return (
    <>
      {/* 1. Spotify-Style Floating Mini Player (Mobile Only) */}
      {!isMobilePlayerOpen && (
        <div
          onClick={() => setMobilePlayerOpen(true)}
          className="md:hidden fixed bottom-[72px] left-3 right-3 z-40 bg-[#181822]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-2xl flex items-center gap-3 cursor-pointer select-none"
        >
          {/* Top Progress Line */}
          <div className="absolute top-0 left-3 right-3 h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="bg-[#1DB954] h-full rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <img
            src={currentTrack.artworkUrl || '/logo.svg'}
            alt={currentTrack.title}
            className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-white/10"
          />

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
            <p className="text-[11px] text-aura-textSecondary truncate">{currentTrack.artist}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="p-2.5 rounded-full bg-white text-black shadow-md"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black" />
              ) : (
                <Play className="w-4 h-4 fill-black translate-x-0.5" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextTrack(false);
              }}
              className="p-2 text-white/80"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Expandable Full-Screen Mobile Player Sheet */}
      {isMobilePlayerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between p-6 select-none animate-slideUp overflow-hidden">
          {/* Dynamic Background Blur */}
          {currentTrack.artworkUrl && (
            <div
              className="absolute inset-0 -z-10 opacity-30 filter blur-[90px] bg-cover bg-center scale-125"
              style={{ backgroundImage: `url(${currentTrack.artworkUrl})` }}
            />
          )}

          {/* Sheet Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobilePlayerOpen(false)}
              className="p-2 rounded-full bg-white/10 text-white"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#1DB954] font-bold">
                مشغل AURA.WAV • APPLE MUSIC
              </span>
              <h5 className="text-xs text-aura-textSecondary truncate max-w-[200px]">
                {currentTrack.album}
              </h5>
            </div>

            <button
              onClick={() => setVisualizerMode(!visualizerMode)}
              className={`p-2 rounded-full transition-colors ${
                visualizerMode ? 'bg-[#1DB954] text-white shadow-md shadow-[#1DB954]/30' : 'bg-white/10 text-white/70'
              }`}
              title="محلل الصوت"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Large Draggable Artwork with Fluid Gestures or Visualizer */}
          <div className="flex-1 flex flex-col items-center justify-center my-3 relative">
            {visualizerMode ? (
              <div className="w-full max-w-xs h-64 glass-panel rounded-3xl p-4 flex flex-col justify-center items-center border border-white/15">
                <AudioVisualizer height={160} bars={32} mode="bars" />
                <span className="text-xs text-[#1ed760] font-mono mt-4">Real-Time Waveform</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.35}
                  onDragEnd={(_e, info) => {
                    // Swipe threshold: 55px
                    if (info.offset.x < -55) {
                      nextTrack(false);
                    } else if (info.offset.x > 55) {
                      previousTrack();
                    }
                  }}
                  whileTap={{ cursor: 'grabbing' }}
                  className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border border-white/15 group cursor-grab touch-pan-y select-none"
                >
                  <img
                    src={currentTrack.artworkUrl || '/logo.svg'}
                    alt={currentTrack.title}
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />

                  {/* AutoMix In-Flight Badge */}
                  {automixEnabled && isCrossfadingSoon && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#1DB954]/95 text-white text-[10px] font-bold shadow-lg animate-pulse border border-white/20">
                      <span>
                        {automixStyle === 'vinyl_brake'
                          ? 'AutoMix: فرملة فينيل'
                          : automixStyle === 'echo_out'
                          ? 'AutoMix: صدى متلاشٍ'
                          : automixStyle === 'filter_sweep'
                          ? 'AutoMix: فلتر كلوب'
                          : 'AutoMix: تلاشٍ انسيابي'}
                      </span>
                    </div>
                  )}

                  {/* Active DSP Status Badges */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    {karaokeMode && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-600/90 text-white text-[9px] font-bold shadow-md backdrop-blur-md border border-purple-400/30 flex items-center gap-1">
                        <MicOff className="w-2.5 h-2.5" />
                        <span>كاريوكي</span>
                      </span>
                    )}
                    {analogWarmth > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-600/90 text-white text-[9px] font-bold shadow-md backdrop-blur-md border border-amber-400/30 flex items-center gap-1 mr-auto">
                        <Flame className="w-2.5 h-2.5" />
                        <span>{analogWarmth}% دافئ</span>
                      </span>
                    )}
                    {reverbSpace !== 'off' && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-600/90 text-white text-[9px] font-bold shadow-md backdrop-blur-md border border-cyan-400/30 flex items-center gap-1">
                        <Waves className="w-2.5 h-2.5" />
                        <span>3D Space</span>
                      </span>
                    )}
                  </div>
                </motion.div>
                <span className="text-[10px] text-zinc-500 font-medium">
                  اسحب الغلاف يميناً أو يساراً للتخطي
                </span>
              </div>
            )}
          </div>

          {/* Track Details & Favorite */}
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0 flex-1 pr-2">
              <h3 className="text-xl font-black text-white truncate">{currentTrack.title}</h3>
              <p className="text-sm font-medium text-aura-textSecondary truncate">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => toggleFavorite(currentTrack.id)}
              className="p-2.5 rounded-full hover:bg-white/10 text-aura-muted hover:text-red-400"
            >
              <Heart
                className={`w-6 h-6 ${
                  isFav ? 'text-red-500 fill-red-500' : 'text-white/40'
                }`}
              />
            </button>
          </div>

          {/* Scrubber Progress Slider */}
          <div className="mb-4">
            <TimelineSlider
              currentTime={currentTime}
              duration={duration}
              onSeek={seek}
              showTimestamps={true}
            />
          </div>

          {/* Main Controls: Apple Music Style Big Center Play */}
          <div className="flex items-center justify-between px-2 mb-5" dir="ltr">
            <button
              onClick={toggleShuffle}
              className={`p-2 transition-colors ${
                shuffle ? 'text-[#1DB954]' : 'text-white/40'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={previousTrack}
              className="p-2 text-white hover:opacity-80 active:scale-90 transition-transform"
            >
              <SkipBack className="w-8 h-8 fill-white" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-black" />
              ) : (
                <Play className="w-7 h-7 fill-black translate-x-0.5" />
              )}
            </button>

            <button
              onClick={() => nextTrack(false)}
              className="p-2 text-white hover:opacity-80 active:scale-90 transition-transform"
            >
              <SkipForward className="w-8 h-8 fill-white" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-2 transition-colors ${
                repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-white/40'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Quick Actions Footer with Instant Karaoke Shortcut */}
          <div className="flex items-center justify-around pt-3 border-t border-white/10">
            <button
              onClick={() => {
                setMobilePlayerOpen(false);
                setLyricsOpen(true);
              }}
              className="flex flex-col items-center gap-1 text-[11px] text-aura-textSecondary hover:text-white"
            >
              <Mic2 className="w-5 h-5 text-[#1DB954]" />
              <span>الكلمات</span>
            </button>

            {/* Quick Karaoke Toggle Shortcut */}
            <button
              onClick={() => setKaraokeMode(!karaokeMode)}
              className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
                karaokeMode ? 'text-purple-400 font-bold' : 'text-aura-textSecondary hover:text-white'
              }`}
            >
              {karaokeMode ? <MicOff className="w-5 h-5 text-purple-400" /> : <Mic2 className="w-5 h-5" />}
              <span>{karaokeMode ? 'عزل الفوكال: ON' : 'كاريوكي'}</span>
            </button>

            <button
              onClick={() => setEqualizerOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] text-aura-textSecondary hover:text-white"
            >
              <Sliders className="w-5 h-5 text-[#10B981]" />
              <span>المعادل & DSP</span>
            </button>

            <button
              onClick={() => setQueueOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] text-aura-textSecondary hover:text-white"
            >
              <ListMusic className="w-5 h-5 text-[#1ed760]" />
              <span>الانتظار</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
