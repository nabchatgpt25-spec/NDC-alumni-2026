import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  MapPin,
  Briefcase,
  Eye,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  WifiOff,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { BATCH_LIST, loadStoredAlumniProfiles } from '../data/mockData';
import { AchievementBadgeChip } from './AchievementBadge';
import { WhatsAppIcon, FacebookIcon } from './SocialIcons';
import { getCachedDirectory } from '../utils/offlineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../context/AuthContext';
import { AlumniProfile } from '../types';
import { matchesUniversalSearch, UNIVERSAL_DIRECTORY_PROFILES } from './DirectoryView';
import { VerificationStatusBadge } from './verification/VerificationStatusBadge';
import { vouchForAlumniProfile } from '../utils/verificationService';
import { Tilt3DCard } from './motion/CinematicMotion';

interface AlumniDirectoryViewProps {
  onViewProfile: (profileId: number) => void;
  onNavigateToFind?: () => void;
  onOpenVerificationCenter?: (initialTab?: 'status' | 'vouch_others') => void;
}

export const AlumniDirectoryView: React.FC<AlumniDirectoryViewProps> = ({
  onViewProfile,
  onNavigateToFind,
  onOpenVerificationCenter,
}) => {
  const isOnline = useOnlineStatus();
  const { currentUser, updateProfile } = useAuth();
  const [vouchNotice, setVouchNotice] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AlumniProfile[]>(() => {
    const cached = getCachedDirectory();
    const stored = loadStoredAlumniProfiles();
    return [...stored, ...cached, ...UNIVERSAL_DIRECTORY_PROFILES].filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i
    );
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const cached = getCachedDirectory();
    const stored = loadStoredAlumniProfiles();
    setProfiles(
      [...stored, ...cached, ...UNIVERSAL_DIRECTORY_PROFILES].filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i
      )
    );
  }, []);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      if (searchTerm.trim() && !matchesUniversalSearch(profile, searchTerm)) {
        return false;
      }
      if (selectedBatch && profile.batchYear !== parseInt(selectedBatch, 10)) {
        return false;
      }
      if (onlineOnly && !profile.online) {
        return false;
      }
      return true;
    });
  }, [profiles, searchTerm, selectedBatch, onlineOnly]);

  const displayed = filteredProfiles.slice(0, visibleCount);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedBatch('');
    setOnlineOnly(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {!isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline Mode (Cached Directory)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Offline Ready ({profiles.length} Alumni Cached)</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            All Alumni Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse verified Notredamians and alumni of Notre Dame College Dhaka worldwide.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenVerificationCenter && (
            <button
              type="button"
              onClick={() => onOpenVerificationCenter('vouch_others')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Peer Vouch Center</span>
            </button>
          )}
          {onNavigateToFind && (
            <button
              type="button"
              onClick={onNavigateToFind}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Advanced Search</span>
            </button>
          )}
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
            {filteredProfiles.length} Members
          </div>
        </div>
      </div>

      {vouchNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{vouchNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setVouchNotice(null)}
            className="text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Universal Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-6 lg:col-span-7">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Universal Search: Doctors, Cardiology, Nephrology, Software Engineer, BUET, DMC, Police, Lawyer, Batch 2026, Name, Country..."
              className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-4 lg:col-span-3">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              aria-label="Filter by Batch"
              className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Batches (1 - 78)</option>
              {BATCH_LIST.map((b) => (
                <option key={b.batchYear} value={b.batchYear}>
                  Batch {b.batchYear < 10 ? `0${b.batchYear}` : b.batchYear} ({b.session})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-2 flex items-center">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="rounded-sm border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Online
              </span>
            </label>
          </div>
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
            const active = searchTerm.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchTerm(active ? '' : tag)}
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

        {(searchTerm || selectedBatch || onlineOnly) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Showing <b className="text-slate-800 dark:text-slate-200">{filteredProfiles.length}</b> results
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        )}
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {profiles.length === 0
              ? 'No alumni profiles registered yet'
              : 'No alumni match your search'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {profiles.length === 0
              ? 'As graduates of Notre Dame College register their verified profiles, they will be listed here in the directory.'
              : 'Try adjusting your search terms or clearing the batch filter.'}
          </p>
          {(searchTerm || selectedBatch || onlineOnly) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((profile) => (
            <Tilt3DCard
              key={profile.id}
              maxTilt={3}
              className="group bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400/60 dark:hover:border-blue-500/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
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

                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>
                    {profile.city}, {profile.country}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                {profile.whatsapp && (
                  <a
                    href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                    title="WhatsApp"
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
                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                    title="Facebook"
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
                        setVouchNotice(res.message);
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
            </Tilt3DCard>
          ))}
        </div>
      )}

      {visibleCount < filteredProfiles.length && (
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 12)}
            className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition-colors shadow-2xs"
          >
            Load More Alumni ({filteredProfiles.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
