/**
 * In-Browser Rhythmic BPM & Camelot Wheel Key Detection Engine
 * 
 * Analyzes raw AudioBuffers using spectral flux, autocorrelation,
 * and pitch-class chroma vectors (Krumhansl-Schmuckler key profiles).
 */

// Krumhansl-Schmuckler key profile weights
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Camelot Wheel Mapping: maps root pitch index (0=C, 1=C#...) to Camelot notation
const MAJOR_CAMELOT: Record<number, string> = {
  0: '8B',  // C Major
  1: '3B',  // C# Major
  2: '10B', // D Major
  3: '5B',  // D# Major
  4: '12B', // E Major
  5: '7B',  // F Major
  6: '2B',  // F# Major
  7: '9B',  // G Major
  8: '4B',  // G# Major
  9: '11B', // A Major
  10: '6B', // A# Major
  11: '1B', // B Major
};

const MINOR_CAMELOT: Record<number, string> = {
  0: '5A',  // C Minor
  1: '12A', // C# Minor
  2: '7A',  // D Minor
  3: '2A',  // D# Minor
  4: '9A',  // E Minor
  5: '4A',  // F Minor
  6: '11A', // F# Minor
  7: '6A',  // G Minor
  8: '1A',  // G# Minor
  9: '8A',  // A Minor
  10: '3A', // A# Minor
  11: '10A',// B Minor
};

/**
 * Detect BPM from an AudioBuffer using peak energy onset autocorrelation
 */
export function detectBpmFromAudioBuffer(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Downsample to ~11,025 Hz for ultra-fast processing
  const downsampleStep = Math.max(1, Math.floor(sampleRate / 11025));
  const downsampledLength = Math.min(channelData.length, Math.floor(sampleRate * 60)); // Analyze up to first 60 seconds
  const downsampledRate = sampleRate / downsampleStep;

  // Compute energy envelope over 20ms frames
  const frameSize = Math.floor(downsampledRate * 0.02);
  const numFrames = Math.floor(downsampledLength / downsampleStep / frameSize);
  const energy = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    let sum = 0;
    const startIdx = f * frameSize * downsampleStep;
    for (let i = 0; i < frameSize; i++) {
      const sample = channelData[startIdx + i * downsampleStep] || 0;
      sum += sample * sample;
    }
    energy[f] = Math.sqrt(sum / frameSize);
  }

  // Compute Onset Detection Function (first-difference half-wave rectified)
  const odf = new Float32Array(numFrames);
  for (let i = 1; i < numFrames; i++) {
    const diff = energy[i] - energy[i - 1];
    odf[i] = diff > 0 ? diff : 0;
  }

  // Autocorrelation over BPM range 70 to 180
  const frameRate = downsampledRate / frameSize;
  const minLag = Math.floor((frameRate * 60) / 180);
  const maxLag = Math.ceil((frameRate * 60) / 70);

  let bestLag = minLag;
  let maxCorrelation = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < numFrames - lag; i++) {
      corr += odf[i] * odf[i + lag];
    }
    if (corr > maxCorrelation) {
      maxCorrelation = corr;
      bestLag = lag;
    }
  }

  let calculatedBpm = Math.round((frameRate * 60) / bestLag);

  // Normalize octave ambiguity (keep in DJ sweet spot 85 - 165 BPM)
  if (calculatedBpm < 85) calculatedBpm *= 2;
  if (calculatedBpm > 175) calculatedBpm = Math.round(calculatedBpm / 2);

  return Math.max(60, Math.min(220, calculatedBpm));
}

/**
 * Detect Key and Camelot code from an AudioBuffer using chroma profile correlation
 */
export function detectKeyFromAudioBuffer(audioBuffer: AudioBuffer): {
  keyName: string;
  camelot: string;
} {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = Math.min(channelData.length, Math.floor(sampleRate * 45));

  // Compute 12-bin Pitch Class Profile (Chroma)
  const chroma = new Float32Array(12);
  const fftSize = 4096;
  const numBlocks = Math.floor(numSamples / fftSize);

  for (let b = 0; b < Math.min(numBlocks, 32); b++) {
    const offset = b * fftSize;
    for (let k = 1; k < fftSize / 2; k++) {
      const freq = (k * sampleRate) / fftSize;
      if (freq >= 65 && freq <= 2000) {
        // Map frequency to MIDI note: 69 + 12 * log2(freq / 440)
        const midi = 69 + 12 * (Math.log(freq / 440) / Math.LN2);
        const pitchClass = Math.round(midi) % 12;
        if (pitchClass >= 0 && pitchClass < 12) {
          const sample = channelData[offset + (k % fftSize)] || 0;
          chroma[pitchClass] += sample * sample;
        }
      }
    }
  }

  // Normalize chroma vector
  let chromaSum = 0;
  for (let i = 0; i < 12; i++) chromaSum += chroma[i];
  if (chromaSum > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= chromaSum;
  }

  // Correlate with 24 Major & Minor profiles
  let bestScore = -Infinity;
  let bestPitch = 0;
  let isMajor = true;

  for (let root = 0; root < 12; root++) {
    // Major correlation
    let majScore = 0;
    let minScore = 0;
    for (let step = 0; step < 12; step++) {
      const chIdx = (root + step) % 12;
      majScore += chroma[chIdx] * MAJOR_PROFILE[step];
      minScore += chroma[chIdx] * MINOR_PROFILE[step];
    }

    if (majScore > bestScore) {
      bestScore = majScore;
      bestPitch = root;
      isMajor = true;
    }
    if (minScore > bestScore) {
      bestScore = minScore;
      bestPitch = root;
      isMajor = false;
    }
  }

  const rootName = PITCH_NAMES[bestPitch];
  const keyName = isMajor ? `${rootName} Maj` : `${rootName} Min`;
  const camelot = isMajor ? MAJOR_CAMELOT[bestPitch] : MINOR_CAMELOT[bestPitch];

  return { keyName, camelot };
}

export interface HarmonicCompatibility {
  isCompatible: boolean;
  score: 'perfect' | 'energy_shift' | 'mood_shift' | 'clash';
  labelAr: string;
  labelEn: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Check harmonic mixing compatibility between two Camelot keys
 */
export function checkHarmonicCompatibility(keyA?: string, keyB?: string): HarmonicCompatibility {
  if (!keyA || !keyB) {
    return {
      isCompatible: false,
      score: 'clash',
      labelAr: 'غير متطابق',
      labelEn: 'Incompatible',
      badgeBg: 'bg-zinc-800/60',
      badgeText: 'text-zinc-400',
    };
  }

  const cleanA = keyA.trim().toUpperCase();
  const cleanB = keyB.trim().toUpperCase();

  // 1. Exact Key Match (e.g. 8A -> 8A)
  if (cleanA === cleanB) {
    return {
      isCompatible: true,
      score: 'perfect',
      labelAr: 'تطابق تام (Perfect Mix)',
      labelEn: 'Exact Match',
      badgeBg: 'bg-emerald-500/20 border-emerald-500/40',
      badgeText: 'text-emerald-300',
    };
  }

  const numA = parseInt(cleanA, 10);
  const letterA = cleanA.slice(-1);
  const numB = parseInt(cleanB, 10);
  const letterB = cleanB.slice(-1);

  if (isNaN(numA) || isNaN(numB)) {
    return {
      isCompatible: false,
      score: 'clash',
      labelAr: 'غير معروف',
      labelEn: 'Unknown',
      badgeBg: 'bg-zinc-800/60',
      badgeText: 'text-zinc-400',
    };
  }

  // 2. Relative Major/Minor Swap (e.g. 8A <-> 8B)
  if (numA === numB && letterA !== letterB) {
    return {
      isCompatible: true,
      score: 'mood_shift',
      labelAr: 'تحول سلمي (Relative Key)',
      labelEn: 'Mood Shift',
      badgeBg: 'bg-cyan-500/20 border-cyan-500/40',
      badgeText: 'text-cyan-300',
    };
  }

  // 3. Energy Shift (+1 or -1 on Camelot Wheel)
  const diff = Math.abs(numA - numB);
  const isAdjacent = diff === 1 || diff === 11; // 12 and 1 are adjacent

  if (isAdjacent && letterA === letterB) {
    const isEnergyUp = (numB === numA + 1) || (numA === 12 && numB === 1);
    return {
      isCompatible: true,
      score: 'energy_shift',
      labelAr: isEnergyUp ? 'رفع طاقة (+1 Energy)' : 'تهدئة إيقاع (-1 Energy)',
      labelEn: isEnergyUp ? 'Energy Boost' : 'Energy Drop',
      badgeBg: 'bg-[#1DB954]/20 border-[#1DB954]/40',
      badgeText: 'text-[#1ed760]',
    };
  }

  return {
    isCompatible: false,
    score: 'clash',
    labelAr: 'تباين نغمي (Key Clash)',
    labelEn: 'Clash',
    badgeBg: 'bg-zinc-800/40 border-white/5',
    badgeText: 'text-zinc-500',
  };
}
