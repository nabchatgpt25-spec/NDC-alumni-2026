import React from 'react';
import {
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Building2,
  Users,
  Compass,
  Sparkles,
  BookOpen
} from 'lucide-react';

export const PillarsSection: React.FC = () => {
  const pillars = [
    {
      icon: GraduationCap,
      title: 'Professional Mentorship & Career Guidance',
      description:
        'Industry guidance, university admissions (BUET, IBA, Ivy League), and global tech and executive referrals from senior Notredamians.',
      color: 'blue',
      badge: 'Excellence & Growth',
    },
    {
      icon: BookOpen,
      title: 'Academic & Scientific Inquiry',
      description:
        'Upholding the proud legacy of Holy Cross education, NDSC scientific enquiry, debates, innovation, and research across global disciplines.',
      color: 'indigo',
      badge: 'Lumen Sapientiae',
    },
    {
      icon: HeartHandshake,
      title: '24/7 Brotherhood & Mutual Aid',
      description:
        'Rapid emergency blood donor network, mutual assistance, and compassionate welfare support for alumni and families in need.',
      color: 'rose',
      badge: 'Fraternal Bond',
    },
    {
      icon: Building2,
      title: 'Campus Heritage & Batch Rosters',
      description:
        'Preserving over 75 years of college history from Batch 01 (1949), yearbooks, club milestones, and lifelong batch camaraderie.',
      color: 'emerald',
      badge: 'Generational Pride',
    },
  ];

  return (
    <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
          <Compass className="w-3.5 h-3.5" />
          <span>Our Guiding Principles</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Four Pillars of the Notredamian Fraternity
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 font-normal">
          Rooted in the timeless motto <span className="font-semibold text-blue-600 dark:text-blue-400 italic">Diligite Lumen Sapientiae</span> — empowering every graduate to lead with integrity, competence, and service.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-blue-500/80 dark:hover:border-blue-500/80 hover:shadow-lg transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {pillar.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {pillar.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Active Network Program</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
