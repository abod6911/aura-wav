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
  Flame,
  Music2,
  Disc3,
  CheckCircle2,
  Download,
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
  const history = usePlayerStore((state) => state.history);
  const activeMoodFilter = usePlayerStore((state) => state.activeMoodFilter);
  const setActiveMoodFilter = usePlayerStore((state) => state.setActiveMoodFilter);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);
  const spatialMode = usePlayerStore((state) => state.spatialMode);

  const [visibleTableCount, setVisibleTableCount] = useState(30);

  const MOOD_FILTERS = [
    { id: null, label: isRTL ? 'الكل' : 'All', icon: '🌟' },
    { id: 'energy', label: isRTL ? 'طاقة وحماس' : 'High Energy', icon: '⚡' },
    { id: 'chill', label: isRTL ? 'هدوء وليل' : 'Midnight Chill', icon: '🌙' },
    { id: 'focus', label: isRTL ? 'تركيز وروقان' : 'Deep Focus', icon: '🎧' },
    { id: 'nostalgia', label: isRTL ? 'ذكريات وحنين' : 'Melancholy', icon: '💔' },
    { id: 'road', label: isRTL ? 'خط وسفر' : 'Road Trip', icon: '🚗' },
  ];

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

  const recentlyPlayed = useMemo(() => {
    const seen = new Set<string>();
    return history.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    }).slice(0, 10);
  }, [history]);

  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);

  const downloadedTracks = useMemo(() => {
    if (downloadedTrackIds.length === 0) return [];
    const idSet = new Set(downloadedTrackIds);
    return tracks.filter((t) => idSet.has(t.id));
  }, [tracks, downloadedTrackIds]);

  const { quickAccessTracks, featuredHits, topArtists, hipHopHits, rockClassics } = useMemo(() => {
    const quickAccess: Track[] = [];
    const featured: Track[] = [];
    const artists: { name: string; avatarUrl: string; track: Track }[] = [];
    const hiphop: Track[] = [];
    const rock: Track[] = [];

    const seenQuick = new Set<string>();
    const seenFeatured = new Set<string>();
    const seenArtists = new Set<string>();
    const seenHiphop = new Set<string>();
    const seenRock = new Set<string>();

    for (const trk of tracks) {
      const art = (trk.artist || '').toLowerCase().trim();
      const genre = trk.genre || '';

      if (quickAccess.length < 5 && !seenQuick.has(art)) {
        seenQuick.add(art);
        quickAccess.push(trk);
      }

      if (featured.length < 12 && !seenFeatured.has(art)) {
        seenFeatured.add(art);
        featured.push(trk);
      }

      if (artists.length < 14 && !seenArtists.has(art)) {
        seenArtists.add(art);
        artists.push({
          name: trk.artist,
          avatarUrl: trk.coverUrl || trk.artworkUrl || '/logo.svg',
          track: trk,
        });
      }

      if (hiphop.length < 10 && genre.includes('Hip-Hop') && !seenHiphop.has(art)) {
        seenHiphop.add(art);
        hiphop.push(trk);
      }

      if (rock.length < 10 && genre.includes('Rock') && !seenRock.has(art)) {
        seenRock.add(art);
        rock.push(trk);
      }
    }

    return {
      quickAccessTracks: quickAccess,
      featuredHits: featured,
      topArtists: artists,
      hipHopHits: hiphop,
      rockClassics: rock,
    };
  }, [tracks]);

  const likedTracks = useMemo(() => tracks.filter((trk) => favorites.includes(trk.id)), [tracks, favorites]);

  const displayedTracks = useMemo(() => {
    if (!activeMoodFilter) return tracks;
    return tracks.filter((t) => {
      const g = (t.genre || '').toLowerCase();
      const bpm = t.bpm || 110;
      if (activeMoodFilter === 'energy') return bpm >= 120 || g.includes('hip-hop') || g.includes('rock') || g.includes('dance');
      if (activeMoodFilter === 'chill') return bpm < 110 || g.includes('r&b') || g.includes('pop') || g.includes('acoustic');
      if (activeMoodFilter === 'focus') return bpm <= 100 || g.includes('classical') || g.includes('ambient') || g.includes('instrumental');
      if (activeMoodFilter === 'nostalgia') return g.includes('rock') || g.includes('classic');
      if (activeMoodFilter === 'road') return bpm >= 115 || g.includes('pop') || g.includes('rock');
      return true;
    });
  }, [tracks, activeMoodFilter]);

  // Spotlight Track (Current or first featured)
  const spotlightTrack = currentTrack || (tracks.length > 0 ? tracks[0] : null);
  const heroAccentColor = spotlightTrack?.dominantColor || spotlightTrack?.accentColor || '#FA243C';

  return (
    <div className="w-full text-white pb-[calc(185px+env(safe-area-inset-bottom,20px))] md:pb-28 select-none overflow-x-hidden" dir={dir}>
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
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#FA243C] tracking-wider uppercase flex items-center gap-1.5">
              <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{t.listenNow}</span>
            </span>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mt-0.5">
              {greeting}
            </h1>
          </div>

          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-xl active:scale-95 shadow-sm"
            >
              <FolderPlus className="w-4 h-4 text-[#FA243C]" />
              <span>{t.importFolder}</span>
            </button>
          )}
        </div>

        {/* Mood & Vibe Radar Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar -mx-1 px-1">
          {MOOD_FILTERS.map((mood) => {
            const isSelected = activeMoodFilter === mood.id;
            return (
              <button
                key={mood.id || 'all'}
                onClick={() => setActiveMoodFilter(mood.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-lg shadow-[#FA243C]/25 scale-105'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08]'
                }`}
              >
                <span>{mood.icon}</span>
                <span>{mood.label}</span>
                {mood.id && (
                  <span className="text-[10px] opacity-60 tabular-nums">
                    ({displayedTracks.length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Mood Mix Banner */}
        {activeMoodFilter && (
          <div className="mb-4 p-3 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">
                {MOOD_FILTERS.find((m) => m.id === activeMoodFilter)?.icon}
              </span>
              <div>
                <h4 className="text-xs font-black text-white">
                  {MOOD_FILTERS.find((m) => m.id === activeMoodFilter)?.label}
                </h4>
                <p className="text-[10px] text-zinc-400">
                  {displayedTracks.length} مسار مطابق للمزاج المحدد
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (displayedTracks.length > 0) {
                    playTrack(displayedTracks[0], displayedTracks);
                  }
                }}
                className="px-3.5 py-1.5 rounded-full bg-white text-black font-extrabold text-xs flex items-center gap-1 shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>تشغيل الكل</span>
              </button>
              <button
                onClick={() => setActiveMoodFilter(null)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* 2. Hero Spotlight Card (Apple Music Editorial Showcase) */}
        {spotlightTrack && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => playTrack(spotlightTrack)}
            className="relative w-full rounded-[24px] sm:rounded-[28px] p-4 sm:p-8 apple-glass-card border border-white/[0.14] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.8)] cursor-pointer group mb-5 sm:mb-6 apple-spring"
          >
            {/* Background Blur Artwork */}
            <div
              className="absolute inset-0 -z-10 opacity-25 filter blur-[80px] bg-cover bg-center scale-125 transition-transform duration-700 group-hover:scale-130"
              style={{ backgroundImage: `url(${spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'})` }}
            />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8">
              {/* Grand Rounded Squircle Artwork */}
              <div className="relative w-28 h-28 sm:w-52 sm:h-52 rounded-[18px] sm:rounded-[22px] overflow-hidden shadow-2xl flex-shrink-0 border border-white/20 group-hover:scale-[1.03] transition-transform duration-300">
                <img
                  src={spotlightTrack.artworkUrl || spotlightTrack.coverUrl || '/logo.svg'}
                  alt={spotlightTrack.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              </div>

              {/* Editorial Details */}
              <div className="flex-1 min-w-0 text-center sm:text-start flex flex-col justify-between h-full w-full">
                <div className="w-full min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <span className="apple-badge bg-[#FA243C]/20 border-[#FA243C]/35 text-[#FF375F] text-[9px] sm:text-[10px] font-black">
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      APPLE MUSIC EXCLUSIVE
                    </span>
                    <span className="apple-badge bg-white/10 text-white/90 text-[9px] sm:text-[10px]">
                      LOSSLESS
                    </span>
                    <span className="apple-badge bg-white/10 text-white/90 text-[9px] sm:text-[10px]">
                      SPATIAL AUDIO
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-3xl md:text-4xl font-black text-white truncate tracking-tight">
                    {spotlightTrack.title}
                  </h3>
                  <p className="text-xs sm:text-lg text-zinc-300 font-bold truncate mt-0.5 sm:mt-1">
                    {spotlightTrack.artist}
                  </p>
                  <p className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5 sm:mt-1 font-mono max-w-full">
                    {spotlightTrack.album || 'Apple Digital Master'}
                  </p>
                </div>

                {/* Instant Play Action Button */}
                <div className="pt-3 sm:pt-6 flex items-center justify-center sm:justify-start gap-3">
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
                    className="flex items-center gap-2 sm:gap-2.5 px-5 sm:px-7 py-2 sm:py-3 rounded-full bg-white text-black font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    {isPlaying && currentTrack?.id === spotlightTrack.id ? (
                      <>
                        <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black text-black" />
                        <span>{t.pause}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black text-black translate-x-0.5" />
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {/* Liked Songs Tile */}
          <div
            onClick={() => {
              if (likedTracks.length > 0) {
                playTrack(likedTracks[0], likedTracks);
              } else {
                setActiveTab('favorites');
              }
            }}
            className="group flex items-center gap-2 sm:gap-3 apple-glass-card rounded-[18px] sm:rounded-[20px] p-2 sm:p-3 transition-all cursor-pointer relative shadow-sm overflow-hidden apple-spring"
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex-shrink-0 bg-gradient-to-br from-[#FA243C] to-[#FF375F] flex items-center justify-center shadow-lg shadow-[#FA243C]/25">
              <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-white fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {t.likedSongsCard}
              </p>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate tabular-nums font-mono font-medium">
                {favorites.length} {t.songs}
              </p>
            </div>
          </div>

          {/* Spatial Sound Studio Bento Tile */}
          <div
            onClick={() => setMobilePlayerOpen(true)}
            className="group flex items-center gap-2 sm:gap-3 apple-glass-card rounded-[18px] sm:rounded-[20px] p-2 sm:p-3 transition-all cursor-pointer relative shadow-sm overflow-hidden apple-spring"
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex-shrink-0 bg-gradient-to-br from-[#7D12FF] to-[#FA243C] flex items-center justify-center shadow-lg shadow-[#7D12FF]/30">
              <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {isRTL ? 'استوديو الصوت 3D' : '3D Sound Studio'}
              </p>
              <p className="text-[10px] sm:text-[11px] text-purple-300 truncate font-mono font-medium">
                {spatialMode === 'off' ? 'Hi-Fi Master' : `${spatialMode.toUpperCase()} Active`}
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
                className="group flex items-center gap-2 sm:gap-3 apple-glass-card rounded-[18px] sm:rounded-[20px] p-2 sm:p-2.5 transition-all cursor-pointer relative shadow-sm overflow-hidden apple-spring"
              >
                <img
                  src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                  alt={trk.title}
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover flex-shrink-0 shadow-md group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                    {trk.title}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5">
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
        {/* CAROUSEL - RECENTLY PLAYED */}
        {recentlyPlayed.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
                  سمعتها مؤخراً
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3.5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {recentlyPlayed.map((trk) => {
                const isCur = currentTrack?.id === trk.id;
                return (
                  <div
                    key={trk.id}
                    onClick={() => playTrack(trk)}
                    className="group flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-2xl p-2.5 glass-obsidian-1 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
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

        {/* CAROUSEL - DOWNLOADED / OFFLINE TRACKS */}
        {downloadedTracks.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
                  {isRTL ? 'جاهزة للأوفلاين (بدون إنترنت)' : 'Saved Offline'}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{downloadedTracks.length}</span>
                </span>
              </div>
              <button
                onClick={() => {
                  if (downloadedTracks.length > 0) {
                    playTrack(downloadedTracks[0], downloadedTracks);
                  }
                }}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer transition-colors px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isRTL ? 'تشغيل الكل' : 'Play all'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3.5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {downloadedTracks.map((trk) => {
                const isCur = currentTrack?.id === trk.id;
                return (
                  <div
                    key={trk.id}
                    onClick={() => playTrack(trk, downloadedTracks)}
                    className="group flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-2xl p-2.5 glass-obsidian-1 hover:border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 mb-2 shadow-lg">
                      <img
                        src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                        alt={trk.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-black/60 backdrop-blur-md text-emerald-400 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCur) togglePlayPause();
                          else playTrack(trk, downloadedTracks);
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

                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-emerald-400' : 'text-white'}`}>
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
                    className="group flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-2xl p-2.5 glass-obsidian-1 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                  className="group flex-shrink-0 w-36 sm:w-40 cursor-pointer rounded-2xl p-2.5 glass-obsidian-1 hover:border-white/20 transition-all hover:scale-[1.02]"
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
                  className="group flex-shrink-0 w-36 sm:w-40 cursor-pointer rounded-2xl p-2.5 glass-obsidian-1 hover:border-white/20 transition-all hover:scale-[1.02]"
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

        {/* 5. Library Track Rows (Thumb-friendly 64px touch height) */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
              {activeMoodFilter
                ? `${isRTL ? 'مسارات المزاج: ' : 'Vibe Tracks: '} ${MOOD_FILTERS.find((m) => m.id === activeMoodFilter)?.label}`
                : isRTL ? 'أحدث المسارات في مكتبتك' : 'Latest Tracks in Library'}
            </h2>
            <span className="text-xs text-zinc-400 font-mono tabular-nums">
              {displayedTracks.length} {t.songs}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] rounded-2xl glass-obsidian-1 overflow-hidden">
            {displayedTracks.slice(0, visibleTableCount).map((trk, idx) => {
              const isCur = currentTrack?.id === trk.id;
              return (
                <div
                  key={`${trk.id}_${idx}`}
                  onClick={() => playTrack(trk, displayedTracks)}
                  className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                    isCur ? 'bg-[#FA243C]/15' : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <img
                      src={trk.coverUrl || trk.artworkUrl || '/logo.svg'}
                      alt={trk.title}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-md"
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

                  <div className="flex items-center gap-3.5 flex-shrink-0">
                    <span className="text-xs text-zinc-400 font-mono tabular-nums">
                      {formatDuration(trk.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCur) togglePlayPause();
                        else playTrack(trk, displayedTracks);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white cursor-pointer active:scale-90 transition-all ${
                        isCur
                          ? 'bg-[#FA243C] shadow-lg shadow-[#FA243C]/40'
                          : 'bg-white/[0.08] hover:bg-white/[0.18]'
                      }`}
                    >
                      {isCur && isPlaying ? (
                        <div className="flex items-end gap-[2px] h-3.5 w-3.5 justify-center">
                          <span className="w-0.5 bg-white rounded-full animate-[bounce_0.8s_infinite] h-full" />
                          <span className="w-0.5 bg-white rounded-full animate-[bounce_0.6s_infinite_0.15s] h-2/3" />
                          <span className="w-0.5 bg-white rounded-full animate-[bounce_1s_infinite_0.3s] h-4/5" />
                        </div>
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleTableCount < displayedTracks.length && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setVisibleTableCount((prev) => prev + 30)}
                className="px-6 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white transition-all cursor-pointer active:scale-95"
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
