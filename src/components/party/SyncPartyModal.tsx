import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n/useTranslation';
import { syncPartyService, SyncRoomState } from '../../services/syncPartyService';
import {
  Radio,
  Users,
  Share2,
  Copy,
  Check,
  X,
  LogOut,
  Sparkles,
  Wifi,
  Headphones,
  Zap,
} from 'lucide-react';

export const SyncPartyModal: React.FC = () => {
  const { t, isRTL, dir } = useTranslation();
  const isSyncPartyOpen = usePlayerStore((state) => state.isSyncPartyOpen);
  const setSyncPartyOpen = usePlayerStore((state) => state.setSyncPartyOpen);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const addToast = usePlayerStore((state) => state.addToast);

  const [roomState, setRoomState] = useState<SyncRoomState>(syncPartyService.getState());
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to real-time sync party state
  useEffect(() => {
    const unsubscribe = syncPartyService.subscribe((state) => {
      setRoomState(state);
    });
    return () => unsubscribe();
  }, []);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSyncPartyOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSyncPartyOpen]);

  const getInviteUrl = useCallback((code: string) => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('party', code);
    return url.toString();
  }, []);

  const handleCopyLink = async () => {
    if (!roomState.roomId) return;
    const inviteUrl = getInviteUrl(roomState.roomId);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        // Fallback for older webviews
        const el = document.createElement('textarea');
        el.value = inviteUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      addToast(t.linkCopied, undefined, 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast(t.linkCopied, undefined, 'info');
    }
  };

  const handleShare = async () => {
    if (!roomState.roomId) return;
    const inviteUrl = getInviteUrl(roomState.roomId);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `AURA.WAV Sync Party`,
          text: isRTL
            ? `انضم إلى جلسة الاستماع معي على AURA.WAV! رمز الغرفة: ${roomState.roomId}`
            : `Join my live listening session on AURA.WAV! Room Code: ${roomState.roomId}`,
          url: inviteUrl,
        });
      } catch {
        // Share cancelled or unsupported; fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleHostRoom = async () => {
    setIsSubmitting(true);
    try {
      const generatedId = `AURA_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await syncPartyService.hostRoom(generatedId);
      addToast(isRTL ? 'تم إنشاء غرفة الاستماع بنجاح' : 'Listening room created successfully', undefined, 'success');
    } catch {
      addToast(isRTL ? 'تعذر إنشاء الغرفة' : 'Failed to host room', undefined, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsSubmitting(true);
    try {
      await syncPartyService.joinRoom(code);
      addToast(isRTL ? `تم الانضمام إلى الغرفة: ${code}` : `Joined room: ${code}`, undefined, 'success');
    } catch {
      addToast(isRTL ? 'فشل الانضمام إلى الغرفة' : 'Failed to join room', undefined, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveRoom = async () => {
    await syncPartyService.leaveRoom();
    addToast(isRTL ? 'تمت مغادرة جلسة الاستماع' : 'Left listening party', undefined, 'info');
  };

  if (!isSyncPartyOpen) return null;

  const isInRoom = !!roomState.roomId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.syncParty}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xl select-none animate-fadeIn"
      dir={dir}
    >
      {/* Backdrop click dismiss */}
      <div
        onClick={() => setSyncPartyOpen(false)}
        className="absolute inset-0 -z-10"
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="w-full sm:max-w-lg bg-[#0a0a12]/95 border-t sm:border border-white/[0.14] rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl pt-[max(1.25rem,env(safe-area-inset-top,1.25rem))] pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))]"
      >
        {/* Ambient Radial Accent Illumination */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FA243C]/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#FF375F]/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] shadow-lg shadow-[#FA243C]/25 flex-shrink-0 flex items-center justify-center">
              <Radio className={`w-5 h-5 text-white ${isInRoom ? 'animate-pulse' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {t.syncParty}
                </h3>
                {isInRoom && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FA243C]/20 text-[#FF375F] border border-[#FA243C]/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FA243C]" />
                    {t.liveSynced}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {isInRoom ? t.partyActive : t.partyHostDesc}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSyncPartyOpen(false)}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title={t.close}
            aria-label={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pt-4 space-y-4">
          {isInRoom ? (
            /* ========================================================================= */
            /* ACTIVE PARTY DASHBOARD                                                   */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Active Room Code Card */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t.roomCode}
                  </span>
                  <span className="apple-badge bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-[10px]">
                    <Wifi className="w-2.5 h-2.5" />
                    {roomState.isHost ? (isRTL ? 'المضيف (Host)' : 'Host') : (isRTL ? 'مستمع (Listener)' : 'Listener')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/10 select-all">
                    {roomState.roomId}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        copied
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/10 text-white'
                      }`}
                      title={t.copyInviteLink}
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span className="hidden xs:inline">{copied ? (isRTL ? 'تم النسخ' : 'Copied') : t.copyInviteLink}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/25 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                      title={t.shareInvite}
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden xs:inline">{t.shareInvite}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Session Telemetry Badges */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-zinc-400 block font-medium">المستمعون</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {roomState.participantCount} {t.listenersCount}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-zinc-400 block font-medium">الانجراف الزمني</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {Math.abs(roomState.driftMs)}ms
                    </span>
                  </div>
                </div>
              </div>

              {/* Currently Syncing Track Preview */}
              {currentTrack && (
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
                  <img
                    src={currentTrack.artworkUrl || '/logo.svg'}
                    alt={currentTrack.title}
                    className="w-11 h-11 rounded-xl object-cover border border-white/10 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Headphones className="w-3 h-3 text-[#FA243C]" />
                      <span className="text-[10px] text-[#FF375F] font-bold uppercase tracking-wider">
                        {isRTL ? 'المسار المتزامن' : 'Synced Track'}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white truncate"><bdi dir="auto">{currentTrack.title}</bdi></h5>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5"><bdi dir="auto">{currentTrack.artist}</bdi></p>
                  </div>
                </div>
              )}

              {/* Leave Party Button */}
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="w-full py-3 px-4 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.leaveParty}</span>
              </button>
            </div>
          ) : (
            /* ========================================================================= */
            /* INACTIVE STATE: HOST OR JOIN                                             */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-2xl bg-white/[0.05] p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('host')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'host'
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.hostParty}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'join'
                      ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t.joinParty}</span>
                </button>
              </div>

              {activeTab === 'host' ? (
                <div className="space-y-3.5">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#FA243C]" />
                      <span>{isRTL ? 'استضافة جلسة جديدة' : 'Host a New Room'}</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {t.partyHostDesc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleHostRoom}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FA243C] via-[#FF375F] to-[#FA243C] text-white font-black text-sm shadow-lg shadow-[#FA243C]/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>{isSubmitting ? t.connectingParty : t.hostParty}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleJoinRoom} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">
                      {t.enterRoomCode}
                    </label>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="AURA_XXXX"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/14 text-white placeholder-zinc-500 font-mono text-base focus:outline-none focus:border-[#FA243C] transition-colors"
                      style={{ fontSize: '16px' }} // Strict 16px to prevent iOS Safari auto-zoom
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !joinCodeInput.trim()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-black text-sm shadow-lg shadow-[#FA243C]/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-40"
                  >
                    <Users className="w-4 h-4" />
                    <span>{isSubmitting ? t.connectingParty : t.joinParty}</span>
                  </button>
                </form>
              )}

              {/* Informational Tip Footer */}
              <p className="text-[10px] text-zinc-500 text-center leading-relaxed px-2">
                {t.syncPartyTip}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SyncPartyModal;
