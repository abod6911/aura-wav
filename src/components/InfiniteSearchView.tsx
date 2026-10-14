import React, { useState, useEffect, useTransition } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { searchWorldwideMusic, SearchResultsCategorized } from '../services/streamingEngine';
import { Search, Play, Pause, X, Disc, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Track } from '../types';
import { OptimizedImage } from './common/OptimizedImage';

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

  const tracks = usePlayerStore((state) => state.tracks);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);

  // Debounced search with local catalog priority & full-length streaming
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
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const GENRES = [
    { name: isRTL ? 'موسيقى عربية' : 'Arabic Hits', query: 'عمرو دياب', gradient: 'from-[#FA243C] to-[#b00d1e]' },
    { name: isRTL ? 'بوب عالمي (Pop)' : 'Global Pop', query: 'Pop', gradient: 'from-[#8d67ab] to-[#5a3a78]' },
    { name: isRTL ? 'هيب هوب وراب' : 'Hip-Hop & Rap', query: 'Rap', gradient: 'from-[#ba5d07] to-[#803d00]' },
    { name: isRTL ? 'موسيقى هادئة' : 'Chill & Relax', query: 'Chill', gradient: 'from-[#1e3264] to-[#111c38]' },
    { name: isRTL ? 'روك وبديل' : 'Rock & Alternative', query: 'Rock', gradient: 'from-[#e61e32] to-[#990d1b]' },
    { name: isRTL ? 'إلكترونيك وEDM' : 'EDM & Dance', query: 'EDM', gradient: 'from-[#006450] to-[#003d31]' },
    { name: isRTL ? 'طرب وجلسات' : 'Classic Tarab', query: 'طرب', gradient: 'from-[#af2896] to-[#6d135c]' },
    { name: isRTL ? 'موسيقى عالمية' : 'World Music', query: 'Hits', gradient: 'from-[#503750] to-[#2c1d2c]' },
  ];

  const handlePlaySong = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        togglePlayPause();
      } else if (playbackState === 'buffering') {
        // Buffering in progress, prevent spam clicks from aborting the stream
        return;
      } else {
        // Re-play cleanly from scratch
        playTrack(track, results.songs.length > 0 ? results.songs : undefined);
      }
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
    <div className="w-full text-white pb-[calc(185px+env(safe-area-inset-bottom,20px))] md:pb-24 px-3 sm:px-6 md:px-8 pt-4 select-none" dir={dir}>
      {/* Search Input Bar - Ergonomic iOS 18 Design */}
      <div className="relative max-w-xl mx-auto mb-4 sm:mb-6">
        <div className="relative flex items-center bg-white/[0.08] hover:bg-white/[0.12] focus-within:bg-white/[0.14] focus-within:ring-1 focus-within:ring-[#FA243C]/60 rounded-2xl transition-all shadow-md border border-white/[0.1] px-3.5 py-1 sm:py-1.5 h-11 sm:h-12">
          <Search className="w-4.5 h-4.5 text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRTL ? 'ابحث عن أغانٍ، فنانين أو ألبومات...' : 'Search songs, artists, albums...'}
            className="w-full h-full px-2.5 sm:px-3 bg-transparent text-xs sm:text-sm font-medium text-white placeholder-zinc-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-full"
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
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-black text-white">
              {isRTL ? 'استكشف الأنواع والموسيقى' : 'Browse Categories & Genres'}
            </h2>
            <span className="text-[11px] sm:text-xs text-[#FA243C] font-bold flex items-center gap-1 self-start xs:self-auto">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{isRTL ? 'تشغيل كامل بدون حدود 30 ثانية' : '100% Full Length Audio'}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
            {GENRES.map((g) => {
              const q = g.query.toLowerCase();
              const matched = tracks.filter((t) => {
                const genre = (t.genre || '').toLowerCase();
                const title = (t.title || '').toLowerCase();
                const artist = (t.artist || '').toLowerCase();
                return genre.includes(q) || title.includes(q) || artist.includes(q);
              });
              const count = matched.length;
              const covers: string[] = [];
              const seenArt = new Set<string>();
              for (const t of matched) {
                const art = t.artworkUrl || t.coverUrl;
                if (art && !seenArt.has(art)) {
                  seenArt.add(art);
                  covers.push(art);
                  if (covers.length === 3) break;
                }
              }
              while (covers.length < 3 && tracks.length > covers.length) {
                const fb = tracks[covers.length]?.artworkUrl || tracks[covers.length]?.coverUrl || '/logo.svg';
                covers.push(fb);
              }

              return (
                <div
                  key={g.name}
                  onClick={() => setQuery(g.query)}
                  className={`h-36 sm:h-40 rounded-[24px] p-4 bg-gradient-to-br ${g.gradient} border border-white/20 cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-xl relative overflow-hidden flex flex-col justify-between group apple-spring select-none`}
                >
                  <div className="z-10 relative">
                    <span className="text-sm sm:text-base font-black text-white leading-tight drop-shadow-md block">
                      {g.name}
                    </span>
                    <span className="text-[11px] font-bold text-white/80 mt-1 block">
                      {count > 0 ? (isRTL ? `${count} مسار` : `${count} tracks`) : (isRTL ? 'استكشف الآن' : 'Explore')}
                    </span>
                  </div>

                  {/* 3D Tilted Artwork Cascade in Bottom Corner */}
                  <div className="absolute -bottom-3 -end-3 w-28 h-28 pointer-events-none transform rotate-12 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 ease-out">
                    {covers[0] && (
                      <div className="absolute top-0 end-0 w-16 h-16 rounded-xl overflow-hidden shadow-2xl border border-white/20 z-30">
                        <img src={covers[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {covers[1] && (
                      <div className="absolute top-3 end-5 w-14 h-14 rounded-xl overflow-hidden shadow-xl border border-white/15 opacity-80 z-20">
                        <img src={covers[1]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {covers[2] && (
                      <div className="absolute top-6 end-10 w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-white/10 opacity-60 z-10">
                        <img src={covers[2]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* State 2: Loading State */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 rounded-full border-3 border-[#FA243C]/20 border-t-[#FA243C] animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">
            {isRTL ? 'جاري استخراج المسارات الكاملة...' : 'Resolving full tracks...'}
          </p>
        </div>
      )}

      {/* State 3: Search Results */}
      {!isLoading && query.trim() && (
        <div className="max-w-5xl mx-auto space-y-8">
          {results.songs.length === 0 && results.artists.length === 0 && (
            <div className="py-20 text-center text-zinc-500 text-sm font-medium">
              {t.noTracksFound}
            </div>
          )}

          {/* Top Result Banner */}
          {results.topResult && activeCategory === 'all' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                {isRTL ? 'أفضل نتيجة' : 'Top Result'}
              </h3>
              <div
                onClick={() => handlePlaySong(results.topResult!)}
                className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] hover:bg-white/[0.1] transition-all cursor-pointer flex items-center justify-between gap-3 sm:gap-4 group min-w-0"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <OptimizedImage
                      src={results.topResult.coverUrl || results.topResult.artworkUrl}
                      alt={results.topResult.title}
                      size="card"
                      containerClassName="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl shadow-xl flex-shrink-0"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-6 h-6 text-white fill-current translate-x-0.5" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FA243C]/20 text-[#FA243C] border border-[#FA243C]/30 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {results.topResult.source === 'local'
                          ? (isRTL ? 'استوديو • HQ' : 'Studio Master • HQ')
                          : (isRTL ? 'مسار كامل • HD' : 'Full Track • HD')}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-xl font-black text-white truncate group-hover:text-[#FA243C] transition-colors leading-tight">
                      {results.topResult.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-300 font-medium truncate mt-0.5">
                      {results.topResult.artist} {results.topResult.album ? `• ${results.topResult.album}` : ''}
                    </p>
                    <span className="text-[10px] sm:text-xs text-zinc-400 font-mono mt-0.5 inline-block">
                      {formatDuration(results.topResult.duration)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySong(results.topResult!);
                  }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white flex items-center justify-center shadow-lg shadow-[#FA243C]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                  aria-label="Play song"
                >
                  {currentTrack?.id === results.topResult.id && isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  ) : currentTrack?.id === results.topResult.id && playbackState === 'buffering' ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Artists Row */}
          {results.artists.length > 0 && (activeCategory === 'all' || activeCategory === 'artists') && (
            <div className="space-y-3">
              <h3 className="text-lg font-black text-white">
                {isRTL ? 'الفنانون' : 'Artists'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {results.artists.map((art) => {
                  const artistSongCount = tracks.filter((t) => t.artist.toLowerCase().includes(art.name.toLowerCase())).length;
                  const subtitle = artistSongCount > 0
                    ? (isRTL ? `${artistSongCount} مسار في مكتبتك` : `${artistSongCount} songs in library`)
                    : (art.listeners || (isRTL ? 'فنان عالمي' : 'Artist'));

                  return (
                    <div
                      key={art.id}
                      onClick={() => setQuery(art.name)}
                      className="p-4 rounded-2xl apple-glass-card hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98] group apple-spring"
                    >
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2px] bg-gradient-to-tr from-[#FA243C] to-[#FF375F] group-hover:scale-105 transition-transform duration-300 shadow-md mb-3">
                        <div className="w-full h-full rounded-full overflow-hidden bg-black/60">
                          <OptimizedImage
                            src={art.avatarUrl}
                            alt={art.name}
                            size="thumb"
                            containerClassName="w-full h-full"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white w-full px-1 break-words line-clamp-2 leading-snug group-hover:text-[#FA243C] transition-colors" dir="auto">
                        {art.name}
                      </h4>
                      <span className="text-[11px] font-medium text-zinc-400 mt-1 line-clamp-1">
                        {subtitle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Songs List */}
          {results.songs.length > 0 && (activeCategory === 'all' || activeCategory === 'songs') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white">
                  {isRTL ? 'الأغاني (مسارات كاملة)' : 'Songs (Full Length)'}
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {results.songs.length} {isRTL ? 'مسار' : 'tracks'}
                </span>
              </div>
              <div className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                {results.songs.map((trk) => {
                  const isCur = currentTrack?.id === trk.id;
                  const isLocal = trk.source === 'local';
                  return (
                    <div
                      key={trk.id}
                      onClick={() => handlePlaySong(trk)}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '58px' }}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isCur ? 'bg-[#FA243C]/15' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <OptimizedImage
                          src={trk.coverUrl || trk.artworkUrl}
                          alt={trk.title}
                          size="thumb"
                          containerClassName="w-11 h-11 rounded-xl flex-shrink-0 shadow-md"
                          className="w-full h-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
                              {trk.title}
                            </h4>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold flex-shrink-0 ${
                              isLocal ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {isLocal ? (isRTL ? 'استوديو' : 'Master') : (isRTL ? 'كامل' : 'Full')}
                            </span>
                          </div>
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
                          className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                          {isCur && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : isCur && playbackState === 'buffering' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
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
