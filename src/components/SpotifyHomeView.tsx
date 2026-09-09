import React, { useMemo, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, Heart, Clock, FolderPlus, Sparkles, Music2, Disc3, Radio, ChevronLeft } from 'lucide-react';
import { Track } from '../types';

interface SpotifyHomeViewProps {
  onOpenImport?: () => void;
}

export const SpotifyHomeView: React.FC<SpotifyHomeViewProps> = ({ onOpenImport }) => {
  const tracks = usePlayerStore((state) => state.tracks);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const setActiveTab = usePlayerStore((state) => state.setActiveTab);
  const setSearchQuery = usePlayerStore((state) => state.setSearchQuery);

  const [visibleTableCount, setVisibleTableCount] = useState(40);

  // Dynamic Arabic greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'صباح الخير';
    if (hour >= 12 && hour < 18) return 'مساء الخير';
    return 'ليلة سعيدة وموسيقى هادئة';
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper: Get unique tracks by artist to prevent ANY repetitive images
  const getUniqueByArtist = (trackList: Track[], maxCount: number): Track[] => {
    const seen = new Set<string>();
    const result: Track[] = [];
    for (const t of trackList) {
      const art = (t.artist || '').toLowerCase().trim();
      if (!seen.has(art)) {
        seen.add(art);
        result.push(t);
        if (result.length >= maxCount) break;
      }
    }
    return result;
  };

  // 1. Quick Access (5 diverse tracks from top legends across different genres)
  const quickAccessTracks = useMemo(() => {
    return getUniqueByArtist(tracks, 5);
  }, [tracks]);

  // 2. Curated Today's Top Hits (10 diverse artists)
  const featuredHits = useMemo(() => {
    return getUniqueByArtist(tracks, 12);
  }, [tracks]);

  // 3. Top Artists (Circular Avatars for 14 global legends)
  const topArtists = useMemo(() => {
    const uniqueArtists = getUniqueByArtist(tracks, 15);
    return uniqueArtists.map((t) => ({
      name: t.artist,
      avatarUrl: t.coverUrl || t.artworkUrl || '/logo.svg',
      track: t,
    }));
  }, [tracks]);

  // 4. Genre Specific Carousels (Each showing 10 distinct artists per genre!)
  const hipHopHits = useMemo(() => {
    const hiphop = tracks.filter((t) => (t.genre || '').includes('Hip-Hop'));
    return getUniqueByArtist(hiphop, 10);
  }, [tracks]);

  const rockClassics = useMemo(() => {
    const rock = tracks.filter((t) => (t.genre || '').includes('Rock'));
    return getUniqueByArtist(rock, 10);
  }, [tracks]);

  const edmParty = useMemo(() => {
    const edm = tracks.filter((t) => (t.genre || '').includes('EDM'));
    return getUniqueByArtist(edm, 10);
  }, [tracks]);

  const rnbSoul = useMemo(() => {
    const rnb = tracks.filter((t) => (t.genre || '').includes('R&B'));
    return getUniqueByArtist(rnb, 10);
  }, [tracks]);

  // Liked tracks
  const likedTracks = useMemo(
    () => tracks.filter((t) => favorites.includes(t.id)),
    [tracks, favorites]
  );

  const heroAccentColor = currentTrack?.dominantColor || currentTrack?.accentColor || '#1DB954';

  const GENRES_LIST = [
    { name: 'بوب عالمي', genre: 'Pop', color: 'from-[#E1306C] to-[#833AB4]', tracksCount: 350 },
    { name: 'هيب هوب وراب', genre: 'Hip-Hop & Trap', color: 'from-[#BA5D07] to-[#E65100]', tracksCount: 350 },
    { name: 'روك وبديل', genre: 'Rock & Alternative', color: 'from-[#E91429] to-[#800C17]', tracksCount: 350 },
    { name: 'إلكترونيك و EDM', genre: 'EDM & Dance', color: 'from-[#0D72EA] to-[#003882]', tracksCount: 350 },
    { name: 'آر آند بي وسول', genre: 'R&B & Soul', color: 'from-[#8D67AB] to-[#4A154B]', tracksCount: 350 },
  ];

  return (
    <div className="w-full min-h-screen text-white pb-36 select-none">
      {/* Dynamic Hero Gradient Header */}
      <div
        className="px-4 sm:px-6 md:px-8 pt-6 pb-8 transition-colors duration-700 ease-out"
        style={{
          background: `linear-gradient(180deg, ${heroAccentColor}33 0%, #121212 100%)`,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
            {greeting}
          </h1>
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer backdrop-blur-md"
            >
              <FolderPlus className="w-4 h-4 text-[#1DB954]" />
              <span>إضافة مجلد</span>
            </button>
          )}
        </div>

        {/* 6 Quick Access Grid Tiles (100% DIVERSE ARTISTS & COVERS) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Tile 1: Pinned Liked Songs */}
          <div
            onClick={() => {
              if (likedTracks.length > 0) {
                playTrack(likedTracks[0], likedTracks);
              } else {
                setActiveTab('favorites');
              }
            }}
            className="group flex items-center gap-3 bg-white/5 hover:bg-white/15 backdrop-blur-md rounded-md overflow-hidden transition-all cursor-pointer relative shadow-sm hover:shadow-md pr-3"
          >
            <div className="w-14 sm:w-16 h-14 sm:h-16 flex-shrink-0 bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                الأغاني المعجب بها
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {favorites.length} أغنية
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (likedTracks.length > 0) {
                  playTrack(likedTracks[0], likedTracks);
                }
              }}
              className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 transition-all duration-200 flex-shrink-0 cursor-pointer"
              title="تشغيل الأغاني المعجب بها"
            >
              <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
            </button>
          </div>

          {/* Tiles 2-6: Top Distinct Artists */}
          {quickAccessTracks.map((t) => {
            const isCur = currentTrack?.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => playTrack(t)}
                className="group flex items-center gap-3 bg-white/5 hover:bg-white/15 backdrop-blur-md rounded-md overflow-hidden transition-all cursor-pointer relative shadow-sm hover:shadow-md pr-3"
              >
                <img
                  src={t.coverUrl || t.artworkUrl || '/logo.svg'}
                  alt={t.title}
                  className="w-14 sm:w-16 h-14 sm:h-16 object-cover flex-shrink-0 shadow-md"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs sm:text-sm font-bold truncate ${
                      isCur ? 'text-[#1DB954]' : 'text-white'
                    }`}
                  >
                    {t.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {t.artist}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCur) togglePlayPause();
                    else playTrack(t);
                  }}
                  className={`w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer ${
                    isCur && isPlaying
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                  }`}
                >
                  {isCur && isPlaying ? (
                    <Pause className="w-5 h-5 fill-black text-black" />
                  ) : (
                    <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Sections & Carousels */}
      <div className="px-4 sm:px-6 md:px-8 space-y-9 mt-4">
        {/* CAROUSEL 1: Featured Hits (Diverse Superstars) */}
        {featuredHits.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  مختارات مميزة لك اليوم
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">أشهر المسارات العالمية من كبار الفنانين</p>
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {featuredHits.map((t) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t)}
                    className="group spotify-card p-3 flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#242424] mb-2.5 shadow-lg">
                      <img
                        src={t.coverUrl || t.artworkUrl || '/logo.svg'}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCur) togglePlayPause();
                          else playTrack(t);
                        }}
                        className={`absolute bottom-2 left-2 w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
                          isCur && isPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                        }`}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-5 h-5 fill-black text-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {t.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 2: Popular Artists (Circular Avatars) */}
        {topArtists.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  أشهر الفنانين
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">كبار النجوم العالميين في مكتبتك الموسيقية</p>
              </div>
            </div>

            <div className="flex items-center gap-5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {topArtists.map((art) => (
                <div
                  key={art.name}
                  onClick={() => {
                    setSearchQuery(art.name);
                    setActiveTab('search');
                  }}
                  className="group flex-shrink-0 w-28 sm:w-32 text-center cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-all"
                >
                  <div className="relative aspect-square w-full rounded-full overflow-hidden mb-2.5 shadow-xl border border-white/10 group-hover:border-[#1DB954] transition-colors">
                    <img
                      src={art.avatarUrl}
                      alt={art.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#1DB954] transition-colors">
                    {art.name}
                  </h4>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">فنان</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 3: Browse by Genre Bento Cards */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              تصفح حسب النمط الموسيقي
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {GENRES_LIST.map((g) => (
              <div
                key={g.genre}
                onClick={() => {
                  setSearchQuery(g.genre);
                  setActiveTab('search');
                }}
                className={`p-4 rounded-xl bg-gradient-to-br ${g.color} cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-lg relative overflow-hidden group min-h-[90px] flex flex-col justify-between`}
              >
                <h3 className="text-sm sm:text-base font-black text-white">{g.name}</h3>
                <span className="text-[11px] text-white/80 font-medium">350 أغنية</span>
              </div>
            ))}
          </div>
        </section>

        {/* CAROUSEL 4: Hip-Hop & Rap */}
        {hipHopHits.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  هيب هوب وراب عالمي
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">أفضل إيقاعات الـ Trap و Rap المعاصرة</p>
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {hipHopHits.map((t) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t)}
                    className="group spotify-card p-3 flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#242424] mb-2.5 shadow-lg">
                      <img
                        src={t.coverUrl || t.artworkUrl || '/logo.svg'}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCur) togglePlayPause();
                          else playTrack(t);
                        }}
                        className={`absolute bottom-2 left-2 w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
                          isCur && isPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                        }`}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-5 h-5 fill-black text-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {t.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CAROUSEL 5: Rock & Alternative */}
        {rockClassics.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  روك وكلاسيكيات أسطورية
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">أيقونات الروك الكلاسيكي والبديل</p>
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {rockClassics.map((t) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t)}
                    className="group spotify-card p-3 flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#242424] mb-2.5 shadow-lg">
                      <img
                        src={t.coverUrl || t.artworkUrl || '/logo.svg'}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCur) togglePlayPause();
                          else playTrack(t);
                        }}
                        className={`absolute bottom-2 left-2 w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
                          isCur && isPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                        }`}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-5 h-5 fill-black text-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {t.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CAROUSEL 6: EDM & Dance Party */}
        {edmParty.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  حفلات الـ EDM والموسيقى الإلكترونية
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">إيقاعات ونغمات المهرجانات والحفلات الحماسية</p>
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {edmParty.map((t) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t)}
                    className="group spotify-card p-3 flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#242424] mb-2.5 shadow-lg">
                      <img
                        src={t.coverUrl || t.artworkUrl || '/logo.svg'}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCur) togglePlayPause();
                          else playTrack(t);
                        }}
                        className={`absolute bottom-2 left-2 w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
                          isCur && isPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                        }`}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-5 h-5 fill-black text-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {t.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CAROUSEL 7: Chill R&B & Soul */}
        {rnbSoul.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  أجواء هادئة • آر آند بي وسول
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">أعذب الألحان والموسيقى الاسترخائية</p>
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {rnbSoul.map((t) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t)}
                    className="group spotify-card p-3 flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer relative rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#242424] mb-2.5 shadow-lg">
                      <img
                        src={t.coverUrl || t.artworkUrl || '/logo.svg'}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCur) togglePlayPause();
                          else playTrack(t);
                        }}
                        className={`absolute bottom-2 left-2 w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
                          isCur && isPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                        }`}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-5 h-5 fill-black text-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {t.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FULL TABLE VIEW: Spotify Track Listing */}
        <section className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                جميع الأغاني في مكتبتك ({tracks.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">1750 أغنية منسقة بدقة فائقة</p>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_3fr_1fr_auto] gap-4 px-4 py-2 border-b border-white/10 text-xs font-semibold text-zinc-400">
            <span className="text-center">#</span>
            <span>العنوان</span>
            <span className="hidden md:block">الألبوم</span>
            <span className="hidden md:flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <span className="w-8"></span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/5">
            {tracks.slice(0, visibleTableCount).map((track, idx) => {
              const isCur = currentTrack?.id === track.id;
              const isFav = favorites.includes(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`group grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_3fr_1fr_auto] gap-4 px-4 py-2.5 rounded-lg items-center hover:bg-white/10 transition-colors cursor-pointer ${
                    isCur ? 'bg-white/5' : ''
                  }`}
                >
                  {/* # or Play button */}
                  <div className="flex items-center justify-center text-xs">
                    {isCur && isPlaying ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954] animate-ping" />
                    ) : (
                      <>
                        <span className={`group-hover:hidden ${isCur ? 'text-[#1DB954] font-bold' : 'text-zinc-400'}`}>
                          {idx + 1}
                        </span>
                        <Play className="w-3.5 h-3.5 text-white fill-white hidden group-hover:block translate-x-0.5" />
                      </>
                    )}
                  </div>

                  {/* Title & Artist with artwork */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.coverUrl || track.artworkUrl || '/logo.svg'}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0 shadow"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isCur ? 'text-[#1DB954]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="hidden md:block min-w-0">
                    <p className="text-xs text-zinc-400 truncate">
                      {track.album || 'ألبوم فردي'}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="hidden md:block text-left text-xs text-zinc-400 font-mono">
                    {formatDuration(track.duration)}
                  </div>

                  {/* Favorite button */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(track.id);
                      }}
                      className={`p-1.5 transition-colors cursor-pointer ${
                        isFav
                          ? 'text-[#1DB954]'
                          : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-[#1DB954]' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {visibleTableCount < tracks.length && (
            <div className="text-center pt-4 pb-8">
              <button
                onClick={() => setVisibleTableCount((prev) => Math.min(prev + 50, tracks.length))}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                عرض 50 مساراً إضافياً ({tracks.length - visibleTableCount} متبقية)
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
