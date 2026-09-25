import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { searchOnlineArtworkCandidates, ArtworkCandidate } from '../../lib/metadata';
import { X, Save, Upload, Sparkles, Music, Disc, User, Calendar, Tag, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MetadataEditorModal: React.FC = () => {
  const isOpen = usePlayerStore((state) => state.isMetadataEditorOpen);
  const targetTrack = usePlayerStore((state) => state.metadataTargetTrack);
  const setMetadataEditorModal = usePlayerStore((state) => state.setMetadataEditorModal);
  const updateTrackMetadata = usePlayerStore((state) => state.updateTrackMetadata);

  // Form State
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');

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
      setBpm(targetTrack.bpm ? String(targetTrack.bpm) : '');
      setKey(targetTrack.key || '');
      setArtworkPreview(targetTrack.artworkUrl || null);
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
      console.warn('[MetadataEditor] Candidate cover selection error:', err);
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
          bpm: bpm.trim() ? parseInt(bpm, 10) : undefined,
          key: key.trim().toUpperCase() || undefined,
        },
        newArtworkBlob || undefined,
        artworkPreview || undefined
      );
      setMetadataEditorModal(false);
    } catch (err) {
      console.warn('[MetadataEditor] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xl select-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-[#0e0e15]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-5 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">تعديل بيانات الأغنية (ID3 Tags)</h3>
                <p className="text-xs text-zinc-400">حفظ دائم في وحدة التخزين OPFS وقاعدة بيانات Dexie</p>
              </div>
            </div>

            <button
              onClick={() => setMetadataEditorModal(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Artwork & Basic Info Header */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-black/40">
                <img
                  src={artworkPreview || '/logo.svg'}
                  alt={title}
                  className="w-full h-full object-cover"
                />
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-bold gap-1">
                  <Upload className="w-4 h-4 text-[#1DB954]" />
                  <span>تغيير</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">غلاف الأغنية:</span>
                  <button
                    type="button"
                    onClick={handleSearchArtwork}
                    disabled={isSearchingArtwork}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors"
                  >
                    {isSearchingArtwork ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1DB954]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                    )}
                    <span>بحث عن غلاف أونلاين</span>
                  </button>
                </div>

                {candidates.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1 max-w-full">
                    {candidates.slice(0, 5).map((cand) => (
                      <button
                        type="button"
                        key={cand.id}
                        onClick={() => handleSelectCandidate(cand)}
                        className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 hover:border-[#1DB954] flex-shrink-0 transition-all"
                      >
                        <img
                          src={cand.artworkUrl}
                          alt={cand.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Input Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>اسم الأغنية (Title)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>

              {/* Artist */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>الفنان (Artist)</span>
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>

              {/* Album */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>الألبوم (Album)</span>
                </label>
                <input
                  type="text"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>

              {/* Genre */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>النمط الموسيقي (Genre)</span>
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Pop, Hip-Hop, R&B..."
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>

              {/* Year */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>سنة الإصدار (Year)</span>
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>

              {/* BPM & Key */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400">BPM (السرعة)</label>
                  <input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    placeholder="128"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400">مفتاح Camelot</label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="8A, 8B"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1DB954] transition-colors uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setMetadataEditorModal(false)}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#1DB954]/25"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ التعديلات في OPFS</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
