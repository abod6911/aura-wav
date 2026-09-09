import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AutoMixStyle } from '../../lib/audioEngine';
import {
  Sparkles,
  X,
  Flame,
  Zap,
  Sliders,
  RotateCcw,
  Gauge,
  SlidersHorizontal,
  CheckCircle2,
  Disc,
  Volume2,
  Activity,
  Radio,
  Waves,
} from 'lucide-react';

interface SoundPad {
  id: 'scratch' | 'airhorn' | 'echo_drop' | 'laser' | 'cheer';
  titleAr: string;
  titleEn: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  glowColor: string;
}

const SOUND_PADS: SoundPad[] = [
  {
    id: 'scratch',
    titleAr: 'خربشة القرص',
    titleEn: 'Vinyl Scratch',
    icon: Disc,
    color: '#1DB954',
    gradient: 'from-[#1DB954]/25 via-[#1DB954]/10 to-transparent',
    glowColor: 'rgba(29, 185, 84, 0.45)',
  },
  {
    id: 'airhorn',
    titleAr: 'بوق الحفلة',
    titleEn: 'Club Airhorn',
    icon: Volume2,
    color: '#FF9500',
    gradient: 'from-amber-500/25 via-amber-500/10 to-transparent',
    glowColor: 'rgba(245, 158, 11, 0.45)',
  },
  {
    id: 'echo_drop',
    titleAr: 'صدمة البيس',
    titleEn: 'Sub Bass Drop',
    icon: Activity,
    color: '#AF52DE',
    gradient: 'from-purple-500/25 via-purple-500/10 to-transparent',
    glowColor: 'rgba(175, 82, 222, 0.45)',
  },
  {
    id: 'laser',
    titleAr: 'ليزر حماسي',
    titleEn: 'Laser Riser',
    icon: Zap,
    color: '#30D158',
    gradient: 'from-emerald-500/25 via-emerald-500/10 to-transparent',
    glowColor: 'rgba(52, 199, 89, 0.45)',
  },
  {
    id: 'cheer',
    titleAr: 'هتاف الجمهور',
    titleEn: 'Crowd Cheer',
    icon: Radio,
    color: '#0A84FF',
    gradient: 'from-blue-500/25 via-blue-500/10 to-transparent',
    glowColor: 'rgba(10, 132, 255, 0.45)',
  },
];

const AUTOMIX_STYLES: { id: AutoMixStyle; nameAr: string; nameEn: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: 'crossfade',
    nameAr: 'تلاشٍ انسيابي (Classic)',
    nameEn: 'Smooth Crossfade',
    desc: 'تلاشي صوتي هادئ وتدريجي بين الأغنيتين',
    icon: Waves,
  },
  {
    id: 'vinyl_brake',
    nameAr: 'فرملة الفينيل (Turntable)',
    nameEn: 'Vinyl Brake',
    desc: 'إيقاف تدريجي مع انخفاض النغمة مثل أسطوانة الـ DJ',
    icon: Disc,
  },
  {
    id: 'echo_out',
    nameAr: 'الصدى المتلاشي (Club Echo)',
    nameEn: 'Echo Out',
    desc: 'تكرار صدى متلاشٍ في فضاء ثلاثي الأبعاد',
    icon: Sparkles,
  },
  {
    id: 'filter_sweep',
    nameAr: 'فلتر الترددات (Filter Sweep)',
    nameEn: 'Filter Sweep',
    desc: 'سحب الترددات العالية والمنخفضة تمهيداً للدخول الحماسي',
    icon: SlidersHorizontal,
  },
];

interface DJFxSheetProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const DJFxSheet: React.FC<DJFxSheetProps> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const isStoreOpen = usePlayerStore((state) => state.isSoundboardOpen);
  const setStoreOpen = usePlayerStore((state) => state.setSoundboardOpen);
  const playDJSound = usePlayerStore((state) => state.playDJSound);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const setPlaybackRate = usePlayerStore((state) => state.setPlaybackRate);

  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);
  const automixStyle = usePlayerStore((state) => state.automixStyle);
  const setAutoMix = usePlayerStore((state) => state.setAutoMix);
  const setAutomixStyle = usePlayerStore((state) => state.setAutomixStyle);
  const addToast = usePlayerStore((state) => state.addToast);

  const [activePad, setActivePad] = useState<string | null>(null);

  const isOpen = propIsOpen !== undefined ? propIsOpen : isStoreOpen;
  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setStoreOpen(false);
    }
  };

  const triggerHaptic = (ms = 25) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  };

  const triggerPad = (pad: SoundPad) => {
    setActivePad(pad.id);
    triggerHaptic(30);
    playDJSound(pad.id);
    setTimeout(() => {
      setActivePad((curr) => (curr === pad.id ? null : curr));
    }, 350);
  };

  if (!isOpen) return null;

  const pitchDiffPercent = Math.round((playbackRate - 1) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 select-none">
        {/* Dark frosted glass backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-xl cursor-pointer"
        />

        {/* Bottom Drawer Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          style={{ touchAction: 'manipulation' }}
          className="relative w-full max-w-2xl max-h-[88dvh] overflow-y-auto scrollbar-none bg-[#0c0c14]/95 border-t border-x border-white/[0.12] rounded-t-[32px] shadow-[0_-25px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl p-5 sm:p-7 space-y-6 pb-[max(2rem,env(safe-area-inset-bottom,2rem))] z-10"
          dir="rtl"
        >
          {/* Top Grab Handle */}
          <div className="flex justify-center -mt-2 mb-1">
            <div className="w-12 h-1.5 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1DB954] to-[#34D399] p-[1.5px] shadow-lg shadow-[#1DB954]/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0c0c14] rounded-[14px] flex items-center justify-center">
                  <Flame className="w-5 h-5 text-[#1DB954]" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>أدوات ومؤثرات الـ DJ الحية</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1ed760] border border-[#1DB954]/30 font-mono">
                    LIVE FX
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  مؤثرات صوتية، تحكم بالنغمة والسرعة، وإعدادات الانتقال التلقائي الذكي
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Live Soundboard Pads Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>لوحة المؤثرات الفورية (Soundboard Pads)</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">اضغط لأي مؤثر أثناء التشغيل</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SOUND_PADS.map((pad) => {
                const isActive = activePad === pad.id;
                return (
                  <motion.button
                    key={pad.id}
                    whileTap={{ scale: 0.92 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      triggerPad(pad);
                    }}
                    style={{
                      touchAction: 'manipulation',
                      boxShadow: isActive ? `0 0 24px ${pad.glowColor}` : undefined,
                      borderColor: isActive ? pad.color : 'rgba(255,255,255,0.08)',
                    }}
                    className={`relative overflow-hidden rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1.5 border transition-all duration-150 cursor-pointer select-none bg-gradient-to-b ${pad.gradient} ${
                      isActive ? 'bg-white/[0.16] scale-[0.98]' : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    <div
                      className={`transition-transform duration-200 ${
                        isActive ? 'scale-125' : 'scale-100'
                      }`}
                      style={{ color: pad.color }}
                    >
                      <pad.icon className="w-6 h-6" />
                    </div>

                    <div className="text-center">
                      <span className="block text-xs font-extrabold text-white">
                        {pad.titleAr}
                      </span>
                      <span className="block text-[10px] text-zinc-400 font-mono">
                        {pad.titleEn}
                      </span>
                    </div>

                    <div
                      className="absolute top-2 left-2 w-2 h-2 rounded-full transition-opacity duration-200"
                      style={{
                        backgroundColor: pad.color,
                        opacity: isActive ? 1 : 0.3,
                        boxShadow: isActive ? `0 0 8px ${pad.color}` : 'none',
                      }}
                    />
                  </motion.button>
                );
              })}

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  triggerHaptic(15);
                  setPlaybackRate(1.0);
                  addToast('تمت إعادة ضبط سرعة ونغمة الـ DJ إلى 1.0x', undefined, 'info');
                }}
                className="rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1.5 border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer select-none"
              >
                <RotateCcw className="w-5 h-5 text-zinc-400" />
                <div className="text-center">
                  <span className="block text-xs font-extrabold text-white">إعادة الضبط</span>
                  <span className="block text-[10px] text-zinc-400 font-mono">1.0x Pitch</span>
                </div>
              </motion.button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#1DB954]" />
                <span className="text-xs font-bold text-white">سرعة ونغمة القرص (Turntable Pitch)</span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono font-black px-2 py-0.5 rounded-full border ${
                    playbackRate === 1.0
                      ? 'bg-white/10 text-zinc-300 border-white/10'
                      : 'bg-[#1DB954]/20 text-[#1ed760] border-[#1DB954]/30'
                  }`}
                >
                  {playbackRate.toFixed(2)}x {pitchDiffPercent !== 0 && `(${pitchDiffPercent > 0 ? '+' : ''}${pitchDiffPercent}%)`}
                </span>
                {playbackRate !== 1.0 && (
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setPlaybackRate(1.0);
                    }}
                    className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    افتراضي
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3" dir="ltr">
              <span className="text-[10px] font-mono text-zinc-500">0.5x</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.02"
                value={playbackRate}
                onChange={(e) => {
                  setPlaybackRate(parseFloat(e.target.value));
                }}
                className="flex-1 accent-[#1DB954] cursor-pointer h-2 bg-white/10 rounded-full"
              />
              <span className="text-[10px] font-mono text-zinc-500">1.5x</span>
            </div>

            <div className="flex items-center justify-between gap-1 pt-1" dir="ltr">
              {[0.8, 0.9, 1.0, 1.1, 1.25].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    triggerHaptic(10);
                    setPlaybackRate(rate);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    Math.abs(playbackRate - rate) < 0.01
                      ? 'bg-[#1DB954] text-white shadow-md shadow-[#1DB954]/30'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {rate.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">الانتقال التلقائي الذكي (AutoMix)</span>
              </div>

              <button
                onClick={() => {
                  triggerHaptic(15);
                  setAutoMix(!automixEnabled, automixDuration);
                  addToast(
                    !automixEnabled ? 'تم تفعيل الانتقال التلقائي الذكي' : 'تم تعطيل الانتقال التلقائي',
                    undefined,
                    'info'
                  );
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  automixEnabled
                    ? 'bg-purple-500/25 border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-zinc-500'
                }`}
              >
                {automixEnabled ? 'مفعّل' : 'معطّل'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {AUTOMIX_STYLES.map((style) => {
                const isSelected = automixStyle === style.id;
                const StyleIcon = style.icon;
                return (
                  <button
                    key={style.id}
                    onClick={() => {
                      triggerHaptic(15);
                      setAutomixStyle(style.id);
                      if (!automixEnabled) setAutoMix(true, automixDuration);
                    }}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-500/25 to-[#1DB954]/20 border-purple-500/50 shadow-md shadow-purple-500/20'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <StyleIcon className={`w-4 h-4 ${isSelected ? 'text-[#1ed760]' : 'text-zinc-400'}`} />
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <span className="text-xs font-bold text-white leading-tight">{style.nameAr}</span>
                    <span className="text-[10px] text-zinc-400 leading-snug line-clamp-1">{style.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Transition Duration Slider */}
            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">مدة التداخل بين الأغنيتين:</span>
                <span className="font-mono font-bold text-purple-300">{automixDuration} ثوانٍ</span>
              </div>
              <div className="flex items-center gap-3" dir="ltr">
                <span className="text-[10px] font-mono text-zinc-500">3s</span>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={automixDuration}
                  onChange={(e) => setAutoMix(automixEnabled, parseInt(e.target.value, 10))}
                  className="flex-1 accent-purple-500 cursor-pointer h-2 bg-white/10 rounded-full"
                />
                <span className="text-[10px] font-mono text-zinc-500">12s</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
