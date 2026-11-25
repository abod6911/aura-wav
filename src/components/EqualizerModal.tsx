import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { EQ_BANDS, ReverbSpace, djAudioEngine } from '../lib/audioEngine';
import { isIOSDevice, isIOSDspEnabled, isDirectNativeAudioMode } from '../core/audio/deviceAudioPolicy';
import {
  X,
  RotateCcw,
  Sliders,
  Headphones,
  Building2,
  Waves,
  Car,
  Disc,
  Mic,
  MicOff,
  Flame,
  Gauge,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppleSwitch } from './common/AppleSwitch';

interface PrecisionSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label: string;
  accentColor?: string;
}

/**
 * Touch & Mouse reliable horizontal slider with 36px hit target and visible thumb dot.
 */
const PrecisionHorizontalSlider: React.FC<PrecisionSliderProps> = ({
  value,
  min,
  max,
  step = 0.5,
  onChange,
  disabled = false,
  label,
  accentColor = '#1DB954',
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const computeValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return value;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, Number(stepped.toFixed(2))));
    },
    [min, max, step, value]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    onChange(computeValue(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    e.stopPropagation();
    onChange(computeValue(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
  };

  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;

  return (
    <div
      ref={trackRef}
      dir="ltr"
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setIsDragging(false)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onChange(Math.min(max, Number((value + step).toFixed(2))));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onChange(Math.max(min, Number((value - step).toFixed(2))));
        }
      }}
      className={`relative w-full h-9 flex items-center touch-none select-none ${
        disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'
      }`}
    >
      <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden relative">
        <div
          className="h-full rounded-full transition-[background-color]"
          style={{ width: `${pct}%`, backgroundColor: accentColor }}
        />
      </div>
      <div
        className={`absolute -ml-2.5 w-5 h-5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.7)] border-2 transition-transform pointer-events-none ${
          isDragging ? 'scale-125' : 'scale-100'
        }`}
        style={{ left: `${pct}%`, borderColor: accentColor }}
      />
    </div>
  );
};

interface PresetItem {
  name: string;
  label: string;
  gains: [number, number, number, number, number];
}

const STUDIO_PRESETS: PresetItem[] = [
  { name: 'Flat', label: 'افتراضي', gains: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', label: 'تضخيم الباس', gains: [6, 4, 1, 0, -1] },
  { name: 'Vocal / Acoustic', label: 'وضوح الصوت', gains: [-2, 1, 4, 3, 1] },
  { name: 'Electronic / EDM', label: 'موسيقى', gains: [5, 3, -1, 3, 5] },
  { name: 'Rock / Metal', label: 'روك', gains: [4, 2, -1, 2, 4] },
  { name: 'Hip Hop / R&B', label: 'هيب هوب', gains: [5, 3, 0, 1, 3] },
  { name: 'Gentle', label: 'هادئ', gains: [-1, 0, 1, 2, 0] },
];

const REVERB_SPACES: {
  id: ReverbSpace;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'off',
    title: 'مباشر (Studio Direct)',
    subtitle: 'بدون أي صدى أو معالجة انعكاسات مكانية',
    icon: <Headphones className="w-4 h-4" />,
  },
  {
    id: 'studio',
    title: 'استوديو صوتي (Acoustic Studio)',
    subtitle: 'غرفة عازلة مع انعكاسات أولية محكمة (0.6s)',
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    id: 'arena',
    title: 'صالة حفلات (Live Arena)',
    subtitle: 'فضاء ضخم بصدى كونسرت عميق وممتد (3.2s)',
    icon: <Waves className="w-4 h-4" />,
  },
  {
    id: 'car',
    title: 'سيارة فاخرة (Car Cabin)',
    subtitle: 'مقصورة مركبة مع انعكاسات قريبة ومكثفة',
    icon: <Car className="w-4 h-4" />,
  },
  {
    id: 'vinyl_lounge',
    title: 'صالون الفينيل (Vinyl Lounge)',
    subtitle: 'مساحة حميمية دافئة مع امتصاص الترددات الخشنة',
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
  const addToast = usePlayerStore((state) => state.addToast);

  const [iosDspActive, setIosDspActive] = useState(() => isIOSDspEnabled());

  // Dragging node on interactive curve or vertical fader
  const [draggingNode, setDraggingNode] = useState<number | null>(null);
  const [draggingFader, setDraggingFader] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const faderRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleToggleIosDsp = (enabled: boolean) => {
    setIosDspActive(enabled);
    djAudioEngine.updateIosDspMode(enabled);
    if (enabled) {
      djAudioEngine.setEqGains(eqGains);
      djAudioEngine.setBassBoost(bassBoost);
      djAudioEngine.setAnalogWarmth(analogWarmth);
      djAudioEngine.setKaraokeMode(karaokeMode);
      djAudioEngine.setReverbSpace(reverbSpace);
      addToast('تم تفعيل المعالج الصوتي المتقدم (DSP) — أعد تشغيل المسار لتطبيق الفلاتر فوراً', undefined, 'success');
    } else {
      addToast('تم تفعيل وضع الخلفية المستقر على الآيفون', undefined, 'info');
    }
  };

  // Compute smooth cubic bezier curve
  // Graph viewBox is 0 0 500 160.
  // y = 80 is 0dB, y = 15 is +12dB, y = 145 is -12dB.
  const nodeCoords = React.useMemo(() => {
    const xPositions = [55, 150, 250, 350, 445];
    return eqGains.map((gain, idx) => {
      const x = xPositions[idx];
      const clampedGain = Math.max(-12, Math.min(12, gain));
      const y = 80 - (clampedGain / 12) * 65;
      return { x, y, gain };
    });
  }, [eqGains]);

  const { pathD, fillD } = React.useMemo(() => {
    const pts = nodeCoords;
    if (pts.length < 5) return { pathD: '', fillD: '' };

    // Cubic spline from left edge (0, pts[0].y) through all 5 points to (500, pts[4].y)
    let d = `M 0,${pts[0].y}`;
    d += ` L ${pts[0].x},${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const c1x = p0.x + (p1.x - p0.x) * 0.5;
      const c1y = p0.y;
      const c2x = p1.x - (p1.x - p0.x) * 0.5;
      const c2y = p1.y;
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p1.x},${p1.y}`;
    }

    d += ` L 500,${pts[pts.length - 1].y}`;

    // Fill polygon bounded between the curve and the 0dB center line (y = 80)
    const fD = `${d} L 500,80 L 0,80 Z`;
    return { pathD: d, fillD: fD };
  }, [nodeCoords]);

  // Compute gain from vertical pointer Y inside SVG graph
  const updateGainFromSvgPointer = useCallback((bandIdx: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    // y=15/160 (+12dB) -> ratio ~0.09375; y=80/160 (0dB) -> ratio 0.5; y=145/160 (-12dB) -> ratio ~0.90625
    const gain = Math.round(((0.5 - ratio) / 0.40625) * 12 * 2) / 2;
    const clamped = Math.max(-12, Math.min(12, gain));
    setEqGain(bandIdx, clamped);
  }, [setEqGain]);

  // Compute gain from vertical pointer Y inside individual fader track
  const updateGainFromFaderPointer = useCallback((bandIdx: number, clientY: number) => {
    const el = faderRefs.current[bandIdx];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;
    const ratioFromBottom = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    const gain = Math.round((ratioFromBottom * 24 - 12) * 2) / 2;
    const clamped = Math.max(-12, Math.min(12, gain));
    setEqGain(bandIdx, clamped);
  }, [setEqGain]);

  // Pointer move handler for interactive node dragging on SVG curve
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (draggingNode !== null) {
      updateGainFromSvgPointer(draggingNode, e.clientY);
    } else if (draggingFader !== null) {
      updateGainFromFaderPointer(draggingFader, e.clientY);
    }
  }, [draggingNode, draggingFader, updateGainFromSvgPointer, updateGainFromFaderPointer]);

  const handlePointerUp = useCallback(() => {
    setDraggingNode(null);
    setDraggingFader(null);
  }, []);

  useEffect(() => {
    if (draggingNode !== null || draggingFader !== null) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };
    }
  }, [draggingNode, draggingFader, handlePointerMove, handlePointerUp]);

  if (!isEqualizerOpen) return null;

  return (
    <AnimatePresence>
      <div data-testid="equalizer-modal" className="fixed inset-0 z-70 select-none flex items-end md:items-center justify-center p-0 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setEqualizerOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window (Full-Height Bottom Sheet on Mobile, Dialog on Desktop) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-4xl max-h-[88dvh] md:max-h-[90vh] bg-[#101013]/[0.98] border-t md:border border-white/[0.08] rounded-t-3xl md:rounded-2xl shadow-2xl backdrop-blur-3xl p-4 sm:p-7 flex flex-col gap-4 sm:gap-5 overflow-y-auto z-10 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] md:pb-7"
        >
          {/* Mobile Grabber Handle */}
          <div className="md:hidden w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-1 shrink-0" />
          {/* ── 1. Modal Header (Responsive Architecture) ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            {/* Top row: Title + Actions */}
            <div className="flex items-center justify-between w-full md:w-auto">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-zinc-200">
                  <Sliders className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  المعادل الصوتي
                </h2>
              </div>

              {/* Mobile Right Actions: Reset & Close */}
              <div className="flex md:hidden items-center gap-1.5">
                {modalTab === 'eq' && (
                  <button
                    onClick={() => applyEqPreset({ name: 'Flat', nameAr: 'افتراضي', gains: [0, 0, 0, 0, 0] })}
                    title="إعادة التعيين إلى 0dB"
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setEqualizerOpen(false)}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Apple-Style Segmented Control (Full width on mobile, centered on desktop) */}
            <div className="grid grid-cols-2 p-1 bg-white/[0.05] rounded-xl border border-white/[0.06] text-xs w-full md:w-auto">
              <button
                onClick={() => setModalTab('eq')}
                className={`py-1.5 px-3 rounded-lg font-medium transition-colors text-center cursor-pointer ${
                  modalTab === 'eq'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                المعادل الترددي
              </button>
              <button
                onClick={() => setModalTab('pro_dsp')}
                className={`py-1.5 px-3 rounded-lg font-medium transition-colors text-center cursor-pointer ${
                  modalTab === 'pro_dsp'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                مؤثرات الاستوديو
              </button>
            </div>

            {/* Desktop Left Actions: Reset & Close */}
            <div className="hidden md:flex items-center gap-2">
              {modalTab === 'eq' && (
                <button
                  onClick={() => applyEqPreset({ name: 'Flat', nameAr: 'افتراضي', gains: [0, 0, 0, 0, 0] })}
                  title="إعادة التعيين إلى 0dB"
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setEqualizerOpen(false)}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* iOS DSP Notice Banner (only on iPhone/iPad when Direct Native Audio is active) */}
          {isIOSDevice() && isDirectNativeAudioMode() && !iosDspActive && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0 text-start">
                <p className="text-xs font-bold text-amber-200">تفعيل المعادل الصوتي والبيز على الآيفون</p>
                <p className="text-[11px] text-amber-200/75 mt-0.5 leading-snug">
                  لتطبيق تعديلات الصوت مباشرة فعّل المعالج (إطفاؤه يُحسّن ثبات الخلفية)
                </p>
              </div>
              <AppleSwitch
                checked={iosDspActive}
                onChange={handleToggleIosDsp}
                activeColor="bg-[#1DB954]"
                label="تفعيل المعالج الصوتي على الآيفون"
              />
            </div>
          )}

          {/* ── TAB 1: PARAMETRIC EQUALIZER & CONSOLE ── */}
          {modalTab === 'eq' && (
            <div className="flex flex-col gap-3.5 sm:gap-5">
              {/* Top Half: Studio SVG Interactive Frequency Graph */}
              <div className="relative w-full h-[120px] sm:h-[160px] bg-[#09090B] rounded-xl border border-white/[0.05] overflow-hidden select-none touch-none">
                {/* Calibration Grid Lines */}
                <svg
                  ref={svgRef}
                  className="w-full h-full cursor-crosshair touch-none"
                  viewBox="0 0 500 160"
                  preserveAspectRatio="none"
                  onPointerDown={(e) => {
                    if (!svgRef.current) return;
                    e.stopPropagation();
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {}
                    const rect = svgRef.current.getBoundingClientRect();
                    const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 500;
                    const xPositions = [55, 150, 250, 350, 445];
                    let nearestIdx = 0;
                    let bestDist = Infinity;
                    xPositions.forEach((xp, i) => {
                      const d = Math.abs(relX - xp);
                      if (d < bestDist) {
                        bestDist = d;
                        nearestIdx = i;
                      }
                    });
                    setDraggingNode(nearestIdx);
                    updateGainFromSvgPointer(nearestIdx, e.clientY);
                  }}
                >
                  <defs>
                    <linearGradient id="studioEqFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1DB954" stopOpacity="0.25" />
                      <stop offset="50%" stopColor="#1DB954" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#1DB954" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  <line x1="0" y1="15" x2="500" y2="15" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.12)" />
                  <line x1="0" y1="145" x2="500" y2="145" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                  {/* Vertical Frequency Guidelines */}
                  {nodeCoords.map((pt, i) => (
                    <line
                      key={i}
                      x1={pt.x}
                      y1="0"
                      x2={pt.x}
                      y2="160"
                      stroke="rgba(255,255,255,0.04)"
                    />
                  ))}

                  {/* Shaded Area Fill between curve and 0dB */}
                  <path d={fillD} fill="url(#studioEqFill)" />

                  {/* Smooth Spline Curve */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#1DB954"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Control Nodes */}
                  {nodeCoords.map((pt, idx) => {
                    const isHovered = draggingNode === idx;
                    return (
                      <g
                        key={idx}
                        className="cursor-ns-resize"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setDraggingNode(idx);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEqGain(idx, 0);
                        }}
                      >
                        {/* Glow halo */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 14 : 9}
                          fill="#1DB954"
                          fillOpacity={isHovered ? 0.35 : 0.15}
                          className="transition-colors duration-150"
                        />
                        {/* Crisp white inner handle */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4.5"
                          fill="#ffffff"
                          stroke="#1DB954"
                          strokeWidth="2"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Clean Studio Calibration dB Labels on the Outer Edge (Zero collision with curve!) */}
                <div dir="ltr" className="absolute top-1.5 start-2.5 flex flex-col justify-between h-[95px] sm:h-[135px] pointer-events-none text-[9px] sm:text-[10px] font-mono text-zinc-500 tabular-nums">
                  <span>+12 dB</span>
                  <span className="text-zinc-400 font-semibold">0 dB</span>
                  <span>-12 dB</span>
                </div>
              </div>

              {/* Middle Section: 5 Precision Studio Faders */}
              <div dir="ltr" className="grid grid-cols-5 gap-2 sm:gap-6 px-1 sm:px-2">
                {EQ_BANDS.map((band, idx) => {
                  const gain = eqGains[idx];
                  const isBoost = gain > 0;
                  const isCut = gain < 0;

                  // percentage: gain from -12 to +12
                  // gain = 0 -> 50%
                  // gain = 12 -> 100% (top)
                  // gain = -12 -> 0% (bottom)
                  const heightPercent = ((gain + 12) / 24) * 100;

                  return (
                    <div
                      key={band.freq}
                      className="flex flex-col items-center justify-between h-36 sm:h-44 group select-none"
                    >
                      {/* dB Readout with tabular-nums */}
                      <span
                        className={`text-[11px] sm:text-xs font-mono font-semibold tabular-nums ${
                          isBoost
                            ? 'text-[#1DB954]'
                            : isCut
                            ? 'text-zinc-300'
                            : 'text-zinc-400'
                        }`}
                      >
                        {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)} dB
                      </span>

                      {/* Custom Hardware-Grade Vertical Fader (Direct Touch & Mouse Drag) */}
                      <div
                        ref={(el) => {
                          faderRefs.current[idx] = el;
                        }}
                        role="slider"
                        tabIndex={0}
                        aria-label={`${band.label} Gain`}
                        aria-valuemin={-12}
                        aria-valuemax={12}
                        aria-valuenow={gain}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                          } catch {}
                          setDraggingFader(idx);
                          updateGainFromFaderPointer(idx, e.clientY);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                            e.preventDefault();
                            setEqGain(idx, Math.min(12, gain + 0.5));
                          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                            e.preventDefault();
                            setEqGain(idx, Math.max(-12, gain - 0.5));
                          }
                        }}
                        onDoubleClick={() => setEqGain(idx, 0)}
                        title="اسحب للأعلى أو الأسفل للتعديل، وانقر مرتين لإعادة الضبط"
                        className="relative w-11 h-24 sm:h-28 flex items-center justify-center cursor-ns-resize touch-none select-none"
                      >
                        {/* Faint Tick Marks beside channel */}
                        <div className="absolute inset-y-0 -start-1.5 flex flex-col justify-between py-1 text-[7px] text-zinc-600 font-mono pointer-events-none">
                          <span>+12</span>
                          <span>+6</span>
                          <span className="text-zinc-400">- 0</span>
                          <span>-6</span>
                          <span>-12</span>
                        </div>

                        {/* Recessed Dark Channel Track (6px) */}
                        <div className="relative w-1.5 h-full bg-white/10 rounded-full overflow-hidden pointer-events-none">
                          {/* Center Detent Tick */}
                          <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-0.5 bg-white/30" />

                          {/* Bi-directional Fill starting from Center (50%) */}
                          {gain > 0 && (
                            <div
                              className="absolute bottom-1/2 w-full bg-[#1DB954] transition-colors"
                              style={{ height: `${(gain / 12) * 50}%` }}
                            />
                          )}
                          {gain < 0 && (
                            <div
                              className="absolute top-1/2 w-full bg-[#1DB954]/60 transition-colors"
                              style={{ height: `${(Math.abs(gain) / 12) * 50}%` }}
                            />
                          )}
                        </div>

                        {/* Machined Aluminum / Anodized Fader Cap (28px x 14px) */}
                        <div
                          className={`absolute w-7 h-3.5 rounded-[4px] bg-gradient-to-b from-[#f4f4f7] to-[#d4d4d8] shadow-[0_2px_8px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.9)] border border-black/30 flex items-center justify-center pointer-events-none transition-transform ${
                            draggingFader === idx ? 'scale-110 ring-2 ring-[#1DB954]/60' : ''
                          }`}
                          style={{
                            top: `calc(${100 - heightPercent}% - 7px)`,
                          }}
                        >
                          {/* Notch center guideline */}
                          <div className="w-4 h-[1.5px] bg-zinc-700 rounded-full" />
                        </div>
                      </div>

                      {/* Frequency Label Below */}
                      <div className="text-center">
                        <span className="text-xs font-semibold text-white block tabular-nums">
                          {band.freq >= 1000 ? `${band.freq / 1000}kHz` : `${band.freq}Hz`}
                        </span>
                        <span className="text-[10px] text-zinc-500 block uppercase">
                          {idx === 0 ? 'Sub' : idx === 1 ? 'Bass' : idx === 2 ? 'Mid' : idx === 3 ? 'Treble' : 'Air'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Presets Bar (Full Names, 100% Readable, No Truncation, No Icons) */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-400">الإعدادات المسبقة</span>
                <div className="flex flex-wrap gap-2">
                  {STUDIO_PRESETS.map((p) => {
                    const isActive = activeEqPreset === p.name;
                    return (
                      <button
                        key={p.name}
                        onClick={() => applyEqPreset({ name: p.name, nameAr: p.label, gains: p.gains })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white text-black font-semibold shadow-sm'
                            : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Half: AutoMix & Bass Engine Studio Units */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AutoMix Unit */}
                <div className="bg-[#16161A] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">الدمج التلقائي (AutoMix)</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">انتقال لوغاريتمي سلس بين الأغاني المتتابعة</p>
                    </div>

                    {/* Bulletproof Apple iOS Toggle */}
                    <AppleSwitch
                      checked={automixEnabled}
                      onChange={() => setAutoMix(!automixEnabled)}
                      activeColor="bg-[#1DB954]"
                      label="الدمج التلقائي (AutoMix)"
                    />
                  </div>

                  {/* Duration Slider */}
                  <div className={`space-y-1 transition-opacity ${automixEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">مدة التداخل (Crossfade)</span>
                      <span className="text-white font-mono font-semibold tabular-nums">
                        {automixDuration.toFixed(1)} ثانية
                      </span>
                    </div>
                    <PrecisionHorizontalSlider
                      min={2}
                      max={12}
                      step={0.5}
                      value={automixDuration}
                      disabled={!automixEnabled}
                      onChange={(val) => setAutoMix(true, val)}
                      label="مدة التداخل"
                    />
                  </div>
                </div>

                {/* Bass Engine Unit */}
                <div className="bg-[#16161A] border border-white/[0.06] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">تعزيز الترددات المنخفضة (Bass Boost)</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">تعزيز الترددات الأقل من 80Hz مع حماية ضد التشويه</p>
                    </div>
                    <span dir="ltr" className="text-xs font-mono font-semibold text-[#1DB954] tabular-nums shrink-0">
                      {bassBoost > 0 ? `+${bassBoost} dB` : '0 dB'}
                    </span>
                  </div>

                  {/* Interactive Bass Boost Slider */}
                  <PrecisionHorizontalSlider
                    min={0}
                    max={18}
                    step={0.5}
                    value={bassBoost}
                    onChange={(val) => setBassBoost(val)}
                    label="تعزيز البيز"
                  />

                  {/* Clean Segmented Quick Presets */}
                  <div dir="ltr" className="grid grid-cols-6 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.05]">
                    {[0, 3, 6, 9, 12, 18].map((val) => {
                      const isSel = Math.abs(bassBoost - val) < 0.25;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setBassBoost(val)}
                          className={`py-1.5 rounded-lg text-[11px] font-semibold tabular-nums transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-white text-black shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {val === 0 ? '0dB' : `+${val}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: PRO STUDIO DSP (Spatial Reverb, Vocal Cut, Warmth, Loudness) ── */}
          {modalTab === 'pro_dsp' && (
            <div className="flex flex-col gap-4">
              {/* 1. Spatial Reverb Environments */}
              <div className="bg-[#16161A] border border-white/[0.06] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">محاكي البيئات الصوتية (Spatial Audio)</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">انعكاسات صوتية نبضية تحاكي غرف وعوازل حقيقية</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {REVERB_SPACES.map((space) => {
                    const isSelected = reverbSpace === space.id;
                    return (
                      <button
                        key={space.id}
                        onClick={() => setReverbSpace(space.id)}
                        className={`p-3 rounded-xl border text-start transition-colors flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.1] border-white/20 shadow-md'
                            : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isSelected ? 'bg-white text-black' : 'bg-white/[0.06] text-zinc-400'
                          }`}
                        >
                          {space.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-white block truncate">{space.title}</span>
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{space.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Vocal Cut / Karaoke Mode */}
              <div className="bg-[#16161A] border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-white/[0.06] text-zinc-300">
                    {karaokeMode ? <MicOff className="w-5 h-5 text-[#1DB954]" /> : <Mic className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">عزل صوت المغني (Vocal Attenuator)</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">طرح إشارة الوسط لعزل الصوت البشري فورياً مع بقاء الآلات</p>
                  </div>
                </div>

                <AppleSwitch
                  checked={karaokeMode}
                  onChange={() => setKaraokeMode(!karaokeMode)}
                  activeColor="bg-[#1DB954]"
                  label="عزل صوت المغني (Vocal Attenuator)"
                />
              </div>

              {/* 3. Smart Loudness Normalization */}
              <div className="bg-[#16161A] border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-white/[0.06] text-zinc-300">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">تطبيع الصوت الذكي (Smart Loudness)</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">توحيد مستوى الطاقة الصوتية تلقائياً لمنع القفزات المفاجئة</p>
                  </div>
                </div>

                <AppleSwitch
                  checked={loudnessNormalization}
                  onChange={() => setLoudnessNormalization(!loudnessNormalization)}
                  activeColor="bg-[#1DB954]"
                  label="تطبيع الصوت الذكي (Smart Loudness)"
                />
              </div>

              {/* 4. Analog Tape & Tube Warmth */}
              <div className="bg-[#16161A] border border-white/[0.06] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-white/[0.06] text-zinc-300">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">الدفء التناظري (Analog Warmth)</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">تشبع هرموني لطيف يحاكي أجهزة الفينيل وأشرطة الكاسيت</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-zinc-300 tabular-nums">
                    {analogWarmth > 0 ? `${analogWarmth}%` : 'OFF'}
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <PrecisionHorizontalSlider
                    min={0}
                    max={100}
                    step={1}
                    value={analogWarmth}
                    onChange={(val) => setAnalogWarmth(Math.round(val))}
                    label="الدفء التناظري"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>صوت رقمي نقي</span>
                    <span>دفء لطيف (30%)</span>
                    <span>تشبع متوازن (60%)</span>
                    <span>Tube Vintage</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal Footer ── */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <span className="text-xs text-zinc-500 font-normal">
              انقر مرتين على أي تردد لإعادة التعيين إلى 0dB
            </span>

            <button
              onClick={() => setEqualizerOpen(false)}
              className="px-6 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs transition-colors cursor-pointer shadow-sm"
            >
              تم
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
