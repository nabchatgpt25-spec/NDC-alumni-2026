import React, { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import {
  LogIn,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Users,
  Lock,
  HeartHandshake,
  MapPin,
  Sparkles,
  Calendar,
  Building2,
  Award,
  Radio,
  Clock,
  Compass,
  Pause,
  Play,
  Camera,
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
import campusArtworkImg from '../../assets/images/ndc_campus_artwork_1790748644859.jpg';
import sportsCourtImg from '../../assets/images/ndc_badminton_court_1790748659189.jpg';

interface HeroSectionProps {
  alumniList?: AlumniProfile[];
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onSelectAlumnus?: (alumnus: AlumniProfile) => void;
  onScrollToBatches?: () => void;
  onScrollToFeed?: () => void;
  onOpenVerificationModal?: () => void;
}

// 6 Signature Notre Dame College Heritage Photos for the Carousel
const CAMPUS_CAROUSEL_SLIDES = [
  {
    id: 1,
    title: 'Father Harrington Hall',
    location: 'Main Academic Building • Est. 1949',
    caption: 'Iconic red brick architecture and classroom corridors',
    image: campusHeroImg,
    badge: 'Campus Heritage',
    era: 'Motijheel Campus',
  },
  {
    id: 2,
    title: 'The Legendary Main Gate',
    location: 'Motijheel Entrance • Dhaka-1000',
    caption: 'Walked by 76 continuous generations of Notredamians',
    image: mainGateImg,
    badge: 'College Landmark',
    era: 'Campus Gateway',
  },
  {
    id: 3,
    title: 'Grand Alumni Reunion',
    location: 'Campus Grounds & Ganguly Hall',
    caption: 'Platinum Jubilee gathering of Notredamians across five decades',
    image: reunionImg,
    badge: 'Brotherhood',
    era: '76 Batches United',
  },
  {
    id: 4,
    title: 'The College Quadrangle',
    location: 'Central Campus Quad & Lawns',
    caption: 'The heart of campus life where lifelong friendships were forged',
    image: campusArtworkImg,
    badge: 'The Digital Quad',
    era: 'Central Grounds',
  },
  {
    id: 5,
    title: 'Campus Athletic Grounds',
    location: 'Sports Courts & Student Pavilions',
    caption: 'Memories of annual sports meets, club festivals and debate tournaments',
    image: sportsCourtImg,
    badge: 'Student Spirit',
    era: 'Campus Life',
  },
  {
    id: 6,
    title: 'Father Timm Science Building',
    location: 'NDSC Science Complex & Ganguly Hall',
    caption: 'Home to the pioneer science clubs, cultural evenings & academic triumphs',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&auto=format&fit=crop&q=80',
    badge: 'Holy Cross Legacy',
    era: 'Academic Excellence',
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenLogin,
  onOpenRegister,
  onScrollToBatches,
  onScrollToFeed,
  onOpenVerificationModal,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-move carousel every 4.5 seconds
  useEffect(() => {
    if (!isAutoPlaying || prefersReducedMotion) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAMPUS_CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isAutoPlaying, prefersReducedMotion]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAMPUS_CAROUSEL_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + CAMPUS_CAROUSEL_SLIDES.length) % CAMPUS_CAROUSEL_SLIDES.length
    );
  };

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const bgParallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '15%']
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion || typeof window === 'undefined' || window.innerWidth < 1024) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseParallax({ x: nx * 14, y: ny * 10 });
  };

  const handleMouseLeave = () => {
    setMouseParallax({ x: 0, y: 0 });
  };

  const activeSlideData = CAMPUS_CAROUSEL_SLIDES[currentSlide];

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-20 border-b border-slate-200/90 dark:border-slate-800/90 bg-gradient-to-b from-slate-100/70 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900/95 dark:to-slate-950"
    >
      {/* ============================================================
          1. CINEMATIC 6-PHOTO AUTO-MOVING CAROUSEL BACKGROUND
          ============================================================ */}
      <motion.div
        style={{ y: bgParallaxY }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {CAMPUS_CAROUSEL_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${
                isActive
                  ? 'opacity-35 dark:opacity-40 scale-105 z-0'
                  : 'opacity-0 scale-100 -z-10'
              }`}
              style={{
                backgroundImage: `url(${slide.image})`,
                filter: 'saturate(1.2) contrast(1.1)',
                transitionProperty: 'opacity, transform',
              }}
            />
          );
        })}

        {/* Deep Twilight Vignette Mask ensuring maximum text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-white/80 to-slate-50 dark:from-slate-950/94 dark:via-slate-950/85 dark:to-slate-950" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-blue-900/5 to-slate-900/20 dark:from-transparent dark:via-blue-950/30 dark:to-slate-950/80" />
      </motion.div>

      {/* 2. Constellation Network Canvas */}
      <AcademicNetworkCanvas density="medium" className="opacity-60 dark:opacity-80" />

      {/* 3. Subtle Ambient Light Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20">
        <div
          className="absolute -top-24 left-1/4 w-[480px] h-[480px] rounded-full bg-blue-500/20 blur-[100px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${mouseParallax.x * -0.6}px, ${mouseParallax.y * -0.6}px, 0)`,
          }}
        />
        <div
          className="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full bg-amber-400/20 blur-[110px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${mouseParallax.x * 0.7}px, ${mouseParallax.y * 0.7}px, 0)`,
          }}
        />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Floating Carousel Status & Interactive Controller Pill */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-xs backdrop-blur-md">
            <div className="w-4 h-4 rounded-md bg-amber-500/15 p-0.5 border border-amber-500/30 flex items-center justify-center shrink-0">
              <NDCLogo className="w-full h-full" />
            </div>
            <span className="font-serif italic font-extrabold text-amber-700 dark:text-amber-300">
              Diligite Lumen Sapientiae
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              <b className="text-emerald-700 dark:text-emerald-400">
                <AnimatedCounter end={340} suffix="+" /> Online
              </b>
            </span>
          </div>

          {/* Carousel Live Indicator & Controls */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 backdrop-blur-md shadow-2xs">
            <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[140px] sm:max-w-none">
              {activeSlideData.title}
            </span>
            <span className="text-slate-300 dark:text-slate-600">({currentSlide + 1}/6)</span>

            <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 dark:border-slate-700 pl-1.5">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="w-5 h-5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Previous photo"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="w-5 h-5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
              >
                {isAutoPlaying ? <Pause className="w-3 h-3 text-blue-500" /> : <Play className="w-3 h-3 text-amber-500" />}
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                className="w-5 h-5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Next photo"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Split 2-Column High-Impact Cinematic Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ============================================================
              LEFT COLUMN: Institutional Identity & Action Card
              ============================================================ */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">

            {/* Signature Headline */}
            <motion.h1
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] mb-3"
            >
              The Private Digital Quad for{' '}
              <span className="block mt-1 font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-amber-600 dark:from-blue-400 dark:via-cyan-300 dark:to-amber-300">
                Notre Dame College Alumni.
              </span>
            </motion.h1>

            {/* Revered Slogan in Gold Foil Typography */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 mb-4"
            >
              <div className="h-0.5 w-6 bg-amber-500/70 rounded-full" />
              <blockquote className="font-serif italic text-base sm:text-xl font-bold text-amber-700 dark:text-amber-300 tracking-wide">
                &ldquo;Once a Notre Damian, Always a Notre Damian.&rdquo;
              </blockquote>
            </motion.div>

            {/* Concise Mission Subtitle */}
            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-6 max-w-2xl"
            >
              Where 35,000+ brothers from Batch 01 (1949) to HSC 2026 connect, preserve campus memories, coordinate emergency blood calls, and mentor future generations in private batch lounges — away from public social media noise.
            </motion.p>

            {/* ============================================================
                THE RESTORED ACTION CARD (EXACTLY AS DESIRED)
                ============================================================ */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl mb-6"
            >
              <Tilt3DCard
                maxTilt={2.5}
                className="group glass-panel w-full rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-blue-900/5 dark:shadow-black/40 text-center transition-all bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-md"
              >
                {/* Primary Action Buttons with Magnetic Pull */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 mb-4 w-full relative z-20">
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pb-2">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-400/50 transition-colors">
                      <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight">
                        <AnimatedCounter end={76} />
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Batches
                      </div>
                      <div className="text-[9px] text-slate-400 hidden sm:block">
                        1949 — 2026
                      </div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-400/50 transition-colors">
                      <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight">
                        <AnimatedCounter end={3250} suffix="+" />
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Verified Alumni
                      </div>
                      <div className="text-[9px] text-slate-400 hidden sm:block">
                        Campus Quad
                      </div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-amber-400/50 transition-colors">
                      <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 tracking-tight">
                        <AnimatedCounter end={18} suffix="+" />
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Countries
                      </div>
                      <div className="text-[9px] text-slate-400 hidden sm:block">
                        Global Chapters
                      </div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-emerald-400/50 transition-colors">
                      <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
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
                </div>

                {/* Verification Protocol Link */}
                {onOpenVerificationModal && (
                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 relative z-20">
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

            {/* 3 Core Trust Badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-xl">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 text-left">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black text-xs mb-0.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Zero Outsiders</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Strictly Motijheel students</div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 text-left">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black text-xs mb-0.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Batch Lounges</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">76 Private Batch Rooms</div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 text-left">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black text-xs mb-0.5">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Blood Lifeline</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">1,200+ Emergency Donors</div>
              </div>
            </div>

          </div>

          {/* ============================================================
              RIGHT COLUMN: The Live Digital Quad 3D Glass Showcase
              ============================================================ */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md lg:max-w-none"
            >
              <Tilt3DCard
                maxTilt={4}
                className="group relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/20 dark:shadow-black/70 border border-white/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl"
              >
                {/* 1. Cinematic Heritage Window: Auto-Moving 6-Slide Window */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950">
                  {CAMPUS_CAROUSEL_SLIDES.map((slide, index) => {
                    const isVisible = index === currentSlide;
                    return (
                      <div
                        key={slide.id}
                        className={`absolute inset-0 transition-all duration-700 ease-out ${
                          isVisible ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 pointer-events-none z-0'
                        }`}
                      >
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      </div>
                    );
                  })}

                  {/* Atmospheric Sunset Sheen Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-20 pointer-events-none" />
                  <div className="absolute inset-0 bg-radial-at-t from-transparent via-transparent to-slate-950/60 z-20 pointer-events-none" />

                  {/* Campus Header Tag */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-30">
                    <div className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{activeSlideData.badge}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>Auto-Playing</span>
                      </div>
                    </div>
                  </div>

                  {/* Next / Previous Overlay Arrows on the Showcase Frame */}
                  <div className="absolute inset-y-0 left-2 flex items-center z-30 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      className="w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                      title="Previous photo"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-2 flex items-center z-30 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      className="w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                      title="Next photo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Info on the Campus Frame */}
                  <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between z-30">
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-amber-300">
                        {activeSlideData.location}
                      </div>
                      <div className="text-white font-bold text-sm tracking-tight drop-shadow-sm">
                        {activeSlideData.title}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md p-1 border border-white/20 flex items-center justify-center shrink-0">
                      <NDCLogo className="w-full h-full" />
                    </div>
                  </div>

                  {/* 6 Carousel Dots on the Frame */}
                  <div className="absolute bottom-1.5 inset-x-0 flex items-center justify-center gap-1.5 z-30 pointer-events-auto">
                    {CAMPUS_CAROUSEL_SLIDES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentSlide(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === currentSlide ? 'w-5 bg-amber-400 shadow-xs' : 'w-1.5 bg-white/50 hover:bg-white/80'
                        }`}
                        title={`Go to photo ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. Interactive Digital Quad Terminal Body */}
                <div className="p-4 sm:p-5 space-y-3">
                  
                  {/* Verified Alumnus Digital Credential Pill */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        NDC
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                          <span>Official Alumni Network</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Holy Cross Congregation Heritage
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-black border border-amber-500/20">
                        Batch 01–76
                      </span>
                    </div>
                  </div>

                  {/* Live Activity Ticker */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 flex items-center justify-between">
                      <span>Recent Digital Quad Activity</span>
                      <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                    </div>

                    {/* Post item 1: Batch meetup */}
                    <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 text-[11px] flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 dark:text-white">Batch 58 Alumni:</span>{' '}
                        <span>“Friday coffee catch-up at campus cafeteria.”</span>
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0">12m ago</span>
                    </div>

                    {/* Post item 2: Blood alert resolved */}
                    <div className="p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 text-[11px] flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-rose-700 dark:text-rose-400">Emergency Blood:</span>{' '}
                        <span>Square Hospital request fulfilled by 2 brothers.</span>
                      </div>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">Resolved</span>
                    </div>
                  </div>

                  {/* Quick Jump Buttons to Explore Platform */}
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onScrollToBatches}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>Browse 76 Batches</span>
                    </button>

                    <button
                      type="button"
                      onClick={onScrollToFeed}
                      className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Live Quad Buzz</span>
                    </button>
                  </div>

                </div>
              </Tilt3DCard>
            </motion.div>
          </div>

        </div>

        {/* ============================================================
            BOTTOM ROW: 4 Institutional Heritage Metrics
            ============================================================ */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 sm:mt-14 pt-6 border-t border-slate-200/80 dark:border-slate-800/80"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  <AnimatedCounter end={76} /> Batches
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  1949 — 2026 Continuous Legacy
                </div>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  <AnimatedCounter end={35000} suffix="+" /> Alumni
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Lifelong Holy Cross Brotherhood
                </div>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  <AnimatedCounter end={42} suffix="+" /> Chapters
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Across North America, Europe &amp; Asia
                </div>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  100% Verified
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Peer-Vouched Notre Damians Only
                </div>
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
};
