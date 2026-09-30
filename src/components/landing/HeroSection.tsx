import React from 'react';
import {
  LogIn,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Users,
  Lock,
  HeartHandshake,
  Globe,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import { NDCLogo } from '../NDCLogo';
import { AnimatedCounter } from './AnimatedCounter';

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
  return (
    <section className="relative overflow-hidden pt-4 pb-6 sm:pt-10 sm:pb-12 lg:pt-14 lg:pb-16 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-blue-50/70 via-white to-slate-50 dark:from-slate-900/90 dark:via-slate-950 dark:to-slate-950">
      {/* Background Glow & Atmospheric Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-indigo-500/40 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Live Community Pulse Indicator */}
          <div className="glass-card inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs font-bold mb-3 sm:mb-6 shadow-xs">
            <NDCLogo className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500" />
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              <b className="text-slate-900 dark:text-white">
                <AnimatedCounter end={340} suffix="+ Online" />
              </b> • <AnimatedCounter end={76} /> Batches • <AnimatedCounter end={42} /> Countries
            </span>
          </div>

          {/* Signature Headline */}
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15] sm:leading-[1.1] mb-2.5 sm:mb-5">
            The Private Social Network for{' '}
            <span
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 dark:from-blue-400 dark:via-indigo-400 dark:to-amber-300 bg-clip-text text-transparent inline-block"
              style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Notre Dame College
            </span>{' '}
            Alumni.
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-5 sm:mb-7 max-w-2xl">
            Where Notredamians from Batch 01 to HSC 2026 connect, reminisce campus memories, seek career mentorship, and chat in private batch lounges — away from public social media noise.
          </p>

          {/* Glassmorphic Central Access & Statistics Container */}
          <div className="glass-panel w-full max-w-2xl mx-auto rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xl shadow-blue-900/5 dark:shadow-black/30 mb-6 sm:mb-8 text-center transition-all">
            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 mb-5 w-full">
              <button
                type="button"
                onClick={onOpenLogin}
                className="btn-interactive w-full sm:w-auto flex-1 px-6 py-3 sm:px-7 sm:py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 flex items-center justify-center gap-2 cursor-pointer group"
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 group-hover:text-white transition-colors" />
                <span>Sign In to Batch</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onOpenRegister}
                className="btn-interactive w-full sm:w-auto px-5 py-3 sm:px-6 sm:py-3.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-400 font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Join Batch</span>
              </button>
            </div>

            {/* Scroll-Triggered Animated Statistics Hub */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 py-3 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-base sm:text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                  <AnimatedCounter end={76} />
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Batches
                </div>
                <div className="text-[9px] text-slate-400 hidden sm:block">
                  1949 — 2026
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-base sm:text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                  <AnimatedCounter end={3250} suffix="+" />
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Verified Alumni
                </div>
                <div className="text-[9px] text-slate-400 hidden sm:block">
                  Campus Quad
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  <AnimatedCounter end={18} suffix="+" />
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Countries
                </div>
                <div className="text-[9px] text-slate-400 hidden sm:block">
                  Global Chapters
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  <AnimatedCounter end={450} suffix="+" />
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Specialists
                </div>
                <div className="text-[9px] text-slate-400 hidden sm:block">
                  Fellows & Leads
                </div>
              </div>
            </div>

            {/* Verification Protocol Link */}
            {onOpenVerificationModal && (
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={onOpenVerificationModal}
                  className="btn-interactive inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/70 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/80 text-center"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">How we verify real students (2-Brother Vouch)</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              </div>
            )}
          </div>

          {/* 3 Core Value Pillars Cards with Subtle Hover Effect */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full text-left pt-2 sm:pt-4">
            <div className="glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight mb-0.5">
                Zero Outsiders
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Strict peer verification. Only students who walked the Motijheel campus can post and interact.
              </p>
            </div>

            <div className="glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight mb-0.5">
                Private Batch Lounges
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Dedicated walls for every batch from 1949 to 2026. Catch up with section classmates easily.
              </p>
            </div>

            <div className="glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight mb-0.5">
                Brotherhood Mentorship
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Senior alumni, tech leads, BUET/IBA faculty guiding younger batches with referrals and advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

