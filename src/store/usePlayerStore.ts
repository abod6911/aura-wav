import { create } from 'zustand';
import { Track, Playlist, RepeatMode, ViewTab, EqualizerPreset } from '../types';
import { djAudioEngine, EQ_BANDS } from '../lib/audioEngine';
import { updateMediaSession, updateMediaSessionPosition } from '../audio/mediaSession';
import { getDB, fetchOnlineArtwork } from '../lib/metadata';
import { fetchLyricsOnline } from '../services/lyricsParser';
import { DEMO_TRACKS } from '../data/demoTracks';
import { generateDemoAudioBlob } from '../audio/demoSynth';
import { resolveCatalogCover, getDefaultLibraryTracks, TRACKS_CATALOG } from '../data/tracksCatalog';

export const EQ_PRESETS: EqualizerPreset[] = [
  { name: 'Flat', nameAr: 'افتراضي متوازن', gains: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', nameAr: 'تضخيم الباس (Bass)', gains: [6, 4, 1, 0, -1] },
  { name: 'Vocal / Acoustic', nameAr: 'وضوح الصوت والفوكال', gains: [-2, 1, 4, 3, 1] },
  { name: 'Electronic / EDM', nameAr: 'موسيقى إلكترونية', gains: [5, 3, -1, 3, 5] },
  { name: 'Rock / Metal', nameAr: 'روك وحماسي', gains: [4, 2, -1, 2, 4] },
  { name: 'Hip Hop / R&B', nameAr: 'هيب هوب وآر آند بي', gains: [5, 3, 0, 1, 3] },
];

export interface ToastItem {
  id: string;
  message: string;
  icon?: string;
  type?: 'info' | 'success' | 'warning';
}

export type SleepTimerSetting = number | 'end_of_track' | null;

interface PlayerState {
  // Library & Data
  tracks: Track[];
  filteredTracks: Track[];
  searchQuery: string;
  playlists: Playlist[];
  favorites: string[];
  isLoadingLibrary: boolean;
  activeMood: string | null;

  // Playback State
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  smartAutoplay: boolean;

  // Audio Features
  automixEnabled: boolean;
  automixDuration: number;
  eqGains: [number, number, number, number, number];
  activeEqPreset: string;
  bassBoost: number;

  // YouTube Music Sleep Timer
  sleepTimerRemaining: number | null; // seconds countdown
  sleepTimerSetting: SleepTimerSetting;

  // UI Modals, Drawers & Tabs
  activeTab: ViewTab;
  expandedPlayerTab: 'main' | 'up_next' | 'lyrics' | 'related';
  isLyricsOpen: boolean;
  isEqualizerOpen: boolean;
  isQueueOpen: boolean;
  isMobilePlayerOpen: boolean;
  isSleepTimerOpen: boolean;
  isShortcutsOpen: boolean;
  isWelcomeOpen: boolean;
  isChangeArtworkOpen: boolean;
  artworkTargetTrack: Track | null;
  isOnline: boolean;
  downloadedTrackIds: string[];
  toasts: ToastItem[];

  // Actions
  initStore: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveMood: (mood: string | null) => void;
  importTracks: (newTracks: Track[]) => void;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => void;
  nextTrack: (viaAutoMix?: boolean) => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleSmartAutoplay: () => void;
  setAutoMix: (enabled: boolean, duration?: number) => void;
  toggleFavorite: (trackId: string) => Promise<void>;
  setBassBoost: (level: number) => void;
  setEqGain: (index: number, gain: number) => void;
  applyEqPreset: (preset: EqualizerPreset) => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  removeFromQueue: (index: number) => void;
  addToQueue: (track: Track) => void;
  playNextInQueue: (track: Track) => void;
  setActiveTab: (tab: ViewTab) => void;
  setExpandedPlayerTab: (tab: 'main' | 'up_next' | 'lyrics' | 'related') => void;
  setLyricsOpen: (open: boolean) => void;
  setEqualizerOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  setMobilePlayerOpen: (open: boolean) => void;
  setSleepTimerOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setWelcomeOpen: (open: boolean) => void;
  setChangeArtworkModal: (open: boolean, track?: Track | null) => void;
  updateTrackArtwork: (trackId: string, artworkBlob: Blob, artworkUrl: string) => Promise<void>;
  cleanAndRepairLibrary: () => Promise<void>;
  setIsOnline: (online: boolean) => void;
  setSleepTimer: (setting: SleepTimerSetting) => void;
  addToast: (message: string, icon?: string, type?: 'info' | 'success' | 'warning') => void;
  removeToast: (id: string) => void;
  downloadTrackForOffline: (trackId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
}

let sleepTimerInterval: any = null;

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Wire up audio engine callbacks
  djAudioEngine.setCallbacks({
    onTimeUpdate: (cur, dur) => {
      set({ currentTime: cur, duration: dur });
      updateMediaSessionPosition(dur, cur);
    },
    onPlaybackStateChange: (isPlaying) => {
      set({ isPlaying });
      const current = get().currentTrack;
      if (current) {
        updateMediaSession(current, isPlaying, getMediaSessionCallbacks(get));
      }
    },
    onTrackEnded: () => {
      const { repeatMode, currentTrack, sleepTimerSetting, addToast, volume } = get();

      // YouTube Music Sleep Timer: Stop at end of current track
      if (sleepTimerSetting === 'end_of_track') {
        djAudioEngine.fadeVolume(0, 2);
        setTimeout(() => {
          djAudioEngine.pause();
          djAudioEngine.setVolume(volume);
          set({ isPlaying: false, sleepTimerSetting: null, sleepTimerRemaining: null });
          addToast('تم إيقاف الموسيقى بواسطة مؤقت النوم 🌙', '🌙', 'info');
        }, 2000);
        return;
      }

      if (repeatMode === 'one' && currentTrack) {
        djAudioEngine.seek(0);
        djAudioEngine.play();
      } else {
        get().nextTrack(false);
      }
    },
    onAutoMixNeeded: () => {
      get().nextTrack(true);
    },
  });

  return {
    tracks: [],
    filteredTracks: [],
    searchQuery: '',
    playlists: [],
    favorites: [],
    isLoadingLibrary: true,

    currentTrack: null,
    queue: [],
    history: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.9,
    playbackRate: 1.0,
    shuffle: false,
    repeatMode: 'all',

    automixEnabled: true,
    automixDuration: 5,
    eqGains: [0, 0, 0, 0, 0],
    activeEqPreset: 'Flat',
    bassBoost: 0,

    activeMood: null,
    smartAutoplay: true,
    expandedPlayerTab: 'main',
    sleepTimerRemaining: null,
    sleepTimerSetting: null,

    activeTab: 'library',
    isLyricsOpen: false,
    isEqualizerOpen: false,
    isQueueOpen: false,
    isMobilePlayerOpen: false,
    isSleepTimerOpen: false,
    isShortcutsOpen: false,
    isWelcomeOpen: false,
    isChangeArtworkOpen: false,
    artworkTargetTrack: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    downloadedTrackIds: [],
    toasts: [],

    setWelcomeOpen: (open) => set({ isWelcomeOpen: open }),
    setIsOnline: (online) => set({ isOnline: online }),

    initStore: async () => {
      try {
        const db = await getDB();
        const [cachedTracks, favs, playlists, automixSetting, volSetting, audioBlobKeys] = await Promise.all([
          db.getAll('tracks'),
          db.getAll('favorites'),
          db.getAll('playlists'),
          db.get('settings', 'automix'),
          db.get('settings', 'volume'),
          db.getAllKeys('audioBlobs'),
        ]);

        const favIds = (favs || []).map((f) => f.id);
        const automix = automixSetting || { enabled: true, duration: 5 };
        const vol = volSetting !== undefined ? volSetting : 0.9;

        djAudioEngine.setVolume(vol);
        djAudioEngine.setAutoMix(automix.enabled, automix.duration);

        // Filter out and purge any demo tracks from previous sessions
        for (const t of cachedTracks) {
          if (t.source === 'demo' || t.id.startsWith('demo_')) {
            try {
              await db.delete('tracks', t.id);
              await db.delete('audioBlobs', t.id);
              await db.delete('artworkBlobs', t.id);
            } catch {
              // ignore
            }
          }
        }

        const realTracks = cachedTracks.filter(
          (t) => t.source !== 'demo' && !t.id.startsWith('demo_')
        );

        // Deduplication & Library Clean Migration:
        // Group tracks by fileName, trackNumber, or title::artist and purge redundant duplicate entries
        const seenSignatures = new Map<string, Track>();
        const duplicateIdsToDelete: string[] = [];
        const uniqueRealTracks: Track[] = [];

        for (const track of realTracks) {
          const fileKey = track.fileName ? `file_${track.fileName.toLowerCase().trim()}` : '';
          const numKey = track.trackNumber ? `num_${track.trackNumber}` : '';
          const titleKey = `sig_${track.title.toLowerCase().trim()}::${track.artist.toLowerCase().trim()}`;
          const sig = fileKey || numKey || titleKey;

          if (seenSignatures.has(sig)) {
            const primary = seenSignatures.get(sig)!;
            duplicateIdsToDelete.push(track.id);

            // If duplicate has an audio blob but primary does not, transfer the blob to primary!
            if (audioBlobKeys.includes(track.id) && !audioBlobKeys.includes(primary.id)) {
              try {
                const blobItem = await db.get('audioBlobs', track.id);
                if (blobItem && blobItem.blob) {
                  await db.put('audioBlobs', { id: primary.id, blob: blobItem.blob });
                  if (!audioBlobKeys.includes(primary.id)) {
                    audioBlobKeys.push(primary.id);
                  }
                }
              } catch {}
            }

            // Transfer duration if valid
            if (track.duration > 0 && (!primary.duration || primary.duration === 180)) {
              primary.duration = track.duration;
            }
          } else {
            seenSignatures.set(sig, track);
            uniqueRealTracks.push(track);
          }
        }

        // Clean up duplicate entries from IndexedDB stores
        if (duplicateIdsToDelete.length > 0) {
          console.log(`[Aura Clean] Successfully purged ${duplicateIdsToDelete.length} duplicate track records.`);
          for (const dupId of duplicateIdsToDelete) {
            try {
              await db.delete('tracks', dupId);
              await db.delete('audioBlobs', dupId);
              await db.delete('artworkBlobs', dupId);
            } catch {}
          }
          setTimeout(() => {
            get().addToast(`تم تنظيف المكتبة ودمج ${duplicateIdsToDelete.length} مسار مكرر بنجاح ✨`, '✨', 'success');
          }, 1200);
        }

        // Restore cached artwork blobs into object URLs or resolve from high-res offline catalog
        const restoredTracks: Track[] = await Promise.all(
          uniqueRealTracks.map(async (track) => {
            let artworkUrl = track.artworkUrl;

            // 1. Check local catalog first (guaranteed 640x640 official artwork)
            const catalogCover = resolveCatalogCover(track.title, track.artist, track.file?.name, track.trackNumber);
            if (catalogCover) {
              artworkUrl = catalogCover;
            } else {
              try {
                const artItem = await db.get('artworkBlobs', track.id);
                if (artItem && artItem.blob) {
                  artworkUrl = URL.createObjectURL(artItem.blob);
                }
              } catch {
                // ignore
              }
            }

            // If still SVG fallback or missing, use catalog or fallback
            if (!artworkUrl || artworkUrl.startsWith('data:image/svg')) {
              artworkUrl = catalogCover || '/logo.svg';
            }

            const updatedTrack = { ...track, artworkUrl };
            if (artworkUrl !== track.artworkUrl) {
              try {
                await db.put('tracks', updatedTrack);
              } catch {
                // ignore
              }
            }
            return updatedTrack;
          })
        );

        let finalTracks = restoredTracks;
        // Auto-populate with default 261 Liked_Songs library if empty!
        if (finalTracks.length === 0) {
          finalTracks = getDefaultLibraryTracks();
          try {
            const tx = db.transaction('tracks', 'readwrite');
            for (const tr of finalTracks) {
              await tx.store.put(tr);
            }
            await tx.done;
          } catch (err) {
            console.warn('Could not persist default library to IndexedDB:', err);
          }
        } else {
          // Ensure every catalog track has its audioUrl and fileName
          finalTracks = finalTracks.map((tr) => {
            if (!tr.audioUrl) {
              const num = tr.trackNumber || (tr.id.startsWith('track_catalog_') ? parseInt(tr.id.replace('track_catalog_', ''), 10) : undefined);
              if (num && num >= 1 && num <= TRACKS_CATALOG.length) {
                const catItem = TRACKS_CATALOG[num - 1];
                if (catItem) {
                  return { ...tr, audioUrl: catItem.audioUrl, fileName: catItem.fileName };
                }
              }
            }
            return tr;
          });
        }

        set({
          tracks: finalTracks,
          filteredTracks: finalTracks,
          favorites: favIds,
          playlists: playlists || [],
          automixEnabled: automix.enabled,
          automixDuration: automix.duration,
          volume: vol,
          downloadedTrackIds: (audioBlobKeys as string[]) || [],
          isLoadingLibrary: false,
        });
      } catch (e) {
        console.warn('Error loading from IndexedDB:', e);
        const fallbackTracks = getDefaultLibraryTracks();
        set({
          tracks: fallbackTracks,
          filteredTracks: fallbackTracks,
          isLoadingLibrary: false,
        });
      }
    },

    setSearchQuery: (query: string) => {
      const { tracks } = get();
      const q = query.toLowerCase().trim();
      const filtered = q
        ? tracks.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.artist.toLowerCase().includes(q) ||
              t.album.toLowerCase().includes(q)
          )
        : tracks;
      set({ searchQuery: query, filteredTracks: filtered });
    },

    importTracks: (newTracks: Track[]) => {
      const { tracks } = get();
      const trackMap = new Map<string, Track>();

      // Index existing tracks by id, fileName, and signature
      tracks.forEach((t) => {
        trackMap.set(t.id, t);
        if (t.fileName) trackMap.set(`file:${t.fileName.toLowerCase().trim()}`, t);
        if (t.trackNumber) trackMap.set(`num:${t.trackNumber}`, t);
        trackMap.set(`sig:${t.title.toLowerCase().trim()}::${t.artist.toLowerCase().trim()}`, t);
      });

      const updatedList = [...tracks];

      newTracks.forEach((newT) => {
        const fileKey = newT.fileName ? `file:${newT.fileName.toLowerCase().trim()}` : null;
        const numKey = newT.trackNumber ? `num:${newT.trackNumber}` : null;
        const sigKey = `sig:${newT.title.toLowerCase().trim()}::${newT.artist.toLowerCase().trim()}`;

        const match =
          trackMap.get(newT.id) ||
          (fileKey ? trackMap.get(fileKey) : null) ||
          (numKey ? trackMap.get(numKey) : null) ||
          trackMap.get(sigKey);

        if (match) {
          const idx = updatedList.findIndex((t) => t.id === match.id);
          if (idx !== -1) {
            updatedList[idx] = {
              ...updatedList[idx],
              file: newT.file || updatedList[idx].file,
              blob: newT.blob || updatedList[idx].blob,
              duration: newT.duration || updatedList[idx].duration,
              lyrics: newT.lyrics || updatedList[idx].lyrics,
              syncedLyrics: newT.syncedLyrics || updatedList[idx].syncedLyrics,
              artworkUrl:
                newT.artworkUrl && !newT.artworkUrl.includes('data:image/svg')
                  ? newT.artworkUrl
                  : updatedList[idx].artworkUrl,
            };
          }
        } else {
          updatedList.push(newT);
        }
      });

      set({
        tracks: updatedList,
        filteredTracks: updatedList,
      });
    },

    playTrack: async (track: Track, newQueue?: Track[]) => {
      const state = get();

      let playableTrack = track;
      // 1. If no in-memory file/blob, check if audioUrl is available
      // 2. If no audioUrl, try retrieving audio blob from IndexedDB
      if (!playableTrack.file && !playableTrack.blob && !playableTrack.audioUrl) {
        try {
          const db = await getDB();
          const item = await db.get('audioBlobs', track.id);
          if (item && item.blob) {
            playableTrack = { ...track, blob: item.blob };
          }
        } catch (err) {
          console.warn('Error retrieving audio blob:', err);
        }
      }

      // 3. If still no audio source, check if we have a saved FileSystemDirectoryHandle
      if (!playableTrack.file && !playableTrack.blob && !playableTrack.audioUrl && playableTrack.fileName) {
        try {
          const db = await getDB();
          const dirHandle = await db.get('settings', 'savedDirectoryHandle');
          if (dirHandle) {
            const perm = await dirHandle.queryPermission({ mode: 'read' });
            if (perm === 'granted') {
              const fileHandle = await dirHandle.getFileHandle(playableTrack.fileName);
              const file = await fileHandle.getFile();
              playableTrack = { ...playableTrack, file };
            }
          }
        } catch (err) {
          console.warn('Error reading from saved directory handle:', err);
        }
      }

      // If still completely unplayable, inform the user with an actionable toast
      if (!playableTrack.file && !playableTrack.blob && !playableTrack.audioUrl) {
        get().addToast(`تعذر تشغيل "${track.title}" - يرجى استيراد ملف الأغنية أو التأكد من توفر الملف ⚠️`, '⚠️', 'warning');
        return;
      }

      let updatedQueue = newQueue || state.queue;
      if (!newQueue && updatedQueue.length === 0) {
        updatedQueue = [...state.tracks];
      }

      updateMediaSession(playableTrack, true, getMediaSessionCallbacks(get));

      set({
        currentTrack: playableTrack,
        queue: updatedQueue,
        isPlaying: true,
      });

      await djAudioEngine.playTrack(playableTrack);

      // Auto background offline caching for streamed tracks
      if (playableTrack.audioUrl && !playableTrack.blob) {
        fetch(playableTrack.audioUrl)
          .then((res) => (res.ok ? res.blob() : null))
          .then(async (blob) => {
            if (blob) {
              const db = await getDB();
              await db.put('audioBlobs', { id: playableTrack.id, blob });
              const currentDownloaded = get().downloadedTrackIds;
              if (!currentDownloaded.includes(playableTrack.id)) {
                set({ downloadedTrackIds: [...currentDownloaded, playableTrack.id] });
              }
            }
          })
          .catch(() => {});
      }

      // Background cover art enrichment if track has fallback cover
      if (playableTrack.artworkUrl?.startsWith('data:image/svg')) {
        fetchOnlineArtwork(playableTrack.title, playableTrack.artist).then(async (artBlob) => {
          if (artBlob) {
            const newUrl = URL.createObjectURL(artBlob);
            const enriched: Track = { ...playableTrack, artworkUrl: newUrl };
            const db = await getDB();
            await db.put('artworkBlobs', { id: playableTrack.id, blob: artBlob });

            // Update in tracks list
            set((st) => ({
              currentTrack: st.currentTrack?.id === enriched.id ? enriched : st.currentTrack,
              tracks: st.tracks.map((t) => (t.id === enriched.id ? enriched : t)),
              filteredTracks: st.filteredTracks.map((t) => (t.id === enriched.id ? enriched : t)),
            }));
          }
        });
      }

      // Background lyrics fetch if needed
      if (!playableTrack.syncedLyrics || playableTrack.syncedLyrics.length === 0) {
        fetchLyricsOnline(playableTrack.title, playableTrack.artist, playableTrack.duration).then(
          (res) => {
            if (res && (res.syncedLyrics || res.plainLyrics)) {
              const updatedTrack: Track = {
                ...playableTrack,
                syncedLyrics: res.syncedLyrics,
                lyrics: res.plainLyrics || playableTrack.lyrics,
              };
              if (get().currentTrack?.id === updatedTrack.id) {
                set({ currentTrack: updatedTrack });
              }
            }
          }
        );
      }
    },

    togglePlayPause: () => {
      const { isPlaying, currentTrack, tracks } = get();
      if (!currentTrack && tracks.length > 0) {
        get().playTrack(tracks[0]);
        return;
      }
      if (isPlaying) {
        djAudioEngine.pause();
        set({ isPlaying: false });
      } else {
        djAudioEngine.play();
        set({ isPlaying: true });
      }
    },

    nextTrack: async (viaAutoMix = false) => {
      const { queue, currentTrack, shuffle, repeatMode } = get();
      if (!currentTrack || queue.length === 0) return;

      const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
      let nextIndex = -1;

      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      } else if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeatMode === 'all') {
        nextIndex = 0;
      }

      if (nextIndex >= 0 && nextIndex < queue.length) {
        const rawNext = queue[nextIndex];
        let nextTrack = rawNext;

        if (!nextTrack.file && !nextTrack.blob) {
          const db = await getDB();
          const item = await db.get('audioBlobs', nextTrack.id);
          if (item && item.blob) nextTrack = { ...rawNext, blob: item.blob };
        }

        set({
          currentTrack: nextTrack,
          history: [...get().history, currentTrack],
          isPlaying: true,
        });

        updateMediaSession(nextTrack, true, getMediaSessionCallbacks(get));

        if (viaAutoMix && get().automixEnabled) {
          await djAudioEngine.crossfadeTo(nextTrack);
        } else {
          await djAudioEngine.playTrack(nextTrack);
        }

        if (!nextTrack.syncedLyrics || nextTrack.syncedLyrics.length === 0) {
          fetchLyricsOnline(nextTrack.title, nextTrack.artist, nextTrack.duration).then((res) => {
            if (res && (res.syncedLyrics || res.plainLyrics)) {
              const updatedTrack: Track = {
                ...nextTrack,
                syncedLyrics: res.syncedLyrics,
                lyrics: res.plainLyrics || nextTrack.lyrics,
              };
              if (get().currentTrack?.id === updatedTrack.id) {
                set({ currentTrack: updatedTrack });
              }
            }
          });
        }
      } else if (get().smartAutoplay && get().tracks.length > 0 && currentTrack) {
        // Smart YouTube Music Autoplay: pick next track by same artist or random
        const allTracks = get().tracks;
        const currentA = currentTrack.artist.toLowerCase();
        const candidate =
          allTracks.find((t) => t.id !== currentTrack.id && t.artist.toLowerCase() === currentA) ||
          allTracks[Math.floor(Math.random() * allTracks.length)];

        if (candidate) {
          get().addToQueue(candidate);
          get().addToast(`تشغيل تلقائي ذكي: ${candidate.title}`, '✨');
          await get().playTrack(candidate);
        }
      } else {
        djAudioEngine.pause();
        set({ isPlaying: false });
      }
    },

    previousTrack: async () => {
      const { queue, currentTrack, currentTime } = get();
      if (!currentTrack) return;

      if (currentTime > 3) {
        djAudioEngine.seek(0);
        return;
      }

      const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex > 0) {
        const rawPrev = queue[currentIndex - 1];
        let prevTrack = rawPrev;
        if (!prevTrack.file && !prevTrack.blob) {
          const db = await getDB();
          const item = await db.get('audioBlobs', prevTrack.id);
          if (item && item.blob) prevTrack = { ...rawPrev, blob: item.blob };
        }
        await get().playTrack(prevTrack);
      } else {
        djAudioEngine.seek(0);
      }
    },

    seek: (time: number) => {
      djAudioEngine.seek(time);
      set({ currentTime: time });
    },

    setVolume: (vol: number) => {
      djAudioEngine.setVolume(vol);
      set({ volume: vol });
      getDB().then((db) => db.put('settings', vol, 'volume'));
    },

    setPlaybackRate: (rate: number) => {
      djAudioEngine.setPlaybackRate(rate);
      set({ playbackRate: rate });
    },

    toggleShuffle: () => {
      set((state) => ({ shuffle: !state.shuffle }));
    },

    cycleRepeat: () => {
      set((state) => {
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const next = modes[(modes.indexOf(state.repeatMode) + 1) % modes.length];
        return { repeatMode: next };
      });
    },

    setAutoMix: (enabled: boolean, duration?: number) => {
      const dur = duration !== undefined ? duration : get().automixDuration;
      djAudioEngine.setAutoMix(enabled, dur);
      set({ automixEnabled: enabled, automixDuration: dur });
      getDB().then((db) => db.put('settings', { enabled, duration: dur }, 'automix'));
    },

    toggleFavorite: async (trackId: string) => {
      const db = await getDB();
      const existing = await db.get('favorites', trackId);
      let isFav = false;
      if (existing) {
        await db.delete('favorites', trackId);
        isFav = false;
      } else {
        await db.put('favorites', { id: trackId, addedAt: Date.now() });
        isFav = true;
      }

      set((state) => ({
        favorites: isFav
          ? [...state.favorites, trackId]
          : state.favorites.filter((id) => id !== trackId),
      }));
    },

    setBassBoost: (level: number) => {
      const clamped = Math.max(0, Math.min(18, level));
      djAudioEngine.setBassBoost(clamped);
      set({ bassBoost: clamped });
    },

    setEqGain: (index: number, gain: number) => {
      const newGains = [...get().eqGains] as [number, number, number, number, number];
      newGains[index] = gain;
      djAudioEngine.setEqGains(newGains);
      set({ eqGains: newGains, activeEqPreset: 'Custom' });
    },

    applyEqPreset: (preset: EqualizerPreset) => {
      djAudioEngine.setEqGains(preset.gains);
      const extraBass =
        preset.name === 'Bass Boost'
          ? 10
          : preset.name === 'Hip Hop / R&B'
          ? 6
          : preset.name === 'Electronic / EDM'
          ? 7
          : 0;
      djAudioEngine.setBassBoost(extraBass);
      set({
        eqGains: [...preset.gains],
        activeEqPreset: preset.name,
        bassBoost: extraBass,
      });
      get().addToast(`تم تفعيل وضع: ${preset.nameAr}`, '🎚️', 'info');
    },

    reorderQueue: (startIndex: number, endIndex: number) => {
      const newQueue = [...get().queue];
      const [removed] = newQueue.splice(startIndex, 1);
      newQueue.splice(endIndex, 0, removed);
      set({ queue: newQueue });
    },

    removeFromQueue: (index: number) => {
      const newQueue = [...get().queue];
      newQueue.splice(index, 1);
      set({ queue: newQueue });
    },

    addToQueue: (track: Track) => {
      set((state) => ({ queue: [...state.queue, track] }));
    },

    playNextInQueue: (track: Track) => {
      const { queue, currentTrack } = get();
      const newQueue = [...queue];
      const curIdx = currentTrack ? newQueue.findIndex((t) => t.id === currentTrack.id) : -1;
      if (curIdx >= 0) {
        newQueue.splice(curIdx + 1, 0, track);
      } else {
        newQueue.unshift(track);
      }
      set({ queue: newQueue });
    },

    setActiveTab: (tab: ViewTab) => set({ activeTab: tab }),
    setExpandedPlayerTab: (tab: 'main' | 'up_next' | 'lyrics' | 'related') =>
      set({ expandedPlayerTab: tab }),
    setLyricsOpen: (open: boolean) => set({ isLyricsOpen: open }),
    setEqualizerOpen: (open: boolean) => set({ isEqualizerOpen: open }),
    setQueueOpen: (open: boolean) => set({ isQueueOpen: open }),
    setMobilePlayerOpen: (open: boolean) => set({ isMobilePlayerOpen: open }),
    setSleepTimerOpen: (open: boolean) => set({ isSleepTimerOpen: open }),
    setShortcutsOpen: (open: boolean) => set({ isShortcutsOpen: open }),
    setChangeArtworkModal: (open: boolean, track?: Track | null) =>
      set({
        isChangeArtworkOpen: open,
        artworkTargetTrack: track !== undefined ? track : get().currentTrack,
      }),

    updateTrackArtwork: async (trackId: string, artworkBlob: Blob, artworkUrl: string) => {
      const { tracks, currentTrack } = get();
      try {
        const db = await getDB();
        await db.put('artworkBlobs', { id: trackId, blob: artworkBlob });

        const updatedTracks = tracks.map((t) => {
          if (t.id === trackId) {
            const updated = { ...t, artworkUrl };
            db.put('tracks', updated).catch(() => {});
            return updated;
          }
          return t;
        });

        const isCurrent = currentTrack?.id === trackId;
        const newCurrent = isCurrent && currentTrack ? { ...currentTrack, artworkUrl } : currentTrack;

        set({
          tracks: updatedTracks,
          filteredTracks: updatedTracks,
          currentTrack: newCurrent,
        });

        if (isCurrent && newCurrent) {
          updateMediaSession(newCurrent, get().isPlaying, getMediaSessionCallbacks(get));
        }

        get().addToast('تم تحديث غلاف الأغنية بنجاح 🎨', '🎨', 'success');
      } catch (err) {
        console.warn('Error updating track artwork:', err);
        get().addToast('تعذر حفظ الغلاف الجديد', '⚠️', 'warning');
      }
    },

    cleanAndRepairLibrary: async () => {
      get().addToast('جارٍ فحص وتنظيف المكتبة...', '🧹', 'info');
      await get().initStore();
      get().addToast('تم فحص المكتبة وحفظ التغييرات بنجاح ✨', '✨', 'success');
    },

    toggleSmartAutoplay: () => {
      const next = !get().smartAutoplay;
      set({ smartAutoplay: next });
      get().addToast(
        next ? 'تم تفعيل التشغيل التلقائي الذكي ✨' : 'تم إيقاف التشغيل التلقائي',
        '✨'
      );
    },

    setSleepTimer: (setting: SleepTimerSetting) => {
      if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
      }

      if (setting === null) {
        set({ sleepTimerSetting: null, sleepTimerRemaining: null });
        get().addToast('تم إلغاء مؤقت النوم', '⏰');
        return;
      }

      if (setting === 'end_of_track') {
        set({ sleepTimerSetting: 'end_of_track', sleepTimerRemaining: null });
        get().addToast('سيتم إيقاف الموسيقى عند نهاية الأغنية الحالية 🌙', '🌙');
        return;
      }

      const totalSecs = setting * 60;
      set({ sleepTimerSetting: setting, sleepTimerRemaining: totalSecs });
      get().addToast(`تم ضبط مؤقت النوم: ${setting} دقيقة 🌙`, '🌙');

      sleepTimerInterval = setInterval(() => {
        const cur = get().sleepTimerRemaining;
        if (cur === null || cur <= 0) {
          clearInterval(sleepTimerInterval);
          sleepTimerInterval = null;
          return;
        }

        const nextSecs = cur - 1;
        if (nextSecs === 3) {
          // Smooth 3-second fade out
          djAudioEngine.fadeVolume(0, 3);
        }

        if (nextSecs <= 0) {
          clearInterval(sleepTimerInterval);
          sleepTimerInterval = null;
          djAudioEngine.pause();
          djAudioEngine.setVolume(get().volume);
          set({ isPlaying: false, sleepTimerSetting: null, sleepTimerRemaining: null });
          get().addToast('تم إيقاف الموسيقى بواسطة مؤقت النوم 🌙', '🌙');
        } else {
          set({ sleepTimerRemaining: nextSecs });
        }
      }, 1000);
    },

    addToast: (message: string, icon = '✨', type: 'info' | 'success' | 'warning' = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, message, icon, type };
      set((state) => ({ toasts: [...state.toasts.slice(-4), newToast] }));
      setTimeout(() => {
        get().removeToast(id);
      }, 3500);
    },

    removeToast: (id: string) => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    },

    setActiveMood: (mood: string | null) => {
      const { tracks } = get();
      if (!mood) {
        set({ activeMood: null, filteredTracks: tracks });
        return;
      }

      const moodKeywords: Record<string, string[]> = {
        energize: ['workout', 'dance', 'party', 'fire', 'fast', 'rock', 'hip hop', 'hyper', 'beat', 'remix', 'run', 'power'],
        relax: ['chill', 'lofi', 'slow', 'acoustic', 'piano', 'calm', 'night', 'sleep', 'r&b', 'soft', 'sad'],
        focus: ['study', 'instrumental', 'ambient', 'calm', 'electronic', 'deep', 'soundtrack', 'c418', 'minecraft'],
        commute: ['road', 'pop', 'drive', 'trip', 'summer', 'wave', 'radio', 'car', 'starships'],
        party: ['club', 'edm', 'bass', 'trap', 'loud', 'hit', 'dance', 'remix', 'drill', 'fein', 'butterfly'],
      };

      const keys = moodKeywords[mood] || [];
      const filtered = tracks.filter((t) => {
        const text = `${t.title} ${t.artist} ${t.album} ${t.genre || ''}`.toLowerCase();
        return keys.some((k) => text.includes(k));
      });

      set({ activeMood: mood, filteredTracks: filtered.length > 0 ? filtered : tracks });
    },

    createPlaylist: async (name: string) => {
      const newPl: Playlist = {
        id: `pl_${Date.now()}`,
        name,
        trackIds: [],
        createdAt: Date.now(),
      };
      const db = await getDB();
      await db.put('playlists', newPl);
      set((state) => ({ playlists: [...state.playlists, newPl] }));
    },

    deletePlaylist: async (id: string) => {
      const db = await getDB();
      await db.delete('playlists', id);
      set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) }));
    },

    addTrackToPlaylist: async (playlistId: string, trackId: string) => {
      const { playlists } = get();
      const pl = playlists.find((p) => p.id === playlistId);
      if (!pl || pl.trackIds.includes(trackId)) return;

      const updatedPl: Playlist = {
        ...pl,
        trackIds: [...pl.trackIds, trackId],
      };
      const db = await getDB();
      await db.put('playlists', updatedPl);
      set({
        playlists: playlists.map((p) => (p.id === playlistId ? updatedPl : p)),
      });
    },

    downloadTrackForOffline: async (trackId: string) => {
      const { tracks, downloadedTrackIds, addToast } = get();
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      if (downloadedTrackIds.includes(trackId)) {
        addToast(`المسار "${track.title}" محفوظ مسبقاً للأوفلاين ⚡`, undefined, 'info');
        return;
      }

      addToast(`جاري تنزيل "${track.title}" للعمل بدون إنترنت...`, undefined, 'info');

      try {
        let blob: Blob | null = track.blob || null;
        if (!blob && track.file) {
          blob = track.file;
        } else if (!blob && track.audioUrl) {
          const res = await fetch(track.audioUrl);
          if (res.ok) {
            blob = await res.blob();
          }
        }

        if (blob) {
          const db = await getDB();
          await db.put('audioBlobs', { id: track.id, blob });
          set({ downloadedTrackIds: [...get().downloadedTrackIds, trackId] });
          addToast(`تم حفظ "${track.title}" أوفلاين بنجاح ⚡`, undefined, 'success');
        } else {
          addToast(`تعذر حفظ المسار أوفلاين`, undefined, 'warning');
        }
      } catch (err) {
        console.warn('Error downloading track offline:', err);
        addToast(`خطأ أثناء الحفظ للأوفلاين`, undefined, 'warning');
      }
    },
  };
});

function getMediaSessionCallbacks(get: () => PlayerState) {
  return {
    onPlay: () => get().togglePlayPause(),
    onPause: () => get().togglePlayPause(),
    onNext: () => get().nextTrack(false),
    onPrevious: () => get().previousTrack(),
    onSeek: (t: number) => get().seek(t),
  };
}
