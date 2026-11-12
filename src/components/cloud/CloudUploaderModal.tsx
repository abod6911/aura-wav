import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../i18n/useTranslation';
import { usePlayerStore } from '../../store/usePlayerStore';
import { parseAudioFileMetadata, ParsedAudioMetadata } from '../../services/metadataParser';
import { uploadAudioToCloud, uploadCoverToCloud } from '../../services/cloudStorageService';
import { insertCloudTrack } from '../../services/cloudLibraryService';
import { isCloudConfigured } from '../../lib/supabase';
import { authService } from '../../services/authService';
import { Track } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import confetti from 'canvas-confetti';
import {
  UploadCloud,
  X,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Music,
  Trash2,
  CloudCheck,
  Sparkles,
  Lock,
  ShieldCheck,
  LogOut,
  User,
} from 'lucide-react';

interface CloudUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QueuedUploadItem {
  id: string;
  file: File;
  metadata?: ParsedAudioMetadata;
  status: 'parsing' | 'ready' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  uploadedTrack?: Track;
}

const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];

export const CloudUploaderModal: React.FC<CloudUploaderModalProps> = ({ isOpen, onClose }) => {
  const { t, isRTL, dir } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueuedUploadItem[]>([]);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const currentUser = usePlayerStore((state) => state.currentUser);
  const setCurrentUser = usePlayerStore((state) => state.setCurrentUser);
  const addCloudTrack = usePlayerStore((state) => state.addCloudTrack);
  const addToast = usePlayerStore((state) => state.addToast);

  const cloudReady = isCloudConfigured();

  // Owner authentication state
  const isOwner = Boolean(currentUser && !currentUser.isGuest);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [ownerEmail, setOwnerEmail] = useState(() => (import.meta as any).env?.VITE_OWNER_EMAIL || '');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const u = authService.getCurrentUser();
      if (u && !u.isGuest && (!currentUser || currentUser.isGuest)) {
        setCurrentUser(u);
      }
    }
  }, [isOpen, currentUser, setCurrentUser]);

  const handleOwnerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    triggerHaptic('light');

    if (!ownerEmail.trim() || !ownerPassword) {
      setAuthError(isRTL ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        const { user, error } = await authService.signIn(ownerEmail.trim(), ownerPassword);
        if (error || !user) {
          setAuthError(error || (isRTL ? 'بيانات تسجيل الدخول غير صحيحة' : 'Invalid credentials'));
          triggerHaptic('warning');
        } else {
          setCurrentUser(user);
          triggerHaptic('success');
          addToast(
            isRTL ? `مرحباً، تم تسجيل دخول المالك (${user.email}) بنجاح!` : `Welcome! Owner authenticated as ${user.email}`,
            undefined,
            'success'
          );
        }
      } else {
        const { user, error } = await authService.signUp({
          email: ownerEmail.trim(),
          password: ownerPassword,
          name: ownerName.trim() || 'Owner',
        });
        if (error || !user) {
          setAuthError(error || (isRTL ? 'تعذر إنشاء الحساب' : 'Failed to register'));
          triggerHaptic('warning');
        } else {
          setCurrentUser(user);
          triggerHaptic('success');
          addToast(
            isRTL ? 'تم إنشاء حساب المالك وتأكيد الدخول بنجاح!' : 'Owner account created successfully!',
            undefined,
            'success'
          );
        }
      }
    } catch (err: any) {
      setAuthError(err.message || (isRTL ? 'حدث خطأ في الاتصال بالسحابة' : 'Connection error'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOwnerSignOut = async () => {
    triggerHaptic('medium');
    await authService.signOut();
    const guest = authService.continueAsGuest();
    setCurrentUser(guest);
    addToast(isRTL ? 'تم تسجيل خروج المالك' : 'Owner signed out', undefined, 'info');
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const rawList = Array.from(files);
    const validAudioFiles = rawList.filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext) || f.type.startsWith('audio/');
    });

    if (validAudioFiles.length === 0) {
      addToast(
        isRTL ? 'يرجى اختيار ملفات صوتية صالحة (MP3, WAV, FLAC, M4A)' : 'Please select valid audio files (MP3, WAV, FLAC, M4A)',
        undefined,
        'warning'
      );
      return;
    }

    triggerHaptic('light');

    // Create initial items with parsing status
    const newItems: QueuedUploadItem[] = validAudioFiles.map((file) => ({
      id: `cloud_upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      status: 'parsing',
      progress: 0,
    }));

    setQueue((prev) => [...prev, ...newItems]);

    // Parse ID3 metadata in background
    for (const item of newItems) {
      try {
        const meta = await parseAudioFileMetadata(item.file);
        setQueue((curr) =>
          curr.map((q) => (q.id === item.id ? { ...q, metadata: meta, status: 'ready' } : q))
        );
      } catch (err) {
        console.warn('[CloudUploader] Metadata parse error:', err);
        setQueue((curr) =>
          curr.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'ready',
                  metadata: {
                    title: item.file.name.replace(/\.[^/.]+$/, ''),
                    artist: 'Unknown Artist',
                    album: 'Cloud Upload',
                    duration: 0,
                    artworkUrl: '/logo.svg',
                  },
                }
              : q
          )
        );
      }
    }
  }, [addToast, isRTL]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removeItem = (id: string) => {
    if (isUploadingAll) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const startUpload = async () => {
    if (!cloudReady) {
      addToast(
        isRTL ? 'إعدادات السحابة غير مكتملة — يرجى إضافة مفاتيح Supabase في ملف .env' : 'Cloud not configured. Please add Supabase keys to .env',
        undefined,
        'warning'
      );
      return;
    }

    const pending = queue.filter((item) => item.status === 'ready' || item.status === 'error');
    if (pending.length === 0) return;

    setIsUploadingAll(true);
    triggerHaptic('medium');

    const currentUser = authService.getCurrentUser();
    let completedCount = 0;
    const totalPending = pending.length;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];

      // Mark current item as uploading
      setQueue((curr) =>
        curr.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 5 } : q))
      );

      try {
        const trackId = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        let coverUrl = item.metadata?.artworkUrl || '';

        // 1. Upload Cover Art (if embedded picture found)
        if (item.metadata?.artworkBlob) {
          try {
            const uploadedCover = await uploadCoverToCloud(item.metadata.artworkBlob, trackId);
            if (uploadedCover) coverUrl = uploadedCover;
          } catch (coverErr) {
            console.warn('[CloudUploader] Cover upload non-fatal error:', coverErr);
          }
        }

        // 2. Upload Audio File with granular progress
        const { url: audioUrl } = await uploadAudioToCloud(item.file, trackId, (p) => {
          setQueue((curr) =>
            curr.map((q) => (q.id === item.id ? { ...q, progress: Math.max(5, p.percent) } : q))
          );
        });

        // 3. Assemble Track record
        const newTrack: Track = {
          id: trackId,
          title: item.metadata?.title || item.file.name.replace(/\.[^/.]+$/, ''),
          artist: item.metadata?.artist || 'Unknown Artist',
          album: item.metadata?.album || 'Cloud Library',
          duration: item.metadata?.duration || 0,
          audioUrl,
          artworkUrl: coverUrl || '/logo.svg',
          coverUrl: coverUrl || '/logo.svg',
          lyrics: item.metadata?.lyrics,
          source: 'online',
          dateAdded: Date.now(),
          fileName: item.file.name,
        };

        // 4. Insert into Cloud Database
        const dbResult = await insertCloudTrack(newTrack, currentUser?.id);
        if (!dbResult.success) {
          throw new Error(dbResult.error || 'Failed to save track to database');
        }

        // 5. Update local store immediately for zero-delay UI update
        if (addCloudTrack) {
          addCloudTrack(newTrack);
        }

        completedCount++;
        setOverallProgress(Math.round((completedCount / totalPending) * 100));

        setQueue((curr) =>
          curr.map((q) =>
            q.id === item.id ? { ...q, status: 'completed', progress: 100, uploadedTrack: newTrack } : q
          )
        );
      } catch (err: any) {
        console.error('[CloudUploader] Error uploading item:', item.file.name, err);
        setQueue((curr) =>
          curr.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error: err.message || 'Upload failed' } : q
          )
        );
      }
    }

    setIsUploadingAll(false);

    if (completedCount > 0) {
      triggerHaptic('success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      addToast(
        isRTL ? `تم رفع ${completedCount} مسار بنجاح إلى مكتبتك السحابية!` : `Successfully uploaded ${completedCount} tracks to cloud!`,
        undefined,
        'success'
      );
    }
  };

  if (!isOpen) return null;

  const totalFiles = queue.length;
  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const readyCount = queue.filter((q) => q.status === 'ready' || q.status === 'error').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl select-none"
      dir={dir}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="relative w-full max-w-2xl bg-[#0c0c14]/95 backdrop-blur-3xl border border-white/[0.12] rounded-[28px] sm:rounded-[32px] p-4 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] specular-highlight obsidian-grain"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#7D12FF] flex items-center justify-center shadow-lg shadow-[#FA243C]/25">
              <UploadCloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>{isRTL ? 'الرفع السحابي للمكتبة' : 'Cloud Library Uploader'}</span>
                <span className="apple-badge text-[8px] bg-gradient-to-r from-[#FA243C]/20 to-[#7D12FF]/20 border-white/10 text-white font-mono">
                  SUPABASE
                </span>
              </h2>
              <p className="text-[11px] text-white/50 font-medium">
                {isRTL ? 'بث مساراتك الموسيقية في أي وقت ومن أي جهاز بدقة أصلية' : 'Stream your audio library anywhere with full lossless fidelity'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploadingAll}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cloud Status Notice if unconfigured */}
        {!cloudReady && (
          <div className="my-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                {isRTL ? 'إعدادات السحابة غير مفعلة حالياً' : 'Cloud backend credentials missing'}
              </span>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                {isRTL
                  ? 'يرجى تزويد متغيرات VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env لتفعيل التخزين السحابي الحقيقي.'
                  : 'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to enable live cloud storage.'}
              </p>
            </div>
          </div>
        )}

        {/* 1. If NOT authenticated as Owner: Render Owner Sign In Gate */}
        {!isOwner ? (
          <div className="py-6 px-2 sm:px-6 flex flex-col items-center max-w-md mx-auto text-center overflow-y-auto no-scrollbar">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#7D12FF] p-0.5 shadow-xl shadow-[#FA243C]/20 mb-3 flex items-center justify-center">
              <div className="w-full h-full bg-[#101018] rounded-[14px] flex items-center justify-center">
                <Lock className="w-7 h-7 text-[#FA243C]" />
              </div>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              {isRTL ? 'تسجيل دخول مالك المنصة (Owner Sign In)' : 'Owner Authentication Required'}
            </h3>
            <p className="text-xs text-white/60 mt-1 max-w-sm leading-relaxed">
              {isRTL
                ? 'رفع الملفات الصوتية وإدارة السحابة محمي ومخصص لمالك المكتبة فقط لمنع أي رفع أو تعديل غير مصرح به.'
                : 'Cloud audio uploading and storage modification is restricted to the platform owner.'}
            </p>

            {/* Tab Switcher */}
            <div className="w-full mt-4 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'signin' ? 'bg-[#FA243C] text-white shadow-md' : 'text-white/50 hover:text-white'
                }`}
              >
                {isRTL ? 'تسجيل الدخول' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'signup' ? 'bg-[#FA243C] text-white shadow-md' : 'text-white/50 hover:text-white'
                }`}
              >
                {isRTL ? 'إنشاء حساب مالك جديد' : 'New Owner Sign Up'}
              </button>
            </div>

            {authError && (
              <div className="w-full mt-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-medium text-center">
                {authError}
              </div>
            )}

            <form onSubmit={handleOwnerAuth} className="w-full mt-4 space-y-3 text-start">
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/70 block">
                    {isRTL ? 'اسم المالك' : 'Owner Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={isRTL ? 'مثال: عبدالمجيد' : 'e.g. Platform Owner'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 focus:border-[#FA243C] text-white text-xs outline-none transition-colors"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/70 block">
                  {isRTL ? 'البريد الإلكتروني للمالك (Supabase Email)' : 'Owner Email'}
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 focus:border-[#FA243C] text-white text-xs outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/70 block">
                  {isRTL ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 focus:border-[#FA243C] text-white text-xs outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FA243C] to-[#FF375F] hover:from-[#e01e35] hover:to-[#eb2f56] text-white text-xs font-extrabold shadow-lg shadow-[#FA243C]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRTL ? 'جاري التحقق من الهوية...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {authMode === 'signin'
                        ? (isRTL ? 'تسجيل الدخول وفتح صلاحية الرفع' : 'Sign In & Unlock Uploads')
                        : (isRTL ? 'إنشاء الحساب وتفعيل الصلاحية' : 'Create Owner Account')}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Authenticated Owner Status Banner */}
            <div className="my-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 text-emerald-300 font-medium truncate">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {isRTL ? 'مسجّل كمالك للمكتبة:' : 'Authenticated Owner:'}{' '}
                  <strong className="text-white font-bold">{currentUser?.email || currentUser?.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleOwnerSignOut}
                className="text-[10px] text-white/50 hover:text-red-300 px-2 py-1 rounded bg-white/[0.04] hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                title={isRTL ? 'تسجيل الخروج من حساب المالك' : 'Sign out'}
              >
                <LogOut className="w-3 h-3" />
                <span>{isRTL ? 'تسجيل خروج' : 'Sign out'}</span>
              </button>
            </div>

            {/* Drag & Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 select-none ${
            isDragging
              ? 'border-[#FA243C] bg-[#FA243C]/10 scale-[0.99]'
              : 'border-white/[0.12] hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center text-white/70 group-hover:text-white group-hover:scale-110 transition-transform">
            <FileAudio className="w-6 h-6 text-[#FA243C]" />
          </div>

          <div>
            <span className="text-xs sm:text-sm font-bold text-white block">
              {isRTL ? 'اسحب وأفلت الملفات الصوتية هنا، أو انقر للاختيار' : 'Drag & drop audio files here, or click to browse'}
            </span>
            <span className="text-[10px] text-white/40 block mt-0.5">
              MP3, WAV, FLAC, M4A, AAC • {isRTL ? 'استخراج تلقائي لبيانات الغلاف والفنان' : 'Automatic client-side ID3 metadata parsing'}
            </span>
          </div>
        </div>

        {/* Upload Queue List */}
        {queue.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col mt-4">
            <div className="flex items-center justify-between text-xs text-white/60 mb-2 px-1">
              <span>
                {isRTL ? `قائمة الملفات (${queue.length})` : `Queued Tracks (${queue.length})`}
                {completedCount > 0 && (
                  <span className="text-emerald-400 ms-2 font-mono font-bold">
                    ✓ {completedCount} {isRTL ? 'مكتمل' : 'done'}
                  </span>
                )}
              </span>

              {completedCount > 0 && !isUploadingAll && (
                <button
                  onClick={clearCompleted}
                  className="text-[11px] text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  {isRTL ? 'مسح المكتمل' : 'Clear done'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pe-1">
              {queue.map((item) => {
                const meta = item.metadata;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all"
                  >
                    {/* Artwork Preview */}
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                      {meta?.artworkUrl ? (
                        <img src={meta.artworkUrl} alt={meta.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40">
                          <Music className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Metadata & Status */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-white truncate">
                          {meta?.title || item.file.name}
                        </h4>
                        <span className="text-[10px] font-mono text-white/40 shrink-0">
                          {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[10.5px] text-white/50 truncate">
                          {meta?.artist || 'Unknown Artist'}
                        </p>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {item.status === 'parsing' && (
                            <span className="text-[10px] text-amber-400 flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              <span>{isRTL ? 'تحليل...' : 'Parsing...'}</span>
                            </span>
                          )}
                          {item.status === 'uploading' && (
                            <span className="text-[10px] text-[#FA243C] font-mono font-bold flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              <span>{item.progress}%</span>
                            </span>
                          )}
                          {item.status === 'completed' && (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isRTL ? 'تم الرفع' : 'Uploaded'}</span>
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-[10px] text-rose-400 flex items-center gap-1" title={item.error}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{isRTL ? 'فشل' : 'Failed'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Item Progress Bar */}
                      {item.status === 'uploading' && (
                        <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-gradient-to-r from-[#FA243C] to-[#FF375F] transition-all duration-150 rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Delete Item from queue */}
                    {!isUploadingAll && item.status !== 'uploading' && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-white/30 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title={isRTL ? 'إزالة' : 'Remove'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/[0.08] mt-3 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-white/50">
            {isUploadingAll ? (
              <span className="font-mono text-white/80 font-bold">
                {isRTL ? `جاري الرفع: ${overallProgress}%` : `Uploading: ${overallProgress}%`}
              </span>
            ) : (
              <span>{isRTL ? `${readyCount} مسار جاهز للرفع` : `${readyCount} tracks ready to upload`}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploadingAll}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>

            <button
              onClick={startUpload}
              disabled={isUploadingAll || readyCount === 0 || !cloudReady}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-[#FA243C]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none"
            >
              {isUploadingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{isRTL ? 'جاري الرفع...' : 'Uploading...'}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{isRTL ? 'بدء الرفع السحابي' : 'Start Cloud Upload'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </>
    )}
  </motion.div>
    </div>
  );
};
