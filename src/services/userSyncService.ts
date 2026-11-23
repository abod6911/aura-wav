import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dexieDB } from '../db/dexieDB';
import { authService } from './authService';
import { Playlist } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface UserSettingsSyncPayload {
  eq_gains?: [number, number, number, number, number];
  eq_preset?: string;
  automix_duration?: number;
  automix_style?: string;
  shuffle?: boolean;
  repeat_mode?: string;
}

interface PendingQueueItem {
  id: string;
  type: 'fav_add' | 'fav_remove' | 'playlist_upsert' | 'playlist_delete' | 'history' | 'settings';
  payload: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'aura_pending_sync_queue';
const LAST_SYNCED_KEY = 'aura_last_synced_at';
const SETTINGS_UPDATED_AT_KEY = 'aura_settings_updated_at';

class UserSyncService {
  private static instance: UserSyncService;
  private status: SyncStatus = 'idle';
  private lastSyncedAt: number | null = null;
  private listeners: Set<(status: SyncStatus, lastSyncedAt: number | null) => void> = new Set();
  private lastSyncAttempt = 0;
  private isSyncInProgress = false;
  private initialized = false;

  // Debounce timers
  private historyDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingHistoryTrackIds: Set<string> = new Set();

  private settingsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSettings: Partial<UserSettingsSyncPayload> = {};

  private constructor() {
    this.restoreState();
  }

  public static getInstance(): UserSyncService {
    if (!UserSyncService.instance) {
      UserSyncService.instance = new UserSyncService();
    }
    return UserSyncService.instance;
  }

  private restoreState(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LAST_SYNCED_KEY);
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) {
          this.lastSyncedAt = parsed;
        }
      }
    } catch {}

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.status = 'offline';
    }
  }

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Listen for network connectivity changes
    window.addEventListener('online', () => {
      this.setStatus('idle');
      this.flushPendingQueue()
        .then(() => {
          const user = authService.getCurrentUser();
          if (user && !user.isGuest) {
            this.triggerFullSync(user.id).catch(() => {});
          }
        })
        .catch(() => {});
    });

    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });

    // Silent pull on visibilitychange with 30s cooldown
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        const now = Date.now();
        if (now - this.lastSyncAttempt > 30000) {
          const user = authService.getCurrentUser();
          if (user && !user.isGuest) {
            this.triggerFullSync(user.id).catch(() => {});
          }
        }
      }
    });

    // Listen for auth changes to trigger initial sync
    authService.onAuthStateChange((user) => {
      if (user && !user.isGuest && navigator.onLine) {
        this.triggerFullSync(user.id).catch(() => {});
      }
    });
  }

  public onSyncStatusChange(callback: (status: SyncStatus, lastSyncedAt: number | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.status, this.lastSyncedAt);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStatus(): { status: SyncStatus; lastSyncedAt: number | null } {
    return { status: this.status, lastSyncedAt: this.lastSyncedAt };
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
    for (const listener of this.listeners) {
      try {
        listener(this.status, this.lastSyncedAt);
      } catch (err) {
        console.error('[UserSyncService] Listener error:', err);
      }
    }
  }

  /**
   * Full bidirectional sync engine:
   * Merges Favorites, Playlists, History, and Settings with 0ms local latency.
   */
  public async triggerFullSync(explicitUserId?: string): Promise<void> {
    if (this.isSyncInProgress) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    if (!isSupabaseConfigured() || !supabase) {
      this.setStatus('idle');
      return;
    }

    const user = authService.getCurrentUser();
    const targetUserId = explicitUserId || user?.id;

    if (!targetUserId || !user || user.isGuest) {
      this.setStatus('idle');
      return;
    }

    this.isSyncInProgress = true;
    this.setStatus('syncing');
    this.lastSyncAttempt = Date.now();

    try {
      // 0. Flush any pending offline changes first
      await this.flushPendingQueue();

      // 1. Sync Favorites (Set Union)
      await this.syncFavorites(targetUserId);

      // 2. Sync Playlists (Smart Merge by ID and Updated Timestamp)
      await this.syncPlaylists(targetUserId);

      // 3. Sync History (Top 30 merged)
      await this.syncHistory(targetUserId);

      // 4. Sync Settings (EQ, AutoMix, Shuffle, Repeat)
      await this.syncUserSettings(targetUserId);

      this.lastSyncedAt = Date.now();
      try {
        localStorage.setItem(LAST_SYNCED_KEY, String(this.lastSyncedAt));
      } catch {}

      this.setStatus('synced');
    } catch (err) {
      console.warn('[UserSyncService] Full sync failed:', err);
      this.setStatus('error');
    } finally {
      this.isSyncInProgress = false;
    }
  }

  /**
   * 1. Smart Favorites Sync (Union of Cloud + Local)
   */
  private async syncFavorites(userId: string): Promise<void> {
    if (!supabase) return;

    const { data: cloudFavs, error } = await supabase
      .from('user_favorites')
      .select('track_id, created_at')
      .eq('user_id', userId);

    if (error) {
      console.warn('[UserSyncService] Fetch favorites error:', error);
      return;
    }

    const cloudTrackIds = new Set((cloudFavs || []).map((f) => f.track_id));
    const localFavRecords = await dexieDB.favorites.toArray();
    const localTrackIds = new Set(localFavRecords.map((f) => f.id));

    // Upload local-only favorites to Cloud
    const toUpload = Array.from(localTrackIds)
      .filter((id) => !cloudTrackIds.has(id))
      .map((trackId) => ({
        user_id: userId,
        track_id: trackId,
      }));

    if (toUpload.length > 0) {
      const { error: upsertErr } = await supabase
        .from('user_favorites')
        .upsert(toUpload, { onConflict: 'user_id,track_id' });
      if (upsertErr) console.warn('[UserSyncService] Upsert favorites error:', upsertErr);
    }

    // Add cloud-only favorites to Local Dexie
    const toAddLocal = Array.from(cloudTrackIds).filter((id) => !localTrackIds.has(id));
    if (toAddLocal.length > 0) {
      await dexieDB.favorites.bulkPut(
        toAddLocal.map((id) => ({
          id,
          addedAt: Date.now(),
        }))
      );
    }

    // Update Zustand store if running in browser
    const mergedAll = Array.from(new Set([...cloudTrackIds, ...localTrackIds]));
    if (typeof window !== 'undefined' && (window as any).usePlayerStore) {
      (window as any).usePlayerStore.setState({ favorites: mergedAll });
    }
  }

  /**
   * 2. Smart Playlists Sync (Merge by ID & Timestamp)
   */
  private async syncPlaylists(userId: string): Promise<void> {
    if (!supabase) return;

    const { data: cloudPlaylists, error } = await supabase
      .from('user_playlists')
      .select('id, name, track_ids, created_at, updated_at')
      .eq('user_id', userId);

    if (error) {
      console.warn('[UserSyncService] Fetch playlists error:', error);
      return;
    }

    const localPlaylists = await dexieDB.playlists.toArray();
    const cloudMap = new Map((cloudPlaylists || []).map((p) => [p.id, p]));
    const localMap = new Map(localPlaylists.map((p) => [p.id, p]));

    const mergedPlaylists: Playlist[] = [];
    const toUpload: any[] = [];

    // Evaluate local playlists
    for (const [id, localPl] of localMap.entries()) {
      const cloudPl = cloudMap.get(id);
      if (!cloudPl) {
        // Local only -> Upload to Cloud
        mergedPlaylists.push(localPl);
        toUpload.push({
          id: localPl.id,
          user_id: userId,
          name: localPl.name,
          track_ids: localPl.trackIds || [],
          created_at: new Date(localPl.createdAt || Date.now()).toISOString(),
          updated_at: new Date(localPl.createdAt || Date.now()).toISOString(),
        });
      } else {
        // Exists in both -> compare updated_at
        const cloudTime = new Date(cloudPl.updated_at || cloudPl.created_at).getTime();
        const localTime = localPl.createdAt || 0;

        if (cloudTime > localTime) {
          // Cloud is newer -> Update local Dexie
          const updatedFromCloud: Playlist = {
            id: cloudPl.id,
            name: cloudPl.name,
            trackIds: Array.isArray(cloudPl.track_ids) ? cloudPl.track_ids : [],
            createdAt: new Date(cloudPl.created_at).getTime(),
          };
          mergedPlaylists.push(updatedFromCloud);
          await dexieDB.playlists.put(updatedFromCloud);
        } else {
          // Local is newer -> Upload to Cloud
          mergedPlaylists.push(localPl);
          toUpload.push({
            id: localPl.id,
            user_id: userId,
            name: localPl.name,
            track_ids: localPl.trackIds || [],
            updated_at: new Date(localTime).toISOString(),
          });
        }
      }
    }

    // Evaluate cloud-only playlists
    for (const [id, cloudPl] of cloudMap.entries()) {
      if (!localMap.has(id)) {
        const newLocalPl: Playlist = {
          id: cloudPl.id,
          name: cloudPl.name,
          trackIds: Array.isArray(cloudPl.track_ids) ? cloudPl.track_ids : [],
          createdAt: new Date(cloudPl.created_at || Date.now()).getTime(),
        };
        mergedPlaylists.push(newLocalPl);
        await dexieDB.playlists.put(newLocalPl);
      }
    }

    // Upsert local-newer to cloud
    if (toUpload.length > 0) {
      await supabase
        .from('user_playlists')
        .upsert(toUpload, { onConflict: 'user_id,id' });
    }

    // Update Zustand store
    if (typeof window !== 'undefined' && (window as any).usePlayerStore) {
      (window as any).usePlayerStore.setState({ playlists: mergedPlaylists });
    }
  }

  /**
   * 3. Smart History Sync (Top 30 Merged)
   */
  private async syncHistory(userId: string): Promise<void> {
    if (!supabase) return;

    const { data: cloudHistory, error } = await supabase
      .from('user_history')
      .select('track_id, played_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('[UserSyncService] Fetch history error:', error);
      return;
    }

    let localHistory: any[] = [];
    try {
      const raw = localStorage.getItem('aura_history_last30');
      if (raw) localHistory = JSON.parse(raw);
    } catch {}

    const localMap = new Map<string, number>();
    for (let i = 0; i < localHistory.length; i++) {
      const t = localHistory[i];
      if (t && t.id) {
        // Approximate timestamp based on recency order
        localMap.set(t.id, Date.now() - i * 60000);
      }
    }

    const cloudMap = new Map<string, number>();
    for (const ch of cloudHistory || []) {
      cloudMap.set(ch.track_id, new Date(ch.played_at).getTime());
    }

    // Upload local-only history tracks to cloud
    const toUpload: any[] = [];
    for (const [trackId, playedAtMs] of localMap.entries()) {
      if (!cloudMap.has(trackId)) {
        toUpload.push({
          user_id: userId,
          track_id: trackId,
          played_at: new Date(playedAtMs).toISOString(),
        });
      }
    }

    if (toUpload.length > 0) {
      await supabase
        .from('user_history')
        .upsert(toUpload, { onConflict: 'user_id,track_id' });
    }
  }

  /**
   * 4. Smart Settings Sync (EQ, AutoMix, Shuffle, Repeat)
   */
  private async syncUserSettings(userId: string): Promise<void> {
    if (!supabase) return;

    const { data: cloudSettings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[UserSyncService] Fetch settings error:', error);
      return;
    }

    const localUpdatedAt = parseInt(localStorage.getItem(SETTINGS_UPDATED_AT_KEY) || '0', 10);
    const cloudUpdatedAt = cloudSettings?.updated_at ? new Date(cloudSettings.updated_at).getTime() : 0;

    if (cloudSettings && cloudUpdatedAt > localUpdatedAt) {
      // Cloud is newer -> Apply to Local
      try {
        if (cloudSettings.eq_gains) {
          localStorage.setItem('aura_eq_gains', JSON.stringify(cloudSettings.eq_gains));
        }
        if (cloudSettings.eq_preset) {
          localStorage.setItem('aura_eq_preset', cloudSettings.eq_preset);
        }
        if (typeof cloudSettings.shuffle === 'boolean') {
          localStorage.setItem('aura_shuffle', String(cloudSettings.shuffle));
        }
        if (cloudSettings.repeat_mode) {
          localStorage.setItem('aura_repeat_mode', cloudSettings.repeat_mode);
        }
        localStorage.setItem(SETTINGS_UPDATED_AT_KEY, String(cloudUpdatedAt));

        if (typeof window !== 'undefined' && (window as any).usePlayerStore) {
          (window as any).usePlayerStore.setState({
            ...(cloudSettings.eq_gains ? { eqGains: cloudSettings.eq_gains } : {}),
            ...(cloudSettings.eq_preset ? { activeEqPreset: cloudSettings.eq_preset } : {}),
            ...(typeof cloudSettings.shuffle === 'boolean' ? { shuffle: cloudSettings.shuffle } : {}),
            ...(cloudSettings.repeat_mode ? { repeatMode: cloudSettings.repeat_mode } : {}),
            ...(cloudSettings.automix_duration ? { automixDuration: Number(cloudSettings.automix_duration) } : {}),
            ...(cloudSettings.automix_style ? { automixStyle: cloudSettings.automix_style } : {}),
          });
        }
      } catch {}
    } else {
      // Local is newer or Cloud is empty -> Upload to Cloud
      let eqGains = [0, 0, 0, 0, 0];
      try {
        const rawEq = localStorage.getItem('aura_eq_gains');
        if (rawEq) eqGains = JSON.parse(rawEq);
      } catch {}

      const payload = {
        user_id: userId,
        eq_gains: eqGains,
        eq_preset: localStorage.getItem('aura_eq_preset') || 'Flat',
        shuffle: localStorage.getItem('aura_shuffle') === 'true',
        repeat_mode: localStorage.getItem('aura_repeat_mode') || 'off',
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' });
    }
  }

  // ── Local Change Pushers (Fire-and-forget with offline fallback) ────────────

  public async syncFavoriteToggle(trackId: string, isFav: boolean): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user || user.isGuest) return;

    if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
      this.enqueuePending({
        type: isFav ? 'fav_add' : 'fav_remove',
        payload: { userId: user.id, trackId },
      });
      return;
    }

    try {
      if (isFav) {
        await supabase
          .from('user_favorites')
          .upsert({ user_id: user.id, track_id: trackId }, { onConflict: 'user_id,track_id' });
      } else {
        await supabase
          .from('user_favorites')
          .delete()
          .match({ user_id: user.id, track_id: trackId });
      }
    } catch {
      this.enqueuePending({
        type: isFav ? 'fav_add' : 'fav_remove',
        payload: { userId: user.id, trackId },
      });
    }
  }

  public async syncPlaylistUpsert(playlist: Playlist): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user || user.isGuest) return;

    const payload = {
      id: playlist.id,
      user_id: user.id,
      name: playlist.name,
      track_ids: playlist.trackIds || [],
      updated_at: new Date().toISOString(),
    };

    if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
      this.enqueuePending({ type: 'playlist_upsert', payload });
      return;
    }

    try {
      await supabase
        .from('user_playlists')
        .upsert(payload, { onConflict: 'user_id,id' });
    } catch {
      this.enqueuePending({ type: 'playlist_upsert', payload });
    }
  }

  public async syncPlaylistDelete(playlistId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user || user.isGuest) return;

    if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
      this.enqueuePending({
        type: 'playlist_delete',
        payload: { userId: user.id, playlistId },
      });
      return;
    }

    try {
      await supabase
        .from('user_playlists')
        .delete()
        .match({ user_id: user.id, id: playlistId });
    } catch {
      this.enqueuePending({
        type: 'playlist_delete',
        payload: { userId: user.id, playlistId },
      });
    }
  }

  public syncHistoryItem(trackId: string): void {
    const user = authService.getCurrentUser();
    if (!user || user.isGuest) return;

    this.pendingHistoryTrackIds.add(trackId);

    if (this.historyDebounceTimer) {
      clearTimeout(this.historyDebounceTimer);
    }

    this.historyDebounceTimer = setTimeout(async () => {
      this.historyDebounceTimer = null;
      const trackIds = Array.from(this.pendingHistoryTrackIds);
      this.pendingHistoryTrackIds.clear();

      for (const tId of trackIds) {
        const payload = {
          user_id: user.id,
          track_id: tId,
          played_at: new Date().toISOString(),
        };

        if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
          this.enqueuePending({ type: 'history', payload });
        } else {
          try {
            await supabase
              .from('user_history')
              .upsert(payload, { onConflict: 'user_id,track_id' });
          } catch {
            this.enqueuePending({ type: 'history', payload });
          }
        }
      }
    }, 1500);
  }

  public syncSettings(settings: Partial<UserSettingsSyncPayload>): void {
    const user = authService.getCurrentUser();
    if (!user || user.isGuest) return;

    this.pendingSettings = { ...this.pendingSettings, ...settings };
    const now = Date.now();
    try {
      localStorage.setItem(SETTINGS_UPDATED_AT_KEY, String(now));
    } catch {}

    if (this.settingsDebounceTimer) {
      clearTimeout(this.settingsDebounceTimer);
    }

    this.settingsDebounceTimer = setTimeout(async () => {
      this.settingsDebounceTimer = null;
      const toSync = { ...this.pendingSettings };
      this.pendingSettings = {};

      const payload = {
        user_id: user.id,
        ...toSync,
        updated_at: new Date().toISOString(),
      };

      if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
        this.enqueuePending({ type: 'settings', payload });
      } else {
        try {
          await supabase
            .from('user_settings')
            .upsert(payload, { onConflict: 'user_id' });
        } catch {
          this.enqueuePending({ type: 'settings', payload });
        }
      }
    }, 1500);
  }

  // ── Pending Queue Management (Offline resilience) ──────────────────────────

  private enqueuePending(item: Omit<PendingQueueItem, 'id' | 'timestamp'>): void {
    if (typeof window === 'undefined') return;
    try {
      const queue = this.getPendingQueue();
      const newItem: PendingQueueItem = {
        ...item,
        id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
      };
      queue.push(newItem);
      // Keep max 100 pending actions
      const trimmed = queue.slice(-100);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  private getPendingQueue(): PendingQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async flushPendingQueue(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    const queue = this.getPendingQueue();
    if (queue.length === 0) return;

    const remaining: PendingQueueItem[] = [];

    for (const item of queue) {
      try {
        switch (item.type) {
          case 'fav_add':
            await supabase.from('user_favorites').upsert({
              user_id: item.payload.userId,
              track_id: item.payload.trackId,
            }, { onConflict: 'user_id,track_id' });
            break;
          case 'fav_remove':
            await supabase.from('user_favorites').delete().match({
              user_id: item.payload.userId,
              track_id: item.payload.trackId,
            });
            break;
          case 'playlist_upsert':
            await supabase.from('user_playlists').upsert(item.payload, { onConflict: 'user_id,id' });
            break;
          case 'playlist_delete':
            await supabase.from('user_playlists').delete().match({
              user_id: item.payload.userId,
              id: item.payload.playlistId,
            });
            break;
          case 'history':
            await supabase.from('user_history').upsert(item.payload, { onConflict: 'user_id,track_id' });
            break;
          case 'settings':
            await supabase.from('user_settings').upsert(item.payload, { onConflict: 'user_id' });
            break;
        }
      } catch {
        remaining.push(item);
      }
    }

    try {
      if (remaining.length > 0) {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(SYNC_QUEUE_KEY);
      }
    } catch {}
  }
}

export const userSyncService = UserSyncService.getInstance();
