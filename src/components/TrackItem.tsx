import React from 'react';
import { Track } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, Heart, MoreHorizontal, ListPlus, Radio } from 'lucide-react';

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

  const isCurrent = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
        isCurrent
          ? 'bg-[#FA243C]/15 border border-[#FA243C]/30 shadow-lg shadow-[#FA243C]/10'
          : 'hover:bg-white/[0.05] border border-transparent'
      }`}
    >
      {/* Index or Animated Equalizer */}
      <div className="w-7 text-center flex-shrink-0 flex items-center justify-center">
        {isCurrent && isPlaying ? (
          <div className="flex items-end gap-[2px] h-4">
            <span className="w-1 bg-[#FA243C] rounded-full animate-[bounce_0.8s_infinite] h-full" />
            <span className="w-1 bg-[#FA243C] rounded-full animate-[bounce_0.6s_infinite] h-2/3" />
            <span className="w-1 bg-[#FA243C] rounded-full animate-[bounce_1s_infinite] h-4/5" />
          </div>
        ) : (
          <span className="text-xs font-mono text-aura-muted group-hover:hidden">
            {index + 1}
          </span>
        )}
        <Play className="w-3.5 h-3.5 text-white hidden group-hover:block fill-white" />
      </div>

      {/* Cover Artwork Thumbnail */}
      <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/40 border border-white/10 shadow-md">
        <img
          src={track.artworkUrl || '/logo.svg'}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Pause className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-sm md:text-base font-semibold truncate transition-colors ${
            isCurrent ? 'text-[#FF456E] font-bold' : 'text-white group-hover:text-[#FA243C]'
          }`}
        >
          {track.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-aura-textSecondary truncate">
          <span>{track.artist}</span>
          {track.syncedLyrics && track.syncedLyrics.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FA243C]/20 text-[#FF456E] font-medium">
              LYRICS
            </span>
          )}
        </div>
      </div>

      {/* Album (Desktop Only) */}
      <div className="hidden md:block w-48 text-xs text-aura-textSecondary truncate">
        {track.album}
      </div>

      {/* Favorite Heart Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(track.id);
        }}
        className="p-2 rounded-full hover:bg-white/10 text-aura-muted hover:text-red-400 transition-colors"
        title="إضافة للمفضلة"
      >
        <Heart
          className={`w-4 h-4 transition-transform active:scale-125 ${
            isFav ? 'text-red-500 fill-red-500' : 'text-white/40'
          }`}
        />
      </button>

      {/* Duration */}
      <div className="text-xs font-mono text-aura-muted w-12 text-left">
        {formatDuration(track.duration)}
      </div>

      {/* Actions Popover / Options */}
      <div className="relative group/menu">
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-full hover:bg-white/10 text-aura-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        <div className="hidden group-hover/menu:block absolute left-0 top-8 z-30 w-44 bg-[#181822] border border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              playNextInQueue(track);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-right transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-[#FA243C]" />
            <span>تشغيل التالي مباشرة</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToQueue(track);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-right transition-colors"
          >
            <ListPlus className="w-3.5 h-3.5 text-[#FF2D55]" />
            <span>إضافة إلى الانتظار</span>
          </button>
        </div>
      </div>
    </div>
  );
};
