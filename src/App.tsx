import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { usePlayerStore } from './store/usePlayerStore';
import { AtmosphereBackground } from './components/AtmosphereBackground';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TrackList } from './components/library/TrackList';
import { PlaylistsView } from './components/PlaylistsView';
import { FavoritesView } from './components/FavoritesView';
import { SpotifyHomeView } from './components/SpotifyHomeView';
import { InfiniteSearchView } from './components/InfiniteSearchView';
import { RightSidebar } from './components/RightSidebar';
import { PlayerBar } from './components/PlayerBar';
import { MiniPlayer } from './components/player/MiniPlayer';
import { ExpandedPlayer } from './components/player/ExpandedPlayer';
import { MobileNavDock } from './components/MobileNavDock';
import { ToastContainer } from './components/ToastContainer';
import { WelcomeSplash } from './components/WelcomeSplash';
import { useTranslation } from './i18n/useTranslation';

// Code-split heavy modals and sheets for ultra-fast initial load & minimal memory
const SyncedLyrics = lazy(() => import('./components/lyrics/SyncedLyrics').then((m) => ({ default: m.SyncedLyrics })));
const EqualizerModal = lazy(() => import('./components/EqualizerModal').then((m) => ({ default: m.EqualizerModal })));
const QueueDrawer = lazy(() => import('./components/QueueDrawer').then((m) => ({ default: m.QueueDrawer })));
const ImportModal = lazy(() => import('./components/ImportModal').then((m) => ({ default: m.ImportModal })));
const SleepTimerModal = lazy(() => import('./components/SleepTimerModal').then((m) => ({ default: m.SleepTimerModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal })));
const ChangeArtworkModal = lazy(() => import('./components/ChangeArtworkModal').then((m) => ({ default: m.ChangeArtworkModal })));
const MetadataEditorModal = lazy(() => import('./components/library/MetadataEditorModal').then((m) => ({ default: m.MetadataEditorModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const DJFxSheet = lazy(() => import('./components/dj/DJFxSheet').then((m) => ({ default: m.DJFxSheet })));
const AutoMixSelectorModal = lazy(() => import('./components/dj/AutoMixSelectorModal').then((m) => ({ default: m.AutoMixSelectorModal })));
const CarPlayMode = lazy(() => import('./components/carplay/CarPlayMode').then((m) => ({ default: m.CarPlayMode })));

import { djAudioEngine } from './lib/audioEngine';

if (typeof window !== 'undefined') {
  (window as any).usePlayerStore = usePlayerStore;
  (window as any).djAudioEngine = djAudioEngine;
}

function OfflineBanner() {
  const isOnline = usePlayerStore((state) => state.isOnline);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (isOnline) {
      setShowOnlineBanner(true);
      const timer = setTimeout(() => setShowOnlineBanner(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowOnlineBanner(false);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="sticky top-0 z-[100] w-full px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-center text-sm font-bold backdrop-blur-md">
        📡 وضع بدون اتصال — يتم تشغيل الأغاني المحفوظة محلياً
      </div>
    );
  }

  if (showOnlineBanner) {
    return (
      <div className="sticky top-0 z-[100] w-full px-4 py-2 bg-[var(--apple-rose)]/20 border-b border-[var(--apple-rose)]/30 text-[var(--apple-rose)] text-center text-sm font-bold backdrop-blur-md transition-opacity duration-300">
        ✅ تم استعادة الاتصال
      </div>
    );
  }

  return null;
}

function DownloadProgressPill() {
  const progress = usePlayerStore((state) => state.downloadAllProgress);
  const cancel = usePlayerStore((state) => state.cancelOfflineDownload);
  if (!progress) return null;

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 inset-x-0 mx-auto z-[110] w-[min(92vw,420px)] rounded-[22px] apple-glass-card border border-white/12 shadow-2xl px-4 py-3 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs font-bold text-white mb-1.5">
          <span>⬇️ جاري الحفظ للأوفلاين (Apple ALAC)</span>
          <span className="tabular-nums text-white/70">
            {progress.current}/{progress.total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--apple-red)] to-[var(--apple-rose)] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={cancel}
        className="shrink-0 text-xs font-bold text-red-300 hover:text-red-200 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
      >
        إلغاء
      </button>
    </div>
  );
}

export function App() {
  const { t, isRTL, dir } = useTranslation();
  const initStore = usePlayerStore((state) => state.initStore);
  const activeTab = usePlayerStore((state) => state.activeTab);
  const isLoadingLibrary = usePlayerStore((state) => state.isLoadingLibrary);
  const isMobilePlayerOpen = usePlayerStore((state) => state.isMobilePlayerOpen);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);

  // Modal visibility states (boolean subscriptions only)
  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen);
  const isEqualizerOpen = usePlayerStore((state) => state.isEqualizerOpen);
  const isQueueOpen = usePlayerStore((state) => state.isQueueOpen);
  const isSleepTimerOpen = usePlayerStore((state) => state.isSleepTimerOpen);
  const isShortcutsOpen = usePlayerStore((state) => state.isShortcutsOpen);
  const isSettingsOpen = usePlayerStore((state) => state.isSettingsOpen);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const isWelcomeOpen = usePlayerStore((state) => state.isWelcomeOpen);
  const setWelcomeOpen = usePlayerStore((state) => state.setWelcomeOpen);
  const isChangeArtworkOpen = usePlayerStore((state) => state.isChangeArtworkOpen);
  const isMetadataEditorOpen = usePlayerStore((state) => state.isMetadataEditorOpen);
  const isSoundboardOpen = usePlayerStore((state) => state.isSoundboardOpen);
  const isAutoMixModalOpen = usePlayerStore((state) => state.isAutoMixModalOpen);
  const isCarModeOpen = usePlayerStore((state) => state.isCarModeOpen);

  const prevVolumeRef = useRef(0.8);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const importTracks = usePlayerStore((state) => state.importTracks);

  // Initialize DB and Service Worker
  useEffect(() => {
    initStore();

    // Enable system background playback session for iOS 16.4+ / iPadOS / macOS / Android
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        (navigator as unknown as { audioSession: { type: string } }).audioSession.type = 'playback';
      } catch {}
    }

    // Register Service Worker for PWA with automatic instant updates
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          console.log('AURA.WAV PWA Service Worker Registered');
          // Check for update immediately on load
          reg.update().catch(() => {});

          // If a new worker is found and installs
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch((err) => console.warn('SW registration failed:', err));

      const handleUpdateCheck = () => {
        navigator.serviceWorker.getRegistration().then((r) => r?.update().catch(() => {}));
      };
      window.addEventListener('focus', handleUpdateCheck);

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      return () => {
        window.removeEventListener('focus', handleUpdateCheck);
      };
    }
  }, [initStore]);

  // Online / Offline network status listener
  useEffect(() => {
    const handleOnline = () => usePlayerStore.getState().setIsOnline(true);
    const handleOffline = () => usePlayerStore.getState().setIsOnline(false);
    if (typeof navigator !== 'undefined') {
      usePlayerStore.getState().setIsOnline(navigator.onLine);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = usePlayerStore.getState();
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

      if (e.key === 'Escape') {
        if (isInputActive) {
          (document.activeElement as HTMLElement)?.blur();
          return;
        }
        state.setShortcutsOpen(false);
        state.setSleepTimerOpen(false);
        state.setEqualizerOpen(false);
        state.setQueueOpen(false);
        state.setLyricsOpen(false);
        state.setMobilePlayerOpen(false);
        setIsImportModalOpen(false);
        state.setSettingsOpen(false);
        return;
      }

      if (isInputActive) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        state.togglePlayPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const cur = state.currentTime;
        const dur = state.duration;
        state.seek(Math.min(dur, cur + 5));
        state.addToast('تقديم 5 ثوانٍ', undefined, 'info');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const cur = state.currentTime;
        state.seek(Math.max(0, cur - 5));
        state.addToast('ترجيع 5 ثوانٍ', undefined, 'info');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentVolume = state.volume;
        const nextVol = Math.min(1, Math.round((currentVolume + 0.05) * 100) / 100);
        state.setVolume(nextVol);
        state.addToast(`مستوى الصوت: ${Math.round(nextVol * 100)}%`, undefined, 'info');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentVolume = state.volume;
        const nextVol = Math.max(0, Math.round((currentVolume - 0.05) * 100) / 100);
        state.setVolume(nextVol);
        state.addToast(`مستوى الصوت: ${Math.round(nextVol * 100)}%`, undefined, 'info');
      } else if (e.key.toLowerCase() === 'm') {
        const currentVolume = state.volume;
        if (currentVolume > 0) {
          prevVolumeRef.current = currentVolume;
          state.setVolume(0);
          state.addToast('تم كتم الصوت', undefined, 'info');
        } else {
          state.setVolume(prevVolumeRef.current || 0.8);
          state.addToast('تم إلغاء كتم الصوت', undefined, 'info');
        }
      } else if (e.key.toLowerCase() === 'l') {
        state.setLyricsOpen(!state.isLyricsOpen);
      } else if (e.key.toLowerCase() === 'e') {
        state.setEqualizerOpen(!state.isEqualizerOpen);
      } else if (e.key.toLowerCase() === 'q') {
        state.setQueueOpen(!state.isQueueOpen);
      } else if (e.key.toLowerCase() === 's') {
        state.toggleShuffle();
      } else if (e.key.toLowerCase() === 'r') {
        state.cycleRepeat();
      } else if (e.key.toLowerCase() === 'f') {
        if (state.currentTrack) {
          state.toggleFavorite(state.currentTrack.id);
        }
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('library-search-input')?.focus();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        state.setShortcutsOpen(!state.isShortcutsOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Drag & Drop listener
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const audioFiles = files.filter((f) => !f.name.toLowerCase().endsWith('.lrc'));
      const lrcFiles = files.filter((f) => f.name.toLowerCase().endsWith('.lrc'));

      if (audioFiles.length > 0) {
        setIsImportModalOpen(true);
        const { processAudioFiles } = await import('./services/fileScanner');
        const tracks = await processAudioFiles(audioFiles, lrcFiles);
        if (tracks.length > 0) {
          await importTracks(tracks);
        }
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      dir={dir}
      className="relative min-h-screen min-h-[100dvh] w-full flex bg-[#08080c] text-[#f4f4f5] overflow-x-hidden font-sans selection:bg-[#FA243C]/25"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[#08080c]/95 backdrop-blur-2xl border-4 border-dashed border-[var(--apple-rose)]/50 flex flex-col items-center justify-center p-6 select-none animate-fadeIn">
          <div className="p-6 rounded-[28px] bg-[var(--apple-rose)]/20 text-[var(--apple-rose)] mb-4 animate-bounce border border-[var(--apple-rose)]/30 shadow-2xl">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">أفلت مجلد الأغاني أو الملفات هنا</h2>
          <p className="text-sm text-zinc-400 font-medium">سيتم استيراد كافة المسارات وقراءة الأغلفة فوراً</p>
        </div>
      )}

      {/* 1. Dynamic Album Art Ambient Mesh */}
      <AtmosphereBackground />

      {/* 2. Desktop Left Sidebar */}
      <Sidebar onOpenImport={() => setIsImportModalOpen(true)} />

      {/* 3. Main View Area */}
      <main className="main-safe-area flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto px-3 sm:px-6 md:px-8 z-10 scrollbar-thin scrollbar-thumb-white/10">
        <OfflineBanner />
        <DownloadProgressPill />
        <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col min-w-0">
          <Header onOpenImport={() => setIsImportModalOpen(true)} />

          {/* Dynamic Tab Views */}
          {isLoadingLibrary ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 my-auto py-20">
              <div className="w-12 h-12 rounded-full border-4 border-[var(--apple-rose)]/20 border-t-[var(--apple-rose)] animate-spin" />
              <p className="text-xs text-zinc-400 font-medium">جاري تحميل مكتبتك الصوتية...</p>
            </div>
          ) : (
            <div className="flex-1 w-full min-w-0">
              {activeTab === 'home' && (
                <SpotifyHomeView onOpenImport={() => setIsImportModalOpen(true)} />
              )}
              {activeTab === 'search' && <InfiniteSearchView />}
              {activeTab === 'library' && (
                <TrackList onOpenImport={() => setIsImportModalOpen(true)} />
              )}
              {activeTab === 'favorites' && (
                <FavoritesView onExplore={() => usePlayerStore.getState().setActiveTab('library')} />
              )}
              {activeTab === 'playlists' && <PlaylistsView />}
            </div>
          )}
        </div>
      </main>

      {/* 3.5 Desktop Right Sidebar (Collapsible Queue & Details) */}
      <RightSidebar />

      {/* 4. Desktop Persistent Player Bar */}
      <PlayerBar />

      {/* 5. Mobile Floating Mini-Player */}
      <MiniPlayer onExpand={() => setMobilePlayerOpen(true)} />

      {/* 6. Mobile Expandable Full-Screen Sheet */}
      <ExpandedPlayer
        isOpen={isMobilePlayerOpen}
        onClose={() => setMobilePlayerOpen(false)}
      />

      {/* 7. Mobile Bottom Navigation Dock */}
      <MobileNavDock onOpenImport={() => setIsImportModalOpen(true)} />

      {/* 8. Drawers & Modals (Lazy-loaded and mounted only when active) */}
      <ToastContainer />
      <WelcomeSplash
        forceShow={isWelcomeOpen}
        onComplete={() => setWelcomeOpen(false)}
      />

      <Suspense fallback={null}>
        {isLyricsOpen && <SyncedLyrics />}
        {isEqualizerOpen && <EqualizerModal />}
        {isQueueOpen && <QueueDrawer />}
        {isSleepTimerOpen && <SleepTimerModal />}
        {isShortcutsOpen && <KeyboardShortcutsModal />}
        {isImportModalOpen && (
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
          />
        )}
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setSettingsOpen(false)}
            onOpenImport={() => setIsImportModalOpen(true)}
          />
        )}
        {isChangeArtworkOpen && <ChangeArtworkModal />}
        {isMetadataEditorOpen && <MetadataEditorModal />}
        {isSoundboardOpen && <DJFxSheet />}
        {isAutoMixModalOpen && <AutoMixSelectorModal />}
        {isCarModeOpen && <CarPlayMode />}
      </Suspense>
    </div>
  );
}

export default App;
