import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import { AnimatedCounter } from './AnimatedCounter';
import { NDCLogo } from '../NDCLogo';

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

  return (
    <section className="relative overflow-hidden pt-10 pb-14 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24 bg-gradient-to-b from-blue-50/50 via-white to-slate-50/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 select-none">
      {/* Soft Ambient Pastel Glows */}
      <div className="absolute top-0 left-6 sm:left-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-blue-300/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-4 sm:right-12 w-80 sm:w-96 h-80 sm:h-96 bg-amber-200/25 dark:bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Status Pill: 340+ Online • 76 Batches • 42 Countries */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-xs mb-5 sm:mb-6 backdrop-blur-sm"
        >
          <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
            <NDCLogo className="w-full h-full object-contain" />
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
          <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
            340+ Online • 76 Batches • 42 Countries
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-3xl sm:text-5xl lg:text-[3.65rem] font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] mb-3 sm:mb-4 max-w-4xl mx-auto"
        >
          <span className="block">The Private Social Network for</span>
          <span className="block mt-1 sm:mt-1.5">
            <span className="text-[#15803d] dark:text-[#22c55e]">Notre Dame </span>
            <span className="text-[#d97706] dark:text-[#f59e0b]">College </span>
            <span className="text-[#2563eb] dark:text-[#3b82f6]">Alumni.</span>
          </span>
        </motion.h1>

        {/* Traditional College Motto */}
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="font-serif italic text-[#c2410c] dark:text-[#ea580c] font-bold text-sm sm:text-base lg:text-lg mb-4 sm:mb-5 tracking-wide"
        >
          &ldquo;Once a Notre Damian, Always a Notre Damian.&rdquo;
        </motion.p>

        {/* Subtitle Description */}
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm lg:text-[15px] max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8 font-normal"
        >
          Where Notredamians from Batch 01 to HSC 2026 connect, reminisce campus
          memories, seek career mentorship, and chat in private batch lounges — away from
          public social media noise.
        </motion.p>

        {/* Action Buttons: Sign In to Batch & Join Batch */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10"
        >
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-6 sm:px-8 py-3.5 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer group"
          >
            <span className="text-blue-200 font-mono tracking-tighter text-sm group-hover:-translate-x-0.5 transition-transform">&rarr;]</span>
            <span>Sign In to Batch</span>
            <span className="text-blue-200 font-mono tracking-tighter text-sm group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </button>

          <button
            type="button"
            onClick={onOpenRegister}
            className="px-6 sm:px-8 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 font-bold text-sm sm:text-base border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
          >
            Join Batch
          </button>
        </motion.div>

        {/* Centered Glass Card: OUR NETWORK AT A GLANCE */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25 }}
          className="w-full max-w-3xl mx-auto bg-white/90 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-black/50 text-center"
        >
          <div className="text-[11px] sm:text-xs font-black tracking-widest text-[#2563eb] dark:text-[#60a5fa] uppercase mb-4 sm:mb-5">
            OUR NETWORK AT A GLANCE
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5 sm:mb-6">
            {/* 76 Batches */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-[#2563eb] dark:text-[#60a5fa]">76</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Batches</div>
              <div className="text-[10px] text-slate-400 mt-0.5">1949 — 2026</div>
            </div>

            {/* 3,250+ Verified Alumni */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-[#2563eb] dark:text-[#60a5fa]">
                <AnimatedCounter end={3250} suffix="+" />
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Verified Alumni</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Campus Quad</div>
            </div>

            {/* 18+ Countries */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-[#d97706] dark:text-[#fbbf24]">18+</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Countries</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Global Chapters</div>
            </div>

            {/* 450+ Specialists */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-[#16a34a] dark:text-[#4ade80]">450+</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Specialists</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Fellows &amp; Leads</div>
            </div>
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
      </div>
    </section>
  );
};


