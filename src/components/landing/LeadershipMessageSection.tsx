import React from 'react';
import { Quote, Award, ShieldCheck, HeartHandshake } from 'lucide-react';
import { NDCLogo } from '../NDCLogo';

export const LeadershipMessageSection: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>INSTITUTIONAL LEADERSHIP CORNER</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Messages from the College Patron & Alumni President
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Guided by the enduring Holy Cross tradition of excellence, moral courage, and fraternal care since 1949.
          </p>
        </div>

        {/* Dual Leadership Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Principal & Chief Patron */}
          <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40 flex flex-col justify-between">
            <div className="absolute top-6 right-6 text-blue-100 dark:text-slate-800 pointer-events-none">
              <Quote className="w-16 h-16 opacity-40" />
            </div>

            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-blue-500/20 shadow-md shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {/* Portrait Placeholder with NDC Emblem */}
                  <img
                    src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=250&q=80"
                    alt="Rev. Fr. Dr. Hemanto Rozario, CSC"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-blue-700 p-0.5 border border-white dark:border-slate-900 flex items-center justify-center">
                    <NDCLogo className="w-full h-full" />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    CHIEF PATRON & PRINCIPAL
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                    Rev. Fr. Dr. Hemanto Rozario, CSC
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Principal, Notre Dame College, Dhaka
                  </p>
                </div>
              </div>

              <div className="relative z-10 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                <p>
                  "Notre Dame College was founded not merely to confer academic credentials, but to cultivate complete human beings enlightened by wisdom and love: <em>Diligite Lumen Sapientiae</em>."
                </p>
                <p>
                  "Our alumni represent our greatest glory. Wherever you serve—in engineering centers, scientific laboratories, judiciary, or public service—you carry the spirit of Fr. Peixotto and Fr. Timm. We welcome all former students to stay firmly rooted in our college family and support the next generation through the Fr. Timm Scholarship Fund."
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Office of the Principal, NDC Campus</span>
              </div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                Holy Cross Congregation
              </span>
            </div>
          </div>

          {/* Card 2: Alumni President */}
          <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40 flex flex-col justify-between">
            <div className="absolute top-6 right-6 text-blue-100 dark:text-slate-800 pointer-events-none">
              <Quote className="w-16 h-16 opacity-40" />
            </div>

            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-blue-500/20 shadow-md shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80"
                    alt="Engr. Masud Karim, Batch 74"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-amber-500 p-0.5 border border-white dark:border-slate-900 flex items-center justify-center">
                    <NDCLogo className="w-full h-full" />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    PRESIDENT, CENTRAL COMMITTEE
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                    Engr. Masud Karim, PEng
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    NDC Batch 74 • Managing Director, Spectra Group
                  </p>
                </div>
              </div>

              <div className="relative z-10 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                <p>
                  "Dearest Brothers, whether you walked the Motijheel corridors in 1955 or in 2024, our fraternity remains unbreakable. The Notre Dame College Alumni Association is your bridge to lifelong friendship, mutual assistance, and shared purpose."
                </p>
                <p>
                  "We have formalized the digital membership system to give every Notredamian a verifiable digital identity and access to benevolent support. I urge all alumni across the globe to register for our upcoming Grand Reunion 2026 and contribute generously to our emergency welfare and scholarship corpus."
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <HeartHandshake className="w-4 h-4 text-blue-600" />
                <span>Central Executive Committee, NDCAA</span>
              </div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                Fraternity • Service • Honor
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
