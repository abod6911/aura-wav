import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Track } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { Play, ListPlus, Check, MoreHorizontal, Cloud } from 'lucide-react';

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

  // Harmonic Key & BPM calculation for acoustic instrument HUD
  const bpm = track.bpm || (115 + (Math.abs(track.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 30));
  const key = track.key || `${(Math.abs(track.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 12) + 1}${['A', 'B'][Math.abs(track.id.length) % 2]}`;

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
    <div className="relative w-full rounded-2xl overflow-hidden select-none touch-pan-y my-1">
      {/* Swipe Reveal Action Background */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className={`absolute inset-0 bg-gradient-to-r ${
          isRTL ? 'from-transparent via-[#FA243C]/60 to-[#FA243C]/80' : 'from-[#FA243C]/80 via-[#FA243C]/60 to-transparent'
        } flex items-center ${isRTL ? 'justify-end pe-5' : 'justify-start ps-5'} z-0`}
      >
        <motion.div style={{ scale: iconScale }} className="flex items-center gap-1.5 text-white font-bold text-xs">
          <ListPlus className="w-5 h-5 text-white stroke-[2.5]" />
          <span className="text-white text-xs font-bold">{isRTL ? 'إلى قائمة الانتظار' : 'To Queue'}</span>
        </motion.div>
      </motion.div>

      {/* Main Draggable Acoustic Strip */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: isRTL ? -80 : 0, right: isRTL ? 0 : 80 }}
        dragElastic={0.35}
        transition={{ type: 'spring', stiffness: 420, damping: 35, mass: 0.8 }}
        onDragEnd={handleDragEnd}
        onClick={handleRowClick}
        className={`relative z-10 w-full h-[64px] min-h-[64px] px-3 rounded-2xl flex items-center justify-between gap-3 select-none border transition-all cursor-pointer active:scale-[0.98] specular-highlight-subtle ${
          isCur
            ? 'bg-[#181824]/95 border-[#FA243C]/40 shadow-[0_4px_20px_rgba(250,36,60,0.15)]'
            : 'bg-[#101016]/85 hover:bg-[#14141e] border-white/[0.06]'
        }`}
      >
        {/* Left: Index + Artwork + Title/Artist & Acoustic Badges */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pe-1">
          {showIndex && index !== undefined && (
            <span className={`text-[11px] font-mono font-bold w-4 text-center shrink-0 tabular-nums ${isCur ? 'text-[#FA243C]' : 'text-white/40'}`}>
              {index + 1}
            </span>
          )}

          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#14141c] shrink-0 shadow-md border border-white/10">
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
            <h4 className={`text-[14.5px] font-semibold truncate leading-tight tracking-tight ${isCur ? 'text-[#FA243C]' : 'text-white'}`}>
              <bdi dir="auto">{track.title}</bdi>
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 leading-tight">
              <p className="text-[12px] text-white/55 truncate font-medium">
                <bdi dir="auto">{track.artist}</bdi>
              </p>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.08] text-[9px] font-mono text-white/45 tabular-nums shrink-0">
                <span className="text-[#FF375F] font-semibold">{bpm}</span>
                <span className="text-white/20">•</span>
                <span className="text-amber-400/90 font-semibold">{key}</span>
              </span>
              {(track.source === 'online' || (track.audioUrl && track.audioUrl.startsWith('http'))) && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-sky-500/15 border border-sky-500/30 text-[8.5px] font-bold text-sky-400 shrink-0" title="سحابية">
                  <Cloud className="w-2.5 h-2.5 text-sky-400" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons with >=44x44px touch targets */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick 1-tap Add to Queue with Check Confirmation Animation */}
          <button
            type="button"
            onClick={handleQuickQueue}
            className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-transform active:scale-[0.92] duration-75 cursor-pointer ${
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
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 transition-transform active:scale-[0.92] duration-75 cursor-pointer"
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

export const MobileTrackRow = React.memo(MobileTrackRowInner);
