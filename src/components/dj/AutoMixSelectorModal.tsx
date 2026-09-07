import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AutoMixStyle } from '../../lib/audioEngine';
import { Sliders, X, Check, Disc, Waves, Sparkles, Radio, Zap } from 'lucide-react';

interface TransitionOption {
  id: AutoMixStyle;
  titleAr: string;
  titleEn: string;
  description: string;
  icon: string;
  badge: string;
}

const TRANSITION_OPTIONS: TransitionOption[] = [
  {
    id: 'crossfade',
    titleAr: 'تلاشي متوازن كلاسيكي',
    titleEn: 'Equal-Power Crossfade',
    description: 'انتقال ناعم ودقيق يحافظ على الطاقة الصوتية المستمرة بين المسارين دون أي انقطاع.',
    icon: '🌊',
    badge: 'Apple Music Default',
  },
  {
    id: 'vinyl_brake',
    titleAr: 'توقف قرص الفينيل',
    titleEn: 'Vinyl Turntable Brake',
    description: 'تباطؤ فيزيائي واقعي لموتور أسطوانة الفينيل مع انخفاض النغمة ثم انطلاق فوري للأغنية الجديدة.',
    icon: '💽',
    badge: 'DJ Club Style',
  },
  {
    id: 'echo_out',
    titleAr: 'الصدى المتلاشي',
    titleEn: 'Echo Out & Reverb Tail',
    description: 'إرسال نهاية الأغنية في حلقة صدى فضائية متلاشية في الخلفية بينما تتقدم الأغنية التالية.',
    icon: '🌌',
    badge: 'Spacial Echo',
  },
  {
    id: 'filter_sweep',
    titleAr: 'فلتر تصفية الترددات',
    titleEn: 'Resonant Filter Sweep',
    description: 'مسح رنان للترددات العالية وقص ناعم للتريبل يحاكي أشهر مكسرات مهرجانات الـ EDM.',
    icon: '🎚️',
    badge: 'Pioneer Pro DJ',
  },
];

export const AutoMixSelectorModal: React.FC = () => {
  const isAutoMixModalOpen = usePlayerStore((state) => state.isAutoMixModalOpen);
  const setAutoMixModalOpen = usePlayerStore((state) => state.setAutoMixModalOpen);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);
  const automixStyle = usePlayerStore((state) => state.automixStyle);
  const setAutoMix = usePlayerStore((state) => state.setAutoMix);
  const setAutomixStyle = usePlayerStore((state) => state.setAutomixStyle);
  const addToast = usePlayerStore((state) => state.addToast);

  if (!isAutoMixModalOpen) return null;

  const handleSelectStyle = (style: AutoMixStyle) => {
    setAutomixStyle(style);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
    const match = TRANSITION_OPTIONS.find((t) => t.id === style);
    addToast(`تم اختيار نمط الانتقال: ${match?.titleAr || style}`, '🎛️', 'success');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl select-none">
        {/* Backdrop dismiss */}
        <div
          onClick={() => setAutoMixModalOpen(false)}
          className="absolute inset-0 cursor-pointer"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          style={{ touchAction: 'manipulation' }}
          className="relative w-full max-w-lg bg-[#0d0d15]/95 border border-white/[0.12] rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden p-5 sm:p-6 space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#FA243C]/20 border border-[#FA243C]/40 flex items-center justify-center text-[#FA243C]">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>أنماط انتقال الـ AutoMix الذكي</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FA243C]/20 text-[#FF456E] border border-[#FA243C]/30 font-mono">
                    PRO DJ
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium">
                  اختر الطريقة التي تفضل أن تنتقل بها الأغاني بين بعضها البعض
                </p>
              </div>
            </div>

            <button
              onClick={() => setAutoMixModalOpen(false)}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Master Enable / Disable Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎛️</span>
              <div>
                <h4 className="text-sm font-bold text-white">تفعيل ميزة الـ AutoMix</h4>
                <p className="text-[11px] text-zinc-400">انتقال سلس ومدمج بدون أي صمت بين الأغاني</p>
              </div>
            </div>

            <button
              onClick={() => setAutoMix(!automixEnabled)}
              className={`relative w-12 h-6.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                automixEnabled ? 'bg-[#FA243C]' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5.5 h-5.5 rounded-full bg-white transition-transform ${
                  automixEnabled ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Transition Duration Slider */}
          {automixEnabled && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-semibold">مدة الانتقال والخلط:</span>
                <span className="text-[#FF456E] font-mono font-bold bg-[#FA243C]/15 px-2 py-0.5 rounded-lg border border-[#FA243C]/30">
                  {automixDuration} ثوانٍ
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={12}
                step={1}
                value={automixDuration}
                onChange={(e) => setAutoMix(true, Number(e.target.value))}
                className="w-full accent-[#FA243C] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>سريع (2s)</span>
                <span>متوسط (5s)</span>
                <span>طويل (12s)</span>
              </div>
            </div>
          )}

          {/* 4 Transition Style Cards */}
          <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1">
            {TRANSITION_OPTIONS.map((opt) => {
              const isSelected = automixStyle === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectStyle(opt.id)}
                  style={{ touchAction: 'manipulation' }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#FA243C]/15 border-[#FA243C]/40 shadow-lg shadow-[#FA243C]/10'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{opt.icon}</span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-xs sm:text-sm font-bold ${
                            isSelected ? 'text-white' : 'text-zinc-200'
                          }`}
                        >
                          {opt.titleAr}
                        </h4>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-mono">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                      isSelected
                        ? 'bg-[#FA243C] border-[#FA243C] text-white'
                        : 'border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test Transition Now Button */}
          <div className="pt-2 border-t border-white/[0.08]">
            <button
              onClick={() => {
                const store = usePlayerStore.getState();
                if (!store.currentTrack) {
                  store.addToast('شغّل أي أغنية أولاً لتجربة الانتقال الفوري 🎵', '🎵', 'info');
                  return;
                }
                store.addToast(`جارٍ تنفيذ انتقال ${TRANSITION_OPTIONS.find((t) => t.id === automixStyle)?.titleAr || ''} الآن ⚡`, '🎛️', 'info');
                store.nextTrack(false);
                setAutoMixModalOpen(false);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FA243C] to-[#FF2D55] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FA243C]/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>تجربة انتقال فوري بهذا النمط الآن ⚡</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
