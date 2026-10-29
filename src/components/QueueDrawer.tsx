import React from 'react';
import { usePlayerStore, MAX_USER_QUEUE } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { X, ListMusic, Trash2, ArrowUp, ArrowDown, Play, Compass, Disc3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const QueueDrawer: React.FC = () => {
  const { t, dir } = useTranslation();
  const isQueueOpen = usePlayerStore((state) => state.isQueueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const setHarmonicJourneyOpen = usePlayerStore((state) => state.setHarmonicJourneyOpen);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const playNext = usePlayerStore((state) => state.playNext);
  const savedFolderName = usePlayerStore((state) => state.savedFolderName);

  // Spotify-style Dynamic Queue
  const userQueue = usePlayerStore((state) => state.userQueue);
  const removeFromUserQueue = usePlayerStore((state) => state.removeFromUserQueue);
  const reorderUserQueue = usePlayerStore((state) => state.reorderUserQueue);
  const clearUserQueue = usePlayerStore((state) => state.clearUserQueue);

  // Background playlist queue
  const queue = usePlayerStore((state) => state.queue);

  if (!isQueueOpen) return null;

  const currentIdx = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;
  const upNextPlaylist = currentIdx >= 0 ? queue.slice(currentIdx + 1) : queue;

  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQueueOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Apple Liquid Glass Bottom Sheet / Drawer */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 400) {
              triggerHaptic(8);
              setQueueOpen(false);
            }
          }}
          data-testid="queue-drawer"
          className="relative z-10 w-full sm:max-w-md h-[88dvh] sm:h-full apple-glass-card rounded-t-[32px] sm:rounded-none sm:rounded-s-3xl border-t sm:border-t-0 sm:border-l border-white/[0.14] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] flex flex-col justify-between overflow-hidden p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))]"
          dir={dir}
        >
          {/* Mobile Drag Pill */}
          <div className="w-12 h-1.5 rounded-full bg-white/25 hover:bg-white/40 mx-auto mb-2 cursor-grab active:cursor-grabbing sm:hidden flex-shrink-0 transition-colors" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#FA243C]/20 to-[#FF375F]/15 border border-[#FA243C]/30 text-[#FA243C]">
                <ListMusic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{t.queue}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300">
                    {userQueue.length + upNextPlaylist.length}
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {userQueue.length > 0
                    ? `${userQueue.length} ${t.playNext} • ${upNextPlaylist.length} ${t.autoplayQueue}`
                    : `${upNextPlaylist.length} ${t.songs}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                triggerHaptic(8);
                setQueueOpen(false);
              }}
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Smart Harmonic Mix Generator Trigger */}
          <div className="pt-2.5 pb-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(12);
                setHarmonicJourneyOpen(true);
              }}
              className="w-full p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-purple-500/20 via-rose-500/15 to-amber-500/20 hover:from-purple-500/30 hover:to-amber-500/30 border border-purple-500/30 text-white flex items-center justify-between transition-all cursor-pointer group shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 group-hover:scale-105 transition-transform">
                  <Compass className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="text-start min-w-0">
                  <span className="text-xs font-bold text-white block truncate">
                    {t.smartHarmonicMix}
                  </span>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    {t.harmonicMixDesc}
                  </span>
                </div>
              </div>
              <span className="apple-badge bg-purple-500/20 border-purple-500/40 text-purple-200 text-[10px] flex-shrink-0">
                DJ PRO
              </span>
            </button>
          </div>

          {/* Scrollable Content (Momentum Smooth Scroll) */}
          <div className="flex-1 overflow-y-auto py-3 space-y-5 no-scrollbar -webkit-overflow-scrolling-touch">
            {/* Section 1: Currently Playing */}
            {currentTrack && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#FA243C] uppercase tracking-wider block">
                  {t.nowPlaying}
                </span>
                <div className="p-3 rounded-2xl apple-glass-card border border-[#FA243C]/40 bg-[#FA243C]/[0.08] flex items-center gap-3 shadow-md">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/60 shadow">
                    <img
                      src={currentTrack.artworkUrl || currentTrack.coverUrl || '/logo.svg'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center gap-[2px]">
                        <span className="w-0.5 bg-white rounded-full aura-soundbar-1 h-3" />
                        <span className="w-0.5 bg-white rounded-full aura-soundbar-2 h-2" />
                        <span className="w-0.5 bg-white rounded-full aura-soundbar-3 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
                  </div>
                  <Disc3 className={`w-5 h-5 text-[#FA243C] flex-shrink-0 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                </div>
              </div>
            )}

            {/* Section 2: Next in Queue (userQueue) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {t.playNext}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FA243C]/20 text-[#FA243C] border border-[#FA243C]/30 font-mono">
                    {userQueue.length}
                  </span>
                </div>

                {userQueue.length > 0 && (
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      clearUserQueue();
                    }}
                    className="text-xs text-zinc-400 hover:text-red-400 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.clearQueue}</span>
                  </button>
                )}
              </div>

              {userQueue.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-1">
                  <p className="text-xs text-zinc-300 font-medium">قائمة الانتظار المباشرة فارغة</p>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    اضغط زر <span className="text-[#FA243C] font-bold">+</span> بجانب أي أغنية لتشغيلها تالياً فور انتهاء الأغنية الحالية.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {userQueue.map((track, idx) => (
                    <div
                      key={`${track.id}_queue_${idx}`}
                      onClick={() => {
                        triggerHaptic(8);
                        playTrack(track);
                        removeFromUserQueue(idx);
                      }}
                      className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 flex items-center gap-2.5 sm:gap-3 transition-colors active:scale-[0.99] cursor-pointer"
                    >
                      <span className="text-xs font-mono font-bold text-[#FA243C] w-4 text-center flex-shrink-0">
                        {idx + 1}
                      </span>

                      <img
                        src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                        alt={track.title}
                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-black/60 shadow"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{track.title}</h4>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                      </div>

                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {idx > 0 && (
                          <button
                            onClick={() => {
                              triggerHaptic(8);
                              reorderUserQueue(idx, 0); // Jump to top to play immediately next
                            }}
                            title="تشغيل أولاً"
                            className="w-8 h-8 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < userQueue.length - 1 && (
                          <button
                            onClick={() => {
                              triggerHaptic(8);
                              reorderUserQueue(idx, idx + 1);
                            }}
                            title="تأخير للأسفل"
                            className="w-8 h-8 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            triggerHaptic(10);
                            removeFromUserQueue(idx);
                          }}
                          title="إزالة من القائمة"
                          className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Autoplay Queue from Library / Playlist */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t.autoplayQueue}: {savedFolderName || 'المكتبة'} ({upNextPlaylist.length})
              </span>

              {upNextPlaylist.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs border border-dashed border-white/10 rounded-2xl">
                  لا توجد مسارات متبقية في القائمة.
                </div>
              ) : (
                <div className="space-y-1">
                  {upNextPlaylist.slice(0, 30).map((track, idx) => (
                    <div
                      key={`${track.id}_playlist_${idx}`}
                      className="p-2 sm:p-2.5 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 flex items-center gap-3 transition-colors group cursor-pointer active:scale-[0.99]"
                      onClick={() => {
                        triggerHaptic(8);
                        playTrack(track);
                      }}
                    >
                      <img
                        src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                        alt={track.title}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-black/60 shadow"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-medium text-white group-hover:text-[#FA243C] truncate transition-colors">
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(12);
                            playNext(track);
                          }}
                          title={t.playNext}
                          className="w-8 h-8 rounded-lg hover:bg-[#FA243C]/20 text-zinc-400 hover:text-[#FA243C] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
