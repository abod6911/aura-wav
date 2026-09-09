import React, { useState, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { pickLocalDirectory, processAudioFiles, ScanProgress } from '../services/fileScanner';
import { FolderOpen, UploadCloud, CheckCircle2, AlertCircle, Sparkles, X, FileAudio } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const importTracks = usePlayerStore((state) => state.importTracks);
  const tracks = usePlayerStore((state) => state.tracks);
  const downloadedTrackIds = usePlayerStore((state) => state.downloadedTrackIds);
  const downloadAllProgress = usePlayerStore((state) => state.downloadAllProgress);
  const cacheAllAvailableTracksOffline = usePlayerStore((state) => state.cacheAllAvailableTracksOffline);

  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [importedFolderName, setImportedFolderName] = useState<string>('Liked_Songs');

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const isMobileDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleDirectoryPicker = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setProgress(null);
    setImportedCount(null);

    try {
      const tracks = await pickLocalDirectory((p) => setProgress(p));
      if (tracks.length > 0) {
        const folderName = usePlayerStore.getState().savedFolderName || 'Liked_Songs';
        await importTracks(tracks, folderName);
        setImportedFolderName(folderName);
        setImportedCount(tracks.length);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      if (err.message === 'DIRECTORY_PICKER_NOT_SUPPORTED') {
        // Trigger fallback based on device
        if (isMobileDevice) {
          filesInputRef.current?.click();
        } else {
          folderInputRef.current?.click();
        }
      } else {
        setErrorMsg('حدث خطأ أثناء قراءة المجلد، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handlePrimaryClick = () => {
    if (isMobileDevice) {
      filesInputRef.current?.click();
    } else if ('showDirectoryPicker' in window) {
      handleDirectoryPicker();
    } else {
      folderInputRef.current?.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setErrorMsg(null);
    setProgress(null);
    setImportedCount(null);

    try {
      const fileList = Array.from(files);
      let detectedFolder = 'Liked_Songs';
      if (fileList[0] && (fileList[0] as any).webkitRelativePath) {
        const rel = (fileList[0] as any).webkitRelativePath;
        if (rel.includes('/')) {
          detectedFolder = rel.split('/')[0];
        }
      }

      const audioFiles = fileList.filter((f) => !f.name.toLowerCase().endsWith('.lrc'));
      const lrcFiles = fileList.filter((f) => f.name.toLowerCase().endsWith('.lrc'));

      const tracks = await processAudioFiles(audioFiles, lrcFiles, (p) => setProgress(p), detectedFolder);
      if (tracks.length > 0) {
        await importTracks(tracks, detectedFolder);
        setImportedFolderName(detectedFolder);
        setImportedCount(tracks.length);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setErrorMsg('لم يتم العثور على ملفات صوتية متوافقة.');
      }
    } catch (err) {
      console.warn('Import error:', err);
      setErrorMsg('تعذر استيراد بعض الملفات، تأكد من الصيغ المدعومة.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-lg bg-[#121218]/95 border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 relative overflow-hidden">
        {/* Hidden Folder Input (Desktop) */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          accept="audio/*,.lrc"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Hidden Multi-File Input (Mobile / iPhone friendly without directory restriction) */}
        <input
          ref={filesInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.m4a,.wav,.flac,.aac,.ogg,.lrc"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#1DB954]/20 text-[#1DB954]">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">استيراد أغانيك وحفظها أوفلاين</h3>
              <p className="text-xs text-zinc-400">تُحفظ في نفس أماكنها (1..261) وتعمل بدون إنترنت للأبد</p>
            </div>
          </div>
          {!isScanning && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body Content */}
        {!isScanning && importedCount === null && (
          <div className="space-y-4">
            {/* Primary Action Card */}
            <div
              onClick={handlePrimaryClick}
              className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-[#1DB954]/35 hover:border-[#1DB954]/70 bg-[#1DB954]/[0.04] hover:bg-[#1DB954]/[0.08] flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <div className="p-4 rounded-full bg-[#1DB954]/20 text-[#1DB954] group-hover:scale-110 transition-transform mb-3">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h4 className="text-base font-extrabold text-white mb-1">
                {isMobileDevice ? 'اضغط هنا لاختيار ملفات الأغاني' : 'اختر مجلد الأغاني (Liked_Songs)'}
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                سيتم ربط الملفات تلقائياً في نفس ترتيب وأماكن الأغاني الأصلية وتخزينها في ذاكرة جهازك لتعمل أوفلاين 100%.
              </p>
            </div>

            {/* Quick Action Buttons for Multi-platform Flexibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => filesInputRef.current?.click()}
                className="p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FileAudio className="w-4 h-4 text-[#1DB954]" />
                <span>اختيار ملفات متعددة (هاتف / آيفون)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if ('showDirectoryPicker' in window) {
                    handleDirectoryPicker();
                  } else {
                    folderInputRef.current?.click();
                  }
                }}
                className="p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <span>اختيار مجلد كامل (كمبيوتر)</span>
              </button>
            </div>

            {/* 1-Click Sync/Cache All Available Tracks */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-right">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>حفظ فوري في ذاكرة الجهاز (IndexedDB)</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  احفظ كافة الأغاني المتاحة في ذاكرة المتصفح لتشغيلها دائماً وبشكل كامل بدون إنترنت 100%.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await cacheAllAvailableTracksOffline();
                }}
                disabled={!!downloadAllProgress || (tracks.length > 0 && downloadedTrackIds.length === tracks.length)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 shadow-md shadow-emerald-500/20"
              >
                {downloadAllProgress
                  ? `جاري الحفظ: ${downloadAllProgress.current}/${downloadAllProgress.total}`
                  : tracks.length > 0 && downloadedTrackIds.length === tracks.length
                  ? 'محفوظة بالكامل أوفلاين'
                  : `حفظ الكل أوفلاين (${downloadedTrackIds.length}/${tracks.length})`}
              </button>
            </div>

            {/* iPhone Pro-Tip */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed text-right flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">نصيحة لمستخدمي الآيفون:</strong>
                عند فتح شاشة الملفات، ادخل إلى مجلد الأغاني ثم اضغط على النقاط الثلاث <strong>(•••)</strong> بالأعلى، ثم اختر <strong>"تحديد الكل" (Select All)</strong> ثم اضغط <strong>"فتح" (Open)</strong> ليتم حفظ جميع الأغاني فوراً!
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Scanning / Ingestion Progress */}
        {isScanning && (
          <div className="py-8 space-y-5 text-center">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-[#1DB954]/20 border-t-[#1DB954] animate-spin" />
              <FolderOpen className="w-7 h-7 text-[#1DB954] absolute inset-0 m-auto" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">جاري مطابقة وحفظ الأغاني في الذاكرة...</h4>
              <p className="text-xs text-zinc-400 truncate max-w-sm mx-auto">
                {progress?.currentFileName || 'معالجة الملفات...'}
              </p>
            </div>

            {progress && progress.total > 0 && (
              <div className="space-y-2 max-w-xs mx-auto">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#1DB954] h-full rounded-full transition-all duration-150"
                    style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>تم حفظ {progress.current} مسار</span>
                  <span>من أصل {progress.total}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {importedCount !== null && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">تم حفظ مجلد [{importedFolderName}] بنجاح!</h4>
              <p className="text-sm text-zinc-300 mt-1 leading-relaxed">
                تم ربط <span className="text-emerald-400 font-bold">{importedCount}</span> مسار في نفس أماكنها وترتيبها الأصلي، وتخزينها في ذاكرة المتصفح. يمكنك تشغيلها الآن وفي أي وقت بدون إنترنت 100%.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold transition-all shadow-lg shadow-[#1DB954]/30 cursor-pointer"
            >
              بدء الاستماع الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
