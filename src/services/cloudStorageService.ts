import { supabase, isCloudConfigured, getPublicStorageUrl } from '../lib/supabase';
import { authService } from './authService';

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export type UploadProgressCallback = (progress: UploadProgressEvent) => void;

/**
 * Sanitizes file names for safe S3/Supabase storage keys.
 */
function sanitizeStorageKey(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Upload an audio file to Supabase Storage bucket 'songs' with real-time XHR upload progress.
 */
export async function uploadAudioToCloud(
  file: File,
  trackId: string,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; path: string }> {
  if (!isCloudConfigured() || !supabase) {
    throw new Error('CLOUD_NOT_CONFIGURED');
  }

  const user = authService.getCurrentUser();
  const userPrefix = user?.id ? `${user.id}` : 'public';
  const cleanName = sanitizeStorageKey(file.name);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
  const storagePath = `${userPrefix}/${trackId}_${Date.now()}.${ext}`;

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  // Get current session token if logged in
  let token = supabaseKey;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      token = session.access_token;
    }
  } catch {}

  // High-precision XHR upload for real-time progress events
  return new Promise<{ url: string; path: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const endpoint = `${supabaseUrl}/storage/v1/object/songs/${encodeURIComponent(storagePath)}`;

    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('apikey', supabaseKey);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
          onProgress({ loaded: e.loaded, total: e.total, percent });
        }
      };
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = getPublicStorageUrl('songs', storagePath);
        onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        resolve({ url: publicUrl, path: storagePath });
      } else {
        // Fallback to standard Supabase client upload
        try {
          const { error } = await supabase!.storage.from('songs').upload(storagePath, file, {
            upsert: true,
            contentType: file.type || 'audio/mpeg',
          });
          if (error) throw error;
          const publicUrl = getPublicStorageUrl('songs', storagePath);
          resolve({ url: publicUrl, path: storagePath });
        } catch (fbErr: any) {
          reject(new Error(fbErr.message || `Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = async () => {
      // Retry via standard Supabase client
      try {
        const { error } = await supabase!.storage.from('songs').upload(storagePath, file, {
          upsert: true,
          contentType: file.type || 'audio/mpeg',
        });
        if (error) throw error;
        const publicUrl = getPublicStorageUrl('songs', storagePath);
        resolve({ url: publicUrl, path: storagePath });
      } catch (fbErr: any) {
        reject(fbErr);
      }
    };

    xhr.send(file);
  });
}

/**
 * Upload cover artwork (Blob or File) to Supabase Storage bucket 'covers'.
 */
export async function uploadCoverToCloud(
  artworkBlobOrFile: Blob | File,
  trackId: string
): Promise<string> {
  if (!isCloudConfigured() || !supabase) {
    return '';
  }

  const user = authService.getCurrentUser();
  const userPrefix = user?.id ? `${user.id}` : 'public';
  const storagePath = `${userPrefix}/${trackId}_cover.jpg`;

  try {
    const { error } = await supabase.storage.from('covers').upload(storagePath, artworkBlobOrFile, {
      upsert: true,
      contentType: artworkBlobOrFile.type || 'image/jpeg',
    });

    if (error) {
      console.warn('[CloudStorage] Failed to upload cover:', error.message);
      return '';
    }

    return getPublicStorageUrl('covers', storagePath);
  } catch (err) {
    console.warn('[CloudStorage] Exception uploading cover:', err);
    return '';
  }
}

/**
 * Delete audio file and cover from Supabase Storage.
 */
export async function deleteFromCloudStorage(audioPath?: string, coverPath?: string): Promise<void> {
  if (!isCloudConfigured() || !supabase) return;

  try {
    if (audioPath) {
      await supabase.storage.from('songs').remove([audioPath]);
    }
    if (coverPath) {
      await supabase.storage.from('covers').remove([coverPath]);
    }
  } catch (err) {
    console.warn('[CloudStorage] Error deleting files:', err);
  }
}
