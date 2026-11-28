import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Heart,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  Download,
  CheckCircle2,
  Clock,
  ListPlus,
  Radio,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { getSmartMixById } from '../../utils/mixEngine';
import { formatTime, isArabicText } from '../../utils/formatters';
import { MobileTrackRow } from '../common/MobileTrackRow';
import { TrackActionSheet } from '../library/TrackActionSheet';
import { Track } from '../../types';
import { VIEW_HERO_VARIANTS } from '../../utils/motion';

export const SmartMixView: React.FC = () => {
  const { isRTL } = useTranslation();
  const tracks = usePlayerStore((state) => state.tracks);
  const selectedMixId = usePlayerStore((state) => state.selectedMixId);
  const favorites = usePlayerStore((state) => state.favorites);
  const playStatsMap = usePlayerStore((state) => state.playStatsMap);
  const history = usePlayerStore((state) => state.history);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const downloadTracksForOffline = usePlayerStore((state) => state.downloadTracksForOffline);
  const downloadAllProgress = usePlayerStore((state) => state.downloadAllProgress);
  const createPlaylist = usePlayerStore((state) => state.createPlaylist);
  const addToast = usePlayerStore((state) => state.addToast);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const openAlbum = usePlayerStore((state) => state.openAlbum);
  const startSongRadio = usePlayerStore((state) => state.startSongRadio);
  const goBack = usePlayerStore((state) => state.goBack);
  const canGoBack = usePlayerStore((state) => state.canGoBack());

  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);

  // Compute the smart mix details
  const mix = useMemo(() => {
    return getSmartMixById(selectedMixId, tracks, favorites, playStatsMap, history);
  }, [selectedMixId, tracks, favorites, playStatsMap, history]);

  const isCurrentMixPlaying = useMemo(() => {
    if (!currentTrack || !mix) return false;
    return mix.tracks.some((t) => t.id === currentTrack.id) && isPlaying;
  }, [currentTrack, mix, isPlaying]);

  // Offline status
  const downloadedCount = useMemo(() => {
    if (!mix) return 0;
    const set = new Set(downloadedTrackIds);
    return mix.tracks.filter((t) => set.has(t.id) || !!t.file || !!t.blob).length;
  }, [mix, downloadedTrackIds]);

  const isAllDownloaded = mix ? mix.tracks.length > 0 && downloadedCount === mix.tracks.length : false;
  const isDownloadingMix = downloadAllProgress !== null;

  const totalDuration = useMemo(() => {
    if (!mix) return 0;
    return mix.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [mix]);

  if (!mix || mix.tracks.length === 0) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Sparkles className="w-16 h-16 text-zinc-600 mb-4 stroke-1" />
        <h2 className="text-xl font-bold text-white mb-2">
          {selectedMixId ? 'لا تتوفر مسارات كافية لتوليد هذا الميكس حالياً' : 'لم يتم اختيار ميكس'}
        </h2>
        <p className="text-sm text-zinc-400 mb-6">استمع إلى بعض الأغاني أو أضف مقاطع إلى المفضلة لتفعيل ميكساتك المخصصة.</p>
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

  const handlePlayMix = () => {
    if (isCurrentMixPlaying) {
      togglePlayPause();
    } else {
      playTrack(mix.tracks[0], mix.tracks);
    }
  };

  const handleShuffleMix = () => {
    if (mix.tracks.length === 0) return;
    const shuffled = [...mix.tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  const handleSaveAsPlaylist = async () => {
    try {
      await createPlaylist(mix.title, mix.tracks.map((t) => t.id));
      addToast(
        isRTL ? `تم حفظ "${mix.title}" كقائمة تشغيل في مكتبتك` : `Saved "${mix.title}" as a new playlist`,
        undefined,
        'success'
      );
    } catch {
      addToast(
        isRTL ? 'تعذر حفظ قائمة التشغيل' : 'Failed to save playlist',
        undefined,
        'warning'
      );
    }
  };

  const handleDownloadAll = async () => {
    if (isDownloadingMix || isAllDownloaded) return;
    await downloadTracksForOffline(mix.tracks, mix.title);
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 pb-4 md:pb-16">
      {/* Editorial Spotify Header with 2x2 Collage */}
      <div className={`relative w-full overflow-hidden bg-gradient-to-b ${mix.accentGradient} via-[#141414] to-[#121212] pt-6 pb-8 px-4 sm:px-6 md:px-8 border-b border-white/5`}>
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
            {mix.title}
          </span>
          <div className="w-8" />
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 md:gap-8 max-w-6xl">
          {/* 2x2 Collage Cover */}
          <motion.div
            variants={VIEW_HERO_VARIANTS}
            initial="initial"
            animate="animate"
            className="relative shrink-0"
          >
            <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-xl overflow-hidden shadow-2xl bg-[#181818] ring-1 ring-white/10 grid grid-cols-2 grid-rows-2">
              {mix.collageCovers.map((coverUrl, idx) => (
                <div key={idx} className="relative w-full h-full overflow-hidden bg-[#242424]">
                  <img
                    src={coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Mix Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="flex-1 text-center sm:text-start min-w-0"
          >
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 mb-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {mix.badge}
            </span>

            <h1
              dir={isArabicText(mix.title) ? 'rtl' : 'ltr'}
              className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-3 break-words"
            >
              {mix.title}
            </h1>

            <p
              dir={isArabicText(mix.subtitle) ? 'rtl' : 'ltr'}
              className="text-sm sm:text-base text-zinc-300 font-medium mb-3 line-clamp-2"
            >
              {mix.subtitle}
            </p>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-zinc-400 font-medium">
              <span className="text-white font-bold">AuraWave Editorial</span>
              <span className="text-zinc-600">•</span>
              <span>{mix.tracks.length} مسار</span>
              <span className="text-zinc-600">•</span>
              <span>{formatTime(totalDuration)}</span>
              {mix.genre && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">
                    {mix.genre}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-5">
        {/* Play Button */}
        <button
          type="button"
          onClick={handlePlayMix}
          className="w-13 h-13 rounded-full bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 transition-transform flex items-center justify-center text-black shadow-lg shadow-black/40 cursor-pointer"
          title={isCurrentMixPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          aria-label={isCurrentMixPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isCurrentMixPlaying ? (
            <Pause className="w-6 h-6 fill-black text-black" />
          ) : (
            <Play className="w-6 h-6 fill-black text-black translate-x-0.5" />
          )}
        </button>

        {/* Shuffle Button */}
        <button
          type="button"
          onClick={handleShuffleMix}
          className="p-3 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
          title="تشغيل عشوائي"
          aria-label="تشغيل عشوائي"
        >
          <Shuffle className="w-6 h-6" />
        </button>

        {/* Save as Playlist Button */}
        <button
          type="button"
          onClick={handleSaveAsPlaylist}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#282828] hover:bg-[#333333] text-zinc-200 border border-white/5 active:scale-95 transition-colors cursor-pointer"
          title="حفظ كقائمة تشغيل في مكتبتك"
        >
          <ListPlus className="w-4 h-4 text-emerald-400" />
          <span>حفظ كقائمة تشغيل</span>
        </button>

        {/* Download Mix Offline Button */}
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={isDownloadingMix || isAllDownloaded}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
            isAllDownloaded
              ? 'bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30 cursor-default'
              : isDownloadingMix
              ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              : 'bg-[#282828] hover:bg-[#333333] text-zinc-200 border border-white/5'
          }`}
          title={isAllDownloaded ? 'تم تنزيل الميكس كاملاً' : 'تنزيل الميكس للاستماع أوفلاين'}
        >
          {isAllDownloaded ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#1DB954]" />
              <span>تم الحفظ بدون إنترنت</span>
            </>
          ) : isDownloadingMix ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-[#1DB954] animate-spin" />
              <span>جاري الحفظ {downloadAllProgress ? `(${downloadAllProgress.current}/${downloadAllProgress.total})` : '...'}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-zinc-300" />
              <span>تنزيل الميكس أوفلاين ({downloadedCount}/{mix.tracks.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Tracks Container */}
      <div className="px-4 sm:px-6 md:px-8 max-w-6xl">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          {/* Table Header */}
          <div className="grid grid-cols-[3rem_1fr_1fr_6rem_4rem] px-4 py-2 text-xs font-semibold text-zinc-400 border-b border-white/10 uppercase tracking-wider mb-2">
            <span className="text-center">#</span>
            <span>العنوان</span>
            <span>الألبوم</span>
            <span className="flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <span />
          </div>

          {/* Table Rows */}
          <div className="space-y-1">
            {mix.tracks.map((track, idx) => {
              const isCur = currentTrack?.id === track.id;
              const isFav = favorites.includes(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, mix.tracks)}
                  className={`group grid grid-cols-[3rem_1fr_1fr_6rem_4rem] items-center px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    isCur
                      ? 'bg-white/10 text-[#1DB954]'
                      : 'hover:bg-white/5 text-zinc-300 hover:text-white'
                  }`}
                >
                  {/* Track # or Play/Pause Indicator */}
                  <div className="flex items-center justify-center text-xs font-semibold">
                    {isCur ? (
                      isPlaying ? (
                        <div className="flex items-end gap-0.5 h-3.5">
                          <span className="w-0.5 h-3.5 bg-[#1DB954] animate-pulse" />
                          <span className="w-0.5 h-2 bg-[#1DB954] animate-pulse delay-75" />
                          <span className="w-0.5 h-3 bg-[#1DB954] animate-pulse delay-150" />
                        </div>
                      ) : (
                        <Pause className="w-3.5 h-3.5 fill-[#1DB954]" />
                      )
                    ) : (
                      <>
                        <span className="group-hover:hidden text-zinc-500 font-mono">
                          {idx + 1}
                        </span>
                        <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block text-white" />
                      </>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-10 h-10 rounded bg-[#181818] overflow-hidden shrink-0 ring-1 ring-white/5">
                      <img
                        src={track.artworkUrl || './logo.svg'}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        dir={isArabicText(track.title) ? 'rtl' : 'ltr'}
                        className={`font-semibold truncate ${
                          isCur ? 'text-[#1DB954]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (track.artist) openArtist(track.artist);
                        }}
                        className="text-xs text-zinc-400 hover:text-white hover:underline truncate block text-start cursor-pointer"
                      >
                        {track.artist || 'فنان غير معروف'}
                      </button>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="truncate pr-4">
                    {track.album ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAlbum(track.album, track.artist);
                        }}
                        className="text-xs text-zinc-400 hover:text-white hover:underline truncate text-start cursor-pointer"
                      >
                        {track.album}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">-</span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="text-xs text-zinc-400 font-mono text-end">
                    {formatTime(track.duration || 0)}
                  </div>

                  {/* Row Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(track.id);
                      }}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isFav
                          ? 'text-[#1DB954] hover:text-[#1ed760]'
                          : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white'
                      }`}
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startSongRadio(track);
                      }}
                      className="p-1.5 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white transition-colors cursor-pointer"
                      title="بدء راديو الأغنية"
                    >
                      <Radio className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionSheetTrack(track);
                      }}
                      className="p-1.5 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white transition-colors cursor-pointer"
                      title="المزيد من الخيارات"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Track List */}
        <div className="md:hidden space-y-1">
          {mix.tracks.map((track, idx) => (
            <MobileTrackRow
              key={track.id}
              track={track}
              index={idx}
              contextList={mix.tracks}
              showIndex
              onOpenActionSheet={(t) => setActionSheetTrack(t)}
            />
          ))}
        </div>
      </div>

      {/* Track Action Sheet for Mobile and Desktop options */}
      <TrackActionSheet
        track={actionSheetTrack}
        isOpen={!!actionSheetTrack}
        onClose={() => setActionSheetTrack(null)}
      />
    </div>
  );
};
