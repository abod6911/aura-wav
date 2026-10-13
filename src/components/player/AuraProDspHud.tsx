import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import {
  Sparkles,
  Flame,
  Mic2,
  Disc3,
  Repeat,
  Compass,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  Volume2,
} from 'lucide-react';

interface AuraProDspHudProps {
  compact?: boolean;
}

export const AuraProDspHud: React.FC<AuraProDspHudProps> = ({ compact = false }) => {
  const { t, isRTL, dir } = useTranslation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const tracks = usePlayerStore((state) => state.tracks);
  const nextUpTrackId = usePlayerStore((state) => state.nextUpTrackId);
  const userQueue = usePlayerStore((state) => state.userQueue);
  const queue = usePlayerStore((state) => state.queue);

  const analogWarmth = usePlayerStore((state) => state.analogWarmth);
  const setAnalogWarmth = usePlayerStore((state) => state.setAnalogWarmth);

  const karaokeMode = usePlayerStore((state) => state.karaokeMode);
  const setKaraokeMode = usePlayerStore((state) => state.setKaraokeMode);
  const karaokeVocalLevel = usePlayerStore((state) => state.karaokeVocalLevel);
  const setKaraokeVocalLevel = usePlayerStore((state) => state.setKaraokeVocalLevel);

  const spatialMode = usePlayerStore((state) => state.spatialMode);
  const toggle8DSpatial = usePlayerStore((state) => state.toggle8DSpatial);

  const activeLoopRoll = usePlayerStore((state) => state.activeLoopRoll);
  const setLoopRoll = usePlayerStore((state) => state.setLoopRoll);

  const triggerVinylBrake = usePlayerStore((state) => state.triggerVinylBrake);
  const setHarmonicJourneyOpen = usePlayerStore((state) => state.setHarmonicJourneyOpen);

  // Determine Next Track for Camelot & BPM calculation
  const nextTrack = React.useMemo(() => {
    if (userQueue.length > 0) return userQueue[0];
    if (nextUpTrackId) {
      return tracks.find((t) => t.id === nextUpTrackId) || null;
    }
    if (currentTrack) {
      const idx = queue.findIndex((t) => t.id === currentTrack.id);
      if (idx >= 0 && idx < queue.length - 1) return queue[idx + 1];
    }
    return null;
  }, [userQueue, nextUpTrackId, tracks, currentTrack, queue]);

  // Camelot & Harmonic match evaluation
  const harmonicAnalysis = React.useMemo(() => {
    if (!currentTrack) return null;
    const curKey = currentTrack.key || '8A';
    const nxtKey = nextTrack?.key || '8B';
    const curBpm = currentTrack.bpm || 120;
    const nxtBpm = nextTrack?.bpm || 122;

    const bpmDiff = Math.abs(curBpm - nxtBpm);
    const isHarmonicMatch = curKey === nxtKey || Math.abs(parseInt(curKey) - parseInt(nxtKey)) <= 1;

    return {
      curKey,
      nxtKey,
      curBpm,
      nxtBpm,
      bpmDiff,
      isHarmonicMatch,
    };
  }, [currentTrack, nextTrack]);

  if (!currentTrack) return null;

  return (
    <div
      data-testid="aura-pro-dsp-hud"
      className="w-full apple-glass-card border border-white/[0.12] rounded-[28px] p-4 sm:p-5 text-white select-none shadow-[0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-3xl"
      dir={dir}
    >
      {/* 1. Header: AutoMix & Harmonic Match Live Radar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500/20 to-purple-500/20 border border-white/10 text-[11px] font-black tracking-wider text-red-400">
            <Radio className="w-3 h-3 animate-pulse text-red-400" />
            <span>AURA DSP ENGINE</span>
          </div>

          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Bass-Swap Protected</span>
          </span>
        </div>

        {harmonicAnalysis && nextTrack && (
          <div className="flex items-center gap-2 text-xs font-mono bg-white/[0.05] px-3 py-1 rounded-full border border-white/10">
            <span className="text-zinc-400">Next Track:</span>
            <span className="font-bold text-white">{harmonicAnalysis.curKey}</span>
            <span className="text-zinc-500">→</span>
            <span
              className={`font-bold ${
                harmonicAnalysis.isHarmonicMatch ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {harmonicAnalysis.nxtKey}
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-300">{harmonicAnalysis.nxtBpm} BPM</span>
            {harmonicAnalysis.isHarmonicMatch && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-sans font-bold">
                Harmonic Match
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Controls Grid: Sliders & Performance Triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Slider 1: Tube Warmth */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Flame className="w-3.5 h-3.5" />
              <span>Tube Warmth</span>
            </div>
            <span className="text-xs font-mono text-zinc-400">{analogWarmth}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={analogWarmth}
            onChange={(e) => setAnalogWarmth(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
            <span>Clean 0%</span>
            <span>12AX7 Tube Saturation</span>
          </div>
        </div>

        {/* Slider 2: Studio Vocal Isolation (Karaoke) */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <Mic2 className="w-3.5 h-3.5" />
              <span>Vocal Attenuation</span>
            </div>
            <button
              onClick={() => setKaraokeMode(!karaokeMode)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                karaokeMode
                  ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/50'
                  : 'bg-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              {karaokeMode ? 'ENGAGED' : 'OFF'}
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            disabled={!karaokeMode}
            value={karaokeMode ? Math.round(karaokeVocalLevel * 100) : 0}
            onChange={(e) => setKaraokeVocalLevel(parseInt(e.target.value, 10) / 100)}
            className={`w-full accent-purple-500 cursor-pointer h-1.5 bg-white/10 rounded-lg ${
              !karaokeMode ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          />
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
            <span>Center Kick Protected</span>
            <span>{karaokeMode ? `${Math.round(karaokeVocalLevel * 100)}% Cut` : 'Bypass'}</span>
          </div>
        </div>

        {/* Live DJ Performance FX: 8D Spatial + Vinyl Brake */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 flex items-center justify-around gap-2">
          {/* 8D Spatial Audio Button */}
          <button
            onClick={toggle8DSpatial}
            className={`flex-1 py-2 px-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
              spatialMode === '8d'
                ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Radio className={`w-4 h-4 ${spatialMode === '8d' ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-black">8D SPATIAL</span>
            <span className="text-[9px] opacity-75">HRTF 360°</span>
          </button>

          {/* Vinyl Brake Button */}
          <button
            onClick={triggerVinylBrake}
            className="flex-1 py-2 px-2.5 rounded-xl border bg-white/[0.04] border-white/10 text-zinc-300 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-all flex flex-col items-center gap-1 active:scale-95"
          >
            <Disc3 className="w-4 h-4 text-red-400" />
            <span className="text-[11px] font-black">VINYL BRAKE</span>
            <span className="text-[9px] opacity-75">Power-Down</span>
          </button>
        </div>

        {/* Beat-Quantized Loop Roll & Harmonic Journey */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
              <Repeat className="w-3 h-3 text-emerald-400" />
              <span>Beat Loop Roll</span>
            </span>
            <button
              onClick={() => setHarmonicJourneyOpen(true)}
              className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 transition-all hover:scale-105"
            >
              <Compass className="w-3 h-3" />
              <span>Harmonic Path</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {(['1/4', '1/2', '1'] as const).map((roll) => (
              <button
                key={roll}
                onClick={() => setLoopRoll(activeLoopRoll === roll ? null : roll)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-black transition-all ${
                  activeLoopRoll === roll
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/40 ring-1 ring-white/50'
                    : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12] hover:text-white border border-white/10'
                }`}
              >
                {roll === '1' ? '1 BAR' : `${roll}T`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
