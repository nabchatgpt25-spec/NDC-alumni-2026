import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  ShieldCheck,
  MapPin,
  Clock,
  Plus,
  Search,
  Users,
  CheckCircle2,
  AlertTriangle,
  Building2,
  SlidersHorizontal,
  Lock,
  UserCheck,
  XCircle,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronUp,
  Droplet,
} from 'lucide-react';
import {
  BloodDonorProfile,
  BloodEmergencyRequest,
  BloodGroup,
  BloodRequestStatus,
  BLOOD_GROUPS_LIST,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  DONATION_AREAS_LIST,
  getDonorProfileByUserId,
  loadBloodDonors,
  loadBloodRequests,
  respondToBloodRequest,
  updateBloodRequestStatus,
} from '../utils/bloodDonationService';
import {
  getBloodGroupOverviewStats,
  getDonorIntervalInfo,
  HOSPITAL_ELIGIBILITY_DISCLAIMER,
  matchDonorsForRequest,
} from '../utils/bloodMatching';
import { BloodDonorRegistration } from './BloodDonorRegistration';
import { BloodDonorSearch } from './BloodDonorSearch';
import { BloodRequestModal } from './BloodRequestModal';
import { BloodRequestDetailsModal } from './BloodRequestDetailsModal';
import {
  fetchBloodRequestsFromDb,
  fetchBloodDonorsFromDb,
} from '../services/supabaseService';

interface BloodNetworkViewProps {
  onViewProfile?: (userId: number) => void;
  onNavigate?: (route: string) => void;
}

type BloodNetworkTab = 'dashboard' | 'search_donors' | 'donor_profile' | 'moderation';

export const BloodNetworkView: React.FC<BloodNetworkViewProps> = ({
  onViewProfile,
}) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<BloodNetworkTab>('dashboard');
  const [requests, setRequests] = useState<BloodEmergencyRequest[]>(() =>
    loadBloodRequests()
  );
  const [donors, setDonors] = useState<BloodDonorProfile[]>(() =>
    loadBloodDonors()
  );

  // Dashboard filters
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | ''>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'active_all' | BloodRequestStatus>('active_all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestModalPrefillGroup, setRequestModalPrefillGroup] = useState<
    BloodGroup | undefined
  >(undefined);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Feedback banner
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const syncData = () => {
    const localReqs = loadBloodRequests();
    const localDonors = loadBloodDonors();
    setRequests(localReqs);
    setDonors(localDonors);

    // Fetch live requests and donors from Supabase
    fetchBloodRequestsFromDb()
      .then((dbReqs) => {
        if (dbReqs && dbReqs.length > 0) {
          setRequests((prev) => {
            const map = new Map<string, BloodEmergencyRequest>();
            dbReqs.forEach((r) => map.set(r.id, r));
            prev.forEach((r) => {
              if (!map.has(r.id)) map.set(r.id, r);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => {
        console.warn('BloodNetworkView: Supabase requests fetch fallback:', err);
      });

    fetchBloodDonorsFromDb()
      .then((dbDonors) => {
        if (dbDonors && dbDonors.length > 0) {
          setDonors((prev) => {
            const map = new Map<number, BloodDonorProfile>();
            dbDonors.forEach((d) => map.set(d.userId, d));
            prev.forEach((d) => {
              if (!map.has(d.userId)) map.set(d.userId, d);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => {
        console.warn('BloodNetworkView: Supabase donors fetch fallback:', err);
      });
  };

  useEffect(() => {
    syncData();
    window.addEventListener('ndc_blood_network_updated', syncData);
    window.addEventListener('storage', syncData);
    return () => {
      window.removeEventListener('ndc_blood_network_updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  const myDonorProfile = useMemo(
    () => getDonorProfileByUserId(currentUser.id),
    [donors, currentUser.id]
  );

  const bloodGroupStats = useMemo(
    () => getBloodGroupOverviewStats(donors, requests),
    [donors, requests]
  );

  const activeRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status === 'Active' ||
          r.status === 'Donor Found' ||
          r.status === 'Donation Confirmed'
      ),
    [requests]
  );

  const pendingModerationRequests = useMemo(
    () => requests.filter((r) => r.status === 'Pending Verification'),
    [requests]
  );

  const fulfilledRequests = useMemo(
    () => requests.filter((r) => r.status === 'Fulfilled'),
    [requests]
  );

  const availableDonorsCount = useMemo(
    () =>
      donors.filter(
        (d) =>
          d.isRegisteredDonor &&
          d.availability === 'available' &&
          getDonorIntervalInfo(d.lastDonationDate).meetsStandardInterval
      ).length,
    [donors]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter === 'active_all') {
        if (
          req.status !== 'Active' &&
          req.status !== 'Donor Found' &&
          req.status !== 'Donation Confirmed'
        ) {
          return false;
        }
      } else if (req.status !== statusFilter) {
        return false;
      }

      if (selectedBloodGroup && req.bloodGroup !== selectedBloodGroup) {
        return false;
      }

      if (selectedArea) {
        const firstToken = selectedArea.split('/')[0].trim().toLowerCase();
        const reqLoc = `${req.hospitalArea} ${req.hospitalName}`.toLowerCase();
        if (!reqLoc.includes(firstToken)) return false;
      }

      return true;
    });
  }, [requests, statusFilter, selectedBloodGroup, selectedArea]);

  const areaDiscoverySummary = useMemo(() => {
    return DONATION_AREAS_LIST.slice(0, 6).map((area) => {
      const firstToken = area.split('/')[0].trim().toLowerCase();
      const areaDonors = donors.filter(
        (d) =>
          d.isRegisteredDonor &&
          d.preferredArea.toLowerCase().includes(firstToken)
      );
      const readyCount = areaDonors.filter(
        (d) =>
          d.availability === 'available' &&
          getDonorIntervalInfo(d.lastDonationDate).meetsStandardInterval
      ).length;
      return {
        area,
        shortLabel: area.split('(')[0].trim(),
        hospitalsLabel: area.includes('(')
          ? area.slice(area.indexOf('(') + 1, area.lastIndexOf(')'))
          : 'Regional Hospitals',
        totalDonors: areaDonors.length,
        readyCount,
      };
    });
  }, [donors]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );

  const showNotice = (msg: string) => {
    setActionBanner(msg);
    setTimeout(() => setActionBanner(null), 4500);
  };

  const handleQuickICanDonate = (req: BloodEmergencyRequest) => {
    try {
      respondToBloodRequest(req.id, currentUser);
      syncData();
      showNotice(
        `Recorded your "I Can Donate" response for ${req.bloodGroup} at ${req.hospitalName}. ${req.requesterName} has been notified.`
      );
    } catch (err: any) {
      showNotice(err?.message || 'Could not submit response.');
    }
  };

  const handleModerationAction = (
    req: BloodEmergencyRequest,
    newStatus: BloodRequestStatus,
    moderationNote?: string
  ) => {
    try {
      updateBloodRequestStatus(req.id, newStatus, currentUser, {
        isModeratorMode: true,
        moderationNote,
      });
      syncData();
      showNotice(`Request "${req.hospitalName}" (${req.bloodGroup}) updated to ${newStatus}.`);
    } catch (err: any) {
      showNotice(err?.message || 'Could not update request status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Header (Simple, High-Impact, 5-Second Comprehension) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl liquid-glass-panel">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span>Notre Dame Alumni Emergency Blood Network</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Emergency Blood Network
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Rapid, peer-to-peer blood donation and verified donor matching for Notredamians and their families across Bangladesh with zero private contact exposure.
            </p>

            {/* Quick Network Metrics */}
            <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>
                  <strong className="text-white font-bold">{activeRequests.length}</strong> Blood Needed Now
                </span>
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-emerald-400 font-bold">{availableDonorsCount}</strong> Donors Ready
                </span>
              </span>
              <span className="text-slate-600">·</span>
              <span>
                <strong className="text-white font-bold">
                  {donors.filter((d) => d.isRegisteredDonor).length}
                </strong>{' '}
                Registered Alumni Donors
              </span>
              <span className="text-slate-600">·</span>
              <span>
                <strong className="text-amber-300 font-bold">{fulfilledRequests.length}</strong> Fulfilled
              </span>
            </div>
          </div>

          {/* Two Clear Primary Actions: "I Need Blood" and "I Want to Donate" */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-2.5 sm:gap-3 shrink-0 sm:w-auto w-full">
            <button
              type="button"
              onClick={() => {
                setRequestModalPrefillGroup(undefined);
                setIsRequestModalOpen(true);
              }}
              className="px-4 min-[360px]:px-6 py-3 min-[360px]:py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs min-[360px]:text-sm sm:text-base shadow-xl shadow-rose-600/30 inline-flex items-center justify-center gap-2.5 sm:gap-3 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 min-[360px]:w-5 min-[360px]:h-5 text-white" />
              </div>
              <div className="text-left min-w-0">
                <div className="leading-tight truncate">I Need Blood</div>
                <div className="text-[10px] min-[360px]:text-[11px] font-semibold text-rose-100 opacity-90 truncate">
                  Post Emergency Request
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('donor_profile')}
              className="px-4 min-[360px]:px-6 py-3 min-[360px]:py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs min-[360px]:text-sm sm:text-base shadow-xl shadow-blue-600/30 inline-flex items-center justify-center gap-2.5 sm:gap-3 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 min-[360px]:w-5 min-[360px]:h-5 text-rose-200 fill-rose-200" />
              </div>
              <div className="text-left min-w-0">
                <div className="leading-tight truncate">I Want to Donate</div>
                <div className="text-[10px] min-[360px]:text-[11px] font-semibold text-blue-100 opacity-90 truncate">
                  {myDonorProfile?.isRegisteredDonor
                    ? `My Profile (${myDonorProfile.bloodGroup})`
                    : 'Register as Blood Donor'}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>Blood Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search_donors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'search_donors'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Donors ({donors.filter((d) => d.isRegisteredDonor).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('donor_profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'donor_profile'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Donor Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'moderation'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Moderation</span>
            {pendingModerationRequests.length > 0 && (
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'moderation'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                }`}
              >
                {pendingModerationRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 pr-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Hospital blood bank confirms donor eligibility</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {actionBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: BLOOD NETWORK DASHBOARD                                      */}
      {/* =================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 1. Blood Needed Now (Prominent, High-Priority Requests) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-rose-600 dark:text-rose-400 fill-rose-600 dark:fill-rose-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Blood Needed Now
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-extrabold">
                      {filteredRequests.length} Open
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Active emergency broadcasts. Respond with "I Can Donate" if you can help.
                  </p>
                </div>
              </div>

              {/* Action Controls & Filter Toggle */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {(selectedBloodGroup || selectedArea || statusFilter !== 'active_all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBloodGroup('');
                      setSelectedArea('');
                      setStatusFilter('active_all');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    showAdvancedFilters
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {showAdvancedFilters ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Secondary Filter Drawer */}
            {showAdvancedFilters && (
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                  <span>Filter by:</span>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'active_all' | BloodRequestStatus)
                  }
                  aria-label="Filter by Request Status"
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  <option value="active_all">All Open & Active Requests</option>
                  <option value="Active">Active</option>
                  <option value="Donor Found">Donor Found</option>
                  <option value="Donation Confirmed">Donation Confirmed</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Expired">Expired</option>
                </select>

                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  aria-label="Filter by Hospital Corridor"
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 max-w-xs"
                >
                  <option value="">All Hospital Corridors</option>
                  {DONATION_AREAS_LIST.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Request Cards Grid */}
            {filteredRequests.length === 0 ? (
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800 space-y-3">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No emergency blood requests match your current criteria.
                </p>
                <div className="flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBloodGroup('');
                      setSelectedArea('');
                      setStatusFilter('active_all');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Post an Emergency Request
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredRequests.map((req) => {
                  const hasResponded = req.responses.some(
                    (r) => r.donorUserId === currentUser.id
                  );
                  const isClosed =
                    req.status === 'Fulfilled' ||
                    req.status === 'Cancelled' ||
                    req.status === 'Expired';

                  return (
                    <div
                      key={req.id}
                      className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border transition-all shadow-xs hover:shadow-md flex flex-col justify-between gap-4 ${
                        req.emergencyLevel === 'critical' && !isClosed
                          ? 'border-rose-400/80 dark:border-rose-800/90 ring-1 ring-rose-500/20'
                          : 'border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Top: Blood Group Badge + Urgency + Hospital Info */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Prominent Blood Group Emblem */}
                            <div
                              className={`w-14 h-14 rounded-2xl font-black text-lg flex flex-col items-center justify-center shrink-0 shadow-sm ${
                                req.emergencyLevel === 'critical' && !isClosed
                                  ? 'bg-rose-600 text-white shadow-rose-600/20'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              <span className="leading-tight">{req.bloodGroup}</span>
                              <span className="text-[10px] font-bold opacity-90 leading-tight">
                                {req.unitsRequired} {req.unitsRequired === 1 ? 'Unit' : 'Units'}
                              </span>
                            </div>

                            <div className="min-w-0">
                              {/* Urgency & Time badge */}
                              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                    req.emergencyLevel === 'critical'
                                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                      : req.emergencyLevel === 'urgent'
                                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                      : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  }`}
                                >
                                  {req.emergencyLevel}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>Needed: {req.requiredDateTime}</span>
                                </span>
                              </div>

                              {/* Hospital Name (Clear & Bold) */}
                              <h3
                                onClick={() => setSelectedRequestId(req.id)}
                                className="font-black text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer mt-1 leading-snug line-clamp-1"
                              >
                                {req.hospitalName}
                              </h3>

                              {/* Hospital Area */}
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{req.hospitalArea}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Patient Context / Brief Note */}
                        {req.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {req.description}
                          </p>
                        )}
                      </div>

                      {/* Card Bottom Actions: Requester + "I Can Donate" + "Details" */}
                      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                        <div
                          onClick={() => onViewProfile && onViewProfile(req.requesterId)}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <img
                            src={req.requesterAvatar}
                            alt={req.requesterName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div className="text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                              {req.requesterName}
                            </span>
                            <span className="text-slate-400 ml-1">
                              (B-{req.requesterBatch})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestId(req.id)}
                            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Details
                          </button>

                          {!isClosed && (
                            <button
                              type="button"
                              disabled={hasResponded}
                              onClick={() => handleQuickICanDonate(req)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                                hasResponded
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 hover:scale-[1.02] active:scale-[0.98]'
                              }`}
                            >
                              {hasResponded ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Responded</span>
                                </>
                              ) : (
                                <>
                                  <Heart className="w-3.5 h-3.5 fill-white" />
                                  <span>I Can Donate</span>
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
          </div>

          {/* 2. Find Donors by Blood Group (Compact & Scannable) */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>Find Donors by Blood Group</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your blood group to filter emergency requests or discover available alumni donors.
                </p>
              </div>
              {selectedBloodGroup && (
                <button
                  type="button"
                  onClick={() => setSelectedBloodGroup('')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto"
                >
                  Clear Group Filter ({selectedBloodGroup})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {bloodGroupStats.map((stat) => {
                const isSelected = selectedBloodGroup === stat.bloodGroup;
                return (
                  <button
                    key={stat.bloodGroup}
                    type="button"
                    onClick={() =>
                      setSelectedBloodGroup(isSelected ? '' : stat.bloodGroup)
                    }
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                        : 'bg-white/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-rose-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-base font-black tracking-tight ${
                          isSelected ? 'text-white' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {stat.bloodGroup}
                      </span>
                      {stat.activeRequests > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {stat.unitsNeeded}u
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-0.5">
                      <div
                        className={`text-[11px] font-bold ${
                          isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {stat.availableDonors} Ready
                      </div>
                      <div
                        className={`text-[10px] ${
                          isSelected
                            ? 'text-rose-100'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {stat.totalDonors} Registered
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Hospital Corridor & Area-Based Donor Discovery (Compact & Easy to Scan) */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>Hospital Corridors & Nearby Donors</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ready Notredamian donors mapped to major hospital zones for fast emergency arrival.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('search_donors')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>Open Full Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {areaDiscoverySummary.map((item) => (
                <div
                  key={item.area}
                  onClick={() => {
                    setSelectedArea(item.area);
                    setActiveTab('search_donors');
                  }}
                  className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.shortLabel}
                      </h3>
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {item.hospitalsLabel}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                      {item.readyCount} Ready Now
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] group-hover:text-blue-500 flex items-center gap-0.5">
                      <span>{item.totalDonors} Donors</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Recent Fulfilled Requests (Lower and Smaller) */}
          {fulfilledRequests.length > 0 && (
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Recent Fulfilled Donations</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Successful alumni blood donations confirmed at partner hospitals.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {fulfilledRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className="p-3 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 hover:border-emerald-400 transition-all cursor-pointer flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                        {req.bloodGroup} · {req.unitsRequired} Unit(s) Fulfilled
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {req.hospitalName}
                      </h4>
                      <div className="text-[10px] text-slate-400">
                        {req.updatedAt}
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical/Medical Guidance Footer (Subtle & Unobtrusive) */}
          <div className="p-3.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                All donor eligibility checks, TTI screening, and blood cross-matching are conducted on-site by certified hospital blood banks following DGHS national guidelines.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('moderation')}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Moderation Desk →
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SEARCH DONORS                                                */}
      {/* =================================================================== */}
      {activeTab === 'search_donors' && (
        <BloodDonorSearch
          donors={donors}
          initialBloodGroup={selectedBloodGroup}
          initialArea={selectedArea}
          onViewProfile={onViewProfile}
          onOpenRequestModal={(prefillGroup) => {
            setRequestModalPrefillGroup(prefillGroup);
            setIsRequestModalOpen(true);
          }}
        />
      )}

      {/* =================================================================== */}
      {/* TAB 3: MY DONOR PROFILE                                             */}
      {/* =================================================================== */}
      {activeTab === 'donor_profile' && (
        <BloodDonorRegistration
          onSaved={() => {
            syncData();
          }}
        />
      )}

      {/* =================================================================== */}
      {/* TAB 4: ADMIN / MODERATION FOUNDATION                                */}
      {/* =================================================================== */}
      {activeTab === 'moderation' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>Emergency Blood Network Moderation & Verification Desk</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify pending blood requests, activate verified requests, cancel suspicious entries, mark requests fulfilled, or manage expired requests.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {pendingModerationRequests.length} Pending Verification
              </span>
            </div>

            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {req.bloodGroup} ({req.unitsFulfilled}/{req.unitsRequired}u)
                      </span>
                      <span>·</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {req.hospitalName}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        Status: {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                      {req.description}
                    </p>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Requester: <strong>{req.requesterName}</strong> (Batch {req.requesterBatch}) · Created: {req.createdAt}
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {req.status === 'Pending Verification' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleModerationAction(
                            req,
                            'Active',
                            'Verified and activated by Moderation Desk'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Verify & Activate</span>
                      </button>
                    )}

                    {req.status !== 'Fulfilled' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleModerationAction(
                            req,
                            'Fulfilled',
                            'Marked fulfilled by Moderation Desk'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Fulfilled</span>
                      </button>
                    )}

                    {req.status !== 'Expired' && req.status !== 'Fulfilled' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleModerationAction(
                            req,
                            'Expired',
                            'Marked expired by Moderation Desk'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        Mark Expired
                      </button>
                    )}

                    {req.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleModerationAction(
                            req,
                            'Cancelled',
                            'Cancelled by Moderation Desk'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Request</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedRequestId(req.id)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Medical & Transfusion Safety Disclaimer Footer */}
      <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>{HOSPITAL_ELIGIBILITY_DISCLAIMER}</span>
      </div>

      {/* Create Emergency Blood Request Modal */}
      <BloodRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        initialBloodGroup={requestModalPrefillGroup}
        donors={donors}
        onCreated={(newReq, matchedCount) => {
          syncData();
          showNotice(
            `Emergency ${newReq.bloodGroup} blood request published! ${matchedCount} matching alumni donor(s) identified and notified.`
          );
        }}
      />

      {/* Blood Request Details & Donor Response Modal */}
      <BloodRequestDetailsModal
        request={selectedRequest}
        donors={donors}
        isModeratorMode={activeTab === 'moderation'}
        onClose={() => setSelectedRequestId(null)}
        onUpdated={() => {
          syncData();
        }}
        onViewProfile={onViewProfile}
      />
    </div>
  );
};
