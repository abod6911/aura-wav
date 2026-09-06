import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getActiveLyricIndex } from '../../services/lyricsParser';
import { TimelineSlider } from '../player/TimelineSlider';
import {
  X,
  Sparkles,
  Music2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractPaletteFromImage } from '../../lib/colorSampler';

export const SyncedLyrics: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);

  const seek = usePlayerStore((state) => state.seek);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);

  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<any>(null);

  const lyrics = currentTrack?.syncedLyrics || [];
  const activeIndex = getActiveLyricIndex(lyrics, currentTime);
  const isAutoMixing =
    automixEnabled && duration > 15 && duration - currentTime <= automixDuration;

  // Auto-scroll active line to optical center unless user is manually dragging/scrolling
  useEffect(() => {
    if (activeLineRef.current && isLyricsOpen && !userIsScrolling) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isLyricsOpen, userIsScrolling]);

  const handleUserScroll = () => {
    setUserIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false);
    }, 2500);
  };

  const [palette, setPalette] = useState<{ primary: string; secondary: string; accent: string }>({
    primary: 'rgba(99, 102, 241, 0.4)',
    secondary: 'rgba(168, 85, 247, 0.35)',
    accent: 'rgba(236, 72, 153, 0.25)',
  });

  useEffect(() => {
    if (currentTrack?.artworkUrl) {
      extractPaletteFromImage(currentTrack.artworkUrl).then((p) => {
        setPalette(p);
      });
    }
  }, [currentTrack?.artworkUrl]);

  if (!isLyricsOpen || !currentTrack) return null;

  // Helper to detect if a lyric line is Arabic for text direction
  const isArabicText = (text: string) => /[\u0600-\u06FF]/.test(text);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-[#060609] flex flex-col select-none overflow-hidden"
      >
        {/* Luxury Obsidian Base Canvas */}
        <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#08080c] via-[#060609] to-[#040406]" />

        {/* Dynamic Multi-Orb Luminous Ambient Glow (Apple Music Style - 100% Anti-Mud) */}
        <div
          className="absolute -top-[20%] -left-[15%] w-[75vw] h-[75vw] rounded-full filter blur-[140px] opacity-45 pointer-events-none transition-all duration-1000 ease-out"
          style={{ backgroundColor: palette.primary }}
        />
        <div
          className="absolute -bottom-[20%] -right-[15%] w-[80vw] h-[80vw] rounded-full filter blur-[150px] opacity-40 pointer-events-none transition-all duration-1000 ease-out"
          style={{ backgroundColor: palette.secondary }}
        />
        <div
          className="absolute top-[35%] right-[20%] w-[55vw] h-[55vw] rounded-full filter blur-[130px] opacity-30 pointer-events-none transition-all duration-1000 ease-out"
          style={{ backgroundColor: palette.accent }}
        />

        {/* Ambient Dark Vignette & Glass Overlay */}
        <div className="absolute inset-0 -z-10 bg-black/40 backdrop-blur-[50px] pointer-events-none" />

        {/* Top Header Bar */}
        <div className="w-full px-6 md:px-12 py-4 flex items-center justify-between border-b border-white/[0.08] z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/10 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Synced Lyrics</span>
            </div>
            {isAutoMixing && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/30 border border-purple-500/40 text-xs font-bold text-purple-200 animate-pulse">
                AutoMix Active
              </span>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setLyricsOpen(false)}
            className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white flex items-center justify-center transition-colors shadow-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Main Content: Apple Music Two-Column Layout on Desktop, Fluid Stream on Mobile */}
        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center overflow-hidden px-4 md:px-10 py-4 gap-8">
          {/* Left Column: Player Info & Controls (Desktop & Tablet) */}
          <div className="hidden lg:flex w-96 flex-col justify-center space-y-6 flex-shrink-0 pr-6 border-r border-white/[0.08]">
            {/* High-Res Album Art with Subtle Pulse */}
            <div className="relative w-72 h-72 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/[0.12] mx-auto group">
              <img
                src={currentTrack.artworkUrl || '/logo.svg'}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
            </div>

            {/* Track Meta */}
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-black text-white truncate tracking-tight">
                {currentTrack.title}
              </h2>
              <p className="text-sm font-medium text-zinc-400 truncate">
                {currentTrack.artist}
              </p>
              <p className="text-xs text-zinc-500 truncate font-mono">
                {currentTrack.album}
              </p>
            </div>

            {/* Scrubber */}
            <div className="pt-2">
              <TimelineSlider
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
                showTimestamps={true}
              />
            </div>

            {/* Playback Buttons */}
            <div className="flex items-center justify-center gap-5 pt-1" dir="ltr">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full transition-colors ${
                  shuffle ? 'text-indigo-400 bg-indigo-500/20' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={previousTrack}
                className="p-2 text-white/90 hover:text-white hover:scale-110 active:scale-95 transition-all"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-black" />
                ) : (
                  <Play className="w-6 h-6 fill-black translate-x-0.5" />
                )}
              </motion.button>

              <button
                onClick={() => nextTrack(false)}
                className="p-2 text-white/90 hover:text-white hover:scale-110 active:scale-95 transition-all"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>

              <button
                onClick={cycleRepeat}
                className={`p-2 rounded-full transition-colors ${
                  repeatMode !== 'off' ? 'text-indigo-400 bg-indigo-500/20' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center justify-center gap-2 pt-2" dir="ltr">
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
                className="w-32 accent-white cursor-pointer"
              />
            </div>
          </div>

          {/* Right Column: Kinetic Synchronized Lyrics Stream */}
          <div
            ref={containerRef}
            onScroll={handleUserScroll}
            className="flex-1 w-full h-full overflow-y-auto px-4 md:px-12 py-28 space-y-9 scroll-smooth select-none relative"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
            }}
          >
            {lyrics.length > 0 ? (
              lyrics.map((line, idx) => {
                const isActive = idx === activeIndex;
                const isPast = idx < activeIndex;
                const isArabic = isArabicText(line.text);

                return (
                  <motion.div
                    key={`${line.time}_${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => seek(line.time)}
                    initial={false}
                    animate={{
                      scale: isActive ? 1.03 : 1.0,
                      opacity: isActive ? 1 : isPast ? 0.4 : 0.25,
                      filter: isActive ? 'blur(0px)' : 'blur(1px)',
                    }}
                    transition={{ duration: 0.3 }}
                    className={`cursor-pointer transition-all duration-300 py-2 px-3 rounded-2xl overflow-visible origin-left ${
                      isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    } ${isArabic ? 'text-right' : 'text-left'}`}
                    dir={isArabic ? 'rtl' : 'ltr'}
                  >
                    <p
                      className={`tracking-tight font-sans transition-all duration-300 ${
                        isActive
                          ? 'text-[#ffffff] font-extrabold text-2xl sm:text-3xl md:text-4xl drop-shadow-[0_0_28px_rgba(255,255,255,0.7)]'
                          : 'text-white hover:text-white/80 hover:filter-none font-bold text-lg sm:text-xl md:text-2xl'
                      }`}
                    >
                      {line.text}
                    </p>
                  </motion.div>
                );
              })
            ) : currentTrack?.lyrics ? (
              <div className="text-center py-24 text-zinc-400 space-y-4 whitespace-pre-line text-lg leading-loose">
                <Music2 className="w-12 h-12 mx-auto text-indigo-400 opacity-60" />
                <p className="text-white text-2xl font-bold">كلمات الأغنية</p>
                <div className="max-w-xl mx-auto text-zinc-300 text-lg leading-relaxed">
                  {currentTrack.lyrics}
                </div>
              </div>
            ) : (
              <div className="text-center py-36 text-zinc-400 space-y-4">
                <Music2 className="w-14 h-14 mx-auto text-indigo-400 animate-pulse opacity-40" />
                <h4 className="text-white text-2xl font-bold">لا توجد كلمات متزامنة متاحة</h4>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                  يمكنك وضع ملف <code className="text-indigo-300 font-mono bg-white/10 px-1.5 py-0.5 rounded">.lrc</code> بنفس اسم الأغنية أو يتم جلبها تلقائياً عند الاتصال بالإنترنت.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Floating Mini-Controls (Shown only on small screens) */}
        <div className="lg:hidden w-full px-6 py-4 border-t border-white/[0.08] bg-[#07070a]/90 backdrop-blur-2xl flex flex-col gap-2 z-20">
          <TimelineSlider
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
            showTimestamps={true}
          />

          <div className="flex items-center justify-between pt-1" dir="ltr">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
              <img
                src={currentTrack.artworkUrl || '/logo.svg'}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={previousTrack} className="text-white p-1">
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                onClick={togglePlayPause}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-md"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black translate-x-0.5" />}
              </button>
              <button onClick={() => nextTrack(false)} className="text-white p-1">
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        </div>

        {/* Subtle Bottom Help Text */}
        <div className="hidden lg:block text-center text-[11px] text-zinc-500 py-2 border-t border-white/[0.05] z-10">
          اضغط على أي سطر للانتقال المباشر لتلك اللحظة في الأغنية
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
