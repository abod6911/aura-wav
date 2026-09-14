import React, { useState, useEffect, useTransition } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { searchWorldwideMusic, SearchResultsCategorized } from '../services/streamingEngine';
import { Search, Play, Pause, X, Music2, Disc, Mic2, Sparkles } from 'lucide-react';
import { Track } from '../types';

export const InfiniteSearchView: React.FC = () => {
  const { t, isRTL, dir } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'songs' | 'artists' | 'albums'>('all');
  const [results, setResults] = useState<SearchResultsCategorized>({
    topResult: null,
    songs: [],
    artists: [],
    albums: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);

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
    { name: isRTL ? 'موسيقى عربية' : 'Arabic Hits', gradient: 'from-[#FA243C] to-[#b00d1e]' },
    { name: isRTL ? 'بوب عالمي (Pop)' : 'Global Pop', gradient: 'from-[#8d67ab] to-[#5a3a78]' },
    { name: isRTL ? 'هيب هوب وراب' : 'Hip-Hop & Rap', gradient: 'from-[#ba5d07] to-[#803d00]' },
    { name: isRTL ? 'موسيقى هادئة' : 'Chill & Relax', gradient: 'from-[#1e3264] to-[#111c38]' },
    { name: isRTL ? 'روك وبديل' : 'Rock & Alternative', gradient: 'from-[#e61e32] to-[#990d1b]' },
    { name: isRTL ? 'إلكترونيك وEDM' : 'EDM & Dance', gradient: 'from-[#006450] to-[#003d31]' },
    { name: isRTL ? 'طرب وجلسات' : 'Classic Tarab', gradient: 'from-[#af2896] to-[#6d135c]' },
    { name: isRTL ? 'موسيقى عالمية' : 'World Music', gradient: 'from-[#503750] to-[#2c1d2c]' },
  ];

  const handlePlaySong = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(track, results.songs.length > 0 ? results.songs : undefined);
    }
  };

  const categories = [
    { id: 'all' as const, label: t.all },
    { id: 'songs' as const, label: isRTL ? 'الأغاني' : 'Songs' },
    { id: 'artists' as const, label: isRTL ? 'الفنانون' : 'Artists' },
    { id: 'albums' as const, label: isRTL ? 'الألبومات' : 'Albums' },
  ];

  return (
    <div className="w-full min-h-screen text-white pb-36 px-3 sm:px-6 md:px-8 pt-4 select-none" dir={dir}>
      {/* Search Input Bar */}
      <div className="relative max-w-2xl mx-auto mb-5">
        <div className="relative flex items-center bg-white/[0.06] hover:bg-white/[0.1] focus-within:bg-white/[0.12] focus-within:ring-2 focus-within:ring-[#FA243C]/50 rounded-full transition-all shadow-xl border border-white/[0.1] px-4 py-1.5">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full py-2.5 px-3 bg-transparent text-sm sm:text-base font-medium text-white placeholder-zinc-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label={t.clearSearch}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Category Pills */}
      {query.trim() && (
        <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                  : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* State 1: Empty Search -> Browse Genres */}
      {!query.trim() && (
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {isRTL ? 'استكشف الأنواع والموسيقى' : 'Browse Categories & Genres'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {GENRES.map((g) => (
              <div
                key={g.name}
                onClick={() => setQuery(g.name.split(' ')[0])}
                className={`h-28 sm:h-32 rounded-2xl p-4 bg-gradient-to-br ${g.gradient} cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg relative overflow-hidden flex flex-col justify-between`}
              >
                <span className="text-sm sm:text-base font-black text-white leading-snug drop-shadow-md">
                  {g.name}
                </span>
                <Disc className="w-12 h-12 text-white/20 absolute -bottom-2 -right-2 transform rotate-12" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State 2: Loading State */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 rounded-full border-3 border-[#FA243C]/20 border-t-[#FA243C] animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">
            {isRTL ? 'جاري البحث في الأغاني...' : 'Searching music catalog...'}
          </p>
        </div>
      )}

      {/* State 3: Search Results */}
      {!isLoading && query.trim() && (
        <div className="max-w-5xl mx-auto space-y-6">
          {results.songs.length === 0 && results.artists.length === 0 && (
            <div className="py-20 text-center text-zinc-500 text-sm font-medium">
              {t.noTracksFound}
            </div>
          )}

          {/* Songs List */}
          {results.songs.length > 0 && (activeCategory === 'all' || activeCategory === 'songs') && (
            <div className="space-y-3">
              <h3 className="text-lg font-black text-white">
                {isRTL ? 'الأغاني' : 'Songs'}
              </h3>
              <div className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                {results.songs.map((trk) => {
                  const isCur = currentTrack?.id === trk.id;
                  return (
                    <div
                      key={trk.id}
                      onClick={() => handlePlaySong(trk)}
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
                            handlePlaySong(trk);
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
