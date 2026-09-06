import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { extractPaletteFromImage } from '../lib/colorSampler';

export const AtmosphereBackground: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  const [c1, setC1] = useState('rgba(99, 102, 241, 0.45)');
  const [c2, setC2] = useState('rgba(168, 85, 247, 0.4)');
  const [c3, setC3] = useState('rgba(236, 72, 153, 0.3)');
  const [c4, setC4] = useState('rgba(59, 130, 246, 0.35)');

  useEffect(() => {
    if (currentTrack?.artworkUrl) {
      extractPaletteFromImage(currentTrack.artworkUrl).then((palette) => {
        setC1(palette.primary);
        setC2(palette.secondary);
        setC3(palette.accent);
        // Synthesize fourth harmonic tone
        setC4(palette.secondary.replace(/[\d.]+\)$/, '0.3)'));
      });
    }
  }, [currentTrack?.artworkUrl]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#050508]">
      {/* Deep Obsidian Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080811] via-[#050508] to-[#020204]" />

      {/* Apple Music Fluid Multi-Orb Mesh with Harmonic Organic Motion */}
      <div
        className={`absolute -top-[20%] -left-[15%] w-[80vw] h-[80vw] max-w-[650px] max-h-[650px] rounded-full filter blur-[110px] transition-colors duration-1000 ease-out ${
          isPlaying ? 'animate-aurora-slow' : 'opacity-30'
        }`}
        style={{
          backgroundColor: c1,
          opacity: isPlaying ? 0.42 : 0.2,
          willChange: 'transform',
        }}
      />

      <div
        className={`absolute -bottom-[25%] -right-[20%] w-[85vw] h-[85vw] max-w-[700px] max-h-[700px] rounded-full filter blur-[130px] transition-colors duration-1000 ease-out ${
          isPlaying ? 'animate-aurora-reverse' : 'opacity-25'
        }`}
        style={{
          backgroundColor: c2,
          opacity: isPlaying ? 0.38 : 0.18,
          willChange: 'transform',
        }}
      />

      <div
        className={`absolute top-[25%] right-[10%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] rounded-full filter blur-[100px] transition-colors duration-1000 ease-out ${
          isPlaying ? 'animate-aurora-float' : 'opacity-20'
        }`}
        style={{
          backgroundColor: c3,
          opacity: isPlaying ? 0.28 : 0.14,
          willChange: 'transform',
        }}
      />

      <div
        className={`absolute bottom-[20%] left-[10%] w-[55vw] h-[55vw] max-w-[480px] max-h-[480px] rounded-full filter blur-[120px] transition-colors duration-1000 ease-out ${
          isPlaying ? 'animate-aurora-slow' : 'opacity-20'
        }`}
        style={{
          backgroundColor: c4,
          opacity: isPlaying ? 0.25 : 0.12,
          willChange: 'transform',
        }}
      />

      {/* Apple Frosted Glass Vignette */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[55px]" />
    </div>
  );
};

