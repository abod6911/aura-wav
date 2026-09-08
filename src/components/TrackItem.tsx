import React from 'react';
import { Track } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, Heart, MoreHorizontal, ListPlus, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrackItemProps {
  track: Track;
  index: number;
}

export const TrackItem: React.FC<TrackItemProps> = ({ track, index }) => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue);
  const addToast = usePlayerStore((state) => state.addToast);

  const isCurrent = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10); } catch {}
    }
  };

  const handleRowClick = () => {
    if (isCurrent) {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        usePlayerStore.getState().setMobilePlayerOpen(true);
      } else {
        togglePlayPause();
      }
    } else {
      playTrack(track);
    }
  };

  const handleSwipeQueue = () => {
    triggerHaptic();
    addToQueue(track);
    addToast(`تمت إضافة "${track.title}" إلى قائمة الانتظار`, undefined, 'success');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl my-0.5 group/wrapper">
      {/* Background Revealed Action: Spotify Green Add to Queue */}
      <div 
        onClick={handleSwipeQueue}
        className="absolute inset-y-0 right-0 w-24 bg-[#1DB954] flex items-center justify-center text-black font-bold text-xs gap-1.5 z-0 rounded-2xl cursor-pointer select-none transition-transform active:scale-95"
      >
        <ListPlus className="w-5 h-5 stroke-[2.5]" />
        <span>انتظار</span>
      </div>

      {/* Swipeable Track Card Foreground */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={0.12}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50 || info.velocity.x < -200) {
            handleSwipeQueue();
          }
        }}
        onClick={handleRowClick}
        className={`relative z-10 group flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 rounded-2xl cursor-pointer transition-colors duration-200 select-none bg-[#121212] ${
          isCurrent
            ? 'bg-[#1DB954]/15 border border-[#1DB954]/30 shadow-lg shadow-[#1DB954]/10'
            : 'hover:bg-[#1f1f1f] border border-transparent'
        }`}
      >
        {/* Index or Animated Equalizer */}
        <div className="w-7 text-center flex-shrink-0 flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex items-end gap-[2px] h-4">
              <span className="w-1 bg-[#1DB954] rounded-full animate-[bounce_0.8s_infinite] h-full" />
              <span className="w-1 bg-[#1DB954] rounded-full animate-[bounce_0.6s_infinite] h-2/3" />
              <span className="w-1 bg-[#1DB954] rounded-full animate-[bounce_1s_infinite] h-4/5" />
            </div>
          ) : (
            <span className={`text-xs font-mono group-hover:hidden ${isCurrent ? 'text-[#1DB954] font-bold' : 'text-zinc-400'}`}>
              {index + 1}
            </span>
          )}
          <Play className="w-3.5 h-3.5 text-white hidden group-hover:block fill-white" />
        </div>

        {/* Cover Artwork Thumbnail */}
        <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/40 border border-white/10 shadow-md">
          <img
            src={track.coverUrl || track.artworkUrl || '/logo.svg'}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {isCurrent && isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Pause className="w-4 h-4 text-white fill-white" />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm md:text-base font-semibold truncate transition-colors ${
              isCurrent ? 'text-[#1DB954] font-bold' : 'text-white group-hover:text-[#1DB954]'
            }`}
          >
            {track.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
            <span>{track.artist}</span>
            {track.syncedLyrics && track.syncedLyrics.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1DB954]/20 text-[#1ed760] font-medium border border-[#1DB954]/30">
                LYRICS
              </span>
            )}
          </div>
        </div>

        {/* Album (Desktop Only) */}
        <div className="hidden md:block w-48 text-xs text-zinc-400 truncate">
          {track.album}
        </div>

        {/* Favorite Heart Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track.id);
          }}
          className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-[#1DB954] transition-colors"
          title="إضافة للمفضلة"
        >
          <Heart
            className={`w-4 h-4 transition-transform active:scale-125 ${
              isFav ? 'text-[#1DB954] fill-[#1DB954]' : 'text-white/40'
            }`}
          />
        </button>

        {/* Duration */}
        <div className="text-xs font-mono text-zinc-400 w-12 text-left">
          {formatDuration(track.duration)}
        </div>

        {/* Actions Popover / Options */}
        <div className="relative group/menu">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          <div className="hidden group-hover/menu:block absolute left-0 top-8 z-30 w-44 bg-[#282828] border border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                playNextInQueue(track);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-right transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>تشغيل التالي مباشرة</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToQueue(track);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-right transition-colors"
            >
              <ListPlus className="w-3.5 h-3.5 text-[#1ed760]" />
              <span>إضافة إلى الانتظار</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
