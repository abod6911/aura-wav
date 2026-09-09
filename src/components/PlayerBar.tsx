import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
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
  Sparkles,
} from 'lucide-react';
import { TimelineSlider } from './player/TimelineSlider';
import { AudioSettingsModal } from './AudioSettingsModal';

export const PlayerBar: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
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

  return (
    <>
      <footer
        dir="ltr"
        className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 z-40 bg-[#181818] px-4 sm:px-6 items-center justify-between border-t border-white/10 select-none shadow-[0_-8px_32px_rgba(0,0,0,0.7)]"
      >
        {/* 1. Track Info (Left) */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-0">
          <div
            onClick={() => setMobilePlayerOpen(true)}
            className="relative w-14 h-14 rounded-md overflow-hidden bg-[#282828] border border-white/5 shadow-md flex-shrink-0 group cursor-pointer"
          >
            <img
              src={currentTrack?.coverUrl || currentTrack?.artworkUrl || '/logo.svg'}
              alt={currentTrack?.title || 'No Track'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h4
              onClick={() => setMobilePlayerOpen(true)}
              className="text-sm font-bold text-white truncate hover:underline cursor-pointer tracking-tight"
              title={currentTrack?.title}
            >
              {currentTrack?.title || 'اختر أغنية للتشغيل'}
            </h4>
            <p className="text-xs text-zinc-400 truncate mt-0.5 hover:underline cursor-pointer">
              {currentTrack?.artist || 'AURA.WAV'}
            </p>
          </div>

          {currentTrack && (
            <button
              onClick={() => toggleFavorite(currentTrack.id)}
              className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            >
              <Heart
                className={`w-4 h-4 transition-transform active:scale-125 ${
                  isFav ? 'text-[#1DB954] fill-[#1DB954]' : ''
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
              title="خلط الأغاني الذكي (Smart Shuffle)"
              className={`p-1.5 transition-colors cursor-pointer ${
                shuffle ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={previousTrack}
              title="السابق"
              className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play/Pause Button (Spotify Iconic White Circle) */}
            <button
              onClick={togglePlayPause}
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black text-black" />
              ) : (
                <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={() => nextTrack({ forceImmediate: true })}
              title="التالي"
              className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              title="تكرار التشغيل"
              className={`p-1.5 transition-colors cursor-pointer relative ${
                repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
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
            showTimestamps={true}
          />
        </div>

        {/* 3. Utility Actions & Volume (Right) */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          {/* Synced Lyrics */}
          <button
            onClick={() => setLyricsOpen(!isLyricsOpen)}
            title="الكلمات المتزامنة"
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isLyricsOpen ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Audio Settings & DJ Specs Modal */}
          <button
            onClick={() => setIsAudioSettingsOpen(true)}
            title="إعدادات الصوت المتقدمة ومواصفات DJ"
            className="p-2 text-zinc-400 hover:text-[#1DB954] transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Queue Drawer / Right Sidebar */}
          <button
            onClick={toggleRightSidebar}
            title="قائمة الانتظار"
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isRightSidebarOpen ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 group/vol">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVol = parseFloat(e.target.value);
                setVolume(newVol);
                if (isMuted && newVol > 0) setIsMuted(false);
              }}
              className="w-20 sm:w-24 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-white hover:accent-[#1DB954]"
            />
          </div>

          {/* Full-Screen Player Expander */}
          <button
            onClick={() => setMobilePlayerOpen(true)}
            title="شاشة المشغل الكاملة"
            className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Discrete Audio Settings & DJ Specs Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
      />
    </>
  );
};
