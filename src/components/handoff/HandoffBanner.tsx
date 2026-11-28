import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { handoffService, HandoffPayload } from '../../services/handoffService';
import { useTranslation } from '../../i18n/useTranslation';
import { triggerHaptic } from '../../utils/haptics';
import { formatTime } from '../player/TimelineSlider';
import { Smartphone, Laptop, Tablet, Play, X, ArrowLeftRight } from 'lucide-react';

export const HandoffBanner: React.FC = () => {
  const { isRTL } = useTranslation();
  const [remoteState, setRemoteState] = useState<HandoffPayload | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const seek = usePlayerStore((state) => state.seek);
  const addToast = usePlayerStore((state) => state.addToast);

  useEffect(() => {
    const unsubscribe = handoffService.onRemoteStateChange((payload) => {
      // Show only if there is a remote state from another device and local player is not actively playing the exact same track
      if (payload && (!isPlaying || currentTrack?.id !== payload.track.id)) {
        setRemoteState(payload);
        setIsDismissed(false);
      } else {
        setRemoteState(null);
      }
    });

    return () => unsubscribe();
  }, [isPlaying, currentTrack?.id]);

  const handleResume = () => {
    if (!remoteState) return;
    triggerHaptic('success');

    // 1. Play track
    playTrack(remoteState.track);

    // 2. Seek to remote position after a brief audio engine initialization tick
    setTimeout(() => {
      seek(remoteState.currentTime);
    }, 150);

    addToast(
      isRTL
        ? `تم استئناف التشغيل من ${remoteState.deviceName}`
        : `Resumed playback from ${remoteState.deviceName}`,
      undefined,
      'success'
    );

    // 3. Clear remote state and dismiss
    handoffService.clearRemoteState();
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    setIsDismissed(true);
    handoffService.clearRemoteState();
  };

  if (!remoteState || isDismissed) return null;

  const DeviceIcon =
    remoteState.deviceType === 'mobile'
      ? Smartphone
      : remoteState.deviceType === 'tablet'
      ? Tablet
      : Laptop;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="fixed top-3 sm:top-5 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[100] max-w-lg w-full pointer-events-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="relative flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#121212]/95 backdrop-blur-2xl border border-[#1DB954]/30 shadow-2xl shadow-black/80 specular-highlight overflow-hidden">
          {/* Subtle Ambient Pulse */}
          <div className="absolute -left-10 -top-10 w-24 h-24 bg-[#1DB954]/15 rounded-full blur-2xl pointer-events-none" />

          {/* Left: Device Icon + Artwork + Track Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-10 h-10 min-w-[40px] rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
              <img
                src={remoteState.track.artworkUrl || remoteState.track.coverUrl || './logo.svg'}
                alt={remoteState.track.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center">
                <DeviceIcon className="w-2.5 h-2.5 text-white/90" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1DB954] tracking-wide uppercase">
                  <ArrowLeftRight className="w-2.5 h-2.5" />
                  Handoff
                </span>
                <span className="text-[10px] text-white/50 truncate font-medium">
                  {isRTL ? `من ${remoteState.deviceName}` : `From ${remoteState.deviceName}`}
                </span>
              </div>
              <h4 className="text-xs sm:text-[13px] font-bold text-white truncate leading-tight mt-0.5">
                {remoteState.track.title}
              </h4>
              <p className="text-[10.5px] text-white/60 truncate leading-tight">
                {remoteState.track.artist} •{' '}
                <span className="font-mono text-white/45">
                  {formatTime(remoteState.currentTime)} / {formatTime(remoteState.duration)}
                </span>
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResume}
              className="px-3 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black text-xs font-extrabold shadow-lg shadow-black/40 active:scale-95 transition-[color,background-color,border-color,transform] flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{isRTL ? 'استئناف' : 'Resume'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
