import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TrackItem } from './TrackItem';
import { Search, FolderOpen, Heart, Music, Sparkles, Filter, X } from 'lucide-react';

interface TrackListProps {
  onOpenImport: () => void;
}

export const TrackList: React.FC<TrackListProps> = ({ onOpenImport }) => {
  const tracks = usePlayerStore((state) => state.tracks);
  const filteredTracks = usePlayerStore((state) => state.filteredTracks);
  const searchQuery = usePlayerStore((state) => state.searchQuery);
  const setSearchQuery = usePlayerStore((state) => state.setSearchQuery);
  const favorites = usePlayerStore((state) => state.favorites);

  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'local'>('all');

  const displayedTracks = filteredTracks.filter((track) => {
    if (activeFilter === 'favorites') return favorites.includes(track.id);
    if (activeFilter === 'local') return track.source === 'local';
    return true;
  });

  const hasOnlyDemoTracks = tracks.every((t) => t.source === 'demo');

  return (
    <div className="space-y-6 pb-28 md:pb-24">
      {/* Hero CTA Banner when Library has only Demo Tracks */}
      {hasOnlyDemoTracks && (
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-[#121218] border border-indigo-500/30 shadow-2xl">
          <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>جاهز للاستيراد الفوري</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                ابدأ بتحميل مكتبة أغانيك الخاصة
              </h2>
              <p className="text-sm text-aura-textSecondary leading-relaxed">
                يمكنك تحميل مجلد <code className="text-indigo-300 font-mono bg-white/10 px-1.5 py-0.5 rounded">Liked_Songs</code> المحلي واستخراج كافة أغلفة الألبومات والكلمات المتزامنة لتستمع إليها بدون إنترنت للأبد.
              </p>
            </div>

            <button
              onClick={onOpenImport}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2.5 transition-all shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <FolderOpen className="w-5 h-5" />
              <span>تحميل مكتبتي المحلية (261 أغنية)</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Header Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-aura-muted absolute right-3.5 top-3.5" />
          <input
            type="text"
            placeholder="ابحث باسم الأغنية، الفنان، أو الألبوم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.1] border border-white/10 focus:border-indigo-500/50 rounded-2xl py-2.5 pr-10 pl-10 text-sm text-white placeholder-aura-muted focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-3 text-aura-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-aura-textSecondary'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>الكل ({tracks.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('favorites')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeFilter === 'favorites'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                : 'bg-white/5 hover:bg-white/10 text-aura-textSecondary'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>المفضلة ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('local')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeFilter === 'local'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-aura-textSecondary'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>الأغاني المستوردة</span>
          </button>
        </div>
      </div>

      {/* Track List Table Header (Desktop) */}
      <div className="hidden md:flex items-center gap-4 px-4 py-2 text-xs font-semibold text-aura-muted border-b border-white/5 select-none">
        <div className="w-7 text-center">#</div>
        <div className="w-12">الغلاف</div>
        <div className="flex-1">العنوان والفنان</div>
        <div className="w-48">الألبوم</div>
        <div className="w-8 text-center">
          <Heart className="w-3.5 h-3.5 mx-auto opacity-70" />
        </div>
        <div className="w-12 text-left">المدة</div>
        <div className="w-6" />
      </div>

      {/* Track Items */}
      {displayedTracks.length > 0 ? (
        <div className="space-y-1">
          {displayedTracks.map((track, idx) => (
            <TrackItem key={track.id} track={track} index={idx} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 space-y-3 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
          <Filter className="w-10 h-10 mx-auto text-aura-muted opacity-40" />
          <h4 className="text-base font-semibold text-white">لم يتم العثور على أي نتائج</h4>
          <p className="text-xs text-aura-muted max-w-sm mx-auto">
            {searchQuery
              ? `لا توجد نتائج مطابقة لـ "${searchQuery}". جرب البحث بكلمات أخرى.`
              : 'لا توجد مسارات في هذا التصنيف حالياً.'}
          </p>
        </div>
      )}
    </div>
  );
};
