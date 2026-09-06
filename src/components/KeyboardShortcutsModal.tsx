import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Keyboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const KeyboardShortcutsModal: React.FC = () => {
  const isShortcutsOpen = usePlayerStore((state) => state.isShortcutsOpen);
  const setShortcutsOpen = usePlayerStore((state) => state.setShortcutsOpen);

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'تشغيل / إيقاف مؤقت' },
    { key: '→ / ←', desc: 'تقديم / ترجيع 5 ثوانٍ' },
    { key: '↑ / ↓', desc: 'رفع / خفض مستوى الصوت' },
    { key: 'M', desc: 'كتم / إلغاء كتم الصوت' },
    { key: 'L', desc: 'فتح وإغلاق الكلمات المتزامنة' },
    { key: 'E', desc: 'المعادل الصوتي & DJ AutoMix' },
    { key: 'Q', desc: 'عرض قائمة الانتظار (Queue)' },
    { key: 'S', desc: 'تفعيل / إيقاف الخلط العشوائي (Shuffle)' },
    { key: 'R', desc: 'تبديل نمط التكرار (Repeat Mode)' },
    { key: 'F', desc: 'إضافة / إزالة الأغنية من المفضلة' },
    { key: '/', desc: 'التركيز على شريط البحث' },
    { key: 'Esc', desc: 'إغلاق أي نافذة مفتوحة' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-[#101018]/95 border border-white/[0.12] rounded-3xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8)] space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">اختصارات لوحة المفاتيح</h3>
                <p className="text-xs text-zinc-400">تحكم كامل وسريع في الموسيقى من الكيبورد</p>
              </div>
            </div>

            <button
              onClick={() => setShortcutsOpen(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Shortcuts Grid */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {shortcuts.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-colors"
              >
                <span className="text-xs text-zinc-300 font-medium">{s.desc}</span>
                <kbd className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-xs font-mono font-bold text-indigo-300 shadow-sm">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="text-center text-[11px] text-zinc-500 pt-2 border-t border-white/[0.06]">
            يمكنك الضغط على <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">?</kbd> في أي وقت لإظهار هذه القائمة
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
