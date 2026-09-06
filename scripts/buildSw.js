import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const assetsDir = path.resolve(distDir, 'assets');
const swDistPath = path.resolve(distDir, 'sw.js');
const swPublicPath = path.resolve(__dirname, '../public/sw.js');

if (!fs.existsSync(distDir)) {
  console.log('[buildSw] dist directory does not exist yet');
  process.exit(0);
}

let assetFiles = [];
if (fs.existsSync(assetsDir)) {
  assetFiles = fs.readdirSync(assetsDir).map((f) => '/assets/' + f);
}

console.log('[buildSw] Found bundle assets to cache:', assetFiles);

const cacheVersion = 'aura-wav-v7-' + Date.now();
let swContent = fs.readFileSync(swPublicPath, 'utf8');

swContent = swContent.replace(/const CACHE_NAME = ['"].*?['"];/, "const CACHE_NAME = '" + cacheVersion + "';");
swContent = swContent.replace(
  /\/\* __BUILD_ASSETS__ \*\//,
  assetFiles.map((f) => "'" + f + "'").join(',\n  ')
);

fs.writeFileSync(swDistPath, swContent, 'utf8');
console.log('[buildSw] Injected ' + assetFiles.length + ' assets into dist/sw.js with cache: ' + cacheVersion);
