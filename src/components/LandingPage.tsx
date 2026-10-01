import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  MapPin,
  Globe,
  GraduationCap,
  Users,
  ShieldCheck,
  ArrowRight,
  HeartHandshake,
  Calendar,
  Camera,
  Phone,
  Mail,
  Building2,
  FileText,
  Award,
  CreditCard,
  ChevronRight,
  MessageSquare,
  Lock
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NDCLogo } from './NDCLogo';
import { BATCH_LIST, ALUMNI_PROFILES } from '../data/mockData';
import { AlumniProfile, BatchSummary } from '../types';

import { HeroSection } from './landing/HeroSection';
import { QuadFeedPreview } from './landing/QuadFeedPreview';
import { BatchLoungesGrid } from './landing/BatchLoungesGrid';
import { FeaturedAlumniSection } from './landing/FeaturedAlumniSection';
import { GalleryPreviewSection } from './landing/GalleryPreviewSection';
import { FAQSection } from './landing/FAQSection';
import { QuickProfileModal } from './landing/QuickProfileModal';
import { BatchMembersModal } from './landing/BatchMembersModal';
import { VerificationExplainerModal } from './landing/VerificationExplainerModal';
import { BloodNeededNowSection } from './landing/BloodNeededNowSection';
import { CursorSpotlight, MagneticWrap } from './motion/CinematicMotion';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
  onNavigate,
}) => {
  // Modal states for interactive preview
  const [previewAlumnus, setPreviewAlumnus] = useState<AlumniProfile | null>(null);
  const [previewBatch, setPreviewBatch] = useState<BatchSummary | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Smooth scroll helper
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectBatch = (batch: BatchSummary) => {
    setPreviewBatch(batch);
  };

  // Get batch members from mockData for the selected batch
  const batchMembers = previewBatch
    ? ALUMNI_PROFILES.filter((a) => a.batchYear === previewBatch.batchYear)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 relative">
      {/* Global Cursor-Following Institutional Spotlight */}
      <CursorSpotlight />

      {/* 1. Top Community Pulse Bar */}
      <div className="bg-slate-900 text-slate-300 text-[11px] border-b border-slate-800 py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Community Status */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>The Digital Quad • Notre Dame College Alumni Network</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Motijheel, Dhaka-1000 • Est. 1949</span>
            </div>
          </div>

          {/* Right: Quick Links */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsVerificationModalOpen(true)}
              className="hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1 font-semibold text-emerald-400"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>How We Verify Real Students</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={onOpenLogin}
              className="hover:text-white transition-colors cursor-pointer font-bold text-amber-400"
            >
              Sign In to Your Batch
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Institutional Brand Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Bilingual Title */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 p-0.5 sm:p-1 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-sm sm:shadow-md shadow-blue-600/10 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <NDCLogo className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-xs sm:text-base tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                NOTRE DAME ALUMNI
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider truncate">
                নটর ডেম অ্যালামনাই • THE DIGITAL QUAD
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="nav-link-animated hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('feed-preview-section')}
              className="nav-link-animated hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              The Quad Feed
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('batches-section')}
              className="nav-link-animated hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              Batch Lounges (01–76)
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('featured-alumni-section')}
              className="nav-link-animated hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              Mentors & Leaders
            </button>
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="nav-link-animated hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              Global Chapters
            </button>
            <button
              type="button"
              onClick={() => onNavigate('gallery')}
              className="nav-link-animated hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              Nostalgia Gallery
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsVerificationModalOpen(true)}
              className="btn-interactive hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="How We Verify Real Students"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verification</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <ThemeToggle />

            <button
              type="button"
              onClick={onOpenLogin}
              className="btn-interactive px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Sign In
            </button>

            <MagneticWrap>
              <button
                type="button"
                onClick={onOpenRegister}
                className="btn-interactive px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/20 transition-all cursor-pointer whitespace-nowrap"
              >
                Join Batch
              </button>
            </MagneticWrap>
          </div>
        </div>

        {/* Mobile Horizontal Quick-Jump Bar */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 no-scrollbar text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => scrollToSection('feed-preview-section')}
            className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap"
          >
            Quad Feed
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            type="button"
            onClick={() => scrollToSection('batches-section')}
            className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap"
          >
            Batches (01–76)
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            type="button"
            onClick={() => scrollToSection('featured-alumni-section')}
            className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap"
          >
            Leaders
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            type="button"
            onClick={() => onNavigate('gallery')}
            className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap"
          >
            Gallery
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap text-amber-600 dark:text-amber-400 font-bold"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Main Social Network Home Content */}
      <main>
        {/* 3. Hero Section: The Digital Quad (Signature Alumni Social Network Style) */}
        <HeroSection
          alumniList={ALUMNI_PROFILES}
          onOpenLogin={onOpenLogin}
          onOpenRegister={onOpenRegister}
          onSelectAlumnus={(alumnus) => setPreviewAlumnus(alumnus)}
          onScrollToBatches={() => scrollToSection('batches-section')}
          onScrollToFeed={() => scrollToSection('feed-preview-section')}
          onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
        />

        {/* 4. Live Social Feed Preview: "The Quad Buzz" */}
        <div id="feed-preview-section">
          <QuadFeedPreview
            onOpenLogin={onOpenLogin}
            onOpenRegister={onOpenRegister}
          />
        </div>

        {/* 4.5. Compact Emergency Blood Network Section: "Blood Needed Now" */}
        <BloodNeededNowSection
          variant="landing"
          onNavigateToBloodNetwork={() => onNavigate('emergency')}
        />

        {/* 5. Batch Lounges Grid (01 to 76) with Era Filters */}
        <BatchLoungesGrid
          batches={BATCH_LIST}
          onSelectBatch={handleSelectBatch}
          onOpenRegister={onOpenRegister}
        />

        {/* 6. Spotlight on Distinguished Mentors & Leaders */}
        <div id="featured-alumni-section">
          <FeaturedAlumniSection
            alumniList={ALUMNI_PROFILES}
            onSelectAlumnus={(alumnus) => setPreviewAlumnus(alumnus)}
            onExploreDirectory={() => onNavigate('directory')}
          />
        </div>

        {/* 7. Campus Nostalgia & Heritage Photo Gallery */}
        <GalleryPreviewSection onExploreGallery={() => onNavigate('gallery')} />

        {/* 8. FAQs tailored for the social network & verification */}
        <FAQSection onOpenRegister={onOpenRegister} />
      </main>

      {/* 11. Clean Apple-Style Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-[#fbfbfd] dark:bg-[#0c1017] text-slate-500 dark:text-slate-400 text-xs py-8 sm:py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top Section: Brand Info (Left) + Explore & Community (Right) */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 pb-8 sm:pb-10">
            {/* Left: Brand Identity & Location */}
            <div className="max-w-md">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  <NDCLogo className="w-full h-full" />
                </div>
                <div>
                  <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                    NOTRE DAME ALUMNI
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-400">
                    Connect • Reunite • Build Together
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-3">
                The private social &amp; professional network for Notre Dame College.
              </p>
              <p className="font-serif italic text-xs font-semibold text-amber-700 dark:text-amber-300/90 mt-1.5">
                &ldquo;Once a Notre Damian, Always a Notre Damian.&rdquo;
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-1">
                Toyenbee Circular Road, Motijheel, Dhaka-1000, Bangladesh
              </p>
            </div>

            {/* Right: Explore & Community Columns */}
            <div className="grid grid-cols-2 gap-8 sm:gap-14 lg:gap-16">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                  Explore
                </h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('feed-preview-section')}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      The Quad Feed
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('batches-section')}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Batch Lounges (01–76)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('featured-alumni-section')}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Mentors & Leaders
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('map')}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Global Chapters Map
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('gallery')}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Nostalgia Gallery
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                  Community
                </h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => setIsVerificationModalOpen(true)}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      How We Verify Real Students
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setIsVerificationModalOpen(true)}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      2-Brother Vouch Protocol
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('directory')}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Alumni Directory
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={onOpenRegister}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Join Batch Circle
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('contact')}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Secretariat Helpdesk
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/80 dark:border-slate-800/80 pt-6">
            {/* Social & Contact Links */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-xs">
              <a
                href="https://www.facebook.com/nurulanambashir"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Facebook
              </a>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <a
                href="https://wa.me/8801764436846"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                WhatsApp
              </a>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Contact
              </button>
            </div>

            {/* Copyright & Motto */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-400">
              <div>
                © {new Date().getFullYear()} Notre Dame College Alumni Network. All rights reserved.
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a
                  href="http://nurulanambashir.gt.tc/?i=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors cursor-pointer"
                >
                  Designed &amp; Developed by Bashir
                </a>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span className="font-medium text-slate-400 dark:text-slate-400">
                  Diligite Lumen Sapientiae • Motijheel, Dhaka
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <VerificationExplainerModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onOpenRegister={onOpenRegister}
      />

      <QuickProfileModal
        profile={previewAlumnus}
        onClose={() => setPreviewAlumnus(null)}
        onLoginPrompt={onOpenLogin}
      />

      <BatchMembersModal
        batch={previewBatch}
        members={batchMembers}
        onClose={() => setPreviewBatch(null)}
        onSelectMember={(alumnus) => {
          setPreviewAlumnus(alumnus);
        }}
        onRegisterPrompt={onOpenRegister}
      />
    </div>
  );
};
