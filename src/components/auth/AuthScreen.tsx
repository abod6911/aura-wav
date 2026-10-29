import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService, AuthUser } from '../../services/authService';
import { triggerHaptic } from '../../utils/haptics';
import { useTranslation } from '../../i18n/useTranslation';
import { Sparkles, Music2, Lock, Mail, User, ArrowRight, Loader2, Disc3 } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: AuthUser) => void;
  onContinueAsGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onContinueAsGuest }) => {
  const { isRTL, dir } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          setErrorMessage(error || (isRTL ? 'فشل تسجيل الدخول' : 'Sign in failed'));
          triggerHaptic('warning');
        } else {
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
    const guest = authService.continueAsGuest();
    if (onContinueAsGuest) {
      onContinueAsGuest();
    } else {
      onSuccess(guest);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] w-full h-[100dvh] bg-[#060609] text-white flex flex-col justify-between overflow-y-auto px-6 py-8 select-none"
      dir={dir}
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-0 inset-x-0 h-96 pointer-events-none -z-10 bg-gradient-to-b from-[#FA243C]/20 via-[#FA243C]/5 to-transparent blur-3xl transform-gpu" />
      <div className="absolute bottom-0 inset-x-0 h-64 pointer-events-none -z-10 bg-gradient-to-t from-purple-900/15 to-transparent blur-3xl transform-gpu" />

      {/* Top Header / Brand Logo */}
      <div className="pt-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-20 h-20 rounded-[28px] bg-gradient-to-tr from-[#FA243C] via-[#FF375F] to-[#7D12FF] p-0.5 shadow-[0_12px_40px_rgba(250,36,60,0.35)] flex items-center justify-center mb-4"
        >
          <div className="w-full h-full bg-[#0a0a10] rounded-[26px] flex items-center justify-center">
            <Disc3 className="w-10 h-10 text-[#FA243C] animate-spin-slow" />
          </div>
          <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#FA243C] text-white shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-1.5">
          <bdi dir="ltr">
            AURA<span className="text-[#FA243C]">.WAV</span>
          </bdi>
        </h1>
        <p className="text-xs text-white/50 font-medium mt-1 max-w-xs">
          {isRTL ? 'استوديو الصوت الفائق • تجربة هاتف أصلية 120fps' : 'Ultra Hi-Fi Music Experience • 120fps Native App'}
        </p>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="w-full max-w-sm mt-7 p-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative z-10 cursor-pointer ${
              mode === 'signin' ? 'text-white shadow-lg' : 'text-white/50 hover:text-white'
            }`}
          >
            {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            {mode === 'signin' && (
              <motion.div
                layoutId="authTabPill"
                className="absolute inset-0 bg-gradient-to-r from-[#FA243C] to-[#FF375F] rounded-xl -z-10 shadow-md shadow-[#FA243C]/30"
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
              mode === 'signup' ? 'text-white shadow-lg' : 'text-white/50 hover:text-white'
            }`}
          >
            {isRTL ? 'إنشاء حساب جديد' : 'Create Account'}
            {mode === 'signup' && (
              <motion.div
                layoutId="authTabPill"
                className="absolute inset-0 bg-gradient-to-r from-[#FA243C] to-[#FF375F] rounded-xl -z-10 shadow-md shadow-[#FA243C]/30"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Main Form Box */}
      <motion.form
        key={mode}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm mx-auto my-6 space-y-3.5"
      >
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-medium text-center"
          >
            {errorMessage}
          </motion.div>
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
                placeholder={isRTL ? 'مثال: عبد الله' : 'e.g. Abdullah'}
                style={{ fontSize: '16px' }}
                className="w-full h-12 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#12121a] border border-white/[0.08] focus:border-[#FA243C] rounded-2xl ps-10 pe-4 text-white placeholder-white/30 focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* Email / Username Field */}
        <div className="space-y-1 text-start">
          <label className="text-[11px] font-bold text-white/60 px-1">
            {mode === 'signup'
              ? (isRTL ? 'البريد الإلكتروني' : 'Email Address')
              : (isRTL ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or Username')}
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
              className="w-full h-12 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#12121a] border border-white/[0.08] focus:border-[#FA243C] rounded-2xl ps-10 pe-4 text-white placeholder-white/30 focus:outline-none transition-colors"
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
              className="w-full h-12 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#12121a] border border-white/[0.08] focus:border-[#FA243C] rounded-2xl ps-10 pe-4 text-white placeholder-white/30 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 mt-2 rounded-2xl bg-gradient-to-r from-[#FA243C] to-[#FF375F] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FA243C]/35 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>{mode === 'signin' ? (isRTL ? 'تسجيل الدخول' : 'Sign In') : (isRTL ? 'إنشاء حساب جديد' : 'Create Account')}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>
      </motion.form>

      {/* Bottom Guest Mode */}
      <div className="pb-4 flex flex-col items-center gap-3 text-center">
        <button
          type="button"
          onClick={handleGuest}
          className="text-xs font-bold text-white/70 hover:text-white px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] active:scale-95 transition-all cursor-pointer"
        >
          {isRTL ? '⚡ متابعة سريعة كـ ضيف (Guest Mode)' : '⚡ Quick Start as Guest'}
        </button>

        <p className="text-[10px] text-white/35 max-w-xs font-mono">
          {isRTL ? 'تخزين مشفر ومحلي 100% • جلسة مستمرة تلقائياً' : '100% Encrypted & Local Vault • Persistent Session'}
        </p>
      </div>
    </div>
  );
};
