import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
const ENABLE_AUDIO_UPLOAD = (import.meta as any).env?.VITE_ENABLE_SUPABASE_AUDIO_UPLOAD === 'true';

let client: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http')) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'aurawave-sb-auth-v1',
      },
    });
  } catch (err) {
    console.warn('[Supabase] Client initialization notice:', err);
  }
}

export const supabase = client;

/**
 * Returns true if Supabase URL and Key are configured for real authentication & lightweight sync.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(client && SUPABASE_URL && SUPABASE_KEY);
}

/**
 * Backward-compatible alias for isSupabaseConfigured.
 */
export const isCloudConfigured = isSupabaseConfigured;

/**
 * Returns true ONLY if explicit environment variable VITE_ENABLE_SUPABASE_AUDIO_UPLOAD=true is present.
 * Defaults to false so heavy audio files remain 100% on Hugging Face and avoid exceeding Supabase's 1GB limit.
 */
export function isCloudAudioUploadEnabled(): boolean {
  return Boolean(isSupabaseConfigured() && ENABLE_AUDIO_UPLOAD);
}

export function getPublicStorageUrl(bucket: 'songs' | 'covers', path: string): string {
  if (!client) return '';
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
}
