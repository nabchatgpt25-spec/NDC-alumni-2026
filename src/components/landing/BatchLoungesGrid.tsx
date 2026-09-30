import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  MessageSquare,
  Lock,
  ArrowRight,
  Sparkles,
  GraduationCap,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BatchSummary } from '../../types';

interface BatchLoungesGridProps {
  batches: BatchSummary[];
  onSelectBatch: (batch: BatchSummary) => void;
  onOpenRegister: () => void;
}

type EraFilter = 'all' | 'recent' | '2010s' | '2000s' | '90s' | 'pioneers';

const INITIAL_VISIBLE_BATCHES = 8;

export const BatchLoungesGrid: React.FC<BatchLoungesGridProps> = ({
  batches,
  onSelectBatch,
  onOpenRegister,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEra, setActiveEra] = useState<EraFilter>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Search matching
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        `batch ${b.batchYear}`.includes(q) ||
        `${b.batchYear}`.includes(q) ||
        b.session.toLowerCase().includes(q) ||
        b.representative?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Era filter
      if (activeEra === 'recent') return b.batchYear >= 68; // HSC 2018+
      if (activeEra === '2010s') return b.batchYear >= 61 && b.batchYear <= 67; // 2010 - 2017
      if (activeEra === '2000s') return b.batchYear >= 51 && b.batchYear <= 60; // 2000 - 2009
      if (activeEra === '90s') return b.batchYear >= 41 && b.batchYear <= 50; // 1990 - 1999
      if (activeEra === 'pioneers') return b.batchYear <= 40; // 1949 - 1989

      return true;
    });
  }, [batches, searchQuery, activeEra]);

  const isSearching = searchQuery.trim().length > 0;
  const visibleBatches = useMemo(() => {
    if (isSearching || isExpanded) {
      return filteredBatches;
    }
    return filteredBatches.slice(0, INITIAL_VISIBLE_BATCHES);
  }, [filteredBatches, isSearching, isExpanded]);

  const hasMore = !isSearching && filteredBatches.length > INITIAL_VISIBLE_BATCHES;
  const remainingCount = filteredBatches.length - INITIAL_VISIBLE_BATCHES;

  return (
    <section id="batches-section" className="py-5 sm:py-8 lg:py-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2.5 sm:gap-3 mb-3.5 sm:mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1">
              <Users className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>PRIVATE BATCH LOUNGES (01–76)</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Find Your Batch Circle
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
              Every graduating class (1949–2026) has a dedicated private lounge. Reconnect with section buddies and arrange reunions.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="w-full md:w-64 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search batch (e.g. 68 or 2018)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Era Filters with mobile horizontal swipe */}
        <div className="flex items-center gap-1.5 mb-3.5 sm:mb-5 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar sm:flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Era:</span>
          {[
            { id: 'all', label: 'All 76 Batches' },
            { id: 'recent', label: 'Recent (HSC 2018–26)' },
            { id: '2010s', label: '2010s Cohort' },
            { id: '2000s', label: '2000s Cohort' },
            { id: '90s', label: '1990s Cohort' },
            { id: 'pioneers', label: 'Pioneer Decades' },
          ].map((era) => (
            <button
              key={era.id}
              type="button"
              onClick={() => {
                setActiveEra(era.id as EraFilter);
                setIsExpanded(false);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeEra === era.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {era.label}
            </button>
          ))}
        </div>

        {/* Batches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleBatches.map((batch) => {
            return (
              <div
                key={batch.batchYear}
                onClick={() => onSelectBatch(batch)}
                className="group p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer hover:shadow-sm hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      Batch {batch.batchYear < 10 ? `0${batch.batchYear}` : batch.batchYear}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>Private</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {batch.session}
                  </h3>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    Rep: <span className="font-medium text-slate-700 dark:text-slate-300">{batch.representative || 'Council in Formation'}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                    <Users className="w-3 h-3 text-blue-500" />
                    <span>{batch.total}+ Brothers</span>
                  </div>

                  <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-xs">
                    <span>Enter</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* See More / Show Less Toggle Button */}
        {hasMore && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
            >
              <span>{isExpanded ? 'Show Fewer Batches' : `See More Batches (${remainingCount} more)`}</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
            <span className="text-[11px] text-slate-400">
              Showing {visibleBatches.length} of {filteredBatches.length} batches
            </span>
          </div>
        )}

        {isExpanded && !isSearching && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                const el = document.getElementById('batches-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Collapse back to compact view</span>
            </button>
          </div>
        )}

        {filteredBatches.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            No batch found matching "<span className="font-bold">{searchQuery}</span>".
          </div>
        )}
      </div>
    </section>
  );
};
