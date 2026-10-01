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

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestModalPrefillGroup, setRequestModalPrefillGroup] = useState<
    BloodGroup | undefined
  >(undefined);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Feedback banner
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const syncData = () => {
    setRequests(loadBloodRequests());
    setDonors(loadBloodDonors());
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
      {/* Top Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-rose-400">
              <Heart className="w-4 h-4 text-rose-400 shrink-0" />
              <span>NOTRE DAME ALUMNI EMERGENCY BLOOD NETWORK</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400">Zero Private Contact Exposure</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Fraternal Blood Donation & Emergency Coordination
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Rapid peer-to-peer blood request broadcasting, hospital corridor matching, and privacy-safe coordination for Notredamians and their families across Bangladesh.
            </p>

            {/* Quick Network Metrics */}
            <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
              <span>
                <strong className="text-white">{activeRequests.length}</strong> Active Emergency Request(s)
              </span>
              <span className="text-slate-600">·</span>
              <span>
                <strong className="text-emerald-400">{availableDonorsCount}</strong> Ready Donor(s) Available Now
              </span>
              <span className="text-slate-600">·</span>
              <span>
                <strong className="text-white">
                  {donors.filter((d) => d.isRegisteredDonor).length}
                </strong>{' '}
                Total Registered Alumni Donors
              </span>
              <span className="text-slate-600">·</span>
              <span>
                <strong className="text-amber-300">{fulfilledRequests.length}</strong> Recent Fulfilled
              </span>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setRequestModalPrefillGroup(undefined);
                setIsRequestModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-rose-600/25 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post Emergency Blood Request</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('donor_profile')}
              className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-rose-300" />
              <span>
                {myDonorProfile?.isRegisteredDonor
                  ? `My Donor Profile (${myDonorProfile.bloodGroup})`
                  : 'Register as a Blood Donor'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
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
            <Heart className="w-3.5 h-3.5" />
            <span>Blood Network Dashboard</span>
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
            <span>Moderation & Verification</span>
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
          {/* 1. Blood Group Overview Matrix (8 Blood Groups) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Blood Group Overview & Donor Readiness
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select any blood group below to filter active emergency requests or discover available alumni donors.
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
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-rose-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-lg font-black tracking-tight ${
                          isSelected ? 'text-white' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {stat.bloodGroup}
                      </span>
                      {stat.activeRequests > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {stat.unitsNeeded}u needed
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 space-y-0.5">
                      <div
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {stat.availableDonors} Ready
                      </div>
                      <div
                        className={`text-[10px] ${
                          isSelected
                            ? 'text-rose-100'
                            : 'text-slate-500 dark:text-slate-400'
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

          {/* 2. Emergency & Active Blood Requests Section */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Emergency & Active Blood Requests
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Respond with "I Can Donate" to notify the requesting alumnus and coordinate at the hospital blood bank.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'active_all' | BloodRequestStatus)
                  }
                  aria-label="Filter by Request Status"
                  className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
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
                  className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 max-w-xs"
                >
                  <option value="">All Hospital Corridors</option>
                  {DONATION_AREAS_LIST.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800 space-y-3">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No blood requests match the current filter.
                </p>
                <div className="flex items-center justify-center gap-2">
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
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                  >
                    New Emergency Request
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredRequests.map((req) => {
                  const matchedDonors = matchDonorsForRequest(req, donors);
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
                      className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between gap-4 ${
                        req.emergencyLevel === 'critical' && !isClosed
                          ? 'border-rose-300 dark:border-rose-800/80'
                          : 'border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Top Header: Blood Group Emblem + Hospital + Priority/Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div
                              className={`w-13 h-13 rounded-2xl font-black text-base flex flex-col items-center justify-center shrink-0 shadow-xs ${
                                req.emergencyLevel === 'critical' && !isClosed
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              <span>{req.bloodGroup}</span>
                              <span className="text-[9px] font-bold opacity-85">
                                {req.unitsRequired} {req.unitsRequired === 1 ? 'Unit' : 'Units'}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                                <span
                                  className={
                                    req.emergencyLevel === 'critical'
                                      ? 'text-rose-600 dark:text-rose-400 uppercase'
                                      : req.emergencyLevel === 'urgent'
                                      ? 'text-amber-600 dark:text-amber-400 uppercase'
                                      : 'text-blue-600 dark:text-blue-400 uppercase'
                                  }
                                >
                                  {req.emergencyLevel}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <span className="text-slate-600 dark:text-slate-300">
                                  {req.status}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <span className="text-slate-400 font-normal">
                                  {req.createdAt}
                                </span>
                              </div>

                              <h3
                                onClick={() => setSelectedRequestId(req.id)}
                                className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer mt-0.5 line-clamp-1"
                              >
                                {req.hospitalName}
                              </h3>

                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{req.hospitalArea}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          {req.description}
                        </p>

                        {/* Metadata Line: Required Time, Coordination Method, Matched Donors */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Required: {req.requiredDateTime}</span>
                          </span>
                          <span>·</span>
                          <span>{req.contactMethod}</span>
                          <span>·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {matchedDonors.length} Matched {req.bloodGroup} Donor(s)
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Requester + "I Can Donate" & Details Buttons */}
                      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div
                          onClick={() =>
                            onViewProfile && onViewProfile(req.requesterId)
                          }
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <img
                            src={req.requesterAvatar}
                            alt={req.requesterName}
                            className="w-7 h-7 rounded-full object-cover"
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
                            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Details ({req.responses.length})
                          </button>

                          {!isClosed && (
                            <button
                              type="button"
                              disabled={hasResponded}
                              onClick={() => handleQuickICanDonate(req)}
                              className={`px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                hasResponded
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                              }`}
                            >
                              {hasResponded ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Responded</span>
                                </>
                              ) : (
                                <>
                                  <Heart className="w-3.5 h-3.5" />
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

          {/* 3. Nearby / Area-Based Donor Discovery */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Hospital Corridor & Area-Based Donor Discovery
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Discover available Notredamian blood donors near major hospital zones in Dhaka and regional chapters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('search_donors')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>Open Full Donor Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {areaDiscoverySummary.map((item) => (
                <div
                  key={item.area}
                  onClick={() => {
                    setSelectedArea(item.area);
                    setActiveTab('search_donors');
                  }}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {item.shortLabel}
                      </h3>
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {item.hospitalsLabel}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {item.readyCount} Available Now
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.totalDonors} Total Donors →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Recent Fulfilled Requests */}
          {fulfilledRequests.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Recent Fulfilled Blood Requests</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Successful alumni blood donations confirmed at partner hospitals.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {fulfilledRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 hover:border-emerald-400 transition-all cursor-pointer flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <span>{req.bloodGroup} · {req.unitsRequired} Unit(s) Fulfilled</span>
                        <span>·</span>
                        <span className="font-normal text-slate-500">{req.updatedAt}</span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {req.hospitalName}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        {req.description}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}
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
