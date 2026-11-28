import { TrackActionSheet } from './TrackActionSheet';
import { MobileTrackRow } from '../common/MobileTrackRow';
import { PlaylistsView } from '../PlaylistsView';
import { triggerHaptic } from '../../utils/haptics';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerStore } from '../../store/usePlayerStore';
import { isCloudConfigured } from '../../lib/supabase';
import { Track } from '../../types';
import {
  Search,
  FolderOpen,
  Heart,
  Music,
  Filter,
  X,
  Play,
  Pause,
  MoreHorizontal,
  Radio,
  ListPlus,
  Plus,
  Shuffle,
  Clock,
  Mic2,
  CheckCircle2,
  Check,
  Image as ImageIcon,
  ArrowUp,
  Sliders,
  ListEnd,
  Pencil,
  Download,
  AlertCircle,
  Cloud,
  UploadCloud,
  Trash2,
  Users,
  Disc3,
} from 'lucide-react';
import { getAllArtists, getAllAlbums } from '../../utils/catalogSelectors';
import { formatTime } from '../player/TimelineSlider';
import { motion } from 'framer-motion';
import { OptimizedImage } from '../common/OptimizedImage';
import { useTranslation } from '../../i18n/useTranslation';

interface TrackListProps {
  onOpenImport: () => void;
}

type SortOption = 'number' | 'title' | 'artist' | 'duration' | 'most_played';

export type RangeOption = 'all' | '1-100' | '101-250' | '251-500' | '501-1000' | '1001-1750';

export const TrackList: React.FC<TrackListProps> = ({ onOpenImport }) => {
  const { t, isRTL, dir } = useTranslation();
  const rawTracks = usePlayerStore((state) => state.tracks);
  const catalogTracks = usePlayerStore((state) => state.catalogTracks);
  const tracks = useMemo(() => (rawTracks.length > 0 ? rawTracks : catalogTracks), [rawTracks, catalogTracks]);
  const searchQuery = usePlayerStore((state) => state.searchQuery);
  const setSearchQuery = usePlayerStore((state) => state.setSearchQuery);
  const favorites = usePlayerStore((state) => state.favorites);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const setCloudUploaderOpen = usePlayerStore((state) => state.setCloudUploaderOpen);
  const playlists = usePlayerStore((state) => state.playlists);
  const createPlaylist = usePlayerStore((state) => state.createPlaylist);
  const addToast = usePlayerStore((state) => state.addToast);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const openAlbum = usePlayerStore((state) => state.openAlbum);

  const [mobileSubTab, setMobileSubTab] = useState<'tracks' | 'playlists' | 'artists' | 'albums' | 'downloaded'>('tracks');
  const [activeFilter, setActiveFilter] = useState<'all' | 'offline'>('all');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; track: Track } | null>(null);
  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

  const mobileArtists = useMemo(() => {
    return mobileSubTab === 'artists' ? getAllArtists(tracks) : [];
  }, [tracks, mobileSubTab]);

  const mobileAlbums = useMemo(() => {
    return mobileSubTab === 'albums' ? getAllAlbums(tracks) : [];
  }, [tracks, mobileSubTab]);

  const handleCreatePlaylist = async () => {
    const defaultName = isRTL ? `قائمة تشغيل رقم ${playlists.length + 1}` : `My Playlist #${playlists.length + 1}`;
    const name = window.prompt(isRTL ? 'اسم قائمة التشغيل الجديدة:' : 'New playlist name:', defaultName);
    if (name && name.trim()) {
      await createPlaylist(name.trim());
      addToast(isRTL ? `تم إنشاء قائمة "${name.trim()}"` : `Created playlist "${name.trim()}"`, undefined, 'success');
      setMobileSubTab('playlists');
    }
  };

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, { capture: true });
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, { capture: true } as any);
    };
  }, []);

  const handleContextMenu = useCallback((track: Track, clientX?: number, clientY?: number) => {
    if (window.innerWidth < 768 || clientX === undefined) {
      triggerHaptic('light');
      setActionSheetTrack(track);
      setContextMenu(null);
      return;
    }
    const menuWidth = 240;
    const menuHeight = 320;
    let x = clientX;
    let y = clientY || 0;
    
    // Smart Positioning: flip upward if near bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = Math.max(16, y - menuHeight);
    }
    // Flip leftward or clamp if near right edge
    if (x + menuWidth > window.innerWidth) {
      x = Math.max(16, window.innerWidth - menuWidth - 16);
    }
    
    setContextMenu({ x: Math.max(16, x), y: Math.max(16, y), track });
  }, []);



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

    // Mobile Downloaded sub-tab filter
    if (activeFilter === 'offline') {
      list = list.filter((t) => !!(t.blob || t.file || downloadedTrackIds.includes(t.id)));
    }

    // Default canonical order by trackNumber
    list.sort((a, b) => {
      const numA = a.trackNumber || 9999;
      const numB = b.trackNumber || 9999;
      return numA - numB;
    });

    return list;
  }, [tracks, searchQuery, activeFilter, downloadedTrackIds]);

  // 120fps Viewport Virtualization
  const ROW_HEIGHT = 72;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tableTopRef = useRef(450);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  useEffect(() => {
    if (containerRef.current) {
      tableTopRef.current = containerRef.current.offsetTop || 450;
    }
  }, [filtered.length]);

  useEffect(() => {
    let rafId: number | null = null;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      const st = target instanceof HTMLElement ? target.scrollTop : (window.scrollY || 0);
      const vh = target instanceof HTMLElement ? target.clientHeight : window.innerHeight;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setScrollTop(st);
        if (vh > 0) setViewportHeight(vh);
        setShowScrollTop(st > 350);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as any);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const totalCount = filtered.length;
  const tableTop = tableTopRef.current;
  const relativeScroll = Math.max(0, scrollTop - tableTop);
  const startIndex = Math.max(0, Math.floor(relativeScroll / ROW_HEIGHT) - 5);
  const endIndex = Math.min(totalCount, Math.ceil((relativeScroll + viewportHeight) / ROW_HEIGHT) + 8);
  const visibleTracks = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  const topSpacer = startIndex * ROW_HEIGHT;
  const bottomSpacer = Math.max(0, (totalCount - endIndex) * ROW_HEIGHT);

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

  // Progressive loading for 120fps Mobile view (initial 35 tracks, appends +35 as user scrolls)
  const [mobileDisplayLimit, setMobileDisplayLimit] = useState(35);
  const mobileLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileDisplayLimit(35);
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    const el = mobileLoadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setMobileDisplayLimit((prev) => Math.min(prev + 35, filtered.length));
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  const progressiveMobileTracks = useMemo(() => {
    return filtered.slice(0, mobileDisplayLimit);
  }, [filtered, mobileDisplayLimit]);

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
    return tracks.slice(0, 4).map((t) => t.artworkUrl || './logo.svg');
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
    <div className="space-y-2.5 sm:space-y-4 pb-4 md:pb-16 w-full select-none overflow-x-hidden pt-1 sm:pt-2">
      {/* Mobile Library Hub: Spotify Filter Pills (Wrapped cleanly so nothing clips on 375px) */}
      <div className="sm:hidden flex flex-wrap items-center gap-1.5 py-1">
        <button
          onClick={handleCreatePlaylist}
          className="w-7 h-7 rounded-full bg-[#242424] hover:bg-[#282828] border border-white/[0.06] text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
          title={isRTL ? 'إنشاء قائمة تشغيل' : 'Create playlist'}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        {[
          {
            id: 'tracks' as const,
            label: isRTL ? 'الأغاني' : 'Tracks',
            active: mobileSubTab === 'tracks' && activeFilter !== 'offline',
            onSelect: () => {
              setMobileSubTab('tracks');
              if (activeFilter === 'offline') setActiveFilter('all');
            },
          },
          {
            id: 'playlists' as const,
            label: isRTL ? 'القوائم' : 'Playlists',
            active: mobileSubTab === 'playlists',
            onSelect: () => setMobileSubTab('playlists'),
          },
          {
            id: 'artists' as const,
            label: isRTL ? 'الفنانون' : 'Artists',
            active: mobileSubTab === 'artists',
            onSelect: () => setMobileSubTab('artists'),
          },
          {
            id: 'albums' as const,
            label: isRTL ? 'الألبومات' : 'Albums',
            active: mobileSubTab === 'albums',
            onSelect: () => setMobileSubTab('albums'),
          },
          {
            id: 'downloaded' as const,
            label: isRTL ? 'المحمّلة' : 'Downloaded',
            active: mobileSubTab === 'downloaded' || activeFilter === 'offline',
            onSelect: () => {
              setMobileSubTab('downloaded');
              setActiveFilter('offline');
            },
          },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={tab.onSelect}
            className={`relative px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer shrink-0 transition-colors ${
              tab.active ? 'text-black' : 'bg-[#242424] text-white border border-white/[0.05]'
            }`}
          >
            {tab.active && (
              <motion.span
                layoutId="library-mobile-subtab"
                transition={{ type: 'spring', stiffness: 460, damping: 34, mass: 0.8 }}
                className="absolute inset-0 rounded-full bg-white shadow-sm"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {mobileSubTab === 'playlists' ? (
        <PlaylistsView />
      ) : mobileSubTab === 'artists' ? (
        <div className="sm:hidden grid grid-cols-2 gap-3 p-1">
          {mobileArtists.map((artist) => (
            <div
              key={artist.name}
              onClick={() => openArtist(artist.name)}
              className="p-3 rounded-2xl bg-[#181818] border border-white/5 active:bg-[#242424] transition-colors cursor-pointer flex flex-col items-center text-center select-none"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden mb-2.5 bg-[#242424] ring-1 ring-white/10 shadow-md">
                <img
                  src={artist.artworkUrl}
                  alt={artist.name}
                  loading="lazy"
                  className="w-full h-full object-cover aspect-square"
                />
              </div>
              <h4 className="text-xs font-bold text-white truncate w-full" dir="auto">
                {artist.name}
              </h4>
              <p className="text-[10px] text-zinc-400 mt-0.5 truncate w-full">
                {isRTL ? `فنان • ${artist.trackCount} مسار` : `Artist • ${artist.trackCount} tracks`}
              </p>
            </div>
          ))}
        </div>
      ) : mobileSubTab === 'albums' ? (
        <div className="sm:hidden grid grid-cols-2 gap-3 p-1">
          {mobileAlbums.map((album) => (
            <div
              key={album.name}
              onClick={() => openAlbum(album.name, album.artist)}
              className="p-3 rounded-2xl bg-[#181818] border border-white/5 active:bg-[#242424] transition-colors cursor-pointer flex flex-col select-none"
            >
              <div className="aspect-square w-full rounded-xl overflow-hidden mb-2 bg-[#242424] ring-1 ring-white/10 shadow-md">
                <img
                  src={album.artworkUrl}
                  alt={album.name}
                  loading="lazy"
                  className="w-full h-full object-cover aspect-square"
                />
              </div>
              <h4 className="text-xs font-bold text-white truncate w-full" dir="auto">
                {album.name}
              </h4>
              <p className="text-[10px] text-zinc-400 mt-0.5 truncate w-full">
                {album.artist}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 1. Mobile Compact Header */}
          {tracks.length > 0 && (
            <div className="sm:hidden flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-[#181818] border border-white/[0.08] backdrop-blur-xl">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md border border-white/15 flex-shrink-0 grid grid-cols-2 grid-rows-2 bg-[#121218]">
                  {heroCovers.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Cover ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = './logo.svg';
                      }}
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1 text-start">
                  <h1 className="text-[13px] font-black text-white truncate leading-tight">
                    {isRTL ? 'مكتبتي' : 'Library'}
                  </h1>
                  <p className="text-[10.5px] text-zinc-400 font-medium truncate mt-0.5 tabular-nums">
                    <span>{tracks.length} {isRTL ? 'مسار' : 'tracks'}</span>
                    <span className="mx-1">•</span>
                    <span>{Math.floor(totalSeconds / 3600)} {isRTL ? 'ساعة' : 'hrs'}</span>
                  </p>
                </div>
              </div>

              {/* Compact Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePlayAll}
                  className="h-8 px-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-[11.5px] flex items-center gap-1 shadow-md shadow-black/40 active:scale-95 transition-transform cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black text-black" />
                  <span>{isRTL ? 'تشغيل' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShufflePlay}
                  className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                  title={isRTL ? 'خلط عشوائي' : 'Shuffle'}
                >
                  <Shuffle className="w-3.5 h-3.5 text-zinc-300" />
                </button>

                <button
                  type="button"
                  onClick={onOpenImport}
                  className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                  title={isRTL ? 'تغيير المجلد' : 'Change folder'}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#1DB954]" />
                </button>
              </div>
            </div>
          )}

      {/* Grand Editorial Hero Banner (Desktop: sm:block hidden) */}
      {tracks.length > 0 ? (
        <div className="hidden sm:block relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 apple-glass-card shadow-[0_20px_60px_rgba(0,0,0,0.7)] transform-gpu">
          {/* Subtle Ambient Glow */}
          <div
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none transform-gpu"
            style={{ background: 'radial-gradient(circle, rgba(29,185,84,0.12) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none transform-gpu"
            style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.14) 0%, transparent 70%)' }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-end gap-3.5 sm:gap-6 md:gap-8">
            {/* Top row on mobile: Cover + Info side-by-side */}
            <div className="flex items-center md:items-end gap-3.5 sm:gap-6 md:gap-8 flex-1 min-w-0">
              {/* Mosaic 4-Art Cover */}
              <div className="w-20 h-20 sm:w-36 sm:h-36 md:w-52 md:h-52 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.8)] border border-white/15 flex-shrink-0 grid grid-cols-2 grid-rows-2 bg-[#121218]">
                {heroCovers.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Cover ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = './logo.svg';
                    }}
                  />
                ))}
              </div>

              {/* Playlist Editorial Metadata */}
              <div className="flex-1 text-start space-y-1 sm:space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-zinc-300 text-[10px] sm:text-xs font-semibold">
                    <FolderOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1DB954]" />
                    <span>المجلد: <strong className="text-white font-bold">{savedFolderName || 'Liked_Songs'}</strong></span>
                  </div>

                  <button
                    onClick={onOpenImport}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white text-[10px] sm:text-xs font-semibold transition-[color,background-color,border-color,transform] active:scale-95 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>تغيير</span>
                  </button>
                </div>

                <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md truncate">
                  مكتبتي الموسيقية
                </h1>

                <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-2xl hidden sm:block">
                  مكتبتك الصوتية الكاملة مع الكلمات المتزامنة ومؤثرات الصوت.
                </p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-medium text-zinc-400 pt-0.5">
                  <span className="text-white font-bold">{tracks.length} مسار</span>
                  <span>•</span>
                  <span>{formattedTotalTime}</span>
                  <span className="hidden xs:inline">•</span>
                  <span className="text-zinc-400 font-medium hidden xs:inline">Lossless Audio</span>
                </div>
              </div>
            </div>

            {/* Play & Shuffle Action Controls with 0ms Tactile Feedback */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 w-full md:w-auto pt-1 sm:pt-0">
              <button
                type="button"
                onClick={handlePlayAll}
                className="flex-1 md:flex-initial h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-gradient-to-r from-[#1DB954] to-[#1ED760] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-2.5 shadow-lg shadow-[#1DB954]/35 active:scale-[0.93] transition-transform duration-75 cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />
                <span>{isRTL ? 'تشغيل الكل' : 'Play All'}</span>
              </button>

              <button
                type="button"
                onClick={handleShufflePlay}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white flex items-center justify-center active:scale-[0.93] transition-transform duration-75 cursor-pointer flex-shrink-0"
                title={isRTL ? 'خلط عشوائي' : 'Shuffle'}
              >
                <Shuffle className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Hero CTA */
        <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] p-5 sm:p-8 md:p-12 bg-gradient-to-b from-[#1DB954]/20 via-[#1DB954]/5 to-[#07070a] border border-white/[0.1] text-center space-y-3 sm:space-y-4 backdrop-blur-2xl">
          <FolderOpen className="w-10 h-10 sm:w-14 sm:h-14 mx-auto text-[#1DB954] animate-bounce" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white">{isRTL ? 'مكتبتك فارغة حالياً' : 'Your Library is Empty'}</h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            {isRTL
              ? 'أضف أغانٍ إلى مكتبتك للاستماع دون اتصال أو تصفح الكتالوج.'
              : 'Add songs to your library for offline listening or explore the catalog.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
            <button
              onClick={onOpenImport}
              className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-[#1DB954] to-[#1ED760] text-white font-bold text-xs sm:text-sm transition-[color,background-color,border-color,transform] shadow-xl shadow-[#1DB954]/30 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{isRTL ? 'استيراد أغاني من جهازي' : 'Import Local Songs'}</span>
            </button>
            <button
              onClick={() => usePlayerStore.getState().setActiveTab('search')}
              className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white font-bold text-xs sm:text-sm transition-[color,background-color,border-color,transform] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>{isRTL ? 'استكشف الأغاني في البحث' : 'Explore & Search'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 1.5 Featured Picks Editorial Shelf (Apple Music Style: Desktop only to prevent mobile clutter) */}
      {tracks.length > 0 && (
        <div className="hidden sm:block space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#1DB954]" />
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                مختارات Apple Music لك
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-medium">استمع فوراً لأبرز الأغاني</span>
          </div>

          <div className="flex overflow-x-auto no-scrollbar pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 -mx-1 px-1">
            {featuredTracks.map((t) => (
              <div
                key={t.id}
                onClick={() => playTrack(t, tracks)}
                className="group relative p-3 rounded-[22px] apple-glass-card border border-white/[0.08] hover:border-white/20 transition-colors duration-200 cursor-pointer flex flex-col gap-2.5 shadow-lg hover:-translate-y-1 select-none apple-spring flex-shrink-0 w-36 sm:w-auto"
              >
                <div className="relative aspect-square w-full rounded-[16px] overflow-hidden bg-[#151520] shadow-md border border-white/5">
                  <OptimizedImage
                    src={t.artworkUrl || t.coverUrl}
                    alt={t.title}
                    size="card"
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium" dir="auto">
                    {t.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Clean Minimal Search Bar (Only when library has tracks) */}
      {tracks.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3" />
              <input
                id="library-search-input"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                placeholder={isRTL ? 'ابحث في مكتبتك...' : 'Search your library...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '16px' }}
                className="w-full h-10 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.08] focus:border-[#1DB954]/60 rounded-xl py-2 pr-10 pl-10 text-white placeholder-zinc-500 focus:outline-none transition-colors [-webkit-appearance:none] [appearance:none] [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-3 text-zinc-500 hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-zinc-400 tabular-nums hidden sm:inline">
                {filtered.length} {isRTL ? 'مسار' : 'tracks'}
              </span>
              {isCloudConfigured() && (
                <button
                  onClick={() => setCloudUploaderOpen(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer shrink-0"
                  title="رفع ملفات موسيقية إلى السحابة"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span className="hidden sm:inline">رفع للسحابة</span>
                </button>
              )}
            </div>
          </div>

      {/* 3. Balanced Track Table Inside Matte Obsidian Container (Zero 64px blur GPU drain) */}
      <div ref={containerRef} className="md:bg-[#121216]/90 md:rounded-[28px] p-0 md:p-5 md:shadow-[0_24px_64px_rgba(0,0,0,0.65)] md:border md:border-white/[0.08] bg-transparent border-0 rounded-none shadow-none">
        <div dir={dir} className="w-full max-w-full">
          {/* Table Column Headers (Desktop Proportional Unified Grid) */}
          <div className="hidden md:grid grid-cols-[44px_minmax(240px,3fr)_minmax(140px,1.5fr)_auto] items-center gap-4 px-4 py-3 text-xs font-extrabold text-white/55 border-b border-white/[0.08] select-none uppercase tracking-wider">
            <span className="text-center font-mono">#</span>
            <span>{isRTL ? 'المسار والفنان' : 'Track & Artist'}</span>
            <span>{isRTL ? 'الألبوم' : 'Album'}</span>
            <span className="text-end font-mono flex items-center justify-end gap-1 pe-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{isRTL ? 'المدة' : 'Time'}</span>
            </span>
          </div>

          {/* Mobile Unified 120fps List with Swipe-to-Queue */}
          <div className="block md:hidden space-y-1">
            {filtered.length > 0 ? (
              <>
                {progressiveMobileTracks.map((track, idx) => (
                  <MobileTrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    showIndex={true}
                    contextList={filtered}
                    onOpenActionSheet={setActionSheetTrack}
                  />
                ))}
                {progressiveMobileTracks.length < filtered.length && (
                  <div ref={mobileLoadMoreRef} className="h-10 w-full flex items-center justify-center py-2">
                    <div className="w-5 h-5 rounded-full border-2 border-[#1DB954]/20 border-t-[#1DB954] animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 space-y-3 bg-white/[0.01] border border-dashed border-white/[0.06] rounded-2xl mt-2">
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

          {/* Desktop Track Rows List with True Viewport Windowing */}
          <div className="hidden md:block">
            {filtered.length > 0 ? (
              <div className="divide-y divide-white/[0.02] pt-1">
                {topSpacer > 0 && <div style={{ height: `${topSpacer}px` }} aria-hidden="true" />}
                {visibleTracks.map((track, idx) => (
                  <TrackTableRow
                    key={track.id}
                    track={track}
                    index={startIndex + idx}
                    onContextMenu={handleContextMenu}
                  />
                ))}
                {bottomSpacer > 0 && <div style={{ height: `${bottomSpacer}px` }} aria-hidden="true" />}
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
      </div>
      </>
      )}
      </>
      )}

      {/* Floating Scroll to Top Action Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, y: 15, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.85 }}
          onClick={() => {
            const main = document.querySelector('main');
            if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-24 right-4 z-40 px-4 py-2.5 rounded-full apple-glass-dock text-white flex items-center gap-2 text-xs font-bold hover:bg-white/20 active:scale-95 transition-[color,background-color,border-color,transform] cursor-pointer select-none apple-spring"
          title="العودة للأعلى"
        >
          <ArrowUp className="w-4 h-4 text-[#1DB954]" />
          <span>للأعلى</span>
        </motion.button>
      )}

      {/* Desktop Context Menu rendered via Portal with high z-index and smart positioning */}
      {contextMenu && typeof document !== 'undefined' && createPortal(
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-80 bg-[#141420]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-1.5 w-60 flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              usePlayerStore.getState().playNextInQueue(contextMenu.track);
              setContextMenu(null);
            }}
            className="px-3 py-2 text-xs sm:text-sm text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <ListEnd className="w-4 h-4 text-[#1DB954]" />
            <span>تشغيل التالي</span>
          </button>
          <button
            onClick={() => {
              usePlayerStore.getState().addToQueue(contextMenu.track);
              setContextMenu(null);
            }}
            className="px-3 py-2 text-xs sm:text-sm text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <ListPlus className="w-4 h-4 text-[#1DB954]" />
            <span>إضافة للقائمة</span>
          </button>
          <button
            onClick={() => {
              const tr = contextMenu.track;
              setContextMenu(null);
              usePlayerStore.getState().startSongRadio(tr);
            }}
            className="px-3 py-2 text-xs sm:text-sm text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Radio className="w-4 h-4 text-[#1DB954]" />
            <span>بدء راديو الأغنية</span>
          </button>
          <button
            onClick={() => {
              usePlayerStore.getState().toggleFavorite(contextMenu.track.id);
              setContextMenu(null);
            }}
            className="px-3 py-2 text-xs sm:text-sm text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Heart className={`w-4 h-4 ${favorites.includes(contextMenu.track.id) ? 'text-[#1DB954] fill-[#1DB954]' : 'text-[#1DB954]'}`} />
            <span>{favorites.includes(contextMenu.track.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
          </button>
          <button
            onClick={() => {
              usePlayerStore.getState().downloadTrackForOffline(contextMenu.track.id);
              setContextMenu(null);
            }}
            className="px-3 py-2 text-xs sm:text-sm text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>
              {usePlayerStore.getState().downloadedTrackIds.includes(contextMenu.track.id)
                ? 'محفوظة أوفلاين ✓'
                : 'حفظ للاستماع بدون إنترنت'}
            </span>
          </button>
          <div className="h-px bg-white/10 my-1 mx-2" />
          {contextMenu.track.artist && (
            <button
              onClick={() => {
                const art = contextMenu.track.artist;
                setContextMenu(null);
                usePlayerStore.getState().openArtist(art);
              }}
              className="px-3 py-2 text-xs sm:text-sm text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>الانتقال إلى الفنان</span>
            </button>
          )}
          {contextMenu.track.album && (
            <button
              onClick={() => {
                const alb = contextMenu.track.album!;
                const art = contextMenu.track.artist;
                setContextMenu(null);
                usePlayerStore.getState().openAlbum(alb, art);
              }}
              className="px-3 py-2 text-xs sm:text-sm text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Disc3 className="w-4 h-4 text-indigo-400" />
              <span>الانتقال إلى الألبوم</span>
            </button>
          )}
          <button
            onClick={() => {
              usePlayerStore.getState().setTrackEditOpen(true, contextMenu.track);
              setContextMenu(null);
            }}
            className="px-3 py-2 text-xs sm:text-sm text-white/90 hover:bg-white/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Pencil className="w-4 h-4 text-zinc-400" />
            <span>تعديل المسار والغلاف</span>
          </button>
          {isCloudConfigured() && (contextMenu.track.source === 'online' || (contextMenu.track.audioUrl && contextMenu.track.audioUrl.startsWith('http'))) && (
            <button
              onClick={async () => {
                const tr = contextMenu.track;
                setContextMenu(null);
                const user = usePlayerStore.getState().currentUser;
                if (!user || user.isGuest) {
                  usePlayerStore.getState().addToast(
                    'عذراً، حذف المسارات من السحابة مخصص لمالك المنصة فقط. يرجى تسجيل الدخول أولاً.',
                    undefined,
                    'warning'
                  );
                  usePlayerStore.getState().setCloudUploaderOpen(true);
                  return;
                }
                if (window.confirm(`هل أنت متأكد من حذف "${tr.title}" من السحابة نهائياً؟`)) {
                  await usePlayerStore.getState().deleteCloudTrackById(tr.id);
                }
              }}
              className="px-3 py-2 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>حذف من السحابة</span>
            </button>
          )}
        </div>,
        document.body
      )}
      {/* iOS Native Track Action Sheet */}
      <TrackActionSheet
        track={actionSheetTrack}
        isOpen={!!actionSheetTrack}
        onClose={() => setActionSheetTrack(null)}
      />
    </div>
  );
};

interface TrackTableRowProps {
  track: Track;
  index: number;
  onContextMenu?: (track: Track, clientX?: number, clientY?: number) => void;
}

const TrackTableRow: React.FC<TrackTableRowProps> = React.memo(({ track, index, onContextMenu }) => {
  const { t, isRTL } = useTranslation();
  const isCurrent = usePlayerStore((state) => state.currentTrack?.id === track.id);
  const isPlaying = usePlayerStore((state) => state.isPlaying && state.currentTrack?.id === track.id);
  const isFav = usePlayerStore((state) => state.favorites.includes(track.id));
  const isNextUp = usePlayerStore((state) => state.nextUpTrackId === track.id);
  const isDownloaded = usePlayerStore((state) => state.downloadedTrackIds.includes(track.id));
  const unavailableTrackIds = usePlayerStore((state) => state.unavailableTrackIds);
  const isUnavailable = unavailableTrackIds.includes(track.id) || !!track.unavailable;

  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

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

  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onContextMenu) onContextMenu(track, e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    touchTimerRef.current = setTimeout(() => {
      triggerHaptic('medium');
      if (onContextMenu) onContextMenu(track, clientX, clientY);
    }, 450);
  };

  const clearTouchTimer = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  return (
    <div
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearTouchTimer}
      onTouchMove={clearTouchTimer}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '64px' }}
      className={`group h-16 min-h-[64px] grid grid-cols-[26px_1fr_auto] md:grid-cols-[44px_minmax(240px,3fr)_minmax(140px,1.5fr)_auto] items-center gap-2 sm:gap-4 px-2.5 sm:px-4 rounded-2xl cursor-pointer transition-transform duration-75 select-none active:scale-[0.98] my-1 specular-highlight-subtle ${
        isUnavailable ? 'opacity-50 hover:opacity-80 ' : ''
      }${
        isCurrent
          ? 'bg-[#181824]/90 border border-[#1DB954]/40 shadow-lg shadow-black/40'
          : isNextUp
          ? 'bg-purple-500/10 border border-purple-500/35'
          : 'bg-[#101016]/60 hover:bg-[#151520] border border-white/[0.05] hover:border-white/[0.1]'
      }`}
    >
      {/* 1. Track Index # or Live Equalizer */}
      <div className="text-center flex items-center justify-center">
        {/* On Desktop Hover: Play or Pause Icon */}
        <div className="hidden md:group-hover:flex items-center justify-center w-6 h-6 rounded-full text-white cursor-pointer active:scale-90">
          {isCurrent && isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-white text-white" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
          )}
        </div>

        {/* When NOT hovered: Animated Bars if playing, else Track Index */}
        <div className="md:group-hover:hidden flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex items-end gap-[2px] h-3.5">
              <span className="w-1 bg-[#1DB954] rounded-full aura-soundbar-1 h-full" />
              <span className="w-1 bg-[#1ED760] rounded-full aura-soundbar-2 h-2/3" />
              <span className="w-1 bg-[#1DB954] rounded-full aura-soundbar-3 h-4/5" />
            </div>
          ) : (
            <span
              className={`text-xs font-mono tabular-nums transition-colors ${
                isCurrent ? 'text-[#1DB954] font-black' : 'text-white/50'
              }`}
            >
              {displayIndex}
            </span>
          )}
        </div>
      </div>

      {/* 2. Official Album Artwork + Title & Artist */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-sm flex-shrink-0">
          <OptimizedImage
            src={track.artworkUrl || track.coverUrl}
            alt={track.title}
            size="thumb"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {isCurrent && isPlaying && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center gap-[2px]">
              <span className="w-1 bg-[#1DB954] rounded-full aura-soundbar-1 h-3.5" />
              <span className="w-1 bg-[#1ED760] rounded-full aura-soundbar-2 h-2.5" />
              <span className="w-1 bg-[#1DB954] rounded-full aura-soundbar-3 h-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4
              className={`text-[14px] sm:text-[15px] font-semibold truncate tracking-tight leading-snug ${
                isCurrent ? 'text-[#1DB954]' : 'text-white group-hover:text-white'
              }`}
            >
              <bdi dir="auto">{track.title}</bdi>
            </h4>
            {isDownloaded && (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            )}
            {isUnavailable && (
              <span
                className="inline-flex items-center gap-1 text-[9px] text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full border border-amber-500/35 font-bold flex-shrink-0"
                title={t.unavailableTrack}
              >
                <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                <span className="hidden xs:inline">{t.unavailableTrack}</span>
              </span>
            )}
            {isNextUp && (
              <span className="inline-flex items-center gap-1 text-[9px] text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/35 font-bold flex-shrink-0 animate-pulse">
                <ListPlus className="w-2.5 h-2.5" />
                <span>التالية</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/60 truncate mt-0.5">
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (track.artist) usePlayerStore.getState().openArtist(track.artist);
              }}
              className="truncate font-medium hover:text-white hover:underline cursor-pointer transition-colors"
            >
              <bdi dir="auto">{track.artist}</bdi>
            </span>
            <span className="md:hidden text-white/40 font-mono tabular-nums">• {formatTime(track.duration)}</span>
            {track.syncedLyrics && track.syncedLyrics.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1DB954]/20 text-[#1DB954] font-bold tracking-wider uppercase flex-shrink-0 border border-[#1DB954]/30">
                LYRICS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Album / Genre */}
      <div className="hidden md:block text-xs text-white/60 truncate leading-relaxed">
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (track.album) usePlayerStore.getState().openAlbum(track.album, track.artist);
          }}
          className={track.album ? 'hover:text-white hover:underline cursor-pointer transition-colors' : ''}
        >
          <bdi dir="auto">{track.album || track.genre || 'Single'}</bdi>
        </span>
      </div>

      {/* 4. Action Cluster: Play Next (44x44px) + Heart (44x44px) + More Menu */}
      <div className="flex items-center justify-end gap-0.5 sm:gap-1.5 flex-shrink-0" style={{ touchAction: 'manipulation' }}>
        {/* Play Next / Add to Queue 44x44px Button */}
        <motion.button
          whileTap={{ scale: 0.86 }}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('success');
            usePlayerStore.getState().addToQueue(track);
            setIsAddedFeedback(true);
            setTimeout(() => setIsAddedFeedback(false), 1200);
          }}
          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isAddedFeedback
              ? 'bg-emerald-500 text-white scale-110 shadow-md shadow-emerald-500/40'
              : 'hover:bg-white/[0.08] active:bg-white/[0.14] text-zinc-400 hover:text-white'
          }`}
          title={isAddedFeedback ? (isRTL ? 'تمت الإضافة' : 'Added!') : t.addToQueue}
          aria-label={t.addToQueue}
        >
          {isAddedFeedback ? (
            <Check className="w-5 h-5 text-white stroke-[3]" />
          ) : (
            <ListPlus className="w-5 h-5 text-white/80 hover:text-[#1DB954]" />
          )}
        </motion.button>

        {/* Favorite 44x44px Button */}
        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try { navigator.vibrate(10); } catch {}
            }
            usePlayerStore.getState().toggleFavorite(track.id);
          }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-white/[0.08] active:bg-white/[0.14] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFav ? 'text-[#1DB954] fill-[#1DB954]' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          />
        </motion.button>

        <span className="hidden md:inline-block text-xs font-mono tabular-nums text-white/50 min-w-[34px] text-right">
          {formatTime(track.duration)}
        </span>

        <div className="relative flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              if (onContextMenu) {
                onContextMenu(track, e.clientX, e.clientY);
              }
            }}
            className="w-8 h-8 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
            aria-label="Track options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
