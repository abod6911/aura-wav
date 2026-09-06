import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { AudioVisualizer } from './AudioVisualizer';
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
} from 'lucide-react';

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

  const [visualizerMode, setVisualizerMode] = useState(false);

  if (!currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isCrossfadingSoon =
    automixEnabled && duration > 15 && duration - currentTime <= automixDuration;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
              className="bg-indigo-500 h-full rounded-full"
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
              <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">
                مشغل AURA.WAV
              </span>
              <h5 className="text-xs text-aura-textSecondary truncate max-w-[200px]">
                {currentTrack.album}
              </h5>
            </div>

            <button
              onClick={() => setVisualizerMode(!visualizerMode)}
              className={`p-2 rounded-full transition-colors ${
                visualizerMode ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70'
              }`}
              title="محلل الصوت"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Large Artwork or Visualizer */}
          <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
            {visualizerMode ? (
              <div className="w-full max-w-xs h-64 glass-panel rounded-3xl p-4 flex flex-col justify-center items-center border border-white/15">
                <AudioVisualizer height={160} bars={32} mode="bars" />
                <span className="text-xs text-indigo-300 font-mono mt-4">Real-Time Waveform</span>
              </div>
            ) : (
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border border-white/15 group">
                <img
                  src={currentTrack.artworkUrl || '/logo.svg'}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
                {automixEnabled && isCrossfadingSoon && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-purple-600/90 text-white text-[10px] font-bold shadow-lg animate-pulse">
                    AutoMix جارٍ...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Track Details & Favorite */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-white truncate">{currentTrack.title}</h2>
              <p className="text-sm text-aura-textSecondary truncate">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => toggleFavorite(currentTrack.id)}
              className="p-2.5 text-aura-muted hover:text-red-400"
            >
              <Heart
                className={`w-6 h-6 ${isFav ? 'text-red-500 fill-red-500' : 'text-white/40'}`}
              />
            </button>
          </div>

          {/* Scrubber */}
          <div className="space-y-1 mb-4">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/15 rounded-full appearance-none accent-white"
              style={{
                background: `linear-gradient(to right, #6366f1 ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%)`,
              }}
            />
            <div className="flex justify-between text-xs font-mono text-aura-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between px-2 mb-6">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-full ${shuffle ? 'text-indigo-400' : 'text-white/40'}`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button onClick={previousTrack} className="p-2 text-white">
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-5 rounded-full bg-white text-black shadow-xl shadow-white/20 active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-black" />
              ) : (
                <Play className="w-7 h-7 fill-black translate-x-0.5" />
              )}
            </button>

            <button onClick={() => nextTrack(false)} className="p-2 text-white">
              <SkipForward className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-2 rounded-full ${repeatMode !== 'off' ? 'text-indigo-400' : 'text-white/40'}`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Footer Quick Action Bar */}
          <div className="flex items-center justify-around py-3 border-t border-white/10">
            <button
              onClick={() => {
                setMobilePlayerOpen(false);
                setLyricsOpen(true);
              }}
              className="flex flex-col items-center gap-1 text-[11px] text-aura-textSecondary hover:text-white"
            >
              <Mic2 className="w-5 h-5 text-indigo-400" />
              <span>الكلمات</span>
            </button>

            <button
              onClick={() => setEqualizerOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] text-aura-textSecondary hover:text-white"
            >
              <Sliders className="w-5 h-5 text-purple-400" />
              <span>المعادل & AutoMix</span>
            </button>

            <button
              onClick={() => setQueueOpen(true)}
              className="flex flex-col items-center gap-1 text-[11px] text-aura-textSecondary hover:text-white"
            >
              <ListMusic className="w-5 h-5 text-pink-400" />
              <span>الانتظار</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
