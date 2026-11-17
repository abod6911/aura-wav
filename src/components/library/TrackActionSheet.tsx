import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { getOptimizedCoverUrl } from '../../utils/imageOptimizer';
import { triggerHaptic } from '../../utils/haptics';
import { formatTime } from '../player/TimelineSlider';
import {
  ListEnd,
  ListPlus,
  Heart,
  FolderPlus,
  Pencil,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  X,
  Music,
  Trash2,
} from 'lucide-react';

interface TrackActionSheetProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrackActionSheet: React.FC<TrackActionSheetProps> = ({
  track,
  isOpen,
  onClose,
}) => {
  const { isRTL, dir } = useTranslation();
  const favorites = usePlayerStore((state) => state.favorites);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const playlists = usePlayerStore((state) => state.playlists);
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const downloadTrackForOffline = usePlayerStore((state) => state.downloadTrackForOffline);
  const setMetadataEditorModal = usePlayerStore((state) => state.setMetadataEditorModal);
  const setChangeArtworkModal = usePlayerStore((state) => state.setChangeArtworkModal);
  const addTrackToPlaylist = usePlayerStore((state) => state.addTrackToPlaylist);
  const addToast = usePlayerStore((state) => state.addToast);
  const deleteCloudTrackById = usePlayerStore((state) => state.deleteCloudTrackById);

  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);

  if (!track) return null;

  const isFav = favorites.includes(track.id);
  const isDownloaded = downloadedTrackIds.includes(track.id);

  const handleAction = (action: () => void) => {
    triggerHaptic('light');
    action();
    onClose();
  };

  const handleAddToPlaylist = (playlistId: string, playlistTitle: string) => {
    addTrackToPlaylist(playlistId, track.id);
    addToast(
      isRTL ? `تمت الإضافة إلى "${playlistTitle}"` : `Added to "${playlistTitle}"`,
      undefined,
      'success'
    );
    setShowPlaylistSelector(false);
    onClose();
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center select-none" dir={dir}>
          {/* Frosted Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[101]"
          />

          {/* iOS Native Bottom Action Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 200) {
                triggerHaptic('light');
                onClose();
              }
            }}
            style={{
              backgroundColor: '#101018',
              paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)',
            }}
            className="relative z-[102] w-full max-w-lg bg-[#101018] border-t border-white/[0.14] rounded-t-[32px] shadow-[0_-25px_80px_rgba(0,0,0,0.95)] p-4 sm:p-5 space-y-3.5 max-h-[85dvh] overflow-y-auto no-scrollbar pointer-events-auto"
            dir={dir}
          >
            {/* Top iOS Grab Handle */}
            <div
              onClick={onClose}
              className="w-10 h-1.5 bg-white/20 hover:bg-white/40 rounded-full mx-auto mb-2 cursor-pointer transition-colors"
            />

            {/* Track Info Card Header */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
              <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-md flex-shrink-0">
                <img
                  src={getOptimizedCoverUrl(track.coverUrl || track.artworkUrl, 'thumb')}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  dir="ltr"
                  style={{ unicodeBidi: 'isolate', textAlign: isRTL ? 'right' : 'left' }}
                  className="text-sm font-black text-white truncate tracking-tight"
                >
                  {track.title}
                </h3>
                <p
                  dir="ltr"
                  style={{ unicodeBidi: 'isolate', textAlign: isRTL ? 'right' : 'left' }}
                  className="text-xs text-white/60 truncate mt-0.5"
                >
                  {track.artist}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40 font-mono">
                  <span>{formatTime(track.duration || 180)}</span>
                  <span>•</span>
                  <span>Apple Lossless</span>
                  {isDownloaded && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-sans flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>محفوظة</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Playlist Selector Subview */}
            {showPlaylistSelector ? (
              <div className="space-y-2 py-1 animate-fadeIn">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-bold text-white/80">اختر قائمة التشغيل:</span>
                  <button
                    onClick={() => setShowPlaylistSelector(false)}
                    className="text-xs text-[var(--apple-rose)] font-bold cursor-pointer"
                  >
                    رجوع
                  </button>
                </div>
                {playlists.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {playlists.map((pl) => (
                      <button
                        key={pl.id}
                        onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                        className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] text-start flex items-center justify-between text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        <span className="truncate">{pl.name}</span>
                        <span className="text-white/40 font-mono text-[10px]">
                          {pl.trackIds?.length || 0} مسار
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-4">
                    لا توجد قوائم تشغيل حالياً. أنشئ قائمة جديدة من تبويب القوائم.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
              {/* Group 1: Playback Queue Controls */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                {/* 1. Play Next */}
                <button
                  onClick={() => handleAction(() => playNextInQueue(track))}
                  className="w-full flex items-center gap-3.5 px-4 py-3 bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-white font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#FA243C]/15 text-[#FA243C] flex items-center justify-center shrink-0">
                    <ListEnd className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-start">
                    <span className="block leading-tight">{isRTL ? 'تشغيل التالي' : 'Play Next'}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">{isRTL ? 'التشغيل فور انتهاء الأغنية الحالية' : 'Plays right after current song'}</span>
                  </div>
                </button>

                {/* 2. Add to Queue */}
                <button
                  onClick={() => handleAction(() => addToQueue(track))}
                  className="w-full flex items-center gap-3.5 px-4 py-3 bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-white font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                    <ListPlus className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-start">
                    <span className="block leading-tight">{isRTL ? 'إضافة إلى نهاية الانتظار' : 'Add to Queue'}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">{isRTL ? 'إدراج المسار في قائمة الانتظار' : 'Append track to current queue'}</span>
                  </div>
                </button>
              </div>

              {/* Group 2: Library & Playlists */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                {/* 3. Toggle Favorite */}
                <button
                  onClick={() => handleAction(() => toggleFavorite(track.id))}
                  className="w-full flex items-center gap-3.5 px-4 py-3 bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-white font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center shrink-0">
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-[#FA243C] text-[#FA243C]' : ''}`} />
                  </div>
                  <span className="flex-1 text-start">
                    {isFav ? (isRTL ? 'إزالة من المفضلة' : 'Remove from Favorites') : (isRTL ? 'إضافة إلى المفضلة' : 'Add to Favorites')}
                  </span>
                </button>

                {/* 4. Add to Playlist */}
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowPlaylistSelector(true);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-white font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-start">{isRTL ? 'إضافة إلى قائمة تشغيل' : 'Add to Playlist'}</span>
                </button>

                {/* 5. Download for Offline */}
                <button
                  onClick={() => handleAction(() => downloadTrackForOffline(track.id))}
                  className="w-full flex items-center gap-3.5 px-4 py-3 bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-white font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    {isDownloaded ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  </div>
                  <span className="flex-1 text-start">
                    {isDownloaded ? (isRTL ? 'محفوظة للاستماع دون إنترنت' : 'Saved for Offline') : (isRTL ? 'تنزيل للاستماع دون إنترنت' : 'Download for Offline')}
                  </span>
                </button>
              </div>

              {/* Group 3: Metadata & Actions */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                {/* 6. Edit Metadata */}
                <button
                  onClick={() => handleAction(() => setMetadataEditorModal(true, track))}
                  className="w-full flex items-center gap-3.5 px-4 py-3 bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-white/90 font-medium text-xs sm:text-sm cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-start">{isRTL ? 'تعديل بيانات الأغنية' : 'Edit Track Info'}</span>
                </button>

                {/* 7. Change Artwork */}
                <button
                  onClick={() => handleAction(() => setChangeArtworkModal(true, track))}
                  className="w-full flex items-center gap-3.5 px-4 py-3 bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-white/90 font-medium text-xs sm:text-sm cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-start">{isRTL ? 'تغيير غلاف الألبوم' : 'Change Artwork'}</span>
                </button>

                {/* 8. Delete from Cloud (Only if online/cloud track) */}
                {(track.source === 'online' || (track.audioUrl && track.audioUrl.startsWith('http'))) && (
                  <button
                    onClick={() => handleAction(async () => {
                      const user = usePlayerStore.getState().currentUser;
                      if (!user || user.isGuest) {
                        addToast(
                          isRTL ? 'حذف المسارات مخصص لمالك المنصة فقط' : 'Only platform owner can delete tracks',
                          undefined,
                          'warning'
                        );
                        usePlayerStore.getState().setCloudUploaderOpen(true);
                        return;
                      }
                      if (window.confirm(isRTL ? `هل تريد حذف "${track.title}" من السحابة؟` : `Delete "${track.title}" from cloud?`)) {
                        await deleteCloudTrackById(track.id);
                      }
                    })}
                    className="w-full flex items-center gap-3.5 px-4 py-3 bg-transparent hover:bg-red-500/10 active:bg-red-500/20 transition-colors text-red-400 font-medium text-xs sm:text-sm cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-start">{isRTL ? 'حذف من السحابة' : 'Delete from Cloud'}</span>
                  </button>
                )}
              </div>
            </div>
            )}

            {/* Bottom Cancel Button */}
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm text-center transition-all cursor-pointer border border-white/10"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
