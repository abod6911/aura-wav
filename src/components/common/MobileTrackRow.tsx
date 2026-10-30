import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { Play, ListPlus, Check, MoreHorizontal } from 'lucide-react';

interface MobileTrackRowProps {
  track: Track;
  index?: number;
  contextList?: Track[];
  trackList?: Track[];
  onOpenActionSheet?: (track: Track) => void;
  showIndex?: boolean;
}

export const MobileTrackRow: React.FC<MobileTrackRowProps> = ({
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

  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const isCur = currentTrack?.id === track.id;
  const playList = trackList || contextList;

  const x = useMotionValue(0);
  // Transform drag distance to reveal action background and scale icon
  const bgOpacity = useTransform(x, isRTL ? [-80, -20, 0] : [0, 20, 80], [1, 0.4, 0]);
  const iconScale = useTransform(x, isRTL ? [-70, -30, 0] : [0, 30, 70], [1.2, 0.9, 0.5]);

  const handleRowClick = () => {
    triggerHaptic('light');
    if (isCur) {
      togglePlayPause();
    } else {
      playTrack(track, playList);
    }
  };

  const handleQuickQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(12); } catch {}
    } else {
      triggerHaptic('success');
    }
    addToQueue(track);
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 1000);
  };

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.x;
    const threshold = 55;
    const triggered = isRTL ? offset < -threshold : offset > threshold;

    if (triggered) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(12); } catch {}
      } else {
        triggerHaptic('medium');
      }
      addToQueue(track);
      addToast(isRTL ? 'تمت الإضافة إلى قائمة الانتظار' : 'Added to queue', undefined, 'success');
      setIsAddedFeedback(true);
      setTimeout(() => setIsAddedFeedback(false), 1000);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none touch-pan-y my-1">
      {/* Swipe Reveal Action Background (Spotify Style) */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className={`absolute inset-0 bg-gradient-to-r ${
          isRTL ? 'from-transparent via-[#FA243C]/80 to-[#FA243C]' : 'from-[#FA243C] via-[#FA243C]/80 to-transparent'
        } flex items-center ${isRTL ? 'justify-end pe-5' : 'justify-start ps-5'} z-0`}
      >
        <motion.div style={{ scale: iconScale }} className="flex items-center gap-1.5 text-white font-bold text-xs animate-pulse">
          <ListPlus className="w-5 h-5 text-white stroke-[2.5]" />
          <span className="text-white text-xs font-black">{isRTL ? 'إلى قائمة الانتظار' : 'To Queue'}</span>
        </motion.div>
      </motion.div>

      {/* Main Draggable Row */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: isRTL ? -80 : 0, right: isRTL ? 0 : 80 }}
        dragElastic={0.2}
        transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
        onDragEnd={handleDragEnd}
        onClick={handleRowClick}
        className={`relative z-10 w-full h-[64px] min-h-[64px] px-3 rounded-2xl flex items-center justify-between gap-3 select-none border transition-colors cursor-pointer active:scale-[0.98] ${
          isCur
            ? 'bg-[#FA243C]/15 border-[#FA243C]/40'
            : 'bg-[#12121a]/90 hover:bg-[#161622] border-white/[0.06]'
        }`}
      >
        {/* Left: Index + Artwork + Title/Artist */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pe-1">
          {showIndex && index !== undefined && (
            <span className={`text-[11px] font-mono font-bold w-4 text-center shrink-0 ${isCur ? 'text-[#FA243C]' : 'text-white/40'}`}>
              {index + 1}
            </span>
          )}

          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#14141c] shrink-0 shadow-sm border border-white/5">
            <img
              src={track.artworkUrl || track.coverUrl || '/logo.svg'}
              alt={track.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            {isCur && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                {isPlaying ? (
                  <div className="flex items-center gap-[2px]">
                    <span className="w-0.5 bg-[#FA243C] rounded-full aura-soundbar-1 h-3" />
                    <span className="w-0.5 bg-[#FA243C] rounded-full aura-soundbar-2 h-2" />
                    <span className="w-0.5 bg-[#FA243C] rounded-full aura-soundbar-3 h-3.5" />
                  </div>
                ) : (
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className={`text-[15px] font-semibold truncate leading-tight tracking-tight ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
              <bdi dir="auto">{track.title}</bdi>
            </h4>
            <p className="text-[13px] text-white/55 truncate mt-0.5 font-medium">
              <bdi dir="auto">{track.artist}</bdi>
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick 1-tap Add to Queue with Check Confirmation Animation */}
          <button
            type="button"
            onClick={handleQuickQueue}
            className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-transform active:scale-[0.93] duration-75 cursor-pointer ${
              isAddedFeedback
                ? 'bg-emerald-500 text-white scale-105 shadow-md shadow-emerald-500/40'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white'
            }`}
            title={isRTL ? 'إضافة إلى قائمة الانتظار' : 'Add to Queue'}
            aria-label={isRTL ? 'إضافة إلى قائمة الانتظار' : 'Add to Queue'}
          >
            {isAddedFeedback ? (
              <Check className="w-4 h-4 text-white stroke-[3]" />
            ) : (
              <ListPlus className="w-4 h-4 text-white/80" />
            )}
          </button>

          {/* 3-dots Menu Button */}
          {onOpenActionSheet && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                onOpenActionSheet(track);
              }}
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 transition-transform active:scale-[0.93] duration-75 cursor-pointer"
              title={isRTL ? 'المزيد من الخيارات' : 'More options'}
              aria-label={isRTL ? 'المزيد من الخيارات' : 'More options'}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
