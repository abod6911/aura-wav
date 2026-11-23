import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc, Music, Sun, Moon, CloudSun, ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { triggerHaptic } from '../utils/haptics';

interface WelcomeSplashProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ onComplete, forceShow = false }) => {
  const [visible, setVisible] = useState(false);
  const tracks = usePlayerStore((state) => state.tracks);

  useEffect(() => {
    const hasSeen = localStorage.getItem('aura_welcome_seen') || sessionStorage.getItem('aura_welcome_seen');
    
    // If forced to show (e.g. from settings or help)
    if (forceShow) {
      setVisible(true);
      return;
    }

    // Warm Boot: User has opened the app before or in this session
    if (hasSeen) {
      setVisible(false);
      onComplete?.();
      return;
    }

    // Cold Boot first time: show splash and auto-transition when tracks load
    setVisible(true);
  }, [forceShow, onComplete]);

  const handleDismiss = useCallback(() => {
    triggerHaptic('light');
    localStorage.setItem('aura_welcome_seen', 'true');
    sessionStorage.setItem('aura_welcome_seen', 'true');
    setVisible(false);
    if (onComplete) onComplete();
  }, [onComplete]);

  // Once tracks are loaded in cold boot, auto-dismiss smoothly without blocking
  useEffect(() => {
    if (visible && !forceShow && tracks.length > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [visible, forceShow, tracks.length, handleDismiss]);

  const [hour] = useState(() => new Date().getHours());

  // Time-aware greeting
  const getGreetingData = () => {
    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'صباح الخير',
        subtitle: 'مرحباً بك في AURA.WAV',
        Icon: Sun,
        color: 'text-amber-400',
        glow: 'rgba(245, 158, 11, 0.25)',
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: 'طاب يومك',
        subtitle: 'موسيقاك جاهزة للاستماع',
        Icon: CloudSun,
        color: 'text-orange-400',
        glow: 'rgba(249, 115, 22, 0.25)',
      };
    } else {
      return {
        greeting: 'مساء الخير',
        subtitle: 'موسيقاك جاهزة للاستماع',
        Icon: Moon,
        color: 'text-[#1DB954]',
        glow: 'rgba(29, 185, 84, 0.2)',
      };
    }
  };

  const { greeting, subtitle, Icon, color, glow } = getGreetingData();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="welcome-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] w-full h-full min-h-full flex flex-col items-center justify-center p-6 bg-[#09090B]/98 backdrop-blur-3xl select-none overflow-hidden"
        >
          {/* Ambient Subtle Atmosphere */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[75vw] max-w-[600px] max-h-[600px] rounded-full filter blur-[60px] transition-colors duration-1000"
              style={{ backgroundColor: glow }}
            />
            <div className="absolute top-[20%] right-[15%] w-[45vw] h-[45vw] max-w-[350px] max-h-[350px] bg-[#1DB954]/10 rounded-full filter blur-[40px]" />
          </div>

          {/* Center Animated Aperture & Vinyl Pulse */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full space-y-7">
            {/* Glowing Vinyl Aperture */}
            <div className="relative flex items-center justify-center">
              {/* Pulsing Concentric Rings */}
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.35, 0.1, 0.35],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute w-36 h-36 md:w-44 md:h-44 rounded-full border border-[#1DB954]/20 will-change-transform"
                style={{ willChange: 'transform, opacity' }}
              />
              <motion.div
                animate={{
                  scale: [1, 1.45, 1],
                  opacity: [0.2, 0.05, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: 0.5,
                  ease: 'easeInOut',
                }}
                className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full border border-white/10 will-change-transform"
                style={{ willChange: 'transform, opacity' }}
              />

              {/* Center Badge */}
              <motion.div
                initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-[#242424] border border-white/15 p-[2px] shadow-2xl shadow-black/50 will-change-transform"
                style={{ willChange: 'transform, opacity' }}
              >
                <div className="w-full h-full bg-[#121212] rounded-[22px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#1DB954]/10 to-transparent" />
                  <Disc className="w-12 h-12 md:w-14 md:h-14 text-[#1DB954] animate-spin-slow will-change-transform" />
                </div>
              </motion.div>
            </div>

            {/* Time Greeting Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] shadow-inner"
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs md:text-sm font-bold text-white tracking-wide">{greeting}</span>
            </motion.div>

            {/* Kinetic Title & Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="space-y-2.5"
            >
              <h1 dir="ltr" className="text-3xl md:text-4xl font-black text-white tracking-wider flex items-center justify-center gap-1.5 font-sans">
                <span>AURA</span>
                <span className="text-[#1DB954]">
                  .WAV
                </span>
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 font-medium leading-relaxed max-w-sm mx-auto">
                {subtitle}
              </p>
            </motion.div>

            {/* Live Soundwaves Visualizer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex items-center justify-center gap-1.5 py-1"
            >
              {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7, 1, 0.4].map((scale, i) => (
                <motion.span
                  key={i}
                  animate={{
                    scaleY: [scale * 0.4, scale * 1.5, scale * 0.4],
                  }}
                  transition={{
                    duration: 1 + (i % 3) * 0.25,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-1 h-6 rounded-full bg-[#1DB954]"
                />
              ))}
            </motion.div>

            {/* Quick Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex items-center justify-center gap-4 text-xs font-semibold text-zinc-400"
            >
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Music className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>{tracks.length > 0 ? `${tracks.length} مساراً جاهزاً` : '1975 مساراً جاهزاً'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Disc className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>Lossless Audio Fidelity</span>
              </span>
            </motion.div>

            {/* Big CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.5 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleDismiss}
              className="w-full py-4 px-8 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-sm md:text-base flex items-center justify-center gap-3 shadow-xl shadow-black/50 transition-colors cursor-pointer"
            >
              <span>ابدأ الاستماع الآن</span>
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
