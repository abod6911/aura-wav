import React from 'react';
import { usePlayerStore, EQ_PRESETS } from '../store/usePlayerStore';
import { EQ_BANDS } from '../lib/audioEngine';
import { AudioVisualizer } from './AudioVisualizer';
import {
  X,
  Sliders,
  Disc,
  Sparkles,
  Headphones,
  Volume2,
  Mic,
  Zap,
  Flame,
  Radio,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_ICONS: { [key: string]: React.ReactNode } = {
  'Flat': <Headphones className="w-3.5 h-3.5" />,
  'Bass Boost': <Volume2 className="w-3.5 h-3.5" />,
  'Vocal / Acoustic': <Mic className="w-3.5 h-3.5" />,
  'Electronic / EDM': <Zap className="w-3.5 h-3.5" />,
  'Rock / Metal': <Flame className="w-3.5 h-3.5" />,
  'Hip Hop / R&B': <Radio className="w-3.5 h-3.5" />,
};

export const EqualizerModal: React.FC = () => {
  const isEqualizerOpen = usePlayerStore((state) => state.isEqualizerOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);

  const eqGains = usePlayerStore((state) => state.eqGains);
  const setEqGain = usePlayerStore((state) => state.setEqGain);
  const activeEqPreset = usePlayerStore((state) => state.activeEqPreset);
  const applyEqPreset = usePlayerStore((state) => state.applyEqPreset);
  const bassBoost = usePlayerStore((state) => state.bassBoost);
  const setBassBoost = usePlayerStore((state) => state.setBassBoost);

  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);
  const setAutoMix = usePlayerStore((state) => state.setAutoMix);

  if (!isEqualizerOpen) return null;

  // Compute SVG Bézier curve points for the interactive frequency response curve
  const points = eqGains.map((gain, idx) => {
    const x = 10 + idx * 20; // 10%, 30%, 50%, 70%, 90%
    const y = 50 - (gain / 15) * 38; // 50% is 0dB, bounded between 12% and 88%
    return { x, y };
  });

  // Generate smooth cubic bezier SVG path
  let pathD = `M 0,${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i === 0) {
      pathD += ` L ${p.x},${p.y}`;
    } else {
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      pathD += ` C ${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
    }
  }
  pathD += ` L 100,${points[points.length - 1].y}`;

  const fillD = `${pathD} L 100,95 L 0,95 Z`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl select-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-[#09090e]/95 border border-white/[0.1] rounded-3xl p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-5 relative overflow-hidden my-auto"
        >
          {/* Top Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#FA243C]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#FA243C]/15 border border-[#FA243C]/25 text-[#FA243C]">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>المعادل الصوتي و DJ AutoMix</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">تحكم احترافي بالترددات والدمج التلقائي</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => applyEqPreset(EQ_PRESETS[0])}
                title="إعادة ضبط المعادل"
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setEqualizerOpen(false)}
                className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* DJ AutoMix Section */}
          <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.08] bg-white/[0.025] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#FA243C]/15 border border-[#FA243C]/25 text-[#FF2D55]">
                  <Disc className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    <span>True DJ AutoMix (الدمج التلقائي)</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FA243C]/20 text-[10px] text-[#FF456E] font-bold border border-[#FA243C]/30">
                      EQUAL-POWER
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5 max-w-md">
                    انتقال متداخل وسلس (Logarithmic Crossfade) يضمن تدفق الموسيقى بدون أي هبوط في مستوى الصوت.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => setAutoMix(!automixEnabled)}
                className={`w-13 h-7 rounded-full p-1 transition-colors relative flex items-center cursor-pointer shadow-inner ${
                  automixEnabled ? 'bg-[#FA243C] shadow-[#FA243C]/30' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    automixEnabled ? 'translate-x-0' : '-translate-x-6'
                  }`}
                />
              </button>
            </div>

            {automixEnabled && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-medium">مدة الانتقال التدريجي (Crossfade):</span>
                  <span className="text-[#FF456E] font-bold font-mono px-2 py-0.5 rounded-md bg-[#FA243C]/15 border border-[#FA243C]/20">
                    {automixDuration} ثوانٍ
                  </span>
                </div>

                {/* Slider in strict LTR so Left = 2s, Right = 10s */}
                <div dir="ltr" className="space-y-1">
                  <input
                    type="range"
                    min={2}
                    max={10}
                    step={1}
                    value={automixDuration}
                    onChange={(e) => setAutoMix(true, parseInt(e.target.value, 10))}
                    className="w-full accent-[#FA243C] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-medium text-zinc-500">
                    <span>سريع (2s)</span>
                    <span>متوازن (5s)</span>
                    <span>سلس وطويل (10s)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mega Bass Boost Section */}
          <div className="rounded-2xl p-4 sm:p-5 border border-[#FA243C]/20 bg-gradient-to-r from-[#FA243C]/10 via-[#FF2D55]/5 to-black/40 relative overflow-hidden space-y-3">
            {/* Bass Ambient Glow */}
            <div
              className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#FA243C]/20 blur-2xl pointer-events-none transition-opacity duration-300"
              style={{ opacity: bassBoost > 0 ? 0.3 + (bassBoost / 18) * 0.7 : 0 }}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border transition-all duration-300 ${
                    bassBoost > 0
                      ? 'bg-[#FA243C]/20 border-[#FA243C]/40 text-[#FA243C] shadow-[0_0_16px_rgba(250,36,60,0.4)]'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                  }`}
                >
                  <Volume2 className={`w-5 h-5 ${bassBoost > 8 ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    <span>مضخم البيس الخارق (Mega Bass Boost)</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        bassBoost > 0
                          ? 'bg-[#FA243C]/25 text-[#FF456E] border-[#FA243C]/40'
                          : 'bg-white/[0.05] text-zinc-500 border-white/[0.05]'
                      }`}
                    >
                      {bassBoost > 0 ? `+${bassBoost}dB` : '0dB'}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    تعزيز الترددات تحت المنخفضة (80Hz) مع تقنية تقليل التشويه الرقمي (Studio Limiter).
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                {[
                  { label: '0dB', val: 0 },
                  { label: '+6dB', val: 6 },
                  { label: '+12dB', val: 12 },
                  { label: '+18dB MAX', val: 18 },
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setBassBoost(p.val)}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      bassBoost === p.val
                        ? 'bg-[#FA243C] text-white shadow-lg shadow-[#FA243C]/30'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Continuous Slider in Strict LTR */}
            <div dir="ltr" className="pt-1 space-y-1">
              <input
                type="range"
                min={0}
                max={18}
                step={0.5}
                value={bassBoost}
                onChange={(e) => setBassBoost(parseFloat(e.target.value))}
                className="w-full accent-[#FA243C] cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>طبيعي (0dB)</span>
                <span>متوسط (+6dB)</span>
                <span>عميق (+12dB)</span>
                <span className="text-[#FF456E] font-bold">زلزال (+18dB)</span>
              </div>
            </div>
          </div>

          {/* Presets Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FA243C]" />
              <span>الأوضاع الجاهزة (Presets):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EQ_PRESETS.map((preset) => {
                const isActive = activeEqPreset === preset.name;
                return (
                  <button
                    key={preset.name}
                    onClick={() => applyEqPreset(preset)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)] scale-[1.02]'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.05]'
                    }`}
                  >
                    <span>{PRESET_ICONS[preset.name] || <Headphones className="w-3.5 h-3.5" />}</span>
                    <span>{preset.nameAr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5-Band Studio Equalizer & Live Curve */}
          <div className="rounded-2xl p-4 sm:p-5 bg-white/[0.025] border border-white/[0.08] space-y-4">
            {/* Live Studio Frequency Response Curve */}
            <div className="relative w-full h-20 bg-black/40 rounded-xl border border-white/[0.06] overflow-hidden">
              {/* Reference Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between py-2 px-3 pointer-events-none opacity-30 text-[9px] font-mono text-zinc-400">
                <div className="border-b border-dashed border-white/20 pb-0.5">+12dB</div>
                <div className="border-b border-white/30 pb-0.5 text-[#FF456E]">0dB (Flat)</div>
                <div className="border-t border-dashed border-white/20 pt-0.5">-12dB</div>
              </div>

              {/* SVG Spline Curve */}
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FA243C" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FF2D55" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="eqStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FA243C" />
                    <stop offset="50%" stopColor="#FF2D55" />
                    <stop offset="100%" stopColor="#FF5E7E" />
                  </linearGradient>
                </defs>
                <path d={fillD} fill="url(#eqFill)" />
                <path d={pathD} fill="none" stroke="url(#eqStroke)" strokeWidth="2.5" strokeLinecap="round" />
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#ffffff" stroke="#FA243C" strokeWidth="1" />
                ))}
              </svg>
            </div>

            {/* 5 Vertical Sliders in Strict LTR */}
            <div
              dir="ltr"
              className="grid grid-cols-5 gap-2 sm:gap-4 items-center h-44 px-1 sm:px-4"
            >
              {EQ_BANDS.map((band, idx) => {
                const gain = eqGains[idx];
                const isBoost = gain > 0;
                const isCut = gain < 0;

                return (
                  <div key={band.freq} className="flex flex-col items-center h-full justify-between group">
                    {/* Gain dB Badge */}
                    <span
                      className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md tabular-nums transition-colors ${
                        isBoost
                          ? 'text-[#FF456E] bg-[#FA243C]/20 border border-[#FA243C]/30'
                          : isCut
                          ? 'text-pink-300 bg-pink-500/20 border border-pink-500/30'
                          : 'text-zinc-500 bg-white/[0.04]'
                      }`}
                    >
                      {gain > 0 ? `+${gain}` : gain}dB
                    </span>

                    {/* Vertical Slider with Double-Click to Reset */}
                    <div
                      onDoubleClick={() => setEqGain(idx, 0)}
                      title="اسحب للتعديل، اضغط مرتين للعودة إلى 0dB"
                      className="relative flex items-center justify-center flex-1 my-1.5 cursor-pointer"
                    >
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={gain}
                        onChange={(e) => setEqGain(idx, parseFloat(e.target.value))}
                        className="accent-[#FA243C] cursor-pointer -rotate-90 w-24 sm:w-28 origin-center"
                      />
                    </div>

                    {/* Band Label */}
                    <div className="text-center">
                      <span className="text-xs font-bold text-white block">
                        {band.label.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-medium block">
                        {band.label.split(' ')[1]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-Time Studio Visualizer Preview */}
            <div className="h-10 pt-2 border-t border-white/[0.06]">
              <AudioVisualizer height={32} bars={48} mode="bars" />
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-500">
              اضغط نقراً مزدوجاً على أي شريط لإعادته فوراً إلى 0dB
            </span>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setEqualizerOpen(false)}
              className="px-8 py-2.5 rounded-2xl bg-white text-black hover:bg-zinc-200 font-bold transition-all shadow-[0_4px_20px_rgba(255,255,255,0.2)] text-xs sm:text-sm cursor-pointer"
            >
              تم والحفظ
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
