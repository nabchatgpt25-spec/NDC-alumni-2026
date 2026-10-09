import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ChevronRight,
  Search,
  Sparkles,
  ArrowRight,
  X,
  ArrowLeft,
  MapPin,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Phone,
  Mail,
} from 'lucide-react';
import { BATCH_LIST } from '../data/mockData';
import { BatchSummary, AlumniProfile } from '../types';
import { NDCLogo } from './NDCLogo';
import { fetchBatchesFromDb, fetchBatchAlumniProfilesFromDb } from '../services/supabaseService';

interface BatchesViewProps {
  onSelectBatch: (batchYear: number) => void;
  onViewProfile?: (profileId: number) => void;
}

function getGroupAlumniList(
  batch: BatchSummary,
  groupValue: string,
  profiles: AlumniProfile[]
): AlumniProfile[] {
  return profiles.filter(
    (p) =>
      (p.batchYear === batch.batchYear || p.batchYear - 1950 === batch.batchYear) &&
      p.group?.toLowerCase() === groupValue.toLowerCase()
  );
}

const SCIENCE_GROUPS = Array.from({ length: 17 }, (_, i) =>
  i + 1 < 10 ? `0${i + 1}` : `${i + 1}`
);
const HUMANITIES_GROUPS = ['G', 'H', 'L', 'W'];
const COMMERCE_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function computeBatchGroupCounts(batch: BatchSummary, profiles: AlumniProfile[]) {
  const realBatchProfiles = profiles.filter(
    (p) => p.batchYear === batch.batchYear || p.batchYear - 1950 === batch.batchYear
  );
  const scienceCounts: Record<string, number> = {};
  const humanitiesCounts: Record<string, number> = {};
  const commerceCounts: Record<string, number> = {};

  SCIENCE_GROUPS.forEach((code) => { scienceCounts[code] = 0; });
  HUMANITIES_GROUPS.forEach((code) => { humanitiesCounts[code] = 0; });
  COMMERCE_GROUPS.forEach((code) => { commerceCounts[code] = 0; });

  for (const profile of realBatchProfiles) {
    const groupName = (profile.group || `${profile.academicStream || ''} ${profile.academicGroup || ''}`)
      .trim()
      .toLowerCase();
    const scienceMatch = groupName.match(/^science\s+0?(\d{1,2})$/);
    const humanitiesMatch = groupName.match(/^(?:humanities|arts)\s+([ghlw])$/);
    const commerceMatch = groupName.match(/^(?:commerce|business studies)\s+([a-h])$/);

    if (scienceMatch) {
      const code = scienceMatch[1].padStart(2, '0');
      if (code in scienceCounts) scienceCounts[code] += 1;
    } else if (humanitiesMatch) {
      humanitiesCounts[humanitiesMatch[1].toUpperCase()] += 1;
    } else if (commerceMatch) {
      commerceCounts[commerceMatch[1].toUpperCase()] += 1;
    }
  }

  const scienceTotal = Object.values(scienceCounts).reduce((sum, count) => sum + count, 0);
  const humanitiesTotal = Object.values(humanitiesCounts).reduce((sum, count) => sum + count, 0);
  const commerceTotal = Object.values(commerceCounts).reduce((sum, count) => sum + count, 0);

  return {
    scienceCounts,
    humanitiesCounts,
    commerceCounts,
    artsCounts: humanitiesCounts,
    scienceTotal,
    humanitiesTotal,
    artsTotal: humanitiesTotal,
    commerceTotal,
    grandTotal: realBatchProfiles.length,
  };
}

export const BatchesView: React.FC<BatchesViewProps> = ({ onSelectBatch, onViewProfile }) => {
  const [batchesList, setBatchesList] = useState<BatchSummary[]>(BATCH_LIST);
  const [batchAlumniProfiles, setBatchAlumniProfiles] = useState<AlumniProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rangeFilter, setRangeFilter] = useState<'all' | '1-20' | '21-40' | '41-60' | '61-78'>('all');
  const [activeBatchYear, setActiveBatchYear] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [previewAlumnus, setPreviewAlumnus] = useState<AlumniProfile | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetchBatchesFromDb()
      .then((dbBatches) => {
        if (isMounted && dbBatches && dbBatches.length > 0) {
          setBatchesList((prev) => {
            const map = new Map<number, BatchSummary>();
            dbBatches.forEach((b) => map.set(b.batchYear, b));
            prev.forEach((b) => {
              if (!map.has(b.batchYear)) map.set(b.batchYear, b);
            });
            return Array.from(map.values()).sort((a, b) => b.batchYear - a.batchYear);
          });
        }
      })
      .catch((err) => {
        console.warn('BatchesView: could not load batches from Supabase:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeBatch = useMemo(() => {
    if (activeBatchYear === null) return null;
    return batchesList.find((b) => b.batchYear === activeBatchYear) || null;
  }, [activeBatchYear, batchesList]);

  React.useEffect(() => {
    let isMounted = true;
    if (activeBatchYear === null) {
      setBatchAlumniProfiles([]);
      return () => {
        isMounted = false;
      };
    }

    fetchBatchAlumniProfilesFromDb(activeBatchYear).then((profiles) => {
      if (isMounted) setBatchAlumniProfiles(profiles);
    });
    return () => {
      isMounted = false;
    };
  }, [activeBatchYear]);

  const activeBatchGroupStats = useMemo(() => {
    if (!activeBatch) return null;
    return computeBatchGroupCounts(activeBatch, batchAlumniProfiles);
  }, [activeBatch, batchAlumniProfiles]);

  const selectedGroupAlumni = useMemo(() => {
    if (!activeBatch || !activeBatchGroupStats || !selectedGroup) return [];
    const list = getGroupAlumniList(activeBatch, selectedGroup, batchAlumniProfiles);
    if (!groupSearch.trim()) return list;
    const q = groupSearch.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.collegeRoll && p.collegeRoll.toLowerCase().includes(q)) ||
        p.institution.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
    );
  }, [activeBatch, activeBatchGroupStats, selectedGroup, groupSearch, batchAlumniProfiles]);

  // Resolve direct quick-jump target batch when user types a batch number (1-78) or 4-digit HSC year (e.g. 2016)
  const quickJumpBatch = useMemo(() => {
    const q = searchTerm.trim().toLowerCase().replace(/^batch\s*/i, '').replace(/^hsc\s*/i, '');
    if (!q) return null;
    const num = Number(q);
    if (!Number.isNaN(num)) {
      // Exact batch number (1 to 78)
      if (num >= 1 && num <= 78) {
        return batchesList.find((b) => b.batchYear === num) || null;
      }
      // 4-digit HSC year (e.g., 2016 -> Batch 66, since Batch 1 is HSC 1951)
      if (num >= 1951 && num <= 1950 + 78) {
        const targetBatchNum = num - 1950;
        return batchesList.find((b) => b.batchYear === targetBatchNum) || null;
      }
      // 1949 or 1950 admission year -> Batch 1 or Batch 2
      if (num === 1949) return batchesList[0] || null;
      if (num === 1950) return batchesList[1] || null;
    }
    return null;
  }, [searchTerm, batchesList]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    const list = batchesList.filter((b) => {
      // When not searching, apply range filter; when searching, search across all 78 batches
      if (!q) {
        if (rangeFilter === '1-20' && (b.batchYear < 1 || b.batchYear > 20)) return false;
        if (rangeFilter === '21-40' && (b.batchYear < 21 || b.batchYear > 40)) return false;
        if (rangeFilter === '41-60' && (b.batchYear < 41 || b.batchYear > 60)) return false;
        if (rangeFilter === '61-78' && (b.batchYear < 61 || b.batchYear > 78)) return false;
        return true;
      }

      const batchNumStr = b.batchYear.toString();
      const batchPadded = b.batchYear < 10 ? `0${b.batchYear}` : `${b.batchYear}`;
      const startYear = String(1948 + b.batchYear);
      const sessionEndYear = String(1949 + b.batchYear);
      const hscFullYear = String(1950 + b.batchYear);
      const hscShortYear = hscFullYear.slice(-2);

      const cleanQ = q.replace(/^batch\s*/i, '').replace(/^hsc\s*/i, '');

      const matchesNum =
        batchNumStr === cleanQ ||
        batchPadded === cleanQ ||
        `batch ${batchNumStr}`.includes(q) ||
        `batch ${batchPadded}`.includes(q);

      const matchesYear =
        hscFullYear === cleanQ ||
        startYear === cleanQ ||
        sessionEndYear === cleanQ ||
        `hsc ${hscShortYear}` === q ||
        `hsc ${hscFullYear}` === q ||
        hscFullYear.includes(cleanQ);

      const matchesSession = b.session.toLowerCase().includes(q);
      const matchesRep = b.representative?.toLowerCase().includes(q);

      return matchesNum || matchesYear || matchesSession || matchesRep;
    });

    // Prioritize exact quickJumpBatch at the top of search results
    if (q && quickJumpBatch) {
      return [...list].sort((a, b) => {
        if (a.batchYear === quickJumpBatch.batchYear) return -1;
        if (b.batchYear === quickJumpBatch.batchYear) return 1;
        return a.batchYear - b.batchYear;
      });
    }

    return list;
  }, [searchTerm, rangeFilter, quickJumpBatch]);

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
              Notre Dame College Dhaka • Batches 01 – 78
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Founded: 1949 by Congregation of Holy Cross
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Generational Batch Directory (Batch 1 – 78)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Explore all 78 alumni batches classified by their Notre Dame College session and HSC year — starting from Batch 1 (1949-50), HSC 51 through Batch 78 (2026-27), HSC 28.
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2 rounded-2xl shadow-2xs self-start md:self-auto">
          <div className="px-3 py-1 text-center border-r border-slate-200 dark:border-slate-800">
            <div className="text-lg font-black text-blue-600 dark:text-blue-400">1–78</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">All Batches</div>
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

      {/* Search & Quick Jump Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input + Quick Jump Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Quick jump by HSC year (e.g., 2016) or batch number (1–78)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickJumpBatch) {
                  e.preventDefault();
                  setActiveBatchYear(quickJumpBatch.batchYear);
                  setSelectedGroup('');
                }
              }}
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {quickJumpBatch && (
            <button
              type="button"
              onClick={() => {
                setActiveBatchYear(quickJumpBatch.batchYear);
                setSelectedGroup('');
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
            >
              <span>
                Jump to Batch {quickJumpBatch.batchYear} (HSC {1950 + quickJumpBatch.batchYear})
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Range filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Batches (1–78)' },
            { id: '1-20', label: 'Batches 1–20' },
            { id: '21-40', label: 'Batches 21–40' },
            { id: '41-60', label: 'Batches 41–60' },
            { id: '61-78', label: 'Batches 61–78' },
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

      {/* Selected Batch Academic Group Breakdown (Matches Registration Form UI + Group Counts) */}
      <AnimatePresence mode="wait">
        {activeBatch && activeBatchGroupStats && (
          <motion.div
            key={activeBatch.batchYear}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border-2 border-blue-500/30 dark:border-blue-500/40 shadow-sm space-y-5"
          >
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                  {activeBatch.batchYear < 10 ? `0${activeBatch.batchYear}` : activeBatch.batchYear}
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50">
                      Batch {activeBatch.batchYear} {activeBatch.session}
                    </h2>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      • {activeBatchGroupStats.grandTotal} Total Alumni
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Academic group distribution across Science, Humanities, and Commerce. Select a group to inspect its members.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onSelectBatch(activeBatch.batchYear)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Batch Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBatchYear(null);
                    setSelectedGroup('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Academic Category Summary Cards with Staggered Slide-Up Fade Entrance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Science',
                  sub: 'Groups 01 – 17',
                  count: activeBatchGroupStats.scienceTotal,
                  accent: 'text-blue-600 dark:text-blue-400',
                  border: 'border-blue-200/70 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20',
                },
                {
                  label: 'Humanities',
                  sub: 'Groups G, H, L, W',
                  count: activeBatchGroupStats.humanitiesTotal,
                  accent: 'text-amber-600 dark:text-amber-400',
                  border: 'border-amber-200/70 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20',
                },
                {
                  label: 'Commerce',
                  sub: 'Groups A – H',
                  count: activeBatchGroupStats.commerceTotal,
                  accent: 'text-emerald-600 dark:text-emerald-400',
                  border: 'border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20',
                },
              ].map((cat, idx) => (
                <motion.div
                  key={cat.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.32,
                    delay: 0.06 + idx * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`rounded-2xl p-3.5 border flex items-center justify-between ${cat.border}`}
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {cat.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {cat.sub}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-black leading-none ${cat.accent}`}>
                      {cat.count}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-1">
                      Alumni
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Academic Groups Container — Same layout as Registration Form */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 p-4 space-y-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Your Group
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select the group you belonged to at Notre Dame.
                  </p>
                </div>
                {selectedGroup && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                      {selectedGroup.startsWith('Science ')
                        ? `${selectedGroup} • ${activeBatchGroupStats.scienceCounts[selectedGroup.replace('Science ', '')]} Alumni`
                        : selectedGroup.startsWith('Humanities ') || selectedGroup.startsWith('Arts ')
                          ? `${selectedGroup.replace('Arts ', 'Humanities ')} • ${activeBatchGroupStats.humanitiesCounts[selectedGroup.replace('Humanities ', '').replace('Arts ', '')]} Alumni`
                          : `${selectedGroup} • ${activeBatchGroupStats.commerceCounts[selectedGroup.replace('Commerce ', '').replace('Business Studies ', '')]} Alumni`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedGroup('')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3.5">
                {/* Science: 01–17 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Science
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {activeBatchGroupStats.scienceTotal} in Science
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SCIENCE_GROUPS.map((code) => {
                      const value = `Science ${code}`;
                      const count = activeBatchGroupStats.scienceCounts[code] || 0;
                      const isSelected = selectedGroup === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelectedGroup(isSelected ? '' : value)}
                          className={`min-w-[3.25rem] px-2.5 py-1.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-400'
                          }`}
                        >
                          <span className="text-[11px] font-extrabold leading-tight">{code}</span>
                          <span
                            className={`text-[9px] font-semibold leading-tight mt-0.5 ${
                              isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-400'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Humanities & Commerce side-by-side on desktop, stacked on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  {/* Humanities: G, H, L, W */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Humanities
                      </span>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        {activeBatchGroupStats.humanitiesTotal} in Humanities
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {HUMANITIES_GROUPS.map((code) => {
                        const value = `Humanities ${code}`;
                        const count = activeBatchGroupStats.humanitiesCounts[code] || 0;
                        const isSelected = selectedGroup === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSelectedGroup(isSelected ? '' : value)}
                            className={`min-w-[2.75rem] px-2.5 py-1.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-400'
                            }`}
                          >
                            <span className="text-[11px] font-extrabold leading-tight">{code}</span>
                            <span
                              className={`text-[9px] font-semibold leading-tight mt-0.5 ${
                                isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commerce: A–H */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Commerce
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {activeBatchGroupStats.commerceTotal} in Commerce
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMERCE_GROUPS.map((code) => {
                        const value = `Commerce ${code}`;
                        const count = activeBatchGroupStats.commerceCounts[code] || 0;
                        const isSelected = selectedGroup === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSelectedGroup(isSelected ? '' : value)}
                            className={`min-w-[2.75rem] px-2.5 py-1.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-400'
                            }`}
                          >
                            <span className="text-[11px] font-extrabold leading-tight">{code}</span>
                            <span
                              className={`text-[9px] font-semibold leading-tight mt-0.5 ${
                                isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Alumni List for Selected Group */}
            <AnimatePresence mode="wait">
              {selectedGroup && (
                <motion.div
                  key={selectedGroup}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.28 }}
                  className="pt-2 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 dark:bg-blue-950/25 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                          Batch {activeBatch.batchYear} • {selectedGroup} Alumni
                        </span>
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                          ({selectedGroupAlumni.length} Members)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Showing all alumni members from {selectedGroup} in Batch {activeBatch.batchYear} {activeBatch.session}.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={`Search in ${selectedGroup} (name, roll, org)...`}
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                      {groupSearch && (
                        <button
                          type="button"
                          onClick={() => setGroupSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alumni Cards Grid */}
                  {selectedGroupAlumni.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                      <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        No registered alumni in this section yet
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Notredamians from Batch {activeBatch.batchYear} ({selectedGroup}) will appear here as they register on the portal.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
                      {selectedGroupAlumni.map((alumnus) => (
                        <div
                          key={alumnus.id}
                          onClick={() => {
                            if (alumnus.id < 900000 && onViewProfile) {
                              onViewProfile(alumnus.id);
                            } else {
                              setPreviewAlumnus(alumnus);
                            }
                          }}
                          className="group bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-start gap-3"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={alumnus.avatarUrl}
                              alt={alumnus.fullName}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                            {alumnus.online && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {alumnus.fullName}
                              </h5>
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                              <span>Roll: {alumnus.collegeRoll || 'N/A'}</span>
                              <span>•</span>
                              <span>{alumnus.group}</span>
                            </div>

                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate mt-1">
                              {alumnus.position}
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              <span className="truncate">{alumnus.institution}</span>
                              <span className="shrink-0">
                                {alumnus.city}, {alumnus.country}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alumnus Detail Preview Modal */}
      <AnimatePresence>
        {previewAlumnus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewAlumnus(null)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <img
                    src={previewAlumnus.avatarUrl}
                    alt={previewAlumnus.fullName}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        {previewAlumnus.fullName}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      Batch {previewAlumnus.batchYear} {previewAlumnus.session} • {previewAlumnus.group}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      College Roll: {previewAlumnus.collegeRoll}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewAlumnus(null)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                {previewAlumnus.bio}
              </p>

              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    <strong>{previewAlumnus.position}</strong> at {previewAlumnus.institution}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Degrees: {previewAlumnus.degree.join(', ')} • {previewAlumnus.specialty.join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    {previewAlumnus.city}, {previewAlumnus.country}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {previewAlumnus.phone && (
                  <a
                    href={`tel:${previewAlumnus.phone}`}
                    className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Alumnus</span>
                  </a>
                )}
                {previewAlumnus.email && (
                  <a
                    href={`mailto:${previewAlumnus.email}`}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            const hasRegisteredAlumni = batch.total !== null && batch.total > 0;
            const isSelectedBatch = activeBatchYear === batch.batchYear;

            return (
              <div
                key={batch.batchYear}
                onClick={() => {
                  setActiveBatchYear(batch.batchYear);
                  setSelectedGroup('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                  isSelectedBatch
                    ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/20'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
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
                  <div className="flex items-center flex-wrap gap-1.5">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Batch {batch.batchYear} {batch.session}
                    </h3>
                    {batch.batchYear === 1 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                        1st Pioneer
                      </span>
                    )}
                    {batch.batchYear === 78 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        Latest
                      </span>
                    )}
                  </div>

                  {/* Registered count */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{batch.total === null ? 'Count unavailable' : `${batch.total} Registered Alumni`}</span>
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
                      <span>Registered alumni available</span>
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
