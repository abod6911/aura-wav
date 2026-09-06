export interface ExtractedColors {
  primary: string;
  secondary: string;
  tertiary: string;
  cssMesh: string;
}

const DEFAULT_COLORS: ExtractedColors = {
  primary: '#6366f1',
  secondary: '#ec4899',
  tertiary: '#10b981',
  cssMesh: `
    radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.25) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.18) 0%, transparent 60%)
  `,
};

/**
 * Extracts dominant vibrant colors from an image element or image URL
 */
export async function extractColorsFromImage(imgSrc: string): Promise<ExtractedColors> {
  if (!imgSrc || imgSrc.startsWith('data:image/svg')) {
    return DEFAULT_COLORS;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(DEFAULT_COLORS);
          return;
        }

        // Small downscaled canvas for fast processing
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size).data;
        const colorBuckets: { [key: string]: number } = {};

        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          // Skip transparent or near-black/near-white pixels
          if (a < 128) continue;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness < 25 || brightness > 235) continue;

          // Bucket colors (reduce resolution)
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;

          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }

        const sortedBuckets = Object.entries(colorBuckets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([rgb]) => rgb.split(',').map(Number));

        if (sortedBuckets.length === 0) {
          resolve(DEFAULT_COLORS);
          return;
        }

        const p = sortedBuckets[0] || [99, 102, 241];
        const s = sortedBuckets[1] || [p[0] > 128 ? p[0] - 50 : p[0] + 50, (p[1] + 80) % 255, (p[2] + 120) % 255];
        const t = sortedBuckets[2] || [s[1], s[2], s[0]];

        const primary = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
        const secondary = `rgb(${s[0]}, ${s[1]}, ${s[2]})`;
        const tertiary = `rgb(${t[0]}, ${t[1]}, ${t[2]})`;

        const cssMesh = `
          radial-gradient(circle at 20% 20%, rgba(${p[0]}, ${p[1]}, ${p[2]}, 0.35) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(${s[0]}, ${s[1]}, ${s[2]}, 0.28) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(${t[0]}, ${t[1]}, ${t[2]}, 0.2) 0%, transparent 60%)
        `;

        resolve({ primary, secondary, tertiary, cssMesh });
      } catch (e) {
        resolve(DEFAULT_COLORS);
      }
    };

    img.onerror = () => resolve(DEFAULT_COLORS);
    img.src = imgSrc;
  });
}
