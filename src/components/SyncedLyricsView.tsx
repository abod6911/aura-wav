import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { getActiveLyricIndex } from '../services/lyricsParser';
import { X, Music2, Sparkles } from 'lucide-react';

export const SyncedLyricsView: React.FC = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const seek = usePlayerStore((state) => state.seek);
  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore((state) => state.setLyricsOpen);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  const lyrics = currentTrack?.syncedLyrics || [];
  const activeIndex = getActiveLyricIndex(lyrics, currentTime);

  // Auto-scroll active line into center
  useEffect(() => {
    if (activeLineRef.current && isLyricsOpen) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isLyricsOpen]);

  if (!isLyricsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 md:p-8 animate-fadeIn">
      {/* Background Album Art Blur */}
      {currentTrack?.artworkUrl && (
        <div
          className="absolute inset-0 -z-10 opacity-25 filter blur-[120px] bg-cover bg-center transition-all duration-1000 scale-125"
          style={{ backgroundImage: `url(${currentTrack.artworkUrl})` }}
        />
      )}

      {/* Header Bar */}
      <div className="w-full max-w-3xl flex items-center justify-between py-2 border-b border-white/10 select-none">
        <div className="flex items-center gap-3">
          {currentTrack?.artworkUrl && (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10"
            />
          )}
          <div>
            <h3 className="font-bold text-white text-base md:text-lg truncate max-w-[200px] md:max-w-md">
              {currentTrack?.title || 'لا يوجد مسار'}
            </h3>
            <p className="text-sm text-aura-textSecondary truncate">
              {currentTrack?.artist}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-[#FF456E]">
            <Sparkles className="w-3.5 h-3.5 text-[#FA243C] animate-pulse" />
            <span>كلمات متزامنة حية</span>
          </div>
          <button
            onClick={() => setLyricsOpen(false)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lyrics Scrollable Container */}
      <div
        ref={containerRef}
        className="w-full max-w-3xl flex-1 overflow-y-auto py-24 space-y-7 md:space-y-9 text-right scroll-smooth select-none px-4"
      >
        {lyrics.length > 0 ? (
          lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={`${line.time}_${idx}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => seek(line.time)}
                className={`cursor-pointer transition-all duration-300 transform origin-right ${
                  isActive
                    ? 'text-white font-extrabold text-2xl md:text-4xl scale-105 drop-shadow-[0_4px_24px_rgba(250,36,60,0.5)]'
                    : isPast
                    ? 'text-white/45 font-medium text-lg md:text-2xl hover:text-white/80'
                    : 'text-white/30 font-medium text-lg md:text-2xl hover:text-white/70'
                }`}
              >
                <p className="leading-relaxed tracking-wide font-sans">
                  {line.text}
                </p>
              </div>
            );
          })
        ) : currentTrack?.lyrics ? (
          <div className="text-center py-20 text-aura-textSecondary space-y-4 whitespace-pre-line text-lg leading-loose">
            <Music2 className="w-12 h-12 mx-auto text-[#FA243C] opacity-60" />
            <p className="text-white text-xl font-semibold">كلمات الأغنية غير متزامنة</p>
            <div className="max-w-lg mx-auto text-white/70">{currentTrack.lyrics}</div>
          </div>
        ) : (
          <div className="text-center py-24 text-aura-textSecondary space-y-4">
            <Music2 className="w-14 h-14 mx-auto text-[#FA243C] animate-pulse opacity-50" />
            <p className="text-white text-xl font-semibold">لا توجد كلمات متزامنة متاحة لهذا المسار</p>
            <p className="text-sm text-aura-muted max-w-sm mx-auto">
              جاري البحث التلقائي عبر مكتبة الكلمات المفتوحة أو يمكنك تضمين ملف .lrc بنفس اسم الأغنية.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-xs text-white/40 pb-2 select-none">
        اضغط على أي سطر للانتقال المباشر لتلك اللحظة في الأغنية
      </div>
    </div>
  );
};
