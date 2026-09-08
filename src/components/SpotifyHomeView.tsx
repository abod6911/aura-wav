import React, { useMemo } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Pause, Heart, Clock, FolderPlus } from 'lucide-react';

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

  // Dynamic Arabic greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'صباح الخير';
    if (hour >= 12 && hour < 18) return 'مساء الخير';
    return 'ليلة سعيدة وموسيقى هادئة';
  }, []);

  // Format track duration
  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Top 5 tracks for Quick Access Grid
  const quickAccessTracks = useMemo(() => tracks.slice(0, 5), [tracks]);

  // Carousels
  const recentTracks = useMemo(() => tracks.slice(0, 10), [tracks]);
  const popularReleases = useMemo(() => tracks.slice(5, 15), [tracks]);
  const topMixes = useMemo(() => tracks.slice(10, 20), [tracks]);

  // Liked tracks
  const likedTracks = useMemo(
    () => tracks.filter((t) => favorites.includes(t.id)),
    [tracks, favorites]
  );

  const heroAccentColor = currentTrack?.dominantColor || currentTrack?.accentColor || '#1DB954';

  return (
    <div className="w-full min-h-screen text-white pb-32">
      {/* Dynamic Hero Gradient Header */}
      <div
        className="px-4 sm:px-6 md:px-8 pt-6 pb-8 transition-colors duration-700 ease-out"
        style={{
          background: `linear-gradient(180deg, ${heroAccentColor}44 0%, #121212 100%)`,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
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

        {/* 6 Quick Access Grid Tiles */}
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

          {/* Tiles 2-6: Top Library Tracks */}
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
                  className="w-14 sm:w-16 h-14 sm:h-16 object-cover flex-shrink-0"
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
      <div className="px-4 sm:px-6 md:px-8 space-y-8 mt-4">
        {/* CAROUSEL 1: Recently Played */}
        {recentTracks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  تم تشغيلها مؤخراً
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">بناءً على نشاط استماعك الأخير</p>
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {recentTracks.map((t) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t)}
                    className="group spotify-card p-3.5 flex-shrink-0 w-40 sm:w-44 md:w-48 cursor-pointer relative"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#242424] mb-3 shadow-md">
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
                        className={`absolute bottom-2 left-2 w-11 h-11 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
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

                    <h4 className={`text-sm font-bold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-1">
                      {t.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CAROUSEL 2: Popular Releases */}
        {popularReleases.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  إصدارات شائعة
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">مختارات موسيقية ذات تقييم عالٍ</p>
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {popularReleases.map((t) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t)}
                    className="group spotify-card p-3.5 flex-shrink-0 w-40 sm:w-44 md:w-48 cursor-pointer relative"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#242424] mb-3 shadow-md">
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
                        className={`absolute bottom-2 left-2 w-11 h-11 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
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

                    <h4 className={`text-sm font-bold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-1">
                      {t.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CAROUSEL 3: Top Mixes */}
        {topMixes.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white hover:underline cursor-pointer">
                  أفضل الميكسات والمجموعات
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">توليفات مصممة خصيصاً لذوقك</p>
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 scroll-smooth">
              {topMixes.map((t) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t)}
                    className="group spotify-card p-3.5 flex-shrink-0 w-40 sm:w-44 md:w-48 cursor-pointer relative"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#242424] mb-3 shadow-md">
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
                        className={`absolute bottom-2 left-2 w-11 h-11 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
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

                    <h4 className={`text-sm font-bold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                      {t.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-1">
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
            <h2 className="text-xl sm:text-2xl font-black text-white">
              جميع الأغاني في مكتبتك ({tracks.length})
            </h2>
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
            {tracks.map((track, idx) => {
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
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
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
        </section>
      </div>
    </div>
  );
};
