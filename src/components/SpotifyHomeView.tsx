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
    <div className="w-full flex flex-col gap-5 pt-1 pb-6 overflow-x-hidden select-none" dir={dir}>
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
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
        {/* Card 1: Liked Songs */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('favorites');
          }}
          className="flex items-center gap-2.5 h-[50px] sm:h-[54px] p-1.5 rounded-xl bg-[#14141c] border border-white/[0.08] active:scale-[0.97] transition-transform overflow-hidden cursor-pointer"
        >
          <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center bg-gradient-to-br from-[#FA243C] to-[#FF375F] shrink-0 shadow-md">
            <Heart className="w-4.5 h-4.5 text-white fill-white" />
          </div>
          <div className="min-w-0 flex-1 pe-1">
            <span className="text-[12px] sm:text-[13px] font-semibold text-white truncate block leading-tight">
              {t.likedSongsCard}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-white/50 block font-mono mt-0.5">
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
          className="flex items-center gap-2.5 h-[50px] sm:h-[54px] p-1.5 rounded-xl bg-[#14141c] border border-white/[0.08] active:scale-[0.97] transition-transform overflow-hidden cursor-pointer"
        >
          <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center bg-gradient-to-br from-[#7D12FF] to-[#FA243C] shrink-0 shadow-md">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0 flex-1 pe-1">
            <span className="text-[12px] sm:text-[13px] font-semibold text-white truncate block leading-tight">
              {isRTL ? 'استوديو الصوت 3D' : '3D Sound Studio'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-purple-300 block font-mono mt-0.5">
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
              className={`flex items-center gap-2.5 h-[50px] sm:h-[54px] p-1.5 rounded-xl border active:scale-[0.97] transition-transform overflow-hidden cursor-pointer ${
                isCur
                  ? 'bg-[#FA243C]/20 border-[#FA243C]/40'
                  : 'bg-[#14141c] border-white/[0.08]'
              }`}
            >
              <img
                src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                alt={trk.title}
                loading="lazy"
                decoding="async"
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg object-cover shrink-0 bg-black/40 shadow-sm"
              />
              <div className="min-w-0 flex-1 pe-1">
                <span className={`text-[12px] sm:text-[13px] font-semibold truncate block leading-tight ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                  <bdi dir="auto">{trk.title}</bdi>
                </span>
                <span className="text-[9.5px] sm:text-[10px] text-white/50 truncate block mt-0.5">
                  <bdi dir="auto">{trk.artist}</bdi>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 2. Featured Spotlight Hero Card (Architectural Chamfer & Obsidian Glass) ── */}
      {spotlightTrack && (
        <div
          onClick={() => handleTrackClick(spotlightTrack)}
          style={{
            boxShadow: `0 16px 40px rgba(0,0,0,0.85), 0 0 45px -12px ${spotlightTrack.dominantColor || '#FA243C'}35, inset 0 1px 0 rgba(255,255,255,0.14)`,
          }}
          className="h-[138px] sm:h-[155px] w-full rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#161622] via-[#0f0f18] to-[#060608] border border-white/15 select-none cursor-pointer active:scale-[0.98] transition-all duration-200"
        >
          {/* Dynamic Cover Ambient Mesh Underlay */}
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-30 transform-gpu blur-sm"
            style={{
              backgroundImage: `url(${spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'})`,
            }}
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#060608] via-[#060608]/80 to-transparent" />
          <div className="absolute inset-0 vinyl-sheen pointer-events-none" />

          {/* Top Badges & Audio Engine Indicators */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-1.5" dir="ltr">
              <span className="apple-badge bg-[#FA243C]/20 border-[#FA243C]/35 text-[#FF375F] text-[8px] sm:text-[9px] font-bold py-0.5 px-2">
                STUDIO MASTER
              </span>
              <span className="apple-badge bg-white/10 border-white/15 text-white/90 text-[8px] sm:text-[9px] py-0.5 px-2">
                24-BIT / 96kHz ALAC
              </span>
            </div>
            {currentTrack?.id === spotlightTrack.id && isPlaying && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
                <span className="w-1 bg-[#FA243C] rounded-full aura-soundbar-1 h-2.5" />
                <span className="w-1 bg-[#FF375F] rounded-full aura-soundbar-2 h-2" />
                <span className="w-1 bg-[#FA243C] rounded-full aura-soundbar-3 h-3" />
                <span className="text-[9px] font-mono font-bold text-white/70 ms-1">LIVE</span>
              </div>
            )}
          </div>

          {/* Bottom Row */}
          <div className="flex items-end justify-between gap-2.5 sm:gap-3 z-10">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div className="relative group shrink-0">
                <img
                  src={spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'}
                  alt={spotlightTrack.title}
                  loading="eager"
                  decoding="async"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0 shadow-lg border border-white/20 bg-black/50"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14.5px] sm:text-[16px] font-bold text-white truncate tracking-tight leading-snug">
                  <bdi dir="auto">{spotlightTrack.title}</bdi>
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11.5px] sm:text-[12.5px] text-white/65 font-medium truncate">
                    <bdi dir="auto">{spotlightTrack.artist}</bdi>
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono hidden xs:inline">
                    • {spotlightTrack.bpm || 124} BPM
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTrackClick(spotlightTrack);
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-90 transition-transform shrink-0 hover:scale-105"
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

      {/* ── 3. Section: Made For You (Vinyl Depth Cards Snap Carousel) ── */}
      {madeForYou.length > 0 && (
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[18px] font-bold tracking-tight text-white flex items-center gap-2">
              <span>{t.madeForYou}</span>
              <span className="text-[10px] font-mono text-[#FA243C] font-semibold bg-[#FA243C]/10 px-2 py-0.5 rounded-full border border-[#FA243C]/20">VINYL</span>
            </h2>
            <span className="text-[11px] text-white/40">{t.swipeToExplore}</span>
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-3 px-3 pb-2 pt-1">
            {madeForYou.map((trk) => {
              const isCur = currentTrack?.id === trk.id;
              const trackBpm = trk.bpm || (118 + (Math.abs(trk.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 25));
              return (
                <div
                  key={trk.id}
                  onClick={() => handleTrackClick(trk, madeForYou)}
                  className="group relative w-[116px] sm:w-[130px] shrink-0 snap-start flex flex-col gap-1.5 cursor-pointer active:scale-[0.97] transition-all select-none"
                >
                  {/* Layered Vinyl Disc Behind Artwork */}
                  <div className="relative w-[116px] h-[116px] sm:w-[130px] sm:h-[130px]">
                    <div className="absolute top-1 -end-1.5 w-[90%] h-[90%] rounded-full vinyl-disc-groove border border-white/10 opacity-75 group-hover:translate-x-3 group-hover:rotate-45 group-active:translate-x-1.5 transition-all duration-300 pointer-events-none" />

                    {/* Album Artwork Sleeve */}
                    <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden bg-[#101016] shadow-md border border-white/[0.08] specular-highlight-subtle group-hover:border-white/20 transition-colors">
                      <img
                        src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                        alt={trk.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 vinyl-sheen pointer-events-none" />
                      {isCur && isPlaying && (
                        <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-[1px] flex items-center justify-center gap-[2.5px]">
                          <span className="w-1 bg-[#FA243C] rounded-full aura-soundbar-1 h-4" />
                          <span className="w-1 bg-[#FF375F] rounded-full aura-soundbar-2 h-2.5" />
                          <span className="w-1 bg-[#FA243C] rounded-full aura-soundbar-3 h-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <h4 className={`text-[12.5px] sm:text-[13px] font-semibold truncate leading-snug mt-1 ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                    <bdi dir="auto">{trk.title}</bdi>
                  </h4>
                  <div className="flex items-center justify-between text-[10.5px] text-white/50 truncate font-medium">
                    <span className="truncate max-w-[80px]"><bdi dir="auto">{trk.artist}</bdi></span>
                    <span className="text-[9px] font-mono text-zinc-400 tabular-nums">{trackBpm} BPM</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. Section: Trending Hits (Vinyl Depth Cards Snap Carousel) ── */}
      {trendingHits.length > 0 && (
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[18px] font-bold tracking-tight text-white flex items-center gap-2">
              <span>{isRTL ? 'الأكثر استماعاً' : 'Trending Hits'}</span>
              <span className="text-[10px] font-mono text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">HOT</span>
            </h2>
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-3 px-3 pb-2 pt-1">
            {trendingHits.map((trk) => {
              const isCur = currentTrack?.id === trk.id;
              const trackBpm = trk.bpm || (120 + (Math.abs(trk.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 20));
              return (
                <div
                  key={trk.id}
                  onClick={() => handleTrackClick(trk, trendingHits)}
                  className="group relative w-[116px] sm:w-[130px] shrink-0 snap-start flex flex-col gap-1.5 cursor-pointer active:scale-[0.97] transition-all select-none"
                >
                  {/* Layered Vinyl Disc Behind Artwork */}
                  <div className="relative w-[116px] h-[116px] sm:w-[130px] sm:h-[130px]">
                    <div className="absolute top-1 -end-1.5 w-[90%] h-[90%] rounded-full vinyl-disc-groove border border-white/10 opacity-75 group-hover:translate-x-3 group-hover:rotate-45 group-active:translate-x-1.5 transition-all duration-300 pointer-events-none" />

                    {/* Album Artwork Sleeve */}
                    <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden bg-[#101016] shadow-md border border-white/[0.08] specular-highlight-subtle group-hover:border-white/20 transition-colors">
                      <img
                        src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                        alt={trk.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 vinyl-sheen pointer-events-none" />
                      {isCur && isPlaying && (
                        <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-[1px] flex items-center justify-center gap-[2.5px]">
                          <span className="w-1 bg-[#FA243C] rounded-full aura-soundbar-1 h-4" />
                          <span className="w-1 bg-[#FF375F] rounded-full aura-soundbar-2 h-2.5" />
                          <span className="w-1 bg-[#FA243C] rounded-full aura-soundbar-3 h-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <h4 className={`text-[12.5px] sm:text-[13px] font-semibold truncate leading-snug mt-1 ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                    <bdi dir="auto">{trk.title}</bdi>
                  </h4>
                  <div className="flex items-center justify-between text-[10.5px] text-white/50 truncate font-medium">
                    <span className="truncate max-w-[80px]"><bdi dir="auto">{trk.artist}</bdi></span>
                    <span className="text-[9px] font-mono text-zinc-400 tabular-nums">{trackBpm} BPM</span>
                  </div>
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
