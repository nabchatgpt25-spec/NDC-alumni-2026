import React, { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  LogIn,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Users,
  Calendar,
  GraduationCap,
  FileText,
  Pause,
  Play,
  Camera,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import { AnimatedCounter } from './AnimatedCounter';
import { AcademicNetworkCanvas } from '../motion/CinematicMotion';
import campusArtworkImg from '../../assets/images/ndc_campus_artwork_1790748644859.jpg';
import mainGateImg from '../../assets/images/ndc_main_gate_1790748632254.jpg';
import campusHeroImg from '../../assets/images/ndc_campus_hero_1790233370828.jpg';
import monumentCloseupImg from '../../assets/images/ndc_monument_closeup.jpg';

interface HeroSectionProps {
  alumniList?: AlumniProfile[];
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onSelectAlumnus?: (alumnus: AlumniProfile) => void;
  onScrollToBatches?: () => void;
  onScrollToFeed?: () => void;
  onOpenVerificationModal?: () => void;
}

export interface CampusCarouselSlide {
  id: number;
  title: string;
  shortName: string;
  location: string;
  caption: string;
  image: string;
  badge?: string;
}

/**
 * 4 Campus Carousel Photos:
 * Strictly the 4 images uploaded by the user.
 */
export const CAMPUS_CAROUSEL_SLIDES: CampusCarouselSlide[] = [
  {
    id: 1,
    title: 'Mother Mary Heritage Mosaic Monument & Garden',
    shortName: 'Mosaic Shrine',
    location: 'Campus Garden & Central Pathways',
    caption: 'Revered terracotta monument and mosaic shrine surrounded by lush palms',
    image: campusArtworkImg,
    badge: 'Holy Cross Legacy',
  },
  {
    id: 2,
    title: 'The Legendary Main Gate Motijheel',
    shortName: 'NDC Main Gate',
    location: 'Motijheel Entrance • Dhaka-1000',
    caption: 'Walked by 76 continuous generations of Notredamians',
    image: mainGateImg,
    badge: 'College Gateway',
  },
  {
    id: 3,
    title: 'Father Harrington Hall & Main Building',
    shortName: 'Harrington Hall',
    location: 'Main Academic Building • Est. 1949',
    caption: 'Iconic red brick architecture and classroom corridors',
    image: campusHeroImg,
    badge: 'Campus Heritage',
  },
  {
    id: 4,
    title: 'Mother Mary Heritage Mosaic Shrine',
    shortName: 'Terracotta Monument',
    location: 'Central Campus Memorial Garden',
    caption: 'Sacred Mother Mary and child mosaic artwork mounted on terracotta brick structure',
    image: monumentCloseupImg,
    badge: 'Campus Monument',
  },
];

// Fisher-Yates shuffle to randomize slides on each page load
function shuffleSlides<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const AUTO_SLIDE_INTERVAL = 6000;

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenLogin,
  onOpenRegister,
  onScrollToBatches,
  onScrollToFeed,
  onOpenVerificationModal,
}) => {
  const prefersReducedMotion = useReducedMotion();
  // Randomize image order on each load to keep the experience fresh for returning users
  const [carouselSlides] = useState(() => shuffleSlides(CAMPUS_CAROUSEL_SLIDES));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);

  const hasSlides = carouselSlides.length > 0;

  // Auto-move carousel with live progress indicator (runs when slides are provided)
  useEffect(() => {
    if (!hasSlides || !isAutoPlaying || prefersReducedMotion) {
      setProgressPercent(0);
      return;
    }

    const intervalStep = 50;
    const increment = (intervalStep / AUTO_SLIDE_INTERVAL) * 100;

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          setCurrentSlide((slide) => (slide + 1) % carouselSlides.length);
          return 0;
        }
        return prev + increment;
      });
    }, intervalStep);

    return () => clearInterval(timer);
  }, [isAutoPlaying, prefersReducedMotion, carouselSlides.length, hasSlides]);

  const handleNextSlide = () => {
    if (!hasSlides) return;
    setProgressPercent(0);
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const handlePrevSlide = () => {
    if (!hasSlides) return;
    setProgressPercent(0);
    setCurrentSlide(
      (prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length
    );
  };

  const handleSelectSlide = (index: number) => {
    if (!hasSlides) return;
    setProgressPercent(0);
    setCurrentSlide(index);
  };

  const activeSlide = hasSlides ? carouselSlides[currentSlide] : null;

  return (
    <section className="relative overflow-visible pb-16 lg:pb-24 bg-slate-900 text-white select-none">
      {/* ============================================================
          1. FULL-WIDTH HERO CAROUSEL WITH CINEMATIC KEN BURNS SETTINGS
          ============================================================ */}
      <div className="relative w-full h-[580px] sm:h-[640px] lg:h-[700px] overflow-hidden bg-slate-950">
        
        {/* Background Slides with Real Photos & Subtle Ken Burns Zoom-and-Pan (Active when photos are provided) */}
        {hasSlides ? (
          carouselSlides.map((slide, index) => {
            const isActive = index === currentSlide;
            const animClass = `ken-burns-anim-${index % 5}`;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out will-change-transform ${
                  isActive
                    ? `opacity-100 z-10 ${animClass}`
                    : 'opacity-0 z-0 pointer-events-none'
                }`}
                style={{
                  backgroundImage: `url(${slide.image})`,
                  filter: 'brightness(1.06) contrast(1.08) saturate(1.15)',
                }}
              />
            );
          })
        ) : (
          /* Prestigious Architectural Backdrop while awaiting user's real images */
          <div className="absolute inset-0 bg-gradient-to-r from-[#07132b] via-[#091b3b] to-[#07132b]">
            <AcademicNetworkCanvas density="low" className="opacity-40" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(37,99,235,0.15),transparent_70%)]" />
          </div>
        )}

        {/* Balanced Cinematic Gradient: Keeps real photos crisp and vivid while providing clean text contrast */}
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-slate-950/75 via-slate-950/35 to-black/10" />
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

        {/* Previous Arrow Button (Left Edge - active when slides are provided) */}
        {hasSlides && (
          <div className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30">
            <button
              type="button"
              onClick={handlePrevSlide}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/35 hover:bg-black/60 active:scale-95 text-white border border-white/25 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-xl group"
              title="Previous college photo"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Next Arrow Button (Right Edge - active when slides are provided) */}
        {hasSlides && (
          <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30">
            <button
              type="button"
              onClick={handleNextSlide}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/35 hover:bg-black/60 active:scale-95 text-white border border-white/25 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-xl group"
              title="Next college photo"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Right Edge: Vertical SCROLL indicator */}
        <div className="hidden lg:flex flex-col items-center gap-2 absolute right-8 bottom-28 z-30 opacity-70 pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] rotate-90 origin-center text-white/90 drop-shadow-md">
            SCROLL
          </span>
          <div className="w-[1px] h-10 bg-white/60 animate-pulse mt-4 shadow-sm" />
        </div>

        {/* Main Hero Content Area (Aligned Left like DUAA Screenshot) */}
        <div className="relative z-30 max-w-7xl mx-auto h-full px-5 sm:px-8 lg:px-12 flex flex-col justify-center">
          <div className="max-w-3xl pt-2 sm:pt-6 drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
            
            {/* Red Slogan Header Tag: "SINCE 1949" */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-3 sm:mb-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10"
            >
              <span className="text-red-500 font-extrabold tracking-[0.2em] text-xs sm:text-sm uppercase">
                SINCE 1949
              </span>
              <span className="text-white/40">•</span>
              <span className="text-amber-400 font-serif italic text-xs sm:text-sm font-semibold">
                Diligite Lumen Sapientiae
              </span>
            </motion.div>

            {/* Majestic Headline */}
            <motion.h1
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="text-3xl sm:text-5xl lg:text-[4.2rem] font-bold text-white tracking-tight leading-[1.08] mb-4 sm:mb-6 font-serif drop-shadow-md"
            >
              Where the journey of a{' '}
              <span className="block font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200">
                Notre Dame alumnus
              </span>{' '}
              continues.
            </motion.h1>

            {/* Subtitle Description */}
            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-base sm:text-lg lg:text-xl text-slate-100 leading-relaxed font-normal mb-8 max-w-2xl drop-shadow-md"
            >
              Home to 35,000+ alumni — a brotherhood spanning 76 batches, professions and continents, united by one alma mater.
            </motion.p>

            {/* Call to Action Buttons */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="flex flex-wrap items-center gap-3 sm:gap-4"
            >
              {/* Primary Red Button: "Become a Member ->" */}
              <button
                type="button"
                onClick={onOpenRegister}
                className="px-6 py-3.5 sm:px-8 sm:py-4 bg-[#c81e1e] hover:bg-[#b01818] active:scale-95 text-white font-bold text-sm sm:text-base rounded-md shadow-2xl shadow-red-950/60 flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <span>Become a Member</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Secondary White/Border Button: "Members' Portal" */}
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-6 py-3.5 sm:px-7 sm:py-4 bg-black/40 hover:bg-black/60 active:scale-95 text-white font-bold text-sm sm:text-base rounded-md border border-white/40 backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                <span>Members&apos; Portal</span>
              </button>
            </motion.div>

          </div>
        </div>

        {/* Bottom Banner Status Pill with Thumbnail Dots & Auto-Move Controller (when photos are provided) */}
        {hasSlides && activeSlide ? (
          <div className="absolute bottom-16 sm:bottom-20 left-5 sm:left-12 z-30 flex items-center gap-3 bg-black/55 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs text-white/95 shadow-lg">
            <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold truncate max-w-[160px] sm:max-w-xs">
              {activeSlide.title}
            </span>
            <span className="text-white/60">({currentSlide + 1}/{carouselSlides.length})</span>

            {/* Mini Progress Bar */}
            {isAutoPlaying && (
              <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full bg-red-500 transition-all ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Pause / Play */}
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="p-1 rounded-full hover:bg-white/20 text-white/90 transition-colors cursor-pointer"
              title={isAutoPlaying ? 'Pause Slideshow' : 'Play Slideshow'}
              aria-label="Pause or play slideshow"
            >
              {isAutoPlaying ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-amber-400" />}
            </button>
          </div>
        ) : (
          <div className="absolute bottom-16 sm:bottom-20 left-5 sm:left-12 z-30 flex items-center gap-2.5 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs text-slate-300">
            <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Campus Photo Showcase • Awaiting Official Photos</span>
          </div>
        )}

        {/* Carousel Slide Indicators (when photos are provided) */}
        {hasSlides && (
          <div className="absolute bottom-5 inset-x-0 z-30 flex items-center justify-center gap-2">
            {carouselSlides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => handleSelectSlide(idx)}
                className={`transition-all cursor-pointer rounded-full ${
                  idx === currentSlide
                    ? 'w-8 h-2 bg-[#c81e1e] shadow-sm'
                    : 'w-2 h-2 bg-white/60 hover:bg-white/90'
                }`}
                title={`View ${slide.title}`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

      </div>

      {/* ============================================================
          2. THE 4 OVERLAPPING FEATURE CARDS (IDENTICAL TO DUAA STYLE)
          ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14 relative z-40">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* Card 1: Upcoming Events */}
          <div
            onClick={onScrollToBatches}
            className="group bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 shadow-xl shadow-slate-950/15 border border-slate-200/90 dark:border-slate-800 hover:border-red-500/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                Upcoming Events
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Reunions, annual batch meets, club festivals and global chapter assemblies.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
              <span>View Calendar</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Members Portal */}
          <div
            onClick={onOpenLogin}
            className="group bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 shadow-xl shadow-slate-950/15 border border-slate-200/90 dark:border-slate-800 hover:border-red-500/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                Members&apos; Portal
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Sign in to the Smart Alumni Platform, batch lounges, and verified directory.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
              <span>Sign In</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Membership & Vouch */}
          <div
            onClick={onOpenVerificationModal || onOpenRegister}
            className="group bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 shadow-xl shadow-slate-950/15 border border-slate-200/90 dark:border-slate-800 hover:border-red-500/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                Membership &amp; Vouch
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Lifetime brotherhood for every Notredamian with 2-peer verified vouching.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
              <span>How We Verify</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Latest News & Blood Network */}
          <div
            onClick={onScrollToFeed}
            className="group bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 shadow-xl shadow-slate-950/15 border border-slate-200/90 dark:border-slate-800 hover:border-red-500/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                Latest News &amp; Blood
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Stay current with college announcements and live emergency blood coordination.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
              <span>Explore Quad Feed</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </div>

    </section>
  );
};


