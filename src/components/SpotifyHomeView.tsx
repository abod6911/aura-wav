import React, { useMemo, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Play,
  Pause,
  Heart,
  Sparkles,
  Radio,
  FolderPlus,
  Disc3,
  Flame,
  Music2,
} from 'lucide-react';
import { Track } from '../types';
import { motion } from 'framer-motion';

interface SpotifyHomeViewProps {
  onOpenImport?: () => void;
}

export const SpotifyHomeView: React.FC<SpotifyHomeViewProps> = ({ onOpenImport }) => {
  const { t, language, isRTL, dir } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const favorites = usePlayerStore((state) => state.favorites);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);

  const [visibleTableCount, setVisibleTableCount] = useState(30);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t.goodMorning;
    if (hour >= 12 && hour < 17) return t.goodAfternoon;
    if (hour >= 17 && hour < 22) return t.goodEvening;
    return t.peacefulNight;
  }, [t]);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper: Get unique tracks by artist
  const getUniqueByArtist = (trackList: Track[], maxCount: number): Track[] => {
    const seen = new Set<string>();
    const result: Track[] = [];
    for (const trk of trackList) {
      const art = (trk.artist || '').toLowerCase().trim();
      if (!seen.has(art)) {
        seen.add(art);
        result.push(trk);
        if (result.length >= maxCount) break;
      }
    }
    return result;
  };

  const quickAccessTracks = useMemo(() => getUniqueByArtist(tracks, 5), [tracks]);
  const featuredHits = useMemo(() => getUniqueByArtist(tracks, 12), [tracks]);
  const topArtists = useMemo(() => {
    return getUniqueByArtist(tracks, 14).map((trk) => ({
      name: trk.artist,
      avatarUrl: trk.coverUrl || trk.artworkUrl || '/logo.svg',
      track: trk,
    }));
  }, [tracks]);

  const hipHopHits = useMemo(() => {
    const hiphop = tracks.filter((trk) => (trk.genre || '').includes('Hip-Hop'));
    return getUniqueByArtist(hiphop, 10);
  }, [tracks]);

  const rockClassics = useMemo(() => {
    const rock = tracks.filter((trk) => (trk.genre || '').includes('Rock'));
    return getUniqueByArtist(rock, 10);
  }, [tracks]);

  const edmParty = useMemo(() => {
    const edm = tracks.filter((trk) => (trk.genre || '').includes('EDM'));
    return getUniqueByArtist(edm, 10);
  }, [tracks]);

  const likedTracks = useMemo(() => tracks.filter((trk) => favorites.includes(trk.id)), [tracks, favorites]);

  // Spotlight Track (Current or first featured)
  const spotlightTrack = currentTrack || (tracks.length > 0 ? tracks[0] : null);
  const heroAccentColor = spotlightTrack?.dominantColor || spotlightTrack?.accentColor || '#FA243C';

  return (
    <div className="w-full min-h-screen text-white pb-36 select-none overflow-x-hidden" dir={dir}>
      {/* 1. Dynamic Apple Music Ambient Header & Hero Spotlight */}
      <div className="relative px-3 sm:px-6 md:px-8 pt-4 pb-6 transition-colors duration-700">
        {/* Soft Ambient Mesh Glow */}
        <div
          className="absolute inset-0 -z-10 opacity-30 filter blur-[90px] transition-all duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 20%, ${heroAccentColor} 0%, transparent 70%)`,
          }}
        />

        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-bold text-[#FA243C] tracking-wider uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              <span>{t.listenNow}</span>
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mt-0.5">
              {greeting}
            </h1>
          </div>

          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-sm"
            >
              <FolderPlus className="w-4 h-4 text-[#FA243C]" />
              <span className="hidden xs:inline">{t.importFolder}</span>
            </button>
          )}
        </div>

        {/* 2. Hero Spotlight Card (Apple Music Editorial Showcase) */}
        {spotlightTrack && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => playTrack(spotlightTrack)}
            className="relative w-full rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.12] backdrop-blur-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] cursor-pointer group mb-6"
          >
            {/* Background Blur Artwork */}
            <div
              className="absolute inset-0 -z-10 opacity-25 filter blur-[60px] bg-cover bg-center scale-125 transition-transform duration-700 group-hover:scale-130"
              style={{ backgroundImage: `url(${spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'})` }}
            />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Grand Rounded Squircle Artwork */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/20 group-hover:scale-[1.02] transition-transform duration-300">
                <img
                  src={spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'}
                  alt={spotlightTrack.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              </div>

              {/* Editorial Details */}
              <div className="flex-1 min-w-0 text-center sm:text-start flex flex-col justify-between h-full">
                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FA243C]/20 border border-[#FA243C]/30 text-[#FF375F] text-[10px] font-extrabold uppercase tracking-wide mb-2">
                    <Sparkles className="w-3 h-3" />
                    <span>{t.heroListenNow}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white truncate tracking-tight">
                    {spotlightTrack.title}
                  </h3>
                  <p className="text-sm sm:text-base text-zinc-300 font-medium truncate mt-1">
                    {spotlightTrack.artist}
                  </p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {spotlightTrack.album || 'Lossless Audio'}
                  </p>
                </div>

                {/* Instant Play Action Button */}
                <div className="pt-4 flex items-center justify-center sm:justify-start gap-3">
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTrack?.id === spotlightTrack.id) {
                        togglePlayPause();
                      } else {
                        playTrack(spotlightTrack);
                      }
                    }}
                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    {isPlaying && currentTrack?.id === spotlightTrack.id ? (
                      <>
                        <Pause className="w-4 h-4 fill-black text-black" />
                        <span>{t.pause}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                        <span>{t.heroPlayNow}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. Quick Access 2-Column Mobile Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Liked Songs Tile */}
          <div
            onClick={() => {
              if (likedTracks.length > 0) {
                playTrack(likedTracks[0], likedTracks);
              } else {
                setActiveTab('favorites');
              }
            }}
            className="group flex items-center gap-2.5 sm:gap-3 bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-2 sm:p-2.5 transition-all cursor-pointer relative shadow-sm overflow-hidden"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#FA243C] to-[#FF375F] flex items-center justify-center shadow-lg shadow-[#FA243C]/25">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {t.likedSongsCard}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {favorites.length} {t.songs}
              </p>
            </div>
          </div>

          {/* Quick Access Distinct Tracks */}
          {quickAccessTracks.map((trk) => {
            const isCur = currentTrack?.id === trk.id;
            return (
              <div
                key={trk.id}
                onClick={() => playTrack(trk)}
                className="group flex items-center gap-2.5 sm:gap-3 bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-2 sm:p-2.5 transition-all cursor-pointer relative shadow-sm overflow-hidden"
              >
                <img
                  src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                  alt={trk.title}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover flex-shrink-0 shadow-md"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                    {trk.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {trk.artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Horizontal Snap Carousels */}
      <div className="px-3 sm:px-6 md:px-8 space-y-8 mt-4">
        {/* CAROUSEL A: Featured Hits */}
        {featuredHits.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
                  {t.madeForYou}
                </h2>
                <p className="text-xs text-zinc-400">{t.swipeToExplore}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {featuredHits.map((trk) => {
                const isCur = currentTrack?.id === trk.id;
                return (
                  <div
                    key={trk.id}
                    onClick={() => playTrack(trk)}
                    className="group flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-2xl p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 mb-2 shadow-lg">
                      <img
                        src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                        alt={trk.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCur) togglePlayPause();
                          else playTrack(trk);
                        }}
                        className={`absolute bottom-2 left-2 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
                          isCur && isPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                        }`}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-4 h-4 fill-black text-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                      {trk.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {trk.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CAROUSEL B: Top Artists (Circular Avatars with Gradient Rings) */}
        {topArtists.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
                {t.topArtists}
              </h2>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {topArtists.map((art) => (
                <div
                  key={art.name}
                  onClick={() => playTrack(art.track)}
                  className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group text-center w-24 sm:w-28"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2px] bg-gradient-to-tr from-[#FA243C] to-[#FF375F] group-hover:scale-105 transition-transform duration-300 shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden bg-black/60">
                      <img
                        src={art.avatarUrl}
                        alt={art.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-200 truncate w-full group-hover:text-white">
                    {art.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CAROUSEL C: Hip-Hop & Rap Hits */}
        {hipHopHits.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
              {isRTL ? 'هيب هوب وراب' : 'Hip-Hop & Rap'}
            </h2>
            <div className="flex items-center gap-3.5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {hipHopHits.map((trk) => (
                <div
                  key={trk.id}
                  onClick={() => playTrack(trk)}
                  className="group flex-shrink-0 w-36 sm:w-40 cursor-pointer rounded-2xl p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-black/40 mb-2">
                    <img src={trk.coverUrl || trk.artworkUrl || '/logo.svg'} alt={trk.title} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{trk.title}</h4>
                  <p className="text-[11px] text-zinc-400 truncate">{trk.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CAROUSEL D: Rock & Alternative */}
        {rockClassics.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
              {isRTL ? 'روك وبديل' : 'Rock & Alternative'}
            </h2>
            <div className="flex items-center gap-3.5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {rockClassics.map((trk) => (
                <div
                  key={trk.id}
                  onClick={() => playTrack(trk)}
                  className="group flex-shrink-0 w-36 sm:w-40 cursor-pointer rounded-2xl p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-black/40 mb-2">
                    <img src={trk.coverUrl || trk.artworkUrl || '/logo.svg'} alt={trk.title} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{trk.title}</h4>
                  <p className="text-[11px] text-zinc-400 truncate">{trk.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Library Track Rows (Thumb-friendly 60px touch height) */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
              {isRTL ? 'أحدث المسارات في مكتبتك' : 'Latest Tracks in Library'}
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {tracks.length} {t.songs}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
            {tracks.slice(0, visibleTableCount).map((trk, idx) => {
              const isCur = currentTrack?.id === trk.id;
              return (
                <div
                  key={`${trk.id}_${idx}`}
                  onClick={() => playTrack(trk)}
                  className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                    isCur ? 'bg-[#FA243C]/15' : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                      alt={trk.title}
                      className="w-11 h-11 rounded-xl object-cover flex-shrink-0 shadow-md"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                        {trk.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {trk.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-zinc-400 font-mono">
                      {formatDuration(trk.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCur) togglePlayPause();
                        else playTrack(trk);
                      }}
                      className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-white cursor-pointer"
                    >
                      {isCur && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleTableCount < tracks.length && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setVisibleTableCount((prev) => prev + 30)}
                className="px-6 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white transition-all cursor-pointer"
              >
                {isRTL ? 'عرض المزيد من المسارات...' : 'Show More Tracks...'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
