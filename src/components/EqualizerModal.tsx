import React, { useState } from 'react';
import { usePlayerStore, EQ_PRESETS } from '../store/usePlayerStore';
import { EQ_BANDS, ReverbSpace } from '../lib/audioEngine';
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
  Waves,
  Gauge,
  MicOff,
  Car,
  Building2,
  Smartphone,
  Eye,
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

const REVERB_SPACES: {
  id: ReverbSpace;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'off',
    title: 'مباشر (Studio Direct)',
    subtitle: 'بدون أي صدى أو معالجة انعكاسات مكانية',
    badge: 'DIRECT',
    icon: <Headphones className="w-4 h-4" />,
  },
  {
    id: 'studio',
    title: 'استوديو صوتي (Acoustic Studio)',
    subtitle: 'غرفة عازلة مع انعكاسات أولية محكمة (0.6s)',
    badge: '0.6s DRY',
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    id: 'arena',
    title: 'صالة حفلات (Live Arena)',
    subtitle: 'فضاء ضخم بصدى كونسرت عميق وممتد (3.2s)',
    badge: '3.2s CONCERT',
    icon: <Waves className="w-4 h-4" />,
  },
  {
    id: 'car',
    title: 'سيارة فاخرة (Luxury Car Cabin)',
    subtitle: 'مقصورة مركبة صوتية مع انعكاسات قريبة ومكثفة',
    badge: '0.35s CABIN',
    icon: <Car className="w-4 h-4" />,
  },
  {
    id: 'vinyl_lounge',
    title: 'صالون الفينيل (Vinyl Lounge)',
    subtitle: 'مساحة حميمية دافئة مع امتصاص الترددات الخشنة',
    badge: '1.4s VINTAGE',
    icon: <Disc className="w-4 h-4" />,
  },
];

export const EqualizerModal: React.FC = () => {
  const [modalTab, setModalTab] = useState<'eq' | 'pro_dsp'>('eq');

  const isEqualizerOpen = usePlayerStore((state) => state.isEqualizerOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);

  // Equalizer & AutoMix
  const eqGains = usePlayerStore((state) => state.eqGains);
  const setEqGain = usePlayerStore((state) => state.setEqGain);
  const activeEqPreset = usePlayerStore((state) => state.activeEqPreset);
  const applyEqPreset = usePlayerStore((state) => state.applyEqPreset);
  const bassBoost = usePlayerStore((state) => state.bassBoost);
  const setBassBoost = usePlayerStore((state) => state.setBassBoost);
  const automixEnabled = usePlayerStore((state) => state.automixEnabled);
  const automixDuration = usePlayerStore((state) => state.automixDuration);
  const setAutoMix = usePlayerStore((state) => state.setAutoMix);

  // Pro DSP States & Actions
  const loudnessNormalization = usePlayerStore((state) => state.loudnessNormalization);
  const setLoudnessNormalization = usePlayerStore((state) => state.setLoudnessNormalization);
  const analogWarmth = usePlayerStore((state) => state.analogWarmth);
  const setAnalogWarmth = usePlayerStore((state) => state.setAnalogWarmth);
  const karaokeMode = usePlayerStore((state) => state.karaokeMode);
  const setKaraokeMode = usePlayerStore((state) => state.setKaraokeMode);
  const reverbSpace = usePlayerStore((state) => state.reverbSpace);
  const setReverbSpace = usePlayerStore((state) => state.setReverbSpace);
  const hapticFeedbackEnabled = usePlayerStore((state) => state.hapticFeedbackEnabled);
  const setHapticFeedbackEnabled = usePlayerStore((state) => state.setHapticFeedbackEnabled);
  const reactiveVisualsEnabled = usePlayerStore((state) => state.reactiveVisualsEnabled);
  const setReactiveVisualsEnabled = usePlayerStore((state) => state.setReactiveVisualsEnabled);

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
          className="w-full max-w-2xl bg-[#09090e]/95 border border-white/[0.1] rounded-3xl p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-5 relative overflow-hidden my-auto max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
        >
          {/* Top Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/25 text-[#1DB954]">
                {modalTab === 'eq' ? <Sliders className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>
                    {modalTab === 'eq' ? 'المعادل الصوتي و AutoMix' : 'مؤثرات الاستوديو (Pro Web Audio DSP)'}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {modalTab === 'eq'
                    ? 'تحكم دقيق بالترددات والدمج التلقائي'
                    : 'معالجة إشارة رقمية متقدمة: دفء أنبوبي، بيئات 3D، وعزل المغني'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {modalTab === 'eq' && (
                <button
                  onClick={() => applyEqPreset(EQ_PRESETS[0])}
                  title="إعادة ضبط المعادل"
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
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

          {/* Navigation Tab Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.06]">
            <button
              onClick={() => setModalTab('eq')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                modalTab === 'eq'
                  ? 'bg-[#1DB954] text-black shadow-[0_2px_12px_rgba(29,185,84,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>المعادل الصوتي و AutoMix</span>
            </button>
            <button
              onClick={() => setModalTab('pro_dsp')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                modalTab === 'pro_dsp'
                  ? 'bg-[#1DB954] text-black shadow-[0_2px_12px_rgba(29,185,84,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>مؤثرات الاستوديو (Pro DSP)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/30 text-[9px] font-mono font-bold">
                PRO
              </span>
            </button>
          </div>

          {/* TAB 1: EQUALIZER & AUTOMIX */}
          {modalTab === 'eq' && (
            <div className="space-y-4">
              {/* DJ AutoMix Section */}
              <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.08] bg-white/[0.025] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/25 text-[#10B981]">
                      <Disc className="w-5 h-5 animate-spin-slow" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                        <span>True DJ AutoMix (الدمج التلقائي)</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[10px] text-[#1ed760] font-bold border border-[#1DB954]/30">
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
                      automixEnabled ? 'bg-[#1DB954] shadow-[#1DB954]/30' : 'bg-white/10'
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
                      <span className="text-[#1ed760] font-bold font-mono px-2 py-0.5 rounded-md bg-[#1DB954]/15 border border-[#1DB954]/20">
                        {automixDuration} ثوانٍ
                      </span>
                    </div>

                    <div dir="ltr" className="space-y-1">
                      <input
                        type="range"
                        min={2}
                        max={10}
                        step={1}
                        value={automixDuration}
                        onChange={(e) => setAutoMix(true, parseInt(e.target.value, 10))}
                        className="w-full accent-[#1DB954] cursor-pointer"
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
              <div className="rounded-2xl p-4 sm:p-5 border border-[#1DB954]/20 bg-gradient-to-r from-[#1DB954]/10 via-[#10B981]/5 to-black/40 relative overflow-hidden space-y-3">
                <div
                  className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#1DB954]/20 blur-2xl pointer-events-none transition-opacity duration-300"
                  style={{ opacity: bassBoost > 0 ? 0.3 + (bassBoost / 18) * 0.7 : 0 }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border transition-all duration-300 ${
                        bassBoost > 0
                          ? 'bg-[#1DB954]/20 border-[#1DB954]/40 text-[#1DB954] shadow-[0_0_16px_rgba(29,185,84,0.4)]'
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
                              ? 'bg-[#1DB954]/25 text-[#1ed760] border-[#1DB954]/40'
                              : 'bg-white/[0.05] text-zinc-500 border-white/[0.05]'
                          }`}
                        >
                          {bassBoost > 0 ? `+${bassBoost}dB` : '0dB'}
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        تعزيز الترددات تحت المنخفضة (80Hz) مع حماية ضد التشويش (Studio Limiter).
                      </p>
                    </div>
                  </div>

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
                            ? 'bg-[#1DB954] text-white shadow-lg shadow-[#1DB954]/30'
                            : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div dir="ltr" className="pt-1 space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={18}
                    step={0.5}
                    value={bassBoost}
                    onChange={(e) => setBassBoost(parseFloat(e.target.value))}
                    className="w-full accent-[#1DB954] cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>طبيعي (0dB)</span>
                    <span>متوسط (+6dB)</span>
                    <span>عميق (+12dB)</span>
                    <span className="text-[#1ed760] font-bold">زلزال (+18dB)</span>
                  </div>
                </div>
              </div>

              {/* Presets Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
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
                <div className="relative w-full h-20 bg-black/40 rounded-xl border border-white/[0.06] overflow-hidden">
                  <div className="absolute inset-0 flex flex-col justify-between py-2 px-3 pointer-events-none opacity-30 text-[9px] font-mono text-zinc-400">
                    <div className="border-b border-dashed border-white/20 pb-0.5">+12dB</div>
                    <div className="border-b border-white/30 pb-0.5 text-[#1ed760]">0dB (Flat)</div>
                    <div className="border-t border-dashed border-white/20 pt-0.5">-12dB</div>
                  </div>

                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1DB954" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="eqStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1DB954" />
                        <stop offset="50%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                    <path d={fillD} fill="url(#eqFill)" />
                    <path d={pathD} fill="none" stroke="url(#eqStroke)" strokeWidth="2.5" strokeLinecap="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#ffffff" stroke="#1DB954" strokeWidth="1" />
                    ))}
                  </svg>
                </div>

                <div dir="ltr" className="grid grid-cols-5 gap-2 sm:gap-4 items-center h-44 px-1 sm:px-4">
                  {EQ_BANDS.map((band, idx) => {
                    const gain = eqGains[idx];
                    const isBoost = gain > 0;
                    const isCut = gain < 0;

                    return (
                      <div key={band.freq} className="flex flex-col items-center h-full justify-between group">
                        <span
                          className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md tabular-nums transition-colors ${
                            isBoost
                              ? 'text-[#1ed760] bg-[#1DB954]/20 border border-[#1DB954]/30'
                              : isCut
                              ? 'text-pink-300 bg-pink-500/20 border border-pink-500/30'
                              : 'text-zinc-500 bg-white/[0.04]'
                          }`}
                        >
                          {gain > 0 ? `+${gain}` : gain}dB
                        </span>

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
                            className="accent-[#1DB954] cursor-pointer -rotate-90 w-24 sm:w-28 origin-center"
                          />
                        </div>

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

                <div className="h-10 pt-2 border-t border-white/[0.06]">
                  <AudioVisualizer height={32} bars={48} mode="bars" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRO STUDIO DSP */}
          {modalTab === 'pro_dsp' && (
            <div className="space-y-4">
              {/* 1. Smart Loudness Normalization */}
              <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.08] bg-white/[0.025] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                        <span>تطبيع مستوى الصوت الذكي (Smart Loudness)</span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[10px] text-cyan-300 font-bold border border-cyan-500/30">
                          EBU R128
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5 max-w-md">
                        يوحد مستوى الطاقة الصوتية تلقائياً لمنع قفزات الصوت المفاجئة بين المسارات مع حماية ضد الـ Clipping.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setLoudnessNormalization(!loudnessNormalization)}
                    className={`w-13 h-7 rounded-full p-1 transition-colors relative flex items-center cursor-pointer shadow-inner ${
                      loudnessNormalization ? 'bg-cyan-500 shadow-cyan-500/30' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        loudnessNormalization ? 'translate-x-0' : '-translate-x-6'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 2. Analog Tape & Tube Warmth */}
              <div className="rounded-2xl p-4 sm:p-5 border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-black/40 space-y-3 relative overflow-hidden">
                <div
                  className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none transition-opacity duration-300"
                  style={{ opacity: analogWarmth > 0 ? 0.3 + (analogWarmth / 100) * 0.7 : 0 }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border transition-all duration-300 ${
                        analogWarmth > 0
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                          : 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                      }`}
                    >
                      <Flame className={`w-5 h-5 ${analogWarmth > 40 ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                        <span>الدفء التناظري والتشبع الكلاسيكي (Tape & Tube Warmth)</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            analogWarmth > 0
                              ? 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                              : 'bg-white/[0.05] text-zinc-500 border-white/[0.05]'
                          }`}
                        >
                          {analogWarmth > 0 ? `${analogWarmth}%` : 'OFF'}
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        تشبع هرموني لطيف (Harmonic Saturation) يحاكي أجهزة الفينيل وأشرطة الكاسيت الكلاسيكية.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {[
                      { label: 'نقي (0%)', val: 0 },
                      { label: 'دافئ (30%)', val: 30 },
                      { label: 'غني (60%)', val: 60 },
                      { label: 'أنبوبي (90%)', val: 90 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        onClick={() => setAnalogWarmth(p.val)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          analogWarmth === p.val
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                            : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div dir="ltr" className="pt-1 space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={analogWarmth}
                    onChange={(e) => setAnalogWarmth(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>صوت رقمي نقي (0%)</span>
                    <span>دفء لطيف (30%)</span>
                    <span>تشبع متوازن (60%)</span>
                    <span className="text-amber-400 font-bold">Vintage Tube (100%)</span>
                  </div>
                </div>
              </div>

              {/* 3. Instant Karaoke / Vocal Remover */}
              <div className="rounded-2xl p-4 sm:p-5 border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-black/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border transition-all duration-300 ${
                        karaokeMode
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_16px_rgba(168,85,247,0.35)]'
                          : 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                      }`}
                    >
                      {karaokeMode ? <MicOff className="w-5 h-5 text-purple-300" /> : <Mic className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                        <span>وضع الكاريوكي وعزل صوت المغني (Vocal Cut)</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] text-purple-300 font-bold border border-purple-500/30">
                          MID-SIDE SUBTRACTION
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5 max-w-md">
                        طرح إشارة الوسط لعزل المغني لحظياً مع بقاء الآلات وإيقاع البيز السريع (&lt;180Hz) كاملاً.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setKaraokeMode(!karaokeMode)}
                    className={`w-13 h-7 rounded-full p-1 transition-colors relative flex items-center cursor-pointer shadow-inner ${
                      karaokeMode ? 'bg-purple-500 shadow-purple-500/30' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        karaokeMode ? 'translate-x-0' : '-translate-x-6'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 4. 3D Convolver Reverb Spaces */}
              <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.08] bg-white/[0.025] space-y-3">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-[#1DB954]" />
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    محاكي البيئات الصوتية ثلاثية الأبعاد (3D Reverb Spaces)
                  </h4>
                  <span className="text-[10px] text-zinc-500 mr-auto font-mono">100% OFFLINE DSP</span>
                </div>
                <p className="text-xs text-zinc-400">
                  انعكاسات صوتية نبضية (Impulse Responses) تحاكي بيئات حقيقية بدون تحميل أي ملفات إضافية.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {REVERB_SPACES.map((space) => {
                    const isSelected = reverbSpace === space.id;
                    return (
                      <button
                        key={space.id}
                        onClick={() => setReverbSpace(space.id)}
                        className={`p-3 rounded-xl border text-right transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#1DB954]/15 border-[#1DB954]/50 shadow-[0_0_15px_rgba(29,185,84,0.2)]'
                            : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`p-1.5 rounded-lg ${
                                isSelected ? 'bg-[#1DB954] text-black' : 'bg-white/[0.06] text-zinc-400'
                              }`}
                            >
                              {space.icon}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{space.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{space.subtitle}</p>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md self-start ${
                            isSelected
                              ? 'bg-[#1DB954]/25 text-[#1ed760] border border-[#1DB954]/40'
                              : 'bg-white/[0.05] text-zinc-500'
                          }`}
                        >
                          {space.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Haptic Feedback & Audio-Reactive Canvas */}
              <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.08] bg-white/[0.025] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-xs sm:text-sm">
                        الاهتزاز اللمسي مع ضربات البيز (Haptic Bass Feedback)
                      </h5>
                      <p className="text-[11px] text-zinc-400">
                        نبضات فيزيائية ناعمة مع كل ضربة إيقاع قوية على الهواتف الذكية.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setHapticFeedbackEnabled(!hapticFeedbackEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                      hapticFeedbackEnabled ? 'bg-[#1DB954]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        hapticFeedbackEnabled ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-xs sm:text-sm">
                        الخلفية المتدفقة التفاعلية (Audio-Reactive Mesh)
                      </h5>
                      <p className="text-[11px] text-zinc-400">
                        تدرجات ضوئية تتنفس بالـ Canvas وتتفاعل في الخلفية مع الموسيقى الحية.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setReactiveVisualsEnabled(!reactiveVisualsEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                      reactiveVisualsEnabled ? 'bg-[#1DB954]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        reactiveVisualsEnabled ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.08]">
            <span className="text-[11px] text-zinc-500">
              {modalTab === 'eq'
                ? 'اضغط نقراً مزدوجاً على أي شريط لإعادته فوراً إلى 0dB'
                : 'جميع المؤثرات تعمل محلياً وفورياً داخل متصفحك'}
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
