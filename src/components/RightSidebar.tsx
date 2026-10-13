import React from 'react';
import { usePlayerStore, MAX_USER_QUEUE } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import { X, Trash2, ListMusic, Heart, Play, Radio, Sparkles, Disc, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const RightSidebar: React.FC = () => {
  const { t, isRTL, dir } = useTranslation();
  const isRightSidebarOpen = usePlayerStore((state) => state.isRightSidebarOpen);
  const setRightSidebarOpen = usePlayerStore((state) => state.setRightSidebarOpen);
  const activeRightSidebarTab = usePlayerStore((state) => state.activeRightSidebarTab);
  const setActiveRightSidebarTab = usePlayerStore((state) => state.setActiveRightSidebarTab);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const userQueue = usePlayerStore((state) => state.userQueue);
  const removeFromUserQueue = usePlayerStore((state) => state.removeFromUserQueue);
  const reorderUserQueue = usePlayerStore((state) => state.reorderUserQueue);
  const clearUserQueue = usePlayerStore((state) => state.clearUserQueue);
  const queue = usePlayerStore((state) => state.queue);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const clearQueue = usePlayerStore((state) => state.clearQueue);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);

  const isFavorite = React.useMemo(() => favorites.includes(currentTrack?.id ?? ''), [favorites, currentTrack?.id]);

  if (!isRightSidebarOpen) return null;

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const accentColor = currentTrack?.dominantColor || currentTrack?.accentColor || '#FA243C';

  return (
    <aside
      dir={dir}
      className="hidden xl:flex w-84 flex-col apple-glass-card rounded-[28px] my-3 ms-3 p-4.5 z-30 select-none h-[calc(100vh-6.5rem)] overflow-hidden border border-white/[0.1] shadow-[0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-3xl"
    >
      {/* Header with Liquid Tabs */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <button
            onClick={() => setActiveRightSidebarTab('queue')}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer apple-spring ${
              activeRightSidebarTab === 'queue'
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/30'
                : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {isRTL ? 'قائمة الانتظار' : 'Up Next'}
          </button>
          <button
            onClick={() => setActiveRightSidebarTab('now_playing')}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer apple-spring ${
              activeRightSidebarTab === 'now_playing'
                ? 'bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white shadow-md shadow-[#FA243C]/30'
                : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {isRTL ? 'يعمل الآن' : 'Now Playing'}
          </button>
        </div>

        <button
          onClick={() => setRightSidebarOpen(false)}
          className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title={isRTL ? 'إغلاق اللوحة الجانبية' : 'Close panel'}
          aria-label="Close Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: QUEUE */}
      {activeRightSidebarTab === 'queue' && (
        <div className="flex-1 flex flex-col min-h-0 pt-3.5">
          {/* Now Playing Mini Glass Card */}
          {currentTrack && (
            <div className="mb-4 flex-shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/55 block mb-2 ps-1">
                {isRTL ? 'المسار النشط' : 'Active Track'}
              </span>
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.1] shadow-lg">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/15">
                  <img
                    src={currentTrack.coverUrl || currentTrack.artworkUrl || '/logo.svg'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FA243C] animate-ping" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-white truncate leading-relaxed">
                    <bdi dir="auto">{currentTrack.title}</bdi>
                  </h5>
                  <p className="text-[11px] text-white/60 truncate mt-0.5 leading-relaxed">
                    <bdi dir="auto">{currentTrack.artist}</bdi>
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(currentTrack.id)}
                  className="p-2 text-white/60 hover:text-[#FA243C] transition-colors cursor-pointer"
                  aria-label="Favorite"
                >
                  <Heart
                    className={`w-4 h-4 transition-transform active:scale-125 ${
                      isFavorite ? 'text-[#FA243C] fill-[#FA243C]' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pe-1 no-scrollbar min-h-0 space-y-4">
            {/* 1. Dynamic User Queue (Up Next) */}
            <div>
              <div className="flex items-center justify-between mb-2 ps-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/75">
                    {isRTL ? 'قائمة الانتظار المباشرة' : 'Direct Queue'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#FA243C]/20 text-[#FA243C] border border-[#FA243C]/35 font-mono">
                    {userQueue.length}/{MAX_USER_QUEUE}
                  </span>
                </div>
                {userQueue.length > 0 && (
                  <button
                    onClick={clearUserQueue}
                    className="text-[10px] font-bold text-white/50 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isRTL ? 'مسح' : 'Clear'}</span>
                  </button>
                )}
              </div>

              {userQueue.length === 0 ? (
                <div className="py-5 px-3 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center">
                  <p className="text-[11px] text-white/60 font-medium">
                    {isRTL ? 'قائمة الانتظار المباشرة فارغة' : 'Queue is empty'}
                  </p>
                  <p className="text-[9px] mt-1 text-white/40">
                    {isRTL ? 'اسحب أي أغنية أو انقر "تشغيل التالية"' : 'Swipe or tap "Play Next" on any song'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {userQueue.map((track, idx) => (
                    <div
                      key={`sidebar_user_${track.id}_${idx}`}
                      className="group flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
                      onClick={() => playTrack(track)}
                    >
                      <span className="w-4 text-center text-[10px] font-bold text-[#FA243C] font-mono">
                        {idx + 1}
                      </span>

                      <img
                        src={track.coverUrl || track.artworkUrl || '/logo.svg'}
                        alt={track.title}
                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-white/10"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate leading-relaxed">
                          <bdi dir="auto">{track.title}</bdi>
                        </p>
                        <p className="text-[10px] text-white/60 truncate leading-relaxed">
                          <bdi dir="auto">{track.artist}</bdi>
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              reorderUserQueue(idx, idx - 1);
                            }}
                            className="p-1 text-white/60 hover:text-white cursor-pointer"
                            title={isRTL ? 'تقديم' : 'Move Up'}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < userQueue.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              reorderUserQueue(idx, idx + 1);
                            }}
                            className="p-1 text-white/60 hover:text-white cursor-pointer"
                            title={isRTL ? 'تأخير' : 'Move Down'}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromUserQueue(idx);
                          }}
                          className="p-1 text-white/60 hover:text-red-400 transition-colors cursor-pointer"
                          title={isRTL ? 'إزالة' : 'Remove'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Sequential Playlist Context */}
            <div>
              <div className="flex items-center justify-between mb-2 ps-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">
                  {isRTL ? `التالي من القائمة (${queue.length})` : `Up Next (${queue.length})`}
                </span>
                {queue.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="text-[10px] font-bold text-white/50 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isRTL ? 'مسح' : 'Clear'}</span>
                  </button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="py-6 text-center text-white/40">
                  <ListMusic className="w-7 h-7 mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs font-medium">{isRTL ? 'لا توجد مسارات متبقية' : 'No tracks remaining'}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {queue.slice(0, 40).map((track, idx) => (
                    <div
                      key={`sidebar_playlist_${track.id}_${idx}`}
                      className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all cursor-pointer"
                      onClick={() => playTrack(track)}
                    >
                      <span className="w-4 text-center text-[10px] text-white/40 group-hover:hidden font-mono">
                        {idx + 1}
                      </span>
                      <Play className="w-3.5 h-3.5 text-white hidden group-hover:block fill-current" />

                      <img
                        src={track.coverUrl || track.artworkUrl || '/logo.svg'}
                        alt={track.title}
                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-white/10"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white group-hover:text-[#FF375F] truncate transition-colors leading-relaxed">
                          <bdi dir="auto">{track.title}</bdi>
                        </p>
                        <p className="text-[10px] text-white/60 truncate leading-relaxed">
                          <bdi dir="auto">{track.artist}</bdi>
                        </p>
                      </div>

                      <span className="text-[10px] text-white/45 font-mono flex-shrink-0 group-hover:hidden tabular-nums">
                        {formatDuration(track.duration)}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(idx);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/50 hover:text-red-400 transition-all cursor-pointer"
                        title={isRTL ? 'إزالة' : 'Remove'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NOW PLAYING DETAILS */}
      {activeRightSidebarTab === 'now_playing' && (
        <div className="flex-1 overflow-y-auto pt-3.5 pe-1 no-scrollbar space-y-4">
          {currentTrack ? (
            <>
              {/* High-res Artwork with Dynamic Ambient Shadow */}
              <div
                style={{ boxShadow: `0 16px 40px -10px ${accentColor}40` }}
                className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/40 group border border-white/15 transition-shadow duration-500"
              >
                <img
                  src={currentTrack.coverUrl || currentTrack.artworkUrl || '/logo.svg'}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Title & Artist */}
              <div className="flex items-start justify-between gap-3 ps-1">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-white truncate hover:underline cursor-pointer leading-relaxed">
                    <bdi dir="auto">{currentTrack.title}</bdi>
                  </h3>
                  <p className="text-xs text-white/70 truncate mt-0.5 hover:underline cursor-pointer leading-relaxed">
                    <bdi dir="auto">{currentTrack.artist}</bdi>
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(currentTrack.id)}
                  className="p-1.5 text-white/60 hover:text-[#FA243C] transition-colors cursor-pointer"
                  aria-label="Favorite"
                >
                  <Heart
                    className={`w-5 h-5 transition-transform active:scale-125 ${
                      isFavorite ? 'text-[#FA243C] fill-[#FA243C]' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Audio Specs Apple Glass Card */}
              <div className="p-3.5 rounded-2xl apple-glass-card border border-white/[0.1] space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-white/65">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Disc className="w-3.5 h-3.5 text-[#FA243C]" />
                    <span>{isRTL ? 'الألبوم' : 'Album'}</span>
                  </span>
                  <span className="text-white font-bold truncate max-w-[140px]">
                    <bdi dir="auto">{currentTrack.album || (isRTL ? 'ألبوم فردي' : 'Single')}</bdi>
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/65">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-[#FA243C]" />
                    <span>{isRTL ? 'جودة الصوت' : 'Quality'}</span>
                  </span>
                  <span className="text-[#FA243C] font-extrabold text-[10px] bg-[#FA243C]/15 border border-[#FA243C]/30 px-2 py-0.5 rounded-full font-mono">
                    ALAC Lossless 24-Bit
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/65">
                  <span className="font-medium">{isRTL ? 'المصدر' : 'Source'}</span>
                  <span className="text-white/90 font-bold">
                    {currentTrack.source === 'local' ? (isRTL ? 'مكتبة محلية آمنة' : 'Local Storage') : (isRTL ? 'بث سحابي' : 'Cloud Stream')}
                  </span>
                </div>
              </div>

              {/* Artist Card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/55 block">
                  {isRTL ? 'عن الفنان' : 'About Artist'}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FA243C] to-[#FF375F] flex items-center justify-center font-black text-white text-sm shadow-md shadow-[#FA243C]/25">
                    {currentTrack.artist.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-white truncate leading-relaxed">
                      <bdi dir="auto">{currentTrack.artist}</bdi>
                    </h5>
                    <p className="text-[10px] text-white/60">
                      {isRTL ? 'فنان في مكتبتك' : 'Artist in your library'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-white/40">
              <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">{isRTL ? 'لا توجد أغنية تعمل حالياً' : 'No track playing'}</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
