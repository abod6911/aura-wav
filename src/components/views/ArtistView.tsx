import React, { useMemo, useState } from 'react';
import { Play, Pause, Shuffle, ChevronRight, ChevronLeft, Disc3, Music2, Users, Heart, MoreHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { getArtistProfile } from '../../utils/catalogSelectors';
import { formatTime, isArabicText } from '../../utils/formatters';
import { useTrackTheme } from '../../utils/colorExtractor';
import { MobileTrackRow } from '../common/MobileTrackRow';
import { TrackActionSheet } from '../library/TrackActionSheet';
import { Track } from '../../types';

export const ArtistView: React.FC = () => {
  const { isRTL } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const selectedArtistName = usePlayerStore((state) => state.selectedArtistName);
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

  const [showAllTracks, setShowAllTracks] = useState(false);
  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

  // Compute profile memoized
  const profile = useMemo(() => {
    if (!selectedArtistName) return null;
    return getArtistProfile(tracks, selectedArtistName);
  }, [tracks, selectedArtistName]);

  const artistMockTrack = useMemo(() => {
    if (!profile) return null;
    return {
      id: 'artist_theme',
      title: profile.name,
      artist: profile.name,
      artworkUrl: profile.artworkUrl,
    } as Track;
  }, [profile]);

  const theme = useTrackTheme(artistMockTrack);

  const isCurrentArtistPlaying = useMemo(() => {
    if (!currentTrack || !profile) return false;
    return profile.tracks.some((t) => t.id === currentTrack.id) && isPlaying;
  }, [currentTrack, profile, isPlaying]);

  if (!profile || profile.tracks.length === 0) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Users className="w-16 h-16 text-zinc-600 mb-4 stroke-1" />
        <h2 className="text-xl font-bold text-white mb-2">
          {selectedArtistName ? `لم يتم العثور على أغاني لـ "${selectedArtistName}"` : 'لم يتم اختيار فنان'}
        </h2>
        <p className="text-sm text-zinc-400 mb-6">قد يكون تم تعديل اسم الفنان أو حذف الملفات المرتبطة به.</p>
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

  const displayedTopTracks = showAllTracks ? profile.tracks : profile.tracks.slice(0, 5);

  const handlePlayArtist = () => {
    if (isCurrentArtistPlaying) {
      togglePlayPause();
    } else {
      playTrack(profile.tracks[0], profile.tracks);
    }
  };

  const handleShuffleArtist = () => {
    if (profile.tracks.length === 0) return;
    const shuffled = [...profile.tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 pb-4 md:pb-16">
      {/* Editorial Header */}
      <div
        style={{ background: theme.headerGradientRgb }}
        className="relative w-full overflow-hidden pt-6 pb-8 px-4 sm:px-6 md:px-8 border-b border-white/5 transition-colors duration-500"
      >
        {/* Top Back Navigation Bar for Mobile */}
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
            {profile.name}
          </span>
          <div className="w-8" />
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 md:gap-8 max-w-6xl">
          {/* Artist Circular Avatar */}
          <div className="relative shrink-0">
            <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full overflow-hidden shadow-2xl ring-2 ring-white/10 bg-[#181818]">
              <img
                src={profile.artworkUrl}
                alt={profile.name}
                className="w-full h-full object-cover aspect-square"
                loading="eager"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-start min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-medium mb-3 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
              <span>فنان في مكتبتك</span>
            </div>

            <h1
              dir={isArabicText(profile.name) ? 'rtl' : 'ltr'}
              className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-3 break-words"
            >
              {profile.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-zinc-400 font-medium">
              <span>{profile.tracks.length} أغنية</span>
              <span className="text-zinc-600">•</span>
              <span>{profile.albums.length} ألبوم</span>
              <span className="text-zinc-600">•</span>
              <span>{formatTime(profile.totalDuration)}</span>
              {profile.topGenre && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">
                    {profile.topGenre}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-4 px-4 sm:px-6 md:px-8 py-5">
        <button
          type="button"
          onClick={handlePlayArtist}
          className="w-13 h-13 rounded-full bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 transition-transform flex items-center justify-center text-black shadow-lg shadow-black/40 cursor-pointer"
          title={isCurrentArtistPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          aria-label={isCurrentArtistPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isCurrentArtistPlaying ? (
            <Pause className="w-6 h-6 fill-black text-black" />
          ) : (
            <Play className="w-6 h-6 fill-black text-black translate-x-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleShuffleArtist}
          className="p-3 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
          title="تشغيل عشوائي"
          aria-label="تشغيل عشوائي"
        >
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 sm:px-6 md:px-8 space-y-10 max-w-6xl">
        {/* Section 1: Popular Tracks */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Music2 className="w-5 h-5 text-[#1DB954]" />
              <span>أشهر الأغاني</span>
            </h2>
            {profile.tracks.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllTracks((prev) => !prev)}
                className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-colors"
              >
                {showAllTracks ? 'عرض أقل' : 'عرض الكل'}
              </button>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="space-y-1">
              {displayedTopTracks.map((track, idx) => {
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
                        playTrack(track, profile.tracks);
                      }
                    }}
                    className={`group w-full h-14 px-4 rounded-md flex items-center gap-4 transition-colors cursor-pointer select-none ${
                      isCur ? 'bg-[#282828] text-[#1DB954]' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    {/* Index or Play Button */}
                    <div className="w-6 text-center text-xs font-mono text-zinc-500 shrink-0">
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

                    {/* Artwork */}
                    <div className="w-10 h-10 rounded overflow-hidden bg-[#181818] shrink-0 border border-white/5">
                      <img
                        src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Title & Album */}
                    <div className="flex-1 min-w-0">
                      <p
                        dir={isArabicText(track.title) ? 'rtl' : 'ltr'}
                        className={`text-sm font-semibold truncate ${
                          isCur ? 'text-[#1DB954]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      {track.album && (
                        <p
                          dir={isArabicText(track.album) ? 'rtl' : 'ltr'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (track.album) openAlbum(track.album, profile.name);
                          }}
                          className="text-xs text-zinc-400 hover:text-white hover:underline truncate mt-0.5 cursor-pointer"
                        >
                          {track.album}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="text-xs font-mono text-zinc-400 tabular-nums shrink-0">
                      {formatTime(track.duration)}
                    </div>

                    {/* Actions: Favorite & Menu */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
            {displayedTopTracks.map((track, idx) => (
              <MobileTrackRow
                key={track.id}
                track={track}
                index={idx}
                showIndex
                trackList={profile.tracks}
                onOpenActionSheet={(t) => setActionSheetTrack(t)}
              />
            ))}
          </div>
        </section>

        {/* Section 2: Albums / Discography */}
        {profile.albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-[#1DB954]" />
                <span>الألبومات والتسجيلات</span>
              </h2>
              <span className="text-xs text-zinc-500 font-medium">{profile.albums.length} ألبوم</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {profile.albums.map((album) => (
                <div
                  key={album.name}
                  onClick={() => openAlbum(album.name, profile.name)}
                  className="group bg-[#181818] hover:bg-[#282828] p-3 rounded-lg transition-colors cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#242424] mb-3 shadow-md">
                    <img
                      src={album.artworkUrl}
                      alt={album.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute end-2 bottom-2 w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-lg flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-[transform,opacity] duration-200">
                      <Play className="w-5 h-5 fill-black translate-x-0.5" />
                    </div>
                  </div>

                  <h3
                    dir={isArabicText(album.name) ? 'rtl' : 'ltr'}
                    className="text-sm font-bold text-white truncate mb-1"
                  >
                    {album.name}
                  </h3>

                  <p className="text-xs text-zinc-400 truncate">
                    {album.year ? `${album.year} • ` : ''}
                    {album.trackCount} {album.trackCount === 1 ? 'مسار' : 'مسارات'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Similar Artists */}
        {profile.similarArtists.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1DB954]" />
                <span>فنانون مشابهون</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {profile.similarArtists.map((artist) => (
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
                    فنان • {artist.topGenre}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
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
