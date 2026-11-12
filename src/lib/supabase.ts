import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http')) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('[Supabase] Client initialization notice:', err);
  }
}

export const supabase = client;

export function isCloudConfigured(): boolean {
  return Boolean(client && SUPABASE_URL && SUPABASE_KEY);
}

export function getPublicStorageUrl(bucket: 'songs' | 'covers', path: string): string {
  if (!client) return '';
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
}
