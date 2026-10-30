import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { AutoMixStyle } from '../../lib/audioEngine';
import { Sliders, X, Check, Disc, Waves, Sparkles, Zap, SlidersHorizontal, Gauge } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface TransitionOption {
  id: AutoMixStyle;
  titleAr: string;
  titleEn: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

const TRANSITION_OPTIONS: TransitionOption[] = [
  {
    id: 'crossfade',
    titleAr: 'تلاشي متوازن كلاسيكي',
    titleEn: 'Equal-Power Crossfade',
    description: 'انتقال ناعم ودقيق يحافظ على الطاقة الصوتية المستمرة بين المسارين دون أي انقطاع.',
    icon: Waves,
    badge: 'Apple Music Default',
  },
  {
    id: 'vinyl_brake',
    titleAr: 'توقف قرص الفينيل',
    titleEn: 'Vinyl Turntable Brake',
    description: 'تباطؤ فيزيائي واقعي لموتور أسطوانة الفينيل مع انخفاض النغمة ثم انطلاق فوري للأغنية الجديدة.',
    icon: Disc,
    badge: 'DJ Club Style',
  },
  {
    id: 'echo_out',
    titleAr: 'الصدى المتلاشي',
    titleEn: 'Echo Out & Reverb Tail',
    description: 'إرسال نهاية الأغنية في حلقة صدى فضائية متلاشية في الخلفية بينما تتقدم الأغنية التالية.',
    icon: Sparkles,
    badge: 'Spatial Echo',
  },
  {
    id: 'filter_sweep',
    titleAr: 'فلتر تصفية الترددات',
    titleEn: 'Resonant Filter Sweep',
    description: 'مسح رنان للترددات العالية وقص ناعم للتريبل يحاكي أشهر مكسرات مهرجانات الـ EDM.',
    icon: SlidersHorizontal,
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
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const setPlaybackRate = usePlayerStore((state) => state.setPlaybackRate);
  const addToast = usePlayerStore((state) => state.addToast);

  if (!isAutoMixModalOpen) return null;

  const handleSelectStyle = (style: AutoMixStyle) => {
    triggerHaptic('light');
    setAutomixStyle(style);
    const match = TRANSITION_OPTIONS.find((t) => t.id === style);
    addToast(`تم اختيار نمط الانتقال: ${match?.titleAr || style}`, undefined, 'success');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 select-none">
        {/* Backdrop dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setAutoMixModalOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Unified iOS Bottom Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 90 || info.velocity.y > 350) {
              setAutoMixModalOpen(false);
            }
          }}
          style={{ touchAction: 'pan-y' }}
          className="fixed bottom-0 inset-x-0 z-50 max-h-[85dvh] rounded-t-[32px] bg-[#101018] border-t border-white/10 flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,16px)] shadow-2xl"
        >
          {/* Unified Grab Handle */}
          <div
            onClick={() => setAutoMixModalOpen(false)}
            className="w-10 h-1.5 rounded-full bg-white/25 mx-auto mt-3 mb-2 shrink-0 cursor-pointer"
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FA243C]/15 border border-[#FA243C]/30 flex items-center justify-center text-[#FA243C]">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>أنماط انتقال AutoMix والسرعة</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FA243C]/20 text-[#FF375F] border border-[#FA243C]/30 font-mono">
                    PRO DJ
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium">
                  الدمج التلقائي والتحكم السريع في سرعة التشغيل
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAutoMixModalOpen(false)}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* 1. Quick Playback Speed Controls */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>سرعة التشغيل (Playback Speed):</span>
                </span>
                <span className="text-[#FF375F] font-mono font-bold bg-[#FA243C]/15 px-2 py-0.5 rounded-lg border border-[#FA243C]/30">
                  {playbackRate}x
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { rate: 0.85, label: '0.85x Slowed' },
                  { rate: 1.0, label: '1.0x Normal' },
                  { rate: 1.15, label: '1.15x Sped Up' },
                ].map((item) => (
                  <button
                    key={item.rate}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setPlaybackRate(item.rate);
                      addToast(`سرعة التشغيل: ${item.rate}x`, undefined, 'info');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer active:scale-95 ${
                      playbackRate === item.rate
                        ? 'bg-[#FA243C] text-white border-[#FA243C] shadow-[0_2px_12px_rgba(250,36,60,0.4)]'
                        : 'bg-white/[0.05] text-zinc-300 border-white/[0.08] hover:bg-white/[0.1]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Master Enable / Disable Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">تفعيل ميزة الـ AutoMix</h4>
                  <p className="text-[11px] text-zinc-400">انتقال سلس ومدمج بدون أي صمت بين الأغاني</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoMix(!automixEnabled)}
                className={`relative w-12 h-6.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                  automixEnabled ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5.5 h-5.5 rounded-full bg-white transition-transform ${
                    automixEnabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Transition Duration Slider */}
            {automixEnabled && (
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-semibold">مدة الانتقال والخلط:</span>
                  <span className="text-[#FF375F] font-mono font-bold bg-[#FA243C]/15 px-2 py-0.5 rounded-lg border border-[#FA243C]/30">
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

            {/* 4. Transition Style Cards */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                أنماط الانتقال المتاحة:
              </span>
              {TRANSITION_OPTIONS.map((opt) => {
                const isSelected = automixStyle === opt.id;
                const OptIcon = opt.icon;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectStyle(opt.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[#FA243C]/15 border-[#FA243C]/40 shadow-lg shadow-[#FA243C]/10'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 ${isSelected ? 'bg-gradient-to-tr from-[#FA243C] to-[#FF375F] text-white shadow-sm' : 'bg-white/[0.06] text-zinc-400'}`}>
                        <OptIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
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
                          ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] border-transparent text-white shadow-sm'
                          : 'border-white/20 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="p-4 border-t border-white/[0.08] shrink-0">
            <button
              type="button"
              onClick={() => {
                const store = usePlayerStore.getState();
                if (!store.currentTrack) {
                  store.addToast('شغّل أي أغنية أولاً لتجربة الانتقال الفوري', undefined, 'info');
                  return;
                }
                store.addToast(`جارٍ تنفيذ انتقال ${TRANSITION_OPTIONS.find((t) => t.id === automixStyle)?.titleAr || ''} الآن`, undefined, 'info');
                store.nextTrack({ forceImmediate: true });
                setAutoMixModalOpen(false);
              }}
              className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(250,36,60,0.4)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>تجربة انتقال فوري بهذا النمط الآن</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
