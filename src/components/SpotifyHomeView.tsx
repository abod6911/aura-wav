import React, { useMemo, useCallback, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { Play, Pause, Heart, Sparkles, ChevronRight } from 'lucide-react';
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
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);

  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

  const sourcePool = useMemo(() => {
    return tracks.length > 0 ? tracks : (catalogTracks.length > 0 ? catalogTracks : []);
  }, [tracks, catalogTracks]);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return t.goodMorning;
    if (h >= 12 && h < 17) return t.goodAfternoon;
    if (h >= 17 && h < 22) return t.goodEvening;
    return t.peacefulNight;
  }, [t]);

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

      if (quick.length < 4 && !seenArtists.has(art)) {
        seenArtists.add(art);
        quick.push(trk);
      }

      if (made.length < 8 && i % 2 === 0) {
        made.push(trk);
      } else if (trending.length < 8) {
        trending.push(trk);
      }

      if (top.length < 10) {
        top.push(trk);
      }

      if (quick.length >= 4 && made.length >= 8 && trending.length >= 8 && top.length >= 10) {
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

  const handleTrackClick = useCallback((track: Track, contextList?: Track[]) => {
    triggerHaptic('light');
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(track, contextList);
    }
  }, [currentTrack?.id, togglePlayPause, playTrack]);

  return (
    <div className="w-full flex flex-col gap-6 px-4 pt-3 pb-8 overflow-x-hidden select-none" dir={dir}>
      {/* ── Top Header Greeting ── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[11px] font-bold text-[#FA243C] uppercase tracking-wider block">
            {t.listenNow}
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            {greeting}
          </h1>
        </div>
      </div>

      {/* ── 1. Quick Access Grid (Strictly 6 Cards) ── */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        {/* Card 1: Liked Songs */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('favorites');
          }}
          className="flex items-center gap-2.5 h-[56px] p-1.5 rounded-xl bg-[#14141c] border border-white/[0.06] active:scale-[0.97] transition-transform overflow-hidden cursor-pointer"
        >
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#FA243C] to-[#FF375F] shrink-0 shadow-md">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="min-w-0 flex-1 pe-1">
            <span className="text-[13px] font-semibold text-white truncate block leading-tight">
              {t.likedSongsCard}
            </span>
            <span className="text-[10px] text-white/50 block font-mono mt-0.5">
              {favorites.length} {t.songs}
            </span>
          </div>
        </div>

        {/* Card 2: 3D Sound Studio */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setMobilePlayerOpen(true);
          }}
          className="flex items-center gap-2.5 h-[56px] p-1.5 rounded-xl bg-[#14141c] border border-white/[0.06] active:scale-[0.97] transition-transform overflow-hidden cursor-pointer"
        >
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#7D12FF] to-[#FA243C] shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1 pe-1">
            <span className="text-[13px] font-semibold text-white truncate block leading-tight">
              {isRTL ? 'استوديو الصوت 3D' : '3D Sound Studio'}
            </span>
            <span className="text-[10px] text-purple-300 block font-mono mt-0.5">
              Hi-Fi Master
            </span>
          </div>
        </div>

        {/* Cards 3-6: 4 Quick Tracks from Library */}
        {quickTracks.map((trk) => {
          const isCur = currentTrack?.id === trk.id;
          return (
            <div
              key={trk.id}
              onClick={() => handleTrackClick(trk)}
              className={`flex items-center gap-2.5 h-[56px] p-1.5 rounded-xl border active:scale-[0.97] transition-transform overflow-hidden cursor-pointer ${
                isCur
                  ? 'bg-[#FA243C]/20 border-[#FA243C]/40'
                  : 'bg-[#14141c] border-white/[0.06]'
              }`}
            >
              <img
                src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                alt={trk.title}
                loading="lazy"
                decoding="async"
                className="w-11 h-11 rounded-lg object-cover shrink-0 bg-black/40"
              />
              <span className={`text-[13px] font-semibold truncate flex-1 leading-tight ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                <bdi dir="auto">{trk.title}</bdi>
              </span>
            </div>
          );
        })}
      </div>

      {/* ── 2. Featured Spotlight Hero Card ── */}
      {spotlightTrack && (
        <div
          onClick={() => handleTrackClick(spotlightTrack)}
          className="h-[160px] w-full rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#FA243C]/25 via-[#14141c] to-[#09090d] border border-white/10 select-none cursor-pointer active:scale-[0.98] transition-transform shadow-xl"
        >
          {/* Subtle Cover Background */}
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-30 transform-gpu"
            style={{
              backgroundImage: `url(${spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'})`,
            }}
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#060609] via-[#060609]/75 to-transparent" />

          {/* Top Badges */}
          <div className="flex items-center justify-between">
            <span className="apple-badge bg-[#FA243C]/25 border-[#FA243C]/40 text-[#FF375F] text-[9px] font-black">
              APPLE MUSIC EXCLUSIVE
            </span>
            <span className="apple-badge bg-white/10 text-white/90 text-[9px]">
              LOSSLESS ALAC
            </span>
          </div>

          {/* Bottom Row */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img
                src={spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'}
                alt={spotlightTrack.title}
                loading="eager"
                decoding="async"
                className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-md border border-white/15 bg-black/40"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-white truncate tracking-tight">
                  <bdi dir="auto">{spotlightTrack.title}</bdi>
                </h3>
                <p className="text-[12px] text-white/60 font-medium truncate mt-0.5">
                  <bdi dir="auto">{spotlightTrack.artist}</bdi>
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTrackClick(spotlightTrack);
              }}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-90 transition-transform shrink-0"
              aria-label={currentTrack?.id === spotlightTrack.id && isPlaying ? t.pause : t.play}
            >
              {currentTrack?.id === spotlightTrack.id && isPlaying ? (
                <Pause className="w-5 h-5 fill-black text-black" />
              ) : (
                <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Section: Made For You (Max 8 Cards Snap Carousel) ── */}
      {madeForYou.length > 0 && (
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[18px] font-bold tracking-tight text-white">
              {t.madeForYou}
            </h2>
            <span className="text-[11px] text-white/40">{t.swipeToExplore}</span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-1">
            {madeForYou.map((trk) => {
              const isCur = currentTrack?.id === trk.id;
              return (
                <div
                  key={trk.id}
                  onClick={() => handleTrackClick(trk, madeForYou)}
                  className="w-[136px] shrink-0 snap-start flex flex-col gap-1.5 cursor-pointer active:scale-[0.97] transition-transform select-none"
                >
                  <div className="relative w-[136px] h-[136px] rounded-2xl overflow-hidden bg-[#14141c] shadow-sm border border-white/[0.06]">
                    <img
                      src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                      alt={trk.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {isCur && isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FA243C] animate-ping" />
                      </div>
                    )}
                  </div>
                  <h4 className={`text-[13px] font-semibold truncate leading-snug ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                    <bdi dir="auto">{trk.title}</bdi>
                  </h4>
                  <p className="text-[11px] text-white/50 truncate font-medium">
                    <bdi dir="auto">{trk.artist}</bdi>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. Section: Trending Hits (Max 8 Cards Snap Carousel) ── */}
      {trendingHits.length > 0 && (
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[18px] font-bold tracking-tight text-white">
              {isRTL ? 'الأكثر استماعاً' : 'Trending Hits'}
            </h2>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-1">
            {trendingHits.map((trk) => {
              const isCur = currentTrack?.id === trk.id;
              return (
                <div
                  key={trk.id}
                  onClick={() => handleTrackClick(trk, trendingHits)}
                  className="w-[136px] shrink-0 snap-start flex flex-col gap-1.5 cursor-pointer active:scale-[0.97] transition-transform select-none"
                >
                  <div className="relative w-[136px] h-[136px] rounded-2xl overflow-hidden bg-[#14141c] shadow-sm border border-white/[0.06]">
                    <img
                      src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                      alt={trk.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className={`text-[13px] font-semibold truncate leading-snug ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                    <bdi dir="auto">{trk.title}</bdi>
                  </h4>
                  <p className="text-[11px] text-white/50 truncate font-medium">
                    <bdi dir="auto">{trk.artist}</bdi>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 5. Top 10 Quick Tracks List (Strictly 10 Items Maximum) ── */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[18px] font-bold tracking-tight text-white">
            {isRTL ? 'أحدث المسارات' : 'Latest Tracks'}
          </h2>
          <span className="text-[11px] text-white/50 font-mono">10 {t.songs}</span>
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
          className="mt-3 w-full py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.98] transition-all border border-white/[0.08] text-center text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>
            {tracks.length > 0
              ? (isRTL ? `عرض كل مكتبتك (${tracks.length} أغنية)` : `View All Library (${tracks.length} songs)`)
              : (isRTL ? `استكشف كامل كتالوج الأغاني (${catalogTracks.length} أغنية)` : `Explore Full Catalog (${catalogTracks.length} songs)`)}
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
