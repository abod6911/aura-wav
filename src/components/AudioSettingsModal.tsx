import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { X, Sparkles, Sliders, Flame, Gauge, Check, Disc, Megaphone, Waves, Zap, Radio } from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const setPlaybackRate = usePlayerStore((state) => state.setPlaybackRate);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixStyle = usePlayerStore((state) => state.automixStyle);
  const setAutoMix = usePlayerStore((state) => state.setAutoMix);
  const setAutomixStyle = usePlayerStore((state) => state.setAutomixStyle);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const playDJSound = usePlayerStore((state) => state.playDJSound);
  const addToast = usePlayerStore((state) => state.addToast);

  if (!isOpen) return null;

  const DJ_SOUNDS = [
    { id: 'scratch', name: 'Vinyl Scratch', Icon: Disc },
    { id: 'airhorn', name: 'Air Horn', Icon: Megaphone },
    { id: 'echo_drop', name: 'Echo Drop', Icon: Waves },
    { id: 'laser', name: 'Laser Beam', Icon: Zap },
    { id: 'cheer', name: 'Crowd Cheer', Icon: Radio },
  ] as const;

  const AUTOMIX_STYLES = [
    { id: 'crossfade', name: 'Crossfade سلس' },
    { id: 'filter_sweep', name: 'Filter Sweep' },
    { id: 'echo_out', name: 'Echo Out' },
    { id: 'vinyl_brake', name: 'Vinyl Brake' },
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
        />

        {/* Modal Window: visionOS Obsidian Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-[#0d0d14]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl space-y-5 text-white overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] shadow-lg shadow-[#FA243C]/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0d0d14] rounded-[14px] flex items-center justify-center text-[#FA243C]">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">إعدادات الصوت المتقدمة ومواصفات DJ</h3>
                <p className="text-xs text-zinc-400 font-medium">جودة البث، AutoMix، والسرعة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Track Specs Card */}
          {currentTrack && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                مواصفات الأغنية الحالية
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">العنوان</span>
                <span className="text-white font-semibold truncate max-w-[200px]">{currentTrack.title}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">جودة الصوت</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full font-mono text-[11px] border border-emerald-500/25">
                  Lossless Hi-Fi 320kbps
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">المصدر</span>
                <span className="text-zinc-300">
                  {currentTrack.source === 'local' ? 'ملف محلي كامل (بدون أي حد زمني)' : 'بث سحابي مستمر'}
                </span>
              </div>
            </div>
          )}

          {/* 2. Playback Speed */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-[#FA243C]" />
              سرعة التشغيل
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25'
                      : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] border border-white/[0.06]'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* 3. AutoMix Transition Engine */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FA243C]" />
                الدمج التلقائي الذكي (AutoMix)
              </label>
              <button
                type="button"
                onClick={() => setAutoMix(!automixEnabled)}
                className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  automixEnabled ? 'bg-[#FA243C]' : 'bg-white/10'
                }`}
              >
                <motion.div
                  layout
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-md ${
                    automixEnabled ? 'translate-x-5.5 rtl:-translate-x-5.5' : ''
                  }`}
                />
              </button>
            </div>

            {automixEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {AUTOMIX_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setAutomixStyle(style.id as any)}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      automixStyle === style.id
                        ? 'bg-[#FA243C]/20 border border-[#FA243C]/60 text-white'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <span>{style.name}</span>
                    {automixStyle === style.id && <Check className="w-3.5 h-3.5 text-[#FA243C]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. DJ Live Soundboard Pads */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              مؤثرات الـ DJ الصوتية الحية
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DJ_SOUNDS.map((snd) => (
                <button
                  key={snd.id}
                  onClick={() => {
                    playDJSound(snd.id);
                    addToast(`DJ Effect: ${snd.name}`, undefined, 'info');
                  }}
                  className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-amber-500/20 active:scale-95 text-center transition-all cursor-pointer border border-white/[0.06] group"
                >
                  <snd.Icon className="w-5 h-5 mx-auto text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-zinc-400 group-hover:text-white block truncate mt-1">{snd.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Footer Shortcuts */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <button
              onClick={() => {
                onClose();
                setEqualizerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#FA243C]" />
              <span>فتح المعادل الصوتي (EQ)</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:scale-105 transition-all cursor-pointer shadow-md"
            >
              تم
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
