import React, { useEffect, useRef, useState } from 'react';
import { djAudioEngine } from '../../lib/audioEngine';
import { usePlayerStore } from '../../store/usePlayerStore';
import { extractPaletteFromImage } from '../../lib/colorSampler';

interface VisualizerCanvasProps {
  className?: string;
  bassSensitivity?: number; // 0.5 to 2.5
  midSensitivity?: number; // 0.5 to 2.5
  interactive?: boolean;
}

const VERT_SHADER = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_pos + 1.0) * 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAG_SHADER = `
  precision highp float;
  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_rotation;
  uniform float u_bass;
  uniform float u_mid;
  uniform vec3 u_col1;
  uniform vec3 u_col2;
  uniform vec3 u_col3;

  // Rotation matrix
  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  // Signed distance function for fluid organic 3D glass sphere
  float map(vec3 p) {
    // Apply interactive user mouse rotation
    p.yz *= rot(u_rotation.y);
    p.xz *= rot(u_rotation.x + u_time * 0.25);

    // Audio-reactive fluid displacement waves
    float displacement = sin(p.x * 4.0 + u_time * 2.0) * 
                         sin(p.y * 4.0 + u_time * 2.5) * 
                         sin(p.z * 4.0 + u_time * 2.2) * (0.08 + u_bass * 0.22);
                         
    float ripples = sin(p.y * 12.0 + u_time * 5.0) * (u_mid * 0.06);

    float sphereRadius = 1.05 + (u_bass * 0.18);
    return length(p) - sphereRadius + displacement + ripples;
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.003, 0.0);
    return normalize(vec3(
      map(p + e.xyy) - map(p - e.xyy),
      map(p + e.yxy) - map(p - e.yxy),
      map(p + e.yyx) - map(p - e.yyx)
    ));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

    vec3 ro = vec3(0.0, 0.0, -3.2); // Camera ray origin
    vec3 rd = normalize(vec3(uv, 1.35)); // Camera ray direction

    float t = 0.0;
    float hit = 0.0;
    vec3 p = ro;

    // Raymarching loop
    for (int i = 0; i < 48; i++) {
      p = ro + rd * t;
      float d = map(p);
      if (d < 0.002) {
        hit = 1.0;
        break;
      }
      if (t > 5.0) break;
      t += d * 0.85;
    }

    vec3 color = vec3(0.0);

    if (hit > 0.5) {
      vec3 n = calcNormal(p);
      vec3 l = normalize(vec3(1.2, 1.8, -2.0)); // Light direction
      vec3 v = -rd;

      // Diffuse & Specular
      float diff = max(0.0, dot(n, l));
      vec3 h = normalize(l + v);
      float spec = pow(max(0.0, dot(n, h)), 36.0);

      // Glass Fresnel edge refraction
      float fresnel = pow(1.0 - max(0.0, dot(v, n)), 3.2);

      // Chromatic dispersion
      vec3 rimCol = mix(u_col1, u_col2, fresnel);
      rimCol = mix(rimCol, u_col3, clamp(u_bass * 1.5, 0.0, 1.0));

      // Fluid interior glow
      float interior = 0.25 + 0.75 * pow(max(0.0, dot(n, vec3(0.0, 1.0, 0.0))), 2.0);
      vec3 interiorCol = mix(u_col2 * 0.4, u_col1 * 0.8, interior + u_bass * 0.5);

      color = interiorCol * 0.7 + rimCol * fresnel * 2.2 + vec3(1.0) * spec * 0.85;

      // Subtle audio pulse boost
      color += u_col3 * (u_bass * 0.4);
    } else {
      // Ambient atmospheric background glow around the glass sphere
      float glow = 1.0 / (1.0 + pow(length(uv) * 1.4, 2.5));
      color = mix(u_col1, u_col2, uv.y + 0.5) * glow * (0.15 + u_bass * 0.25);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  if (hex && hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16) / 255 || 0.12;
    const g = parseInt(hex.slice(3, 5), 16) / 255 || 0.72;
    const b = parseInt(hex.slice(5, 7), 16) / 255 || 0.33;
    return [r, g, b];
  }
  return [0.12, 0.72, 0.33];
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  className = '',
  bassSensitivity = 1.2,
  midSensitivity = 1.0,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  const [palette, setPalette] = useState({
    p: [0.11, 0.73, 0.33] as [number, number, number],
    s: [0.06, 0.72, 0.51] as [number, number, number],
    a: [0.98, 0.14, 0.24] as [number, number, number],
  });

  // Interactive mouse/touch rotation state
  const rotationRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // Update dynamic palette from album artwork
  useEffect(() => {
    if (currentTrack?.artworkUrl) {
      extractPaletteFromImage(currentTrack.artworkUrl).then((p) => {
        setPalette({
          p: hexToRgb(p.primary),
          s: hexToRgb(p.secondary),
          a: hexToRgb(p.accent),
        });
      });
    }
  }, [currentTrack?.artworkUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'high-performance' });
    } catch {
      gl = null;
    }
    if (!gl) return;

    const createShader = (type: number, src: string) => {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERT_SHADER);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!vert || !frag) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    gl.useProgram(prog);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRot = gl.getUniformLocation(prog, 'u_rotation');
    const uBass = gl.getUniformLocation(prog, 'u_bass');
    const uMid = gl.getUniformLocation(prog, 'u_mid');
    const uCol1 = gl.getUniformLocation(prog, 'u_col1');
    const uCol2 = gl.getUniformLocation(prog, 'u_col2');
    const uCol3 = gl.getUniformLocation(prog, 'u_col3');

    let animId: number;
    const freqData = new Uint8Array(128);
    let smoothedBass = 0;
    let smoothedMid = 0;
    let isRunning = typeof document === 'undefined' ? true : !document.hidden;

    const render = (time: number) => {
      if (!isRunning) return;
      animId = requestAnimationFrame(render);

      // Sample AnalyserNode frequencies
      if (isPlaying) {
        djAudioEngine.getVisualizerData(freqData);

        // Sub-bass (approx bins 1 to 5)
        let bassSum = 0;
        for (let i = 1; i <= 5; i++) bassSum += freqData[i] || 0;
        const currentBass = (bassSum / 5 / 255.0) * bassSensitivity;

        // Mid frequencies (approx bins 10 to 30)
        let midSum = 0;
        for (let i = 10; i <= 30; i++) midSum += freqData[i] || 0;
        const currentMid = (midSum / 20 / 255.0) * midSensitivity;

        // Smooth interpolation
        smoothedBass += (currentBass - smoothedBass) * 0.18;
        smoothedMid += (currentMid - smoothedMid) * 0.14;
      } else {
        smoothedBass += (0 - smoothedBass) * 0.08;
        smoothedMid += (0 - smoothedMid) * 0.08;
      }

      gl!.viewport(0, 0, canvas.width, canvas.height);
      gl!.uniform2f(uRes, canvas.width, canvas.height);
      gl!.uniform1f(uTime, time * 0.001);
      gl!.uniform2f(uRot, rotationRef.current.x, rotationRef.current.y);
      gl!.uniform1f(uBass, Math.min(1.5, smoothedBass));
      gl!.uniform1f(uMid, Math.min(1.5, smoothedMid));
      gl!.uniform3fv(uCol1, palette.p);
      gl!.uniform3fv(uCol2, palette.s);
      gl!.uniform3fv(uCol3, palette.a);

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
        gl!.deleteBuffer(quad);
        gl!.deleteProgram(prog);
        gl!.deleteShader(vert);
        gl!.deleteShader(frag);
      } catch {}
    };
  }, [palette, isPlaying, bassSensitivity, midSensitivity]);

  // Pointer Interaction Handlers for 3D Camera Orbit
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !interactive) return;
    const deltaX = e.clientX - lastPointerRef.current.x;
    const deltaY = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    rotationRef.current.x += deltaX * 0.008;
    rotationRef.current.y = Math.max(-1.0, Math.min(1.0, rotationRef.current.y + deltaY * 0.008));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none touch-none ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
