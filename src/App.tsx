import { useEffect, useLayoutEffect, useState, useRef, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePlayerStore } from './store/usePlayerStore';
import { AtmosphereBackground } from './components/AtmosphereBackground';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TrackList } from './components/library/TrackList';
import { PlaylistsView } from './components/PlaylistsView';
import { FavoritesView } from './components/FavoritesView';
import { SpotifyHomeView } from './components/SpotifyHomeView';
import { InfiniteSearchView } from './components/InfiniteSearchView';
import { ArtistView } from './components/views/ArtistView';
import { AlbumView } from './components/views/AlbumView';
import { GenreView } from './components/views/GenreView';
import { SmartMixView } from './components/views/SmartMixView';
import { RightSidebar } from './components/RightSidebar';
import { PlayerBar } from './components/PlayerBar';
import { MiniPlayer } from './components/player/MiniPlayer';
import { ExpandedPlayer } from './components/player/ExpandedPlayer';
import { MobileNavDock } from './components/MobileNavDock';
import { ToastContainer } from './components/ToastContainer';
import { WelcomeSplash } from './components/WelcomeSplash';
import { AuthScreen } from './components/auth/AuthScreen';
import { useTranslation } from './i18n/useTranslation';
import { authService } from './services/authService';
import { WifiOff, Wifi } from 'lucide-react';

// Code-split heavy modals and sheets for ultra-fast initial load & minimal memory
const SyncedLyrics = lazy(() => import('./components/lyrics/SyncedLyrics').then((m) => ({ default: m.SyncedLyrics })));
const EqualizerModal = lazy(() => import('./components/EqualizerModal').then((m) => ({ default: m.EqualizerModal })));
const QueueDrawer = lazy(() => import('./components/QueueDrawer').then((m) => ({ default: m.QueueDrawer })));
const ImportModal = lazy(() => import('./components/ImportModal').then((m) => ({ default: m.ImportModal })));
const SleepTimerModal = lazy(() => import('./components/SleepTimerModal').then((m) => ({ default: m.SleepTimerModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal })));
const TrackEditModal = lazy(() => import('./components/library/TrackEditModal').then((m) => ({ default: m.TrackEditModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const CarPlayMode = lazy(() => import('./components/carplay/CarPlayMode').then((m) => ({ default: m.CarPlayMode })));
const SpotlightCommandModal = lazy(() => import('./components/search/SpotlightCommandModal').then((m) => ({ default: m.SpotlightCommandModal })));
const SyncPartyModal = lazy(() => import('./components/party/SyncPartyModal').then((m) => ({ default: m.SyncPartyModal })));
const CloudUploaderModal = lazy(() => import('./components/cloud/CloudUploaderModal').then((m) => ({ default: m.CloudUploaderModal })));
import { HandoffBanner } from './components/handoff/HandoffBanner';
import { extractThemeFromArtwork, getExtractedThemeSync, ExtractedTheme } from './utils/colorExtractor';

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
      <div className="sticky top-0 z-[100] w-full px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/25 text-amber-300 text-center text-xs font-semibold backdrop-blur-xl flex items-center justify-center gap-2">
        <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>وضع عدم الاتصال — تشغيل المسارات المحفوظة محلياً فقط</span>
      </div>
    );
  }

  if (showOnlineBanner) {
    return (
      <div className="sticky top-0 z-[100] w-full px-4 py-1.5 bg-emerald-500/15 border-b border-emerald-500/25 text-emerald-300 text-center text-xs font-semibold backdrop-blur-xl flex items-center justify-center gap-2 transition-opacity duration-300">
        <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>تم استعادة الاتصال بالإنترنت</span>
      </div>
    );
  }

  return null;
}


function DirectoryPermissionBanner() {
  const needsPermission = usePlayerStore((state) => state.needsDirectoryPermission);
  const requestAccess = usePlayerStore((state) => state.requestDirectoryAccess);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);
  const { t } = useTranslation();

  if (!needsPermission) return null;

  return (
    <div className="sticky top-0 z-[105] w-full px-4 py-2.5 bg-[#18181C] border-b border-white/[0.08] text-white backdrop-blur-2xl flex items-center justify-between gap-3 shadow-xl animate-fadeIn">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        <div className="min-w-0">
          <span className="text-xs font-semibold text-zinc-200 block truncate">
            {t.directoryPermissionPrompt}
          </span>
          <span className="text-[10px] text-zinc-400 block truncate font-mono">
            {savedFolderName || 'Liked_Songs'}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => requestAccess()}
        className="px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold shadow-sm cursor-pointer flex-shrink-0 active:scale-95 transition-[color,background-color,border-color,transform]"
      >
        {t.grantDirectoryAccess}
      </button>
    </div>
  );
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
      className="fixed top-3 inset-x-0 mx-auto z-[110] w-[min(92vw,400px)] rounded-2xl bg-[#18181C]/95 border border-white/[0.08] backdrop-blur-2xl shadow-2xl px-4 py-3 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs font-semibold text-white mb-1.5">
          <span>جاري التنزيل للاستماع دون اتصال</span>
          <span className="tabular-nums text-zinc-400 text-[11px]">
            {progress.current}/{progress.total}
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1DB954] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={cancel}
        className="shrink-0 text-xs font-medium text-zinc-400 hover:text-white px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] transition-colors cursor-pointer"
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
  const currentUser = usePlayerStore((state) => state.currentUser);
  const isAuthLoading = usePlayerStore((state) => state.isAuthLoading);
  const setIsAuthLoading = usePlayerStore((state) => state.setIsAuthLoading);
  const isAuthScreenOpen = usePlayerStore((state) => state.isAuthScreenOpen);
  const setCurrentUser = usePlayerStore((state) => state.setCurrentUser);
  const setAuthScreenOpen = usePlayerStore((state) => state.setAuthScreenOpen);

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
  const isTrackEditOpen = usePlayerStore((state) => state.isTrackEditOpen);
  const isCarModeOpen = usePlayerStore((state) => state.isCarModeOpen);
  const isSpotlightOpen = usePlayerStore((state) => state.isSpotlightOpen);
  const isSyncPartyOpen = usePlayerStore((state) => state.isSyncPartyOpen);
  const isCloudUploaderOpen = usePlayerStore((state) => state.isCloudUploaderOpen);
  const setCloudUploaderOpen = usePlayerStore((state) => state.setCloudUploaderOpen);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const prevVolumeRef = useRef(0.8);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const importTracks = usePlayerStore((state) => state.importTracks);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mainScrollRef = useRef<HTMLElement | null>(null);
  const tabScrollMap = useRef<Record<string, number>>({});
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const st = e.currentTarget.scrollTop;
    tabScrollMap.current[activeTab] = st;
    if (st > 20 && !isHeaderScrolled) {
      setIsHeaderScrolled(true);
    } else if (st <= 20 && isHeaderScrolled) {
      setIsHeaderScrolled(false);
    }
  };

  // Restore scroll position synchronously when activeTab mounts without keeping inactive tabs in DOM
  useLayoutEffect(() => {
    const mainEl = mainScrollRef.current;
    if (!mainEl) return;
    const targetScroll = tabScrollMap.current[activeTab] || 0;
    mainEl.scrollTop = targetScroll;
    setIsHeaderScrolled(targetScroll > 20);
  }, [activeTab]);

  // Synchronize dynamic Acoustic Obsidian & Vinyl-Glass ambient engine with real artwork color
  useEffect(() => {
    if (!currentTrack) return;
    const fallbackSeed = currentTrack.album || currentTrack.artist || currentTrack.title || 'aurawave';
    const artUrl = currentTrack.artworkUrl || currentTrack.coverUrl;
    const initialTheme = getExtractedThemeSync(artUrl, fallbackSeed);

    const applyTheme = (t: ExtractedTheme) => {
      const rgbStr = `${t.primaryRgb[0]}, ${t.primaryRgb[1]}, ${t.primaryRgb[2]}`;
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--aura-accent', t.accentHex);
      rootStyle.setProperty('--ambient-primary-rgb', rgbStr);
      rootStyle.setProperty('--ambient-accent-rgb', rgbStr);
      rootStyle.setProperty('--ambient-card-tint', t.cardTint);
      rootStyle.setProperty('--ambient-header-gradient', t.headerGradientRgb);
    };

    applyTheme(initialTheme);

    if (artUrl) {
      extractThemeFromArtwork(artUrl, fallbackSeed).then((extracted) => {
        applyTheme(extracted);
      });
    }
  }, [currentTrack]);

  // Initialize DB, Party URL invite, and Service Worker
  useEffect(() => {
    initStore();
    authService.init().then((user) => {
      if (user) {
        setCurrentUser(user);
        setAuthScreenOpen(false);
      }
      setIsAuthLoading(false);
    }).catch(() => {
      setIsAuthLoading(false);
    });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const partyCode = params.get('party');
      if (partyCode) {
        usePlayerStore.getState().setSyncPartyOpen(true);
      }
    }

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
        if (!refreshing && !usePlayerStore.getState().isPlaying) {
          refreshing = true;
          window.location.reload();
        }
      });

      return () => {
        window.removeEventListener('focus', handleUpdateCheck);
      };
    }
  }, [initStore, setCurrentUser, setAuthScreenOpen, setIsAuthLoading]);

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
        state.setSpotlightOpen(false);
        setIsImportModalOpen(false);
        state.setSettingsOpen(false);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        state.setSpotlightOpen(!state.isSpotlightOpen);
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
      className={
        isMobile
          ? 'relative w-full h-full flex flex-col bg-[#09090B] text-white overflow-hidden select-none'
          : 'relative w-full h-full flex flex-row bg-[#09090B] text-[#f4f4f7] overflow-hidden font-sans selection:bg-[#1DB954]/30'
      }
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-[#09090B]/95 backdrop-blur-2xl border-4 border-dashed border-[#1DB954]/50 flex flex-col items-center justify-center p-6 select-none animate-fadeIn">
          <div className="p-6 rounded-[28px] bg-[#1DB954]/15 text-[#1DB954] mb-4 border border-[#1DB954]/30 shadow-2xl shadow-black/50">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">أفلت مجلد الأغاني أو الملفات هنا</h2>
          <p className="text-sm text-zinc-400 font-medium">سيتم استيراد كافة المسارات وقراءة الأغلفة فوراً</p>
        </div>
      )}

      {/* 1. Dynamic Album Art Ambient Mesh (CSS-only on mobile, WebGL on desktop) */}
      <AtmosphereBackground />

      {/* 2. Desktop Right Sidebar (Docked continuously on right in RTL) */}
      {!isMobile && <Sidebar onOpenImport={() => setIsImportModalOpen(true)} />}

      {/* 3. Header on Mobile (Stays fixed at top with safe-area support) */}
      {isMobile && (
        <Header onOpenImport={() => setIsImportModalOpen(true)} isScrolled={isHeaderScrolled} />
      )}

      {/* 4. Main View Area (Strictly one active tab in DOM) */}
      <main
        ref={mainScrollRef}
        onScroll={handleMainScroll}
        style={{
          paddingBottom: isMobile
            ? (currentTrack ? 'var(--scroll-bottom-clearance)' : 'var(--scroll-bottom-no-player)')
            : '8rem',
        }}
        className={
          isMobile
            ? 'flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-1 overscroll-contain relative z-10'
            : 'flex-1 w-full min-w-0 h-full overflow-y-auto overscroll-contain touch-pan-y relative z-10 scrollbar-thin scrollbar-thumb-white/10 bg-[#09090B]'
        }
      >
        <HandoffBanner />
        <OfflineBanner />
        <DirectoryPermissionBanner />
        <DownloadProgressPill />

        {/* Desktop Header docked sticky at top of main area */}
        {!isMobile && (
          <div className="sticky top-0 z-40 w-full bg-[#09090B]/90 backdrop-blur-xl">
            <Header onOpenImport={() => setIsImportModalOpen(true)} isScrolled={isHeaderScrolled} />
          </div>
        )}

        <div className="w-full max-w-[1440px] mx-auto px-0 md:px-6 lg:px-10 pb-0 md:pb-32 pt-1 md:pt-4 flex-1 flex flex-col min-w-0">
          {/* Dynamic Tab Views (Strict Conditional Rendering: ONLY activeTab in DOM) */}
          {isLoadingLibrary ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 my-auto py-20">
              <div className="w-12 h-12 rounded-full border-4 border-[#1DB954]/20 border-t-[#1DB954] animate-spin" />
              <p className="text-xs text-zinc-400 font-medium">جاري تحميل مكتبتك الصوتية...</p>
            </div>
          ) : (
            <div className="flex-1 w-full min-w-0">
              {activeTab === 'home' && (
                <div key="tab-home" className="animate-tab-enter">
                  <SpotifyHomeView onOpenImport={() => setIsImportModalOpen(true)} />
                </div>
              )}
              {activeTab === 'search' && (
                <div key="tab-search" className="animate-tab-enter">
                  <InfiniteSearchView />
                </div>
              )}
              {activeTab === 'library' && (
                <div key="tab-library" className="animate-tab-enter">
                  <TrackList onOpenImport={() => setIsImportModalOpen(true)} />
                </div>
              )}
              {activeTab === 'favorites' && (
                <div key="tab-favorites" className="animate-tab-enter">
                  <FavoritesView
                    onOpenImport={() => setIsImportModalOpen(true)}
                    onExplore={() => usePlayerStore.getState().setActiveTab('search')}
                  />
                </div>
              )}
              {activeTab === 'playlists' && (
                <div key="tab-playlists" className="animate-tab-enter">
                  <PlaylistsView />
                </div>
              )}
              {activeTab === 'artist' && (
                <div key="tab-artist" className="animate-tab-enter">
                  <ArtistView />
                </div>
              )}
              {activeTab === 'album' && (
                <div key="tab-album" className="animate-tab-enter">
                  <AlbumView />
                </div>
              )}
              {activeTab === 'genre' && (
                <div key="tab-genre" className="animate-tab-enter">
                  <GenreView />
                </div>
              )}
              {activeTab === 'smart_mix' && (
                <div key="tab-smart-mix" className="animate-tab-enter">
                  <SmartMixView />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 5. Desktop Right Sidebar (Only rendered on desktop) */}
      {!isMobile && <RightSidebar />}

      {/* 6. Desktop Persistent Player Bar (Only rendered on desktop) */}
      {!isMobile && <PlayerBar />}

      {/* 7. Mobile Bottom Controls: Edge-to-Edge iOS Tab Bar & Floating MiniPlayer */}
      {isMobile && (
        <>
          {/* Floating MiniPlayer right above Tab Bar */}
          {currentTrack && <MiniPlayer onExpand={() => setMobilePlayerOpen(true)} />}
          {/* Docked Edge-to-Edge Native iOS Tab Bar touching screen bottom */}
          <MobileNavDock onOpenImport={() => setIsImportModalOpen(true)} />
        </>
      )}

      {/* 8. Mobile Expandable Full-Screen Sheet */}
      <ExpandedPlayer
        isOpen={isMobilePlayerOpen}
        onClose={() => setMobilePlayerOpen(false)}
      />

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
        {isTrackEditOpen && <TrackEditModal />}
        {isCarModeOpen && <CarPlayMode />}
        {isSpotlightOpen && <SpotlightCommandModal />}
        {isSyncPartyOpen && <SyncPartyModal />}
        {isCloudUploaderOpen && (
          <CloudUploaderModal
            isOpen={isCloudUploaderOpen}
            onClose={() => setCloudUploaderOpen(false)}
          />
        )}
      </Suspense>

      {/* 9. Real Authentication & Account Screen */}
      <AnimatePresence>
        {!isAuthLoading && (!currentUser || isAuthScreenOpen) && (
          <AuthScreen
            onSuccess={(user) => {
              setCurrentUser(user);
              setAuthScreenOpen(false);
            }}
            onContinueAsGuest={() => {
              const guest = authService.continueAsGuest();
              setCurrentUser(guest);
              setAuthScreenOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
