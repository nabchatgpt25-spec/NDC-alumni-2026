import React from 'react';
import {
  X,
  MapPin,
  Building2,
  GraduationCap,
  Award,
  Briefcase,
  ShieldCheck,
  Globe,
  Share2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { AlumniProfile } from '../../types';
import { WhatsAppIcon, FacebookIcon } from '../SocialIcons';

interface QuickProfileModalProps {
  profile: AlumniProfile | null;
  onClose: () => void;
  onLoginPrompt: () => void;
}

export const QuickProfileModal: React.FC<QuickProfileModalProps> = ({
  profile,
  onClose,
  onLoginPrompt,
}) => {
  if (!profile) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile.fullName} - Notre Dame Alumni`,
        text: `Check out ${profile.fullName} (Batch ${profile.batchYear}) on the Notre Dame Alumni Portal!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Profile link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover & Close Button */}
        <div className="relative h-36 sm:h-44 w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 overflow-hidden flex-shrink-0">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-700" />
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            className="absolute top-4 right-15 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer z-10"
            title="Share profile"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Batch Pill in Cover */}
          <div className="absolute bottom-3 right-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 border border-white/20">
            <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
            <span>NDC Batch {profile.batchYear < 10 ? `0${profile.batchYear}` : profile.batchYear}</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Avatar and Basic Header */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-20 relative z-10">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 dark:bg-slate-800"
              />
              <span
                className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs"
                title="Verified Active Alumnus"
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {profile.fullName}
                </h3>
                <span title="Verified Notredamian Alumnus">
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                </span>
              </div>

              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {profile.position || 'Professional'}
              </p>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                {profile.institution && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{profile.institution}</span>
                  </span>
                )}
                {(profile.city || profile.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badges / BCS Cadre */}
          {(profile.cadre || (profile.badges && profile.badges.length > 0)) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.cadre && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                  <Award className="w-3.5 h-3.5" />
                  <span>{profile.cadre}</span>
                </span>
              )}
              {profile.badges?.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800"
                >
                  <span>★ {b}</span>
                </span>
              ))}
            </div>
          )}

          {/* Degrees & Qualifications */}
          {profile.degree && profile.degree.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Qualifications & Degrees</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.degree.map((deg) => (
                  <span
                    key={deg}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  >
                    {deg}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Professional Specialties */}
          {profile.specialty && profile.specialty.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Specialties & Areas of Expertise</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.specialty.map((spec) => (
                  <span
                    key={spec}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-100 dark:border-indigo-900"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                About Alumnus
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Career Milestones */}
          {profile.careerHistory && profile.careerHistory.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Career History
              </h4>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {profile.careerHistory.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <span>Verified Notre Dame Alumni Member</span> • <span>Batch {profile.batchYear}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onLoginPrompt();
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Login to Connect / Message</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
