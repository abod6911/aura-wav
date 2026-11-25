import React, { useMemo, useState } from 'react';
import { Play, Pause, Shuffle, ChevronRight, ChevronLeft, Disc3, Heart, MoreHorizontal, ArrowLeft, ArrowRight, Download, CheckCircle2, Clock } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { getAlbumDetails } from '../../utils/catalogSelectors';
import { formatTime, isArabicText } from '../../utils/formatters';
import { useTrackTheme } from '../../utils/colorExtractor';
import { MobileTrackRow } from '../common/MobileTrackRow';
import { TrackActionSheet } from '../library/TrackActionSheet';
import { Track } from '../../types';

export const AlbumView: React.FC = () => {
  const { isRTL } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const selectedAlbumName = usePlayerStore((state) => state.selectedAlbumName);
  const selectedArtistName = usePlayerStore((state) => state.selectedArtistName);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const favorites = usePlayerStore((state) => state.favorites);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const downloadTracksForOffline = usePlayerStore((state) => state.downloadTracksForOffline);
  const downloadAllProgress = usePlayerStore((state) => state.downloadAllProgress);
  const addToast = usePlayerStore((state) => state.addToast);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const goBack = usePlayerStore((state) => state.goBack);
  const canGoBack = usePlayerStore((state) => state.canGoBack());

  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

  // Compute album details memoized
  const details = useMemo(() => {
    if (!selectedAlbumName) return null;
    return getAlbumDetails(tracks, selectedAlbumName, selectedArtistName || undefined);
  }, [tracks, selectedAlbumName, selectedArtistName]);

  const albumMockTrack = useMemo(() => {
    if (!details) return null;
    return {
      id: 'album_theme',
      title: details.name,
      artist: details.artist,
      album: details.name,
      artworkUrl: details.artworkUrl,
    } as Track;
  }, [details]);

  const theme = useTrackTheme(albumMockTrack);

  const isCurrentAlbumPlaying = useMemo(() => {
    if (!currentTrack || !details) return false;
    return details.tracks.some((t) => t.id === currentTrack.id) && isPlaying;
  }, [currentTrack, details, isPlaying]);

  // Offline status
  const downloadedCount = useMemo(() => {
    if (!details) return 0;
    const set = new Set(downloadedTrackIds);
    return details.tracks.filter((t) => set.has(t.id) || !!t.file || !!t.blob).length;
  }, [details, downloadedTrackIds]);

  const isAllDownloaded = details ? details.tracks.length > 0 && downloadedCount === details.tracks.length : false;
  const isDownloadingAlbum = downloadAllProgress !== null;

  if (!details || details.tracks.length === 0) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Disc3 className="w-16 h-16 text-zinc-600 mb-4 stroke-1" />
        <h2 className="text-xl font-bold text-white mb-2">
          {selectedAlbumName ? `لم يتم العثور على ألبوم "${selectedAlbumName}"` : 'لم يتم اختيار ألبوم'}
        </h2>
        <p className="text-sm text-zinc-400 mb-6">قد يكون تم تعديل اسم الألبوم أو تم حذفه من المكتبة.</p>
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

  const handlePlayAlbum = () => {
    if (isCurrentAlbumPlaying) {
      togglePlayPause();
    } else {
      playTrack(details.tracks[0], details.tracks);
    }
  };

  const handleShuffleAlbum = () => {
    if (details.tracks.length === 0) return;
    const shuffled = [...details.tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  const handleDownloadAll = async () => {
    if (isDownloadingAlbum || isAllDownloaded) return;
    await downloadTracksForOffline(details.tracks, details.name);
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 pb-4 md:pb-16">
      {/* Editorial Album Header */}
      <div
        style={{ background: theme.headerGradientRgb }}
        className="relative w-full overflow-hidden pt-6 pb-8 px-4 sm:px-6 md:px-8 border-b border-white/5 transition-colors duration-500"
      >
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

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 md:gap-8 max-w-6xl">
          {/* Square Album Cover */}
          <div className="relative shrink-0">
            <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-md overflow-hidden shadow-2xl bg-[#181818] ring-1 ring-white/10">
              <img
                src={details.artworkUrl}
                alt={details.name}
                className="w-full h-full object-cover aspect-square"
                loading="eager"
              />
            </div>
          </div>

          {/* Album Info */}
          <div className="flex-1 text-center sm:text-start min-w-0">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              ألبوم
            </span>

            <h1
              dir={isArabicText(details.name) ? 'rtl' : 'ltr'}
              className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-3 break-words"
            >
              {details.name}
            </h1>

            {/* Clickable Artist Name */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-zinc-300 font-medium">
              <button
                type="button"
                onClick={() => openArtist(details.artist)}
                className="text-white font-bold hover:underline cursor-pointer"
              >
                {details.artist}
              </button>
              {details.year && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{details.year}</span>
                </>
              )}
              <span className="text-zinc-600">•</span>
              <span>{details.trackCount} {details.trackCount === 1 ? 'مسار' : 'مسارات'}</span>
              <span className="text-zinc-600">•</span>
              <span>{formatTime(details.totalDuration)}</span>
              {details.genre && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">
                    {details.genre}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-4 px-4 sm:px-6 md:px-8 py-5">
        {/* Play Button */}
        <button
          type="button"
          onClick={handlePlayAlbum}
          className="w-13 h-13 rounded-full bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 transition-transform flex items-center justify-center text-black shadow-lg shadow-black/40 cursor-pointer"
          title={isCurrentAlbumPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          aria-label={isCurrentAlbumPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isCurrentAlbumPlaying ? (
            <Pause className="w-6 h-6 fill-black text-black" />
          ) : (
            <Play className="w-6 h-6 fill-black text-black translate-x-0.5" />
          )}
        </button>

        {/* Shuffle Button */}
        <button
          type="button"
          onClick={handleShuffleAlbum}
          className="p-3 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
          title="تشغيل عشوائي"
          aria-label="تشغيل عشوائي"
        >
          <Shuffle className="w-6 h-6" />
        </button>

        {/* Download Album Button */}
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={isDownloadingAlbum || isAllDownloaded}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
            isAllDownloaded
              ? 'bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30 cursor-default'
              : isDownloadingAlbum
              ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              : 'bg-[#282828] hover:bg-[#333333] text-zinc-200 border border-white/5'
          }`}
          title={isAllDownloaded ? 'تم تنزيل الألبوم كاملاً' : 'تنزيل الألبوم للاستماع أوفلاين'}
        >
          {isAllDownloaded ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#1DB954]" />
              <span>تم الحفظ بدون إنترنت</span>
            </>
          ) : isDownloadingAlbum ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-[#1DB954] animate-spin" />
              <span>جاري الحفظ {downloadAllProgress ? `(${downloadAllProgress.current}/${downloadAllProgress.total})` : '...'}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-zinc-300" />
              <span>تنزيل الألبوم أوفلاين ({downloadedCount}/{details.trackCount})</span>
            </>
          )}
        </button>
      </div>

      {/* Tracks Container */}
      <div className="px-4 sm:px-6 md:px-8 max-w-6xl">
        {/* Desktop Table */}
        <div className="hidden md:block">
          {/* Table Header */}
          <div className="grid grid-cols-[3rem_1fr_6rem_4rem] px-4 py-2 text-xs font-semibold text-zinc-400 border-b border-white/10 uppercase tracking-wider mb-2">
            <span className="text-center">#</span>
            <span>العنوان</span>
            <span className="flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <span />
          </div>

          {/* Table Rows */}
          <div className="space-y-1">
            {details.tracks.map((track, idx) => {
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
                  className={`group w-full h-14 px-4 rounded-md grid grid-cols-[3rem_1fr_6rem_4rem] items-center transition-colors cursor-pointer select-none ${
                    isCur ? 'bg-[#282828] text-[#1DB954]' : 'hover:bg-white/5 text-zinc-300'
                  }`}
                >
                  {/* Track Number / Play Icon */}
                  <div className="text-center text-xs font-mono text-zinc-500">
                    <span className="group-hover:hidden">{track.trackNumber || idx + 1}</span>
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

                  {/* Title & Artist */}
                  <div className="min-w-0 pe-4">
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

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-white/5">
          {details.tracks.map((track, idx) => (
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
      </div>

      {/* Mobile Track Options Sheet */}
      <TrackActionSheet
        track={actionSheetTrack}
        isOpen={!!actionSheetTrack}
        onClose={() => setActionSheetTrack(null)}
      />
    </div>
  );
};
