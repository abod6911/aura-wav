import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { X, ListMusic, Trash2, ArrowUp, ArrowDown, Play } from 'lucide-react';

export const QueueDrawer: React.FC = () => {
  const isQueueOpen = usePlayerStore((state) => state.isQueueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);

  const queue = usePlayerStore((state) => state.queue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const reorderQueue = usePlayerStore((state) => state.reorderQueue);

  if (!isQueueOpen) return null;

  const currentIdx = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;
  const upNextList = currentIdx >= 0 ? queue.slice(currentIdx + 1) : queue;

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md h-full bg-[#121218]/95 border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">قائمة الانتظار (Queue)</h2>
              <p className="text-xs text-aura-textSecondary">{queue.length} مسار في القائمة</p>
            </div>
          </div>
          <button
            onClick={() => setQueueOpen(false)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Currently Playing Card */}
          {currentTrack && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                يعمل الآن
              </span>
              <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3">
                <img
                  src={currentTrack.artworkUrl || '/logo.svg'}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
                  <p className="text-xs text-aura-textSecondary truncate">{currentTrack.artist}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" />
                  <div className="w-1 h-5 bg-indigo-400 rounded-full animate-pulse delay-75" />
                  <div className="w-1 h-2 bg-indigo-300 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* Up Next List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-aura-textSecondary uppercase tracking-wider">
              المسارات القادمة ({upNextList.length})
            </span>

            {upNextList.length === 0 ? (
              <div className="text-center py-10 text-aura-muted text-sm border border-dashed border-white/10 rounded-2xl">
                لا توجد مسارات متبقية في القائمة.
              </div>
            ) : (
              <div className="space-y-2">
                {upNextList.map((track, relativeIdx) => {
                  const actualIdx = currentIdx + 1 + relativeIdx;
                  return (
                    <div
                      key={`${track.id}_${actualIdx}`}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 flex items-center gap-3 transition-colors group"
                    >
                      <img
                        src={track.artworkUrl || '/logo.svg'}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                        <p className="text-[11px] text-aura-textSecondary truncate">{track.artist}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => playTrack(track)}
                          title="تشغيل فوري"
                          className="p-1.5 rounded-lg hover:bg-indigo-600/30 text-indigo-400"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        {relativeIdx > 0 && (
                          <button
                            onClick={() => reorderQueue(actualIdx, actualIdx - 1)}
                            title="تقديم"
                            className="p-1 rounded-lg hover:bg-white/10 text-white/60"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {relativeIdx < upNextList.length - 1 && (
                          <button
                            onClick={() => reorderQueue(actualIdx, actualIdx + 1)}
                            title="تأخير"
                            className="p-1 rounded-lg hover:bg-white/10 text-white/60"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeFromQueue(actualIdx)}
                          title="إزالة"
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
