import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { Play, Pause, ListPlus, Check, MoreHorizontal } from 'lucide-react';

interface MobileTrackRowProps {
  track: Track;
  index?: number;
  contextList?: Track[];
  onOpenActionSheet?: (track: Track) => void;
  showIndex?: boolean;
}

export const MobileTrackRow: React.FC<MobileTrackRowProps> = ({
  track,
  index,
  contextList,
  onOpenActionSheet,
  showIndex = false,
}) => {
  const { isRTL } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const addToQueue = usePlayerStore((state) => state.addToQueue);

  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const isCur = currentTrack?.id === track.id;

  const x = useMotionValue(0);
  // Transform drag distance to reveal action background and scale icon
  const bgOpacity = useTransform(x, isRTL ? [-100, -20, 0] : [0, 20, 100], [1, 0.4, 0]);
  const iconScale = useTransform(x, isRTL ? [-80, -30, 0] : [0, 30, 80], [1.2, 0.9, 0.5]);

  const handleRowClick = () => {
    triggerHaptic('light');
    if (isCur) {
      togglePlayPause();
    } else {
      playTrack(track, contextList);
    }
  };

  const handleQuickQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('success');
    addToQueue(track);
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 1200);
  };

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.x;
    const threshold = 70;
    const triggered = isRTL ? offset < -threshold : offset > threshold;

    if (triggered) {
      triggerHaptic('medium');
      addToQueue(track);
      setIsAddedFeedback(true);
      setTimeout(() => setIsAddedFeedback(false), 1200);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none touch-pan-y">
      {/* Swipe Reveal Action Background (Spotify Style) */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className={`absolute inset-0 bg-gradient-to-r ${
          isRTL ? 'from-transparent to-[#FA243C]' : 'from-[#FA243C] to-transparent'
        } flex items-center ${isRTL ? 'justify-end pe-5' : 'justify-start ps-5'} z-0`}
      >
        <motion.div style={{ scale: iconScale }} className="flex items-center gap-1.5 text-white font-bold text-xs">
          <ListPlus className="w-5 h-5 text-white" />
          <span className="hidden xs:inline">{isRTL ? 'إلى الطابور' : 'Queue'}</span>
        </motion.div>
      </motion.div>

      {/* Main Draggable Row */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: isRTL ? -90 : 0, right: isRTL ? 0 : 90 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        onClick={handleRowClick}
        className={`relative z-10 w-full flex items-center justify-between p-2 rounded-2xl border transition-colors cursor-pointer active:scale-[0.98] ${
          isCur
            ? 'bg-[#FA243C]/15 border-[#FA243C]/40'
            : 'bg-[#12121a]/80 hover:bg-[#151522] border-white/[0.06]'
        }`}
      >
        {/* Left: Index + Artwork + Title/Artist */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pe-2">
          {showIndex && index !== undefined && (
            <span className={`text-[11px] font-mono font-bold w-4 text-center shrink-0 ${isCur ? 'text-[#FA243C]' : 'text-white/40'}`}>
              {index + 1}
            </span>
          )}

          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/60 shrink-0 shadow-sm border border-white/5">
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
            <h4 className={`text-[13px] font-bold truncate leading-tight tracking-tight ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
              <bdi dir="auto">{track.title}</bdi>
            </h4>
            <p className="text-[11px] text-white/50 truncate mt-0.5 font-medium">
              <bdi dir="auto">{track.artist}</bdi>
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick 1-tap Add to Queue with Check Confirmation Animation */}
          <button
            type="button"
            onClick={handleQuickQueue}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isAddedFeedback
                ? 'bg-emerald-500 text-white scale-110 shadow-md shadow-emerald-500/40'
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-90"
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
