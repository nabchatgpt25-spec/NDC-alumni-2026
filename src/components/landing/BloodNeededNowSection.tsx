import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  BellRing,
  Eye,
  MapPin,
} from 'lucide-react';
import { BloodEmergencyRequest } from '../../types';
import {
  loadBloodRequests,
  loadPortalNotifications,
  respondToBloodRequest,
  savePortalNotifications,
} from '../../utils/bloodDonationService';
import { useAuth } from '../../context/AuthContext';
import {
  MagneticWrap,
  ScrollReveal,
  Tilt3DCard,
} from '../motion/CinematicMotion';

const dismissedSignaturesByVariant: Record<string, string | null> = {
  feed: null,
  profile: null,
};

interface BloodNeededNowSectionProps {
  onNavigateToBloodNetwork: () => void;
  variant?: 'landing' | 'feed' | 'profile';
}

export const BloodNeededNowSection: React.FC<BloodNeededNowSectionProps> = ({
  onNavigateToBloodNetwork,
  variant = 'landing',
}) => {
  const { isLoggedIn, currentUser } = useAuth();
  const [requests, setRequests] = useState<BloodEmergencyRequest[]>(() =>
    loadBloodRequests()
  );
  const [quickResponseMsg, setQuickResponseMsg] = useState<string | null>(null);
  const [seenTimestamp, setSeenTimestamp] = useState<string>('Just now');

  useEffect(() => {
    const sync = () => setRequests(loadBloodRequests());
    window.addEventListener('ndc_blood_network_updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ndc_blood_network_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const urgentActiveRequests = useMemo(() => {
    return requests
      .filter((r) => r.status === 'Active' || r.status === 'Donor Found')
      .sort((a, b) => {
        const rank = { critical: 3, urgent: 2, standard: 1 };
        return rank[b.emergencyLevel] - rank[a.emergencyLevel];
      })
      .slice(0, 3);
  }, [requests]);

  const currentSignature = useMemo(
    () => urgentActiveRequests.map((r) => r.id).join(','),
    [urgentActiveRequests]
  );

  const [isDismissed, setIsDismissed] = useState<boolean>(
    () =>
      variant !== 'landing' &&
      Boolean(currentSignature) &&
      dismissedSignaturesByVariant[variant] === currentSignature
  );

  useEffect(() => {
    if (
      variant !== 'landing' &&
      currentSignature &&
      dismissedSignaturesByVariant[variant] !== currentSignature
    ) {
      setIsDismissed(false);
    }
  }, [currentSignature, variant]);

  // Mark blood notifications as seen once popup appears in user's profile / feed
  useEffect(() => {
    if (variant === 'landing' || isDismissed || urgentActiveRequests.length === 0) return;
    setSeenTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    try {
      const currentNotifs = loadPortalNotifications();
      const hasUnreadBlood = currentNotifs.some((n) => n.type === 'blood' && n.unread);
      if (hasUnreadBlood) {
        const updated = currentNotifs.map((n) =>
          n.type === 'blood' ? { ...n, unread: false } : n
        );
        savePortalNotifications(updated);
      }
    } catch {
      // ignore storage errors
    }
  }, [variant, isDismissed, urgentActiveRequests.length]);

  const handleClosePopup = () => {
    if (variant !== 'landing') {
      dismissedSignaturesByVariant[variant] = currentSignature;
    }
    setIsDismissed(true);
  };

  if (urgentActiveRequests.length === 0) return null;

  const handleRespond = (req: BloodEmergencyRequest) => {
    if (!isLoggedIn) {
      onNavigateToBloodNetwork();
      return;
    }
    try {
      respondToBloodRequest(req.id, currentUser);
      setRequests(loadBloodRequests());
      setQuickResponseMsg(
        `Recorded your "I Can Donate" response for ${req.bloodGroup} at ${req.hospitalName}.`
      );
      setTimeout(() => setQuickResponseMsg(null), 4000);
    } catch {
      onNavigateToBloodNetwork();
    }
  };

  if (variant === 'feed' || variant === 'profile') {
    if (isDismissed) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in"
        onClick={handleClosePopup}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-rose-200/90 dark:border-rose-900/70 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        >
          {/* Top Accent Strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500" />

          {/* Popup Header with Seen Status & Cross (X) Close Button */}
          <div className="px-5 py-4 bg-gradient-to-r from-rose-50/90 via-white to-rose-50/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 border-b border-rose-100 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/25">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Emergency Blood Notification
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
                    <Eye className="w-3 h-3" />
                    Seen ({seenTimestamp})
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight mt-1">
                  Blood Needed Now ({urgentActiveRequests.length} Urgent Request{urgentActiveRequests.length > 1 ? 's' : ''})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Appeared in {currentUser.fullName}&apos;s profile · Click the × button to close
                </p>
              </div>
            </div>

            {/* Cross (X) Button to Close Popup */}
            <button
              type="button"
              onClick={handleClosePopup}
              aria-label="Close blood notification popup"
              title="Close notification"
              className="p-2 rounded-full bg-slate-100 hover:bg-rose-600 dark:bg-slate-800 dark:hover:bg-rose-600 text-slate-700 hover:text-white dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shrink-0 shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Popup Body: Urgent Requests List */}
          <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
            {quickResponseMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{quickResponseMsg}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {urgentActiveRequests.map((req) => {
                const hasResponded = req.responses.some(
                  (r) => r.donorUserId === currentUser.id
                );
                return (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white font-black text-sm flex flex-col items-center justify-center shrink-0 shadow-xs">
                        <span>{req.bloodGroup}</span>
                        <span className="text-[9px] font-semibold opacity-90">
                          {req.unitsRequired} {req.unitsRequired === 1 ? 'Unit' : 'Units'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                              req.emergencyLevel === 'critical'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {req.emergencyLevel}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Batch {req.requesterBatch}
                          </span>
                        </div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate mt-1">
                          {req.hospitalName}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{req.hospitalArea}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{req.requiredDateTime}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => handleRespond(req)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          hasResponded
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-600/20'
                        }`}
                      >
                        {hasResponded ? '✓ Responded' : 'I Can Donate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popup Footer */}
          <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClosePopup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Seen & Close</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleClosePopup();
                onNavigateToBloodNetwork();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>Open Blood Network</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-5 sm:py-7 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>EMERGENCY ALUMNI BLOOD NETWORK</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Blood Needed Now
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Urgent verified blood requests for Notredamians and their families. Hospital blood banks confirm donor eligibility.
              </p>
            </div>

            <MagneticWrap className="self-start sm:self-auto">
              <button
                type="button"
                onClick={onNavigateToBloodNetwork}
                className="btn-interactive inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Enter Blood Network</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </MagneticWrap>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {urgentActiveRequests.map((req) => (
            <Tilt3DCard
              key={req.id}
              onClick={onNavigateToBloodNetwork}
              className="group p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-rose-500/60 transition-all cursor-pointer flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white font-black text-sm flex flex-col items-center justify-center shrink-0 shadow-xs">
                      <span>{req.bloodGroup}</span>
                      <span className="text-[9px] font-semibold opacity-90">
                        {req.unitsRequired}u
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        {req.emergencyLevel} · {req.status}
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {req.hospitalName}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-2.5 leading-relaxed">
                  {req.description}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 truncate">
                  <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{req.requiredDateTime}</span>
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                  I Can Donate →
                </span>
              </div>
            </Tilt3DCard>
          ))}
        </div>
      </div>
    </section>
  );
};
