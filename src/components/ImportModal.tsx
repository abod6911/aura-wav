import React, { useState, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { pickLocalDirectory, processAudioFiles, ScanProgress } from '../services/fileScanner';
import { FolderOpen, UploadCloud, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const importTracks = usePlayerStore((state) => state.importTracks);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [importedFolderName, setImportedFolderName] = useState<string>('Liked_Songs');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

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
        // Trigger fallback input
        fileInputRef.current?.click();
      } else {
        setErrorMsg('حدث خطأ أثناء قراءة المجلد، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsScanning(false);
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
      }
    } catch (err) {
      setErrorMsg('تعذر استيراد بعض الملفات، تأكد من الصيغ المدعومة.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-lg bg-[#121218]/95 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Hidden Fallback Input */}
        <input
          ref={fileInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          accept="audio/*,.lrc"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">استيراد مكتبة الموسيقى المحلية</h3>
              <p className="text-xs text-aura-textSecondary">تشغيل أوفلاين بالكامل 100% مباشرة من جهازك</p>
            </div>
          </div>
          {!isScanning && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body Content */}
        {!isScanning && importedCount === null && (
          <div className="space-y-4">
            <div
              onClick={handleDirectoryPicker}
              className="p-8 rounded-2xl border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/70 bg-indigo-500/[0.03] hover:bg-indigo-500/[0.08] flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform mb-3">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                اختر مجلد الأغاني (Liked_Songs)
              </h4>
              <p className="text-xs text-aura-muted max-w-xs">
                سيقوم المتصفح بقراءة جميع ملفات MP3 / FLAC / WAV واستخراج أغلفة الألبومات والكلمات المتزامنة وحفظها أوفلاين.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-aura-textSecondary pt-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>لا يتم رفع أي ملفات إلى أي سيرفر، كل شيء يتم محلياً على جهازك.</span>
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
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <FolderOpen className="w-7 h-7 text-indigo-400 absolute inset-0 m-auto" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">جاري قراءة واستخراج البيانات...</h4>
              <p className="text-xs text-aura-textSecondary truncate max-w-sm mx-auto">
                {progress?.currentFileName || 'فحص الملفات...'}
              </p>
            </div>

            {progress && progress.total > 0 && (
              <div className="space-y-2 max-w-xs mx-auto">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-150"
                    style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-aura-muted">
                  <span>تمت معالجة {progress.current}</span>
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
              <p className="text-sm text-aura-textSecondary mt-1">
                تمت إضافة <span className="text-emerald-400 font-bold">{importedCount}</span> مسار وتثبيتها في ذاكرة جهازك. سيتذكر الموقع مجلدك دائماً ويعمل 100% بدون نت.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              بدء الاستماع الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
