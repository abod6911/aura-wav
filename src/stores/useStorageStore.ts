import { create } from 'zustand';
import { StorageManager, StorageEstimateResult, onStorageChange } from '../services/storageManager';

export interface StorageState extends StorageEstimateResult {
  isLoading: boolean;
  isQuotaWarning: boolean;
  usagePercentage: number;
  refreshStorage: () => Promise<void>;
  refreshStorageStats: () => Promise<void>;
  requestPersistence: () => Promise<boolean>;
}

export const useStorageStore = create<StorageState>((set) => ({
  usageBytes: 0,
  quotaBytes: 0,
  percentUsed: 0,
  usagePercentage: 0,
  usageFormatted: 'Calculating...',
  quotaFormatted: 'Calculating...',
  isCritical: false,
  isQuotaWarning: false,
  isLoading: false,

  refreshStorage: async () => {
    set({ isLoading: true });
    const result = await StorageManager.checkStorageHealth();
    set({
      ...result,
      usagePercentage: result.percentUsed,
      isQuotaWarning: result.isCritical,
      isLoading: false,
    });
  },

  refreshStorageStats: async () => {
    set({ isLoading: true });
    const result = await StorageManager.checkStorageHealth();
    set({
      ...result,
      usagePercentage: result.percentUsed,
      isQuotaWarning: result.isCritical,
      isLoading: false,
    });
  },

  requestPersistence: async () => {
    const isPersisted = await StorageManager.requestPersistence();
    return isPersisted;
  },
}));

// Listen to storage mutations and auto-refresh
if (typeof window !== 'undefined') {
  onStorageChange(() => {
    useStorageStore.getState().refreshStorage().catch(() => {});
  });

  setTimeout(() => {
    useStorageStore.getState().refreshStorage().catch(() => {});
  }, 1000);
}
