import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService, AuthUser, SavedAccount } from '../../services/authService';
import { triggerHaptic } from '../../utils/haptics';
import { useTranslation } from '../../i18n/useTranslation';
import { Lock, Mail, User, ArrowRight, Loader2, Disc3, Trash2, Plus, ChevronRight } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: AuthUser) => void;
  onContinueAsGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onContinueAsGuest }) => {
  const { isRTL, dir } = useTranslation();
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => authService.getSavedAccounts());
  const [showForm, setShowForm] = useState<boolean>(() => savedAccounts.length === 0);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectSaved = (acc: SavedAccount) => {
    triggerHaptic('success');
    try {
      localStorage.setItem('aura_welcome_seen', 'true');
      sessionStorage.setItem('aura_welcome_seen', 'true');
    } catch {}
    const user: AuthUser = {
      id: acc.id,
      email: acc.email,
      name: acc.name,
      avatarUrl: acc.avatarUrl,
      isGuest: acc.isGuest,
      createdAt: acc.lastLoginAt,
    };
    authService.setCurrentUser(user);
    onSuccess(user);
  };

  const handleRemoveSaved = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic('light');
    authService.removeSavedAccount(id);
    const updated = authService.getSavedAccounts();
    setSavedAccounts(updated);
    if (updated.length === 0) {
      setShowForm(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    triggerHaptic('light');

    if (!emailOrUsername.trim() || !password) {
      setErrorMessage(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      triggerHaptic('warning');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setErrorMessage(isRTL ? 'يرجى إدخال اسمك الشخصي' : 'Please enter your name');
      triggerHaptic('warning');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { user, error } = await authService.signIn(emailOrUsername, password);
        if (error || !user) {
          setErrorMessage(error || (isRTL ? 'بيانات الدخول غير صحيحة' : 'Invalid login credentials'));
          triggerHaptic('warning');
        } else {
          try {
            localStorage.setItem('aura_welcome_seen', 'true');
            sessionStorage.setItem('aura_welcome_seen', 'true');
          } catch {}
          triggerHaptic('success');
          onSuccess(user);
        }
      } else {
        const { user, error } = await authService.signUp({
          name: name.trim(),
          email: emailOrUsername.trim(),
          password,
        });
        if (error || !user) {
          setErrorMessage(error || (isRTL ? 'فشل إنشاء الحساب' : 'Account creation failed'));
          triggerHaptic('warning');
        } else {
          try {
            localStorage.setItem('aura_welcome_seen', 'true');
            sessionStorage.setItem('aura_welcome_seen', 'true');
          } catch {}
          triggerHaptic('success');
          onSuccess(user);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
      triggerHaptic('warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    triggerHaptic('medium');
    try {
      localStorage.setItem('aura_welcome_seen', 'true');
      sessionStorage.setItem('aura_welcome_seen', 'true');
    } catch {}
    const guest = authService.continueAsGuest();
    onSuccess(guest);
    if (onContinueAsGuest) {
      onContinueAsGuest();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] w-full h-[100dvh] bg-[#060609] text-white flex flex-col justify-between overflow-y-auto px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] select-none"
      dir={dir}
    >
      {/* Background Subtle Ambient Tone */}
      <div className="absolute top-0 inset-x-0 h-48 pointer-events-none -z-10 bg-gradient-to-b from-[#FA243C]/06 to-transparent blur-xl" />

      {/* Top Header / Brand */}
      <div className="pt-2 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="w-12 h-12 rounded-2xl bg-[#161622] border border-white/10 p-0.5 shadow-xl flex items-center justify-center mb-2"
        >
          <div className="w-full h-full bg-[#0c0c14] rounded-[14px] flex items-center justify-center">
            <Disc3 className="w-6 h-6 text-[#FA243C]" />
          </div>
        </motion.div>

        <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1">
          <bdi dir="ltr">
            AURA<span className="text-[#FA243C]">.WAV</span>
          </bdi>
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-0.5">
          {isRTL ? 'مشغل الموسيقى الشخصي' : 'Personal Audio Player'}
        </p>
      </div>

      {/* Center Content: Saved Accounts OR Form */}
      <div className="w-full max-w-sm mx-auto my-auto py-4">
        {savedAccounts.length > 0 && !showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-zinc-300">
                {isRTL ? 'الحسابات المحفوظة على هذا الجهاز' : 'Saved Accounts'}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
                {savedAccounts.length}
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {savedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => handleSelectSaved(acc)}
                  className="w-full p-3 rounded-2xl bg-[#12121c] hover:bg-[#181826] border border-white/[0.08] hover:border-white/20 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FA243C] to-[#FF375F] p-[1.5px] flex-shrink-0">
                      <div className="w-full h-full bg-[#101018] rounded-[10px] flex items-center justify-center text-white text-xs font-black overflow-hidden">
                        {acc.avatarUrl ? (
                          <img src={acc.avatarUrl} alt={acc.name} className="w-full h-full object-cover" />
                        ) : (
                          acc.name?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                    </div>
                    <div className="text-start min-w-0 flex-1">
                      <span className="text-xs font-bold text-white block truncate">
                        {acc.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 block truncate font-mono">
                        {acc.email || (acc.isGuest ? (isRTL ? 'حساب ضيف' : 'Guest Account') : 'Local Vault')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSaved(e, acc.id)}
                      className="w-7 h-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
                      title={isRTL ? 'إزالة من الجهاز' : 'Remove from device'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className={`w-4 h-4 text-zinc-400 group-hover:text-white transition-colors ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Switch to login form */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowForm(true);
              }}
              className="w-full py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 text-[#FA243C]" />
              <span>{isRTL ? 'تسجيل الدخول بحساب آخر' : 'Use another account'}</span>
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Tab Switcher: Sign In vs Sign Up */}
            <div className="w-full p-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center relative">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative z-10 cursor-pointer ${
                  mode === 'signin' ? 'text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                {mode === 'signin' && (
                  <motion.div
                    layoutId="authTabPill"
                    className="absolute inset-0 bg-[#FA243C] rounded-xl -z-10 shadow-md shadow-[#FA243C]/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative z-10 cursor-pointer ${
                  mode === 'signup' ? 'text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {isRTL ? 'حساب جديد' : 'Sign Up'}
                {mode === 'signup' && (
                  <motion.div
                    layoutId="authTabPill"
                    className="absolute inset-0 bg-[#FA243C] rounded-xl -z-10 shadow-md shadow-[#FA243C]/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            </div>

            {/* Main Form */}
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSubmit}
              className="space-y-3"
            >
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-medium text-center">
                  {errorMessage}
                </div>
              )}

              {/* Name Field (Sign Up Only) */}
              {mode === 'signup' && (
                <div className="space-y-1 text-start">
                  <label className="text-[11px] font-bold text-white/60 px-1">
                    {isRTL ? 'الاسم الشخصي' : 'Full Name'}
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-white/40 absolute start-3.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isRTL ? 'الاسم' : 'Name'}
                      style={{ fontSize: '16px' }}
                      className="w-full h-11 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#12121a] border border-white/[0.08] focus:border-[#FA243C] rounded-xl ps-10 pe-4 text-white placeholder-white/30 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email / Username Field */}
              <div className="space-y-1 text-start">
                <label className="text-[11px] font-bold text-white/60 px-1">
                  {mode === 'signup'
                    ? (isRTL ? 'البريد الإلكتروني' : 'Email Address')
                    : (isRTL ? 'البريد أو اسم المستخدم' : 'Email or Username')}
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-white/40 absolute start-3.5 pointer-events-none" />
                  <input
                    type={mode === 'signup' ? 'email' : 'text'}
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder={isRTL ? 'name@example.com' : 'name@example.com'}
                    style={{ fontSize: '16px' }}
                    className="w-full h-11 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#12121a] border border-white/[0.08] focus:border-[#FA243C] rounded-xl ps-10 pe-4 text-white placeholder-white/30 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1 text-start">
                <label className="text-[11px] font-bold text-white/60 px-1">
                  {isRTL ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-white/40 absolute start-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ fontSize: '16px' }}
                    className="w-full h-11 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#12121a] border border-white/[0.08] focus:border-[#FA243C] rounded-xl ps-10 pe-4 text-white placeholder-white/30 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-1 rounded-xl bg-[#FA243C] hover:bg-[#FF375F] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#FA243C]/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'signin' ? (isRTL ? 'تسجيل الدخول' : 'Sign In') : (isRTL ? 'إنشاء الحساب' : 'Sign Up')}</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowForm(false);
                  }}
                  className="w-full py-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isRTL ? '← العودة إلى الحسابات المحفوظة' : '← Back to saved accounts'}
                </button>
              )}
            </motion.form>
          </div>
        )}
      </div>

      {/* Bottom Guest Mode */}
      <div className="pb-3 flex flex-col items-center text-center">
        <button
          type="button"
          onClick={handleGuest}
          className="text-xs font-semibold text-zinc-400 hover:text-white px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] active:scale-95 transition-all cursor-pointer"
        >
          {isRTL ? 'المتابعة كضيف' : 'Continue as Guest'}
        </button>
      </div>
    </div>
  );
};
