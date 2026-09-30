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
import { AlumniProfile } from '../types';
import { BATCH_LIST } from '../data/mockData';
import { AchievementBadgeChip } from './AchievementBadge';
import { WhatsAppIcon, FacebookIcon } from './SocialIcons';
import { getCachedDirectory, cacheDirectory, getDirectoryCacheTimestamp } from '../utils/offlineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface DirectoryViewProps {
  onViewProfile: (profileId: number) => void;
  initialSearch?: string;
  initialBatch?: number | null;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  onViewProfile,
  initialSearch = '',
  initialBatch = null,
}) => {
  const isOnline = useOnlineStatus();
  const [profiles, setProfiles] = useState<AlumniProfile[]>(() => getCachedDirectory());
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
    setProfiles(cached);
  }, []);

  const handleRefreshCache = () => {
    const updated = getCachedDirectory();
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
    const list: string[] = [];
    profiles.forEach((p) => {
      p.specialty.forEach((s) => {
        if (!list.includes(s)) list.push(s);
      });
    });
    return list.sort();
  }, [profiles]);

  const countries = useMemo(() => {
    const set = new Set(profiles.map((p) => p.country));
    return Array.from(set).sort();
  }, [profiles]);

  const availableBadges = useMemo(() => {
    const list: string[] = [];
    profiles.forEach((p) => {
      p.badges?.forEach((b) => {
        if (!list.includes(b)) list.push(b);
      });
    });
    return list.sort();
  }, [profiles]);

  // Filtered profiles
  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.fullName.toLowerCase().includes(q);
        const matchesInst = p.institution.toLowerCase().includes(q);
        const matchesSpec = p.specialty.some((s) => s.toLowerCase().includes(q));
        const matchesCity = p.city.toLowerCase().includes(q);
        const matchesBatch = p.batchYear.toString().includes(q);
        const matchesBadge = p.badges?.some((b) => b.toLowerCase().includes(q));
        if (!matchesName && !matchesInst && !matchesSpec && !matchesCity && !matchesBatch && !matchesBadge) {
          return false;
        }
      }
      if (batchFilter && p.batchYear !== parseInt(batchFilter, 10)) return false;
      if (countryFilter && p.country !== countryFilter) return false;
      if (specialtyFilter && !p.specialty.includes(specialtyFilter)) return false;
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

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, badge, organization, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Batches (1 - 35)</option>
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
                    <div className="flex items-center gap-1.5">
                      <h3
                        onClick={() => onViewProfile(profile.id)}
                        className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      >
                        {profile.fullName}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
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
                    href={profile.fbLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    title="Facebook Profile"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onViewProfile(profile.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
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
