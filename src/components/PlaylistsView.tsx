import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { ListMusic, Plus, Play, Trash2, ArrowRight, Heart, MoreHorizontal, Radio, ListPlus, Clock } from 'lucide-react';
import { formatTime } from './player/TimelineSlider';
import { Track } from '../types';

export const PlaylistsView: React.FC = () => {
  const playlists = usePlayerStore((state) => state.playlists);
  const tracks = usePlayerStore((state) => state.tracks);
  const createPlaylist = usePlayerStore((state) => state.createPlaylist);
  const deletePlaylist = usePlayerStore((state) => state.deletePlaylist);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const favorites = usePlayerStore((state) => state.favorites);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue);
  const addToast = usePlayerStore((state) => state.addToast);

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const playlistTracks = selectedPlaylist
    ? tracks.filter((t) => selectedPlaylist.trackIds.includes(t.id))
    : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    addToast(`تم إنشاء قائمة: ${newPlaylistName.trim()} 🎉`, '🎉', 'success');
    setNewPlaylistName('');
    setIsCreating(false);
  };

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) {
      playTrack(playlistTracks[0], playlistTracks);
      addToast(`تشغيل قائمة: ${selectedPlaylist?.name}`, '▶️');
    }
  };

  if (selectedPlaylist) {
    return (
      <div className="space-y-6 pb-32">
        {/* Back Button & Playlist Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedPlaylistId(null)}
              className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{selectedPlaylist.name}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {playlistTracks.length} مسار في هذه القائمة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {playlistTracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="px-5 py-2.5 rounded-2xl bg-white text-black font-extrabold text-xs flex items-center gap-2 shadow-lg hover:bg-zinc-200 transition-all"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>تشغيل الكل</span>
              </button>
            )}
            <button
              onClick={() => {
                deletePlaylist(selectedPlaylist.id);
                addToast('تم حذف قائمة التشغيل', '🗑️');
                setSelectedPlaylistId(null);
              }}
              className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="حذف القائمة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tracks List (Strict LTR Table with Zero Empty Space) */}
        {playlistTracks.length > 0 ? (
          <div dir="ltr" className="w-full max-w-full space-y-1">
            <div className="hidden md:grid grid-cols-[44px_56px_minmax(220px,2fr)_minmax(140px,1.2fr)_48px_70px_44px] items-center gap-4 px-4 py-3 text-xs font-bold text-zinc-400 border-b border-white/[0.08] select-none uppercase tracking-wider">
              <span className="text-center font-mono">#</span>
              <span>Cover</span>
              <span>Title & Artist</span>
              <span>Album</span>
              <span className="text-center"><Heart className="w-3.5 h-3.5 mx-auto opacity-70" /></span>
              <span className="text-right font-mono flex items-center justify-end gap-1"><Clock className="w-3 h-3" /><span>Time</span></span>
              <span />
            </div>

            {playlistTracks.map((track, idx) => {
              const isCur = currentTrack?.id === track.id;
              const isFav = favorites.includes(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => (isCur ? togglePlayPause() : playTrack(track, playlistTracks))}
                  className={`group grid grid-cols-[36px_48px_1fr_40px_55px] md:grid-cols-[44px_56px_minmax(220px,2fr)_minmax(140px,1.2fr)_48px_70px_44px] items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
                    isCur
                      ? 'bg-gradient-to-r from-[#FA243C]/20 via-[#FF2D55]/10 to-transparent border border-[#FA243C]/35 shadow-[0_4px_24px_rgba(250,36,60,0.2)]'
                      : 'hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <div className="text-center flex items-center justify-center">
                    {isCur && isPlaying ? (
                      <div className="flex items-end gap-[2px] h-3.5">
                        <span className="w-1 bg-[#FA243C] rounded-full animate-[bounce_0.8s_infinite] h-full" />
                        <span className="w-1 bg-[#FA243C] rounded-full animate-[bounce_0.6s_infinite] h-2/3" />
                        <span className="w-1 bg-[#FA243C] rounded-full animate-[bounce_1s_infinite] h-4/5" />
                      </div>
                    ) : (
                      <span className={`text-xs font-mono group-hover:hidden ${isCur ? 'text-[#FA243C] font-bold' : 'text-zinc-500'}`}>
                        {idx + 1}
                      </span>
                    )}
                    <Play className="w-3.5 h-3.5 text-white hidden group-hover:block fill-white" />
                  </div>

                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-sm flex-shrink-0">
                    <img src={track.artworkUrl || '/logo.svg'} alt={track.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="min-w-0 pr-2">
                    <h4 dir="auto" className={`text-sm md:text-[15px] font-bold truncate tracking-tight ${isCur ? 'text-[#FF456E]' : 'text-white'}`}>
                      {track.title}
                    </h4>
                    <p dir="auto" className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                  </div>

                  <div dir="auto" className="hidden md:block text-xs text-zinc-400 truncate">{track.album || 'Single'}</div>

                  <div className="text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(track.id); }}
                      className="p-2 rounded-full hover:bg-white/10"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-red-500' : 'text-zinc-600'}`} />
                    </button>
                  </div>

                  <div className="text-xs font-mono text-zinc-400 text-right tabular-nums">{formatTime(track.duration)}</div>

                  <div className="relative hidden md:block group/menu">
                    <button onClick={(e) => e.stopPropagation()} className="p-2 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <div className="hidden group-hover/menu:block absolute right-0 top-8 z-30 w-44 bg-[#12121a] border border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-1">
                      <button onClick={(e) => { e.stopPropagation(); playNextInQueue(track); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left">
                        <Radio className="w-3.5 h-3.5 text-[#FA243C]" />
                        <span>تشغيل التالي</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); addToQueue(track); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 text-left">
                        <ListPlus className="w-3.5 h-3.5 text-[#FF2D55]" />
                        <span>إضافة للانتظار</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-400 text-sm border border-dashed border-white/10 rounded-3xl">
            لا توجد أغانٍ في هذه القائمة بعد. يمكنك إضافة أي أغنية من القائمة الرئيسية عبر قائمة الخيارات (...).
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">قوائم التشغيل الخاصة</h2>
          <p className="text-xs text-zinc-400 mt-0.5">قم بتنظيم أغانيك حسب المود والأنواع</p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-5 py-2.5 rounded-2xl bg-white text-black font-extrabold text-xs flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>قائمة جديدة</span>
        </button>
      </div>

      {/* Create Playlist Form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="p-4 rounded-2xl bg-white/[0.04] border border-[#FA243C]/30 flex items-center gap-3 animate-fadeIn"
        >
          <input
            type="text"
            placeholder="اسم قائمة التشغيل (مثال: أغاني الخط السريع، ليلية...)"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FA243C]"
            autoFocus
          />
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#FA243C] hover:bg-[#FF375F] text-white text-xs font-bold transition-all shadow-md shadow-[#FA243C]/30 cursor-pointer">
            إنشاء
          </button>
          <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-zinc-400 text-xs hover:text-white cursor-pointer">
            إلغاء
          </button>
        </form>
      )}

      {/* Playlists Grid */}
      {playlists.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => setSelectedPlaylistId(pl.id)}
              className="group p-4 rounded-3xl bg-white/[0.03] border border-white/[0.08] hover:border-[#FA243C]/40 hover:bg-white/[0.06] transition-all cursor-pointer space-y-3 shadow-xl"
            >
              <div className="w-full aspect-square rounded-2xl bg-gradient-to-tr from-[#FA243C]/20 to-[#FF2D55]/10 border border-white/10 flex items-center justify-center group-hover:scale-[1.03] transition-transform">
                <ListMusic className="w-10 h-10 text-[#FA243C] group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm truncate">{pl.name}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">{pl.trackIds.length} أغنية</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 space-y-3 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
          <ListMusic className="w-12 h-12 mx-auto text-zinc-600" />
          <h4 className="text-base font-bold text-white">لا توجد قوائم تشغيل بعد</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            اضغط على &quot;قائمة جديدة&quot; لإنشاء قائمة تشغيل مخصصة لمجموعتك المفضلة من الأغاني.
          </p>
        </div>
      )}
    </div>
  );
};
