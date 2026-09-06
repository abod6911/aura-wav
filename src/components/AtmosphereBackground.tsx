import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { extractPaletteFromImage } from '../lib/colorSampler';

export const AtmosphereBackground: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  const [c1, setC1] = useState('rgba(99, 102, 241, 0.4)');
  const [c2, setC2] = useState('rgba(168, 85, 247, 0.35)');
  const [c3, setC3] = useState('rgba(236, 72, 153, 0.25)');

  useEffect(() => {
    if (currentTrack?.artworkUrl) {
      extractPaletteFromImage(currentTrack.artworkUrl).then((palette) => {
        setC1(palette.primary);
        setC2(palette.secondary);
        setC3(palette.accent);
      });
    }
  }, [currentTrack?.artworkUrl]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#050508]">
      {/* Deep Obsidian Gradient Canvas */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#08080f] via-[#050508] to-[#030305]" />

      {/* Dynamic Animated Blurred Radial Mesh Gradient (Apple Music Style) */}
      <div
        className="absolute -top-[15%] -left-[10%] w-[65vw] h-[65vw] rounded-full filter blur-[100px] transition-all duration-1000 ease-out"
        style={{
          backgroundColor: c1,
          opacity: isPlaying ? 0.35 : 0.22,
          transform: isPlaying ? 'scale(1.08) translate(15px, 15px)' : 'scale(1)',
        }}
      />
      <div
        className="absolute -bottom-[20%] -right-[15%] w-[70vw] h-[70vw] rounded-full filter blur-[120px] transition-all duration-1000 ease-out"
        style={{
          backgroundColor: c2,
          opacity: isPlaying ? 0.3 : 0.18,
          transform: isPlaying ? 'scale(1.1) translate(-25px, -15px)' : 'scale(1)',
        }}
      />
      <div
        className="absolute top-[35%] right-[25%] w-[50vw] h-[50vw] rounded-full filter blur-[120px] transition-all duration-1000 ease-out"
        style={{
          backgroundColor: c3,
          opacity: isPlaying ? 0.22 : 0.12,
        }}
      />

      {/* Dark Subtle Vignette */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[40px]" />
    </div>
  );
};
