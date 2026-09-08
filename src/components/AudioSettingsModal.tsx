import React from 'react';
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
  const automixDuration = usePlayerStore((state) => state.automixDuration);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إعدادات الصوت المتقدمة ومواصفات DJ</h3>
              <p className="text-xs text-zinc-400">جودة البث، AutoMix، والسرعة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Track Specs Card */}
        {currentTrack && (
          <div className="p-4 rounded-xl bg-[#242424] border border-white/5 space-y-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              مواصفات الأغنية الحالية
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">العنوان</span>
              <span className="text-white font-semibold truncate max-w-[200px]">{currentTrack.title}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">جودة الصوت</span>
              <span className="text-[#1DB954] font-bold bg-[#1DB954]/15 px-2 py-0.5 rounded-full font-mono">
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
            <Gauge className="w-3.5 h-3.5 text-[#1DB954]" />
            سرعة التشغيل
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-[#1DB954] text-black shadow-md'
                    : 'bg-[#242424] text-zinc-300 hover:bg-[#303030]'
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
              <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
              الدمج التلقائي الذكي (AutoMix)
            </label>
            <button
              onClick={() => setAutoMix(!automixEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                automixEnabled ? 'bg-[#1DB954]' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  automixEnabled ? 'left-6' : 'left-1'
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
                      ? 'bg-white/15 border border-[#1DB954] text-[#1DB954]'
                      : 'bg-[#242424] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{style.name}</span>
                  {automixStyle === style.id && <Check className="w-3.5 h-3.5" />}
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
                className="p-2.5 rounded-xl bg-[#242424] hover:bg-amber-500/20 active:scale-95 text-center transition-all cursor-pointer border border-white/5 group"
              >
                <snd.Icon className="w-5 h-5 mx-auto text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-zinc-400 group-hover:text-white block truncate mt-1">{snd.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. Footer Shortcuts */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              setEqualizerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>فتح المعادل الصوتي (EQ)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#1DB954] text-black text-xs font-bold hover:scale-105 transition-all cursor-pointer"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
};
