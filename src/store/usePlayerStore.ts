import { create } from 'zustand';
import { Track, Playlist, RepeatMode, ViewTab, EqualizerPreset } from '../types';
import { djAudioEngine, EQ_BANDS, AutoMixStyle } from '../lib/audioEngine';
import { updateMediaSession, updateMediaSessionPosition } from '../audio/mediaSession';
import { getDB, fetchOnlineArtwork } from '../lib/metadata';
import { fetchLyricsOnline } from '../services/lyricsParser';
import { DEMO_TRACKS } from '../data/demoTracks';
import { generateDemoAudioBlob } from '../audio/demoSynth';
import { resolveCatalogCover, resolveCatalogTrackItem, getDefaultLibraryTracks, TRACKS_CATALOG } from '../data/tracksCatalog';

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
  automixStyle: AutoMixStyle;
  isAutoMixingLive: boolean;
  eqGains: [number, number, number, number, number];
  activeEqPreset: string;
  bassBoost: number;
  spatialAudio: boolean;

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
  isSoundboardOpen: boolean;
  isAutoMixModalOpen: boolean;
  artworkTargetTrack: Track | null;
  isOnline: boolean;
  downloadedTrackIds: string[];
  downloadAllProgress: { current: number; total: number } | null;
  toasts: ToastItem[];

  // Persistent Folder Engine
  savedFolderName: string | null;
  savedFolderTrackCount: number;
  savedFolderTimestamp: number | null;

  // Actions
  initStore: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveMood: (mood: string | null) => void;
  setSavedFolderName: (name: string) => void;
  importTracks: (newTracks: Track[], folderName?: string) => Promise<void>;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => void;
  nextTrack: (options?: { forceImmediate?: boolean } | boolean) => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleSmartAutoplay: () => void;
  setAutoMix: (enabled: boolean, duration?: number) => void;
  setAutomixStyle: (style: AutoMixStyle) => void;
  setSoundboardOpen: (open: boolean) => void;
  setAutoMixModalOpen: (open: boolean) => void;
  playDJSound: (effect: 'scratch' | 'airhorn' | 'echo_drop' | 'laser' | 'cheer') => void;
  toggleFavorite: (trackId: string) => Promise<void>;
  setBassBoost: (level: number) => void;
  toggleSpatialAudio: () => void;
  setSpatialAudio: (enabled: boolean) => void;
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
  cacheAllAvailableTracksOffline: () => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
}

let sleepTimerInterval: any = null;

export const resolveTrackAudioSource = async (tr: Track): Promise<Track> => {
  let resolved = tr;
  if (!resolved.file && !resolved.blob) {
    try {
      const db = await getDB();
      let item = await db.get('audioBlobs', resolved.id);
      if (!item && resolved.trackNumber) {
        item = await db.get('audioBlobs', `track_catalog_${resolved.trackNumber}`);
      }
      if (item && item.blob) resolved = { ...resolved, blob: item.blob };
    } catch {}
  }
  if (!resolved.file && !resolved.blob && !resolved.audioUrl && resolved.fileName) {
    try {
      const db = await getDB();
      const dirHandle = await db.get('settings', 'savedDirectoryHandle');
      if (dirHandle) {
        const perm = await dirHandle.queryPermission({ mode: 'read' });
        if (perm === 'granted') {
          const fileHandle = await dirHandle.getFileHandle(resolved.fileName);
          const file = await fileHandle.getFile();
          resolved = { ...resolved, file };
        }
      }
    } catch {}
  }
  return resolved;
};

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
        get().nextTrack({ forceImmediate: false });
      }
    },
    onPreloadNeeded: async (currentTrack) => {
      const { queue, tracks, shuffle, repeatMode } = get();
      const effectiveQueue = queue.length > 0 ? queue : tracks;
      if (effectiveQueue.length === 0) return;

      let currentIndex = effectiveQueue.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex === -1 && currentTrack.trackNumber) {
        currentIndex = effectiveQueue.findIndex((t) => t.trackNumber === currentTrack.trackNumber);
      }
      if (currentIndex === -1) {
        const curTitle = currentTrack.title.toLowerCase().trim();
        currentIndex = effectiveQueue.findIndex((t) => t.title.toLowerCase().trim() === curTitle);
      }

      let nextIndex = -1;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * effectiveQueue.length);
      } else if (currentIndex >= 0 && currentIndex < effectiveQueue.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeatMode === 'all' || currentIndex === -1) {
        nextIndex = 0;
      } else if (repeatMode === 'one') {
        nextIndex = currentIndex >= 0 ? currentIndex : 0;
      }

      if (nextIndex >= 0 && nextIndex < effectiveQueue.length) {
        let candidate = await resolveTrackAudioSource(effectiveQueue[nextIndex]);
        if (!candidate.file && !candidate.blob && !candidate.audioUrl) {
          for (let offset = 1; offset <= Math.min(10, effectiveQueue.length); offset++) {
            const candIdx = (nextIndex + offset) % effectiveQueue.length;
            const cand = await resolveTrackAudioSource(effectiveQueue[candIdx]);
            if (cand.file || cand.blob || cand.audioUrl) {
              candidate = cand;
              break;
            }
          }
        }
        if (candidate.file || candidate.blob || candidate.audioUrl) {
          djAudioEngine.preloadNextTrack(candidate);
        }
      }
    },
    onAutoMixNeeded: () => {
      get().nextTrack({ forceImmediate: false });
    },
    onAutoMixStateChange: (isMixing) => {
      set({ isAutoMixingLive: isMixing });
    },
    onMidpointReached: (incomingTrack) => {
      // Exactly at 50% power crossing point, switch MediaSession & UI metadata
      const current = get().currentTrack;
      set({
        currentTrack: incomingTrack,
        history: current ? [...get().history, current] : get().history,
      });
      updateMediaSession(incomingTrack, true, getMediaSessionCallbacks(get));
    },
    onTransitionComplete: (newTrack) => {
      set({ currentTrack: newTrack, isAutoMixingLive: false });
      if (!newTrack.syncedLyrics || newTrack.syncedLyrics.length === 0) {
        fetchLyricsOnline(newTrack.title, newTrack.artist, newTrack.duration).then((res) => {
          if (res && (res.syncedLyrics || res.plainLyrics)) {
            const updated: Track = {
              ...newTrack,
              syncedLyrics: res.syncedLyrics,
              lyrics: res.plainLyrics || newTrack.lyrics,
            };
            if (get().currentTrack?.id === updated.id) {
              set({ currentTrack: updated });
            }
          }
        });
      }
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
    automixStyle: (typeof localStorage !== 'undefined' && (localStorage.getItem('aura_automix_style') as AutoMixStyle)) || 'crossfade',
    isAutoMixingLive: false,
    eqGains: [0, 0, 0, 0, 0],
    activeEqPreset: 'Flat',
    bassBoost: 0,
    spatialAudio: false,

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
    isSoundboardOpen: false,
    isAutoMixModalOpen: false,
    artworkTargetTrack: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    downloadedTrackIds: [],
    downloadAllProgress: null,
    toasts: [],
    savedFolderName: 'Liked_Songs',
    savedFolderTrackCount: 0,
    savedFolderTimestamp: null,

    setWelcomeOpen: (open) => set({ isWelcomeOpen: open }),
    setIsOnline: (online) => set({ isOnline: online }),
    setSavedFolderName: (name) => {
      set({ savedFolderName: name });
      getDB().then((db) => {
        db.put('settings', name, 'savedFolderName').catch(() => {});
      });
    },

    initStore: async () => {
      try {
        const db = await getDB();
        const [
          cachedTracks,
          favs,
          playlists,
          automixSetting,
          volSetting,
          audioBlobKeys,
          savedFolderNameVal,
          savedFolderTrackCountVal,
          savedFolderTimestampVal,
          savedDirNameVal,
        ] = await Promise.all([
          db.getAll('tracks'),
          db.getAll('favorites'),
          db.getAll('playlists'),
          db.get('settings', 'automix'),
          db.get('settings', 'volume'),
          db.getAllKeys('audioBlobs'),
          db.get('settings', 'savedFolderName'),
          db.get('settings', 'savedFolderTrackCount'),
          db.get('settings', 'savedFolderTimestamp'),
          db.get('settings', 'savedDirectoryName'),
        ]);

        const resolvedFolderName = savedFolderNameVal || savedDirNameVal || 'Liked_Songs';

        const favIds = (favs || []).map((f) => f.id);
        const automix = automixSetting || { enabled: true, duration: 5 };
        const vol = volSetting !== undefined ? volSetting : 0.9;

        djAudioEngine.setVolume(vol);
        djAudioEngine.setAutoMix(automix.enabled, automix.duration);
        djAudioEngine.setAutoMixStyle(get().automixStyle);

        set({
          volume: vol,
          automixEnabled: automix.enabled,
          automixDuration: automix.duration,
          favorites: favIds,
        });

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

        // Canonical Catalog Slot Mapping & Auto-Healing Deduplication:
        // Anchors all 1..261 songs to canonical IDs track_catalog_1..261 and preserves original order
        const catalogSlots = new Map<number, Track>();
        const nonCatalogTracks: Track[] = [];
        const duplicateIdsToDelete: string[] = [];

        for (const track of realTracks) {
          const catItem = resolveCatalogTrackItem(track.fileName, track.title, track.artist, track.trackNumber);
          if (catItem) {
            const canonicalId = `track_catalog_${catItem.number}`;
            const existingInSlot = catalogSlots.get(catItem.number);

            // If track record had a non-canonical or duplicate ID
            if (track.id !== canonicalId) {
              duplicateIdsToDelete.push(track.id);
            }

            // If this old/duplicate record had an audio blob, transfer it to canonicalId
            if (audioBlobKeys.includes(track.id) && !audioBlobKeys.includes(canonicalId)) {
              try {
                const blobItem = await db.get('audioBlobs', track.id);
                if (blobItem && blobItem.blob) {
                  await db.put('audioBlobs', { id: canonicalId, blob: blobItem.blob });
                  if (!audioBlobKeys.includes(canonicalId)) {
                    audioBlobKeys.push(canonicalId);
                  }
                }
              } catch {}
            }

            if (!existingInSlot) {
              catalogSlots.set(catItem.number, {
                ...track,
                id: canonicalId,
                trackNumber: catItem.number,
                title: catItem.title,
                artist: catItem.artists,
                album: catItem.album,
                artworkUrl: catItem.coverUrl,
                audioUrl: catItem.audioUrl,
                fileName: track.fileName || catItem.fileName,
                duration: track.duration > 0 ? track.duration : 180,
              });
            } else {
              // Merge blob / metadata into the primary slot
              if (track.blob || track.file) {
                existingInSlot.blob = track.blob || existingInSlot.blob;
                existingInSlot.file = track.file || existingInSlot.file;
              }
              if (track.duration > 0 && (!existingInSlot.duration || existingInSlot.duration === 180)) {
                existingInSlot.duration = track.duration;
              }
              if (track.lyrics && !existingInSlot.lyrics) {
                existingInSlot.lyrics = track.lyrics;
                existingInSlot.syncedLyrics = track.syncedLyrics;
              }
            }
          } else {
            nonCatalogTracks.push(track);
          }
        }

        // Fill any missing catalog slots (1 to 261) with default catalog templates
        const defaultTracks = getDefaultLibraryTracks();
        for (let num = 1; num <= 261; num++) {
          if (!catalogSlots.has(num)) {
            const defTrack = defaultTracks[num - 1];
            if (defTrack) {
              catalogSlots.set(num, defTrack);
            }
          }
        }

        // Combine all 261 catalog tracks strictly sorted 1..261, followed by non-catalog tracks
        const uniqueRealTracks: Track[] = [];
        for (let num = 1; num <= 261; num++) {
          const t = catalogSlots.get(num);
          if (t) uniqueRealTracks.push(t);
        }
        uniqueRealTracks.push(...nonCatalogTracks);

        // Clean up duplicate/corrupt entries from IndexedDB stores
        if (duplicateIdsToDelete.length > 0) {
          console.log(`[Aura Clean] Successfully purged ${duplicateIdsToDelete.length} redundant track records.`);
          for (const dupId of duplicateIdsToDelete) {
            try {
              await db.delete('tracks', dupId);
              await db.delete('audioBlobs', dupId);
              await db.delete('artworkBlobs', dupId);
            } catch {}
          }
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

        const finalFolderCount = savedFolderTrackCountVal || finalTracks.length;
        if (!savedFolderNameVal) {
          try {
            await db.put('settings', resolvedFolderName, 'savedFolderName');
            await db.put('settings', finalFolderCount, 'savedFolderTrackCount');
            await db.put('settings', Date.now(), 'savedFolderTimestamp');
          } catch {}
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
          savedFolderName: resolvedFolderName,
          savedFolderTrackCount: finalFolderCount,
          savedFolderTimestamp: savedFolderTimestampVal || Date.now(),
          isLoadingLibrary: false,
        });
      } catch (e) {
        console.warn('Error loading from IndexedDB:', e);
        const fallbackTracks = getDefaultLibraryTracks();
        set({
          tracks: fallbackTracks,
          filteredTracks: fallbackTracks,
          savedFolderName: 'Liked_Songs',
          savedFolderTrackCount: fallbackTracks.length,
          savedFolderTimestamp: Date.now(),
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

    importTracks: async (newTracks: Track[], folderName?: string) => {
      const { tracks, downloadedTrackIds } = get();

      // Ensure baseList has the 261 catalog tracks
      let baseList = tracks.length > 0 ? [...tracks] : getDefaultLibraryTracks();
      const updatedBlobIds = new Set<string>(downloadedTrackIds);

      newTracks.forEach((newT) => {
        // Match incoming track to a canonical catalog slot (1..261)
        const catItem = resolveCatalogTrackItem(newT.fileName, newT.title, newT.artist, newT.trackNumber);
        const targetNum = catItem ? catItem.number : newT.trackNumber;
        const targetId = catItem ? `track_catalog_${catItem.number}` : newT.id;

        if (newT.blob || newT.file) {
          updatedBlobIds.add(targetId);
        }

        // Find existing slot in baseList
        let targetIdx = -1;
        if (catItem) {
          targetIdx = baseList.findIndex((t) => t.id === targetId || t.trackNumber === catItem.number);
        }
        if (targetIdx === -1 && targetNum) {
          targetIdx = baseList.findIndex((t) => t.trackNumber === targetNum);
        }
        if (targetIdx === -1 && newT.fileName) {
          const fn = newT.fileName.toLowerCase().trim();
          targetIdx = baseList.findIndex((t) => t.fileName && t.fileName.toLowerCase().trim() === fn);
        }
        if (targetIdx === -1) {
          const sig = `${newT.title.toLowerCase().trim()}::${newT.artist.toLowerCase().trim()}`;
          targetIdx = baseList.findIndex((t) => `${t.title.toLowerCase().trim()}::${t.artist.toLowerCase().trim()}` === sig);
        }

        if (targetIdx !== -1) {
          // UPDATE IN PLACE at the exact existing slot!
          baseList[targetIdx] = {
            ...baseList[targetIdx],
            id: targetId,
            trackNumber: targetNum || baseList[targetIdx].trackNumber,
            file: newT.file || baseList[targetIdx].file,
            blob: newT.blob || baseList[targetIdx].blob,
            duration: newT.duration > 0 ? newT.duration : baseList[targetIdx].duration,
            lyrics: newT.lyrics || baseList[targetIdx].lyrics,
            syncedLyrics: newT.syncedLyrics || baseList[targetIdx].syncedLyrics,
            artworkUrl: catItem ? catItem.coverUrl : (newT.artworkUrl || baseList[targetIdx].artworkUrl),
            fileName: newT.fileName || baseList[targetIdx].fileName,
            source: 'local',
          };
        } else {
          // Non-catalog track
          baseList.push(newT);
        }
      });

      // Strict sort: Keep catalog tracks in order 1..261
      baseList.sort((a, b) => {
        const numA = a.trackNumber ?? 99999;
        const numB = b.trackNumber ?? 99999;
        if (numA !== numB) return numA - numB;
        return a.title.localeCompare(b.title);
      });

      const targetFolder = folderName || get().savedFolderName || 'Liked_Songs';

      set({
        tracks: baseList,
        filteredTracks: baseList,
        savedFolderName: targetFolder,
        savedFolderTrackCount: baseList.length,
        savedFolderTimestamp: Date.now(),
        downloadedTrackIds: Array.from(updatedBlobIds),
      });

      // Persist tracks and folder metadata into IndexedDB
      try {
        const db = await getDB();
        await db.put('settings', targetFolder, 'savedFolderName');
        await db.put('settings', baseList.length, 'savedFolderTrackCount');
        await db.put('settings', Date.now(), 'savedFolderTimestamp');

        const tx = db.transaction('tracks', 'readwrite');
        for (const tr of baseList) {
          const { file: _f, blob: _b, ...serializable } = tr;
          await tx.store.put(serializable as Track);
          if (tr.blob) {
            try {
              await db.put('audioBlobs', { id: tr.id, blob: tr.blob });
              if (tr.trackNumber) {
                await db.put('audioBlobs', { id: `track_catalog_${tr.trackNumber}`, blob: tr.blob });
              }
            } catch {}
          }
        }
        await tx.done;
      } catch (err) {
        console.warn('Could not persist updated tracks/folder metadata to IndexedDB:', err);
      }

      get().addToast(`تم حفظ وربط ${newTracks.length} مسار في نفس أماكنها الأصلية بنجاح ⚡`, '⚡', 'success');
    },

    playTrack: async (track: Track, newQueue?: Track[]) => {
      djAudioEngine.cancelActiveTransitions(true);
      const state = get();

      let playableTrack = track;
      // 1. Check in-memory file/blob
      // 2. ALWAYS retrieve saved audio blob from IndexedDB if not in memory (works 100% offline!)
      if (!playableTrack.file && !playableTrack.blob) {
        try {
          const db = await getDB();
          let item = await db.get('audioBlobs', track.id);
          if (!item && track.trackNumber) {
            item = await db.get('audioBlobs', `track_catalog_${track.trackNumber}`);
          }
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

      // 4. If offline and no local file/blob saved, warn user clearly
      if (typeof navigator !== 'undefined' && !navigator.onLine && !playableTrack.file && !playableTrack.blob) {
        get().addToast(`المسار "${track.title}" غير محفوظ بدون نت - يمكنك حفظه للأوفلاين عند توفر النت 📥`, '📶', 'warning');
        return;
      }

      // If still completely unplayable, inform the user with an actionable toast
      if (!playableTrack.file && !playableTrack.blob && !playableTrack.audioUrl) {
        get().addToast(`تعذر تشغيل "${track.title}" - يرجى استيراد ملف الأغنية أو التأكد من توفر الملف ⚠️`, '⚠️', 'warning');
        return;
      }

      // Smart queue reference: only change queue if different
      let updatedQueue = state.queue;
      if (newQueue && newQueue.length > 0) {
        if (state.queue.length !== newQueue.length || state.queue[0]?.id !== newQueue[0]?.id) {
          updatedQueue = newQueue;
        }
      } else if (updatedQueue.length === 0) {
        updatedQueue = state.tracks;
      }

      updateMediaSession(playableTrack, true, getMediaSessionCallbacks(get));

      // IMMEDIATE UI STATE UPDATE: gives 0ms instant feedback on mobile tap
      set({
        currentTrack: playableTrack,
        queue: updatedQueue,
        isPlaying: true,
      });

      // Launch audio playback asynchronously
      djAudioEngine.playTrack(playableTrack).catch((err) => {
        console.warn('Play track notice:', err);
      });

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
      const isEnginePlaying = djAudioEngine.isPlaying();
      const shouldPause = isPlaying || isEnginePlaying;

      if (shouldPause) {
        djAudioEngine.pause();
        set({ isPlaying: false });
        if (currentTrack) {
          updateMediaSession(currentTrack, false, getMediaSessionCallbacks(get));
        }
      } else {
        set({ isPlaying: true });
        djAudioEngine.play().catch(() => {
          set({ isPlaying: false });
        });
        if (currentTrack) {
          updateMediaSession(currentTrack, true, getMediaSessionCallbacks(get));
        }
      }
    },

    nextTrack: async (options?: { forceImmediate?: boolean } | boolean) => {
      const { queue, tracks, currentTrack, shuffle, repeatMode, automixEnabled, isPlaying, automixStyle } = get();
      if (!currentTrack) {
        if (tracks.length > 0) get().playTrack(tracks[0]);
        return;
      }

      // Robust queue resolution: fallback to all tracks if queue is empty
      const effectiveQueue = queue.length > 0 ? queue : tracks;
      if (effectiveQueue.length === 0) return;

      const isEnginePlaying = isPlaying || djAudioEngine.isPlaying();
      const forceImmediate = typeof options === 'object' ? !!options.forceImmediate : false;
      const shouldUseAutoMix = !forceImmediate && automixEnabled && isEnginePlaying;

      let currentIndex = effectiveQueue.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex === -1 && currentTrack.trackNumber) {
        currentIndex = effectiveQueue.findIndex((t) => t.trackNumber === currentTrack.trackNumber);
      }
      if (currentIndex === -1) {
        const curTitle = currentTrack.title.toLowerCase().trim();
        currentIndex = effectiveQueue.findIndex((t) => t.title.toLowerCase().trim() === curTitle);
      }

      let nextIndex = -1;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * effectiveQueue.length);
      } else if (currentIndex >= 0 && currentIndex < effectiveQueue.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeatMode === 'all' || currentIndex === -1) {
        nextIndex = 0;
      } else if (repeatMode === 'one') {
        nextIndex = currentIndex >= 0 ? currentIndex : 0;
      }

      if (nextIndex < 0 || nextIndex >= effectiveQueue.length) {
        // Smart YouTube Music Autoplay fallback
        if (get().smartAutoplay && tracks.length > 0) {
          const currentA = currentTrack.artist.toLowerCase();
          const candidate =
            tracks.find((t) => t.id !== currentTrack.id && t.artist.toLowerCase().includes(currentA)) ||
            tracks[Math.floor(Math.random() * tracks.length)];
          if (candidate) {
            nextIndex = effectiveQueue.findIndex((t) => t.id === candidate.id);
            if (nextIndex === -1) {
              get().addToQueue(candidate);
              effectiveQueue.push(candidate);
              nextIndex = effectiveQueue.length - 1;
            }
          }
        }
      }

      if (nextIndex >= 0 && nextIndex < effectiveQueue.length) {
        let targetTrack = await resolveTrackAudioSource(effectiveQueue[nextIndex]);

        // Auto-skip unplayable tracks: search forward up to 10 tracks if candidate is unplayable
        if (!targetTrack.file && !targetTrack.blob && !targetTrack.audioUrl) {
          for (let offset = 1; offset <= Math.min(10, effectiveQueue.length); offset++) {
            const candIdx = (nextIndex + offset) % effectiveQueue.length;
            const cand = await resolveTrackAudioSource(effectiveQueue[candIdx]);
            if (cand.file || cand.blob || cand.audioUrl) {
              targetTrack = cand;
              break;
            }
          }
        }

        if (shouldUseAutoMix) {
          set({
            queue: effectiveQueue,
            isPlaying: true,
          });
          await djAudioEngine.transitionTo(targetTrack, automixStyle);
        } else {
          djAudioEngine.cancelActiveTransitions(true);
          set({
            currentTrack: targetTrack,
            queue: effectiveQueue,
            history: [...get().history, currentTrack],
            isPlaying: true,
          });
          updateMediaSession(targetTrack, true, getMediaSessionCallbacks(get));
          await djAudioEngine.playTrack(targetTrack);
        }

        if (!targetTrack.syncedLyrics || targetTrack.syncedLyrics.length === 0) {
          fetchLyricsOnline(targetTrack.title, targetTrack.artist, targetTrack.duration).then((res) => {
            if (res && (res.syncedLyrics || res.plainLyrics)) {
              const updatedTrack: Track = {
                ...targetTrack,
                syncedLyrics: res.syncedLyrics,
                lyrics: res.plainLyrics || targetTrack.lyrics,
              };
              if (get().currentTrack?.id === updatedTrack.id) {
                set({ currentTrack: updatedTrack });
              }
            }
          });
        }
      } else {
        djAudioEngine.pause();
        set({ isPlaying: false });
      }
    },

    previousTrack: async () => {
      djAudioEngine.cancelActiveTransitions(true);
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
          try {
            const db = await getDB();
            let item = await db.get('audioBlobs', prevTrack.id);
            if (!item && prevTrack.trackNumber) {
              item = await db.get('audioBlobs', `track_catalog_${prevTrack.trackNumber}`);
            }
            if (item && item.blob) prevTrack = { ...rawPrev, blob: item.blob };
          } catch {}
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

    setAutomixStyle: (style: AutoMixStyle) => {
      djAudioEngine.setAutoMixStyle(style);
      set({ automixStyle: style });
      try {
        localStorage.setItem('aura_automix_style', style);
      } catch {}
    },

    setSoundboardOpen: (open: boolean) => set({ isSoundboardOpen: open }),
    setAutoMixModalOpen: (open: boolean) => set({ isAutoMixModalOpen: open }),

    playDJSound: (effect: 'scratch' | 'airhorn' | 'echo_drop' | 'laser' | 'cheer') => {
      djAudioEngine.playDJSound(effect);
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

    toggleSpatialAudio: () => {
      const next = !get().spatialAudio;
      djAudioEngine.setSpatialAudio(next);
      set({ spatialAudio: next });
      get().addToast(
        next
          ? 'تم تفعيل الصوت المكاني ثلاثي الأبعاد 🎧 (Apple Spatial Audio)'
          : 'تم إيقاف الصوت المكاني (Standard Stereo)',
        '🎧',
        'info'
      );
    },

    setSpatialAudio: (enabled: boolean) => {
      djAudioEngine.setSpatialAudio(enabled);
      set({ spatialAudio: enabled });
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
          if (track.trackNumber) {
            await db.put('audioBlobs', { id: `track_catalog_${track.trackNumber}`, blob });
          }
          set({ downloadedTrackIds: Array.from(new Set([...get().downloadedTrackIds, trackId])) });
          addToast(`تم حفظ "${track.title}" أوفلاين بنجاح ⚡`, undefined, 'success');
        } else {
          addToast(`تعذر حفظ المسار أوفلاين`, undefined, 'warning');
        }
      } catch (err) {
        console.warn('Error downloading track offline:', err);
        addToast(`خطأ أثناء الحفظ للأوفلاين`, undefined, 'warning');
      }
    },

    cacheAllAvailableTracksOffline: async () => {
      const { tracks, downloadedTrackIds, addToast } = get();
      if (tracks.length === 0) return;

      const neededTracks = tracks.filter((t) => !downloadedTrackIds.includes(t.id));
      if (neededTracks.length === 0) {
        addToast('جميع المسارات الـ 261 محفوظة أوفلاين بالفعل في الذاكرة ⚡', '⚡', 'success');
        return;
      }

      addToast(`بدء حفظ ${neededTracks.length} مسار للعمل بدون إنترنت ⚡...`, '📥', 'info');
      set({ downloadAllProgress: { current: 0, total: neededTracks.length } });

      let savedCount = 0;
      const newDownloaded = new Set<string>(downloadedTrackIds);

      try {
        const db = await getDB();
        for (let i = 0; i < neededTracks.length; i++) {
          const track = neededTracks[i];
          let blob: Blob | null = track.blob || null;
          if (!blob && track.file) {
            blob = track.file;
          } else if (!blob && track.audioUrl) {
            try {
              const res = await fetch(track.audioUrl);
              if (res.ok) {
                blob = await res.blob();
              }
            } catch {}
          }

          if (blob) {
            await db.put('audioBlobs', { id: track.id, blob });
            if (track.trackNumber) {
              await db.put('audioBlobs', { id: `track_catalog_${track.trackNumber}`, blob });
            }
            newDownloaded.add(track.id);
            savedCount++;
          }

          set({
            downloadAllProgress: { current: i + 1, total: neededTracks.length },
            downloadedTrackIds: Array.from(newDownloaded),
          });
        }

        addToast(`تم حفظ ${savedCount} مسار في الذاكرة بنجاح ⚡ تعمل الآن أوفلاين للأبد!`, '✅', 'success');
      } catch (err) {
        console.warn('Error during bulk offline caching:', err);
        addToast('حدث خطأ أثناء حفظ بعض المسارات للأوفلاين', '⚠️', 'warning');
      } finally {
        set({ downloadAllProgress: null });
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
