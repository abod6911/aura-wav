import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Track } from '../../types';
import {
  Search,
  X,
  Play,
  Music,
  User,
  Disc,
  Sparkles,
  Mic2,
  Compass,
  Shuffle,
  Radio,
  Command,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { formatTime } from '../player/TimelineSlider';

// Normalizes Arabic characters (hamzas, tashkeel, etc.) for lightning-fast matching
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
    .trim();
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  action: () => void;
}

export const SpotlightCommandModal: React.FC = () => {
  const { t, isRTL, dir } = useTranslation();
  const isSpotlightOpen = usePlayerStore((state) => state.isSpotlightOpen);
  const setSpotlightOpen = usePlayerStore((state) => state.setSpotlightOpen);
  const tracks = usePlayerStore((state) => state.tracks);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const setKaraokeMode = usePlayerStore((state) => state.setKaraokeMode);
  const karaokeMode = usePlayerStore((state) => state.karaokeMode);
  const toggle8DSpatial = usePlayerStore((state) => state.toggle8DSpatial);
  const triggerVinylBrake = usePlayerStore((state) => state.triggerVinylBrake);
  const setHarmonicJourneyOpen = usePlayerStore((state) => state.setHarmonicJourneyOpen);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isSpotlightOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSpotlightOpen]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSpotlightOpen(!usePlayerStore.getState().isSpotlightOpen);
      } else if (e.key === 'Escape' && usePlayerStore.getState().isSpotlightOpen) {
        e.preventDefault();
        setSpotlightOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSpotlightOpen]);

  // Quick DSP & Workstation Actions
  const quickActions: QuickAction[] = useMemo(() => {
    return [
      {
        id: 'action-shuffle',
        title: isRTL ? 'تشغيل عشوائي شامل للمكتبة' : 'Shuffle All 1,940 Tracks',
        subtitle: isRTL ? 'مزج عشوائي فوري لكافة الأغاني المحلية' : 'Instant shuffle playback across all songs',
        icon: Shuffle,
        action: () => {
          if (tracks.length > 0) {
            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
            toggleShuffle();
            playTrack(shuffled[0], shuffled);
            setSpotlightOpen(false);
          }
        },
      },
      {
        id: 'action-harmonic',
        title: isRTL ? 'توليد رحلة توافقية ذكية (Harmonic Flow)' : 'Launch Harmonic Journey Generator',
        subtitle: isRTL ? 'تسلسل 12 أغنية متوافقة نغمياً عبر عجلة كاميلوت' : '12-track Camelot Wheel harmonic path',
        icon: Compass,
        action: () => {
          setHarmonicJourneyOpen(true);
          setSpotlightOpen(false);
        },
      },
      {
        id: 'action-karaoke',
        title: karaokeMode
          ? (isRTL ? 'إيقاف وضع عزل الصوت الغنائي (Apple Sing)' : 'Disable Vocal Attenuation')
          : (isRTL ? 'تفعيل وضع الكاريوكي (Apple Sing Vocal Attenuation)' : 'Enable Vocal Attenuation (Karaoke)'),
        subtitle: isRTL ? 'عزل صوت المغني بنظام Mid/Side 2-Pole Filter' : 'Mid/Side vocal removal DSP',
        icon: Mic2,
        action: () => {
          setKaraokeMode(!karaokeMode);
          setSpotlightOpen(false);
        },
      },
      {
        id: 'action-8d',
        title: isRTL ? 'تبديل وضع الصوت المكاني (8D Spatial Audio)' : 'Toggle 8D Binaural Spatial Audio',
        subtitle: isRTL ? 'مدار صوتي 360 درجة مع تثبيت البيس في المركز' : 'Binaural HRTF orbit with Mono-anchored bass',
        icon: Sparkles,
        action: () => {
          toggle8DSpatial();
          setSpotlightOpen(false);
        },
      },
      {
        id: 'action-brake',
        title: isRTL ? 'مؤثر توقف أسطوانة الفينيل (Vinyl Brake)' : 'Trigger Vinyl Brake Effect',
        subtitle: isRTL ? 'إيقاف تدريجي فيزيائي بسرعة الفينيل' : 'Exponential turntable spin-down',
        icon: Disc,
        action: () => {
          triggerVinylBrake();
          setSpotlightOpen(false);
        },
      },
    ];
  }, [tracks, isRTL, karaokeMode, playTrack, setHarmonicJourneyOpen, setKaraokeMode, setSpotlightOpen, toggle8DSpatial, toggleShuffle, triggerVinylBrake]);

  // Fast In-Memory Fuzzy Filter
  const { matchedTracks, matchedArtists, matchedAlbums, matchedActions } = useMemo(() => {
    const rawQ = query.trim();
    if (!rawQ) {
      return {
        matchedTracks: tracks.slice(0, 5),
        matchedArtists: [],
        matchedAlbums: [],
        matchedActions: quickActions.slice(0, 3),
      };
    }

    const normQ = normalizeText(rawQ);

    // 1. Matched Tracks
    const mTracks: Track[] = [];
    const artistSet = new Map<string, Track>();
    const albumSet = new Map<string, Track>();

    for (const trk of tracks) {
      const normTitle = normalizeText(trk.title);
      const normArtist = normalizeText(trk.artist);
      const normAlbum = normalizeText(trk.album || '');

      if (normTitle.includes(normQ) || (trk.trackNumber && String(trk.trackNumber).includes(normQ))) {
        if (mTracks.length < 12) mTracks.push(trk);
      }

      if (normArtist.includes(normQ) && !artistSet.has(trk.artist)) {
        if (artistSet.size < 4) artistSet.set(trk.artist, trk);
      }

      if (normAlbum.includes(normQ) && trk.album && !albumSet.has(trk.album)) {
        if (albumSet.size < 4) albumSet.set(trk.album, trk);
      }
    }

    // Matched Actions
    const mActions = quickActions.filter(
      (a) => normalizeText(a.title).includes(normQ) || normalizeText(a.subtitle).includes(normQ)
    );

    return {
      matchedTracks: mTracks,
      matchedArtists: Array.from(artistSet.values()),
      matchedAlbums: Array.from(albumSet.values()),
      matchedActions: mActions,
    };
  }, [query, tracks, quickActions]);

  // Flattened items list for Arrow navigation
  const flatItems = useMemo(() => {
    const items: Array<{ type: 'action' | 'track' | 'artist' | 'album'; data: any }> = [];
    matchedActions.forEach((a) => items.push({ type: 'action', data: a }));
    matchedTracks.forEach((t) => items.push({ type: 'track', data: t }));
    matchedArtists.forEach((a) => items.push({ type: 'artist', data: a }));
    matchedAlbums.forEach((al) => items.push({ type: 'album', data: al }));
    return items;
  }, [matchedActions, matchedTracks, matchedArtists, matchedAlbums]);

  // Handle Keyboard Arrows & Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatItems[selectedIndex];
      if (!selected) return;

      if (selected.type === 'action') {
        selected.data.action();
      } else if (selected.type === 'track') {
        playTrack(selected.data, tracks);
        setSpotlightOpen(false);
      } else if (selected.type === 'artist' || selected.type === 'album') {
        playTrack(selected.data, tracks);
        setSpotlightOpen(false);
      }
    }
  };

  if (!isSpotlightOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-24 px-4 bg-black/70 backdrop-blur-2xl"
        onClick={() => setSpotlightOpen(false)}
        dir={dir}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl apple-glass-card rounded-[32px] border border-white/[0.14] shadow-[0_32px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[80vh] backdrop-blur-3xl"
        >
          {/* Top Search Input Bar */}
          <div className="relative flex items-center px-5 py-4 border-b border-white/[0.1] gap-3 bg-white/[0.02]">
            <Search className="w-5 h-5 text-white/50 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={isRTL ? 'ابحث عن مسار، فنان، ألبوم، أو أمر DSP...' : 'Search 1,940 tracks, artists, DSP commands...'}
              className="w-full bg-transparent text-white placeholder-white/40 text-base font-medium outline-none leading-relaxed"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.08] text-[10px] font-mono text-white/50 border border-white/10">
                ESC
              </span>
              <button
                onClick={() => setSpotlightOpen(false)}
                className="p-1 text-white/50 hover:text-white rounded-full hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results Scroll Area */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
            {/* 1. Quick DSP Actions */}
            {matchedActions.length > 0 && (
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/45 block mb-1.5 px-3">
                  {isRTL ? 'أوامر الاستوديو والـ DSP السريعة' : 'DSP & Quick Workstation Commands'}
                </span>
                <div className="space-y-1">
                  {matchedActions.map((action, i) => {
                    const isSelected = selectedIndex === i;
                    const Icon = action.icon;
                    return (
                      <div
                        key={action.id}
                        onClick={action.action}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FA243C]/20 to-[#FF375F]/20 border border-[#FA243C]/40 text-white shadow-md'
                            : 'hover:bg-white/[0.05] text-white/80'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-[#FA243C]/30">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-white leading-relaxed truncate">
                            {action.title}
                          </h5>
                          <p className="text-[10px] text-white/60 leading-relaxed truncate">
                            {action.subtitle}
                          </p>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono hidden sm:inline">
                          ENTER
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Matched Tracks (1,940 Local Library) */}
            {matchedTracks.length > 0 && (
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/45 block mb-1.5 px-3">
                  {isRTL ? `المسارات الصوتية (${matchedTracks.length})` : `Tracks (${matchedTracks.length})`}
                </span>
                <div className="space-y-1">
                  {matchedTracks.map((track, i) => {
                    const globalIdx = matchedActions.length + i;
                    const isSelected = selectedIndex === globalIdx;
                    return (
                      <div
                        key={track.id}
                        onClick={() => {
                          playTrack(track, tracks);
                          setSpotlightOpen(false);
                        }}
                        className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white/[0.12] border border-[#FA243C]/40 text-white shadow-md'
                            : 'hover:bg-white/[0.05] text-white/80 border border-transparent'
                        }`}
                      >
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-black/60 border border-white/10">
                          <img
                            src={track.coverUrl || track.artworkUrl || '/logo.svg'}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-white truncate leading-relaxed">
                            <bdi dir="auto">{track.title}</bdi>
                          </h5>
                          <p className="text-[11px] text-white/60 truncate leading-relaxed">
                            <bdi dir="auto">{track.artist}</bdi>
                          </p>
                        </div>
                        <span className="text-xs font-mono text-white/45 tabular-nums">
                          {formatTime(track.duration)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Matched Artists */}
            {matchedArtists.length > 0 && (
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/45 block mb-1.5 px-3">
                  {isRTL ? 'الفنانون' : 'Artists'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchedArtists.map((t) => (
                    <div
                      key={`artist_${t.id}`}
                      onClick={() => {
                        playTrack(t, tracks);
                        setSpotlightOpen(false);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] cursor-pointer transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FA243C] to-[#FF375F] flex items-center justify-center font-bold text-white text-sm shadow-md">
                        {t.artist.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-white truncate leading-relaxed">
                          <bdi dir="auto">{t.artist}</bdi>
                        </h5>
                        <p className="text-[10px] text-white/50">{isRTL ? 'فنان في المكتبة' : 'Artist'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State / Streaming Catalog Link */}
            {flatItems.length === 0 && (
              <div className="py-12 text-center space-y-3">
                <Search className="w-8 h-8 mx-auto text-white/30" />
                <h4 className="text-sm font-bold text-white">
                  {isRTL ? 'لا توجد مسارات محلية مطابقة' : 'No local tracks matched'}
                </h4>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  {isRTL
                    ? 'يمكنك البحث في البث السحابي الشامل عبر YouTube و LRCLIB.'
                    : 'You can search worldwide via streaming catalog.'}
                </p>
                <button
                  onClick={() => {
                    setActiveTab('search');
                    setSpotlightOpen(false);
                  }}
                  className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {isRTL ? 'فتح البحث السحابي المباشر' : 'Open Worldwide Streaming Search'}
                </button>
              </div>
            )}
          </div>

          {/* Footer Shortcuts Navigation Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] text-[10px] text-white/50 font-mono">
            <div className="flex items-center gap-3">
              <span>↑↓ {isRTL ? 'للتنقل' : 'Navigate'}</span>
              <span>↵ {isRTL ? 'للتشغيل' : 'Select'}</span>
              <span>ESC {isRTL ? 'للإغلاق' : 'Close'}</span>
            </div>
            <span className="text-[#FA243C] font-bold">1,940 Tracks In-Memory</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
