import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { MobileTrackRow } from './common/MobileTrackRow';
import { TrackActionSheet } from './library/TrackActionSheet';
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
  Trash2,
} from 'lucide-react';
import { formatTime } from './player/TimelineSlider';
import { Track } from '../types';

interface FavoritesViewProps {
  onOpenImport?: () => void;
  onExplore?: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ onOpenImport, onExplore }) => {
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
  const clearFavorites = usePlayerStore((state) => state.clearFavorites);
  const addToast = usePlayerStore((state) => state.addToast);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const openAlbum = usePlayerStore((state) => state.openAlbum);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

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

  // Progressive loading for 120fps Mobile view
  const [mobileDisplayLimit, setMobileDisplayLimit] = useState(35);
  const mobileLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const desktopLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileDisplayLimit(35);
  }, [searchQuery, favorites]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMobileDisplayLimit((prev) => Math.min(prev + 35, displayedTracks.length));
        }
      },
      { rootMargin: '300px' }
    );
    if (mobileLoadMoreRef.current) observer.observe(mobileLoadMoreRef.current);
    if (desktopLoadMoreRef.current) observer.observe(desktopLoadMoreRef.current);
    return () => observer.disconnect();
  }, [displayedTracks.length]);

  const progressiveMobileTracks = useMemo(() => {
    return displayedTracks.slice(0, mobileDisplayLimit);
  }, [displayedTracks, mobileDisplayLimit]);

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
    <div className="w-full max-w-7xl mx-auto py-1 sm:py-2 pb-6 md:pb-24 space-y-2.5 sm:space-y-4 select-none overflow-x-hidden" dir={dir}>
      {/* 1. Mobile Clean Header & Actions (Apple Music 44px Dual Button Layout) */}
      <div className="sm:hidden space-y-3 pt-1 pb-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs text-zinc-400 font-medium tabular-nums">
            {favoriteTracks.length} {isRTL ? 'أغنية' : 'tracks'} • {formattedTotalDuration}
          </span>
          <button
            type="button"
            onClick={() => downloadFavoritesOffline()}
            disabled={favoriteTracks.length === 0 || !!downloadAllProgress || allFavoritesSaved}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
          >
            {allFavoritesSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-medium">{allFavoritesSaved ? (isRTL ? 'محفوظة' : 'Saved') : (isRTL ? 'تحميل' : 'Download')}</span>
          </button>
        </div>

        {/* Two Equal Action Buttons (44px height, rounded-xl) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handlePlayAll}
            disabled={favoriteTracks.length === 0}
            className="h-11 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-black/40 active:scale-95 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-black text-black" />
            <span>{isRTL ? 'تشغيل' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={handleShufflePlay}
            disabled={favoriteTracks.length === 0}
            className="h-11 rounded-xl bg-[#242424] hover:bg-[#2e2e2e] border border-white/[0.08] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4 text-zinc-300" />
            <span>{isRTL ? 'عشوائي' : 'Shuffle'}</span>
          </button>
        </div>
      </div>

      {/* Desktop Grand Hero Banner (sm:block hidden) */}
      <div className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#2C1E5E]/50 via-[#181818] to-[#121212] border border-white/[0.06] p-6 sm:p-8 shadow-2xl shadow-black/50 transform-gpu">
        <div
          className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full pointer-events-none transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(69,10,245,0.12) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-3.5 sm:gap-6 text-start">
          {/* Heart Art Tile */}
          <div className="w-20 h-20 sm:w-40 sm:h-40 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#450AF5] via-[#5E3AE8] to-[#8E8EE5] flex items-center justify-center flex-shrink-0 shadow-2xl shadow-black/50 border border-white/20">
            <Heart className="w-10 h-10 sm:w-20 sm:h-20 fill-white text-white drop-shadow-md" />
          </div>

          {/* Playlist Info */}
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-[#B3B3B3] inline-block mb-1.5 sm:mb-2">
              {isRTL ? 'قائمة تشغيل خاصة' : 'Personal Playlist'}
            </span>
            <h1 className="text-xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {isRTL ? 'أغانيك المفضلة' : 'Liked Songs'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 sm:mt-2 font-medium flex items-center justify-start gap-2 flex-wrap">
              <span>{favoriteTracks.length} {isRTL ? 'أغنية' : 'tracks'}</span>
              <span>•</span>
              <span className="text-zinc-400">{formattedTotalDuration}</span>
            </p>

            {/* Quick Actions with 0ms Tactile Feedback */}
            <div className="flex items-center justify-start gap-2.5 sm:gap-3 mt-3.5 sm:mt-5 flex-wrap">
              <button
                type="button"
                onClick={handlePlayAll}
                disabled={favoriteTracks.length === 0}
                className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-black/40 active:scale-[0.93] transition-colors duration-75 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Play className="w-4 h-4 fill-black text-black" />
                <span>{isRTL ? 'تشغيل الكل' : 'Play All'}</span>
              </button>

              <button
                type="button"
                onClick={handleShufflePlay}
                disabled={favoriteTracks.length === 0}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-[#242424] hover:bg-[#2e2e2e] border border-white/[0.1] text-white font-bold text-xs sm:text-sm flex items-center gap-2 active:scale-[0.93] transition-colors duration-75 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Shuffle className="w-4 h-4 text-zinc-300" />
                <span>{isRTL ? 'خلط عشوائي' : 'Shuffle'}</span>
              </button>

              <button
                type="button"
                onClick={() => downloadFavoritesOffline()}
                disabled={favoriteTracks.length === 0 || !!downloadAllProgress || allFavoritesSaved}
                title={isRTL ? 'حفظ المفضلة للاستماع بدون إنترنت' : 'Save favorites for offline listening'}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-[#242424] hover:bg-[#2E2E2E] text-white border border-white/10 font-bold text-xs sm:text-sm flex items-center gap-2 active:scale-[0.93] transition-colors duration-75 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
              >
                {allFavoritesSaved ? <CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> : <Download className="w-4 h-4" />}
                <span>
                  {allFavoritesSaved
                    ? isRTL ? 'محفوظة أوفلاين' : 'Saved offline'
                    : isRTL ? `حفظ أوفلاين (${favoriteTracks.length - savedFavoritesCount})` : `Save offline (${favoriteTracks.length - savedFavoritesCount})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Toolbar */}
      {favoriteTracks.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className={`w-3.5 h-3.5 text-zinc-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'ابحث داخل أغانيك المفضلة...' : 'Search within favorites...'}
              style={{ fontSize: '16px' }}
              className={`w-full h-9 sm:h-10 py-1.5 bg-white/[0.04] border border-white/[0.08] focus:border-white/20 rounded-xl text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors [-webkit-appearance:none] [appearance:none] [&::-webkit-search-cancel-button]:hidden ${
                isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
              }`}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-zinc-400 font-bold">
              {displayedTracks.length} {isRTL ? 'مسار' : 'tracks'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(isRTL ? 'هل تريد بالتأكيد إفراغ قائمة المفضلة بالكامل؟' : 'Are you sure you want to clear all favorites?')) {
                  clearFavorites();
                }
              }}
              className="h-8 px-2.5 rounded-xl bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title={isRTL ? 'تفريغ المفضلة' : 'Clear favorites'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'تفريغ' : 'Clear'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Empty State or Track Table */}
      {favoriteTracks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#181818] border border-white/[0.06] backdrop-blur-md">
          <div className="w-20 h-20 rounded-full bg-[#242424] text-[#B3B3B3] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {isRTL ? 'لا توجد أغانٍ في المفضلة بعد' : 'No favorite songs yet'}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
            {isRTL
              ? 'اضغط على زر (+) بجانب أي أغنية في مكتبتك لإضافتها إلى أغانيك المفضلة والوصول إليها فوراً.'
              : 'Tap the (+) button next to any track in your library to add it to your Liked Songs for instant access.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <button
              onClick={() => usePlayerStore.getState().setActiveTab('search')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold shadow-md shadow-black/40 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isRTL ? 'استكشف الأغاني في البحث' : 'Explore & Search'}</span>
            </button>
            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#242424] hover:bg-[#2e2e2e] border border-white/[0.1] text-white text-xs font-bold transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <span>{isRTL ? 'استيراد أغانٍ من جهازي' : 'Import Local Songs'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Mobile Fast Track List (120fps Native Rows + Swipe-to-Queue) */}
          <div className="block md:hidden space-y-1">
            {progressiveMobileTracks.map((track) => (
              <MobileTrackRow
                key={track.id}
                track={track}
                trackList={favoriteTracks}
                onOpenActionSheet={(t) => setActionSheetTrack(t)}
              />
            ))}
            {/* Sentinel for progressive infinite loading on mobile */}
            {progressiveMobileTracks.length < displayedTracks.length && (
              <div ref={mobileLoadMoreRef} className="h-10 w-full flex items-center justify-center py-2">
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-[#1DB954] animate-spin" />
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl apple-glass-card border border-white/[0.08] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
            {/* Table Header (Desktop Proportional Unified Grid) */}
            <div className="grid grid-cols-[44px_minmax(240px,3fr)_minmax(140px,1.5fr)_auto] items-center gap-4 px-4 py-3 border-b border-white/[0.08] text-xs font-extrabold text-white/55 uppercase tracking-wider select-none">
              <span className="text-center font-mono">#</span>
              <span>{isRTL ? 'المسار والفنان' : 'Track & Artist'}</span>
              <span>{isRTL ? 'الألبوم' : 'Album'}</span>
              <span className="text-end font-mono flex items-center justify-end gap-1 pe-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{isRTL ? 'المدة' : 'Time'}</span>
              </span>
            </div>

            {/* Track Rows */}
            <div className="divide-y divide-white/[0.02] pt-1">
            {progressiveMobileTracks.map((track, idx) => {
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
                  className={`group h-16 min-h-[64px] grid grid-cols-[28px_1fr_auto] md:grid-cols-[44px_minmax(240px,3fr)_minmax(140px,1.5fr)_auto] items-center gap-2 sm:gap-4 px-2.5 sm:px-4 rounded-2xl cursor-pointer transition-transform duration-150 select-none active:scale-[0.99] my-1 ${
                    isCurrent
                      ? 'bg-white/[0.08] border border-white/10 shadow-lg shadow-black/30'
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
                          <span className="w-1 bg-[#1DB954] rounded-full aura-soundbar-1 h-full" />
                          <span className="w-1 bg-[#1DB954] rounded-full aura-soundbar-2 h-full" />
                          <span className="w-1 bg-[#1DB954] rounded-full aura-soundbar-3 h-full" />
                          <span className="w-1 bg-[#1DB954] rounded-full aura-soundbar-4 h-full" />
                        </div>
                      ) : (
                        <span
                          className={`text-xs font-mono font-bold ${
                            isCurrent ? 'text-[#1DB954]' : 'text-zinc-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. Cover + Title & Artist */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-sm flex-shrink-0 shrink-0 aspect-square">
                      <img
                        src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                        alt={track.title}
                        className="w-full h-full object-cover shrink-0 aspect-square group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.svg';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs sm:text-[14px] font-bold truncate tracking-tight leading-snug ${
                          isCurrent ? 'text-[#1DB954]' : 'text-white'
                        }`}
                      >
                        <bdi dir="auto">{track.title}</bdi>
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/60 truncate mt-0.5">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (track.artist) openArtist(track.artist);
                          }}
                          className="truncate font-medium hover:text-white hover:underline cursor-pointer transition-colors"
                        >
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
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (track.album) openAlbum(track.album, track.artist);
                      }}
                      className={track.album ? 'hover:text-white hover:underline cursor-pointer transition-colors' : ''}
                    >
                      <bdi dir="auto">{track.album || track.genre || 'Single'}</bdi>
                    </span>
                  </div>

                  {/* 4. Clustered Actions: Add to Queue + Favorite Heart + Duration + More Menu */}
                  <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        addToQueue(track);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-90"
                      title={isRTL ? 'إضافة إلى قائمة الانتظار' : 'Add to Queue'}
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        toggleFavorite(track.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/[0.08] text-[#1DB954] transition-colors cursor-pointer active:scale-125"
                      title={isRTL ? 'إزالة من المفضلة' : 'Remove from favorites'}
                    >
                      <Heart className="w-4 h-4 fill-[#1DB954]" />
                    </button>

                    <span className="hidden md:inline-block text-xs font-mono tabular-nums text-white/50 min-w-[34px] text-right">
                      {formatTime(track.duration)}
                    </span>

                    <div className="relative flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.innerWidth < 768) {
                            setActionSheetTrack(track);
                          } else {
                            setActiveMenuTrackId(isMenuOpen ? null : track.id);
                          }
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
          {/* Sentinel for progressive infinite loading on desktop */}
          {progressiveMobileTracks.length < displayedTracks.length && (
            <div ref={desktopLoadMoreRef} className="h-10 w-full flex items-center justify-center py-2">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-[#1DB954] animate-spin" />
            </div>
          )}
        </div>
      </div>
    )}

      {/* Track Action Sheet */}
      <TrackActionSheet
        track={actionSheetTrack}
        isOpen={!!actionSheetTrack}
        onClose={() => setActionSheetTrack(null)}
      />
    </div>
  );
};
