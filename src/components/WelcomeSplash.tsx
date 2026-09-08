import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc, Sparkles, Music, Sun, Moon, CloudSun, ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

interface WelcomeSplashProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ onComplete, forceShow = false }) => {
  const [visible, setVisible] = useState(false);
  const tracks = usePlayerStore((state) => state.tracks);

  useEffect(() => {
    const hasSeen = localStorage.getItem('aura_welcome_seen') || sessionStorage.getItem('aura_welcome_seen');
    if (forceShow || !hasSeen) {
      setVisible(true);
    }
  }, [forceShow]);

  const handleDismiss = () => {
    localStorage.setItem('aura_welcome_seen', 'true');
    sessionStorage.setItem('aura_welcome_seen', 'true');
    setVisible(false);
    if (onComplete) onComplete();
  };

  // Time-aware greeting
  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'صباح الخير والنشاط',
        subtitle: 'ابدأ يومك بتجربة صوتية استثنائية ونقية',
        Icon: Sun,
        color: 'text-amber-400',
        glow: 'rgba(245, 158, 11, 0.25)',
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: 'طاب يومك بكل خير',
        subtitle: 'أجواؤك المفضلة جاهزة للاستماع بأعلى دقة',
        Icon: CloudSun,
        color: 'text-orange-400',
        glow: 'rgba(249, 115, 22, 0.25)',
      };
    } else {
      return {
        greeting: 'مساء الخير والهدوء',
        subtitle: 'استرخِ واستمتع بموسيقاك الفاخرة بدون انقطاع',
        Icon: Moon,
        color: 'text-[#FA243C]',
        glow: 'rgba(250, 36, 60, 0.25)',
      };
    }
  };

  const { greeting, subtitle, Icon, color, glow } = getGreetingData();

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[#050508]/95 backdrop-blur-3xl select-none overflow-hidden"
      >
        {/* Ambient Neon Atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[75vw] max-w-[600px] max-h-[600px] rounded-full filter blur-[140px] transition-all duration-1000"
            style={{ backgroundColor: glow }}
          />
          <div className="absolute top-[20%] right-[15%] w-[45vw] h-[45vw] max-w-[350px] max-h-[350px] bg-[#FA243C]/15 rounded-full filter blur-[100px]" />
          <div className="absolute bottom-[20%] left-[15%] w-[45vw] h-[45vw] max-w-[350px] max-h-[350px] bg-[#FF2D55]/10 rounded-full filter blur-[110px]" />
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
              className="absolute w-36 h-36 md:w-44 md:h-44 rounded-full border border-[#FA243C]/30"
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
              className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full border border-[#FF2D55]/20"
            />

            {/* Glowing Center Badge */}
            <motion.div
              initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-gradient-to-tr from-[#FA243C] via-[#FF2D55] to-[#FF5E7E] p-[2px] shadow-[0_0_50px_rgba(250,36,60,0.5)]"
            >
              <div className="w-full h-full bg-[#09090e] rounded-[22px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#FA243C]/10 to-transparent" />
                <Disc className="w-12 h-12 md:w-14 md:h-14 text-[#FA243C] animate-spin-slow" />
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
            <h1 dir="ltr" className="text-3xl md:text-4xl font-black text-white tracking-wider flex items-center justify-center gap-1.5">
              <span>AURA</span>
              <span className="bg-gradient-to-r from-[#FA243C] via-[#FF2D55] to-[#FF5E7E] bg-clip-text text-transparent">
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
                className="w-1 h-6 rounded-full bg-gradient-to-t from-[#FA243C] to-[#FF2D55]"
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
              <Music className="w-3.5 h-3.5 text-[#FA243C]" />
              <span>{tracks.length > 0 ? `${tracks.length} مساراً جاهزاً` : '261 مساراً جاهزاً'}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>أوفلاين 100%</span>
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
            className="w-full py-4 px-8 rounded-2xl bg-white hover:bg-zinc-100 text-black font-extrabold text-sm md:text-base flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
          >
            <span>ابدأ الاستماع الآن</span>
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
