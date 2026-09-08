import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { X, Trash2, ListMusic, Heart, Play, Radio, Sparkles, Disc } from 'lucide-react';

export const RightSidebar: React.FC = () => {
  const isRightSidebarOpen = usePlayerStore((state) => state.isRightSidebarOpen);
  const setRightSidebarOpen = usePlayerStore((state) => state.setRightSidebarOpen);
  const activeRightSidebarTab = usePlayerStore((state) => state.activeRightSidebarTab);
  const setActiveRightSidebarTab = usePlayerStore((state) => state.setActiveRightSidebarTab);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const queue = usePlayerStore((state) => state.queue);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const clearQueue = usePlayerStore((state) => state.clearQueue);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);

  if (!isRightSidebarOpen) return null;

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <aside className="hidden xl:flex w-80 flex-col bg-[#181818] rounded-xl my-2 ml-2 p-4 z-30 select-none h-[calc(100vh-7rem)] overflow-hidden border border-white/5 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveRightSidebarTab('queue')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              activeRightSidebarTab === 'queue'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            قائمة الانتظار
          </button>
          <button
            onClick={() => setActiveRightSidebarTab('now_playing')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              activeRightSidebarTab === 'now_playing'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            جاري التشغيل
          </button>
        </div>

        <button
          onClick={() => setRightSidebarOpen(false)}
          className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="إغلاق اللوحة الجانبية"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: QUEUE */}
      {activeRightSidebarTab === 'queue' && (
        <div className="flex-1 flex flex-col min-h-0 pt-3">
          {/* Now Playing Block */}
          {currentTrack && (
            <div className="mb-4 flex-shrink-0">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                يعمل الآن
              </span>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#282828] border border-white/5">
                <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={currentTrack.coverUrl || currentTrack.artworkUrl || '/logo.svg'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-[#1DB954] truncate">
                    {currentTrack.title}
                  </h5>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {currentTrack.artist}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(currentTrack.id)}
                  className="p-1.5 text-zinc-400 hover:text-[#1DB954] transition-colors cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      favorites.includes(currentTrack.id)
                        ? 'text-[#1DB954] fill-[#1DB954]'
                        : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Up Next List */}
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              التالي في القائمة ({queue.length})
            </span>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-[11px] font-bold text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                مسح
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar min-h-0">
            {queue.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <ListMusic className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">قائمة الانتظار فارغة</p>
                <p className="text-[10px] mt-1 text-zinc-600">
                  اسحب أي أغنية لليسار لإضافتها هنا
                </p>
              </div>
            ) : (
              queue.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => playTrack(track)}
                >
                  <span className="w-4 text-center text-[10px] text-zinc-500 group-hover:hidden">
                    {idx + 1}
                  </span>
                  <Play className="w-4 h-4 text-white hidden group-hover:block fill-current" />

                  <img
                    src={track.coverUrl || track.artworkUrl || '/logo.svg'}
                    alt={track.title}
                    className="w-9 h-9 rounded object-cover flex-shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {track.artist}
                    </p>
                  </div>

                  <span className="text-[10px] text-zinc-500 flex-shrink-0 group-hover:hidden">
                    {formatDuration(track.duration)}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(idx);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-400 transition-opacity cursor-pointer"
                    title="إزالة من القائمة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NOW PLAYING DETAILS */}
      {activeRightSidebarTab === 'now_playing' && (
        <div className="flex-1 overflow-y-auto pt-3 pr-1 no-scrollbar space-y-4">
          {currentTrack ? (
            <>
              {/* High-res Artwork */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-2xl bg-[#242424] group">
                <img
                  src={currentTrack.coverUrl || currentTrack.artworkUrl || '/logo.svg'}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title & Artist */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white truncate hover:underline cursor-pointer">
                    {currentTrack.title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate mt-0.5 hover:underline cursor-pointer">
                    {currentTrack.artist}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(currentTrack.id)}
                  className="p-1.5 text-zinc-400 hover:text-[#1DB954] transition-colors cursor-pointer"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favorites.includes(currentTrack.id)
                        ? 'text-[#1DB954] fill-[#1DB954]'
                        : ''
                    }`}
                  />
                </button>
              </div>

              {/* Audio Specs Badge */}
              <div className="p-3 rounded-xl bg-[#242424] border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Disc className="w-3.5 h-3.5 text-[#1DB954]" />
                    الألبوم
                  </span>
                  <span className="text-white font-medium truncate max-w-[140px]">
                    {currentTrack.album || 'ألبوم فردي'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                    جودة الصوت
                  </span>
                  <span className="text-[#1DB954] font-bold text-[11px] bg-[#1DB954]/10 px-2 py-0.5 rounded-full">
                    Lossless 320kbps
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>المصدر</span>
                  <span className="text-zinc-300">
                    {currentTrack.source === 'local' ? 'مكتبة محلية آمنة' : 'معاينة تجريبية'}
                  </span>
                </div>
              </div>

              {/* Artist Card */}
              <div className="p-3.5 rounded-xl bg-[#242424] border border-white/5 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  عن الفنان
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-white text-sm">
                    {currentTrack.artist.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-white truncate">
                      {currentTrack.artist}
                    </h5>
                    <p className="text-[10px] text-zinc-400">
                      فنان متألق في مكتبتك
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-zinc-500">
              <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">لا توجد أغنية تعمل حالياً</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
