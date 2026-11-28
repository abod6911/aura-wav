import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { LUXURY_SPRING, DIALOG_VARIANTS } from '../utils/motion';
import {
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Keyboard,
  LogOut,
  User,
  Maximize,
  Minimize,
} from 'lucide-react';
import { isCloudConfigured } from '../lib/supabase';
import { triggerHaptic } from '../utils/haptics';
import { authService } from '../services/authService';
import { toggleNativeFullscreen, isFullscreenActive, onFullscreenChange } from '../utils/fullscreen';

interface HeaderProps {
  onOpenImport: () => void;
  isScrolled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport: _onOpenImport, isScrolled = false }) => {
  const { t, isRTL, dir } = useTranslation();
  const currentUser = usePlayerStore((state) => state.currentUser);
  const setCurrentUser = usePlayerStore((state) => state.setCurrentUser);
  const addToast = usePlayerStore((state) => state.addToast);
  const setShortcutsOpen = usePlayerStore((state) => state.setShortcutsOpen);
  const setAuthScreenOpen = usePlayerStore((state) => state.setAuthScreenOpen);
  const [isFullscreen, setIsFullscreen] = useState(isFullscreenActive());

  const goBack = usePlayerStore((state) => state.goBack);
  const goForward = usePlayerStore((state) => state.goForward);
  const canGoBack = usePlayerStore((state) => state.canGoBack());
  const canGoForward = usePlayerStore((state) => state.canGoForward());

  useEffect(() => {
    return onFullscreenChange(setIsFullscreen);
  }, []);

  const handleFullscreenToggle = async () => {
    triggerHaptic('medium');
    const res = await toggleNativeFullscreen();
    if (res.isIos) {
      addToast(
        'لتشغيل ملء الشاشة الكامل على iPhone: اضغط زر المشاركة (Share) في Safari ثم "إضافة إلى الصفحة الرئيسية"',
        undefined,
        'info'
      );
    } else if (res.success && res.isFullscreen) {
      addToast('تم تفعيل وضع ملء الشاشة الكامل', undefined, 'success');
    }
  };

  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const setSpotlightOpen = usePlayerStore((state) => state.setSpotlightOpen);
  const setCloudUploaderOpen = usePlayerStore((state) => state.setCloudUploaderOpen);
  const activeTab = usePlayerStore((state) => state.activeTab);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'home':
        return isRTL ? 'الرئيسية' : 'Home';
      case 'search':
        return t.search;
      case 'library':
        return isRTL ? 'مكتبتك' : 'Your Library';
      case 'favorites':
        return t.favorites;
      case 'playlists':
        return isRTL ? 'قوائم التشغيل' : 'Playlists';
      default:
        return isRTL ? 'الرئيسية' : 'Home';
    }
  };

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  return (
    <header
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        backgroundColor: isScrolled ? '#121212' : 'transparent',
      }}
      className={`select-none w-full min-w-0 px-4 sm:px-8 pb-2 sm:pb-3 shrink-0 z-30 transition-colors pointer-events-auto ${
        isScrolled
          ? 'bg-[#121212]/95 backdrop-blur-md border-b border-white/[0.06]'
          : 'border-b border-white/[0.02]'
      }`}
      dir={dir}
    >
      {/* ── Mobile Header Bar (High-Definition Native App Top Bar + Fullscreen Control) ── */}
      <div className="flex items-center justify-between sm:hidden w-full min-w-0 py-0.5 gap-2">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <motion.div
            animate={{ scale: isScrolled ? 0.92 : 1 }}
            transition={LUXURY_SPRING}
            className="w-6 h-6 rounded-lg bg-[#1DB954]/15 border border-[#1DB954]/35 flex items-center justify-center shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
          </motion.div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-[20px] font-black tracking-tight text-white leading-tight truncate"
            >
              {getPageTitle()}
            </motion.h1>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile Quick Search */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={LUXURY_SPRING}
            onClick={() => {
              triggerHaptic('light');
              setSpotlightOpen(true);
            }}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-200 flex items-center justify-center cursor-pointer touch-manipulation"
            title={t.quickSearch}
            aria-label="Quick Search"
          >
            <Search className="w-4 h-4" />
          </motion.button>

          {/* Mobile Fullscreen Toggle */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={LUXURY_SPRING}
            onClick={handleFullscreenToggle}
            className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full border flex items-center justify-center cursor-pointer transition-colors touch-manipulation ${
              isFullscreen
                ? 'bg-[#1DB954]/15 border-[#1DB954]/40 text-[#1DB954]'
                : 'bg-white/[0.06] border-white/[0.08] text-zinc-200'
            }`}
            title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
            aria-label="Fullscreen"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isFullscreen ? 'min' : 'max'}
                initial={{ scale: 0.65, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.65, opacity: 0 }}
                transition={LUXURY_SPRING}
                className="flex items-center justify-center"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {/* Profile / Settings Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={LUXURY_SPRING}
            onClick={() => {
              triggerHaptic('light');
              setSettingsOpen(true);
            }}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-manipulation"
            title={currentUser ? currentUser.name : t.settings}
            aria-label={t.settings}
          >
            <div className="w-8 h-8 rounded-full bg-[#181818] border border-white/[0.12] p-0.5 shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-[#121212] rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover shrink-0 aspect-square" />
                ) : (
                  currentUser?.name?.[0]?.toUpperCase() || 'A'
                )}
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* ── Desktop Header Bar (Spotify Desktop 3-Zone Architecture) ── */}
      <div className="hidden sm:flex items-center justify-between w-full min-w-0">
        {/* Zone 1 (Right in RTL / Left in LTR): Real History Navigation Buttons */}
        <div className="flex items-center gap-2" dir="ltr">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-[background-color,border-color,color,opacity,transform] ${
              !canGoBack
                ? 'bg-white/[0.03] border border-white/[0.05] opacity-30 pointer-events-none text-zinc-500'
                : 'satin-metal-button text-zinc-200 cursor-pointer'
            }`}
            title="رجوع"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={!canGoForward}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-[background-color,border-color,color,opacity,transform] ${
              !canGoForward
                ? 'bg-white/[0.03] border border-white/[0.05] opacity-30 pointer-events-none text-zinc-500'
                : 'satin-metal-button text-zinc-200 cursor-pointer'
            }`}
            title="تقدم"
            aria-label="Go Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zone 2 (Center / Right): Single Elegant Search Bar */}
        <div className="flex-1 max-w-md mx-6">
          <button
            onClick={() => setSpotlightOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full bg-[#1d1d22]/90 hover:bg-[#27272e] text-zinc-400 hover:text-zinc-100 text-xs font-normal border border-white/[0.09] hover:border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.3)] transition-[background-color,border-color,color] cursor-pointer group"
            title={t.quickSearch}
            aria-label="Spotlight search"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
              <span className="text-zinc-300 group-hover:text-white">{isRTL ? 'ماذا تريد أن تستمع إليه؟' : t.quickSearch}</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] text-[10px] text-zinc-300 font-mono">⌘K</kbd>
          </button>
        </div>

        {/* Zone 3 (Left in RTL): Fullscreen & Clean Profile Menu */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFullscreenToggle}
            className="w-8 h-8 rounded-full satin-metal-button text-zinc-300 flex items-center justify-center cursor-pointer"
            title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
            aria-label="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-[#1DB954]" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          <div className="relative flex items-center" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-8 h-8 rounded-full bg-[#181818] border border-white/[0.08] hover:border-white/20 flex items-center justify-center text-xs font-bold text-white transition-colors cursor-pointer overflow-hidden shadow-sm"
              title={currentUser ? currentUser.name : t.profile}
            >
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.name?.[0]?.toUpperCase() || 'A'
              )}
            </button>

            {/* Clean Spotify-Style Dropdown Menu (Anchored to end-0 so it expands inward in both RTL & LTR) */}
            <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div
                variants={DIALOG_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute top-11 end-0 w-64 max-w-[calc(100vw-24px)] bg-[#1c1c22]/[0.98] border border-white/[0.12] rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-[90] text-xs text-zinc-200 origin-top-end"
              >
                <div className="px-3 py-2.5 border-b border-white/[0.08] mb-1.5 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#24242b] border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name?.[0]?.toUpperCase() || 'A'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-white block truncate">{currentUser?.name || 'مستخدم AuraWave'}</span>
                    <span className="text-[11px] text-zinc-400 block truncate font-mono">{currentUser?.email || 'جلسة محلية'}</span>
                  </div>
                </div>

                <button
                  onClick={() => { setIsProfileMenuOpen(false); setSettingsOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.08] text-start transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{isRTL ? 'الإعدادات والحسابات' : t.settings}</span>
                </button>

                <button
                  onClick={() => { setIsProfileMenuOpen(false); setAuthScreenOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.08] text-start transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#1DB954] shrink-0" />
                  <span>{isRTL ? 'تبديل / إضافة حساب' : 'Switch / Add Account'}</span>
                </button>

                <button
                  onClick={() => { setIsProfileMenuOpen(false); setShortcutsOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.08] text-start transition-colors cursor-pointer"
                >
                  <Keyboard className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{isRTL ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}</span>
                </button>

                {isCloudConfigured() && (
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); setCloudUploaderOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.08] text-start transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{isRTL ? 'رفع ملفات للسحابة' : 'Upload to Cloud'}</span>
                  </button>
                )}

                <div className="my-1.5 border-t border-white/[0.08]" />

                {currentUser && !currentUser.isGuest ? (
                  <button
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      await authService.signOut();
                      setCurrentUser(null);
                      setAuthScreenOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400 text-start transition-colors cursor-pointer font-semibold"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{isRTL ? 'تسجيل الخروج' : 'Log out'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setAuthScreenOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#1DB954]/15 text-[#1DB954] text-start transition-colors cursor-pointer font-bold"
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span>{isRTL ? 'تسجيل الدخول / إنشاء حساب' : 'Log in'}</span>
                  </button>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
