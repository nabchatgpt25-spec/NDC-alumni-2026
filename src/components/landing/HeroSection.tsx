import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import { AnimatedCounter } from './AnimatedCounter';
import { NDCLogo } from '../NDCLogo';
import { useSiteSettings } from '../../hooks/useSiteSettings';

interface HeroSectionProps {
  alumniList?: AlumniProfile[];
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onSelectAlumnus?: (alumnus: AlumniProfile) => void;
  onScrollToBatches?: () => void;
  onScrollToFeed?: () => void;
  onOpenVerificationModal?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenVerificationModal,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { settings } = useSiteSettings();
  const { heroAndBackground, branding } = settings;

  const bgPhoto = heroAndBackground.heroBackgroundUrl;
  const isCampusPhotoBg =
    heroAndBackground.bgTexture === 'campus-photo' ||
    (bgPhoto && bgPhoto !== '');

  // Orchestrated Staggered Entrance Variants
  const containerVariants = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.09,
        delayChildren: prefersReducedMotion ? 0 : 0.05,
      },
    },
  };

  const pillVariants = {
    hidden: { opacity: 0, y: -12, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const headlineVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
      scale: prefersReducedMotion ? 1 : 0.98,
      filter: prefersReducedMotion ? 'none' : 'blur(6px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const textVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 14,
      filter: prefersReducedMotion ? 'none' : 'blur(3px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const buttonGroupVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const cardContainerVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 28,
      scale: prefersReducedMotion ? 1 : 0.97,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  };

  const statItemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 14, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <section className="relative overflow-hidden pt-10 pb-14 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24 bg-gradient-to-b from-blue-50/50 via-white to-slate-50/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 select-none">
      {/* Dynamic Background Image Layer with subtle initial zoom ease */}
      {isCampusPhotoBg && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.08 }}
          animate={{ opacity: heroAndBackground.bgOverlayOpacity || 0.35, scale: 1.02 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        >
          <img
            src={bgPhoto}
            alt="Notre Dame Campus Background"
            className="w-full h-full object-cover object-center filter blur-[1px]"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/75 to-white dark:from-slate-950/90 dark:via-slate-950/80 dark:to-slate-950" />
        </motion.div>
      )}

      {/* Soft Ambient Pastel Glows with gentle breathing animation */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{
          opacity: [0.2, 0.35, 0.2],
          scale: [1, 1.06, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-0 left-6 sm:left-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-blue-300/25 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{
          opacity: [0.25, 0.4, 0.25],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1.5,
        }}
        className="absolute top-1/4 right-4 sm:right-12 w-80 sm:w-96 h-80 sm:h-96 bg-amber-200/30 dark:bg-amber-600/15 rounded-full blur-3xl pointer-events-none"
      />

      {/* Main Staggered Content Container */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
      >
        {/* Top Status Pill: 340+ Online • 76 Batches • 42 Countries */}
        {heroAndBackground.showLiveOnlinePill && (
          <motion.div
            variants={pillVariants}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-xs mb-5 sm:mb-6 backdrop-blur-sm"
          >
            <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
              <NDCLogo className="w-full h-full object-contain" />
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
              {heroAndBackground.liveOnlinePillText || '340+ Online • 76 Batches • 42 Countries'}
            </span>
          </motion.div>
        )}

        {/* Main Headline with Smooth Soft-Focus Fade */}
        <motion.h1
          variants={headlineVariants}
          className="text-3xl sm:text-5xl lg:text-[3.65rem] font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] mb-3 sm:mb-4 max-w-4xl mx-auto"
        >
          <span className="block">{heroAndBackground.heroHeadlinePrefix || 'The Private Social Network for'}</span>
          <span className="block mt-1 sm:mt-1.5">
            <span className="text-[#15803d] dark:text-[#22c55e]">Notre Dame </span>
            <span className="text-[#d97706] dark:text-[#f59e0b]">College </span>
            <span className="text-[#2563eb] dark:text-[#3b82f6]">Alumni.</span>
          </span>
        </motion.h1>

        {/* Traditional College Motto */}
        <motion.p
          variants={textVariants}
          className="font-serif italic text-[#c2410c] dark:text-[#ea580c] font-bold text-sm sm:text-base lg:text-lg mb-4 sm:mb-5 tracking-wide"
        >
          {heroAndBackground.heroMottoQuote || '“Once a Notre Damian, Always a Notre Damian.”'}
        </motion.p>

        {/* Subtitle Description */}
        <motion.p
          variants={textVariants}
          className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm lg:text-[15px] max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8 font-normal"
        >
          {heroAndBackground.heroSubtitle ||
            'Where Notredamians from Batch 01 to HSC 2026 connect, reminisce campus memories, seek career mentorship, and chat in private batch lounges — away from public social media noise.'}
        </motion.p>

        {/* Action Buttons: Sign In to Batch & Join Batch */}
        <motion.div
          variants={buttonGroupVariants}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10"
        >
          <motion.button
            type="button"
            onClick={onOpenLogin}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden px-6 sm:px-8 py-3.5 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer group"
          >
            {/* Subtle Sheen Sweep */}
            <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />
            <span className="text-blue-200 font-mono tracking-tighter text-sm group-hover:-translate-x-0.5 transition-transform">&rarr;]</span>
            <span>Sign In to Batch</span>
            <span className="text-blue-200 font-mono tracking-tighter text-sm group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={onOpenRegister}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 sm:px-8 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm sm:text-base border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
          >
            Join Batch
          </motion.button>
        </motion.div>

        {/* Centered Glass Card: OUR NETWORK AT A GLANCE with Staggered Metrics */}
        <motion.div
          variants={cardContainerVariants}
          className="w-full max-w-3xl mx-auto bg-white/90 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-black/50 text-center"
        >
          <div className="text-[11px] sm:text-xs font-black tracking-widest text-[#2563eb] dark:text-[#60a5fa] uppercase mb-4 sm:mb-5">
            OUR NETWORK AT A GLANCE
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5 sm:mb-6">
            {/* Total Batches */}
            <motion.div
              variants={statItemVariants}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-50/90 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center transition-shadow hover:shadow-sm"
            >
              <div className="text-2xl sm:text-3xl font-black text-[#2563eb] dark:text-[#60a5fa]">
                {branding.totalBatchesCount || 76}
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Batches</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{branding.establishedYear || 1949} — 2026</div>
            </motion.div>

            {/* 3,250+ Verified Alumni */}
            <motion.div
              variants={statItemVariants}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-50/90 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center transition-shadow hover:shadow-sm"
            >
              <div className="text-2xl sm:text-3xl font-black text-[#2563eb] dark:text-[#60a5fa]">
                <AnimatedCounter end={3250} suffix="+" />
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Verified Alumni</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Campus Quad</div>
            </motion.div>

            {/* 18+ Countries */}
            <motion.div
              variants={statItemVariants}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-50/90 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center transition-shadow hover:shadow-sm"
            >
              <div className="text-2xl sm:text-3xl font-black text-[#d97706] dark:text-[#fbbf24]">18+</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Countries</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Global Chapters</div>
            </motion.div>

            {/* 450+ Specialists */}
            <motion.div
              variants={statItemVariants}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-50/90 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center transition-shadow hover:shadow-sm"
            >
              <div className="text-2xl sm:text-3xl font-black text-[#16a34a] dark:text-[#4ade80]">450+</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Specialists</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Fellows &amp; Leads</div>
            </motion.div>
          </div>

          {/* How we verify real students pill button */}
          <button
            type="button"
            onClick={onOpenVerificationModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer group shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>How we verify real students (2-Brother Vouch)</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
};
