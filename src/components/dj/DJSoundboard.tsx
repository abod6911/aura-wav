import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Sparkles, X, Disc, Volume2, Flame, Sliders, Zap, Activity, Radio, SlidersHorizontal } from 'lucide-react';

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

export const DJSoundboard: React.FC = () => {
  const isSoundboardOpen = usePlayerStore((state) => state.isSoundboardOpen);
  const setSoundboardOpen = usePlayerStore((state) => state.setSoundboardOpen);
  const playDJSound = usePlayerStore((state) => state.playDJSound);
  const automixStyle = usePlayerStore((state) => state.automixStyle);
  const setAutoMixModalOpen = usePlayerStore((state) => state.setAutoMixModalOpen);

  const [activePad, setActivePad] = useState<string | null>(null);

  if (!isSoundboardOpen) return null;

  const triggerPad = (pad: SoundPad) => {
    setActivePad(pad.id);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
    playDJSound(pad.id);
    setTimeout(() => {
      setActivePad((curr) => (curr === pad.id ? null : curr));
    }, 350);
  };

  const getStyleLabel = () => {
    switch (automixStyle) {
      case 'vinyl_brake':
        return 'توقف الفينيل (Vinyl Brake)';
      case 'echo_out':
        return 'الصدى المتلاشي (Echo Out)';
      case 'filter_sweep':
        return 'فلتر الترددات (Filter Sweep)';
      case 'crossfade':
      default:
        return 'تلاشي كلاسيكي (Crossfade)';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xl">
        {/* Backdrop dismiss */}
        <div
          onClick={() => setSoundboardOpen(false)}
          className="absolute inset-0 cursor-pointer"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          style={{ touchAction: 'manipulation' }}
          className="relative w-full max-w-lg bg-[#0c0c14]/95 border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden p-5 sm:p-6 space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center text-[#1DB954]">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>لوحة مؤثرات الـ DJ الحية</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1ed760] border border-[#1DB954]/30 font-mono">
                    LIVE
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium">
                  مؤثرات فورية حية تعمل في نفس الوقت مع تشغيل أغانيك بدون إنترنت
                </p>
              </div>
            </div>

            <button
              onClick={() => setSoundboardOpen(false)}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 5 High-Energy DJ Pads */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                  className={`relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border transition-all duration-150 cursor-pointer select-none bg-gradient-to-b ${pad.gradient} ${
                    isActive ? 'bg-white/[0.15] scale-[0.98]' : 'hover:bg-white/[0.06]'
                  }`}
                >
                  {/* Glowing LED Icon */}
                  <div
                    className={`transition-transform duration-200 ${
                      isActive ? 'scale-125' : 'scale-100'
                    }`}
                    style={{ color: pad.color }}
                  >
                    <pad.icon className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>

                  <div className="text-center">
                    <span className="block text-xs sm:text-sm font-extrabold text-white">
                      {pad.titleAr}
                    </span>
                    <span className="block text-[10px] text-zinc-400 font-mono mt-0.5">
                      {pad.titleEn}
                    </span>
                  </div>

                  {/* Corner Live Indicator dot */}
                  <div
                    className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full transition-opacity duration-200"
                    style={{
                      backgroundColor: pad.color,
                      opacity: isActive ? 1 : 0.35,
                      boxShadow: isActive ? `0 0 8px ${pad.color}` : 'none',
                    }}
                  />
                </motion.button>
              );
            })}

            {/* Quick AutoMix Transition Settings Tile */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setSoundboardOpen(false);
                setAutoMixModalOpen(true);
              }}
              style={{ touchAction: 'manipulation' }}
              className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer select-none"
            >
              <SlidersHorizontal className="w-6 h-6 text-[#1DB954]" />
              <div className="text-center">
                <span className="block text-xs sm:text-sm font-extrabold text-white">
                  نمط الانتقال
                </span>
                <span className="block text-[10px] text-[#1ed760] font-medium mt-0.5">
                  {getStyleLabel()}
                </span>
              </div>
            </motion.button>
          </div>

          {/* Footer Quick Tip */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>يمكنك الضغط على أكثر من مؤثر معاً أثناء التشغيل</span>
            </span>
            <button
              onClick={() => {
                setSoundboardOpen(false);
                setAutoMixModalOpen(true);
              }}
              className="text-[#1ed760] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>تغيير نمط الانتقال</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
