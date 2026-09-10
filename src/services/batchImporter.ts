import { Track } from '../types';
import { bulkSaveTracksToDexie } from '../db/dexieDB';
import { parseAudioFileMetadata } from './metadataParser';

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

  const BATCH_SIZE = 15; // Process in chunks of 15 to guarantee 60fps UI responsiveness
  const importedTracks: Track[] = [];
  const trackBlobs: { id: string; blob: Blob }[] = [];
  const artworkBlobs: { id: string; blob: Blob }[] = [];

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = files.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (file, chunkIndex) => {
        const fileIndex = i + chunkIndex;
        const trackId = `local_${Date.now()}_${fileIndex}_${Math.random().toString(36).substring(2, 7)}`;

        const meta = await parseAudioFileMetadata(file);

        if (meta.artworkBlob) {
          artworkBlobs.push({ id: trackId, blob: meta.artworkBlob });
        }

        const pureAudioBlob = file.slice(0, file.size, file.type || 'audio/mpeg');

        const newTrack: Track = {
          id: trackId,
          title: meta.title,
          artist: meta.artist,
          album: meta.album,
          duration: meta.duration > 0 ? meta.duration : 180,
          trackNumber: meta.trackNumber,
          artworkUrl: meta.artworkUrl,
          coverUrl: meta.artworkUrl,
          fileName: file.name,
          source: 'local',
          dominantColor: '#1DB954',
          accentColor: '#1DB954',
          dateAdded: Date.now(),
          file,
          blob: pureAudioBlob,
          lyrics: meta.lyrics,
        };

        importedTracks.push(newTrack);
        trackBlobs.push({ id: trackId, blob: pureAudioBlob });

        if (onProgress) {
          onProgress({
            processed: fileIndex + 1,
            total,
            percent: Math.round(((fileIndex + 1) / total) * 100),
            currentFileName: file.name,
            currentTrackTitle: meta.title,
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
