import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const toasts = usePlayerStore((state) => state.toasts);
  const removeToast = usePlayerStore((state) => state.removeToast);

  return (
    <div className="fixed bottom-24 md:bottom-28 right-4 md:right-8 z-50 flex flex-col gap-2 pointer-events-none select-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#14141e]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.6)] text-white text-xs font-semibold"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : t.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
              <span className="truncate">{t.message}</span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
