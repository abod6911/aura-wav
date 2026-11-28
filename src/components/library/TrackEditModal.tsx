import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { searchOnlineArtworkCandidates, ArtworkCandidate } from '../../lib/metadata';
import { X, Save, Upload, Search, Music, Disc, User, Tag, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../i18n/useTranslation';

export const TrackEditModal: React.FC = () => {
  const { isRTL, dir } = useTranslation();
  const isOpen = usePlayerStore((state) => state.isTrackEditOpen);
  const targetTrack = usePlayerStore((state) => state.trackEditTarget);
  const setTrackEditOpen = usePlayerStore((state) => state.setTrackEditOpen);
  const updateTrackMetadata = usePlayerStore((state) => state.updateTrackMetadata);

  // Form State
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');

  // Artwork State
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [newArtworkBlob, setNewArtworkBlob] = useState<Blob | null>(null);
  const [isSearchingArtwork, setIsSearchingArtwork] = useState(false);
  const [candidates, setCandidates] = useState<ArtworkCandidate[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (targetTrack && isOpen) {
      setTitle(targetTrack.title || '');
      setArtist(targetTrack.artist || '');
      setAlbum(targetTrack.album || '');
      setGenre(targetTrack.genre || '');
      setYear(targetTrack.year ? String(targetTrack.year) : '');
      setArtworkPreview(targetTrack.artworkUrl || targetTrack.coverUrl || null);
      setNewArtworkBlob(null);
      setCandidates([]);
    }
  }, [targetTrack, isOpen]);

  if (!isOpen || !targetTrack) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = new Blob([file], { type: file.type || 'image/png' });
    setNewArtworkBlob(blob);
    setArtworkPreview(URL.createObjectURL(blob));
  };

  const handleSearchArtwork = async () => {
    const q = `${artist} ${title}`.trim();
    if (!q) return;
    setIsSearchingArtwork(true);
    try {
      const results = await searchOnlineArtworkCandidates(q);
      setCandidates(results);
    } catch {
      setCandidates([]);
    } finally {
      setIsSearchingArtwork(false);
    }
  };

  const handleSelectCandidate = async (candidate: ArtworkCandidate) => {
    try {
      const res = await fetch(candidate.artworkUrl);
      if (!res.ok) throw new Error('Fetch artwork failed');
      const blob = await res.blob();
      setNewArtworkBlob(blob);
      setArtworkPreview(URL.createObjectURL(blob));
    } catch (err) {
      console.warn('[TrackEditModal] Candidate cover selection error:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateTrackMetadata(
        targetTrack.id,
        {
          title: title.trim() || targetTrack.title,
          artist: artist.trim() || targetTrack.artist,
          album: album.trim() || targetTrack.album,
          genre: genre.trim() || undefined,
          year: year.trim() || undefined,
        },
        newArtworkBlob || undefined,
        artworkPreview || undefined
      );
      setTrackEditOpen(false);
    } catch (err) {
      console.warn('[TrackEditModal] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-4 select-none" dir={dir}>
        {/* Matte Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setTrackEditOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window: Spotify Matte Charcoal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#181818] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-white overflow-hidden z-10 max-h-[90dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-[#1DB954]">
                <Music className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isRTL ? 'تعديل المسار والغلاف' : 'Edit Track & Artwork'}
              </h2>
            </div>
            <button
              onClick={() => setTrackEditOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-5 no-scrollbar pe-1">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 items-start">
              {/* Artwork Column */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-xl overflow-hidden bg-black/50 border border-white/[0.08] shadow-md group shrink-0">
                  <img
                    src={artworkPreview || './logo.svg'}
                    alt="Cover Preview"
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 cursor-pointer text-white text-xs font-semibold">
                    <Upload className="w-5 h-5 text-[#1DB954]" />
                    <span>{isRTL ? 'رفع صورة' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleSearchArtwork}
                    disabled={isSearchingArtwork}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/[0.06]"
                  >
                    {isSearchingArtwork ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1DB954]" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>{isRTL ? 'بحث تلقائي' : 'Search Web'}</span>
                  </button>
                </div>
              </div>

              {/* Metadata Inputs */}
              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{isRTL ? 'عنوان الأغنية' : 'Title'}</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    dir="auto"
                    required
                    className="w-full bg-[#121212] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                  />
                </div>

                {/* Artist */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{isRTL ? 'الفنان' : 'Artist'}</span>
                  </label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    dir="auto"
                    required
                    className="w-full bg-[#121212] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                  />
                </div>

                {/* Album */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                    <Disc className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{isRTL ? 'الألبوم' : 'Album'}</span>
                  </label>
                  <input
                    type="text"
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    dir="auto"
                    className="w-full bg-[#121212] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                  />
                </div>

                {/* Genre & Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{isRTL ? 'النوع الموسيقي' : 'Genre'}</span>
                    </label>
                    <input
                      type="text"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      dir="auto"
                      className="w-full bg-[#121212] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{isRTL ? 'سنة الإصدار' : 'Year'}</span>
                    </label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      dir="auto"
                      placeholder="e.g. 2024"
                      className="w-full bg-[#121212] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Online Candidates Grid */}
            {candidates.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <span className="text-xs font-semibold text-zinc-400 block">
                  {isRTL ? 'أغلفة عُثر عليها عبر الويب (انقر للاختيار):' : 'Web Artworks Found (Tap to select):'}
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto no-scrollbar p-1">
                  {candidates.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectCandidate(c)}
                      className="relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-[#1DB954] transition-colors cursor-pointer group"
                    >
                      <img src={c.artworkUrl} alt={c.album || c.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                        <span className="text-[10px] text-white font-bold truncate">{c.artist || c.album}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setTrackEditOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs shadow-lg shadow-black/50 transition-[transform,background-color] active:scale-95 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isRTL ? 'حفظ التعديلات' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
