import { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from './store/usePlayerStore';
import { AtmosphereBackground } from './components/AtmosphereBackground';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TrackList } from './components/library/TrackList';
import { PlaylistsView } from './components/PlaylistsView';
import { PlayerBar } from './components/PlayerBar';
import { MiniPlayer } from './components/player/MiniPlayer';
import { ExpandedPlayer } from './components/player/ExpandedPlayer';
import { MobileNavDock } from './components/MobileNavDock';
import { SyncedLyrics } from './components/lyrics/SyncedLyrics';
import { EqualizerModal } from './components/EqualizerModal';
import { QueueDrawer } from './components/QueueDrawer';
import { ImportModal } from './components/ImportModal';
import { ToastContainer } from './components/ToastContainer';
import { SleepTimerModal } from './components/SleepTimerModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { WelcomeSplash } from './components/WelcomeSplash';
import { ChangeArtworkModal } from './components/ChangeArtworkModal';

export function App() {
  const initStore = usePlayerStore((state) => state.initStore);
  const activeTab = usePlayerStore((state) => state.activeTab);
  const isLoadingLibrary = usePlayerStore((state) => state.isLoadingLibrary);
  const isMobilePlayerOpen = usePlayerStore((state) => state.isMobilePlayerOpen);
  const setMobilePlayerOpen = usePlayerStore((state) => state.setMobilePlayerOpen);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const seek = usePlayerStore((state) => state.seek);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);
  const isEqualizerOpen = usePlayerStore((state) => state.isEqualizerOpen);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const isQueueOpen = usePlayerStore((state) => state.isQueueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const isSleepTimerOpen = usePlayerStore((state) => state.isSleepTimerOpen);
  const setSleepTimerOpen = usePlayerStore((state) => state.setSleepTimerOpen);
  const isShortcutsOpen = usePlayerStore((state) => state.isShortcutsOpen);
  const setShortcutsOpen = usePlayerStore((state) => state.setShortcutsOpen);
  const isWelcomeOpen = usePlayerStore((state) => state.isWelcomeOpen);
  const setWelcomeOpen = usePlayerStore((state) => state.setWelcomeOpen);
  const setIsOnline = usePlayerStore((state) => state.setIsOnline);
  const addToast = usePlayerStore((state) => state.addToast);

  const prevVolumeRef = useRef(volume > 0 ? volume : 0.8);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const importTracks = usePlayerStore((state) => state.importTracks);

  // Initialize DB and Service Worker
  useEffect(() => {
    initStore();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
          console.log('AURA.WAV PWA Service Worker Registered');
        })
        .catch((err) => console.warn('SW registration failed:', err));
    }
  }, [initStore]);

  // Online / Offline network status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

      if (e.key === 'Escape') {
        if (isInputActive) {
          (document.activeElement as HTMLElement)?.blur();
          return;
        }
        setShortcutsOpen(false);
        setSleepTimerOpen(false);
        setEqualizerOpen(false);
        setQueueOpen(false);
        setLyricsOpen(false);
        setMobilePlayerOpen(false);
        setIsImportModalOpen(false);
        return;
      }

      if (isInputActive) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seek(Math.min(duration, currentTime + 5));
        addToast('تقديم 5 ثوانٍ ⏩', undefined, 'info');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seek(Math.max(0, currentTime - 5));
        addToast('ترجيع 5 ثوانٍ ⏪', undefined, 'info');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextVol = Math.min(1, Math.round((volume + 0.05) * 100) / 100);
        setVolume(nextVol);
        addToast(`الصوت: ${Math.round(nextVol * 100)}% 🔊`, undefined, 'info');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextVol = Math.max(0, Math.round((volume - 0.05) * 100) / 100);
        setVolume(nextVol);
        addToast(`الصوت: ${Math.round(nextVol * 100)}% 🔉`, undefined, 'info');
      } else if (e.key.toLowerCase() === 'm') {
        if (volume > 0) {
          prevVolumeRef.current = volume;
          setVolume(0);
          addToast('تم كتم الصوت 🔇', undefined, 'info');
        } else {
          setVolume(prevVolumeRef.current || 0.8);
          addToast('تم إلغاء كتم الصوت 🔊', undefined, 'info');
        }
      } else if (e.key.toLowerCase() === 'l') {
        setLyricsOpen(!isLyricsOpen);
      } else if (e.key.toLowerCase() === 'e') {
        setEqualizerOpen(!isEqualizerOpen);
      } else if (e.key.toLowerCase() === 'q') {
        setQueueOpen(!isQueueOpen);
      } else if (e.key.toLowerCase() === 's') {
        toggleShuffle();
      } else if (e.key.toLowerCase() === 'r') {
        cycleRepeat();
      } else if (e.key.toLowerCase() === 'f') {
        if (currentTrack) {
          toggleFavorite(currentTrack.id);
        }
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('library-search-input')?.focus();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsOpen(!isShortcutsOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlayPause,
    seek,
    currentTime,
    duration,
    volume,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    currentTrack,
    toggleFavorite,
    isLyricsOpen,
    setLyricsOpen,
    isEqualizerOpen,
    setEqualizerOpen,
    isQueueOpen,
    setQueueOpen,
    isSleepTimerOpen,
    setSleepTimerOpen,
    isShortcutsOpen,
    setShortcutsOpen,
    setMobilePlayerOpen,
    addToast,
  ]);

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
          importTracks(tracks);
        }
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-screen min-h-[100dvh] w-full flex bg-[#08080a] text-[#f4f4f5] overflow-x-hidden font-sans selection:bg-indigo-500/20"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[#08080a]/90 backdrop-blur-xl border-4 border-dashed border-indigo-400/50 flex flex-col items-center justify-center p-6 select-none animate-fadeIn">
          <div className="p-6 rounded-3xl bg-indigo-500/20 text-indigo-400 mb-4 animate-bounce border border-indigo-500/30 shadow-2xl">
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

      {/* 2. Desktop Sidebar */}
      <Sidebar onOpenImport={() => setIsImportModalOpen(true)} />

      {/* 3. Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto px-3 sm:px-6 md:px-10 pb-[calc(160px+env(safe-area-inset-bottom,0px))] md:pb-28 z-10">
        <Header onOpenImport={() => setIsImportModalOpen(true)} />

        {/* Dynamic Tab Views */}
        {isLoadingLibrary ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <p className="text-xs text-zinc-400 font-medium">جاري تحميل مكتبتك الصوتية...</p>
          </div>
        ) : (
          <div className="flex-1">
            {activeTab === 'library' && (
              <TrackList onOpenImport={() => setIsImportModalOpen(true)} />
            )}
            {activeTab === 'favorites' && (
              <TrackList onOpenImport={() => setIsImportModalOpen(true)} />
            )}
            {activeTab === 'playlists' && <PlaylistsView />}
          </div>
        )}
      </main>

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

      {/* 8. Drawers & Modals */}
      <SyncedLyrics />
      <EqualizerModal />
      <QueueDrawer />
      <SleepTimerModal />
      <KeyboardShortcutsModal />
      <ToastContainer />
      <WelcomeSplash
        forceShow={isWelcomeOpen}
        onComplete={() => setWelcomeOpen(false)}
      />
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
      <ChangeArtworkModal />
    </div>
  );
}

export default App;
