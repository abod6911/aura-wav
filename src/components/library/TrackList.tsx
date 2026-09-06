import React, { useState, useMemo } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Track } from '../../types';
import {
  Search,
  FolderOpen,
  Heart,
  Music,
  Sparkles,
  Filter,
  X,
  Play,
  Pause,
  MoreHorizontal,
  Radio,
  ListPlus,
  Shuffle,
  Clock,
  ArrowUpDown,
  Mic2,
  HardDrive,
  Download,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { formatTime } from '../player/TimelineSlider';
import { motion } from 'framer-motion';

interface TrackListProps {
  onOpenImport: () => void;
}

type SortOption = 'number' | 'title' | 'artist' | 'duration';

export const TrackList: React.FC<TrackListProps> = ({ onOpenImport }) => {
  const tracks = usePlayerStore((state) => state.tracks);
  const searchQuery = usePlayerStore((state) => state.searchQuery);
  const setSearchQuery = usePlayerStore((state) => state.setSearchQuery);
  const favorites = usePlayerStore((state) => state.favorites);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const activeMood = usePlayerStore((state) => state.activeMood);
  const setActiveMood = usePlayerStore((state) => state.setActiveMood);

  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'lyrics'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('number');

  // Filter tracks
  const filtered = useMemo(() => {
    let list = [...tracks];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q) ||
          (t.trackNumber && String(t.trackNumber).includes(q))
      );
    }

    // Category filter
    if (activeFilter === 'favorites') {
      list = list.filter((t) => favorites.includes(t.id));
    } else if (activeFilter === 'lyrics') {
      list = list.filter((t) => t.syncedLyrics && t.syncedLyrics.length > 0);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'number') {
        const numA = a.trackNumber || 9999;
        const numB = b.trackNumber || 9999;
        return numA - numB;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'artist') {
        return a.artist.localeCompare(b.artist);
      }
      if (sortBy === 'duration') {
        return b.duration - a.duration;
      }
      return 0;
    });

    return list;
  }, [tracks, searchQuery, activeFilter, sortBy, favorites]);

  // Handle Play All
  const handlePlayAll = () => {
    if (filtered.length > 0) {
      playTrack(filtered[0], filtered);
    }
  };

  // Handle Shuffle Play
  const handleShufflePlay = () => {
    if (filtered.length > 0) {
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  // Total duration calculation
  const totalSeconds = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [tracks]);

  const formattedTotalTime = useMemo(() => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${mins} دقيقة`;
  }, [totalSeconds]);

  // 4 covers mosaic for hero banner
  const heroCovers = useMemo(() => {
    return tracks.slice(0, 4).map((t) => t.artworkUrl || '/logo.svg');
  }, [tracks]);

  return (
    <div className="space-y-8 pb-32 md:pb-32 w-full max-w-full">
      {/* 1. Grand Editorial Hero Banner (Apple Music / Spotify Style) */}
      {tracks.length > 0 ? (
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent border border-white/[0.08] backdrop-blur-2xl shadow-2xl">
          {/* Subtle Dynamic Ambient Backlight */}
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-6 md:gap-8">
            {/* Mosaic 4-Art Cover */}
            <div className="w-28 h-28 sm:w-40 sm:h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.8)] border border-white/15 flex-shrink-0 grid grid-cols-2 grid-rows-2 bg-[#121218]">
              {heroCovers.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Cover ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.svg';
                  }}
                />
              ))}
            </div>

            {/* Playlist Editorial Metadata */}
            <div className="flex-1 text-center md:text-right space-y-2 sm:space-y-3 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] sm:text-xs font-semibold">
                <HardDrive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>مكتبة محلية 100% أوفلاين</span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                مكتبتي الموسيقية
              </h1>

              <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-none">
                مجموعتك الخاصة كاملة مع أغلفة الألبومات الأصلية عالية الدقة والكلمات المتزامنة، مع تقنية الدمج الاحترافي True DJ AutoMix دون أي انقطاع.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-4 text-[11px] sm:text-xs font-medium text-zinc-400 pt-0.5">
                <span className="text-white font-bold">{tracks.length} مسار</span>
                <span>•</span>
                <span>{formattedTotalTime}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">جاهز للتشغيل</span>
              </div>
            </div>

            {/* Play & Shuffle Big Action Controls */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayAll}
                className="h-11 sm:h-14 px-5 sm:px-8 rounded-full bg-white text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 sm:gap-3 shadow-[0_0_35px_rgba(255,255,255,0.25)] hover:bg-zinc-200 transition-all"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
                <span>تشغيل الكل</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShufflePlay}
                className="h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white flex items-center justify-center transition-all"
                title="خلط عشوائي"
              >
                <Shuffle className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" />
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Hero CTA */
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-gradient-to-b from-indigo-950/30 to-[#0c0c12] border border-white/[0.08] text-center space-y-4">
          <FolderOpen className="w-14 h-14 mx-auto text-indigo-400 animate-bounce" />
          <h2 className="text-2xl md:text-3xl font-black text-white">لا توجد أغانٍ محملة حالياً</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            قم باستيراد مجلد أغانيك المحلي <code className="text-indigo-300 bg-white/10 px-2 py-0.5 rounded font-mono">Liked_Songs</code> للاستماع فوراً بدون اتصال مع كافة الأغلفة.
          </p>
          <button
            onClick={onOpenImport}
            className="px-8 py-3.5 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all shadow-xl"
          >
            استيراد المجلد المحلي (261 أغنية)
          </button>
        </div>
      )}

      {/* 2. Controls, Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
          <input
            id="library-search-input"
            type="text"
            placeholder="ابحث برقم المسار، العنوان، الفنان، أو الألبوم... (اضغط / للبحث)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl py-2.5 pr-10 pl-10 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-3 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills & Sort Selector */}
        <div className="flex flex-wrap items-center gap-2 select-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeFilter === 'all'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>الكل ({tracks.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('favorites')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeFilter === 'favorites'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>المفضلة ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('lyrics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeFilter === 'lyrics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>بكلمات متزامنة</span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="number" className="bg-[#121218] text-white">الترتيب: الرقم #</option>
              <option value="title" className="bg-[#121218] text-white">الترتيب: العنوان (A-Z)</option>
              <option value="artist" className="bg-[#121218] text-white">الترتيب: اسم الفنان</option>
              <option value="duration" className="bg-[#121218] text-white">الترتيب: الأطول مدة</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2.5 YouTube Music Mood & Activity Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none scrollbar-none">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1 flex-shrink-0">
            أجواء ومزاج:
          </span>
          {[
            { id: 'energize', label: '⚡ حماسي وطاقة' },
            { id: 'relax', label: '☕ استرخاء وهدوء' },
            { id: 'focus', label: '🎯 تركيز ومذاكرة' },
            { id: 'commute', label: '🚗 طريق وسفر' },
            { id: 'party', label: '🎉 حفلة ورقص' },
          ].map((m) => {
            const isSelected = activeMood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMood(isSelected ? null : m.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-white/20 shadow-lg shadow-indigo-600/30 scale-105'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.06]'
                }`}
              >
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Mood Radio Banner */}
        {activeMood && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-[#0e0e14] border border-indigo-500/30 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                تم تفعيل وضع المزاج: {filtered.length} مسار متوافق
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayAll}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>تشغيل راديو هذا المزاج</span>
              </button>
              <button
                onClick={() => setActiveMood(null)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Balanced Track Table (Strict LTR for Optical Perfection) */}
      <div dir="ltr" className="w-full max-w-full">
        {/* Table Column Headers (Desktop) */}
        <div className="hidden md:grid grid-cols-[44px_56px_minmax(220px,2fr)_minmax(140px,1.2fr)_40px_40px_70px_44px] items-center gap-4 px-4 py-3 text-xs font-bold text-zinc-400 border-b border-white/[0.08] select-none uppercase tracking-wider">
          <span className="text-center font-mono">#</span>
          <span>Cover</span>
          <span>Title & Artist</span>
          <span>Album</span>
          <span className="text-center" title="حفظ للتشغيل بدون إنترنت">
            <Download className="w-3.5 h-3.5 mx-auto opacity-70" />
          </span>
          <span className="text-center">
            <Heart className="w-3.5 h-3.5 mx-auto opacity-70" />
          </span>
          <span className="text-right font-mono flex items-center justify-end gap-1">
            <Clock className="w-3 h-3" />
            <span>Time</span>
          </span>
          <span />
        </div>

        {/* Track Rows List */}
        {filtered.length > 0 ? (
          <div className="divide-y divide-white/[0.02] pt-1">
            {filtered.map((track, idx) => (
              <TrackTableRow
                key={track.id}
                track={track}
                index={idx}
                allFilteredTracks={filtered}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-3 bg-white/[0.01] border border-dashed border-white/[0.06] rounded-3xl mt-4">
            <Filter className="w-10 h-10 mx-auto text-zinc-600" />
            <h4 className="text-base font-bold text-white">لم يتم العثور على أي نتائج</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery
                ? `لا توجد مسارات مطابقة لبحثك عن "${searchQuery}".`
                : 'لا توجد مسارات متوفرة في هذا التصنيف.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface TrackTableRowProps {
  track: Track;
  index: number;
  allFilteredTracks: Track[];
}

const TrackTableRow: React.FC<TrackTableRowProps> = ({ track, index, allFilteredTracks }) => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const downloadTrackForOffline = usePlayerStore((state) => state.downloadTrackForOffline);
  const setChangeArtworkModal = usePlayerStore((state) => state.setChangeArtworkModal);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);
  const isDownloaded = downloadedTrackIds.includes(track.id);

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlayPause();
    } else {
      playTrack(track, allFilteredTracks);
    }
  };

  const displayIndex = track.trackNumber !== undefined ? track.trackNumber : index + 1;

  return (
    <div
      onClick={handleRowClick}
      className={`group grid grid-cols-[24px_42px_1fr_32px_44px] md:grid-cols-[44px_56px_minmax(220px,2fr)_minmax(140px,1.2fr)_40px_40px_70px_44px] items-center gap-2 sm:gap-4 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
        isCurrent
          ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/30 shadow-[0_4px_24px_rgba(99,102,241,0.18)]'
          : 'hover:bg-white/[0.05] border border-transparent'
      }`}
    >
      {/* 1. Track Index # or Live Equalizer */}
      <div className="text-center flex items-center justify-center">
        {isCurrent && isPlaying ? (
          <div className="flex items-end gap-[2px] h-3.5">
            <span className="w-1 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite] h-full" />
            <span className="w-1 bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite] h-2/3" />
            <span className="w-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite] h-4/5" />
          </div>
        ) : (
          <span
            className={`text-xs font-mono md:group-hover:hidden transition-colors ${
              isCurrent ? 'text-indigo-400 font-bold' : 'text-zinc-500'
            }`}
          >
            {displayIndex}
          </span>
        )}
        <Play className="w-3.5 h-3.5 text-white hidden md:group-hover:block fill-white" />
      </div>

      {/* 2. High-Res Official Album Artwork */}
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-sm flex-shrink-0">
        <img
          src={track.artworkUrl || '/logo.svg'}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/logo.svg';
          }}
        />
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
            <Pause className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>

      {/* 3. Title & Artist (Clean LTR Flow) */}
      <div className="min-w-0 pr-1 sm:pr-2">
        <h4
          dir="auto"
          className={`text-xs sm:text-[15px] font-bold truncate tracking-tight ${
            isCurrent ? 'text-indigo-300' : 'text-white group-hover:text-indigo-100'
          }`}
        >
          {track.title}
        </h4>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
          <span dir="auto" className="truncate">{track.artist}</span>
          {isDownloaded && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30 font-bold flex-shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>أوفلاين</span>
            </span>
          )}
          {track.syncedLyrics && track.syncedLyrics.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold tracking-wider uppercase flex-shrink-0">
              LYRICS
            </span>
          )}
        </div>
      </div>

      {/* 4. Album (Desktop Only) */}
      <div dir="auto" className="hidden md:block text-xs text-zinc-400 truncate">
        {track.album || 'Single'}
      </div>

      {/* 5. Offline Download Button (Desktop) */}
      <div className="text-center hidden md:block">
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadTrackForOffline(track.id);
          }}
          className="p-2 rounded-full hover:bg-white/10 transition-transform active:scale-125"
          title={isDownloaded ? 'محفوظ أوفلاين ⚡' : 'حفظ للتشغيل بدون إنترنت'}
          aria-label="Download track offline"
        >
          {isDownloaded ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Download className="w-4 h-4 text-zinc-600 hover:text-indigo-300 transition-colors" />
          )}
        </button>
      </div>

      {/* 6. Favorite Heart Button */}
      <div className="text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track.id);
          }}
          className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-transform active:scale-125"
          aria-label="Toggle favorite"
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
              isFav ? 'text-red-500 fill-red-500' : 'text-zinc-600 hover:text-zinc-300'
            }`}
          />
        </button>
      </div>

      {/* 7. Duration */}
      <div className="text-[11px] sm:text-xs font-mono text-zinc-400 text-right tabular-nums">
        {formatTime(track.duration)}
      </div>

      {/* 8. Context Menu (Touch & Desktop) */}
      <div className="relative group/menu">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          aria-label="Track options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <div
          className={`${
            isMenuOpen ? 'block' : 'hidden md:group-hover/menu:block'
          } absolute right-0 top-8 z-30 w-52 bg-[#12121a] border border-white/[0.12] rounded-2xl p-1.5 shadow-2xl space-y-1 backdrop-blur-xl`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              playNextInQueue(track);
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>تشغيل التالي مباشرة</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToQueue(track);
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>إضافة إلى قائمة الانتظار</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setChangeArtworkModal(true, track);
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
            <span>تغيير الغلاف والبحث أونلاين 🎨</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadTrackForOffline(track.id);
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            {isDownloaded ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>محفوظ أوفلاين في الذاكرة ⚡</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>حفظ للتشغيل بدون إنترنت</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
