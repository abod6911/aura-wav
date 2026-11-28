import React, { useMemo, useCallback, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { Play, Pause, Heart, Sparkles, User, Disc3, Clock, ChevronRight } from 'lucide-react';
import { Track } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { MobileTrackRow } from './common/MobileTrackRow';
import { TrackActionSheet } from './library/TrackActionSheet';
import { isArabicText } from '../utils/formatters';
import {
  generateDailyMixes,
  generateOnRepeatMix,
  generateRediscoverMix,
  SmartMix,
} from '../utils/mixEngine';
import { getAllArtists } from '../utils/catalogSelectors';

interface SpotifyHomeViewProps {
  onOpenImport?: () => void;
}

type HomeFilter = 'all' | 'mixes' | 'artists' | 'recent';

export const SpotifyHomeView: React.FC<SpotifyHomeViewProps> = () => {
  const { t, isRTL, dir } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const catalogTracks = usePlayerStore((state) => state.catalogTracks);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const navigateTo = usePlayerStore((state) => state.navigateTo);
  const userQueue = usePlayerStore((state) => state.userQueue);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const openAlbum = usePlayerStore((state) => state.openAlbum);
  const openSmartMix = usePlayerStore((state) => state.openSmartMix);
  const history = usePlayerStore((state) => state.history);
  const playStatsMap = usePlayerStore((state) => state.playStatsMap);
  const playlists = usePlayerStore((state) => state.playlists);

  const [homeFilter, setHomeFilter] = useState<HomeFilter>('all');
  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

  const sourcePool = useMemo(() => {
    return tracks.length > 0 ? tracks : (catalogTracks.length > 0 ? catalogTracks : []);
  }, [tracks, catalogTracks]);

  // 1. Generate Smart Mixes
  const dailyMixes = useMemo(() => {
    return generateDailyMixes(sourcePool, favorites, playStatsMap);
  }, [sourcePool, favorites, playStatsMap]);

  const onRepeatMix = useMemo(() => {
    return generateOnRepeatMix(sourcePool, playStatsMap, favorites, history);
  }, [sourcePool, playStatsMap, favorites, history]);

  const rediscoverMix = useMemo(() => {
    return generateRediscoverMix(sourcePool, playStatsMap, history);
  }, [sourcePool, playStatsMap, history]);

  const allSmartMixes = useMemo<SmartMix[]>(() => {
    const list: SmartMix[] = [...dailyMixes];
    if (onRepeatMix && onRepeatMix.tracks.length > 0) list.push(onRepeatMix);
    if (rediscoverMix && rediscoverMix.tracks.length > 0) list.push(rediscoverMix);
    return list;
  }, [dailyMixes, onRepeatMix, rediscoverMix]);

  // 2. Artists in Library
  const topArtists = useMemo(() => {
    return getAllArtists(sourcePool).slice(0, 18);
  }, [sourcePool]);

  // 3. Quick Access Grid Construction with Strict Deduplication
  const { quickCards, displayedIds } = useMemo(() => {
    const ids = new Set<string>();
    type QuickCardItem =
      | { type: 'favorites' }
      | { type: 'mix'; mixId: string; title: string; covers: string[] }
      | { type: 'playlist'; playlistId: string; name: string; trackCount: number; coverUrl?: string }
      | { type: 'track'; track: Track };

    const cards: QuickCardItem[] = [{ type: 'favorites' }];

    // Pick unique tracks from history first
    const seenTrackIds = new Set<string>();
    for (const hTrack of history) {
      if (!seenTrackIds.has(hTrack.id)) {
        seenTrackIds.add(hTrack.id);
        ids.add(hTrack.id);
        cards.push({ type: 'track', track: hTrack });
        if (cards.length >= 5) break;
      }
    }

    // If short on history, fill from top played or favorites
    if (cards.length < 5) {
      const sortedByPlay = [...sourcePool].sort((a, b) => {
        const cA = playStatsMap[a.id]?.playCount || 0;
        const cB = playStatsMap[b.id]?.playCount || 0;
        return cB - cA;
      });

      for (const t of sortedByPlay) {
        if (!seenTrackIds.has(t.id)) {
          seenTrackIds.add(t.id);
          ids.add(t.id);
          cards.push({ type: 'track', track: t });
          if (cards.length >= 5) break;
        }
      }
    }

    // Add user playlist if available
    if (playlists.length > 0) {
      const pl = playlists[0];
      cards.push({
        type: 'playlist',
        playlistId: pl.id,
        name: pl.name,
        trackCount: pl.trackIds?.length || 0,
        coverUrl: pl.coverUrl,
      });
    }

    // Add second user playlist or fallback track
    if (playlists.length > 1 && cards.length < 7) {
      const pl2 = playlists[1];
      cards.push({
        type: 'playlist',
        playlistId: pl2.id,
        name: pl2.name,
        trackCount: pl2.trackIds?.length || 0,
        coverUrl: pl2.coverUrl,
      });
    }

    // Add Daily Mix 1 as the 8th card
    if (dailyMixes.length > 0 && cards.length < 8) {
      const dm1 = dailyMixes[0];
      cards.push({
        type: 'mix',
        mixId: dm1.id,
        title: dm1.title,
        covers: dm1.collageCovers,
      });
    }

    // If still under 8, fill with unique tracks
    if (cards.length < 8) {
      for (const t of sourcePool) {
        if (!seenTrackIds.has(t.id)) {
          seenTrackIds.add(t.id);
          ids.add(t.id);
          cards.push({ type: 'track', track: t });
          if (cards.length >= 8) break;
        }
      }
    }

    return { quickCards: cards.slice(0, 8), displayedIds: ids };
  }, [history, sourcePool, playStatsMap, playlists, dailyMixes]);

  // 4. Deduplicated Recently Played Tracks
  const recentTracks = useMemo(() => {
    const list: Track[] = [];
    const seen = new Set<string>();

    for (const h of history) {
      if (!displayedIds.has(h.id) && !seen.has(h.id)) {
        seen.add(h.id);
        list.push(h);
        if (list.length >= 12) break;
      }
    }

    // Fallback if history is scarce: use most played tracks not in displayedIds
    if (list.length < 8) {
      const sortedByPlay = [...sourcePool].sort((a, b) => {
        const cA = playStatsMap[a.id]?.playCount || 0;
        const cB = playStatsMap[b.id]?.playCount || 0;
        return cB - cA;
      });

      for (const t of sortedByPlay) {
        if (!displayedIds.has(t.id) && !seen.has(t.id)) {
          seen.add(t.id);
          list.push(t);
          if (list.length >= 12) break;
        }
      }
    }

    return list;
  }, [history, sourcePool, playStatsMap, displayedIds]);

  // 5. Deduplicated Rediscover Tracks
  const rediscoverTracks = useMemo(() => {
    if (!rediscoverMix) return [];
    return rediscoverMix.tracks
      .filter((t) => !displayedIds.has(t.id))
      .slice(0, 12);
  }, [rediscoverMix, displayedIds]);

  // Spotlight Track (Current or First Track)
  const spotlightTrack = currentTrack || (sourcePool.length > 0 ? sourcePool[0] : null);
  const isSpotlightFav = spotlightTrack ? favorites.includes(spotlightTrack.id) : false;

  // Up Next tracks for Desktop Hero
  const upNextTracks = useMemo(() => {
    if (userQueue.length > 0) return userQueue.slice(0, 2);
    if (!spotlightTrack) return [];
    const curIdx = sourcePool.findIndex((t) => t.id === spotlightTrack.id);
    if (curIdx >= 0) {
      return sourcePool.slice(curIdx + 1, curIdx + 3);
    }
    return sourcePool.slice(1, 3);
  }, [userQueue, spotlightTrack, sourcePool]);

  const handleTrackClick = useCallback((track: Track, contextList?: Track[]) => {
    triggerHaptic('light');
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(track, contextList);
    }
  }, [currentTrack?.id, togglePlayPause, playTrack]);

  return (
    <div className="w-full flex flex-col gap-5 sm:gap-8 pt-1 sm:pt-3 pb-4 md:pb-16 overflow-x-hidden select-none" dir={dir}>
      {/* ── Top Header & Filter Pills ── */}
      <div className="flex flex-col gap-3">
        <div className="hidden sm:flex items-center justify-between">
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {t.listenNow}
          </h1>
        </div>

        {/* Filter Pills (Spotify Style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'All' },
            { id: 'mixes', label: isRTL ? 'ميكساتك' : 'Daily Mixes' },
            { id: 'artists', label: isRTL ? 'الفنانون' : 'Artists' },
            { id: 'recent', label: isRTL ? 'استمعت مؤخراً' : 'Recently Played' },
          ].map((pill) => {
            const isActive = homeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setHomeFilter(pill.id as HomeFilter);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-[#242424] text-white hover:bg-[#323232] border border-white/5'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 1. Quick Access Grid (Displayed on 'all' filter) ── */}
      {homeFilter === 'all' && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 w-full">
          {quickCards.map((card, idx) => {
            if (card.type === 'favorites') {
              return (
                <div
                  key="quick-favorites"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('favorites');
                  }}
                  className="group relative flex items-center h-14 sm:h-16 rounded-xl bg-[#16161B]/95 hover:bg-[#24242C] border border-white/[0.06] transition-colors cursor-pointer overflow-hidden shadow-md"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-gradient-to-br from-[#450AF5] via-[#5E3AE8] to-[#8E8EE5] shrink-0 shadow-md">
                    <Heart className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div className="min-w-0 flex-1 px-3 text-start">
                    <span className="text-xs sm:text-sm font-bold text-white truncate block leading-tight">
                      {t.likedSongsCard}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#B3B3B3] block tabular-nums mt-0.5 font-medium">
                      {favorites.length} {t.songs}
                    </span>
                  </div>
                </div>
              );
            }

            if (card.type === 'mix') {
              return (
                <div
                  key={`quick-mix-${card.mixId}`}
                  onClick={() => {
                    triggerHaptic('light');
                    openSmartMix(card.mixId);
                  }}
                  className={`group relative flex items-center h-14 sm:h-16 rounded-xl bg-[#16161B]/95 hover:bg-[#24242C] border border-white/[0.06] transition-colors cursor-pointer overflow-hidden shadow-md ${
                    idx >= 6 ? 'hidden xl:flex' : 'flex'
                  }`}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 grid grid-cols-2 grid-rows-2 bg-[#242424] shrink-0 overflow-hidden">
                    {card.covers.map((cUrl, cIdx) => (
                      <img key={cIdx} src={cUrl} alt="" className="w-full h-full object-cover" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 px-3 text-start">
                    <span className="text-xs sm:text-sm font-bold text-white truncate block leading-tight">
                      {card.title}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400 block truncate mt-0.5 font-medium">
                      ميكس مخصص لك
                    </span>
                  </div>
                </div>
              );
            }

            if (card.type === 'playlist') {
              return (
                <div
                  key={`quick-pl-${card.playlistId}`}
                  onClick={() => {
                    triggerHaptic('light');
                    navigateTo({ tab: 'playlists', playlistId: card.playlistId });
                  }}
                  className={`group relative flex items-center h-13 sm:h-16 rounded-lg bg-[#181818] hover:bg-[#282828] border border-white/[0.04] transition-colors cursor-pointer overflow-hidden shadow-sm ${
                    idx >= 6 ? 'hidden xl:flex' : 'flex'
                  }`}
                >
                  <div className="w-13 h-13 sm:w-16 sm:h-16 flex items-center justify-center bg-[#242424] shrink-0 text-zinc-400">
                    <Disc3 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1 px-3 text-start">
                    <span className="text-xs sm:text-sm font-bold text-white truncate block leading-tight">
                      {card.name}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#B3B3B3] block tabular-nums mt-0.5 font-medium">
                      {card.trackCount} مسار
                    </span>
                  </div>
                </div>
              );
            }

            // Track card
            const trk = card.track;
            const isCur = currentTrack?.id === trk.id;

            return (
              <div
                key={`quick-trk-${trk.id}`}
                onClick={() => handleTrackClick(trk, sourcePool)}
                className={`group relative flex items-center h-14 sm:h-16 rounded-xl border transition-colors cursor-pointer overflow-hidden shadow-md ${
                  idx >= 6 ? 'hidden xl:flex' : 'flex'
                } ${
                  isCur
                    ? 'bg-[#22222A] border-[#1DB954]/50'
                    : 'bg-[#16161B]/95 hover:bg-[#24242C] border-white/[0.06]'
                }`}
              >
                <img
                  src={trk.artworkUrl || trk.coverUrl || './logo.svg'}
                  alt={trk.title}
                  loading="lazy"
                  decoding="async"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-cover shrink-0 bg-black/40"
                />
                <div className="min-w-0 flex-1 px-2.5 sm:px-3 text-start">
                  <span
                    dir="auto"
                    className={`text-xs sm:text-sm font-bold truncate block leading-tight text-start ${
                      isCur ? 'text-[#1DB954]' : 'text-white'
                    }`}
                  >
                    {trk.title}
                  </span>
                  <span
                    dir="auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (trk.artist) openArtist(trk.artist);
                    }}
                    className="text-[10.5px] sm:text-[11px] text-[#B3B3B3] hover:text-white hover:underline cursor-pointer truncate block mt-0.5 font-medium leading-tight text-start transition-colors"
                  >
                    {trk.artist}
                  </span>
                </div>

                {/* Hover Play Button (Desktop) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTrackClick(trk, sourcePool);
                  }}
                  className="hidden md:flex w-8 h-8 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black items-center justify-center opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-200 shrink-0 shadow-lg cursor-pointer hover:scale-105 active:scale-95 me-2.5"
                  aria-label={isCur && isPlaying ? t.pause : t.play}
                >
                  {isCur && isPlaying ? (
                    <Pause className="w-4 h-4 fill-black text-black" />
                  ) : (
                    <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 2. Editorial Matte Hero Card (Desktop only, displayed on 'all') ── */}
      {homeFilter === 'all' && spotlightTrack && (
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
          {/* Main Featured Track Card */}
          <div className="lg:col-span-8 min-h-[190px] rounded-2xl p-5 flex items-center justify-between relative overflow-hidden bg-[#181818] border border-white/[0.06] select-none">
            {/* Lightweight ambient tint (zero 50px blur overhead) */}
            <div
              className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 20% 50%, rgba(var(--ambient-primary-rgb, 29, 185, 84), 0.35), transparent 70%)',
              }}
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent pointer-events-none" />

            <div className="flex items-center gap-5 min-w-0 flex-1 z-10">
              <div className="relative shrink-0">
                <img
                  src={spotlightTrack.artworkUrl || spotlightTrack.coverUrl || './logo.svg'}
                  alt={spotlightTrack.title}
                  loading="eager"
                  className="w-28 h-28 lg:w-32 lg:h-32 rounded-xl object-cover shadow-2xl ring-1 ring-white/10 bg-black/50"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase block">
                  {currentTrack?.id === spotlightTrack.id ? 'قيد التشغيل الآن' : 'استمع الآن'}
                </span>

                <h2 className="text-xl lg:text-2xl font-black text-white truncate tracking-tight">
                  <bdi dir="auto">{spotlightTrack.title}</bdi>
                </h2>

                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    if (spotlightTrack.artist) openArtist(spotlightTrack.artist);
                  }}
                  className="text-xs sm:text-sm text-zinc-300 hover:text-white hover:underline cursor-pointer font-medium truncate transition-colors"
                >
                  <bdi dir="auto">{spotlightTrack.artist}</bdi>
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleTrackClick(spotlightTrack)}
                    className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    {currentTrack?.id === spotlightTrack.id && isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-black text-black" />
                        <span>إيقاف مؤقت</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                        <span>{currentTrack?.id === spotlightTrack.id ? 'متابعة الاستماع' : 'تشغيل'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(spotlightTrack.id)}
                    className="p-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title={isSpotlightFav ? t.favoriteRemoved : t.favoriteAdded}
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        isSpotlightFav ? 'text-[#1DB954] fill-[#1DB954]' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Up Next / التالي في القائمة */}
          <div className="lg:col-span-4 hidden lg:flex flex-col justify-between rounded-2xl p-4 bg-[#181818] border border-white/[0.06]">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-zinc-300">التالي في القائمة</span>
              <span className="text-[11px] text-zinc-500 tabular-nums font-mono">
                {upNextTracks.length} مسارات
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2 py-1">
              {upNextTracks.length > 0 ? (
                upNextTracks.map((trk) => (
                  <div
                    key={`hero-next-${trk.id}`}
                    onClick={() => handleTrackClick(trk, sourcePool)}
                    className="group flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <img
                      src={trk.artworkUrl || trk.coverUrl || './logo.svg'}
                      alt={trk.title}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-black/40"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-white truncate block">
                        <bdi dir="auto">{trk.title}</bdi>
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (trk.artist) openArtist(trk.artist);
                        }}
                        className="text-[10px] text-zinc-400 hover:text-white hover:underline cursor-pointer truncate block transition-colors"
                      >
                        <bdi dir="auto">{trk.artist}</bdi>
                      </span>
                    </div>
                    <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-zinc-500">
                  لا توجد مسارات تالية في قائمة الانتظار
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
              <span>قائمة التشغيل</span>
              <button
                type="button"
                onClick={() => usePlayerStore.getState().toggleRightSidebar()}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                عرض الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Section: ميكساتك اليومية (Daily Mixes + On Repeat + Rediscover) ── */}
      {(homeFilter === 'all' || homeFilter === 'mixes') && allSmartMixes.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>{isRTL ? 'ميكساتك اليومية' : 'Your Daily Mixes'}</span>
            </h2>
            <span className="hidden xs:inline text-xs text-zinc-400 font-medium">
              تتحدث يومياً في منتصف الليل
            </span>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 md:gap-4 md:overflow-visible">
            {allSmartMixes.map((mix) => (
              <div
                key={mix.id}
                onClick={() => {
                  triggerHaptic('light');
                  openSmartMix(mix.id);
                }}
                className="group relative flex flex-col p-3 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors cursor-pointer select-none w-[150px] xs:w-[165px] shrink-0 snap-start md:w-auto"
              >
                {/* 2x2 Collage Cover */}
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#242424] shadow-md ring-1 ring-white/5 grid grid-cols-2 grid-rows-2">
                  {mix.collageCovers.map((cov, cIdx) => (
                    <img
                      key={cIdx}
                      src={cov}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ))}

                  {/* Corner Floating Play Button on Hover */}
                  <div className="absolute bottom-2 end-2 z-20 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-[opacity,transform] duration-200">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mix.tracks.length > 0) {
                          playTrack(mix.tracks[0], mix.tracks);
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      title="تشغيل الميكس"
                    >
                      <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                    </button>
                  </div>
                </div>

                {/* Badge & Title & Subtitle */}
                <span className="text-[10px] font-bold text-emerald-400 mt-2.5 uppercase tracking-wider truncate block text-start">
                  {mix.badge}
                </span>
                <h4
                  dir="auto"
                  className="text-xs sm:text-sm font-bold text-white truncate leading-snug mt-0.5 text-start"
                >
                  {mix.title}
                </h4>
                <p
                  dir="auto"
                  className="text-[11px] text-[#B3B3B3] truncate mt-0.5 leading-tight text-start"
                >
                  {mix.subtitle}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Section: استمعت مؤخراً (Deduplicated Recently Played) ── */}
      {(homeFilter === 'all' || homeFilter === 'recent') && recentTracks.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              <span>{isRTL ? 'استمعت مؤخراً' : 'Recently Played'}</span>
            </h2>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4 md:overflow-visible">
            {recentTracks.map((trk) => {
              const isCur = currentTrack?.id === trk.id;
              return (
                <div
                  key={`recent-${trk.id}`}
                  onClick={() => handleTrackClick(trk, recentTracks)}
                  className="group relative flex flex-col p-3 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors cursor-pointer select-none w-[135px] xs:w-[150px] shrink-0 snap-start md:w-auto"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#242424] shadow-md ring-1 ring-white/5 mb-2">
                    <img
                      src={trk.artworkUrl || trk.coverUrl || './logo.svg'}
                      alt={trk.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 end-2 z-20 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-[opacity,transform] duration-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackClick(trk, recentTracks);
                        }}
                        className="w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        aria-label={isCur && isPlaying ? t.pause : t.play}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-4 h-4 fill-black text-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <h4
                    dir="auto"
                    className={`text-xs sm:text-sm font-semibold truncate block leading-snug text-start ${
                      isCur ? 'text-[#1DB954]' : 'text-white'
                    }`}
                  >
                    {trk.title}
                  </h4>
                  <span
                    dir="auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (trk.artist) openArtist(trk.artist);
                    }}
                    className="text-[11px] text-[#B3B3B3] hover:text-white hover:underline cursor-pointer truncate block mt-0.5 font-normal text-start transition-colors"
                  >
                    {trk.artist}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 5. Section: فنانون في مكتبتك (Top Artists with Circular Avatars) ── */}
      {(homeFilter === 'all' || homeFilter === 'artists') && topArtists.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <User className="w-5 h-5 text-zinc-400" />
              <span>{isRTL ? 'فنانون في مكتبتك' : 'Artists in Your Library'}</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              عرض الكل
            </button>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 md:gap-4 md:overflow-visible">
            {topArtists.map((artist) => (
              <div
                key={`artist-${artist.name}`}
                onClick={() => {
                  triggerHaptic('light');
                  openArtist(artist.name);
                }}
                className="group relative flex flex-col items-center p-3 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors cursor-pointer select-none w-[130px] xs:w-[145px] shrink-0 snap-start md:w-auto text-center"
              >
                <div className="relative w-full aspect-square rounded-full overflow-hidden bg-[#242424] shadow-md ring-1 ring-white/10 mb-2">
                  <img
                    src={artist.artworkUrl || './logo.svg'}
                    alt={artist.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h4
                  dir={isArabicText(artist.name) ? 'rtl' : 'ltr'}
                  className="text-xs sm:text-sm font-bold text-white truncate w-full"
                >
                  {artist.name}
                </h4>
                <span className="text-[11px] text-[#B3B3B3] mt-0.5">
                  فنان • {artist.trackCount} مسار
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 6. Section: اكتشف من مكتبتك (Deduplicated Rediscover Tracks) ── */}
      {(homeFilter === 'all' || homeFilter === 'mixes') && rediscoverTracks.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>{isRTL ? 'اكتشف من مكتبتك' : 'Rediscover from Library'}</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">مسارات لم تستمع إليها منذ فترة طويلة</p>
            </div>
            <button
              type="button"
              onClick={() => openSmartMix('rediscover')}
              className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
            >
              عرض الميكس كاملاً
            </button>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4 md:overflow-visible">
            {rediscoverTracks.map((trk) => {
              const isCur = currentTrack?.id === trk.id;
              return (
                <div
                  key={`rediscover-${trk.id}`}
                  onClick={() => handleTrackClick(trk, rediscoverTracks)}
                  className="group relative flex flex-col p-3 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors cursor-pointer select-none w-[135px] xs:w-[150px] shrink-0 snap-start md:w-auto"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#242424] shadow-md ring-1 ring-white/5 mb-2">
                    <img
                      src={trk.artworkUrl || trk.coverUrl || './logo.svg'}
                      alt={trk.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 end-2 z-20 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-[opacity,transform] duration-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackClick(trk, rediscoverTracks);
                        }}
                        className="w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        aria-label={isCur && isPlaying ? t.pause : t.play}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-4 h-4 fill-black text-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <h4
                    dir="auto"
                    className={`text-xs sm:text-sm font-semibold truncate block leading-snug text-start ${
                      isCur ? 'text-[#1DB954]' : 'text-white'
                    }`}
                  >
                    {trk.title}
                  </h4>
                  <span
                    dir="auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (trk.artist) openArtist(trk.artist);
                    }}
                    className="text-[11px] text-[#B3B3B3] hover:text-white hover:underline cursor-pointer truncate block mt-0.5 font-normal text-start transition-colors"
                  >
                    {trk.artist}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 7. All Library Navigation Pill ── */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setActiveTab('library');
          }}
          className="w-full py-3.5 rounded-xl bg-[#181818] hover:bg-[#242424] active:scale-[0.99] transition-colors border border-white/5 text-center text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {isRTL
              ? `تصفح مكتبتك الكاملة (${tracks.length || catalogTracks.length} مسار)`
              : `Browse Complete Library (${tracks.length || catalogTracks.length} tracks)`}
          </span>
          <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Track Action Sheet for Mobile and Desktop options */}
      <TrackActionSheet
        track={actionSheetTrack}
        isOpen={!!actionSheetTrack}
        onClose={() => setActionSheetTrack(null)}
      />
    </div>
  );
};
