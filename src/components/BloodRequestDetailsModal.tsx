import React, { useState, useMemo } from 'react';
import {
  X,
  Heart,
  MapPin,
  Clock,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Lock,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  BloodDonorProfile,
  BloodEmergencyRequest,
  BloodRequestStatus,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  canModifyBloodRequest,
  confirmDonorDonationOnRequest,
  respondToBloodRequest,
  updateBloodRequestStatus,
} from '../utils/bloodDonationService';
import {
  HOSPITAL_ELIGIBILITY_DISCLAIMER,
  matchDonorsForRequest,
} from '../utils/bloodMatching';

interface BloodRequestDetailsModalProps {
  request: BloodEmergencyRequest | null;
  donors: BloodDonorProfile[];
  isModeratorMode?: boolean;
  onClose: () => void;
  onUpdated: (updated: BloodEmergencyRequest) => void;
  onViewProfile?: (userId: number) => void;
}

const ALL_STATUSES: BloodRequestStatus[] = [
  'Pending Verification',
  'Active',
  'Donor Found',
  'Donation Confirmed',
  'Fulfilled',
  'Cancelled',
  'Expired',
];

export const BloodRequestDetailsModal: React.FC<BloodRequestDetailsModalProps> = ({
  request,
  donors,
  isModeratorMode = false,
  onClose,
  onUpdated,
  onViewProfile,
}) => {
  const { currentUser } = useAuth();
  const [responseNote, setResponseNote] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const matchedDonors = useMemo(() => {
    if (!request) return [];
    return matchDonorsForRequest(request, donors, { includeCooldownDonors: true }).slice(0, 6);
  }, [request, donors]);

  if (!request) return null;

  const isRequester =
    request.requesterId === currentUser.id || request.requesterId === currentUser.userId;
  const canManage = canModifyBloodRequest(request, currentUser, isModeratorMode);
  const hasAlreadyResponded = request.responses.some(
    (r) => r.donorUserId === currentUser.id
  );
  const isClosed =
    request.status === 'Fulfilled' ||
    request.status === 'Cancelled' ||
    request.status === 'Expired';

  const handleICanDonate = async () => {
    setErrorMsg(null);
    try {
      const updated = await respondToBloodRequest(request.id, currentUser, responseNote);
      setResponseNote('');
      setFeedbackMsg(
        'Your "I Can Donate" response has been recorded and the requester has been notified via the portal notification system.'
      );
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not record response.');
    }
  };

  const handleConfirmDonor = (responseId: string) => {
    setErrorMsg(null);
    try {
      const updated = confirmDonorDonationOnRequest(
        request.id,
        responseId,
        currentUser,
        isModeratorMode
      );
      setFeedbackMsg('Donation confirmed and blood request status updated.');
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not confirm donation.');
    }
  };

  const handleStatusChange = (nextStatus: BloodRequestStatus) => {
    setErrorMsg(null);
    try {
      const updated = updateBloodRequestStatus(request.id, nextStatus, currentUser, {
        isModeratorMode,
      });
      setFeedbackMsg(`Request status updated to "${nextStatus}".`);
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unauthorized status change.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md">
              {request.bloodGroup}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                <span className="font-bold uppercase tracking-wider text-rose-300">
                  {request.emergencyLevel} Priority
                </span>
                <span>·</span>
                <span>Status: {request.status}</span>
                <span>·</span>
                <span>
                  {request.unitsFulfilled}/{request.unitsRequired} Unit(s) Confirmed
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base text-white truncate mt-0.5">
                {request.hospitalName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {feedbackMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Request Key Facts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
                <Building2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{request.hospitalName}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {request.hospitalArea}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Required: <strong>{request.requiredDateTime}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Lock className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  Coordination: <strong>{request.contactMethod}</strong>
                </span>
              </div>
              {request.coordinationRef && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Hospital Desk Ref: {request.coordinationRef}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
                <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  Requester:{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewProfile) {
                        onClose();
                        onViewProfile(request.requesterId);
                      }
                    }}
                    className="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
                  >
                    {request.requesterName}
                  </button>{' '}
                  (Batch {request.requesterBatch})
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Request Details & Clinical Context
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {request.description}
            </p>
          </div>

          {/* "I Can Donate" Donor Response Action Box */}
          {!isClosed && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-600" />
                    <span>Respond to Help This Notredamian Family</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Your private phone and email stay protected. Responding notifies {request.requesterName} via the portal notification bell.
                  </p>
                </div>
              </div>

              {hasAlreadyResponded ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    You have responded "I Can Donate" to this request. Please coordinate at the hospital blood bank desk for screening.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Optional coordination note (e.g. Available at DMCH by 5 PM for cross-match)..."
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleICanDonate}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 inline-flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>I Can Donate</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recorded Donor Responses */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Alumni Donor Responses ({request.responses.length})
            </h4>

            {request.responses.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                No donor responses recorded yet. Click <strong>"I Can Donate"</strong> above if you are available to coordinate.
              </div>
            ) : (
              <div className="space-y-2">
                {request.responses.map((resp) => (
                  <div
                    key={resp.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={resp.donorAvatar}
                        alt={resp.donorName}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {resp.donorName}
                          </span>
                          <span className="text-slate-500">
                            · Batch {resp.donorBatchYear} · {resp.donorBloodGroup}
                          </span>
                          <span className="text-slate-400">· {resp.respondedAt}</span>
                        </div>
                        {resp.note && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            "{resp.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {resp.status === 'confirmed_donated' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Donation Confirmed</span>
                        </span>
                      ) : canManage ? (
                        <button
                          type="button"
                          onClick={() => handleConfirmDonor(resp.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Confirm Donation</span>
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          Response Offered
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Automated Donor Matching Engine Recommendations */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Matched {request.bloodGroup} Alumni Donors Nearby ({matchedDonors.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                Ranked by blood group, corridor, availability & 90-day interval
              </span>
            </div>

            {matchedDonors.length === 0 ? (
              <p className="text-xs text-slate-500">
                No registered donors found for {request.bloodGroup} in this corridor yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedDonors.map((item) => (
                  <div
                    key={item.donor.userId}
                    className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.donor.avatarUrl}
                        alt={item.donor.fullName}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {item.donor.fullName}{' '}
                          <span className="font-normal text-slate-500">
                            (B-{item.donor.batchYear})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.matchReasons.slice(0, 2).join(' · ')}
                        </div>
                      </div>
                    </div>
                    <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">
                      {item.donor.bloodGroup}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requester / Moderator Status Management Bar */}
          {canManage && (
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>
                    {isRequester
                      ? 'Manage Your Blood Request Status'
                      : 'Moderator Request Status Control'}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Current: <strong>{request.status}</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      request.status === st
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mandatory Hospital Disclaimer */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            {HOSPITAL_ELIGIBILITY_DISCLAIMER}
          </div>
        </div>
      </div>
    </div>
  );
};
