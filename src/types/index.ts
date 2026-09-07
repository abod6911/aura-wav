export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  trackNumber?: number;
  year?: string | number;
  genre?: string;
  artworkUrl?: string;
  audioUrl?: string;
  fileName?: string;
  dominantColor?: string;
  secondaryColor?: string;
  lyrics?: string;
  syncedLyrics?: LyricLine[];
  file?: File;
  blob?: Blob;
  source: 'local' | 'demo';
  storageType?: 'opfs' | 'indexeddb';
  dateAdded: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  coverUrl?: string;
}

export interface EqualizerPreset {
  name: string;
  nameAr: string;
  gains: [number, number, number, number, number]; // 60Hz, 250Hz, 1kHz, 4kHz, 16kHz
}

export type RepeatMode = 'off' | 'all' | 'one';
export type ViewTab = 'library' | 'player' | 'playlists' | 'favorites' | 'settings';
