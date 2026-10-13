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
  Download,
  CheckCircle2,
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

  const downloadFavoritesOffline = usePlayerStore((state) => state.downloadFavoritesOffline);
  const downloadAllProgress = usePlayerStore((state) => state.downloadAllProgress);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const savedFavoritesCount = useMemo(() => {
    const saved = new Set(downloadedTrackIds);
    return favoriteTracks.reduce((n, t) => (saved.has(t.id) ? n + 1 : n), 0);
  }, [favoriteTracks, downloadedTrackIds]);
  const allFavoritesSaved = favoriteTracks.length > 0 && savedFavoritesCount === favoriteTracks.length;

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
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-[calc(185px+env(safe-area-inset-bottom,20px))] md:pb-24 space-y-6 select-none" dir={dir}>
      {/* 1. Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl apple-glass-card p-4 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform-gpu">
        <div
          className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full pointer-events-none transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(250,36,60,0.18) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-3.5 sm:gap-6 text-start">
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
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 sm:mt-2 font-medium flex items-center justify-start gap-2 flex-wrap">
              <span>{favoriteTracks.length} {isRTL ? 'أغنية' : 'tracks'}</span>
              <span>•</span>
              <span className="text-zinc-400">{formattedTotalDuration}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">Studio Master Hi-Fi</span>
            </p>

            {/* Quick Actions */}
            <div className="flex items-center justify-start gap-2.5 sm:gap-3 mt-3.5 sm:mt-5 flex-wrap">
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

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => downloadFavoritesOffline()}
                disabled={favoriteTracks.length === 0 || !!downloadAllProgress || allFavoritesSaved}
                title={isRTL ? 'حفظ المفضلة للاستماع بدون إنترنت' : 'Save favorites for offline listening'}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
              >
                {allFavoritesSaved ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>
                  {allFavoritesSaved
                    ? isRTL ? 'محفوظة أوفلاين' : 'Saved offline'
                    : isRTL ? `حفظ أوفلاين (${favoriteTracks.length - savedFavoritesCount})` : `Save offline (${favoriteTracks.length - savedFavoritesCount})`}
                </span>
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
        <div className="rounded-2xl apple-glass-card border border-white/[0.08] p-2.5 sm:p-5 shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
          {/* Table Header (Desktop 6-Column Unified Grid) */}
          <div className="hidden md:grid grid-cols-[44px_minmax(220px,2fr)_minmax(140px,1fr)_130px_110px_84px] items-center gap-4 px-4 py-3 border-b border-white/[0.08] text-xs font-extrabold text-white/55 uppercase tracking-wider select-none">
            <span className="text-center font-mono">#</span>
            <span>{isRTL ? 'المسار والفنان' : 'Track & Artist'}</span>
            <span>{isRTL ? 'الألبوم' : 'Album'}</span>
            <span className="text-center">{isRTL ? 'التوافق الموسيقي' : 'BPM / Key'}</span>
            <span className="text-center">{isRTL ? 'مستوى الطاقة' : 'Energy'}</span>
            <span className="text-end font-mono flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" />
              <span>{isRTL ? 'المدة' : 'Time'}</span>
            </span>
          </div>

          {/* Track Rows */}
          <div className="divide-y divide-white/[0.02] pt-1">
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
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '64px' }}
                  className={`group h-16 min-h-[64px] grid grid-cols-[28px_1fr_auto] md:grid-cols-[44px_minmax(220px,2fr)_minmax(140px,1fr)_130px_110px_84px] items-center gap-2 sm:gap-4 px-2.5 sm:px-4 rounded-2xl cursor-pointer transition-all duration-150 select-none active:scale-[0.99] my-1 ${
                    isCurrent
                      ? 'bg-white/[0.12] border border-[#FA243C]/45 shadow-[0_4px_24px_rgba(250,36,60,0.18)]'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.08]'
                  }`}
                >
                  {/* 1. Track Index / Soundbar / Play Button */}
                  <div className="text-center flex items-center justify-center">
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
                      className="hidden md:group-hover:flex items-center justify-center w-6 h-6 rounded-full text-white cursor-pointer active:scale-90"
                    >
                      {isRowPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                      )}
                    </button>

                    <div className="md:group-hover:hidden flex items-center justify-center">
                      {isRowPlaying ? (
                        <div className="flex items-end gap-[2px] h-3.5">
                          <span className="w-1 bg-[#FA243C] rounded-full aura-soundbar-1 h-full" />
                          <span className="w-1 bg-[#FF375F] rounded-full aura-soundbar-2 h-2/3" />
                          <span className="w-1 bg-[#FA243C] rounded-full aura-soundbar-3 h-4/5" />
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

                  {/* 2. Cover + Title & Artist */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-sm flex-shrink-0">
                      <img
                        src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.svg';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs sm:text-[14px] font-bold truncate tracking-tight leading-snug ${
                          isCurrent ? 'text-[#FA243C]' : 'text-white'
                        }`}
                      >
                        <bdi dir="auto">{track.title}</bdi>
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/60 truncate mt-0.5">
                        <span className="truncate font-medium">
                          <bdi dir="auto">{track.artist}</bdi>
                        </span>
                        <span className="md:hidden text-white/40 font-mono tabular-nums">• {formatTime(track.duration)}</span>
                        <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/[0.06] border border-white/10 text-zinc-400 tracking-wider">
                          Lossless
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Album */}
                  <div className="hidden md:block text-xs text-white/60 truncate leading-relaxed">
                    <bdi dir="auto">{track.album || track.genre || 'Single'}</bdi>
                  </div>

                  {/* 4. BPM & Camelot Badge */}
                  <div className="hidden md:flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono font-medium text-zinc-300">
                      <span className="text-[#FF375F] font-bold">
                        {track.bpm || (115 + (Math.abs(track.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 30))}
                      </span>
                      <span className="text-white/35 text-[10px]">BPM</span>
                      <span className="text-white/20">•</span>
                      <span className="text-amber-400 font-bold">
                        {track.key || `${(Math.abs(track.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 12) + 1}${['A', 'B'][Math.abs(track.id.length) % 2]}`}
                      </span>
                    </span>
                  </div>

                  {/* 5. Mini Waveform / Energy Bars */}
                  <div className="hidden md:flex items-center justify-center gap-[2.5px] h-4">
                    {[0.35, 0.65, 0.9, 0.45, 0.8, 1.0, 0.55, 0.85, 0.4, 0.75, 0.5, 0.95].map((val, bIdx) => (
                      <span
                        key={bIdx}
                        style={{
                          height: isCurrent && isPlaying ? `${Math.max(25, Math.min(100, val * 100 * (0.7 + (bIdx % 3) * 0.2)))}%` : `${val * 65}%`,
                        }}
                        className={`w-[3px] rounded-full transition-all duration-300 ${
                          isCurrent && isPlaying
                            ? 'bg-gradient-to-t from-[#FA243C] to-[#FF375F] animate-pulse'
                            : isCurrent
                            ? 'bg-[#FA243C]/60'
                            : 'bg-white/20 group-hover:bg-white/35'
                        }`}
                      />
                    ))}
                  </div>

                  {/* 6. Clustered Actions: Favorite Heart + Duration + More Menu */}
                  <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
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
                      <Heart className="w-4 h-4 fill-[#FA243C] drop-shadow-[0_0_8px_rgba(250,36,60,0.5)]" />
                    </button>

                    <span className="hidden md:inline-block text-xs font-mono tabular-nums text-white/50 min-w-[34px] text-right">
                      {formatTime(track.duration)}
                    </span>

                    <div className="relative flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuTrackId(isMenuOpen ? null : track.id);
                        }}
                        className="w-7 h-7 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute z-30 top-8 w-44 bg-[#0e0e16]/98 border border-white/[0.15] rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl ${
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
