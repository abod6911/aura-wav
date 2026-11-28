import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { Play, ListPlus, MoreHorizontal, Cloud, Heart } from 'lucide-react';
import { formatTime, isArabicText } from '../../utils/formatters';
import { SmartSaveButton } from './SmartSaveButton';

interface MobileTrackRowProps {
  track: Track;
  index?: number;
  contextList?: Track[];
  trackList?: Track[];
  onOpenActionSheet?: (track: Track) => void;
  showIndex?: boolean;
}

const MobileTrackRowInner: React.FC<MobileTrackRowProps> = ({
  track,
  index,
  contextList,
  trackList,
  onOpenActionSheet,
  showIndex = false,
}) => {
  const { isRTL } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const addToast = usePlayerStore((state) => state.addToast);
  const isOnline = usePlayerStore((state) => state.isOnline);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);

  const isCur = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);
  const isAvailableOffline = downloadedTrackIds.includes(track.id) || !!track.file || !!track.blob;
  const isDimmed = !isOnline && !isAvailableOffline;
  const playList = trackList || contextList;

  const x = useMotionValue(0);

  // Queue swipe (Revealed when dragging in direction A)
  const queueOpacity = useTransform(x, isRTL ? [-80, -25, 0] : [0, 25, 80], [1, 0.4, 0]);
  const queueScale = useTransform(x, isRTL ? [-70, -30, 0] : [0, 30, 70], [1.1, 0.9, 0.5]);

  // Favorite swipe (Revealed when dragging in direction B)
  const favOpacity = useTransform(x, isRTL ? [0, 25, 80] : [-80, -25, 0], [0, 0.4, 1]);
  const favScale = useTransform(x, isRTL ? [0, 30, 70] : [-70, -30, 0], [0.5, 0.9, 1.1]);

  const handleRowClick = () => {
    triggerHaptic('light');
    if (isDimmed) {
      addToast('هذه الأغنية غير محمّلة للاستماع بدون إنترنت', undefined, 'warning');
      return;
    }
    if (isCur) {
      togglePlayPause();
    } else {
      playTrack(track, playList);
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    const dx = info.offset.x;
    const dy = info.offset.y;

    // Scroll Lock Guard: only trigger if horizontal displacement > 18px and > 1.5x vertical displacement
    if (Math.abs(dx) <= 18 || Math.abs(dx) <= Math.abs(dy) * 1.5) {
      return;
    }

    const threshold = 45;
    const isQueueTriggered = isRTL ? dx < -threshold : dx > threshold;
    const isFavTriggered = isRTL ? dx > threshold : dx < -threshold;

    if (isQueueTriggered) {
      triggerHaptic('medium');
      addToQueue(track);
      addToast(isRTL ? 'تمت الإضافة إلى قائمة الانتظار' : 'Added to queue', undefined, 'success');
    } else if (isFavTriggered) {
      triggerHaptic('medium');
      toggleFavorite(track.id);
      const willBeFav = !favorites.includes(track.id);
      addToast(
        willBeFav
          ? (isRTL ? 'تمت الإضافة إلى أغانيك المفضلة' : 'Added to Liked Songs')
          : (isRTL ? 'تمت الإزالة من المفضلة' : 'Removed from Favorites'),
        undefined,
        'success'
      );
    }
  };

  return (
    <div className="relative w-full overflow-hidden select-none touch-pan-y">
      {/* 1. Queue Action Reveal (Direction A) */}
      <motion.div
        style={{ opacity: queueOpacity }}
        className={`absolute inset-0 bg-gradient-to-r ${
          isRTL ? 'from-transparent via-zinc-800 to-zinc-900' : 'from-zinc-900 via-zinc-800 to-transparent'
        } flex items-center ${isRTL ? 'justify-end pe-4' : 'justify-start ps-4'} z-0`}
      >
        <motion.div style={{ scale: queueScale }} className="flex items-center gap-1.5 text-white font-bold text-xs">
          <ListPlus className="w-4 h-4 text-[#1DB954] stroke-[2.5]" />
          <span className="text-white text-xs font-bold">{isRTL ? 'إلى قائمة الانتظار' : 'To Queue'}</span>
        </motion.div>
      </motion.div>

      {/* 2. Favorite Action Reveal (Direction B) */}
      <motion.div
        style={{ opacity: favOpacity }}
        className={`absolute inset-0 bg-gradient-to-r ${
          isRTL ? 'from-[#1DB954]/80 via-[#1DB954]/60 to-transparent' : 'from-transparent via-[#1DB954]/60 to-[#1DB954]/80'
        } flex items-center ${isRTL ? 'justify-start ps-4' : 'justify-end pe-4'} z-0`}
      >
        <motion.div style={{ scale: favScale }} className="flex items-center gap-1.5 text-black font-bold text-xs">
          <Heart className={`w-4 h-4 ${isFav ? 'text-black fill-black' : 'text-black'}`} />
          <span className="text-black text-xs font-bold">
            {isFav ? (isRTL ? 'إزالة من المفضلة' : 'Unfavorite') : (isRTL ? 'إلى المفضلة' : 'Favorite')}
          </span>
        </motion.div>
      </motion.div>

      {/* Main Row */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.35}
        transition={{ type: 'spring', stiffness: 420, damping: 35, mass: 0.8 }}
        onDragEnd={handleDragEnd}
        onClick={handleRowClick}
        className={`relative z-10 w-full h-[54px] min-h-[54px] px-3 flex items-center justify-between gap-2.5 select-none cursor-pointer transition-colors duration-150 ${
          isCur ? 'bg-[#242424]' : 'bg-transparent hover:bg-white/[0.04]'
        } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
      >
        {/* Left: Index + Artwork + Title/Artist */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pe-1">
          {showIndex && index !== undefined && (
            <span className={`text-[11px] font-mono font-bold w-4 text-center shrink-0 tabular-nums ${isCur ? 'text-[#1DB954]' : 'text-zinc-500'}`}>
              {index + 1}
            </span>
          )}

          {/* 40px x 40px rounded-lg Artwork */}
          <div className="relative w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg overflow-hidden bg-[#181818] shrink-0 aspect-square shadow-sm border border-white/10">
            <img
              src={track.artworkUrl || track.coverUrl || './logo.svg'}
              alt={track.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover shrink-0 aspect-square"
            />
            {isCur && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                {isPlaying ? (
                  <div className="flex items-center gap-[2px]">
                    <span className="w-0.5 bg-[#1DB954] rounded-full aura-soundbar-1 h-3" />
                    <span className="w-0.5 bg-[#1DB954] rounded-full aura-soundbar-2 h-2" />
                    <span className="w-0.5 bg-[#1DB954] rounded-full aura-soundbar-3 h-3.5" />
                  </div>
                ) : (
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              dir={isArabicText(track.title) ? 'rtl' : 'ltr'}
              className={`text-[13px] sm:text-[14px] font-bold truncate block leading-tight tracking-tight ${
                isRTL ? 'text-right' : 'text-left'
              } ${isCur ? 'text-[#1DB954]' : 'text-white'}`}
            >
              {track.title}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 leading-tight">
              <p
                dir={isArabicText(track.artist) ? 'rtl' : 'ltr'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (track.artist) openArtist(track.artist);
                }}
                className={`text-[11px] text-[#B3B3B3] hover:text-white hover:underline truncate block font-normal cursor-pointer transition-colors ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              >
                {track.artist}
              </p>
              {(track.source === 'online' || (track.audioUrl && track.audioUrl.startsWith('http'))) && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-sky-500/15 border border-sky-500/30 text-[8px] font-bold text-sky-400 shrink-0" title="سحابية">
                  <Cloud className="w-2.5 h-2.5 text-sky-400" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Duration + Smart Save + 3-Dots (Balanced mobile ergonomics) */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {track.duration > 0 && (
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums select-none pe-0.5">
              {formatTime(track.duration)}
            </span>
          )}

          {/* Quick Smart Save (+ / ✓) */}
          <SmartSaveButton track={track} size="sm" />

          {/* 3-dots Menu Button (40px touch target) */}
          {onOpenActionSheet && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                onOpenActionSheet(track);
              }}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-zinc-400 hover:text-white apple-btn-tactile cursor-pointer touch-manipulation"
              title={isRTL ? 'المزيد من الخيارات' : 'More options'}
              aria-label={isRTL ? 'المزيد من الخيارات' : 'More options'}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Inset Hairline Divider starting after artwork */}
        <div className="absolute bottom-0 start-[60px] end-0 h-[1px] bg-white/[0.05] pointer-events-none" />
      </motion.div>
    </div>
  );
};

export const MobileTrackRow = React.memo(MobileTrackRowInner);
