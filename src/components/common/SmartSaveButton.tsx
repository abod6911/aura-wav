import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, CheckCircle2 } from 'lucide-react';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { QuickPlaylistPicker } from '../library/QuickPlaylistPicker';
import { PLAY_ICON_SPRING } from '../../utils/motion';

interface SmartSaveButtonProps {
  track: Track | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showToastOnChange?: boolean;
}

export const SmartSaveButton: React.FC<SmartSaveButtonProps> = ({
  track,
  size = 'md',
  className = '',
  showToastOnChange = true,
}) => {
  const { isRTL } = useTranslation();
  const favorites = usePlayerStore((state) => state.favorites);
  const playlists = usePlayerStore((state) => state.playlists);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const addToast = usePlayerStore((state) => state.addToast);

  const [isPickerOpen, setPickerOpen] = useState(false);

  const isFav = useMemo(() => {
    if (!track) return false;
    return favorites.includes(track.id);
  }, [track, favorites]);

  const isInPlaylist = useMemo(() => {
    if (!track) return false;
    return playlists.some((pl) => pl.trackIds?.includes(track.id));
  }, [track, playlists]);

  const isSaved = isFav || isInPlaylist;

  if (!track) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');

    if (!isSaved) {
      // First click: Save to Liked Songs directly
      toggleFavorite(track.id);
      if (showToastOnChange) {
        addToast(
          isRTL ? 'تمت الإضافة إلى أغانيك المفضلة' : 'Added to Liked Songs',
          undefined,
          'success'
        );
      }
    } else {
      // Already saved in favorites or a playlist: Open QuickPlaylistPicker
      setPickerOpen(true);
    }
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizes = {
    sm: 'w-7 h-7 min-w-[28px] min-h-[28px]',
    md: 'w-9 h-9 min-w-[36px] min-h-[36px]',
    lg: 'w-10 h-10 min-w-[40px] min-h-[40px]',
  };

  return (
    <>
      <motion.button
        type="button"
        data-testid="smart-save-btn"
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.82 }}
        transition={PLAY_ICON_SPRING}
        onClick={handleClick}
        className={`flex items-center justify-center rounded-full cursor-pointer ${
          buttonSizes[size]
        } ${className}`}
        title={
          isSaved
            ? isRTL ? 'محفوظة في مكتبتك (انقر للتعديل)' : 'Saved in library (click to edit)'
            : isRTL ? 'إضافة إلى أغانيك المفضلة' : 'Save to Liked Songs'
        }
        aria-label={isSaved ? 'Saved' : 'Save'}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {isSaved ? (
            <motion.span
              key="saved"
              initial={{ scale: 0.5, opacity: 0, rotate: -18 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={PLAY_ICON_SPRING}
              className="flex items-center justify-center"
            >
              <CheckCircle2
                className={`${iconSizes[size]} text-[#1DB954] fill-[#1DB954] drop-shadow-[0_0_6px_rgba(29,185,84,0.45)]`}
              />
            </motion.span>
          ) : (
            <motion.span
              key="unsaved"
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.75, opacity: 0 }}
              transition={PLAY_ICON_SPRING}
              className="flex items-center justify-center"
            >
              <PlusCircle
                className={`${iconSizes[size]} text-zinc-400 hover:text-white transition-colors`}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Quick Playlist Picker Sheet / Modal */}
      {isPickerOpen && (
        <QuickPlaylistPicker
          track={track}
          isOpen={isPickerOpen}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
};
