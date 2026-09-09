import React, { useState, useMemo, useEffect } from 'react';
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
  Image as ImageIcon,
  ArrowUp
} from 'lucide-react';
import { formatTime } from '../player/TimelineSlider';
import { motion } from 'framer-motion';

interface TrackListProps {
  onOpenImport: () => void;
}

type SortOption = 'number' | 'title' | 'artist' | 'duration';

export type RangeOption = 'all' | '1-100' | '101-250' | '251-500' | '501-1000' | '1001-1750';

export const TrackList: React.FC<TrackListProps> = ({ onOpenImport }) => {
  const tracks = usePlayerStore((state) => state.tracks);
  const searchQuery = usePlayerStore((state) => state.searchQuery);
  const setSearchQuery = usePlayerStore((state) => state.setSearchQuery);
  const favorites = usePlayerStore((state) => state.favorites);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const activeMood = usePlayerStore((state) => state.activeMood);
  const setActiveMood = usePlayerStore((state) => state.setActiveMood);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const downloadAllProgress = usePlayerStore((state) => state.downloadAllProgress);
  const cacheAllAvailableTracksOffline = usePlayerStore((state) => state.cacheAllAvailableTracksOffline);

  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'lyrics' | 'offline'>('all');
  const [activeRange, setActiveRange] = useState<RangeOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('number');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const readyOfflineCount = useMemo(() => {
    return tracks.filter((t) => !!(t.blob || t.file || downloadedTrackIds.includes(t.id))).length;
  }, [tracks, downloadedTrackIds]);

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
    } else if (activeFilter === 'offline') {
      list = list.filter((t) => !!(t.blob || t.file || downloadedTrackIds.includes(t.id)));
    }

    // Range filter (active when not searching)
    if (!searchQuery.trim() && activeRange !== 'all') {
      const [start, end] = activeRange.split('-').map(Number);
      list = list.filter((t) => {
        const num = t.trackNumber ?? 99999;
        return num >= start && num <= end;
      });
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
  }, [tracks, searchQuery, activeFilter, activeRange, sortBy, favorites, downloadedTrackIds]);

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

  // Featured tracks for Apple Music / Spotify style editorial shelf
  const featuredTracks = useMemo(() => {
    if (tracks.length === 0) return [];
    const favs = tracks.filter((t) => favorites.includes(t.id));
    if (favs.length >= 6) return favs.slice(0, 6);
    const remaining = tracks.filter((t) => !favorites.includes(t.id));
    return [...favs, ...remaining].slice(0, 6);
  }, [tracks, favorites]);

  return (
    <div className="space-y-8 pb-32 md:pb-32 w-full max-w-full">
      {/* 1. Grand Editorial Hero Banner (Spotify Modern Aesthetic) */}
      {tracks.length > 0 ? (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 bg-gradient-to-b from-[#1c1c1c] via-[#141414] to-[#121212] border border-white/[0.08] backdrop-blur-2xl shadow-2xl">
          {/* Subtle Spotify Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#1DB954]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-3.5 sm:gap-6 md:gap-8">
            {/* Mosaic 4-Art Cover */}
            <div className="w-24 h-24 sm:w-36 sm:h-36 md:w-52 md:h-52 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.8)] border border-white/15 flex-shrink-0 grid grid-cols-2 grid-rows-2 bg-[#121218]">
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
            <div className="flex-1 text-center md:text-right space-y-1.5 sm:space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954] text-[10px] sm:text-xs font-semibold">
                  <HardDrive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>مكتبة محلية 100% أوفلاين</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] sm:text-xs font-semibold">
                  <FolderOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                  <span>المجلد المحفوظ: <strong className="text-white font-bold">{savedFolderName || 'Liked_Songs'}</strong></span>
                </div>

                <button
                  onClick={onOpenImport}
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white text-[10px] sm:text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>تغيير المجلد</span>
                </button>
              </div>

              <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
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
                <span className="text-[#1DB954] font-semibold">محفوظ ويعمل بدون نت 100%</span>
              </div>
            </div>

            {/* Play & Shuffle Big Action Controls */}
            <div className="flex items-center justify-center md:justify-start gap-2.5 sm:gap-3 flex-shrink-0 w-full md:w-auto pt-1 sm:pt-0">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handlePlayAll}
                className="flex-1 md:flex-initial h-11 sm:h-14 px-6 sm:px-8 rounded-full bg-white text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-3 shadow-[0_0_35px_rgba(255,255,255,0.25)] hover:bg-zinc-200 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
                <span>تشغيل الكل</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleShufflePlay}
                className="h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                title="خلط عشوائي"
              >
                <Shuffle className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" />
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Hero CTA */
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-gradient-to-b from-[#1DB954]/15 to-[#0c0c12] border border-white/[0.08] text-center space-y-4">
          <FolderOpen className="w-14 h-14 mx-auto text-[#1DB954] animate-bounce" />
          <h2 className="text-2xl md:text-3xl font-black text-white">لا توجد أغانٍ محملة حالياً</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            قم باستيراد مجلد أغانيك المحلي <code className="text-[#1DB954] bg-white/10 px-2 py-0.5 rounded font-mono">Liked_Songs</code> للاستماع فوراً بدون اتصال مع كافة الأغلفة.
          </p>
          <button
            onClick={onOpenImport}
            className="px-8 py-3.5 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm transition-all shadow-xl cursor-pointer"
          >
            استيراد المجلد المحلي ({tracks.length || 1750} أغنية)
          </button>
        </div>
      )}

      {/* 1.5 Featured Picks Editorial Shelf (Spotify Style) */}
      {tracks.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1DB954]" />
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                مختارات مميزة لك
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-medium">استمع فوراً لأبرز الأغاني</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {featuredTracks.map((t) => (
              <div
                key={t.id}
                onClick={() => playTrack(t, tracks)}
                className="group relative p-3 rounded-2xl bg-[#141414] hover:bg-[#202020] border border-white/[0.06] hover:border-[#1DB954]/40 backdrop-blur-xl transition-all duration-200 cursor-pointer flex flex-col gap-2.5 shadow-lg hover:shadow-[#1DB954]/15 hover:-translate-y-1 select-none"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#151520] shadow-md border border-white/5">
                  <img
                    src={t.artworkUrl || '/logo.svg'}
                    alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-4 h-4 fill-black translate-x-0.5" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#1DB954] transition-colors" dir="auto">
                    {t.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5" dir="auto">
                    {t.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
            className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.08] focus:border-[#1DB954]/60 rounded-2xl py-2.5 pr-10 pl-10 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
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
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilter === 'favorites'
                ? 'bg-[#1DB954] text-black font-extrabold shadow-md shadow-[#1DB954]/25'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>المفضلة ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('lyrics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilter === 'lyrics'
                ? 'bg-[#1DB954] text-black font-extrabold shadow-md shadow-[#1DB954]/25'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>بكلمات متزامنة</span>
          </button>

          <button
            onClick={() => setActiveFilter('offline')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilter === 'offline'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400'
            }`}
            title="إظهار الأغاني الجاهزة للتشغيل أوفلاين في الذاكرة"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>أوفلاين ({readyOfflineCount})</span>
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

      {/* Quick Numeric Range Jump Bar & Bulk Cache Offline Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 select-none scrollbar-none">
          <span className="text-[11px] sm:text-xs font-bold text-zinc-400 flex-shrink-0 pl-1">
            تصفح سريع:
          </span>
          {[
            { id: 'all', label: `الكل (${tracks.length})` },
            { id: '1-100', label: '#1 - 100' },
            { id: '101-250', label: '#101 - 250' },
            { id: '251-500', label: '#251 - 500' },
            { id: '501-1000', label: '#501 - 1000' },
            { id: '1001-1750', label: '#1001 - 1750' },
          ].map((r) => {
            const isSel = activeRange === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setActiveRange(r.id as RangeOption);
                  if (searchQuery) setSearchQuery('');
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isSel
                    ? 'bg-[#1DB954]/20 border-[#1DB954]/40 text-[#1DB954] shadow-sm'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 border-white/[0.06]'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* 1-Click Offline Caching CTA */}
        <button
          onClick={() => cacheAllAvailableTracksOffline()}
          disabled={!!downloadAllProgress || (tracks.length > 0 && readyOfflineCount === tracks.length)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] sm:text-xs font-bold transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
          title="حفظ كافة الأغاني المتوفرة في ذاكرة المتصفح لتعمل بدون نت للأبد"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {downloadAllProgress
              ? `جاري حفظ الأغاني: ${downloadAllProgress.current}/${downloadAllProgress.total}`
              : tracks.length > 0 && readyOfflineCount === tracks.length
              ? 'كل الأغاني محفوظة أوفلاين'
              : `حفظ الكل أوفلاين (${readyOfflineCount}/${tracks.length})`}
          </span>
        </button>
      </div>

      {/* 2.5 YouTube Music Mood & Activity Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none scrollbar-none">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1 flex-shrink-0">
            أجواء ومزاج:
          </span>
          {[
            { id: 'energize', label: 'حماسي وطاقة' },
            { id: 'relax', label: 'استرخاء وهدوء' },
            { id: 'focus', label: 'تركيز ومذاكرة' },
            { id: 'commute', label: 'طريق وسفر' },
            { id: 'party', label: 'حفلة ورقص' },
          ].map((m) => {
            const isSelected = activeMood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMood(isSelected ? null : m.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-[#1DB954] text-black border-[#1DB954] shadow-lg shadow-[#1DB954]/30 scale-105 font-extrabold'
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
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#1DB954]/20 via-[#1DB954]/10 to-[#121212] border border-[#1DB954]/30 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#1DB954] animate-pulse" />
              <span className="text-xs font-bold text-white">
                تم تفعيل وضع المزاج: {filtered.length} مسار متوافق
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayAll}
                className="px-3.5 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-[#1DB954]/25 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>تشغيل راديو هذا المزاج</span>
              </button>
              <button
                onClick={() => setActiveMood(null)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Balanced Track Table Inside Luxury Glass Card Container */}
      <div className="bg-[#0b0b12]/80 border border-white/[0.08] rounded-3xl p-2 sm:p-5 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div dir="ltr" className="w-full max-w-full">
          {/* Table Column Headers (Desktop) */}
          <div className="hidden md:grid grid-cols-[44px_52px_minmax(200px,1.6fr)_minmax(140px,1fr)_44px_44px_70px_44px] items-center gap-4 px-4 py-3 text-xs font-bold text-zinc-400 border-b border-white/[0.06] select-none uppercase tracking-wider">
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
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-3 bg-white/[0.01] border border-dashed border-white/[0.06] rounded-2xl mt-2">
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

      {/* Floating Scroll to Top Action Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, y: 15, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.85 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-4 z-40 px-4 py-2.5 rounded-full bg-[#12121c]/90 border border-white/20 text-white shadow-[0_8px_30px_rgba(0,0,0,0.7)] backdrop-blur-xl flex items-center gap-2 text-xs font-bold hover:bg-white/20 active:scale-95 transition-all cursor-pointer select-none"
          title="العودة للأعلى"
        >
          <ArrowUp className="w-4 h-4 text-[#1DB954]" />
          <span>للأعلى</span>
        </motion.button>
      )}
    </div>
  );
};

interface TrackTableRowProps {
  track: Track;
  index: number;
}

const TrackTableRow: React.FC<TrackTableRowProps> = React.memo(({ track, index }) => {
  const isCurrent = usePlayerStore((state) => state.currentTrack?.id === track.id);
  const isPlaying = usePlayerStore((state) => state.isPlaying && state.currentTrack?.id === track.id);
  const isFav = usePlayerStore((state) => state.favorites.includes(track.id));
  const isDownloaded = usePlayerStore((state) => state.downloadedTrackIds.includes(track.id));

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleRowClick = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
    const store = usePlayerStore.getState();
    if (isCurrent) {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        store.setMobilePlayerOpen(true);
      } else {
        store.togglePlayPause();
      }
    } else {
      store.playTrack(track, store.filteredTracks);
    }
  };

  const displayIndex = track.trackNumber !== undefined ? track.trackNumber : index + 1;

  return (
    <div
      onClick={handleRowClick}
      style={{ touchAction: 'manipulation' }}
      className={`track-item-contained group grid grid-cols-[26px_44px_1fr_32px_40px] md:grid-cols-[44px_52px_minmax(200px,1.6fr)_minmax(140px,1fr)_44px_44px_70px_44px] items-center gap-2 sm:gap-4 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl cursor-pointer transition-all duration-150 select-none active:scale-[0.985] active:bg-white/[0.08] ${
        isCurrent
          ? 'bg-gradient-to-r from-[#1DB954]/20 via-[#1DB954]/10 to-transparent border border-[#1DB954]/35 shadow-[0_4px_24px_rgba(29,185,84,0.18)]'
          : 'hover:bg-white/[0.05] border border-transparent'
      }`}
    >
      {/* 1. Track Index # or Live Equalizer */}
      <div className="text-center flex items-center justify-center">
        {isCurrent && isPlaying ? (
          <div className="flex items-end gap-[2px] h-3.5">
            <span className="w-1 bg-[#1DB954] rounded-full animate-[bounce_0.8s_infinite] h-full" />
            <span className="w-1 bg-[#1DB954] rounded-full animate-[bounce_0.6s_infinite] h-2/3" />
            <span className="w-1 bg-[#1DB954] rounded-full animate-[bounce_1s_infinite] h-4/5" />
          </div>
        ) : (
          <span
            className={`text-xs font-mono md:group-hover:hidden transition-colors ${
              isCurrent ? 'text-[#1DB954] font-black' : 'text-zinc-500'
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
            isCurrent ? 'text-[#1DB954]' : 'text-white group-hover:text-white'
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
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1DB954]/20 text-[#1DB954] font-bold tracking-wider uppercase flex-shrink-0 border border-[#1DB954]/30">
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
            usePlayerStore.getState().downloadTrackForOffline(track.id);
          }}
          className="p-2 rounded-full hover:bg-white/10 transition-transform active:scale-125"
          title={isDownloaded ? 'محفوظ أوفلاين' : 'حفظ للتشغيل بدون إنترنت'}
          aria-label="Download track offline"
        >
          {isDownloaded ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Download className="w-4 h-4 text-zinc-600 hover:text-[#1DB954] transition-colors" />
          )}
        </button>
      </div>

      {/* 6. Favorite Heart Button */}
      <div className="text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            usePlayerStore.getState().toggleFavorite(track.id);
          }}
          className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-transform active:scale-125"
          aria-label="Toggle favorite"
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
              isFav ? 'text-[#1DB954] fill-[#1DB954]' : 'text-zinc-600 hover:text-zinc-300'
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
          } absolute right-0 top-8 z-30 w-52 bg-[#181818] border border-white/[0.12] rounded-2xl p-1.5 shadow-2xl space-y-1 backdrop-blur-xl`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              usePlayerStore.getState().playNextInQueue(track);
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>تشغيل التالي مباشرة</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              usePlayerStore.getState().addToQueue(track);
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>إضافة إلى قائمة الانتظار</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              usePlayerStore.getState().setChangeArtworkModal(true, track);
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>تغيير الغلاف والبحث أونلاين</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              usePlayerStore.getState().downloadTrackForOffline(track.id);
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
          >
            {isDownloaded ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>محفوظ أوفلاين في الذاكرة</span>
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
});
