import React from 'react';
import { Lock } from 'lucide-react';
import {
  MagneticWrap,
  ScrollReveal,
  Tilt3DCard,
} from '../motion/CinematicMotion';
import campusArtworkImg from '../../assets/images/ndc_campus_artwork_1790748644859.jpg';

interface QuadFeedPreviewProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const QuadFeedPreview: React.FC<QuadFeedPreviewProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  return (
    <div className="py-4 sm:py-7 lg:py-8 max-w-7xl mx-auto px-4 sm:px-6">
      <ScrollReveal>
        {/* Lock Banner / Call To Action to Enter The Quad */}
        <Tilt3DCard
          maxTilt={2}
          className="group relative rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-6 lg:p-8 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 shadow-xl border border-blue-800/50"
        >
          {/* Subtle real Notre Dame campus artwork depth layer */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-luminosity group-hover:scale-105 transition-transform duration-700"
            style={{ backgroundImage: `url(${campusArtworkImg})` }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl"
          />

          <div className="max-w-xl text-center md:text-left relative z-20">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-2 border border-blue-400/20">
              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
              <span>PRIVATE &amp; PROTECTED COMMUNITY</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              35,000+ Classmates Are Discussing Inside
            </h3>
            <p className="text-[11px] sm:text-sm text-blue-100/80 leading-relaxed mt-1">
              Join your batch wall, message classmates, connect with senior alumni and global tech leaders, and never lose touch with your Alma Mater.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto relative z-20">
            <MagneticWrap className="w-full sm:w-auto flex">
              <button
                type="button"
                onClick={onOpenRegister}
                className="btn-interactive w-full px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all text-center cursor-pointer"
              >
                Sign Up &amp; Join Feed
              </button>
            </MagneticWrap>
            <MagneticWrap className="w-full sm:w-auto flex">
              <button
                type="button"
                onClick={onOpenLogin}
                className="btn-interactive w-full px-5 py-2.5 sm:px-6 sm:py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 transition-all text-center cursor-pointer"
              >
                Member Sign In
              </button>
            </MagneticWrap>
          </div>
        </Tilt3DCard>
      </ScrollReveal>
    </div>
  );
};

