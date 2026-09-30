import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  ArrowRight,
  Sparkles,
  Calendar,
  UserCheck
} from 'lucide-react';
import { BatchSummary } from '../../types';

interface BatchExplorerSectionProps {
  batches: BatchSummary[];
  onSelectBatch: (batch: BatchSummary) => void;
}

type EraFilter = 'all' | 'pioneer' | 'golden' | 'silver' | 'recent';

export const BatchExplorerSection: React.FC<BatchExplorerSectionProps> = ({
  batches,
  onSelectBatch,
}) => {
  const [selectedEra, setSelectedEra] = useState<EraFilter>('all');

  const filteredBatches = useMemo(() => {
    switch (selectedEra) {
      case 'pioneer':
        return batches.filter((b) => b.batchYear >= 1 && b.batchYear <= 10);
      case 'golden':
        return batches.filter((b) => b.batchYear >= 11 && b.batchYear <= 20);
      case 'silver':
        return batches.filter((b) => b.batchYear >= 21 && b.batchYear <= 30);
      case 'recent':
        return batches.filter((b) => b.batchYear >= 31);
      case 'all':
      default:
        return batches;
    }
  }, [selectedEra, batches]);

  return (
    <section id="batches-section" className="py-16 sm:py-20 bg-slate-100/70 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Notre Dame Generational Roster</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Find Your Batch & Batchmates
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              Every Notre Dame session has a proud story. Click on your batch to view alumni, batch coordinators, and reconnect with your fellow Notredamians.
            </p>
          </div>

          {/* Era Navigation Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 self-start md:self-auto shadow-xs">
            {[
              { id: 'all', label: 'All 35 Batches' },
              { id: 'pioneer', label: 'Pioneers (01–10)' },
              { id: 'golden', label: 'Golden Era (11–20)' },
              { id: 'silver', label: 'Silver (21–30)' },
              { id: 'recent', label: 'Recent & Interns (31–35)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedEra(tab.id as EraFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedEra === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredBatches.map((b) => (
            <div
              key={b.batchYear}
              onClick={() => onSelectBatch(b)}
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 p-4 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                    {b.batchYear < 10 ? `0${b.batchYear}` : b.batchYear}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {b.session}
                  </span>
                </div>

                <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Batch {b.batchYear < 10 ? `0${b.batchYear}` : b.batchYear}
                </h3>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                  Rep: <span className="font-semibold text-slate-700 dark:text-slate-300">{b.representative}</span>
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>{b.total} Alumni</span>
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  Explore →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
