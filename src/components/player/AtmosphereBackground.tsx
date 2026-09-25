import React, { useEffect, useRef } from 'react';

export interface AtmosphereBackgroundProps {
  primaryColor?: string; // Hex, e.g. '#6366f1'
  secondaryColor?: string; // Hex, e.g. '#ec4899'
  opacity?: number;
}

// Convert Hex to normalized RGB [0-1]
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255 || 0.1;
  const g = parseInt(clean.substring(2, 4), 16) / 255 || 0.1;
  const b = parseInt(clean.substring(4, 6), 16) / 255 || 0.15;
  return [r, g, b];
}

const VERTEX_SHADER_SRC = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform float u_opacity;

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    
    // Smooth fluid motion calculations
    vec2 posA = vec2(0.3 + 0.2 * sin(u_time * 0.4), 0.7 + 0.15 * cos(u_time * 0.3));
    vec2 posB = vec2(0.7 - 0.2 * cos(u_time * 0.35), 0.3 - 0.15 * sin(u_time * 0.45));
    
    float distA = length(st - posA);
    float distB = length(st - posB);

    // Deep smooth gradients
    float glowA = smoothstep(0.85, 0.0, distA);
    float glowB = smoothstep(0.85, 0.0, distB);

    vec3 baseDark = vec3(0.031, 0.031, 0.047); // #08080c Obsidian background
    vec3 mixedColor = baseDark + (u_colorA * glowA * 0.6) + (u_colorB * glowB * 0.5);

    gl_FragColor = vec4(mixedColor, u_opacity);
  }
`;

export const AtmosphereBackground: React.FC<AtmosphereBackgroundProps> = ({
  primaryColor = '#4f46e5',
  secondaryColor = '#9333ea',
  opacity = 0.85,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Target and current interpolated colors
  const targetColorA = useRef<[number, number, number]>(hexToRgb(primaryColor));
  const targetColorB = useRef<[number, number, number]>(hexToRgb(secondaryColor));
  const currentColorA = useRef<[number, number, number]>([...targetColorA.current]);
  const currentColorB = useRef<[number, number, number]>([...targetColorB.current]);

  useEffect(() => {
    targetColorA.current = hexToRgb(primaryColor);
    targetColorB.current = hexToRgb(secondaryColor);
  }, [primaryColor, secondaryColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, powerPreference: 'low-power' });
    if (!gl) return;

    // Helper: Compile Shader
    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER_SRC));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC));
    gl.linkProgram(program);
    gl.useProgram(program);

    // Full screen quad buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const colALoc = gl.getUniformLocation(program, 'u_colorA');
    const colBLoc = gl.getUniformLocation(program, 'u_colorB');
    const opacityLoc = gl.getUniformLocation(program, 'u_opacity');

    // Handle Resize (with low resolution factor for optimal 120 FPS throughput)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * 0.4 * dpr); // Scaled down for cheap blur
      canvas.height = Math.floor(window.innerHeight * 0.4 * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let animId: number;
    const startTime = performance.now();

    const render = () => {
      const elapsed = (performance.now() - startTime) * 0.001;

      // Color lerp (decay factor = 0.04 for slow organic transition)
      for (let i = 0; i < 3; i++) {
        currentColorA.current[i] += (targetColorA.current[i] - currentColorA.current[i]) * 0.04;
        currentColorB.current[i] += (targetColorB.current[i] - currentColorB.current[i]) * 0.04;
      }

      gl.uniform1f(timeLoc, elapsed);
      gl.uniform3fv(colALoc, currentColorA.current);
      gl.uniform3fv(colBLoc, currentColorB.current);
      gl.uniform1f(opacityLoc, opacity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [opacity]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#08080c]">
      <canvas
        ref={canvasRef}
        className="w-full h-full filter blur-[70px] scale-110 transform-gpu will-change-transform"
        style={{ transform: 'translate3d(0,0,0)' }}
      />
      {/* Noise Texture Overlay for Vinyl Warmth & Film Grain */}
      <div className="absolute inset-0 bg-repeat opacity-[0.03] mix-blend-overlay pointer-events-none" />
    </div>
  );
};
