import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { searchOnlineArtworkCandidates, generateLuxuryCanvasArtwork, ArtworkCandidate } from '../lib/metadata';
import { X, Search, Upload, Sparkles, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChangeArtworkModal: React.FC = () => {
  const isOpen = usePlayerStore((state) => state.isChangeArtworkOpen);
  const targetTrack = usePlayerStore((state) => state.artworkTargetTrack);
  const setChangeArtworkModal = usePlayerStore((state) => state.setChangeArtworkModal);
  const updateTrackArtwork = usePlayerStore((state) => state.updateTrackArtwork);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<ArtworkCandidate[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedArtworkUrl, setSelectedArtworkUrl] = useState<string | null>(null);

  useEffect(() => {
    if (targetTrack && isOpen) {
      const initialQuery = `${targetTrack.artist !== 'Unknown Artist' ? targetTrack.artist : ''} ${targetTrack.title}`.trim();
      setQuery(initialQuery);
      setSelectedArtworkUrl(targetTrack.artworkUrl || null);
      handleSearch(initialQuery);
    } else {
      setCandidates([]);
    }
  }, [targetTrack, isOpen]);

  if (!isOpen || !targetTrack) return null;

  const handleSearch = async (searchTerm?: string) => {
    const q = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const results = await searchOnlineArtworkCandidates(q);
      setCandidates(results);
    } catch {
      setCandidates([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCandidate = async (candidate: ArtworkCandidate) => {
    setIsApplying(true);
    try {
      const res = await fetch(candidate.artworkUrl);
      if (!res.ok) throw new Error('Failed to download artwork');
      const blob = await res.blob();
      const newUrl = URL.createObjectURL(blob);
      await updateTrackArtwork(targetTrack.id, blob, newUrl);
      setChangeArtworkModal(false);
    } catch (err) {
      console.warn('Error applying candidate cover:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsApplying(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const blob = new Blob([arrayBuf], { type: file.type || 'image/png' });
      const newUrl = URL.createObjectURL(blob);
      await updateTrackArtwork(targetTrack.id, blob, newUrl);
      setChangeArtworkModal(false);
    } catch (err) {
      console.warn('Error uploading custom artwork:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleGenerateLuxuryCover = async () => {
    setIsApplying(true);
    try {
      const blob = await generateLuxuryCanvasArtwork(targetTrack.title, targetTrack.artist);
      const newUrl = URL.createObjectURL(blob);
      await updateTrackArtwork(targetTrack.id, blob, newUrl);
      setChangeArtworkModal(false);
    } catch (err) {
      console.warn('Error generating luxury canvas artwork:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl select-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-xl bg-[#09090e]/95 border border-white/[0.1] rounded-3xl p-5 sm:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-4 relative overflow-hidden my-auto"
        >
          {/* Top Ambient Glow */}
          <div className="absolute top-0 right-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  تغيير غلاف الأغنية والبحث أونلاين
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  اختر صورة أونلاين بدقة عالية أو ارفع صورة من جوالك
                </p>
              </div>
            </div>

            <button
              onClick={() => setChangeArtworkModal(false)}
              className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Track Banner */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <img
              src={targetTrack.artworkUrl || '/logo.svg'}
              alt={targetTrack.title}
              className="w-14 h-14 rounded-xl object-cover border border-white/10 shadow-md flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{targetTrack.title}</h4>
              <p className="text-xs text-zinc-400 truncate">{targetTrack.artist}</p>
              <span className="text-[10px] text-zinc-500 block mt-0.5">{targetTrack.album || 'Single'}</span>
            </div>
            <button
              onClick={handleGenerateLuxuryCover}
              disabled={isApplying}
              title="إنشاء غلاف استوديو فخم 512x512 PNG متوافق مع الداينمك آيلند"
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>غلاف استوديو</span>
            </button>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم الأغنية أو الفنان..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer flex-shrink-0"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>بحث</span>
            </button>
          </form>

          {/* Candidates Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>نتائج الأغلفة الرسمية عالية الدقة (iTunes HD):</span>
              <span>{candidates.length} نتائج</span>
            </div>

            {isSearching ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                <span className="text-xs">جارٍ البحث عن أغلفة عالية الدقة...</span>
              </div>
            ) : candidates.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {candidates.map((cand) => {
                  const isCurrent = selectedArtworkUrl === cand.artworkUrl;
                  return (
                    <motion.div
                      key={cand.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectCandidate(cand)}
                      className={`relative rounded-2xl overflow-hidden border cursor-pointer group bg-black/40 ${
                        isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={cand.artworkUrl}
                        alt={cand.title}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <span className="text-[11px] font-bold text-white truncate">{cand.album || cand.title}</span>
                        <span className="text-[10px] text-zinc-300 truncate">{cand.artist}</span>
                      </div>
                      {isCurrent && (
                        <div className="absolute top-2 right-2 p-1 rounded-full bg-indigo-600 text-white shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                لم يتم العثور على نتائج للبحث الحالي. جرب تعديل كلمات البحث أو ارفع صورة من جوالك.
              </div>
            )}
          </div>

          {/* Upload Custom File */}
          <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <label className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>رفع صورة من الجوال / الكمبيوتر</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isApplying}
              />
            </label>

            <button
              onClick={() => setChangeArtworkModal(false)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
