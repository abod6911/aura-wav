import React from 'react';
import { usePlayerStore, MAX_USER_QUEUE } from '../store/usePlayerStore';
import { X, ListMusic, Trash2, ArrowUp, ArrowDown, Play } from 'lucide-react';

export const QueueDrawer: React.FC = () => {
  const isQueueOpen = usePlayerStore((state) => state.isQueueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
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

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md h-full bg-[#121218]/95 border-l border-white/10 p-5 sm:p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#1DB954]/20 text-[#1DB954]">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">قائمة التشغيل (Queue)</h2>
              <p className="text-xs text-zinc-400">
                {userQueue.length > 0
                  ? `${userQueue.length} في الانتظار المباشر • ${upNextPlaylist.length} من القائمة`
                  : `${upNextPlaylist.length} مسار قادم`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setQueueOpen(false)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">
          {/* Section 1: Currently Playing */}
          {currentTrack && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#1DB954] uppercase tracking-wider block">
                يعمل الآن
              </span>
              <div className="p-3 rounded-2xl bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center gap-3">
                <img
                  src={currentTrack.artworkUrl || currentTrack.coverUrl || '/logo.svg'}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
                </div>
                {/* Dynamic animated equalizer */}
                <div className="flex items-end gap-1 h-5 px-1 flex-shrink-0">
                  <div className={`w-1 bg-[#1DB954] rounded-full transition-all duration-300 ${isPlaying ? 'h-5 animate-pulse' : 'h-2'}`} />
                  <div className={`w-1 bg-[#10B981] rounded-full transition-all duration-300 ${isPlaying ? 'h-3.5 animate-pulse delay-75' : 'h-2'}`} />
                  <div className={`w-1 bg-[#34D399] rounded-full transition-all duration-300 ${isPlaying ? 'h-4.5 animate-pulse delay-150' : 'h-2'}`} />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Spotify-Style Dynamic "Up Next" Queue (Max 9 Tracks) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  قائمة الانتظار المباشرة (Up Next)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1DB954]/20 text-[#1ed760] border border-[#1DB954]/30">
                  {userQueue.length}/{MAX_USER_QUEUE}
                </span>
              </div>

              {userQueue.length > 0 && (
                <button
                  onClick={clearUserQueue}
                  className="text-xs text-zinc-400 hover:text-red-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح</span>
                </button>
              )}
            </div>

            {userQueue.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-1.5">
                <p className="text-xs text-zinc-400 font-medium">قائمة الانتظار المباشرة فارغة</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  اسحب أي أغنية لليسار في المكتبة لتشغيلها تالياً بعد الأغنية الحالية مباشرة.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {userQueue.map((track, idx) => (
                  <div
                    key={`${track.id}_queue_${idx}`}
                    className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 flex items-center gap-3 transition-colors group"
                  >
                    <span className="text-xs font-mono font-bold text-[#1DB954] w-4 text-center">
                      {idx + 1}
                    </span>

                    <img
                      src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      {idx > 0 && (
                        <button
                          onClick={() => reorderUserQueue(idx, idx - 1)}
                          title="تقديم للأعلى"
                          className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {idx < userQueue.length - 1 && (
                        <button
                          onClick={() => reorderUserQueue(idx, idx + 1)}
                          title="تأخير للأسفل"
                          className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeFromUserQueue(idx)}
                        title="إزالة من قائمة الانتظار"
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Next From Playlist / Library */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              التالي من: {savedFolderName || 'المكتبة'} ({upNextPlaylist.length})
            </span>

            {upNextPlaylist.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs border border-dashed border-white/10 rounded-2xl">
                لا توجد مسارات متبقية في القائمة.
              </div>
            ) : (
              <div className="space-y-1">
                {upNextPlaylist.slice(0, 30).map((track, idx) => (
                  <div
                    key={`${track.id}_playlist_${idx}`}
                    className="p-2 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 flex items-center gap-3 transition-colors group cursor-pointer"
                    onClick={() => playTrack(track)}
                  >
                    <img
                      src={track.artworkUrl || track.coverUrl || '/logo.svg'}
                      alt={track.title}
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-white group-hover:text-[#1DB954] truncate transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(track);
                      }}
                      title="تشغيل فوري"
                      className="p-1.5 rounded-lg hover:bg-[#1DB954]/20 text-[#1DB954] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
