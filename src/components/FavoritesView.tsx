import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Heart,
  Play,
  Pause,
  Shuffle,
  Search,
  MoreHorizontal,
  ListPlus,
  Radio,
  Clock,
} from 'lucide-react';
import { formatTime } from './player/TimelineSlider';
import { Track } from '../types';

interface FavoritesViewProps {
  onOpenImport?: () => void;
  onExplore?: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ onExplore }) => {
  const { isRTL, dir } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const addToast = usePlayerStore((state) => state.addToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);

  // Get favorite track objects in the order of favorite IDs
  const favoriteTracks = useMemo(() => {
    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    return favorites
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t !== undefined);
  }, [tracks, favorites]);

  // Filtered by search
  const displayedTracks = useMemo(() => {
    if (!searchQuery.trim()) return favoriteTracks;
    const q = searchQuery.toLowerCase().trim();
    return favoriteTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q))
    );
  }, [favoriteTracks, searchQuery]);

  // Compute total duration
  const totalDurationSeconds = useMemo(() => {
    return favoriteTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [favoriteTracks]);

  const formattedTotalDuration = useMemo(() => {
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
    if (hours > 0) {
      return isRTL ? `${hours} ساعة و ${minutes} دقيقة` : `${hours} hr ${minutes} min`;
    }
    return isRTL ? `${minutes} دقيقة` : `${minutes} min`;
  }, [totalDurationSeconds, isRTL]);

  const handlePlayAll = () => {
    if (favoriteTracks.length === 0) return;
    playTrack(favoriteTracks[0], favoriteTracks);
    addToast(isRTL ? 'جاري تشغيل أغانيك المفضلة' : 'Playing all favorite tracks', undefined, 'success');
  };

  const handleShufflePlay = () => {
    if (favoriteTracks.length === 0) return;
    const shuffled = [...favoriteTracks].sort(() => Math.random() - 0.5);
    toggleShuffle();
    playTrack(shuffled[0], shuffled);
    addToast(isRTL ? 'تشغيل عشوائي للأغاني المفضلة' : 'Shuffling favorite tracks', undefined, 'success');
  };

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(12); } catch {}
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-36 md:pb-24 space-y-6 select-none" dir={dir}>
      {/* 1. Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FA243C]/20 via-red-950/20 to-black/60 border border-white/[0.1] p-4 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-[#FA243C]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-start">
          {/* Heart Art Tile */}
          <div className="w-20 h-20 sm:w-40 sm:h-40 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FA243C] via-[#FF375F] to-[#E00028] flex items-center justify-center flex-shrink-0 shadow-[0_12px_40px_rgba(250,36,60,0.4)] border border-white/20">
            <Heart className="w-10 h-10 sm:w-20 sm:h-20 fill-white text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)] animate-pulse" />
          </div>

          {/* Playlist Info */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#FF375F] bg-[#FA243C]/15 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-[#FA243C]/30 inline-block mb-1.5 sm:mb-2">
              {isRTL ? 'قائمة تشغيل خاصة' : 'Personal Playlist'}
            </span>
            <h1 className="text-xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {isRTL ? 'أغانيك المفضلة' : 'Liked Songs'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 sm:mt-2 font-medium flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span>{favoriteTracks.length} {isRTL ? 'أغنية' : 'tracks'}</span>
              <span>•</span>
              <span className="text-zinc-400">{formattedTotalDuration}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">Studio Master Hi-Fi</span>
            </p>

            {/* Quick Actions */}
            <div className="flex items-center justify-center sm:justify-start gap-2.5 sm:gap-3 mt-3.5 sm:mt-5 flex-wrap">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayAll}
                disabled={favoriteTracks.length === 0}
                className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-bold text-xs sm:text-sm flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-[#FA243C]/35 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Play className="w-4 h-4 fill-white text-white" />
                <span>{isRTL ? 'تشغيل الكل' : 'Play All'}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleShufflePlay}
                disabled={favoriteTracks.length === 0}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Shuffle className="w-4 h-4 text-zinc-300" />
                <span>{isRTL ? 'خلط عشوائي' : 'Shuffle'}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Toolbar */}
      {favoriteTracks.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className={`w-4 h-4 text-zinc-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'ابحث داخل أغانيك المفضلة...' : 'Search within favorites...'}
              className={`w-full py-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-[#FA243C]/60 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#FA243C]/50 transition-all ${
                isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
              }`}
            />
          </div>
          <span className="text-xs font-mono text-zinc-400 font-bold hidden sm:inline-block">
            {displayedTracks.length} / {favoriteTracks.length}
          </span>
        </div>
      )}

      {/* 3. Empty State or Track Table */}
      {favoriteTracks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
          <div className="w-20 h-20 rounded-full bg-[#FA243C]/10 border border-[#FA243C]/20 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-[#FA243C]" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {isRTL ? 'لا توجد أغانٍ في المفضلة بعد' : 'No favorite songs yet'}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
            {isRTL
              ? 'اضغط على أيقونة القلب ❤️ بجانب أي أغنية في مكتبتك لإضافتها إلى قائمتك المفضلة والوصول إليها فوراً.'
              : 'Tap the heart icon next to any track in your library to add it here for fast instant access.'}
          </p>
          {onExplore && (
            <button
              onClick={onExplore}
              className="mt-6 px-6 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {isRTL ? 'استكشف مكتبتك الموسيقية' : 'Browse Music Library'}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[28px_48px_1fr_36px_36px] sm:grid-cols-[36px_48px_1fr_60px_44px_36px] items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-3 border-b border-white/[0.06] text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <span className="text-center">#</span>
            <span></span>
            <span>{isRTL ? 'العنوان والفنان' : 'Title & Artist'}</span>
            <span className="text-center hidden sm:block">
              <Clock className="w-3.5 h-3.5 mx-auto opacity-70" />
            </span>
            <span className="text-center">{isRTL ? 'إزالة' : 'Fav'}</span>
            <span></span>
          </div>

          {/* Track Rows */}
          <div className="divide-y divide-white/[0.04]">
            {displayedTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isRowPlaying = isCurrent && isPlaying;
              const isMenuOpen = activeMenuTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    if (isCurrent) {
                      togglePlayPause();
                    } else {
                      playTrack(track, favoriteTracks);
                    }
                  }}
                  className={`group grid grid-cols-[28px_48px_1fr_36px_36px] sm:grid-cols-[36px_48px_1fr_60px_44px_36px] items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-2.5 transition-colors cursor-pointer select-none ${
                    isCurrent
                      ? 'bg-gradient-to-r from-[#FA243C]/20 via-[#FA243C]/10 to-transparent border-l-2 border-[#FA243C]'
                      : 'hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Index / Play / Equalizer */}
                  <div className="text-center flex items-center justify-center">
                    {/* On Desktop Hover: Play/Pause button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        if (isCurrent) {
                          togglePlayPause();
                        } else {
                          playTrack(track, favoriteTracks);
                        }
                      }}
                      className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full text-white cursor-pointer active:scale-90"
                    >
                      {isRowPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white" />
                      )}
                    </button>

                    {/* Non-hover state */}
                    <div className="group-hover:hidden flex items-center justify-center">
                      {isRowPlaying ? (
                        <div className="flex items-end gap-[2px] h-3.5">
                          <span className="w-1 bg-[#FA243C] rounded-full animate-[bounce_0.8s_infinite] h-full" />
                          <span className="w-1 bg-[#FF375F] rounded-full animate-[bounce_0.6s_infinite] h-2/3" />
                          <span className="w-1 bg-[#FA243C] rounded-full animate-[bounce_1s_infinite] h-4/5" />
                        </div>
                      ) : (
                        <span
                          className={`text-xs font-mono font-bold ${
                            isCurrent ? 'text-[#FA243C]' : 'text-zinc-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Album Cover */}
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-sm flex-shrink-0">
                    <img
                      src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* Title & Artist */}
                  <div className="min-w-0 pr-1">
                    <h4
                      dir="auto"
                      className={`text-xs sm:text-sm font-bold truncate tracking-tight ${
                        isCurrent ? 'text-[#FA243C]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </h4>
                    <p dir="auto" className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
                      {track.artist}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="text-xs font-mono tabular-nums text-zinc-400 text-center hidden sm:block">
                    {formatTime(track.duration)}
                  </div>

                  {/* Favorite Heart (Direct Remove Action) */}
                  <div className="text-center flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        toggleFavorite(track.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/[0.08] text-[#FA243C] transition-all cursor-pointer active:scale-125"
                      title={isRTL ? 'إزالة من المفضلة' : 'Remove from favorites'}
                    >
                      <Heart className="w-4 h-4 fill-[#FA243C]" />
                    </button>
                  </div>

                  {/* 3-Dots Menu */}
                  <div className="relative flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuTrackId(isMenuOpen ? null : track.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute z-30 top-8 w-44 bg-[#12121a]/98 border border-white/[0.15] rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl ${
                          isRTL ? 'left-0' : 'right-0'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            playNextInQueue(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5 text-purple-400" />
                          <span>{isRTL ? 'تشغيل التالية' : 'Play Next'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            addToQueue(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
                        >
                          <ListPlus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isRTL ? 'إضافة لقائمة الانتظار' : 'Add to Queue'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
