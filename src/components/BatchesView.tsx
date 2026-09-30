import React, { useState, useMemo } from 'react';
import { Users, ChevronRight, Search, Sparkles, Award } from 'lucide-react';
import { BATCH_LIST, ALUMNI_PROFILES } from '../data/mockData';
import { NDCLogo } from './NDCLogo';

interface BatchesViewProps {
  onSelectBatch: (batchYear: number) => void;
}

export const BatchesView: React.FC<BatchesViewProps> = ({ onSelectBatch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [rangeFilter, setRangeFilter] = useState<'all' | '1-40' | '41-60' | '61-70' | '71-76'>('all');

  // Filter batches
  const filteredBatches = useMemo(() => {
    return BATCH_LIST.filter((b) => {
      // Range filter
      if (rangeFilter === '1-40' && (b.batchYear < 1 || b.batchYear > 40)) return false;
      if (rangeFilter === '41-60' && (b.batchYear < 41 || b.batchYear > 60)) return false;
      if (rangeFilter === '61-70' && (b.batchYear < 61 || b.batchYear > 70)) return false;
      if (rangeFilter === '71-76' && (b.batchYear < 71 || b.batchYear > 76)) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const batchNumStr = b.batchYear.toString();
        const batchPadded = b.batchYear < 10 ? `0${b.batchYear}` : `${b.batchYear}`;
        const matchesNum = batchNumStr === q || batchPadded === q || `batch ${batchNumStr}`.includes(q);
        const matchesSession = b.session.toLowerCase().includes(q);
        const matchesRep = b.representative?.toLowerCase().includes(q);
        return matchesNum || matchesSession || matchesRep;
      }
      return true;
    });
  }, [searchTerm, rangeFilter]);

  const totalRegistered = useMemo(() => {
    return BATCH_LIST.reduce((acc, curr) => acc + curr.total, 0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <NDCLogo className="w-5 h-5" />
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              Notre Dame College Dhaka • 75+ Batches
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Founded: 1949 by Congregation of Holy Cross
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Generational Batch Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Explore alumni members classified by their Notre Dame College batch and HSC session — from the pioneer Batch 01 (1949-51) to recent batches.
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2 rounded-2xl shadow-2xs self-start md:self-auto">
          <div className="px-3 py-1 text-center border-r border-slate-200 dark:border-slate-800">
            <div className="text-lg font-black text-blue-600 dark:text-blue-400">75+</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Batches</div>
          </div>
          <div className="px-3 py-1 text-center border-r border-slate-200 dark:border-slate-800">
            <div className="text-lg font-black text-amber-600 dark:text-amber-400">1949</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Founded</div>
          </div>
          <div className="px-3 py-1 text-center">
            <div className="text-lg font-black text-slate-900 dark:text-slate-100">{totalRegistered.toLocaleString()}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Alumni</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search batch (e.g., 68, 2018, or name)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Range filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Batches' },
            { id: '1-40', label: 'Batches 1-40' },
            { id: '41-60', label: 'Batches 41-60' },
            { id: '61-70', label: 'Batches 61-70' },
            { id: '71-76', label: 'Batches 71-76' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRangeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                rangeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Grid */}
      {filteredBatches.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            No batch found matching "{searchTerm}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setRangeFilter('all');
            }}
            className="mt-3 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Reset search and filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBatches.map((batch) => {
            const hasRegisteredAlumni = ALUMNI_PROFILES.some((p) => p.batchYear === batch.batchYear);

            return (
              <div
                key={batch.batchYear}
                onClick={() => onSelectBatch(batch.batchYear)}
                className="group bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top row with batch number badge and session year */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                      {batch.batchYear < 10 ? `0${batch.batchYear}` : batch.batchYear}
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {batch.session}
                    </span>
                  </div>

                  {/* Batch Title */}
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Batch {batch.batchYear}
                    </h3>
                    {batch.batchYear === 1 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                        1st Pioneer
                      </span>
                    )}
                    {batch.batchYear === 35 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        Latest
                      </span>
                    )}
                  </div>

                  {/* Registered count */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{batch.total} Registered Alumni</span>
                  </div>

                  {/* Representative */}
                  {batch.representative && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
                      <span className="text-slate-400">Rep: </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {batch.representative}
                      </span>
                    </div>
                  )}

                  {/* Sample members hint if available */}
                  {hasRegisteredAlumni && (
                    <div className="mt-2.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-3 h-3" />
                      <span>Verified profiles available</span>
                    </div>
                  )}
                </div>

                {/* Bottom link */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>View Batch Alumni</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
