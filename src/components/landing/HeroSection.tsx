import React, { useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  LogIn,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Users,
  Lock,
  HeartHandshake,
  MapPin,
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import { NDCLogo } from '../NDCLogo';
import { AnimatedCounter } from './AnimatedCounter';
import {
  AcademicNetworkCanvas,
  MagneticWrap,
  Tilt3DCard,
} from '../motion/CinematicMotion';
import campusHeroImg from '../../assets/images/ndc_campus_hero_1790233370828.jpg';
import mainGateImg from '../../assets/images/ndc_main_gate_1790748632254.jpg';
import reunionImg from '../../assets/images/ndc_reunion_celebration_1790233384454.jpg';

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
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const bgParallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '16%']
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion || typeof window === 'undefined' || window.innerWidth < 1024) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseParallax({ x: nx * 18, y: ny * 14 });
  };

  const handleMouseLeave = () => {
    setMouseParallax({ x: 0, y: 0 });
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden pt-4 pb-6 sm:pt-10 sm:pb-12 lg:pt-14 lg:pb-16 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-blue-50/75 via-white to-slate-50 dark:from-slate-900/95 dark:via-slate-950 dark:to-slate-950"
    >
      {/* 1. Subtle Parallax Real Notre Dame Campus Architectural Backdrop */}
      <motion.div
        style={{ y: bgParallaxY }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.07] dark:opacity-[0.085] scale-105 transition-transform duration-700"
          style={{
            backgroundImage: `url(${campusHeroImg})`,
            maskImage:
              'radial-gradient(ellipse 85% 70% at 50% 35%, black 25%, transparent 85%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 85% 70% at 50% 35%, black 25%, transparent 85%)',
          }}
        />
      </motion.div>

      {/* 2. Institutional Constellation Network Connections & Particles */}
      <AcademicNetworkCanvas density="medium" className="opacity-75 dark:opacity-90" />

      {/* 3. Atmospheric Navy & Restrained Gold Glow Layers (Mouse Parallax) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35 dark:opacity-25">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/70 blur-3xl transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${mouseParallax.x * -0.9}px, ${mouseParallax.y * -0.9}px, 0)`,
          }}
        />
        <div
          className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-amber-500/35 blur-3xl transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${mouseParallax.x * 0.9}px, ${mouseParallax.y * 0.9}px, 0)`,
          }}
        />
      </div>

      {/* 4. Subtle 3D Floating Real Campus Heritage Cards (Desktop Wide Screens Only) */}
      <div
        aria-hidden="true"
        className="hidden 2xl:block pointer-events-none absolute left-8 top-24 z-10 w-52"
        style={{
          transform: `translate3d(${mouseParallax.x * -0.65}px, ${mouseParallax.y * -0.65}px, 0)`,
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="float-3d-slow glass-card p-2 rounded-2xl shadow-xl border border-white/80 dark:border-slate-700/70">
          <div className="img-zoom-container rounded-xl h-28 overflow-hidden relative">
            <img
              src={mainGateImg}
              alt="Notre Dame College Main Gate"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold text-white">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Motijheel Campus • Est. 1949</span>
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="hidden 2xl:block pointer-events-none absolute right-8 top-28 z-10 w-52"
        style={{
          transform: `translate3d(${mouseParallax.x * 0.65}px, ${mouseParallax.y * 0.65}px, 0)`,
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="float-3d-delayed glass-card p-2 rounded-2xl shadow-xl border border-white/80 dark:border-slate-700/70">
          <div className="img-zoom-container rounded-xl h-28 overflow-hidden relative">
            <img
              src={reunionImg}
              alt="Notre Dame College Alumni Brotherhood"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center gap-1 text-[10px] font-bold text-amber-200">
              <Users className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">76 Generations of Brotherhood</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Live Community Pulse Indicator */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs font-bold mb-3 sm:mb-5 shadow-xs"
          >
            <NDCLogo className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500" />
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              <b className="text-slate-900 dark:text-white">
                <AnimatedCounter end={340} suffix="+ Online" />
              </b>{' '}
              • <AnimatedCounter end={76} /> Batches • <AnimatedCounter end={42} /> Countries
            </span>
          </motion.div>

          {/* Signature Headline with Staggered Reveal */}
          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15] sm:leading-[1.1] mb-2.5 sm:mb-4"
          >
            The Private Social Network for{' '}
            <span
              className="animated-institutional-gradient bg-gradient-to-r from-blue-700 via-indigo-600 to-amber-500 dark:from-blue-400 dark:via-indigo-300 dark:to-amber-300 bg-clip-text text-transparent inline-block"
              style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Notre Dame College
            </span>{' '}
            Alumni.
          </motion.h1>

          {/* Official Institutional Slogan Reveal */}
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif italic text-xs sm:text-sm lg:text-base font-semibold text-amber-700 dark:text-amber-300/95 tracking-wide mb-2.5 sm:mb-3.5"
          >
            &ldquo;Once a Notre Damian, Always a Notre Damian.&rdquo;
          </motion.p>

          {/* Subtitle */}
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-xs sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-5 sm:mb-7 max-w-2xl"
          >
            Where Notredamians from Batch 01 to HSC 2026 connect, reminisce campus memories, seek career mentorship, and chat in private batch lounges — away from public social media noise.
          </motion.p>

          {/* Glassmorphic Central Access & Statistics Container with Subtle 3D Tilt */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-auto mb-6 sm:mb-8"
          >
            <Tilt3DCard
              maxTilt={2.5}
              className="group glass-panel w-full rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xl shadow-blue-900/5 dark:shadow-black/30 text-center transition-all"
            >
              {/* Primary Action Buttons with Magnetic Pull */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 mb-5 w-full relative z-20">
                <MagneticWrap className="w-full sm:w-auto flex-1 flex">
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="btn-interactive w-full px-6 py-3 sm:px-7 sm:py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 flex items-center justify-center gap-2 cursor-pointer group/btn"
                  >
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 group-hover/btn:text-white transition-colors" />
                    <span>Sign In to Batch</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </MagneticWrap>

                <MagneticWrap className="w-full sm:w-auto flex">
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="btn-interactive w-full sm:w-auto px-5 py-3 sm:px-6 sm:py-3.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-400 font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Join Batch</span>
                  </button>
                </MagneticWrap>
              </div>

              {/* Scroll-Triggered Animated Statistics Hub */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 relative z-20">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                  Our Network at a Glance
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pb-3">
                  <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.45, delay: 0.05 }}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 hover:border-blue-400/50 transition-colors"
                  >
                    <div className="text-base sm:text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                      <AnimatedCounter end={76} />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Batches
                    </div>
                    <div className="text-[9px] text-slate-400 hidden sm:block">
                      1949 — 2026
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.45, delay: 0.12 }}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 hover:border-blue-400/50 transition-colors"
                  >
                    <div className="text-base sm:text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                      <AnimatedCounter end={3250} suffix="+" />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Verified Alumni
                    </div>
                    <div className="text-[9px] text-slate-400 hidden sm:block">
                      Campus Quad
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.45, delay: 0.19 }}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 hover:border-amber-400/50 transition-colors"
                  >
                    <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                      <AnimatedCounter end={18} suffix="+" />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Countries
                    </div>
                    <div className="text-[9px] text-slate-400 hidden sm:block">
                      Global Chapters
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.45, delay: 0.26 }}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 hover:border-emerald-400/50 transition-colors"
                  >
                    <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                      <AnimatedCounter end={450} suffix="+" />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Specialists
                    </div>
                    <div className="text-[9px] text-slate-400 hidden sm:block">
                      Fellows & Leads
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Verification Protocol Link */}
              {onOpenVerificationModal && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 relative z-20">
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
            </Tilt3DCard>
          </motion.div>

          {/* 3 Core Value Pillars Cards with 3D Tilt & Staggered Scroll-Reveal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full text-left pt-2 sm:pt-4">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <Tilt3DCard className="group glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl h-full">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight mb-0.5">
                  Zero Outsiders
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Strict peer verification. Only students who walked the Motijheel campus can post and interact.
                </p>
              </Tilt3DCard>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              <Tilt3DCard className="group glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl h-full">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight mb-0.5">
                  Private Batch Lounges
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Dedicated walls for every batch from 1949 to 2026. Catch up with section classmates easily.
                </p>
              </Tilt3DCard>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Tilt3DCard className="group glass-card p-3.5 sm:p-4 rounded-xl sm:rounded-2xl h-full">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <HeartHandshake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight mb-0.5">
                  Brotherhood Mentorship
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Senior alumni, tech leads, BUET/IBA faculty guiding younger batches with referrals and advice.
                </p>
              </Tilt3DCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};


