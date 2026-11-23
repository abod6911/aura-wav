import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { Heart, Plus, Check, X, FolderPlus } from 'lucide-react';

interface QuickPlaylistPickerProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickPlaylistPicker: React.FC<QuickPlaylistPickerProps> = ({
  track,
  isOpen,
  onClose,
}) => {
  const { isRTL, dir } = useTranslation();
  const favorites = usePlayerStore((state) => state.favorites);
  const playlists = usePlayerStore((state) => state.playlists);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const addTrackToPlaylist = usePlayerStore((state) => state.addTrackToPlaylist);
  const removeTrackFromPlaylist = usePlayerStore((state) => state.removeTrackFromPlaylist);
  const createPlaylist = usePlayerStore((state) => state.createPlaylist);
  const addToast = usePlayerStore((state) => state.addToast);

  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!track || typeof document === 'undefined') return null;

  const isFav = favorites.includes(track.id);

  const handleToggleFavorite = () => {
    triggerHaptic('light');
    toggleFavorite(track.id);
  };

  const handleTogglePlaylist = async (playlistId: string, isMember: boolean) => {
    triggerHaptic('light');
    if (isMember) {
      await removeTrackFromPlaylist(playlistId, track.id);
    } else {
      await addTrackToPlaylist(playlistId, track.id);
    }
  };

  const handleCreateNew = async () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;
    try {
      await createPlaylist(trimmed, [track.id]);
      addToast(
        isRTL ? `تم إنشاء "${trimmed}" وإضافة الأغنية إليها` : `Created "${trimmed}" and added track`,
        undefined,
        'success'
      );
      setNewPlaylistName('');
      setIsCreatingInline(false);
    } catch {
      addToast(isRTL ? 'تعذر إنشاء قائمة التشغيل' : 'Failed to create playlist', undefined, 'warning');
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-80 flex items-end sm:items-center justify-center select-none"
          dir={dir}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-0"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="relative z-10 w-full sm:max-w-md bg-[#181818] border border-white/10 rounded-t-[28px] sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="min-w-0 pr-2">
                <h3 className="text-base font-bold text-white truncate">
                  {isRTL ? 'إضافة إلى قائمة تشغيل' : 'Add to playlist'}
                </h3>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {track.title} • {track.artist}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create New Playlist Button / Inline Input */}
            {isCreatingInline ? (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/10">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder={isRTL ? 'اسم قائمة التشغيل...' : 'Playlist name...'}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNew();
                    if (e.key === 'Escape') setIsCreatingInline(false);
                  }}
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none px-2"
                />
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="px-3 py-1.5 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs transition-colors cursor-pointer"
                >
                  {isRTL ? 'إنشاء' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingInline(false)}
                  className="p-1.5 text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsCreatingInline(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <span>{isRTL ? 'قائمة تشغيل جديدة' : 'New playlist'}</span>
              </button>
            )}

            {/* Scrollable List of Destinations */}
            <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar max-h-60 pr-1">
              {/* 1. Liked Songs Row */}
              <div
                onClick={handleToggleFavorite}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#450AF5] to-[#8E8EE5] flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-white block truncate">
                      {isRTL ? 'أغانيك المفضلة' : 'Liked Songs'}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {favorites.length} {isRTL ? 'مسار' : 'songs'}
                    </span>
                  </div>
                </div>

                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    isFav
                      ? 'bg-[#1DB954] text-black shadow-sm'
                      : 'border-2 border-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  {isFav && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* 2. User Custom Playlists */}
              {playlists.map((pl) => {
                const isMember = pl.trackIds?.includes(track.id) ?? false;
                return (
                  <div
                    key={pl.id}
                    onClick={() => handleTogglePlaylist(pl.id, isMember)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#282828] flex items-center justify-center shrink-0 text-zinc-400">
                        <FolderPlus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white block truncate">
                          {pl.name}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {pl.trackIds?.length || 0} {isRTL ? 'مسار' : 'tracks'}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        isMember
                          ? 'bg-[#1DB954] text-black shadow-sm'
                          : 'border-2 border-zinc-500 hover:border-zinc-300'
                      }`}
                    >
                      {isMember && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Done Button */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                {isRTL ? 'تم' : 'Done'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
