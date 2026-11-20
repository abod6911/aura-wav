import React, { useMemo, useCallback, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { Play, Pause, Heart, ChevronRight } from 'lucide-react';
import { Track } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { MobileTrackRow } from './common/MobileTrackRow';
import { TrackActionSheet } from './library/TrackActionSheet';

interface SpotifyHomeViewProps {
  onOpenImport?: () => void;
}

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
  const userQueue = usePlayerStore((state) => state.userQueue);

  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

  const sourcePool = useMemo(() => {
    return tracks.length > 0 ? tracks : (catalogTracks.length > 0 ? catalogTracks : []);
  }, [tracks, catalogTracks]);

  // Extract slices strictly once without recalculating on every re-render
  const { quickTracks, madeForYou, trendingHits, topTen } = useMemo(() => {
    const quick: Track[] = [];
    const made: Track[] = [];
    const trending: Track[] = [];
    const top: Track[] = [];

    const seenArtists = new Set<string>();

    for (let i = 0; i < sourcePool.length; i++) {
      const trk = sourcePool[i];
      const art = (trk.artist || '').toLowerCase().trim();

      // Quick access pool: up to 7 tracks (plus Liked Songs makes 8)
      if (quick.length < 7 && !seenArtists.has(art)) {
        seenArtists.add(art);
        quick.push(trk);
      }

      if (made.length < 12 && i % 2 === 0) {
        made.push(trk);
      } else if (trending.length < 12) {
        trending.push(trk);
      }

      if (top.length < 10) {
        top.push(trk);
      }

      if (quick.length >= 7 && made.length >= 12 && trending.length >= 12 && top.length >= 10) {
        break;
      }
    }

    return {
      quickTracks: quick,
      madeForYou: made,
      trendingHits: trending,
      topTen: top,
    };
  }, [sourcePool]);

  // Spotlight Track
  const spotlightTrack = currentTrack || (sourcePool.length > 0 ? sourcePool[0] : null);
  const isSpotlightFav = spotlightTrack ? favorites.includes(spotlightTrack.id) : false;

  // Up Next tracks for Hero side panel
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
    <div className="w-full flex flex-col gap-6 sm:gap-8 pt-1 sm:pt-2 pb-16 overflow-x-hidden select-none" dir={dir}>
      {/* ── Top Header Title (Desktop Only: Mobile Header displays sticky page title) ── */}
      <div className="hidden sm:flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          {t.listenNow}
        </h1>
      </div>

      {/* ── 1. Quick Access Grid (Balanced 6 cards on mobile, 8 on desktop, flush image) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 w-full">
        {/* Card 1: Liked Songs */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('favorites');
          }}
          className="group relative flex items-center h-14 sm:h-16 rounded-xl bg-[#18181C] hover:bg-[#202026] border border-white/[0.04] transition-all cursor-pointer overflow-hidden shadow-sm"
        >
          <div className="w-14 h-14 min-w-[56px] min-h-[56px] sm:w-16 sm:h-16 sm:min-w-[64px] flex items-center justify-center bg-gradient-to-br from-[#FA2D48] to-[#FF375F] shrink-0 shadow-md">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="min-w-0 flex-1 px-2.5 sm:px-3 py-1">
            <span className="text-xs font-bold text-white truncate block leading-tight">
              {t.likedSongsCard}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 block tabular-nums mt-0.5 font-medium">
              {favorites.length} {t.songs}
            </span>
          </div>
        </div>

        {/* Cards 2-8: Quick Tracks from Library (Max 5 on mobile = 6 total, 7 on desktop = 8 total) */}
        {quickTracks.slice(0, 7).map((trk, idx) => {
          const isCur = currentTrack?.id === trk.id;
          return (
            <div
              key={trk.id}
              onClick={() => handleTrackClick(trk, sourcePool)}
              className={`group relative flex items-center h-14 sm:h-16 rounded-xl border transition-all cursor-pointer overflow-hidden shadow-sm ${
                idx >= 5 ? 'hidden md:flex' : 'flex'
              } ${
                isCur
                  ? 'bg-[#1e1b22] border-[#FA2D48]/40'
                  : 'bg-[#18181C] hover:bg-[#202026] border-white/[0.04]'
              }`}
            >
              <img
                src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                alt={trk.title}
                loading="lazy"
                decoding="async"
                className="w-14 h-14 min-w-[56px] min-h-[56px] sm:w-16 sm:h-16 sm:min-w-[64px] object-cover shrink-0 bg-black/40 shadow-sm"
              />
              <div className="min-w-0 flex-1 px-2.5 sm:px-3 py-1">
                <span
                  dir="auto"
                  className={`text-xs font-bold truncate block text-start leading-tight ${isCur ? 'text-[#FA2D48]' : 'text-white'}`}
                >
                  {trk.title}
                </span>
                <span
                  dir="auto"
                  className="text-[10px] sm:text-[11px] text-zinc-400 truncate block text-start mt-0.5 font-medium"
                >
                  {trk.artist}
                </span>
              </div>

              {/* Hover circular play button (Desktop only) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTrackClick(trk, sourcePool);
                }}
                className="hidden sm:flex w-8 h-8 rounded-full bg-white text-black items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 shadow-lg cursor-pointer hover:scale-105 active:scale-95 me-2"
                aria-label={isCur && isPlaying ? t.pause : t.play}
              >
                {isCur && isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-black text-black" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-black text-black translate-x-0.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── 2. Editorial Glass Hero Card (Hidden on Mobile to save screen real estate) ── */}
      {spotlightTrack && (
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
          {/* Main Featured Track Card (65% width on desktop) */}
          <div
            className="lg:col-span-8 min-h-[190px] sm:h-[210px] rounded-2xl p-4 sm:p-6 flex items-center justify-between relative overflow-hidden bg-[#141418] border border-white/[0.07] select-none"
          >
            {/* Cinematic subtle blur derived from current track artwork */}
            <div
              className="absolute inset-0 -z-10 bg-cover bg-center opacity-25 blur-[60px] pointer-events-none"
              style={{
                backgroundImage: `url(${spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'})`,
              }}
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent pointer-events-none" />

            <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1 z-10">
              {/* Crisp Large Album Cover */}
              <div className="relative shrink-0">
                <img
                  src={spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'}
                  alt={spotlightTrack.title}
                  loading="eager"
                  decoding="async"
                  className="w-24 h-24 sm:w-36 sm:h-36 rounded-xl object-cover shadow-2xl border border-white/10 bg-black/50"
                />
              </div>

              {/* Information & Action Buttons */}
              <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-zinc-400 uppercase block">
                  {currentTrack?.id === spotlightTrack.id ? 'قيد التشغيل الآن' : 'استمع الآن'}
                </span>

                <h2
                  className="text-base sm:text-2xl font-bold text-white truncate tracking-tight"
                >
                  <bdi dir="auto">{spotlightTrack.title}</bdi>
                </h2>

                <p
                  className="text-xs sm:text-sm text-zinc-400 font-medium truncate"
                >
                  <bdi dir="auto">{spotlightTrack.artist}</bdi>
                </p>

                <div className="flex items-center gap-2.5 sm:gap-3 pt-1.5 sm:pt-2">
                  <button
                    onClick={() => handleTrackClick(spotlightTrack)}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    {currentTrack?.id === spotlightTrack.id && isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-black text-black" />
                        <span>إيقاف مؤقت</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-black text-black translate-x-0.5" />
                        <span>{currentTrack?.id === spotlightTrack.id ? 'متابعة الاستماع' : 'تشغيل'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => toggleFavorite(spotlightTrack.id)}
                    className="p-2 sm:p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title={isSpotlightFav ? t.favoriteRemoved : t.favoriteAdded}
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        isSpotlightFav ? 'text-[#FA2D48] fill-[#FA2D48]' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Up Next / التالي في القائمة Card (35% width on desktop) */}
          <div className="lg:col-span-4 hidden lg:flex flex-col justify-between h-[210px] rounded-2xl p-5 bg-[#141418] border border-white/[0.07]">
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
                    key={trk.id}
                    onClick={() => handleTrackClick(trk, sourcePool)}
                    className="group flex items-center gap-3 p-2 rounded-xl bg-[#18181C] hover:bg-[#202026] border border-white/[0.04] transition-all cursor-pointer"
                  >
                    <img
                      src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                      alt={trk.title}
                      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-black/40"
                    />
                    <div className="min-w-0 flex-1">
                      <span
                        className="text-xs font-medium text-white truncate block"
                      >
                        <bdi dir="auto">{trk.title}</bdi>
                      </span>
                      <span
                        className="text-[10px] text-zinc-400 truncate block"
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

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
              <span>قائمة التشغيل الذكية</span>
              <button
                onClick={() => usePlayerStore.getState().toggleRightSidebar()}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                عرض الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Section: Made For You (Horizontal Carousel on Mobile, Grid on Desktop) ── */}
      {madeForYou.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {t.madeForYou}
            </h2>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-2 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-5 md:overflow-visible">
            {madeForYou.slice(0, 12).map((trk) => {
              const isCur = currentTrack?.id === trk.id;
              return (
                <div
                  key={trk.id}
                  onClick={() => handleTrackClick(trk, madeForYou)}
                  className="group relative flex flex-col cursor-pointer transition-all select-none w-[140px] xs:w-[148px] shrink-0 snap-start md:w-auto"
                >
                  {/* Clean Square Artwork Container */}
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#16161A] shadow-md border border-white/[0.05] group-hover:shadow-xl group-hover:border-white/15 transition-all">
                    <img
                      src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                      alt={trk.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Corner Floating Glass Play Button on Hover */}
                    <div className="absolute bottom-2.5 end-2.5 z-20 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackClick(trk, madeForYou);
                        }}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        aria-label={isCur && isPlaying ? t.pause : t.play}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-4 h-4 fill-black text-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Playing Indicator */}
                    {isCur && isPlaying && (
                      <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[1px] flex items-center justify-center gap-1">
                        <span className="w-1 bg-[#FA2D48] rounded-full aura-soundbar-1 h-4" />
                        <span className="w-1 bg-[#FA2D48] rounded-full aura-soundbar-2 h-2.5" />
                        <span className="w-1 bg-[#FA2D48] rounded-full aura-soundbar-3 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <h4
                    dir="auto"
                    className={`text-xs font-semibold truncate text-start block mt-2 leading-snug ${isCur ? 'text-[#FA2D48]' : 'text-white'}`}
                  >
                    {trk.title}
                  </h4>
                  <span
                    dir="auto"
                    className="text-[11px] text-[#8E8E93] truncate text-start block mt-0.5 font-normal"
                  >
                    {trk.artist}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. Section: Trending Hits (Horizontal Carousel on Mobile, Grid on Desktop) ── */}
      {trendingHits.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {isRTL ? 'الأكثر استماعاً' : 'Trending Hits'}
            </h2>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-2 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-5 md:overflow-visible">
            {trendingHits.slice(0, 12).map((trk) => {
              const isCur = currentTrack?.id === trk.id;
              return (
                <div
                  key={trk.id}
                  onClick={() => handleTrackClick(trk, trendingHits)}
                  className="group relative flex flex-col cursor-pointer transition-all select-none w-[140px] xs:w-[148px] shrink-0 snap-start md:w-auto"
                >
                  {/* Clean Square Artwork Container */}
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#16161A] shadow-md border border-white/[0.05] group-hover:shadow-xl group-hover:border-white/15 transition-all">
                    <img
                      src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                      alt={trk.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Corner Floating Glass Play Button on Hover */}
                    <div className="absolute bottom-2.5 end-2.5 z-20 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackClick(trk, trendingHits);
                        }}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        aria-label={isCur && isPlaying ? t.pause : t.play}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-4 h-4 fill-black text-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Playing Indicator */}
                    {isCur && isPlaying && (
                      <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[1px] flex items-center justify-center gap-1">
                        <span className="w-1 bg-[#FA2D48] rounded-full aura-soundbar-1 h-4" />
                        <span className="w-1 bg-[#FA2D48] rounded-full aura-soundbar-2 h-2.5" />
                        <span className="w-1 bg-[#FA2D48] rounded-full aura-soundbar-3 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <h4
                    dir="auto"
                    className={`text-xs font-semibold truncate text-start block mt-2 leading-snug ${isCur ? 'text-[#FA2D48]' : 'text-white'}`}
                  >
                    {trk.title}
                  </h4>
                  <span
                    dir="auto"
                    className="text-[11px] text-[#8E8E93] truncate text-start block mt-0.5 font-normal"
                  >
                    {trk.artist}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 5. Top 10 Latest Tracks List ── */}
      <section className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">
            {isRTL ? 'أحدث المسارات' : 'Latest Tracks'}
          </h2>
          <span className="text-[11px] text-zinc-500 tabular-nums font-mono">10 {t.songs}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {topTen.map((trk, idx) => (
            <MobileTrackRow
              key={trk.id}
              track={trk}
              index={idx}
              showIndex={true}
              contextList={sourcePool}
              onOpenActionSheet={setActionSheetTrack}
            />
          ))}
        </div>

        {/* View All Library / Explore Button */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            if (tracks.length > 0) {
              setActiveTab('library');
            } else {
              setActiveTab('search');
            }
          }}
          className="mt-2 w-full py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] transition-all border border-white/[0.06] text-center text-xs font-medium text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>
            {tracks.length > 0
              ? (isRTL ? `عرض جميع مسارات المكتبة (${tracks.length})` : `View All Library Tracks (${tracks.length})`)
              : (isRTL ? `عرض جميع الأغاني (${catalogTracks.length})` : `View All Songs (${catalogTracks.length})`)}
          </span>
          <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </section>

      {/* Track Action Sheet */}
      <TrackActionSheet
        track={actionSheetTrack}
        isOpen={!!actionSheetTrack}
        onClose={() => setActionSheetTrack(null)}
      />
    </div>
  );
};
