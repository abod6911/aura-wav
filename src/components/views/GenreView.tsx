import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Play, Pause, Shuffle, ChevronRight, ChevronLeft, Layers, Heart, MoreHorizontal, ArrowLeft, ArrowRight, Users, Disc3, Clock } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { getGenreDetails } from '../../utils/catalogSelectors';
import { formatTime, isArabicText } from '../../utils/formatters';
import { MobileTrackRow } from '../common/MobileTrackRow';
import { TrackActionSheet } from '../library/TrackActionSheet';
import { Track } from '../../types';

// Map popular genres to rich Spotify matte header gradients
function getGenreGradient(genre: string): string {
  const g = genre.toLowerCase();
  if (g.includes('pop')) return 'from-[#7D387D] via-[#2A132A] to-[#121212]';
  if (g.includes('hip') || g.includes('rap') || g.includes('trap')) return 'from-[#BA5D07] via-[#3E1D01] to-[#121212]';
  if (g.includes('edm') || g.includes('dance') || g.includes('house') || g.includes('techno')) return 'from-[#006450] via-[#002820] to-[#121212]';
  if (g.includes('r&b') || g.includes('soul')) return 'from-[#7922BA] via-[#2F0052] to-[#121212]';
  if (g.includes('rock') || g.includes('alternative') || g.includes('metal')) return 'from-[#8B1A24] via-[#350A0E] to-[#121212]';
  if (g.includes('liked') || g.includes('favorites')) return 'from-[#4A32A0] via-[#1B1240] to-[#121212]';
  if (g.includes('jazz') || g.includes('blues') || g.includes('acoustic')) return 'from-[#8D6B3C] via-[#332512] to-[#121212]';
  return 'from-[#3A3A3A] via-[#1F1F1F] to-[#121212]';
}

export const GenreView: React.FC = () => {
  const { isRTL } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const selectedGenreName = usePlayerStore((state) => state.selectedGenreName);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const favorites = usePlayerStore((state) => state.favorites);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const openAlbum = usePlayerStore((state) => state.openAlbum);
  const goBack = usePlayerStore((state) => state.goBack);
  const canGoBack = usePlayerStore((state) => state.canGoBack());

  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

  // Progressive rendering for 60-120fps performance
  const [displayCount, setDisplayCount] = useState(40);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Compute genre details memoized
  const details = useMemo(() => {
    if (!selectedGenreName) return null;
    return getGenreDetails(tracks, selectedGenreName);
  }, [tracks, selectedGenreName]);

  // Reset pagination on genre change
  useEffect(() => {
    setDisplayCount(40);
  }, [selectedGenreName]);

  // Progressive loading with IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current || !details) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDisplayCount((prev) => Math.min(prev + 40, details.tracks.length));
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [details]);

  const isCurrentGenrePlaying = useMemo(() => {
    if (!currentTrack || !details) return false;
    return details.tracks.some((t) => t.id === currentTrack.id) && isPlaying;
  }, [currentTrack, details, isPlaying]);

  if (!details || details.tracks.length === 0) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Layers className="w-16 h-16 text-zinc-600 mb-4 stroke-1" />
        <h2 className="text-xl font-bold text-white mb-2">
          {selectedGenreName ? `لم يتم العثور على أغاني في تصنيف "${selectedGenreName}"` : 'لم يتم اختيار تصنيف'}
        </h2>
        <p className="text-sm text-zinc-400 mb-6">تأكد من وجود مسارات موسيقية تتبع هذا التصنيف في مكتبتك.</p>
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#282828] hover:bg-[#333333] text-white text-sm font-semibold transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>العودة للخلف</span>
          </button>
        )}
      </div>
    );
  }

  const visibleTracks = details.tracks.slice(0, displayCount);

  const handlePlayGenre = () => {
    if (isCurrentGenrePlaying) {
      togglePlayPause();
    } else {
      playTrack(details.tracks[0], details.tracks);
    }
  };

  const handleShuffleGenre = () => {
    if (details.tracks.length === 0) return;
    const shuffled = [...details.tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  const gradientClass = getGenreGradient(details.name);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 pb-24">
      {/* Editorial Genre Header */}
      <div className={`relative w-full overflow-hidden bg-gradient-to-b ${gradientClass} pt-6 pb-8 px-4 sm:px-6 md:px-8 border-b border-white/5`}>
        {/* Mobile Back Button */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            className="p-2 -ms-2 rounded-full text-zinc-300 hover:text-white bg-black/30 hover:bg-black/50 transition-colors disabled:opacity-30"
            aria-label="العودة"
          >
            {isRTL ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
          </button>
          <span className="text-xs font-semibold text-zinc-400 truncate max-w-[200px]">
            {details.name}
          </span>
          <div className="w-8" />
        </div>

        <div className="max-w-6xl">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-2 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm">
            تصنيف موسيقي
          </span>

          <h1
            dir={isArabicText(details.name) ? 'rtl' : 'ltr'}
            className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-3 break-words"
          >
            {details.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-300 font-medium">
            <span>{details.tracks.length} مسار</span>
            <span className="text-zinc-500">•</span>
            <span>{details.artists.length} فنان</span>
            <span className="text-zinc-500">•</span>
            <span>{formatTime(details.totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-4 px-4 sm:px-6 md:px-8 py-5">
        <button
          type="button"
          onClick={handlePlayGenre}
          className="w-13 h-13 rounded-full bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 transition-transform flex items-center justify-center text-black shadow-lg shadow-black/40 cursor-pointer"
          title={isCurrentGenrePlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          aria-label={isCurrentGenrePlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isCurrentGenrePlaying ? (
            <Pause className="w-6 h-6 fill-black text-black" />
          ) : (
            <Play className="w-6 h-6 fill-black text-black translate-x-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleShuffleGenre}
          className="p-3 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
          title="تشغيل عشوائي"
          aria-label="تشغيل عشوائي"
        >
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 sm:px-6 md:px-8 space-y-10 max-w-6xl">
        {/* Section 1: Prominent Artists in this Genre */}
        {details.artists.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1DB954]" />
                <span>أبرز فناني التصنيف</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {details.artists.slice(0, 6).map((artist) => (
                <div
                  key={artist.name}
                  onClick={() => openArtist(artist.name)}
                  className="group bg-[#181818] hover:bg-[#282828] p-4 rounded-xl transition-colors cursor-pointer flex flex-col items-center text-center"
                >
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-[#242424] mb-3 shadow-md ring-1 ring-white/10">
                    <img
                      src={artist.artworkUrl}
                      alt={artist.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <h3
                    dir={isArabicText(artist.name) ? 'rtl' : 'ltr'}
                    className="text-sm font-bold text-white truncate w-full mb-1"
                  >
                    {artist.name}
                  </h3>

                  <p className="text-xs text-zinc-400 truncate w-full">
                    {artist.trackCount} {artist.trackCount === 1 ? 'مسار' : 'مسارات'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 2: Prominent Albums in this Genre */}
        {details.albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-[#1DB954]" />
                <span>ألبومات في هذا التصنيف</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {details.albums.slice(0, 5).map((album) => (
                <div
                  key={album.name}
                  onClick={() => openAlbum(album.name, album.artist)}
                  className="group bg-[#181818] hover:bg-[#282828] p-3 rounded-lg transition-colors cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#242424] mb-3 shadow-md">
                    <img
                      src={album.artworkUrl}
                      alt={album.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  </div>

                  <h3
                    dir={isArabicText(album.name) ? 'rtl' : 'ltr'}
                    className="text-sm font-bold text-white truncate mb-1"
                  >
                    {album.name}
                  </h3>

                  <p className="text-xs text-zinc-400 truncate">
                    {album.artist}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: All Tracks in Genre (Progressive Loading) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              جميع المسارات
            </h2>
            <span className="text-xs text-zinc-500 font-medium">{details.tracks.length} مسار</span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[3rem_1fr_1fr_6rem_4rem] px-4 py-2 text-xs font-semibold text-zinc-400 border-b border-white/10 uppercase tracking-wider mb-2">
              <span className="text-center">#</span>
              <span>العنوان والفنان</span>
              <span>الألبوم</span>
              <span className="flex items-center justify-end gap-1">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <span />
            </div>

            <div className="space-y-1">
              {visibleTracks.map((track, idx) => {
                const isCur = currentTrack?.id === track.id;
                const isCurPlaying = isCur && isPlaying;
                const isFav = favorites.includes(track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      if (isCur) {
                        togglePlayPause();
                      } else {
                        playTrack(track, details.tracks);
                      }
                    }}
                    className={`group w-full h-14 px-4 rounded-md grid grid-cols-[3rem_1fr_1fr_6rem_4rem] items-center transition-colors cursor-pointer select-none ${
                      isCur ? 'bg-[#282828] text-[#1DB954]' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    {/* Index or Play Button */}
                    <div className="text-center text-xs font-mono text-zinc-500">
                      <span className="group-hover:hidden">{idx + 1}</span>
                      <button
                        type="button"
                        className="hidden group-hover:inline-flex items-center justify-center text-white"
                        aria-label="تشغيل"
                      >
                        {isCurPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Artwork + Title & Artist */}
                    <div className="flex items-center gap-3 min-w-0 pe-4">
                      <div className="w-10 h-10 rounded overflow-hidden bg-[#181818] shrink-0 border border-white/5">
                        <img
                          src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <p
                          dir={isArabicText(track.title) ? 'rtl' : 'ltr'}
                          className={`text-sm font-semibold truncate ${
                            isCur ? 'text-[#1DB954]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p
                          dir={isArabicText(track.artist) ? 'rtl' : 'ltr'}
                          onClick={(e) => {
                            e.stopPropagation();
                            openArtist(track.artist);
                          }}
                          className="text-xs text-zinc-400 hover:text-white hover:underline truncate mt-0.5 cursor-pointer"
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Album */}
                    <div className="min-w-0 pe-4">
                      {track.album ? (
                        <p
                          dir={isArabicText(track.album) ? 'rtl' : 'ltr'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (track.album) openAlbum(track.album, track.artist);
                          }}
                          className="text-xs text-zinc-400 hover:text-white hover:underline truncate cursor-pointer"
                        >
                          {track.album}
                        </p>
                      ) : (
                        <span className="text-xs text-zinc-600">-</span>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="text-xs font-mono text-zinc-400 tabular-nums text-end">
                      {formatTime(track.duration)}
                    </div>

                    {/* Actions: Heart + Menu */}
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(track.id)}
                        className={`p-2 rounded-full transition-colors ${
                          isFav ? 'text-[#1DB954]' : 'text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100'
                        }`}
                        title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-[#1DB954]' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActionSheetTrack(track)}
                        className="p-2 rounded-full text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-colors"
                        title="المزيد"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-white/5">
            {visibleTracks.map((track, idx) => (
              <MobileTrackRow
                key={track.id}
                track={track}
                index={idx}
                showIndex
                trackList={details.tracks}
                onOpenActionSheet={(t) => setActionSheetTrack(t)}
              />
            ))}
          </div>

          {/* Infinite Scroll Sentinel */}
          {visibleTracks.length < details.tracks.length && (
            <div ref={loadMoreRef} className="h-16 w-full flex items-center justify-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-[#1DB954] animate-spin" />
            </div>
          )}
        </section>
      </div>

      {/* Action Sheet for Mobile */}
      <TrackActionSheet
        track={actionSheetTrack}
        isOpen={!!actionSheetTrack}
        onClose={() => setActionSheetTrack(null)}
      />
    </div>
  );
};
