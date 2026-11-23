import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { isCloudConfigured } from '../../lib/supabase';
import { useTranslation } from '../../i18n/useTranslation';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export const CloudStatusBadge: React.FC = () => {
  const { isRTL } = useTranslation();
  const isCloudSyncing = usePlayerStore((state) => state.isCloudSyncing);
  const syncCloudLibrary = usePlayerStore((state) => state.syncCloudLibrary);
  const cloudTracks = usePlayerStore((state) => state.cloudTracks);
  const configured = isCloudConfigured();

  const handleSync = () => {
    triggerHaptic('light');
    syncCloudLibrary();
  };

  if (!configured) {
    return (
      <span
        className="apple-badge text-[8px] bg-white/[0.04] border-white/10 text-white/40 cursor-default"
        title={isRTL ? 'التخزين السحابي غير مفعل (.env)' : 'Cloud storage unconfigured (.env)'}
      >
        <CloudOff className="w-2.5 h-2.5 opacity-50" />
        <span>LOCAL</span>
      </span>
    );
  }

  return (
    <button
      onClick={handleSync}
      disabled={isCloudSyncing}
      className="apple-badge text-[8px] bg-[#1DB954]/15 hover:bg-[#1DB954]/25 border-[#1DB954]/30 text-[#1DB954] cursor-pointer active:scale-95 transition-colors flex items-center gap-1"
      title={isRTL ? 'المزامنة مع السحابة' : 'Sync with Cloud'}
    >
      <Cloud className="w-2.5 h-2.5 text-[#1DB954]" />
      <span>{cloudTracks.length > 0 ? `${cloudTracks.length} CLOUD` : 'CLOUD'}</span>
      {isCloudSyncing && <RefreshCw className="w-2 h-2 animate-spin ms-0.5" />}
    </button>
  );
};
