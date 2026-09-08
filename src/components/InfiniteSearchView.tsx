import React, { useState, useEffect, useTransition } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { searchWorldwideMusic, SearchResultsCategorized } from '../services/streamingEngine';
import { Search, Play, Pause, Heart, Plus, Clock, Disc, Mic2, Sparkles, X } from 'lucide-react';
import { Track } from '../types';

export const InfiniteSearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'songs' | 'artists' | 'albums'>('all');
  const [results, setResults] = useState<SearchResultsCategorized>({
    topResult: null,
    songs: [],
    artists: [],
    albums: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const addToast = usePlayerStore((state) => state.addToast);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ topResult: null, songs: [], artists: [], albums: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchWorldwideMusic(query);
        startTransition(() => {
          setResults(res);
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Search error:', err);
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const GENRES = [
    { name: 'موسيقى عربية', gradient: 'from-[#e91429] to-[#b00d1e]' },
    { name: 'بوب عالمي (Pop)', gradient: 'from-[#8d67ab] to-[#5a3a78]' },
    { name: 'هيب هوب وراب', gradient: 'from-[#ba5d07] to-[#803d00]' },
    { name: 'موسيقى هادئة واسترخاء', gradient: 'from-[#1e3264] to-[#111c38]' },
    { name: 'روك وحماسي', gradient: 'from-[#e61e32] to-[#990d1b]' },
    { name: 'إلكترونيك وEDM', gradient: 'from-[#006450] to-[#003d31]' },
    { name: 'جلسات وطرب', gradient: 'from-[#af2896] to-[#6d135c]' },
    { name: 'موسيقى تركية', gradient: 'from-[#503750] to-[#2c1d2c]' },
  ];

  const handlePlaySong = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(track, results.songs.length > 0 ? results.songs : undefined);
    }
  };

  return (
    <div className="w-full min-h-screen text-white pb-32 px-4 sm:px-6 md:px-8 pt-4">
      {/* Search Input Bar */}
      <div className="relative max-w-2xl mx-auto mb-6">
        <div className="relative flex items-center bg-[#242424] hover:bg-[#2a2a2a] focus-within:bg-[#2a2a2a] focus-within:ring-2 focus-within:ring-white rounded-full transition-all shadow-lg border border-white/5">
          <Search className="w-5 h-5 text-zinc-400 mr-4 ml-2 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ما الذي تريد الاستماع إليه؟ (أغنية، فنان، ألبوم)..."
            className="w-full py-3.5 bg-transparent text-sm sm:text-base font-medium text-white placeholder-zinc-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-2 ml-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        {query.trim() && (
          <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
            {(['all', 'songs', 'artists', 'albums'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-white text-black'
                    : 'bg-[#242424] text-white hover:bg-[#333333]'
                }`}
              >
                {cat === 'all' && 'الكل'}
                {cat === 'songs' && 'الأغاني'}
                {cat === 'artists' && 'الفنانون'}
                {cat === 'albums' && 'الألبومات'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 rounded-full border-3 border-[#1DB954]/20 border-t-[#1DB954] animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">جاري البحث في الأرشيف الموسيقي العالمي...</p>
        </div>
      )}

      {/* No Query / Browse Genres State */}
      {!query.trim() && !isLoading && (
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-white">تصفح كل الأنواع الموسيقية</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {GENRES.map((g) => (
              <div
                key={g.name}
                onClick={() => setQuery(g.name.split(' ')[0])}
                className={`relative aspect-[16/10] rounded-xl p-4 overflow-hidden bg-gradient-to-br ${g.gradient} cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md group`}
              >
                <h3 className="text-base sm:text-lg font-black text-white max-w-[80%] leading-snug">
                  {g.name}
                </h3>
                <Disc className="w-16 h-16 text-black/20 absolute -bottom-2 -left-2 rotate-25 group-hover:rotate-45 transition-transform duration-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {query.trim() && !isLoading && (
        <div className="space-y-8">
          {/* TOP RESULT & SONGS SECTION (Classic Spotify 2-Column on Desktop) */}
          {(activeCategory === 'all' || activeCategory === 'songs') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Result Card */}
              {results.topResult && activeCategory === 'all' && (
                <div className="lg:col-span-5 space-y-3">
                  <h3 className="text-lg sm:text-xl font-black text-white">أفضل نتيجة</h3>
                  <div
                    onClick={() => handlePlaySong(results.topResult!)}
                    className="group relative p-5 rounded-2xl bg-[#181818] hover:bg-[#282828] transition-all cursor-pointer shadow-xl flex flex-col justify-between aspect-auto sm:h-[220px]"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={results.topResult.coverUrl || results.topResult.artworkUrl || '/logo.svg'}
                        alt={results.topResult.title}
                        className="w-24 h-24 rounded-xl object-cover shadow-lg flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xl font-black text-white truncate group-hover:underline">
                          {results.topResult.title}
                        </h4>
                        <p className="text-sm text-zinc-400 truncate mt-1">
                          {results.topResult.artist}
                        </p>
                        <span className="inline-block mt-3 px-3 py-1 rounded-full bg-black/40 text-[11px] font-bold text-white uppercase tracking-wider">
                          أغنية
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySong(results.topResult!);
                        }}
                        className="w-12 h-12 rounded-full bg-[#1DB954] text-black shadow-2xl flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all cursor-pointer"
                      >
                        {currentTrack?.id === results.topResult.id && isPlaying ? (
                          <Pause className="w-6 h-6 fill-black text-black" />
                        ) : (
                          <Play className="w-6 h-6 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Songs List */}
              <div className={`${results.topResult && activeCategory === 'all' ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
                <h3 className="text-lg sm:text-xl font-black text-white">الأغاني</h3>
                <div className="space-y-1">
                  {results.songs.slice(0, activeCategory === 'songs' ? 25 : 5).map((song) => {
                    const isCur = currentTrack?.id === song.id;
                    const isFav = favorites.includes(song.id);

                    return (
                      <div
                        key={song.id}
                        onClick={() => handlePlaySong(song)}
                        className={`group flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer ${
                          isCur ? 'bg-white/5' : ''
                        }`}
                      >
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                          <img
                            src={song.coverUrl || song.artworkUrl || '/logo.svg'}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${
                            isCur ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          } transition-opacity`}>
                            {isCur && isPlaying ? (
                              <Pause className="w-4 h-4 text-white fill-white" />
                            ) : (
                              <Play className="w-4 h-4 text-white fill-white translate-x-0.5" />
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${isCur ? 'text-[#1DB954]' : 'text-white'}`}>
                            {song.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {song.artist}
                          </p>
                        </div>

                        <span className="text-xs text-zinc-400 font-mono flex-shrink-0">
                          {formatDuration(song.duration)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToQueue(song);
                            addToast(`تمت إضافة "${song.title}" إلى قائمة الانتظار`, undefined, 'success');
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-white transition-opacity cursor-pointer"
                          title="إضافة إلى قائمة الانتظار"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(song.id);
                          }}
                          className={`p-2 transition-colors cursor-pointer ${
                            isFav ? 'text-[#1DB954]' : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isFav ? 'fill-[#1DB954]' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ARTISTS SECTION */}
          {(activeCategory === 'all' || activeCategory === 'artists') && results.artists.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg sm:text-xl font-black text-white">الفنانون</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {results.artists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => setQuery(artist.name)}
                    className="group spotify-card p-4 rounded-xl flex flex-col items-center text-center cursor-pointer relative"
                  >
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-3 shadow-xl bg-zinc-800">
                      <img
                        src={artist.avatarUrl}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h4 className="text-sm font-bold text-white truncate w-full group-hover:underline">
                      {artist.name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      {artist.listeners || 'فنان'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALBUMS SECTION */}
          {(activeCategory === 'all' || activeCategory === 'albums') && results.albums.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg sm:text-xl font-black text-white">الألبومات</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {results.albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => setQuery(`${album.title} ${album.artist}`)}
                    className="group spotify-card p-4 rounded-xl cursor-pointer relative"
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden mb-3 shadow-md bg-zinc-800">
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h4 className="text-sm font-bold text-white truncate group-hover:underline">
                      {album.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-1">
                      {album.year ? `${album.year} • ${album.artist}` : album.artist}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Results Check */}
          {results.songs.length === 0 && results.artists.length === 0 && results.albums.length === 0 && (
            <div className="py-24 text-center text-zinc-400 space-y-2">
              <p className="text-base font-bold text-white">لم يتم العثور على نتائج لـ "{query}"</p>
              <p className="text-xs">تأكد من كتابة الكلمات بشكل صحيح أو جرب البحث بكلمات أخرى.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
