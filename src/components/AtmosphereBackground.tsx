import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { extractPaletteFromImage } from '../lib/colorSampler';
import { AudioReactiveBackground } from './AudioReactiveBackground';

export const AtmosphereBackground: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const reactiveVisualsEnabled = usePlayerStore((state) => state.reactiveVisualsEnabled);

  const [rawColors, setRawColors] = useState({
    p: '#1DB954',
    s: '#10B981',
    a: '#065F46',
  });

  const [palette, setPalette] = useState({
    c1: 'rgba(29, 185, 84, 0.25)',
    c2: 'rgba(16, 185, 129, 0.20)',
    c3: 'rgba(30, 41, 59, 0.22)',
    c4: 'rgba(24, 24, 27, 0.20)',
  });

  useEffect(() => {
    if (currentTrack?.artworkUrl) {
      extractPaletteFromImage(currentTrack.artworkUrl).then((p) => {
        setRawColors({
          p: p.primary,
          s: p.secondary,
          a: p.accent,
        });

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
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#050508] transform-gpu">
      {/* Deep Obsidian Base Foundation */}
      <div className="absolute inset-0 bg-[#06060a]" />

      {/* Real-Time Frequency-Reactive Canvas Mesh */}
      {reactiveVisualsEnabled && (
        <AudioReactiveBackground
          primaryColor={rawColors.p}
          secondaryColor={rawColors.s}
          accentColor={rawColors.a}
        />
      )}

      {/* Hardware-Accelerated High-Performance Aurora Radial Mesh */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-out will-change-[opacity]"
        style={{
          opacity: isPlaying ? (reactiveVisualsEnabled ? 0.35 : 0.9) : 0.4,
          backgroundImage: `
            radial-gradient(circle 50vw at 15% 15%, ${palette.c1} 0%, transparent 70%),
            radial-gradient(circle 45vw at 85% 20%, ${palette.c2} 0%, transparent 65%),
            radial-gradient(circle 55vw at 20% 85%, ${palette.c3} 0%, transparent 70%),
            radial-gradient(circle 50vw at 80% 80%, ${palette.c4} 0%, transparent 65%)
          `,
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Lightweight Dark Tint Overlay */}
      <div className="absolute inset-0 bg-[#08080c]/60" />

      {/* Vignette Depth Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
    </div>
  );
};
