// ==============================================================================
// AURA.WAV — Continuity & Handoff Service (Apple Music / Spotify Connect Style)
// ==============================================================================

import { Track } from '../types';
import { supabase } from '../lib/supabase';

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  os: string;
  isCurrent: boolean;
  lastSeen: number;
}

export interface HandoffPayload {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  track: Track;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  timestamp: number;
}

const STORAGE_KEY_DEVICE_ID = 'aura_handoff_device_id_v1';
const STORAGE_KEY_LAST_STATE = 'aura_handoff_latest_state_v1';
const BROADCAST_CHANNEL_NAME = 'aura_handoff_bus_v1';

class HandoffService {
  private static instance: HandoffService;
  private currentDeviceId: string;
  private currentDeviceName: string;
  private currentDeviceType: 'mobile' | 'desktop' | 'tablet';
  private currentDeviceOs: string;
  
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannel: any = null;
  private remoteStateListeners = new Set<(payload: HandoffPayload | null) => void>();
  private activeDevicesListeners = new Set<(devices: DeviceInfo[]) => void>();

  private latestRemoteState: HandoffPayload | null = null;
  private knownDevices = new Map<string, DeviceInfo>();
  private heartbeatInterval: any = null;

  private constructor() {
    this.currentDeviceId = this.initDeviceId();
    const { name, type, os } = this.detectDeviceInfo();
    this.currentDeviceName = name;
    this.currentDeviceType = type;
    this.currentDeviceOs = os;

    this.registerCurrentDevice();
    this.initBroadcastChannel();
    this.initRealtimeSync();
    this.checkInitialStoredState();
  }

  public static getInstance(): HandoffService {
    if (!HandoffService.instance) {
      HandoffService.instance = new HandoffService();
    }
    return HandoffService.instance;
  }

  // --- Device Detection ---
  private initDeviceId(): string {
    let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (!id) {
      id = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
    }
    return id;
  }

  private detectDeviceInfo(): { name: string; type: 'mobile' | 'desktop' | 'tablet'; os: string } {
    if (typeof navigator === 'undefined') {
      return { name: 'المتصفح', type: 'desktop', os: 'Web' };
    }

    const ua = navigator.userAgent;
    let type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    let os = 'Web';
    let name = 'كمبيوتر';

    if (/iPad|Tablet/i.test(ua)) {
      type = 'tablet';
      os = 'iPadOS';
      name = 'iPad';
    } else if (/iPhone/i.test(ua)) {
      type = 'mobile';
      os = 'iOS';
      name = 'iPhone';
    } else if (/Android/i.test(ua)) {
      type = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
      os = 'Android';
      name = 'Android Phone';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      type = 'desktop';
      os = 'macOS';
      name = 'Mac';
    } else if (/Windows/i.test(ua)) {
      type = 'desktop';
      os = 'Windows';
      name = 'Windows PC';
    }

    return { name, type, os };
  }

  private registerCurrentDevice(): void {
    this.knownDevices.set(this.currentDeviceId, {
      id: this.currentDeviceId,
      name: this.currentDeviceName,
      type: this.currentDeviceType,
      os: this.currentDeviceOs,
      isCurrent: true,
      lastSeen: Date.now(),
    });
  }

  // --- Broadcast & Realtime Sync ---
  private initBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingPayload(event.data);
        };
      } catch (e) {
        console.warn('[Handoff] BroadcastChannel unavailable:', e);
      }
    }
  }

  private initRealtimeSync(): void {
    if (supabase) {
      try {
        this.realtimeChannel = supabase.channel('aura_handoff_room');
        this.realtimeChannel.on('broadcast', { event: 'handoff_state' }, ({ payload }: { payload: any }) => {
          this.handleIncomingPayload(payload);
        });
        this.realtimeChannel.subscribe();
      } catch (err) {
        console.warn('[Handoff] Supabase Realtime init notice:', err);
      }
    }
  }

  private checkInitialStoredState(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_STATE);
      if (stored) {
        const payload: HandoffPayload = JSON.parse(stored);
        // Only accept if from another device and within last 2 hours
        if (payload.deviceId !== this.currentDeviceId && Date.now() - payload.timestamp < 2 * 60 * 60 * 1000) {
          this.latestRemoteState = payload;
        }
      }
    } catch {}
  }

  // --- Broadcast Outgoing Playback State ---
  public broadcastPlaybackState(track: Track | null, currentTime: number, duration: number, isPlaying: boolean): void {
    if (!track) return;

    const payload: HandoffPayload = {
      deviceId: this.currentDeviceId,
      deviceName: this.currentDeviceName,
      deviceType: this.currentDeviceType,
      track,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      isPlaying,
      timestamp: Date.now(),
    };

    // Update local storage
    try {
      localStorage.setItem(STORAGE_KEY_LAST_STATE, JSON.stringify(payload));
    } catch {}

    // Broadcast across local tabs/windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch {}
    }

    // Broadcast via Supabase Realtime
    if (this.realtimeChannel) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'handoff_state',
          payload,
        }).catch(() => {});
      } catch {}
    }
  }

  // --- Handle Incoming Remote State ---
  private handleIncomingPayload(payload: any): void {
    if (!payload || !payload.deviceId || payload.deviceId === this.currentDeviceId) {
      return;
    }

    // Update known devices map
    this.knownDevices.set(payload.deviceId, {
      id: payload.deviceId,
      name: payload.deviceName || 'جهاز آخر',
      type: payload.deviceType || 'mobile',
      os: payload.deviceType === 'mobile' ? 'iOS / Android' : 'Desktop',
      isCurrent: false,
      lastSeen: payload.timestamp || Date.now(),
    });
    this.notifyActiveDevices();

    // Check freshness (within last 30 minutes)
    if (payload.timestamp && Date.now() - payload.timestamp < 30 * 60 * 1000) {
      this.latestRemoteState = payload;
      this.notifyRemoteState(payload);
    }
  }

  // --- Subscriptions ---
  public onRemoteStateChange(cb: (payload: HandoffPayload | null) => void): () => void {
    this.remoteStateListeners.add(cb);
    cb(this.latestRemoteState);
    return () => {
      this.remoteStateListeners.delete(cb);
    };
  }

  public onActiveDevicesChange(cb: (devices: DeviceInfo[]) => void): () => void {
    this.activeDevicesListeners.add(cb);
    cb(this.getActiveDevices());
    return () => {
      this.activeDevicesListeners.delete(cb);
    };
  }

  private notifyRemoteState(payload: HandoffPayload | null): void {
    this.remoteStateListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch {}
    });
  }

  private notifyActiveDevices(): void {
    const list = this.getActiveDevices();
    this.activeDevicesListeners.forEach((cb) => {
      try {
        cb(list);
      } catch {}
    });
  }

  public getActiveDevices(): DeviceInfo[] {
    return Array.from(this.knownDevices.values());
  }

  public getLatestRemoteState(): HandoffPayload | null {
    return this.latestRemoteState;
  }

  public getCurrentDevice(): DeviceInfo {
    return {
      id: this.currentDeviceId,
      name: this.currentDeviceName,
      type: this.currentDeviceType,
      os: this.currentDeviceOs,
      isCurrent: true,
      lastSeen: Date.now(),
    };
  }

  public clearRemoteState(): void {
    this.latestRemoteState = null;
    this.notifyRemoteState(null);
  }
}

export const handoffService = HandoffService.getInstance();
