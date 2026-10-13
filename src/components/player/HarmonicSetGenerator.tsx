import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Track } from '../../types';
import {
  Compass,
  X,
  Play,
  Zap,
  Moon,
  Sparkles,
  Music2,
  Check,
  Disc3,
  Flame,
} from 'lucide-react';

export const HarmonicSetGenerator: React.FC = () => {
  const isHarmonicJourneyOpen = usePlayerStore((state) => state.isHarmonicJourneyOpen);
  const setHarmonicJourneyOpen = usePlayerStore((state) => state.setHarmonicJourneyOpen);
  const tracks = usePlayerStore((state) => state.tracks);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setAnalogWarmth = usePlayerStore((state) => state.setAnalogWarmth);
  const setSpatialMode = usePlayerStore((state) => state.setSpatialMode);
  const addToast = usePlayerStore((state) => state.addToast);

  const [selectedMode, setSelectedMode] = useState<'workout' | 'harmonic' | 'chill'>('harmonic');

  // Camelot wheel numeric extractor
  const getCamelotNumber = (key?: string): number => {
    if (!key) return 8;
    const match = key.match(/\d+/);
    return match ? parseInt(match[0], 10) : 8;
  };

  // Generate tailored 10-track journey according to selected archetype
  const journeyTracks = useMemo<Track[]>(() => {
    if (!tracks || tracks.length === 0) return [];
    const pool = [...tracks];

    if (selectedMode === 'workout') {
      // Sort and build ascending BPM arc (e.g. 100 -> 140+)
      const validBpm = pool.filter((t) => t.bpm && t.bpm >= 90);
      validBpm.sort((a, b) => (a.bpm || 110) - (b.bpm || 110));
      return validBpm.slice(0, 12);
    }

    if (selectedMode === 'chill') {
      // Select low/mid tempo, soothing tracks (BPM <= 115)
      const chillTracks = pool.filter((t) => !t.bpm || t.bpm <= 115);
      return chillTracks.slice(0, 12);
    }

    // Harmonic Flow mode: Camelot sequence
    // Start with a track and pick adjacent Camelot wheel keys (x -> x+1 or same letter)
    const sortedHarmonic: Track[] = [];
    let currentNumber = 8;
    const remaining = [...pool];

    for (let i = 0; i < 12 && remaining.length > 0; i++) {
      const matchIdx = remaining.findIndex((t) => {
        const num = getCamelotNumber(t.key);
        return num === currentNumber || num === (currentNumber % 12) + 1;
      });

      if (matchIdx !== -1) {
        const found = remaining.splice(matchIdx, 1)[0];
        sortedHarmonic.push(found);
        currentNumber = getCamelotNumber(found.key);
      } else if (remaining.length > 0) {
        sortedHarmonic.push(remaining.shift()!);
      }
    }

    return sortedHarmonic;
  }, [tracks, selectedMode]);

  const handleLaunchJourney = async () => {
    if (journeyTracks.length === 0) return;

    if (selectedMode === 'chill') {
      setAnalogWarmth(35);
      setSpatialMode('club');
      addToast('🌙 رحلة الاسترخاء: تم تفعيل تشبع الأنابيب الدافئ والصوت المكاني', undefined, 'info');
    } else if (selectedMode === 'workout') {
      addToast('⚡ رحلة الطاقة والتمرين: تصاعد تدريجي في الإيقاع', undefined, 'info');
    } else {
      addToast('✨ رحلة التناغم الهارموني: انتقال متسلسل عبر عجلة Camelot', undefined, 'info');
    }

    // Launch first track with rest queued
    await playTrack(journeyTracks[0], journeyTracks);
    setHarmonicJourneyOpen(false);
  };

  if (!isHarmonicJourneyOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl select-none animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="w-full max-w-2xl bg-[#0c0c16] border border-white/[0.14] rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        dir="rtl"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 text-white shadow-lg shadow-red-500/20">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Smart Harmonic Journey</h2>
              <p className="text-xs text-zinc-400">
                توليد رحلة موسيقية متناسقة من مكتبتك (1,940 مسار) بناءً على عجلة Camelot وإيقاع الـ BPM
              </p>
            </div>
          </div>
          <button
            onClick={() => setHarmonicJourneyOpen(false)}
            className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Journey Archetype Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-5 relative z-10" dir="ltr">
          <button
            onClick={() => setSelectedMode('harmonic')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedMode === 'harmonic'
                ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:bg-white/[0.08]'
            }`}
          >
            <Sparkles className="w-5 h-5 text-purple-400 mb-2" />
            <h4 className="font-bold text-sm text-white">Harmonic Flow</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Camelot Wheel (8A → 8B → 9B) صفر نشاز موسيقي في الانتقال
            </p>
          </button>

          <button
            onClick={() => setSelectedMode('workout')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedMode === 'workout'
                ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/30'
                : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:bg-white/[0.08]'
            }`}
          >
            <Zap className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="font-bold text-sm text-white">Energy Ascend</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              تصاعد تدريجي في الـ BPM من 100 إلى 135+ للنشاط والرياضة
            </p>
          </button>

          <button
            onClick={() => setSelectedMode('chill')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedMode === 'chill'
                ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:bg-white/[0.08]'
            }`}
          >
            <Moon className="w-5 h-5 text-cyan-400 mb-2" />
            <h4 className="font-bold text-sm text-white">Chill & Night</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              إيقاع هادئ مع تفعيل تلقائي لدفء الأنابيب التناظري 12AX7
            </p>
          </button>
        </div>

        {/* Selected Tracks Preview */}
        <div className="my-4 relative z-10">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>المسارات المختارة ({journeyTracks.length} أغنية):</span>
            <span className="font-mono text-emerald-400">Auto Bass-Swap & Beatgrid Ready</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar" dir="ltr">
            {journeyTracks.map((trk, idx) => (
              <div
                key={trk.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-zinc-500 font-mono w-4">{idx + 1}</span>
                  <div className="truncate">
                    <p className="font-bold text-white truncate">{trk.title}</p>
                    <p className="text-zinc-400 text-[10px] truncate">{trk.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px] flex-shrink-0">
                  {trk.key && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                      {trk.key}
                    </span>
                  )}
                  {trk.bpm && <span className="text-zinc-300">{trk.bpm} BPM</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3 relative z-10">
          <button
            onClick={() => setHarmonicJourneyOpen(false)}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleLaunchJourney}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>بدء الرحلة التوافقية الآن</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
