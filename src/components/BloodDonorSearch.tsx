import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  ShieldCheck,
  Clock,
  CheckCircle2,
  X,
  Lock,
  BellRing,
  Eye,
  Heart,
} from 'lucide-react';
import {
  BloodDonorProfile,
  BloodGroup,
  BLOOD_GROUPS_LIST,
} from '../types';
import {
  DONATION_AREAS_LIST,
  pushPortalNotification,
} from '../utils/bloodDonationService';
import {
  getDonorIntervalInfo,
  HOSPITAL_ELIGIBILITY_DISCLAIMER,
} from '../utils/bloodMatching';
import { useAuth } from '../context/AuthContext';

interface BloodDonorSearchProps {
  donors: BloodDonorProfile[];
  initialBloodGroup?: BloodGroup | '';
  initialArea?: string;
  onViewProfile?: (userId: number) => void;
  onOpenRequestModal?: (prefillGroup?: BloodGroup) => void;
}

export const BloodDonorSearch: React.FC<BloodDonorSearchProps> = ({
  donors,
  initialBloodGroup = '',
  initialArea = '',
  onViewProfile,
  onOpenRequestModal,
}) => {
  const { currentUser } = useAuth();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | ''>(
    initialBloodGroup
  );
  const [selectedArea, setSelectedArea] = useState<string>(initialArea);
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available_now' | 'on_cooldown'
  >('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pingedDonorIds, setPingedDonorIds] = useState<number[]>([]);
  const [coordinationNotice, setCoordinationNotice] = useState<string | null>(null);

  const registeredDonors = useMemo(
    () => donors.filter((d) => d.isRegisteredDonor),
    [donors]
  );

  const filteredDonors = useMemo(() => {
    return registeredDonors.filter((donor) => {
      if (selectedBloodGroup && donor.bloodGroup !== selectedBloodGroup) {
        return false;
      }

      if (selectedArea) {
        const areaLower = selectedArea.toLowerCase();
        const donorAreaLower = `${donor.preferredArea} ${donor.city}`.toLowerCase();
        const firstToken = areaLower.split('/')[0].trim();
        if (!donorAreaLower.includes(firstToken) && !donorAreaLower.includes(areaLower)) {
          return false;
        }
      }

      const interval = getDonorIntervalInfo(donor.lastDonationDate);
      const isReadyNow =
        donor.availability === 'available' && interval.meetsStandardInterval;

      if (availabilityFilter === 'available_now' && !isReadyNow) {
        return false;
      }
      if (availabilityFilter === 'on_cooldown' && isReadyNow) {
        return false;
      }

      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase().trim();
        const searchable = `${donor.fullName} batch ${donor.batchYear} ${donor.bloodGroup} ${donor.preferredArea} ${donor.city} ${donor.institution || ''}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [
    registeredDonors,
    selectedBloodGroup,
    selectedArea,
    availabilityFilter,
    searchKeyword,
  ]);

  const handleSendPortalCoordinationPing = (donor: BloodDonorProfile) => {
    if (pingedDonorIds.includes(donor.userId)) return;
    setPingedDonorIds((prev) => [...prev, donor.userId]);
    pushPortalNotification({
      title: `🩸 Portal Donor Coordination Sent to ${donor.fullName}`,
      message: `Sent a privacy-protected ${donor.bloodGroup} blood coordination request to ${donor.fullName} (Batch ${donor.batchYear}, ${donor.preferredArea}).`,
      type: 'blood',
      targetRoute: 'emergency',
    });
    setCoordinationNotice(
      `Sent secure portal coordination ping to ${donor.fullName} (Batch ${donor.batchYear}). Private phone/email remain protected until the donor responds.`
    );
    setTimeout(() => setCoordinationNotice(null), 4500);
  };

  const clearFilters = () => {
    setSelectedBloodGroup('');
    setSelectedArea('');
    setAvailabilityFilter('all');
    setSearchKeyword('');
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Search Verified Alumni Blood Donors
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by blood group, preferred hospital corridor, and 90-day donation readiness.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Privacy-Protected Coordination Directory</span>
          </div>
        </div>

        {/* Blood Group Quick Selector Pills */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Filter by Blood Group
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedBloodGroup('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedBloodGroup === ''
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              All Groups ({registeredDonors.length})
            </button>
            {BLOOD_GROUPS_LIST.map((bg) => {
              const count = registeredDonors.filter((d) => d.bloodGroup === bg).length;
              const active = selectedBloodGroup === bg;
              return (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setSelectedBloodGroup(active ? '' : bg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                  }`}
                >
                  <span>{bg}</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      active ? 'text-rose-100' : 'text-slate-400'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Area, Availability & Keyword Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Preferred Area Filter */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              aria-label="Filter by Preferred Area"
              className="w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Hospital Areas & Corridors</option>
              {DONATION_AREAS_LIST.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <select
              value={availabilityFilter}
              onChange={(e) =>
                setAvailabilityFilter(
                  e.target.value as 'all' | 'available_now' | 'on_cooldown'
                )
              }
              aria-label="Filter by Donor Availability"
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Registered Availability</option>
              <option value="available_now">Available Now (90+ Day Interval Ready)</option>
              <option value="on_cooldown">In Cooldown / Rest Window</option>
            </select>
          </div>

          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, batch, hospital zone..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {(selectedBloodGroup || selectedArea || availabilityFilter !== 'all' || searchKeyword) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Showing <strong>{filteredDonors.length}</strong> matching alumni donor(s)
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {coordinationNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{coordinationNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setCoordinationNotice(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Donor Cards Grid */}
      {filteredDonors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <Heart className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            No matching donors found for the selected filters
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            You can post an Emergency Blood Request so all alumni in the {selectedBloodGroup || 'required'} cohort receive an instant notification alert.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Show All Donors
            </button>
            {onOpenRequestModal && (
              <button
                type="button"
                onClick={() =>
                  onOpenRequestModal(selectedBloodGroup || undefined)
                }
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Post Emergency Request
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map((donor) => {
            const interval = getDonorIntervalInfo(donor.lastDonationDate);
            const isAvailable =
              donor.availability === 'available' && interval.meetsStandardInterval;
            const isPinged = pingedDonorIds.includes(donor.userId);
            const isSelf = donor.userId === currentUser.id;

            return (
              <div
                key={donor.userId}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 transition-all shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Top Row: Avatar, Name, Batch, Blood Group Emblem */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={donor.avatarUrl}
                        alt={donor.fullName}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            onClick={() => onViewProfile && onViewProfile(donor.userId)}
                            className="font-bold text-sm text-slate-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                          >
                            {donor.fullName}
                          </h4>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                          Batch {donor.batchYear}
                          {donor.profession ? ` · ${donor.profession}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 font-black text-sm flex items-center justify-center shrink-0">
                      {donor.bloodGroup}
                    </div>
                  </div>

                  {/* Coordination Details (Privacy Safe — No Phone/Email/Home Address) */}
                  <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{donor.preferredArea}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{interval.label}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Status & Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-bold flex items-center gap-1.5 ${
                        isAvailable
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span>
                        {isAvailable ? 'Available for Coordination' : 'Cooldown / Rest Window'}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      {donor.donationHistory?.length || 0} logged donation(s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onViewProfile && (
                      <button
                        type="button"
                        onClick={() => onViewProfile(donor.userId)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                    )}

                    {!isSelf && (
                      <button
                        type="button"
                        disabled={isPinged}
                        onClick={() => handleSendPortalCoordinationPing(donor)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isPinged
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                      >
                        {isPinged ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Notified</span>
                          </>
                        ) : (
                          <>
                            <BellRing className="w-3.5 h-3.5" />
                            <span>Request Ping</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Medical & Privacy Footer Note */}
      <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
        <span>{HOSPITAL_ELIGIBILITY_DISCLAIMER}</span>
      </div>
    </div>
  );
};
