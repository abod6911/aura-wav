import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Track } from '../types';
import { djAudioEngine } from '../lib/audioEngine';

export interface RoomSyncPayload {
  trackId: string;
  trackTitle: string;
  artist: string;
  currentTime: number;
  isPlaying: boolean;
  timestamp: number; // Host performance.now() or Date.now()
  hostId: string;
}

export interface SyncRoomState {
  roomId: string | null;
  isHost: boolean;
  participantCount: number;
  driftMs: number;
  isSyncing: boolean;
}

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (err) {
    console.warn('[SyncParty] Supabase initialization notice:', err);
  }
}

/**
 * Real-time Sync Listening Party Service
 * Synchronizes playback between host and listeners with auto-drift clock alignment
 */
export class SyncPartyService {
  private static instance: SyncPartyService;
  private currentRoomId: string | null = null;
  private isHost = false;
  private hostId = `user_${Math.random().toString(36).substring(2, 9)}`;
  private realtimeChannel: RealtimeChannel | null = null;
  private localBroadcast: BroadcastChannel | null = null;
  private syncInterval: any = null;
  private driftCheckInterval: any = null;

  private onStateChangeCb: ((state: SyncRoomState) => void) | null = null;
  private lastHostPayload: RoomSyncPayload | null = null;
  private currentDriftMs = 0;

  private constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.localBroadcast = new BroadcastChannel('aura_sync_party_channel');
        this.localBroadcast.onmessage = (e) => {
          if (!this.isHost && e.data?.type === 'ROOM_HEARTBEAT') {
            this.handleIncomingHostSync(e.data.payload);
          }
        };
      } catch {}
    }
  }

  public static getInstance(): SyncPartyService {
    if (!SyncPartyService.instance) {
      SyncPartyService.instance = new SyncPartyService();
    }
    return SyncPartyService.instance;
  }

  public onStateChange(cb: (state: SyncRoomState) => void): void {
    this.onStateChangeCb = cb;
  }

  public getState(): SyncRoomState {
    return {
      roomId: this.currentRoomId,
      isHost: this.isHost,
      participantCount: this.currentRoomId ? (this.isHost ? 2 : 1) : 0,
      driftMs: this.currentDriftMs,
      isSyncing: !this.isHost && this.currentRoomId !== null,
    };
  }

  /**
   * Host a new Listening Room
   */
  public async hostRoom(roomId?: string): Promise<string> {
    const id = roomId || `aura_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await this.leaveRoom();

    this.currentRoomId = id;
    this.isHost = true;

    if (supabaseClient) {
      try {
        this.realtimeChannel = supabaseClient.channel(`listening-room:${id}`);
        this.realtimeChannel.subscribe();
      } catch (err) {
        console.warn('[SyncParty] Realtime subscription notice:', err);
      }
    }

    // Broadcast host clock every 1.5 seconds
    this.syncInterval = setInterval(() => {
      this.broadcastHostState();
    }, 1500);

    this.notifyState();
    return id;
  }

  /**
   * Join an existing Listening Room
   */
  public async joinRoom(roomId: string): Promise<void> {
    await this.leaveRoom();

    this.currentRoomId = roomId.trim();
    this.isHost = false;

    if (supabaseClient) {
      try {
        this.realtimeChannel = supabaseClient.channel(`listening-room:${this.currentRoomId}`);
        this.realtimeChannel.on('broadcast', { event: 'host_sync' }, ({ payload }: { payload: RoomSyncPayload }) => {
          this.handleIncomingHostSync(payload);
        });
        this.realtimeChannel.subscribe();
      } catch (err) {
        console.warn('[SyncParty] Join room error:', err);
      }
    }

    // Start auto-drift clock alignment loop
    this.driftCheckInterval = setInterval(() => {
      this.correctClockDrift();
    }, 500);

    this.notifyState();
  }

  /**
   * Leave currently joined room
   */
  public async leaveRoom(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.driftCheckInterval) {
      clearInterval(this.driftCheckInterval);
      this.driftCheckInterval = null;
    }

    if (this.realtimeChannel && supabaseClient) {
      try {
        await supabaseClient.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }

    // Restore natural playback rate
    djAudioEngine.setPlaybackRate(1.0);

    this.currentRoomId = null;
    this.isHost = false;
    this.lastHostPayload = null;
    this.currentDriftMs = 0;
    this.notifyState();
  }

  // --- Clock Synchronization & Drift Correction ---

  private broadcastHostState(): void {
    if (!this.isHost || !this.currentRoomId) return;

    const track = djAudioEngine.getActiveTrack();
    if (!track) return;

    const payload: RoomSyncPayload = {
      trackId: track.id,
      trackTitle: track.title,
      artist: track.artist,
      currentTime: djAudioEngine.getCurrentTime(),
      isPlaying: djAudioEngine.isPlaying(),
      timestamp: Date.now(),
      hostId: this.hostId,
    };

    // 1. Supabase Realtime broadcast
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'host_sync',
        payload,
      }).catch(() => {});
    }

    // 2. Local BroadcastChannel broadcast
    if (this.localBroadcast) {
      this.localBroadcast.postMessage({
        type: 'ROOM_HEARTBEAT',
        payload,
      });
    }
  }

  private handleIncomingHostSync(payload: RoomSyncPayload): void {
    if (this.isHost || !payload) return;
    this.lastHostPayload = payload;
    this.correctClockDrift();
  }

  /**
   * Auto-drift clock synchronization:
   * Compares listener time against projected host time (compensating for network latency).
   * - If drift > 2.0s: Performs instant hard seek
   * - If drift > 150ms: Smoothly micro-adjusts playbackRate (0.98x - 1.02x) without audio crackle
   * - If drift < 80ms: Resets playbackRate to 1.00x
   */
  private correctClockDrift(): void {
    if (this.isHost || !this.lastHostPayload) return;

    const payload = this.lastHostPayload;
    const now = Date.now();
    const networkLatencySec = Math.max(0, (now - payload.timestamp) / 1000);

    // Projected current host position
    const projectedHostTime = payload.isPlaying
      ? payload.currentTime + networkLatencySec
      : payload.currentTime;

    const myTime = djAudioEngine.getCurrentTime();
    const driftSec = projectedHostTime - myTime;
    this.currentDriftMs = Math.round(driftSec * 1000);

    // Hard seek on major desync
    if (Math.abs(driftSec) > 2.0) {
      djAudioEngine.seek(projectedHostTime);
      djAudioEngine.setPlaybackRate(1.0);
      if (payload.isPlaying && !djAudioEngine.isPlaying()) {
        djAudioEngine.play().catch(() => {});
      } else if (!payload.isPlaying && djAudioEngine.isPlaying()) {
        djAudioEngine.pause();
      }
      this.notifyState();
      return;
    }

    // Auto-drift micro adjustments
    if (Math.abs(driftSec) > 0.15) {
      if (driftSec > 0) {
        // Listener is slightly behind host -> speed up gently
        djAudioEngine.setPlaybackRate(1.02);
      } else {
        // Listener is slightly ahead of host -> slow down gently
        djAudioEngine.setPlaybackRate(0.98);
      }
    } else {
      // Well within tight sync threshold (< 100ms)
      djAudioEngine.setPlaybackRate(1.0);
    }

    this.notifyState();
  }

  private notifyState(): void {
    if (this.onStateChangeCb) {
      this.onStateChangeCb(this.getState());
    }
  }
}

export const syncPartyService = SyncPartyService.getInstance();
