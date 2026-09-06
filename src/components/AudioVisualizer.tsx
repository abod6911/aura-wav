import React, { useEffect, useRef } from 'react';
import { djAudioEngine } from '../lib/audioEngine';
import { usePlayerStore } from '../store/usePlayerStore';

interface AudioVisualizerProps {
  height?: number;
  bars?: number;
  mode?: 'bars' | 'wave';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  height = 50,
  bars = 48,
  mode = 'bars',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const dataArray = new Uint8Array(128);
    // Track peak heights for authentic studio bouncy peak meters
    const peaks = new Float32Array(bars).fill(0);

    const render = () => {
      animationId = requestAnimationFrame(render);

      djAudioEngine.getVisualizerData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dominant = currentTrack?.dominantColor || 'rgb(139, 92, 246)';
      const secondary = currentTrack?.secondaryColor || 'rgb(6, 182, 212)';

      // Vibrant dynamic gradient
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, dominant);
      gradient.addColorStop(0.6, secondary);
      gradient.addColorStop(1, '#ffffff');

      if (mode === 'bars') {
        const barWidth = canvas.width / bars;
        const step = Math.floor(dataArray.length / bars);

        for (let i = 0; i < bars; i++) {
          let rawVal = dataArray[i * step] || 0;
          if (!isPlaying) {
            // Gentle ambient wave when idle
            rawVal = Math.sin(Date.now() / 300 + i * 0.2) * 8 + 12;
          }

          const percent = Math.min(1, rawVal / 240);
          const barHeight = Math.max(3, percent * (canvas.height - 4));

          // Peak decay
          if (barHeight > peaks[i]) {
            peaks[i] = barHeight;
          } else {
            peaks[i] = Math.max(0, peaks[i] - 0.8);
          }

          const x = i * barWidth + barWidth * 0.15;
          const y = canvas.height - barHeight;
          const w = Math.max(2, barWidth * 0.7);
          const r = Math.min(w / 2, 4);

          // Draw main rounded frequency bar
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, w, barHeight, [r, r, 0, 0]);
          ctx.fill();

          // Draw peak dot
          if (peaks[i] > 4) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + w / 2, canvas.height - peaks[i] - 2, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Wave mode
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = gradient;
        ctx.beginPath();

        const sliceWidth = canvas.width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, currentTrack, bars, mode]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={height}
      className="w-full h-full block rounded-xl overflow-hidden pointer-events-none"
    />
  );
};
