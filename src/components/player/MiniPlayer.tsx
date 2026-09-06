import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Play, Pause, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const previousTrack = usePlayerStore((state) => state.previousTrack);

  if (!currentTrack) return null;

  const validDuration = isFinite(duration) && duration > 0 ? duration : 1;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / validDuration) * 100));

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.25}
      onDragEnd={(_, info) => {
        if (info.offset.x < -60 || info.velocity.x < -250) {
          nextTrack(false);
        } else if (info.offset.x > 60 || info.velocity.x > 250) {
          previousTrack();
        }
      }}
      onClick={onExpand}
      className="md:hidden fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40 bg-[#0e0e14]/90 backdrop-blur-3xl border border-white/[0.09] rounded-2xl p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center gap-3.5 cursor-pointer select-none overflow-hidden touch-pan-y"
    >
      {/* Micro-Progress Bar Running Along Top Edge */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Album Artwork with Vinyl Rotation Feedback */}
      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/50 border border-white/10 shadow-md">
        <img
          src={currentTrack.artworkUrl || '/logo.svg'}
          alt={currentTrack.title}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isPlaying ? 'scale-105' : 'scale-100 opacity-90'
          }`}
        />
        {/* Subtle center vinyl spindle hole indicator */}
        <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-black/60 border border-white/30" />
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-white truncate tracking-tight">
          {currentTrack.title}
        </h4>
        <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
          {currentTrack.artist}
        </p>
      </div>

      {/* Play Controls with Spring Feedback */}
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 hover:scale-105 transition-transform"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-black" />
          ) : (
            <Play className="w-4 h-4 fill-black translate-x-0.5" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={(e) => {
            e.stopPropagation();
            nextTrack(false);
          }}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          aria-label="Next track"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </motion.button>
      </div>
    </motion.div>
  );
};
