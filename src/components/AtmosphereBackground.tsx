import React, { useEffect, useState, useMemo } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { extractPaletteFromImage } from '../lib/colorSampler';

function hexToRgb(hex: string): [number, number, number] {
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16) / 255 || 0.12;
    const g = parseInt(hex.slice(3, 5), 16) / 255 || 0.72;
    const b = parseInt(hex.slice(5, 7), 16) / 255 || 0.33;
    return [r, g, b];
  }
  return [0.12, 0.72, 0.33];
}

export const AtmosphereBackground: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const reactiveVisualsEnabled = usePlayerStore((state) => state.reactiveVisualsEnabled);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [rawColors, setRawColors] = useState({
    p: '#121212',
    s: '#181818',
    a: '#1DB954',
  });

  // Extract track palette asynchronously outside render loop (Desktop only)
  useEffect(() => {
    if (isMobile) return;
    if (currentTrack?.artworkUrl) {
      extractPaletteFromImage(currentTrack.artworkUrl).then((p) => {
        setRawColors({
          p: p.primary,
          s: p.secondary,
          a: p.accent,
        });
      });
    }
  }, [currentTrack?.artworkUrl, isMobile]);

  const rgbColors = useMemo(() => {
    return {
      c1: hexToRgb(rawColors.p),
      c2: hexToRgb(rawColors.s),
      c3: hexToRgb(rawColors.a),
      c4: hexToRgb(currentTrack?.secondaryColor || rawColors.p),
    };
  }, [rawColors, currentTrack?.secondaryColor]);

  // Pure GPU-composited CSS ambient mesh (Zero WebGL/2D-canvas frame loop overhead)

  // On Mobile: pure deep obsidian with ultra-subtle ambient glow (Zero SVG turbulence haze, 100% crisp full-bleed)
  if (isMobile) {
    return (
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none bg-[#09090B]">
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{
            backgroundImage: `radial-gradient(circle 80vw at 50% 10%, rgba(var(--ambient-primary-rgb, 29, 185, 84), 0.08) 0%, transparent 65%), radial-gradient(circle 70vw at 0% 90%, rgba(var(--ambient-accent-rgb, 29, 185, 84), 0.05) 0%, transparent 60%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#060608]">
      {/* Deep Obsidian Base */}
      <div className="absolute inset-0 bg-[#060608]" />

      {/* Zero-overhead CSS Ambient Mesh (replaces dual 60-120fps WebGL + 2D blur canvases) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-out"
        style={{
          opacity: isPlaying ? (reactiveVisualsEnabled ? 0.55 : 0.75) : 0.35,
          backgroundImage: `
            radial-gradient(circle 50vw at 15% 15%, rgba(${rgbColors.c1.map((v) => Math.round(v * 255)).join(',')}, 0.25) 0%, transparent 70%),
            radial-gradient(circle 45vw at 85% 20%, rgba(${rgbColors.c2.map((v) => Math.round(v * 255)).join(',')}, 0.20) 0%, transparent 65%),
            radial-gradient(circle 55vw at 20% 85%, rgba(${rgbColors.c3.map((v) => Math.round(v * 255)).join(',')}, 0.22) 0%, transparent 70%)
          `,
        }}
      />

      {/* Lightweight Dark Tint Overlay */}
      <div className="absolute inset-0 bg-[#08080c]/50" />

      {/* Vignette Depth Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
    </div>
  );
};
