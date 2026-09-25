import React, { useEffect, useRef, useState, useMemo } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { extractPaletteFromImage } from '../lib/colorSampler';
import { AudioReactiveBackground } from './AudioReactiveBackground';

// Minimal WebGL Vertex Shader: full-screen quad
const VERT_SRC = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_pos + 1.0) * 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

// Optimized Fragment Shader: Liquid Aurora mesh on GPU
const FRAG_SRC = `
  precision mediump float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform float u_intensity;
  uniform vec3 u_c1;
  uniform vec3 u_c2;
  uniform vec3 u_c3;
  uniform vec3 u_c4;

  void main() {
    vec2 uv = v_uv;
    
    // Low-frequency gentle fluid warp
    float t = u_time * 0.25;
    float w1 = sin(uv.x * 2.5 + t) * 0.5 + 0.5;
    float w2 = cos(uv.y * 3.0 - t * 0.8) * 0.5 + 0.5;
    float w3 = sin((uv.x + uv.y) * 2.0 + t * 0.5) * 0.5 + 0.5;

    // Organic radial falloffs
    float d1 = distance(uv, vec2(0.2 + 0.1 * sin(t), 0.2 + 0.1 * cos(t)));
    float d2 = distance(uv, vec2(0.8 - 0.1 * cos(t), 0.3 + 0.1 * sin(t)));
    float d3 = distance(uv, vec2(0.3 + 0.1 * cos(t), 0.85 - 0.1 * sin(t)));
    float d4 = distance(uv, vec2(0.85 + 0.05 * sin(t), 0.8 + 0.05 * cos(t)));

    float a1 = smoothstep(0.9, 0.0, d1) * 0.65;
    float a2 = smoothstep(0.85, 0.0, d2) * 0.55;
    float a3 = smoothstep(0.95, 0.0, d3) * 0.5;
    float a4 = smoothstep(0.8, 0.0, d4) * 0.45;

    vec3 col = vec3(0.024, 0.024, 0.04); // Deep obsidian base
    col += u_c1 * a1 * w1;
    col += u_c2 * a2 * w2;
    col += u_c3 * a3 * w3;
    col += u_c4 * a4;

    // Vignette
    float vig = 1.0 - smoothstep(0.35, 1.4, distance(uv, vec2(0.5)));
    col *= vig;

    gl_FragColor = vec4(col * u_intensity, 1.0);
  }
`;

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  const [rawColors, setRawColors] = useState({
    p: '#1DB954',
    s: '#10B981',
    a: '#065F46',
  });

  // Extract track palette asynchronously outside render loop
  useEffect(() => {
    if (currentTrack?.artworkUrl) {
      extractPaletteFromImage(currentTrack.artworkUrl).then((p) => {
        setRawColors({
          p: p.primary,
          s: p.secondary,
          a: p.accent,
        });
      });
    }
  }, [currentTrack?.artworkUrl]);

  const rgbColors = useMemo(() => {
    return {
      c1: hexToRgb(rawColors.p),
      c2: hexToRgb(rawColors.s),
      c3: hexToRgb(rawColors.a),
      c4: hexToRgb(currentTrack?.secondaryColor || rawColors.p),
    };
  }, [rawColors, currentTrack?.secondaryColor]);

  // High-performance WebGL Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    } catch {
      gl = null;
    }

    if (!gl) {
      setWebglSupported(false);
      return;
    }

    // Compile shaders
    const createShader = (type: number, src: string) => {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERT_SRC);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) {
      setWebglSupported(false);
      return;
    }

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setWebglSupported(false);
      return;
    }

    gl.useProgram(prog);

    // Quad geometry: two triangles covering -1 to +1
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(prog, 'u_time');
    const intensityLoc = gl.getUniformLocation(prog, 'u_intensity');
    const c1Loc = gl.getUniformLocation(prog, 'u_c1');
    const c2Loc = gl.getUniformLocation(prog, 'u_c2');
    const c3Loc = gl.getUniformLocation(prog, 'u_c3');
    const c4Loc = gl.getUniformLocation(prog, 'u_c4');

    let animId: number;
    let isRunning = typeof document === 'undefined' ? true : !document.hidden;

    const render = (now: number) => {
      if (!isRunning) return;
      animId = requestAnimationFrame(render);

      const targetIntensity = isPlaying ? (reactiveVisualsEnabled ? 0.45 : 0.85) : 0.35;

      gl!.uniform1f(timeLoc, now * 0.001);
      gl!.uniform1f(intensityLoc, targetIntensity);
      gl!.uniform3fv(c1Loc, rgbColors.c1);
      gl!.uniform3fv(c2Loc, rgbColors.c2);
      gl!.uniform3fv(c3Loc, rgbColors.c3);
      gl!.uniform3fv(c4Loc, rgbColors.c4);

      gl!.drawArrays(gl.TRIANGLES, 0, 6);
    };

    animId = requestAnimationFrame(render);

    const handleVisibility = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animId);
      } else {
        if (!isRunning) {
          isRunning = true;
          animId = requestAnimationFrame(render);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibility);
      try {
        gl!.deleteBuffer(quadBuf);
        gl!.deleteProgram(prog);
        gl!.deleteShader(vert);
        gl!.deleteShader(frag);
      } catch {}
    };
  }, [rgbColors, isPlaying, reactiveVisualsEnabled]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#050508] transform-gpu">
      {/* Deep Obsidian Base */}
      <div className="absolute inset-0 bg-[#06060a]" />

      {/* Real-Time Frequency-Reactive Canvas Mesh */}
      {reactiveVisualsEnabled && (
        <AudioReactiveBackground
          primaryColor={rawColors.p}
          secondaryColor={rawColors.s}
          accentColor={rawColors.a}
        />
      )}

      {/* WebGL GPU Fragment Shader Aurora */}
      {webglSupported ? (
        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out will-change-transform"
          style={{
            transform: 'translate3d(0, 0, 0)',
            opacity: isPlaying ? 1 : 0.6,
          }}
        />
      ) : (
        /* CSS GPU Compositing Fallback */
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-out will-change-transform"
          style={{
            opacity: isPlaying ? (reactiveVisualsEnabled ? 0.35 : 0.9) : 0.4,
            backgroundImage: `
              radial-gradient(circle 50vw at 15% 15%, ${rawColors.p}40 0%, transparent 70%),
              radial-gradient(circle 45vw at 85% 20%, ${rawColors.s}33 0%, transparent 65%),
              radial-gradient(circle 55vw at 20% 85%, ${rawColors.a}38 0%, transparent 70%)
            `,
            transform: 'translate3d(0, 0, 0)',
          }}
        />
      )}

      {/* Lightweight Dark Tint Overlay */}
      <div className="absolute inset-0 bg-[#08080c]/50" />

      {/* Vignette Depth Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
    </div>
  );
};
