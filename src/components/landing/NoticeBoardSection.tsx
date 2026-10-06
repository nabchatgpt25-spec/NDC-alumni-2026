import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Download,
  ExternalLink,
  Clock,
  MapPin,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Tag,
  CheckCircle2,
  Users
} from 'lucide-react';
import { OFFICIAL_NOTICES, OfficialNotice } from '../../data/noticesData';
import { fetchOfficialNoticesFromDb } from '../../services/supabaseService';

interface NoticeBoardSectionProps {
  onSelectNotice: (notice: OfficialNotice) => void;
  onOpenRegister: () => void;
}

export const NoticeBoardSection: React.FC<NoticeBoardSectionProps> = ({
  onSelectNotice,
  onOpenRegister,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [notices, setNotices] = useState<OfficialNotice[]>(OFFICIAL_NOTICES);

  React.useEffect(() => {
    let isMounted = true;
    fetchOfficialNoticesFromDb()
      .then((dbNotices) => {
        if (isMounted && dbNotices && dbNotices.length > 0) {
          setNotices(dbNotices);
        }
      })
      .catch((err) => {
        console.warn('NoticeBoardSection: Supabase live fetch fallback:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = ['All', 'Reunion', 'Membership', 'Scholarship', 'AGM', 'General'];

  const filteredNotices = selectedCategory === 'All'
    ? notices
    : notices.filter((n) => n.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <section id="notice-board-section" className="py-16 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>OFFICIAL SECRETARIAT DISPATCHES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Notice Board & Event Circulars
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Official announcements, executive resolutions, and upcoming alumni gatherings.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dual-Column Split: Notice Board (Left) & Upcoming Events (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Official Notice Table (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/40 dark:shadow-black/40 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Secretariat Circulars ({filteredNotices.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Updated Daily
              </span>
            </div>

            <div className="space-y-3.5">
              {filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => onSelectNotice(notice)}
                  className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer flex items-start gap-3.5"
                >
                  {/* Calendar / Date Icon Box */}
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center shrink-0 font-bold">
                    <span className="text-[9px] uppercase tracking-tighter text-blue-500 dark:text-blue-400">
                      {new Date(notice.publishedDate).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-base font-black leading-none">
                      {new Date(notice.publishedDate).getDate()}
                    </span>
                  </div>

                  {/* Notice Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                        {notice.refNo}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {notice.category}
                      </span>
                      {notice.isUrgent && (
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Urgent
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {notice.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {notice.summary}
                    </p>
                  </div>

                  {/* Arrow Icon */}
                  <div className="p-2 rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Secretariat Info Note */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>All circulars issued under authority of General Secretary, NDCAA</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                Archived Circulars (1985–2025)
              </span>
            </div>
          </div>

          {/* Right Column: Featured Events & Reunion Calendar (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Featured Event Card: Grand Reunion 2026 */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 text-white p-6 sm:p-7 border border-blue-800 shadow-xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-3">
                  <Sparkles className="w-3 h-3" />
                  <span>SIGNATURE GATHERING</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  75th Platinum Jubilee Grand Reunion 2026
                </h3>

                <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                  Join 15,000+ Notredamians for 3 days of nostalgic celebrations, honorary citations, musical banquet, and batch pavilions.
                </p>

                {/* Event Key Specs */}
                <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-semibold text-blue-100">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-blue-300 uppercase">Dates</div>
                      <div className="font-bold">Dec 18–20, 2026</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-blue-300 uppercase">Venue</div>
                      <div className="font-bold">NDC Main Field</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-center"
                  >
                    Register for Reunion
                  </button>
                  <a
                    href="#agenda"
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/10 transition-all text-center"
                  >
                    View Agenda
                  </a>
                </div>
              </div>
            </div>

            {/* Upcoming Calendar List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/40 dark:shadow-black/40">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Upcoming Institutional Events</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      32nd Annual General Meeting (AGM)
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Nov 28, 2026</span>
                      <span>•</span>
                      <span>Fr. Peixotto Auditorium</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    Official
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      NDC Science Club 70th Reunion
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Oct 15, 2026</span>
                      <span>•</span>
                      <span>Ganguly Building Labs</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    Club
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      Inter-Batch Winter Sports Carnival
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Dec 04–06, 2026</span>
                      <span>•</span>
                      <span>College Sports Pavilion</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                    Sports
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
