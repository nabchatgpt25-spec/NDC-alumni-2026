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
  Trophy,
  LayoutGrid,
  BarChart3,
} from 'lucide-react';
import { BATCH_LIST, loadStoredAlumniProfiles } from '../data/mockData';
import { BatchSummary, AlumniProfile, PostItem } from '../types';
import { NDCLogo } from './NDCLogo';
import {
  fetchBatchesFromDb,
  fetchBatchAlumniProfilesFromDb,
  fetchAlumniProfilesFromDb,
  fetchFeedPostsFromDb,
} from '../services/supabaseService';
import { BatchLeaderboard } from './BatchLeaderboard';

interface BatchesViewProps {
  onSelectBatch: (batchYear: number) => void;
  onViewProfile?: (profileId: number) => void;
}

export function normalizeGroupInfo(input?: string | null): {
  stream?: 'Science' | 'Humanities' | 'Commerce';
  code?: string;
  normalizedCode?: string;
} {
  if (!input) return {};
  const s = input.trim();
  const lower = s.toLowerCase();

  let stream: 'Science' | 'Humanities' | 'Commerce' | undefined;
  if (lower.includes('science')) stream = 'Science';
  else if (lower.includes('humanities') || lower.includes('arts')) stream = 'Humanities';
  else if (lower.includes('commerce') || lower.includes('business')) stream = 'Commerce';

  // Extract digits for Science (e.g. "01", "1", "17")
  const digitMatch = s.match(/(?:group\s*|section\s*|science\s*|^)0?(\d{1,2})/i);
  if (digitMatch) {
    const rawNum = parseInt(digitMatch[1], 10);
    if (rawNum >= 1 && rawNum <= 17) {
      const padded = rawNum < 10 ? `0${rawNum}` : `${rawNum}`;
      return {
        stream: stream || 'Science',
        code: `${rawNum}`,
        normalizedCode: padded,
      };
    }
  }

  // Extract letter for Humanities (G, H, L, W) or Commerce (A - H)
  const letterMatch = s.match(/(?:group\s*|section\s*|^)([a-zA-Z])(?:\b|$)/i);
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase();
    if (['G', 'H', 'L', 'W'].includes(letter) && (stream === 'Humanities' || !stream)) {
      return {
        stream: 'Humanities',
        code: letter,
        normalizedCode: letter,
      };
    }
    if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(letter) && (stream === 'Commerce' || !stream)) {
      return {
        stream: 'Commerce',
        code: letter,
        normalizedCode: letter,
      };
    }
    return {
      stream,
      code: letter,
      normalizedCode: letter,
    };
  }

  return { stream };
}

function matchesAcademicGroup(profile: AlumniProfile, groupValue: string): boolean {
  if (!groupValue || groupValue.trim() === '' || groupValue.toLowerCase() === 'all') return true;

  const target = normalizeGroupInfo(groupValue);
  const targetRaw = groupValue.toLowerCase().trim();

  // 1. Gather all group representations from profile
  const profileStream =
    profile.academicStream ||
    (profile.group?.toLowerCase().includes('science')
      ? 'Science'
      : profile.group?.toLowerCase().includes('humanities') || profile.group?.toLowerCase().includes('arts')
        ? 'Humanities'
        : profile.group?.toLowerCase().includes('commerce') || profile.group?.toLowerCase().includes('business')
          ? 'Commerce'
          : undefined);

  const acadGrp = (profile.academicGroup || '').trim();
  const section = (profile.section || '').trim();
  const grp = (profile.group || '').trim();

  const profFromAcad = normalizeGroupInfo(acadGrp);
  const profFromSec = normalizeGroupInfo(section);
  const profFromGrp = normalizeGroupInfo(grp);

  const candidateCodes = new Set<string>();
  if (target.normalizedCode) candidateCodes.add(target.normalizedCode.toLowerCase());
  if (target.code) candidateCodes.add(target.code.toLowerCase());

  // Check stream compatibility if target specifies stream
  if (target.stream) {
    const profStream = profileStream || profFromAcad.stream || profFromSec.stream || profFromGrp.stream;
    if (profStream && profStream.toLowerCase() !== target.stream.toLowerCase()) {
      return false;
    }
  }

  // Check code match
  const profileCodes = [
    acadGrp.toLowerCase(),
    acadGrp.replace(/^0+/, '').toLowerCase(),
    profFromAcad.normalizedCode?.toLowerCase(),
    profFromAcad.code?.toLowerCase(),
    profFromSec.normalizedCode?.toLowerCase(),
    profFromSec.code?.toLowerCase(),
    profFromGrp.normalizedCode?.toLowerCase(),
    profFromGrp.code?.toLowerCase(),
  ].filter(Boolean) as string[];

  for (const pc of profileCodes) {
    if (candidateCodes.has(pc)) return true;
  }

  // Fallback string containment checks
  if (grp.toLowerCase().includes(targetRaw)) return true;
  if (section.toLowerCase().includes(targetRaw)) return true;
  if (target.normalizedCode) {
    const padded = target.normalizedCode.toLowerCase();
    const rawNum = target.code?.toLowerCase() || padded;
    if (
      grp.toLowerCase().includes(`group ${padded}`) ||
      grp.toLowerCase().includes(`group ${rawNum}`) ||
      section.toLowerCase().includes(`group ${padded}`) ||
      section.toLowerCase().includes(`group ${rawNum}`) ||
      section.toLowerCase().includes(`section ${padded}`) ||
      section.toLowerCase().includes(`section ${rawNum}`)
    ) {
      return true;
    }
  }

  return false;
}

function getGroupAlumniList(
  batch: BatchSummary,
  groupValue: string,
  profiles: AlumniProfile[]
): AlumniProfile[] {
  return profiles.filter((p) => {
    const isBatchMatch = p.batchYear === batch.batchYear;
    if (!isBatchMatch) return false;
    if (!groupValue || groupValue.trim() === '' || groupValue.toLowerCase() === 'all') return true;
    return matchesAcademicGroup(p, groupValue);
  });
}

const SCIENCE_GROUPS = Array.from({ length: 17 }, (_, i) =>
  i + 1 < 10 ? `0${i + 1}` : `${i + 1}`
);
const HUMANITIES_GROUPS = ['G', 'H', 'L', 'W'];
const COMMERCE_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function computeBatchGroupCounts(batch: BatchSummary, profiles: AlumniProfile[]) {
  const realBatchProfiles = profiles.filter(
    (p) => p.batchYear === batch.batchYear
  );
  const scienceCounts: Record<string, number> = {};
  const humanitiesCounts: Record<string, number> = {};
  const commerceCounts: Record<string, number> = {};

  SCIENCE_GROUPS.forEach((code) => { scienceCounts[code] = 0; });
  HUMANITIES_GROUPS.forEach((code) => { humanitiesCounts[code] = 0; });
  COMMERCE_GROUPS.forEach((code) => { commerceCounts[code] = 0; });

  for (const profile of realBatchProfiles) {
    let matched = false;
    for (const code of SCIENCE_GROUPS) {
      if (matchesAcademicGroup(profile, `Science ${code}`)) {
        scienceCounts[code] += 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (const code of HUMANITIES_GROUPS) {
        if (matchesAcademicGroup(profile, `Humanities ${code}`)) {
          humanitiesCounts[code] += 1;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      for (const code of COMMERCE_GROUPS) {
        if (matchesAcademicGroup(profile, `Commerce ${code}`)) {
          commerceCounts[code] += 1;
          matched = true;
          break;
        }
      }
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
  const [allDirectoryProfiles, setAllDirectoryProfiles] = useState<AlumniProfile[]>(() => loadStoredAlumniProfiles());
  const [feedPosts, setFeedPosts] = useState<PostItem[]>([]);
  const [activeTabMode, setActiveTabMode] = useState<'directory' | 'leaderboard'>(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash.replace('#', '');
      if (h === 'leaderboard' || h === 'batch-leaderboard') return 'leaderboard';
    }
    return 'directory';
  });
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

    fetchAlumniProfilesFromDb()
      .then((profiles) => {
        if (isMounted && profiles && profiles.length > 0) {
          setAllDirectoryProfiles(profiles);
        }
      })
      .catch((err) => {
        console.warn('BatchesView: could not load directory profiles for leaderboard:', err);
      });

    fetchFeedPostsFromDb(100)
      .then((posts) => {
        if (isMounted && posts && posts.length > 0) {
          setFeedPosts(posts);
        }
      })
      .catch(() => {
        // Fallback to profile post metrics
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

    fetchBatchAlumniProfilesFromDb(activeBatchYear).then((dbProfiles) => {
      if (isMounted) {
        const localProfiles = allDirectoryProfiles.filter((p) => p.batchYear === activeBatchYear);
        const combined = [...(dbProfiles || []), ...localProfiles].filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i
        );
        setBatchAlumniProfiles(combined);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeBatchYear, allDirectoryProfiles]);

  const activeBatchGroupStats = useMemo(() => {
    if (!activeBatch) return null;
    return computeBatchGroupCounts(activeBatch, batchAlumniProfiles);
  }, [activeBatch, batchAlumniProfiles]);

  const selectedGroupAlumni = useMemo(() => {
    if (!activeBatch || !activeBatchGroupStats) return [];
    // If a group is selected, filter by that group; otherwise show all alumni for the batch
    const list = selectedGroup
      ? getGroupAlumniList(activeBatch, selectedGroup, batchAlumniProfiles)
      : batchAlumniProfiles;

    if (!groupSearch.trim()) return list;
    const q = groupSearch.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.collegeRoll && p.collegeRoll.toLowerCase().includes(q)) ||
        p.institution.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.academicGroup && p.academicGroup.toLowerCase().includes(q)) ||
        (p.section && p.section.toLowerCase().includes(q))
    );
  }, [activeBatch, activeBatchGroupStats, selectedGroup, groupSearch, batchAlumniProfiles]);

  // Resolve direct quick-jump target batch and optional section when user types a batch number, HSC year, or section/group
  const quickJumpInfo = useMemo(() => {
    const raw = searchTerm.trim().toLowerCase();
    if (!raw) return null;

    // Check for 4-digit HSC year (1949-2100) or batch number (1-78)
    const yearMatch = raw.match(/\b(19\d{2}|20\d{2})\b/);
    const batchNumMatch = raw.match(/\bbatch\s*(\d{1,2})\b/i);

    let targetBatchYear: number | null = null;
    if (yearMatch) {
      targetBatchYear = parseInt(yearMatch[1], 10);
    } else if (batchNumMatch) {
      const bNum = parseInt(batchNumMatch[1], 10);
      targetBatchYear = 1950 + bNum;
    } else {
      const numOnly = Number(raw.replace(/^(?:batch|hsc)\s*/i, ''));
      if (!Number.isNaN(numOnly)) {
        if (numOnly >= 1949 && numOnly <= 2100) {
          targetBatchYear = numOnly;
        } else if (numOnly >= 1 && numOnly <= 78) {
          targetBatchYear = 1950 + numOnly;
        }
      }
    }

    if (!targetBatchYear) return null;
    const batch = batchesList.find((b) => b.batchYear === targetBatchYear) || null;
    if (!batch) return null;

    // Check for group / section in search query (e.g. "group 1", "section 01", "science 1", "commerce a", "humanities g")
    let targetGroup: string | null = null;
    const groupMatch = raw.match(/(?:group|section|sec|grp|science|humanities|commerce|arts)\s*([0-9]{1,2}|[a-zA-Z])\b/i);
    if (groupMatch) {
      const codeOrToken = groupMatch[1].toUpperCase();
      const num = parseInt(codeOrToken, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= 17) {
        targetGroup = `Science ${num < 10 ? `0${num}` : num}`;
      } else if (HUMANITIES_GROUPS.includes(codeOrToken) && (raw.includes('hum') || raw.includes('art'))) {
        targetGroup = `Humanities ${codeOrToken}`;
      } else if (COMMERCE_GROUPS.includes(codeOrToken)) {
        targetGroup = `Commerce ${codeOrToken}`;
      } else if (HUMANITIES_GROUPS.includes(codeOrToken)) {
        targetGroup = `Humanities ${codeOrToken}`;
      }
    }

    return { batch, targetGroup };
  }, [searchTerm, batchesList]);

  const quickJumpBatch = quickJumpInfo?.batch || null;

  // Filter batches
  const filteredBatches = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    if (quickJumpInfo?.batch) {
      return [quickJumpInfo.batch];
    }

    const list = batchesList.filter((b) => {
      // When not searching, apply range filter; when searching, search across all 78 batches
      if (!q) {
        if (rangeFilter === '1-20' && (b.batchYear < 1951 || b.batchYear > 1970)) return false;
        if (rangeFilter === '21-40' && (b.batchYear < 1971 || b.batchYear > 1990)) return false;
        if (rangeFilter === '41-60' && (b.batchYear < 1991 || b.batchYear > 2010)) return false;
        if (rangeFilter === '61-78' && (b.batchYear < 2011 || b.batchYear > 2028)) return false;
        return true;
      }

      const yearStr = b.batchYear.toString();
      const cleanQ = q.replace(/^batch\s*/i, '').replace(/^hsc\s*/i, '');

      const matchesYear =
        yearStr === cleanQ ||
        `hsc ${yearStr}`.includes(q) ||
        `batch ${yearStr}`.includes(q) ||
        yearStr.includes(cleanQ);

      const matchesSession = b.session.toLowerCase().includes(q);
      const matchesRep = b.representative?.toLowerCase().includes(q);

      return matchesYear || matchesSession || matchesRep;
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

      {/* View Switcher: Directory vs Batch Leaderboard */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTabMode('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTabMode === 'directory'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Batch Directory (1–78)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTabMode === 'leaderboard'
              ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-500" />
          <span>Batch Leaderboard & Activity Charts</span>
        </button>
      </div>

      {activeTabMode === 'leaderboard' ? (
        <BatchLeaderboard
          batches={batchesList}
          profiles={allDirectoryProfiles}
          posts={feedPosts}
          onSelectBatch={(selectedBatch) => {
            setActiveBatchYear(selectedBatch);
            setActiveTabMode('directory');
            onSelectBatch(selectedBatch);
          }}
        />
      ) : (
        <>
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
                Jump to HSC {quickJumpBatch.batchYear}
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
                  {activeBatch.batchYear > 1900 ? `'${String(activeBatch.batchYear).slice(-2)}` : (activeBatch.batchYear < 10 ? `0${activeBatch.batchYear}` : activeBatch.batchYear)}
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50">
                      HSC {activeBatch.batchYear} {activeBatch.session}
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

            {/* Alumni List for Active Batch & Selected Group */}
            <div className="pt-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 dark:bg-blue-950/25 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {selectedGroup
                        ? `Batch ${activeBatch.batchYear} • ${selectedGroup} Alumni`
                        : `Batch ${activeBatch.batchYear} • All Sections`}
                    </span>
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                      ({selectedGroupAlumni.length} Members)
                    </span>
                    {selectedGroup && (
                      <button
                        type="button"
                        onClick={() => setSelectedGroup('')}
                        className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                      >
                        Show All Sections ({batchAlumniProfiles.length})
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedGroup
                      ? `Showing alumni members from ${selectedGroup} in Batch ${activeBatch.batchYear} ${activeBatch.session}.`
                      : `Showing all registered alumni in Batch ${activeBatch.batchYear} ${activeBatch.session}. Click any group above to filter by section.`}
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={
                      selectedGroup
                        ? `Search in ${selectedGroup} (name, roll, org)...`
                        : `Search in Batch ${activeBatch.batchYear}...`
                    }
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
                    {selectedGroup
                      ? `No registered alumni in ${selectedGroup} yet`
                      : `No registered alumni in Batch ${activeBatch.batchYear} yet`}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedGroup
                      ? `Notredamians from Batch ${activeBatch.batchYear} (${selectedGroup}) will appear here as they register.`
                      : `Be the first to claim and register your verified profile for Batch ${activeBatch.batchYear}!`}
                  </p>
                  {selectedGroup && (
                    <button
                      type="button"
                      onClick={() => setSelectedGroup('')}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer transition-colors"
                    >
                      View All Batch {activeBatch.batchYear} Alumni ({batchAlumniProfiles.length})
                    </button>
                  )}
                </div>
              ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
                      {selectedGroupAlumni.map((alumnus) => (
                        <div
                          key={alumnus.id}
                          onClick={() => {
                            if (onViewProfile) {
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
                              <span className="font-mono bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-800/60">
                                Roll: {alumnus.collegeRoll || 'N/A'}
                              </span>
                              <span>•</span>
                              <span>{alumnus.group || (alumnus.academicGroup ? `Group ${alumnus.academicGroup}` : 'Science')}</span>
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
                </div>
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
                    <div className="flex items-center gap-2 mt-0.5">
                      {previewAlumnus.collegeRoll && (
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          Roll: {previewAlumnus.collegeRoll}
                        </p>
                      )}
                      {previewAlumnus.bloodGroup && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/50">
                          Blood: {previewAlumnus.bloodGroup}
                        </span>
                      )}
                    </div>
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

              {previewAlumnus.bio && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  {previewAlumnus.bio}
                </p>
              )}

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

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {onViewProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = previewAlumnus.id;
                      setPreviewAlumnus(null);
                      onViewProfile(id);
                    }}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>View Complete Profile</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {previewAlumnus.whatsapp && (
                    <a
                      href={`https://wa.me/${previewAlumnus.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>WhatsApp</span>
                    </a>
                  )}
                  {previewAlumnus.phone && (
                    <a
                      href={`tel:${previewAlumnus.phone}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Call</span>
                    </a>
                  )}
                  {previewAlumnus.email && (
                    <a
                      href={`mailto:${previewAlumnus.email}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Email</span>
                    </a>
                  )}
                </div>
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
                      {batch.batchYear > 1900 ? `'${String(batch.batchYear).slice(-2)}` : (batch.batchYear < 10 ? `0${batch.batchYear}` : batch.batchYear)}
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {batch.session}
                    </span>
                  </div>

                  {/* Batch Title */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      HSC {batch.batchYear}
                    </h3>
                    {batch.batchYear === 1949 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                        1st Pioneer
                      </span>
                    )}
                    {batch.batchYear === new Date().getFullYear() + 1 && (
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
        </>
      )}
    </div>
  );
};
