import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { extractPaletteFromImage } from '../lib/colorSampler';

export const AtmosphereBackground: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  const [palette, setPalette] = useState({
    c1: 'rgba(29, 185, 84, 0.25)',
    c2: 'rgba(16, 185, 129, 0.20)',
    c3: 'rgba(30, 41, 59, 0.22)',
    c4: 'rgba(24, 24, 27, 0.20)',
  });

  useEffect(() => {
    if (currentTrack?.artworkUrl) {
      extractPaletteFromImage(currentTrack.artworkUrl).then((p) => {
        // Format colors cleanly with appropriate alpha for dark backgrounds
        const formatRgba = (colorStr: string, alpha: number) => {
          if (colorStr.startsWith('#')) {
            const r = parseInt(colorStr.slice(1, 3), 16) || 29;
            const g = parseInt(colorStr.slice(3, 5), 16) || 185;
            const b = parseInt(colorStr.slice(5, 7), 16) || 84;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
          if (colorStr.includes('rgb(')) {
            return colorStr.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
          }
          return colorStr;
        };

        setPalette({
          c1: formatRgba(p.primary, 0.5),
          c2: formatRgba(p.secondary, 0.42),
          c3: formatRgba(p.accent, 0.35),
          c4: formatRgba(currentTrack.secondaryColor || p.primary, 0.3),
        });
      });
    }
  }, [currentTrack?.artworkUrl, currentTrack?.secondaryColor]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#050508]">
      {/* Deep Obsidian Base Foundation */}
      <div className="absolute inset-0 bg-[#06060a]" />

      {/* 4 Oversized Animated Fluid Aurora Gradient Spheres */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-out"
        style={{ opacity: isPlaying ? 0.95 : 0.45 }}
      >
        {/* Sphere 1: Top Left */}
        <div
          className="absolute -top-[15%] -left-[10%] w-[65vw] h-[65vw] rounded-full filter blur-[100px] animate-aurora-slow opacity-70 transition-colors duration-1000"
          style={{ backgroundColor: palette.c1 }}
        />

        {/* Sphere 2: Top Right */}
        <div
          className="absolute -top-[10%] -right-[15%] w-[60vw] h-[60vw] rounded-full filter blur-[110px] animate-aurora-reverse opacity-60 transition-colors duration-1000"
          style={{ backgroundColor: palette.c2 }}
        />

        {/* Sphere 3: Bottom Left */}
        <div
          className="absolute -bottom-[15%] -left-[10%] w-[70vw] h-[70vw] rounded-full filter blur-[120px] animate-aurora-float opacity-50 transition-colors duration-1000"
          style={{ backgroundColor: palette.c3 }}
        />

        {/* Sphere 4: Bottom Right / Center */}
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[65vw] h-[65vw] rounded-full filter blur-[95px] animate-aurora-slow opacity-55 transition-colors duration-1000"
          style={{ backgroundColor: palette.c4 }}
        />
      </div>

      {/* Dark Glass Overlay with Backdrop Filter (Apple Music Signature Tint) */}
      <div className="absolute inset-0 bg-[#08080c]/75 backdrop-blur-[40px] -webkit-backdrop-blur-[40px]" />

      {/* Vignette Depth Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/75 pointer-events-none" />
    </div>
  );
};
