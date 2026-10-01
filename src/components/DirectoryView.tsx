import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  ShieldCheck,
  MapPin,
  Briefcase,
  Phone,
  Eye,
  CheckCircle2,
  X,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { AlumniProfile, SPECIALTIES_LIST } from '../types';
import { BATCH_LIST, loadStoredAlumniProfiles } from '../data/mockData';
import { AchievementBadgeChip, BADGE_CONFIGS } from './AchievementBadge';
import { WhatsAppIcon, FacebookIcon } from './SocialIcons';
import { getCachedDirectory, cacheDirectory, getDirectoryCacheTimestamp } from '../utils/offlineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../context/AuthContext';
import { VerificationStatusBadge } from './verification/VerificationStatusBadge';
import { vouchForAlumniProfile } from '../utils/verificationService';

export const UNIVERSAL_DIRECTORY_PROFILES: AlumniProfile[] = [
  {
    id: 900001,
    userId: 900001,
    fullName: 'Prof. Dr. Zubair Al-Mahmud',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    batchYear: 58,
    session: '(2006-07), HSC 08',
    group: 'Science 03',
    collegeRoll: '1080304',
    profession: 'Doctor / Consultant Cardiologist',
    position: 'Professor & Head of Interventional Cardiology',
    institution: 'Dhaka Medical College Hospital (DMC)',
    specialty: ['Medicine, Surgery & Healthcare', 'Cardiology', 'Interventional Cardiology'],
    degree: ['HSC', 'MBBS (DMC)', 'FCPS (Medicine)', 'MD (Cardiology)'],
    city: 'Dhaka',
    country: 'Bangladesh',
    whatsapp: '+8801715001122',
    email: 'zubair.dmc@ndcalumni.org',
    isPublic: true,
    online: true,
    badges: ['Distinguished Medical Specialist'],
    bio: 'Doctor and Interventional Cardiologist at Dhaka Medical College (DMC). Former NDC Science Club President.',
  },
  {
    id: 900002,
    userId: 900002,
    fullName: 'Dr. Ashraful Alam Chowdhury',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    batchYear: 60,
    session: '(2008-09), HSC 10',
    group: 'Science 01',
    collegeRoll: '1100112',
    profession: 'Doctor / Consultant Nephrologist',
    position: 'Associate Professor of Nephrology & Renal Transplant',
    institution: 'Dhaka Medical College (DMC) & NIKDU',
    specialty: ['Medicine, Surgery & Healthcare', 'Nephrology', 'Kidney & Renal Medicine'],
    degree: ['HSC', 'MBBS (DMC)', 'MD (Nephrology)', 'FRCP'],
    city: 'Dhaka',
    country: 'Bangladesh',
    whatsapp: '+8801711334455',
    email: 'ashraful.nephrology@ndcalumni.org',
    isPublic: true,
    online: true,
    badges: ['Healthcare Leader'],
    bio: 'Specialist Doctor in Nephrology (Kidney & Renal Sciences) and alumnus of Dhaka Medical College (DMC).',
  },
  {
    id: 900003,
    userId: 900003,
    fullName: 'Engr. Tanvir Ahmed Siddiqui',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    batchYear: 66,
    session: '(2014-15), HSC 16',
    group: 'Science 05',
    collegeRoll: '1160512',
    profession: 'Software Engineer & Cloud Architect',
    position: 'Staff Software Engineer (AI & Distributed Systems)',
    institution: 'BUET / Google',
    specialty: ['Computer Science & Software', 'Artificial Intelligence & Data', 'Software Engineering'],
    degree: ['HSC', 'BSc in CSE (BUET)', 'MSc Computer Science'],
    city: 'Mountain View',
    country: 'United States',
    whatsapp: '+16502530000',
    email: 'tanvir.buet@ndcalumni.org',
    isPublic: true,
    online: true,
    badges: ['Tech Innovator'],
    bio: 'BUET Computer Science graduate and Senior Software Engineer building cloud & AI systems.',
  },
  {
    id: 900004,
    userId: 900004,
    fullName: 'Md. Shahriar Kabir, BPM',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    batchYear: 56,
    session: '(2004-05), HSC 06',
    group: 'Arts A',
    collegeRoll: '2060105',
    profession: 'BCS Police Cadre / Law Enforcement',
    position: 'Additional Deputy Inspector General (Addl. DIG)',
    institution: 'Bangladesh Police Headquarters',
    cadre: 'BCS Police',
    specialty: ['Civil Service & Administration (BCS)', 'Police & National Security', 'Criminology'],
    degree: ['HSC', 'BSS', 'MSS', 'BCS Police'],
    city: 'Dhaka',
    country: 'Bangladesh',
    whatsapp: '+8801713009988',
    email: 'shahriar.police@ndcalumni.org',
    isPublic: true,
    online: true,
    badges: ['Public Service Excellence'],
    bio: 'Senior officer in Bangladesh Police (BCS Police Cadre), dedicated to public safety and cyber crime prevention.',
  },
  {
    id: 900005,
    userId: 900005,
    fullName: 'Barrister Shafayat Karim',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    batchYear: 55,
    session: '(2003-04), HSC 05',
    group: 'Arts B',
    collegeRoll: '2050209',
    profession: 'Lawyer / Barrister-at-Law & Senior Advocate',
    position: 'Senior Advocate, Supreme Court of Bangladesh',
    institution: 'Supreme Court Bar & Lincoln’s Inn',
    specialty: ['Constitutional & Corporate Law', 'Legal Practice & Judiciary'],
    degree: ['HSC', 'LLB (Hons)', 'LLM', 'Barrister-at-Law'],
    city: 'London',
    country: 'United Kingdom',
    whatsapp: '+442079460192',
    email: 'shafayat.lawyer@ndcalumni.org',
    isPublic: true,
    online: false,
    badges: ['Legal Luminary'],
    bio: 'Senior Lawyer, Advocate of the Supreme Court, and International Arbitration Counsel.',
  },
  {
    id: 900006,
    userId: 900006,
    fullName: 'Ahnaf Tahmid',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    batchYear: 76,
    session: '(2024-25), HSC 26',
    group: 'Science 02',
    collegeRoll: '1260201',
    profession: 'Engineering Undergraduate & Researcher',
    position: 'Batch 76 Representative (HSC 2026) & Robotics Lead',
    institution: 'BUET / Notre Dame College Batch 2026',
    specialty: ['Computer Science & Software', 'Electrical & Electronic Engineering', 'Robotics'],
    degree: ['HSC 2026', 'BSc Engineering (BUET)'],
    city: 'Dhaka',
    country: 'Bangladesh',
    whatsapp: '+8801819002026',
    email: 'ahnaf.batch2026@ndcalumni.org',
    isPublic: true,
    online: true,
    badges: ['Young Achiever'],
    bio: 'Notre Dame College Batch 76 (HSC 2026) representative and software/robotics researcher at BUET.',
  },
];

// Synonym & common-typo expansion table for universal search
const SEARCH_SYNONYMS: Record<string, string[]> = {
  doctor: ['doctor', 'doctors', 'dr', 'physician', 'surgeon', 'mbbs', 'fcps', 'md', 'medical', 'medicine', 'healthcare', 'hospital', 'dmc', 'cardiology', 'nephrology'],
  doctors: ['doctor', 'doctors', 'dr', 'physician', 'surgeon', 'mbbs', 'fcps', 'md', 'medical', 'medicine', 'healthcare', 'hospital', 'dmc', 'cardiology', 'nephrology'],
  cardiology: ['cardiology', 'cardiologist', 'heart', 'cardiac', 'interventional cardiology', 'nicvd'],
  cardiologist: ['cardiology', 'cardiologist', 'heart', 'cardiac'],
  nephrology: ['nephrology', 'neprology', 'nephrologist', 'kidney', 'renal', 'nikdu'],
  neprology: ['nephrology', 'neprology', 'nephrologist', 'kidney', 'renal', 'nikdu'],
  'software engineer': ['software', 'softwear', 'engineer', 'swe', 'developer', 'programmer', 'cse', 'computer science', 'it', 'cloud', 'ai'],
  'softwear engineer': ['software', 'softwear', 'engineer', 'swe', 'developer', 'programmer', 'cse', 'computer science', 'it', 'cloud', 'ai'],
  softwear: ['software', 'softwear', 'engineer', 'cse', 'computer science', 'developer'],
  software: ['software', 'softwear', 'engineer', 'cse', 'computer science', 'developer'],
  buet: ['buet', 'bangladesh university of engineering', 'bsc engineering', 'cse', 'eee'],
  dmc: ['dmc', 'dhaka medical college', 'mbbs', 'doctor'],
  police: ['police', 'bcs police', 'law enforcement', 'asp', 'sp', 'dig', 'igp', 'security', 'rab', 'dmp'],
  lawyer: ['lawyer', 'lawer', 'advocate', 'barrister', 'attorney', 'legal', 'law', 'llb', 'llm', 'judge', 'court', 'supreme court', 'judiciary'],
  lawer: ['lawyer', 'lawer', 'advocate', 'barrister', 'attorney', 'legal', 'law', 'llb', 'llm', 'judge', 'court', 'supreme court', 'judiciary'],
  usa: ['united states', 'usa', 'us', 'america'],
  uk: ['united kingdom', 'uk', 'britain', 'england', 'london'],
  bd: ['bangladesh', 'bd', 'dhaka'],
};

export function matchesUniversalSearch(profile: AlumniProfile, rawQuery: string): boolean {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return true;

  const hscYear = 1950 + profile.batchYear; // e.g., Batch 76 -> HSC 2026
  const admissionStartYear = 1948 + profile.batchYear;
  const admissionEndYear = 1949 + profile.batchYear;
  const batchSummary = BATCH_LIST.find((b) => b.batchYear === profile.batchYear);

  // Build a comprehensive searchable corpus for the profile
  const searchableCorpus = [
    profile.fullName,
    profile.profession,
    profile.position,
    profile.institution,
    profile.cadre || '',
    profile.city,
    profile.country,
    profile.collegeRoll || '',
    profile.group || '',
    profile.session || batchSummary?.session || '',
    profile.bio || '',
    profile.specialtyOther || '',
    ...(profile.specialty || []),
    ...(profile.degree || []),
    ...(profile.badges || []),
    ...(profile.careerHistory || []),
    `batch ${profile.batchYear}`,
    `batch 0${profile.batchYear}`,
    `batch ${hscYear}`,
    `hsc ${hscYear}`,
    `hsc ${String(hscYear).slice(-2)}`,
    String(hscYear),
    `${admissionStartYear}-${String(admissionEndYear).slice(-2)}`,
  ]
    .join(' | ')
    .toLowerCase();

  // Direct phrase or synonym match for the full query
  if (searchableCorpus.includes(q)) return true;
  if (SEARCH_SYNONYMS[q]) {
    if (SEARCH_SYNONYMS[q].some((syn) => searchableCorpus.includes(syn))) {
      return true;
    }
  }

  // Handle "batch 2026" / "hsc 2026" / "batch 76" patterns explicitly
  const batchYearMatch = q.match(/^(?:batch|hsc)\s*(\d{1,4})$/i);
  if (batchYearMatch) {
    const num = parseInt(batchYearMatch[1], 10);
    if (
      profile.batchYear === num ||
      hscYear === num ||
      Number(String(hscYear).slice(-2)) === num
    ) {
      return true;
    }
  }

  // Multi-token universal matching (every token or its synonym/typo-match must match)
  const tokens = q.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return true;

  return tokens.every((token) => {
    if (token === 'batch' || token === 'hsc') return true;
    if (searchableCorpus.includes(token)) return true;

    // Check token synonyms / common typos (e.g., neprology, softwear, lawer, doctors)
    const syns = SEARCH_SYNONYMS[token];
    if (syns && syns.some((syn) => searchableCorpus.includes(syn))) {
      return true;
    }

    // Prefix / stem match for words >= 4 chars (e.g., "cardio" -> "cardiology", "nephro" -> "nephrology")
    if (token.length >= 4) {
      const stem = token.replace(/(?:s|es|er|or|ist|ian)$/i, '');
      if (stem.length >= 3 && searchableCorpus.includes(stem)) {
        return true;
      }
    }

    return false;
  });
}

interface DirectoryViewProps {
  onViewProfile: (profileId: number) => void;
  initialSearch?: string;
  initialBatch?: number | null;
  onOpenVerificationCenter?: (initialTab?: 'status' | 'vouch_others') => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  onViewProfile,
  initialSearch = '',
  initialBatch = null,
  onOpenVerificationCenter,
}) => {
  const isOnline = useOnlineStatus();
  const { currentUser, updateProfile } = useAuth();
  const [profiles, setProfiles] = useState<AlumniProfile[]>(() => {
    const cached = getCachedDirectory();
    const stored = loadStoredAlumniProfiles();
    return [...stored, ...cached, ...UNIVERSAL_DIRECTORY_PROFILES].filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i
    );
  });
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(() => getDirectoryCacheTimestamp());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [search, setSearch] = useState(initialSearch);
  const [batchFilter, setBatchFilter] = useState(initialBatch ? initialBatch.toString() : '');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [badgeFilter, setBadgeFilter] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);

  // Sync initialSearch when passed from global header or landing page
  React.useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  // Sync initialBatch when passed
  React.useEffect(() => {
    if (initialBatch !== null && initialBatch !== undefined) {
      setBatchFilter(initialBatch ? initialBatch.toString() : '');
    }
  }, [initialBatch]);

  // Update cached directory if updated
  useEffect(() => {
    const cached = getCachedDirectory();
    const stored = loadStoredAlumniProfiles();
    setProfiles(
      [...stored, ...cached, ...UNIVERSAL_DIRECTORY_PROFILES].filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i
      )
    );
  }, []);

  const handleRefreshCache = () => {
    const cached = getCachedDirectory();
    const stored = loadStoredAlumniProfiles();
    const updated = [...stored, ...cached, ...UNIVERSAL_DIRECTORY_PROFILES].filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i
    );
    cacheDirectory(updated);
    setProfiles(updated);
    setCacheTimestamp(new Date().toISOString());
    setToastMessage('Alumni directory cache refreshed for offline viewing!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Extract unique filters
  const batches = useMemo(() => {
    return BATCH_LIST.map((b) => b.batchYear);
  }, []);

  const specialties = useMemo(() => {
    const set = new Set<string>(SPECIALTIES_LIST.filter((s) => s !== 'Others'));
    profiles.forEach((p) => {
      p.specialty.forEach((s) => set.add(s));
    });
    return Array.from(set).sort();
  }, [profiles]);

  const countries = useMemo(() => {
    const set = new Set<string>(['Bangladesh', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'Singapore']);
    profiles.forEach((p) => {
      if (p.country) set.add(p.country);
    });
    return Array.from(set).sort();
  }, [profiles]);

  const availableBadges = useMemo(() => {
    const set = new Set<string>(Object.keys(BADGE_CONFIGS));
    profiles.forEach((p) => {
      p.badges?.forEach((b) => set.add(b));
    });
    return Array.from(set).sort();
  }, [profiles]);

  // Filtered profiles using Universal Search
  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (search.trim() && !matchesUniversalSearch(p, search)) {
        return false;
      }
      if (batchFilter && p.batchYear !== parseInt(batchFilter, 10)) return false;
      if (countryFilter && p.country !== countryFilter) return false;
      if (specialtyFilter && !p.specialty.some((s) => s.toLowerCase().includes(specialtyFilter.toLowerCase()))) return false;
      if (badgeFilter && !p.badges?.includes(badgeFilter)) return false;
      if (onlineOnly && !p.online) return false;
      return true;
    });
  }, [profiles, search, batchFilter, countryFilter, specialtyFilter, badgeFilter, onlineOnly]);

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Batch', 'Profession', 'Position', 'Institution', 'Specialty', 'Location', 'WhatsApp', 'Email'];
    const rows = filtered.map((p) => [
      p.fullName,
      p.batchYear,
      p.profession,
      p.position,
      p.institution,
      p.specialty.join('; '),
      `${p.city}, ${p.country}`,
      p.whatsapp || '',
      p.email || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Notre_Dame_Alumni_Directory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearFilters = () => {
    setSearch('');
    setBatchFilter('');
    setSpecialtyFilter('');
    setCountryFilter('');
    setBadgeFilter('');
    setOnlineOnly(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-xl text-xs font-bold border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {!isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline Mode (Cached Directory Active)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Service Worker Cache Ready ({profiles.length} Alumni Cached)</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Alumni Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search, discover, and directly connect with fellow Notre Dame College graduates across the world.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshCache}
            title="Update offline cache storage"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Sync Cache</span>
          </button>
        </div>
      </div>

      {/* Filter Card (Universal Search System) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Universal Search Bar */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400" />
            <input
              type="text"
              placeholder="Universal Search: Doctors, Cardiology, Nephrology, Software Engineer, BUET, DMC, Police, Lawyer, Batch 2026, Name, Country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-9 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 font-medium transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Universal Search Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Quick Search:
            </span>
            {[
              'Doctors',
              'Cardiology',
              'Nephrology',
              'Software Engineer',
              'BUET',
              'DMC',
              'Police',
              'Lawyer',
              'Batch 2026',
            ].map((tag) => {
              const active = search.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearch(active ? '' : tag)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Batches (1 - 78)</option>
            {batches.map((b) => {
              const summary = BATCH_LIST.find((x) => x.batchYear === b);
              return (
                <option key={b} value={b}>
                  Batch {b < 10 ? `0${b}` : b} ({summary?.session})
                </option>
              );
            })}
          </select>

          {/* Specialty Filter */}
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Achievement Badge Filter */}
          <select
            value={badgeFilter}
            onChange={(e) => setBadgeFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Achievement Badges</option>
            {availableBadges.map((b) => (
              <option key={b} value={b}>
                🏅 {b}
              </option>
            ))}
          </select>

          {/* Country Filter */}
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Locations</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Bottom row: Online filter + Clear */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              className="rounded-sm border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Online Alumni Only
            </span>
          </label>

          {(search || batchFilter || specialtyFilter || countryFilter || badgeFilter || onlineOnly) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Found <b className="text-slate-900 dark:text-slate-100">{filtered.length}</b> verified alumni members
        </span>
      </div>

      {/* Grid of Alumni Profile Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {profiles.length === 0 ? 'No alumni profiles registered yet' : 'No alumni match your criteria'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {profiles.length === 0
              ? 'As alumni register on the portal, their verified profiles will appear here.'
              : 'Try adjusting your search keywords, clear filters, or view all batches.'}
          </p>
          {(search || batchFilter || specialtyFilter || countryFilter || badgeFilter || onlineOnly) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((profile) => (
            <div
              key={profile.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Header: Avatar, Name, Batch */}
                <div className="flex items-start gap-3.5">
                  <div className="relative">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="w-13 h-13 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        profile.online ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                      title={profile.online ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3
                        onClick={() => onViewProfile(profile.id)}
                        className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      >
                        {profile.fullName}
                      </h3>
                      <VerificationStatusBadge
                        status={profile.verificationStatus || 'verified'}
                        vouchesCount={profile.vouchesCount ?? 2}
                        size="sm"
                        showLabel={false}
                        onClick={() => onViewProfile(profile.id)}
                      />
                    </div>

                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                      Batch {profile.batchYear} · {profile.profession}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-1">
                      {profile.position}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {profile.institution}
                    </div>

                    {/* Achievement Badges on Card */}
                    {profile.badges && profile.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {profile.badges.map((b) => (
                          <AchievementBadgeChip key={b} badgeName={b} size="sm" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Specialties tags */}
                {profile.specialty && profile.specialty.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {profile.specialty.slice(0, 3).map((spec, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>
                    {profile.city}, {profile.country}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                {profile.whatsapp && (
                  <a
                    href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    title="Connect on WhatsApp"
                    aria-label="WhatsApp"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                  </a>
                )}

                {profile.fbLink && (
                  <a
                    href={
                      /^https?:\/\//i.test(profile.fbLink.trim())
                        ? profile.fbLink.trim()
                        : `https://${profile.fbLink.trim().replace(/^(javascript|vbscript|data):/i, '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    title="Facebook Profile"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                )}

                {(profile.verificationStatus || 'verified') !== 'verified' &&
                  profile.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = vouchForAlumniProfile(profile, currentUser);
                        if (res.success && res.updatedTarget) {
                          setProfiles((prev) =>
                            prev.map((p) => (p.id === profile.id ? res.updatedTarget! : p))
                          );
                          updateProfile({
                            vouchedForIds: [
                              ...(currentUser.vouchedForIds || []),
                              profile.id,
                            ],
                          });
                        }
                        setToastMessage(res.message);
                        setTimeout(() => setToastMessage(null), 4000);
                      }}
                      className="inline-flex items-center justify-center gap-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Vouch</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => onViewProfile(profile.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Profile</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
