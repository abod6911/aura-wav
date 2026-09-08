import * as mm from 'music-metadata-browser';
import { Track } from '../types';
import { bulkSaveTracksToDexie } from '../db/dexieDB';

export interface BatchProgressCallback {
  (progress: {
    processed: number;
    total: number;
    percent: number;
    currentFileName: string;
    currentTrackTitle?: string;
  }): void;
}

/**
 * Non-blocking batch importer for 1600+ audio tracks
 * Parses ID3/Vorbis/MP4 tags, extracts embedded covers, and saves to Dexie.js
 */
export async function processAudioFilesBatch(
  files: File[],
  onProgress?: BatchProgressCallback
): Promise<Track[]> {
  const total = files.length;
  if (total === 0) return [];

  const BATCH_SIZE = 25; // Process in chunks of 25 to guarantee 60fps UI responsiveness
  const importedTracks: Track[] = [];
  const trackBlobs: { id: string; blob: Blob }[] = [];
  const artworkBlobs: { id: string; blob: Blob }[] = [];

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = files.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (file, chunkIndex) => {
        const fileIndex = i + chunkIndex;
        const trackId = `local_${Date.now()}_${fileIndex}_${Math.random().toString(36).substring(2, 7)}`;

        let title = file.name.replace(/\.[^/.]+$/, '');
        let artist = 'فنان غير معروف';
        let album = 'مكتبة محلية';
        let duration = 180;
        let trackNumber: number | undefined;
        let artworkUrl: string | undefined;

        try {
          // Parse metadata using music-metadata-browser
          const metadata = await mm.parseBlob(file, { duration: true, skipCovers: false });

          if (metadata.common.title) title = metadata.common.title.trim();
          if (metadata.common.artist) artist = metadata.common.artist.trim();
          if (metadata.common.album) album = metadata.common.album.trim();
          if (metadata.common.track?.no) trackNumber = metadata.common.track.no;
          if (metadata.format.duration && !isNaN(metadata.format.duration)) {
            duration = Math.round(metadata.format.duration);
          }

          // Extract embedded album artwork
          if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            const artBlob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
            artworkUrl = URL.createObjectURL(artBlob);
            artworkBlobs.push({ id: trackId, blob: artBlob });
          }
        } catch (err) {
          console.warn(`Could not parse tags for ${file.name}, using filename fallback:`, err);
        }

        const newTrack: Track = {
          id: trackId,
          title,
          artist,
          album,
          duration,
          trackNumber,
          artworkUrl: artworkUrl || '/logo.svg',
          coverUrl: artworkUrl || '/logo.svg',
          fileName: file.name,
          source: 'local',
          dominantColor: '#1DB954',
          accentColor: '#1DB954',
          dateAdded: Date.now(),
          file,
        };

        importedTracks.push(newTrack);
        trackBlobs.push({ id: trackId, blob: file });

        if (onProgress) {
          onProgress({
            processed: fileIndex + 1,
            total,
            percent: Math.round(((fileIndex + 1) / total) * 100),
            currentFileName: file.name,
            currentTrackTitle: title,
          });
        }
      })
    );

    // Save batch to Dexie.js to free memory
    await bulkSaveTracksToDexie(importedTracks.slice(i, i + BATCH_SIZE), trackBlobs.slice(i, i + BATCH_SIZE), artworkBlobs.slice(i, i + BATCH_SIZE));

    // Yield control to main thread so browser renders smoothly
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return importedTracks;
}
