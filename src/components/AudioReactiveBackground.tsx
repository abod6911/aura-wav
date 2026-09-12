import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { djAudioEngine } from '../lib/audioEngine';

interface BlobNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  color: string;
}

export const AudioReactiveBackground: React.FC<{
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}> = ({
  primaryColor = '#1DB954',
  secondaryColor = '#10B981',
  accentColor = '#065F46',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const reactiveVisualsEnabled = usePlayerStore((state) => state.reactiveVisualsEnabled);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !reactiveVisualsEnabled) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    const freqData = new Uint8Array(32);

    // Parse color helpers
    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      if (clean.length === 3) {
        return {
          r: parseInt(clean[0] + clean[0], 16) || 29,
          g: parseInt(clean[1] + clean[1], 16) || 185,
          b: parseInt(clean[2] + clean[2], 16) || 84,
        };
      }
      return {
        r: parseInt(clean.slice(0, 2), 16) || 29,
        g: parseInt(clean.slice(2, 4), 16) || 185,
        b: parseInt(clean.slice(4, 6), 16) || 84,
      };
    };

    const c1 = hexToRgb(primaryColor);
    const c2 = hexToRgb(secondaryColor);
    const c3 = hexToRgb(accentColor);

    let width = (canvas.width = Math.floor(window.innerWidth / 2));
    let height = (canvas.height = Math.floor(window.innerHeight / 2));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = Math.floor(window.innerWidth / 2);
      height = canvas.height = Math.floor(window.innerHeight / 2);
    };
    window.addEventListener('resize', handleResize);

    const blobs: BlobNode[] = [
      {
        x: width * 0.25,
        y: height * 0.3,
        vx: 0.25,
        vy: 0.18,
        baseRadius: Math.min(width, height) * 0.45,
        color: `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.35)`,
      },
      {
        x: width * 0.75,
        y: height * 0.4,
        vx: -0.2,
        vy: 0.22,
        baseRadius: Math.min(width, height) * 0.42,
        color: `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.30)`,
      },
      {
        x: width * 0.5,
        y: height * 0.75,
        vx: 0.15,
        vy: -0.25,
        baseRadius: Math.min(width, height) * 0.5,
        color: `rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.25)`,
      },
    ];

    let smoothBass = 0;
    let smoothMid = 0;
    let phase = 0;

    const render = () => {
      if (!canvas || !ctx) return;

      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      if (isPlaying) {
        djAudioEngine.getVisualizerData(freqData);
      } else {
        freqData.fill(0);
      }

      // Extract low-end kick energy (bins 0..2)
      const rawBass = (freqData[0] + freqData[1] + freqData[2]) / 3 / 255;
      // Extract mid energy (bins 3..9)
      let midSum = 0;
      for (let i = 3; i < 10; i++) midSum += freqData[i];
      const rawMid = midSum / 7 / 255;

      // Exponential moving average smoothing for organic elasticity
      smoothBass += (rawBass - smoothBass) * 0.14;
      smoothMid += (rawMid - smoothMid) * 0.08;

      phase += 0.008 + smoothMid * 0.02;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';

      blobs.forEach((blob, idx) => {
        // Subtle drift
        blob.x += blob.vx * (1 + smoothMid);
        blob.y += blob.vy * (1 + smoothMid);

        if (blob.x < width * 0.1 || blob.x > width * 0.9) blob.vx *= -1;
        if (blob.y < height * 0.1 || blob.y > height * 0.9) blob.vy *= -1;

        // Dynamic pulsing radius based on bass kick
        const wobble = Math.sin(phase + idx * 2.1) * (width * 0.05);
        const radius = Math.max(20, blob.baseRadius * (0.85 + smoothBass * 0.5) + wobble);

        const grad = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          radius
        );

        grad.addColorStop(0, blob.color);
        grad.addColorStop(0.5, blob.color.replace(/[\d\.]+\)$/, '0.12)'));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, reactiveVisualsEnabled, primaryColor, secondaryColor, accentColor]);

  if (!reactiveVisualsEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none filter blur-2xl opacity-80 mix-blend-screen transition-opacity duration-700 transform-gpu"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
