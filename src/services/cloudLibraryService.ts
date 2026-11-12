import { supabase, isCloudConfigured } from '../lib/supabase';
import { Track } from '../types';
import { deleteFromCloudStorage } from './cloudStorageService';

export interface DbTrackRow {
  id: string;
  user_id?: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audio_url: string;
  cover_url?: string | null;
  lyrics?: string | null;
  synced_lyrics?: any | null;
  bpm?: number | null;
  key?: string | null;
  genre?: string | null;
  year?: number | string | null;
  track_number?: number | null;
  file_name?: string | null;
  file_size?: number | null;
  dominant_color?: string | null;
  accent_color?: string | null;
  created_at?: string;
}

/**
 * Maps a Postgres row from `public.tracks` to the application's native `Track` interface.
 */
export function mapRowToTrack(row: DbTrackRow): Track {
  return {
    id: row.id,
    title: row.title || 'Untitled Track',
    artist: row.artist || 'Unknown Artist',
    album: row.album || 'Single',
    duration: Math.round(row.duration || 0),
    audioUrl: row.audio_url,
    artworkUrl: row.cover_url || '/logo.svg',
    coverUrl: row.cover_url || '/logo.svg',
    lyrics: row.lyrics || undefined,
    syncedLyrics: Array.isArray(row.synced_lyrics) ? row.synced_lyrics : undefined,
    bpm: row.bpm ? Number(row.bpm) : undefined,
    key: row.key || undefined,
    genre: row.genre || undefined,
    year: row.year || undefined,
    trackNumber: row.track_number ? Number(row.track_number) : undefined,
    fileName: row.file_name || undefined,
    dominantColor: row.dominant_color || undefined,
    accentColor: row.accent_color || row.dominant_color || undefined,
    source: 'online',
    dateAdded: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

/**
 * Maps the application `Track` interface to a Postgres row for insertion.
 */
export function mapTrackToRow(track: Track, userId?: string): DbTrackRow {
  return {
    id: track.id,
    user_id: userId,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    album: track.album || 'Single',
    duration: track.duration || 0,
    audio_url: track.audioUrl || '',
    cover_url: track.artworkUrl || track.coverUrl || null,
    lyrics: track.lyrics || null,
    synced_lyrics: track.syncedLyrics ? JSON.stringify(track.syncedLyrics) : null,
    bpm: track.bpm || null,
    key: track.key || null,
    genre: track.genre || null,
    year: track.year || null,
    track_number: track.trackNumber || null,
    file_name: track.fileName || null,
    dominant_color: track.dominantColor || null,
    accent_color: track.accentColor || null,
  };
}

/**
 * Fetch all available cloud tracks ordered by latest addition.
 */
export async function fetchCloudTracks(): Promise<Track[]> {
  if (!isCloudConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[CloudLibrary] Failed to query tracks:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((row) => mapRowToTrack(row as DbTrackRow));
  } catch (err) {
    console.warn('[CloudLibrary] Exception querying cloud tracks:', err);
    return [];
  }
}

/**
 * Insert or upsert a track record into `public.tracks`.
 */
export async function insertCloudTrack(track: Track, userId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isCloudConfigured() || !supabase) {
    return { success: false, error: 'CLOUD_NOT_CONFIGURED' };
  }

  try {
    const row = mapTrackToRow(track, userId);
    const { error } = await supabase.from('tracks').upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('[CloudLibrary] Error saving track to DB:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown DB error' };
  }
}

/**
 * Delete a track from both `public.tracks` and cloud storage.
 */
export async function deleteCloudTrack(track: Track): Promise<boolean> {
  if (!isCloudConfigured() || !supabase) {
    return false;
  }

  try {
    // 1. Delete from DB
    const { error } = await supabase.from('tracks').delete().eq('id', track.id);
    if (error) {
      console.warn('[CloudLibrary] Failed to delete track record:', error.message);
      return false;
    }

    // 2. Clean up storage files if storage paths are extractable
    let audioPath: string | undefined;
    if (track.audioUrl && track.audioUrl.includes('/storage/v1/object/public/songs/')) {
      audioPath = track.audioUrl.split('/storage/v1/object/public/songs/')[1];
    }
    let coverPath: string | undefined;
    if (track.artworkUrl && track.artworkUrl.includes('/storage/v1/object/public/covers/')) {
      coverPath = track.artworkUrl.split('/storage/v1/object/public/covers/')[1];
    }

    await deleteFromCloudStorage(audioPath, coverPath);
    return true;
  } catch (err) {
    console.warn('[CloudLibrary] Exception deleting cloud track:', err);
    return false;
  }
}
