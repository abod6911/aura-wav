import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { Play, ListPlus, Check, MoreHorizontal, Cloud } from 'lucide-react';
import { formatTime } from '../player/TimelineSlider';

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

  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const isCur = currentTrack?.id === track.id;
  const playList = trackList || contextList;

  const x = useMotionValue(0);
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
    const threshold = 45;
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
    <div className="relative w-full overflow-hidden select-none touch-pan-y">
      {/* Swipe Reveal Action Background */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className={`absolute inset-0 bg-gradient-to-r ${
          isRTL ? 'from-transparent via-[#FA2D48]/60 to-[#FA2D48]/80' : 'from-[#FA2D48]/80 via-[#FA2D48]/60 to-transparent'
        } flex items-center ${isRTL ? 'justify-end pe-4' : 'justify-start ps-4'} z-0`}
      >
        <motion.div style={{ scale: iconScale }} className="flex items-center gap-1.5 text-white font-bold text-xs">
          <ListPlus className="w-4 h-4 text-white stroke-[2.5]" />
          <span className="text-white text-xs font-bold">{isRTL ? 'إلى قائمة الانتظار' : 'To Queue'}</span>
        </motion.div>
      </motion.div>

      {/* Main Row */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: isRTL ? -80 : 0, right: isRTL ? 0 : 80 }}
        dragElastic={0.35}
        transition={{ type: 'spring', stiffness: 420, damping: 35, mass: 0.8 }}
        onDragEnd={handleDragEnd}
        onClick={handleRowClick}
        className={`relative z-10 w-full h-[60px] min-h-[60px] px-3.5 flex items-center justify-between gap-3 select-none transition-colors cursor-pointer active:bg-white/[0.04] ${
          isCur ? 'bg-[#181820]' : 'bg-transparent'
        }`}
      >
        {/* Left: Index + Artwork + Title/Artist */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pe-1">
          {showIndex && index !== undefined && (
            <span className={`text-[11px] font-mono font-bold w-4 text-center shrink-0 tabular-nums ${isCur ? 'text-[#FA2D48]' : 'text-zinc-500'}`}>
              {index + 1}
            </span>
          )}

          {/* 48px x 48px rounded-lg Artwork */}
          <div className="relative w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg overflow-hidden bg-[#14141c] shrink-0 aspect-square shadow-sm border border-white/10">
            <img
              src={track.artworkUrl || track.coverUrl || '/logo.svg'}
              alt={track.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover shrink-0 aspect-square"
            />
            {isCur && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                {isPlaying ? (
                  <div className="flex items-center gap-[2px]">
                    <span className="w-0.5 bg-[#FA2D48] rounded-full aura-soundbar-1 h-3" />
                    <span className="w-0.5 bg-[#FA2D48] rounded-full aura-soundbar-2 h-2" />
                    <span className="w-0.5 bg-[#FA2D48] rounded-full aura-soundbar-3 h-3.5" />
                  </div>
                ) : (
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              dir="auto"
              className={`text-[13px] sm:text-[14px] font-bold truncate block text-start leading-tight tracking-tight ${
                isCur ? 'text-[#FA2D48]' : 'text-white'
              }`}
            >
              {track.title}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 leading-tight">
              <p dir="auto" className="text-[11px] text-zinc-400 truncate block text-start font-normal">
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

        {/* Right: Duration + Quick Queue + 3-Dots */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {track.duration > 0 && (
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums select-none pe-1">
              {formatTime(track.duration)}
            </span>
          )}

          {/* Quick 1-tap Add to Queue (44px touch area) */}
          <button
            type="button"
            onClick={handleQuickQueue}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation active:scale-[0.92] transition-transform"
            title={isRTL ? 'إضافة إلى قائمة الانتظار' : 'Add to Queue'}
            aria-label={isRTL ? 'إضافة إلى قائمة الانتظار' : 'Add to Queue'}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isAddedFeedback
                  ? 'bg-emerald-500 text-white scale-105 shadow-md shadow-emerald-500/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {isAddedFeedback ? (
                <Check className="w-4 h-4 text-white stroke-[3]" />
              ) : (
                <ListPlus className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* 3-dots Menu Button (44px touch target) */}
          {onOpenActionSheet && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                onOpenActionSheet(track);
              }}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-transform cursor-pointer touch-manipulation"
              title={isRTL ? 'المزيد من الخيارات' : 'More options'}
              aria-label={isRTL ? 'المزيد من الخيارات' : 'More options'}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Inset Hairline Divider starting after artwork */}
        <div className="absolute bottom-0 start-[76px] end-0 h-[1px] bg-white/[0.05] pointer-events-none" />
      </motion.div>
    </div>
  );
};

export const MobileTrackRow = React.memo(MobileTrackRowInner);
