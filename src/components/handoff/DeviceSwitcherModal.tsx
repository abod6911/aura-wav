import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../i18n/useTranslation';
import { usePlayerStore } from '../../store/usePlayerStore';
import { handoffService, DeviceInfo, HandoffPayload } from '../../services/handoffService';
import { triggerHaptic } from '../../utils/haptics';
import { formatTime } from '../player/TimelineSlider';
import {
  X,
  Smartphone,
  Laptop,
  Tablet,
  Radio,
  CheckCircle2,
  ArrowRightLeft,
  Share2,
  Play,
  Copy,
  Check,
} from 'lucide-react';

interface DeviceSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSwitcherModal: React.FC<DeviceSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { isRTL } = useTranslation();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [remoteState, setRemoteState] = useState<HandoffPayload | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const seek = usePlayerStore((state) => state.seek);
  const addToast = usePlayerStore((state) => state.addToast);

  const currentDevice = handoffService.getCurrentDevice();

  useEffect(() => {
    if (!isOpen) return;

    const unsubDevices = handoffService.onActiveDevicesChange((list) => {
      setDevices(list);
    });

    const unsubState = handoffService.onRemoteStateChange((payload) => {
      setRemoteState(payload);
    });

    // Broadcast our own current state immediately when opening devices sheet
    handoffService.broadcastPlaybackState(currentTrack, currentTime, duration, isPlaying);

    return () => {
      unsubDevices();
      unsubState();
    };
  }, [isOpen, currentTrack, currentTime, duration, isPlaying]);

  if (!isOpen) return null;

  const handleResumeRemote = (payload: HandoffPayload) => {
    triggerHaptic('success');
    playTrack(payload.track);
    setTimeout(() => {
      seek(payload.currentTime);
    }, 150);

    addToast(
      isRTL
        ? `تم تحويل التشغيل إلى هذا الجهاز بنجاح`
        : `Playback transferred to this device`,
      undefined,
      'success'
    );
    handoffService.clearRemoteState();
    onClose();
  };

  const handleShareCurrentSession = () => {
    triggerHaptic('light');
    handoffService.broadcastPlaybackState(currentTrack, currentTime, duration, isPlaying);
    
    // Copy quick sync link to clipboard
    const syncUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(syncUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }

    addToast(
      isRTL ? 'تم بث الجلسة الحالية لجميع أجهزتك' : 'Current session broadcasted to all devices',
      undefined,
      'success'
    );
  };

  const renderDeviceIcon = (type: 'mobile' | 'desktop' | 'tablet') => {
    if (type === 'mobile') return <Smartphone className="w-5 h-5" />;
    if (type === 'tablet') return <Tablet className="w-5 h-5" />;
    return <Laptop className="w-5 h-5" />;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg bg-[#101018] border border-white/[0.12] rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FA243C]/15 border border-[#FA243C]/30 flex items-center justify-center text-[#FA243C]">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">
                  {isRTL ? 'الأجهزة و Handoff' : 'Devices & Handoff'}
                </h3>
                <p className="text-xs text-white/50">
                  {isRTL ? 'استمرارية ونقل التشغيل بين أجهزتك' : 'Continuity & seamless device switching'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* 1. Current Device Card */}
            <div>
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block mb-2 px-1">
                {isRTL ? 'الجهاز الحالي' : 'Current Device'}
              </span>
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-[#FA243C]/40 flex items-center justify-between shadow-[0_4px_20px_rgba(250,36,60,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FA243C] to-[#FF375F] text-white flex items-center justify-center shadow-md">
                    {renderDeviceIcon(currentDevice.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {currentDevice.name}
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                        {isRTL ? 'نشط الآن' : 'Active'}
                      </span>
                    </h4>
                    <p className="text-xs text-white/50">
                      {currentTrack
                        ? isPlaying
                          ? isRTL ? `يعزف: ${currentTrack.title}` : `Playing: ${currentTrack.title}`
                          : isRTL ? 'متوقف مؤقتاً' : 'Paused'
                        : isRTL ? 'جاهز للاستماع' : 'Ready'}
                    </p>
                  </div>
                </div>

                <CheckCircle2 className="w-5 h-5 text-[#FA243C]" />
              </div>
            </div>

            {/* 2. Detected Handoff Sessions */}
            {remoteState && (
              <div>
                <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block mb-2 px-1">
                  {isRTL ? 'جلسة Handoff متاحة' : 'Available Handoff Session'}
                </span>

                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-black to-[#FA243C]/10 border border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
                      <img
                        src={remoteState.track.artworkUrl || remoteState.track.coverUrl || '/logo.svg'}
                        alt={remoteState.track.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-purple-400">
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>{isRTL ? `من ${remoteState.deviceName}` : `From ${remoteState.deviceName}`}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {remoteState.track.title}
                      </h4>
                      <p className="text-[11px] text-white/50 truncate">
                        {remoteState.track.artist} •{' '}
                        <span className="font-mono text-purple-300">
                          {formatTime(remoteState.currentTime)} / {formatTime(remoteState.duration)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleResumeRemote(remoteState)}
                    className="ms-3 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-[#FA243C] text-white text-xs font-bold shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>{isRTL ? 'استئناف هنا' : 'Resume'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Broadcast & Continuity Actions */}
            <div>
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block mb-2 px-1">
                {isRTL ? 'إجراءات الاستمرارية' : 'Continuity Actions'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareCurrentSession}
                  className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/[0.08] text-start transition-all flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">
                      {isRTL ? 'بث الجلسة الحالية' : 'Broadcast Session'}
                    </h5>
                    <p className="text-[10px] text-white/45">
                      {isRTL ? 'مزامنة مع باقي أجهزتك' : 'Sync to all your devices'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleShareCurrentSession}
                  className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/[0.08] text-start transition-all flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">
                      {copiedLink ? (isRTL ? 'تم النسخ!' : 'Copied!') : isRTL ? 'نسخ رابط المزامنة' : 'Copy Sync Link'}
                    </h5>
                    <p className="text-[10px] text-white/45">
                      {isRTL ? 'لفتحه على هاتف آخر' : 'Open on another device'}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
