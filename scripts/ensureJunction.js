import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distSongs = path.resolve(__dirname, '../dist/songs');
const likedSongs = path.resolve(__dirname, '../../Liked_Songs');

if (!fs.existsSync(distSongs) && fs.existsSync(likedSongs)) {
  try {
    fs.symlinkSync(likedSongs, distSongs, 'junction');
    console.log('[Build] Successfully created NTFS junction to dist/songs');
  } catch (e) {
    console.warn('[Build] Junction notice:', e.message);
  }
} else if (fs.existsSync(distSongs)) {
  console.log('[Build] dist/songs junction verified');
}
