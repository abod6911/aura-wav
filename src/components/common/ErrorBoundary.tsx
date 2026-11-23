import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, Wrench, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
  isRepairing: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
      isRepairing: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[GlobalErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleRepairAndReload = async () => {
    this.setState({ isRepairing: true });
    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn('[GlobalErrorBoundary] Error clearing cache/sw:', e);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.name}: ${error?.message}\n\nStack:\n${error?.stack || ''}\n\nComponent Stack:\n${errorInfo?.componentStack || ''}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      }).catch(() => {});
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRTL =
        typeof document !== 'undefined'
          ? document.documentElement.dir === 'rtl' ||
            document.documentElement.lang === 'ar' ||
            (typeof localStorage !== 'undefined' && localStorage.getItem('i18nextLng')?.startsWith('ar'))
          : true;

      const { error, errorInfo, showDetails, copied, isRepairing } = this.state;

      return (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070709] text-white p-4 select-none overflow-y-auto"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl text-center space-y-6">
            {/* Warning Icon Badge */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                {isRTL ? 'حدث خطأ غير متوقع أثناء المعالجة' : 'An unexpected error occurred'}
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isRTL
                  ? 'نعتذر عن هذا التوقف المؤقت. يمكنك إعادة تشغيل التطبيق أو إصلاح الذاكرة المؤقتة لاستعادة الاستقرار فوراً دون فقدان مكتبتك.'
                  : 'We apologize for this temporary interruption. You can restart the app or repair the cache to restore stability without losing your library.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1DB954] hover:bg-[#1ED760] text-black text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-black/40 transition-[background-color,transform] active:scale-[0.98] cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>{isRTL ? 'إعادة تشغيل التطبيق' : 'Reload Application'}</span>
              </button>

              <button
                type="button"
                disabled={isRepairing}
                onClick={this.handleRepairAndReload}
                className="w-full py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 transition-[color,background-color,border-color,transform] active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {isRepairing
                    ? (isRTL ? 'جاري إصلاح الذاكرة...' : 'Repairing Cache...')
                    : (isRTL ? 'إصلاح الذاكرة وإعادة التشغيل' : 'Repair Cache & Restart')}
                </span>
              </button>
            </div>

            {/* Collapsible Technical Details for Diagnostics */}
            <div className="pt-2 border-t border-white/[0.08] text-left">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="w-full flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer py-1"
              >
                <span>{isRTL ? 'التفاصيل التقنية للمطورين' : 'Technical Details'}</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {error?.name || 'Error'}: {error?.message || 'Unknown'}
                    </span>
                    <button
                      type="button"
                      onClick={this.handleCopyDetails}
                      className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 bg-white/[0.06] px-2 py-0.5 rounded cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? (isRTL ? 'تم النسخ' : 'Copied') : (isRTL ? 'نسخ' : 'Copy')}</span>
                    </button>
                  </div>
                  <pre
                    dir="ltr"
                    className="p-3 bg-black/60 border border-white/10 rounded-xl text-[10px] text-red-400 font-mono overflow-x-auto max-h-40 leading-normal select-text text-left"
                  >
                    {error?.stack || error?.message || 'No stack trace available'}
                    {errorInfo?.componentStack && `\n\nComponent Stack:\n${errorInfo.componentStack}`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
