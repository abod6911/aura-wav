import React, { useState, useMemo } from 'react';
import { PlusCircle, CheckCircle2 } from 'lucide-react';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { QuickPlaylistPicker } from '../library/QuickPlaylistPicker';

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
      <button
        type="button"
        data-testid="smart-save-btn"
        onClick={handleClick}
        className={`flex items-center justify-center rounded-full transition-transform active:scale-90 cursor-pointer ${
          buttonSizes[size]
        } ${className}`}
        title={
          isSaved
            ? isRTL ? 'محفوظة في مكتبتك (انقر للتعديل)' : 'Saved in library (click to edit)'
            : isRTL ? 'إضافة إلى أغانيك المفضلة' : 'Save to Liked Songs'
        }
        aria-label={isSaved ? 'Saved' : 'Save'}
      >
        {isSaved ? (
          <CheckCircle2
            className={`${iconSizes[size]} text-[#1DB954] fill-[#1DB954] transition-colors`}
          />
        ) : (
          <PlusCircle
            className={`${iconSizes[size]} text-zinc-400 hover:text-white transition-colors`}
          />
        )}
      </button>

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
