/**
 * Generates an offline playable ambient synth wave Blob
 * so demo tracks have immediate crystal-clear sound without downloading heavy files.
 */
export function generateDemoAudioBlob(seed: number = 1): Blob {
  const sampleRate = 44100;
  const durationSec = 120; // 2 minutes
  const totalSamples = sampleRate * durationSec;
  const numChannels = 2;

  // Create WAV buffer
  const buffer = new ArrayBuffer(44 + totalSamples * numChannels * 2);
  const view = new DataView(buffer);

  // Write WAV Header
  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, totalSamples * numChannels * 2, true);

  // Musical scales for chords (A minor, F major, C major, G major)
  const baseFreqs = seed === 1 
    ? [220, 261.63, 329.63, 440]  // Am chord
    : seed === 2 
    ? [174.61, 220, 261.63, 349.23] // F chord
    : [261.63, 329.63, 392, 523.25]; // C chord

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    
    // Smooth beat and pads
    const chordIdx = Math.floor(t / 8) % 4;
    const root = baseFreqs[chordIdx % baseFreqs.length];
    
    // Ambient pad synth
    let sampleL = 0;
    let sampleR = 0;

    // Harmonic oscillators
    sampleL += Math.sin(2 * Math.PI * root * t) * 0.25;
    sampleL += Math.sin(2 * Math.PI * (root * 1.5) * t) * 0.15;
    sampleR += Math.sin(2 * Math.PI * (root * 1.002) * t) * 0.25; // stereo chorus detune
    sampleR += Math.sin(2 * Math.PI * (root * 2.0) * t) * 0.1;

    // Soft kick pulse every second
    const beatPhase = t % 1.0;
    if (beatPhase < 0.2) {
      const kickFreq = 90 * Math.exp(-beatPhase * 25);
      const kickVol = (1 - beatPhase / 0.2) * 0.4;
      const kick = Math.sin(2 * Math.PI * kickFreq * beatPhase) * kickVol;
      sampleL += kick;
      sampleR += kick;
    }

    // Master envelope (fade in & out)
    const masterEnv = Math.min(t / 2, 1) * Math.min((durationSec - t) / 3, 1);
    sampleL *= masterEnv * 0.7;
    sampleR *= masterEnv * 0.7;

    // Clamp 16-bit PCM
    const valL = Math.max(-1, Math.min(1, sampleL));
    const valR = Math.max(-1, Math.min(1, sampleR));

    view.setInt16(offset, valL < 0 ? valL * 0x8000 : valL * 0x7fff, true);
    view.setInt16(offset + 2, valR < 0 ? valR * 0x8000 : valR * 0x7fff, true);
    offset += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
