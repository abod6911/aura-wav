export interface AmbientPalette {
  primary: string;
  secondary: string;
  accent: string;
  glowMesh: string;
}

const DEFAULT_PALETTE: AmbientPalette = {
  primary: 'rgb(124, 58, 237)', // Electric violet
  secondary: 'rgb(79, 70, 229)', // Deep indigo
  accent: 'rgb(236, 72, 153)', // Hot rose
  glowMesh: `
    radial-gradient(circle at 25% 25%, rgba(124, 58, 237, 0.45) 0%, transparent 65%),
    radial-gradient(circle at 80% 75%, rgba(79, 70, 229, 0.4) 0%, transparent 60%),
    radial-gradient(circle at 50% 85%, rgba(236, 72, 153, 0.3) 0%, transparent 65%)
  `,
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Normalizes any muddy or dirty colors into vibrant, luxurious Apple Music grade tones.
 */
function beautifyColor(r: number, g: number, b: number): [number, number, number] {
  let [h, s, l] = rgbToHsl(r, g, b);

  // If hue falls in murky yellow/muddy olive range (25° - 68°), shift away from brown
  if (h >= 25 && h <= 68) {
    // Shift towards warm vibrant amber or electric violet
    h = h < 45 ? 18 : 265;
  }

  // Boost saturation to eliminate dull grey/mud
  s = Math.max(0.65, Math.min(1.0, s * 1.35));

  // Clamp lightness between 30% and 48% for rich neon velvet glow
  l = Math.max(0.32, Math.min(0.48, l));

  return hslToRgb(h, s, l);
}

/**
 * Extracts vibrant dominant colors from an image URL / Blob for Apple Music style atmospheric glow
 */
export async function extractPaletteFromImage(imgUrl: string): Promise<AmbientPalette> {
  if (!imgUrl || imgUrl.startsWith('data:image/svg')) {
    return DEFAULT_PALETTE;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(DEFAULT_PALETTE);
          return;
        }

        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const data = ctx.getImageData(0, 0, size, size).data;
        const colorCounts: { [key: string]: number } = {};

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 128) continue;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < 25 || lum > 235) continue;

          // Normalize color before bucketing
          const [br, bg, bb] = beautifyColor(r, g, b);
          const qr = Math.round(br / 20) * 20;
          const qg = Math.round(bg / 20) * 20;
          const qb = Math.round(bb / 20) * 20;
          const key = `${qr},${qg},${qb}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([k]) => k.split(',').map(Number));

        if (sorted.length === 0) {
          resolve(DEFAULT_PALETTE);
          return;
        }

        const c1 = sorted[0];
        const c2 = sorted[1] || [c1[0] > 120 ? c1[0] - 60 : c1[0] + 60, (c1[1] + 80) % 255, (c1[2] + 120) % 255];
        const c3 = sorted[2] || [c2[1], c2[2], c2[0]];

        const primary = `rgb(${c1[0]}, ${c1[1]}, ${c1[2]})`;
        const secondary = `rgb(${c2[0]}, ${c2[1]}, ${c2[2]})`;
        const accent = `rgb(${c3[0]}, ${c3[1]}, ${c3[2]})`;

        const glowMesh = `
          radial-gradient(circle at 25% 25%, rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0.45) 0%, transparent 65%),
          radial-gradient(circle at 80% 75%, rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, 0.38) 0%, transparent 60%),
          radial-gradient(circle at 50% 85%, rgba(${c3[0]}, ${c3[1]}, ${c3[2]}, 0.28) 0%, transparent 65%)
        `;

        resolve({ primary, secondary, accent, glowMesh });
      } catch {
        resolve(DEFAULT_PALETTE);
      }
    };

    img.onerror = () => resolve(DEFAULT_PALETTE);
    img.src = imgUrl;
  });
}
