import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Clock,
  ArrowRight,
  X,
} from 'lucide-react';
import { BloodEmergencyRequest } from '../../types';
import {
  loadBloodRequests,
  isBloodBannerDismissed,
  dismissBloodBanner,
} from '../../utils/bloodDonationService';
import {
  MagneticWrap,
  ScrollReveal,
  Tilt3DCard,
} from '../motion/CinematicMotion';

interface BloodNeededNowSectionProps {
  onNavigateToBloodNetwork: () => void;
  variant?: 'landing' | 'feed' | 'profile';
}

export const BloodNeededNowSection: React.FC<BloodNeededNowSectionProps> = ({
  onNavigateToBloodNetwork,
  variant = 'landing',
}) => {
  // If variant is profile, do not show any notification
  if (variant === 'profile') {
    return null;
  }

  const [requests, setRequests] = useState<BloodEmergencyRequest[]>(() =>
    loadBloodRequests()
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    isBloodBannerDismissed()
  );

  useEffect(() => {
    const sync = () => {
      setRequests(loadBloodRequests());
      setIsDismissed(isBloodBannerDismissed());
    };

    window.addEventListener('ndc_blood_network_updated', sync);
    window.addEventListener('ndc_blood_banner_dismissed', sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('ndc_blood_network_updated', sync);
      window.removeEventListener('ndc_blood_banner_dismissed', sync);
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

  const handleDismiss = () => {
    dismissBloodBanner();
    setIsDismissed(true);
  };

  if (urgentActiveRequests.length === 0) return null;

  // Simple, clean, non-intrusive feed alert banner (NOT a screen-blocking modal)
  if (variant === 'feed') {
    if (isDismissed) return null;

    const primaryReq = urgentActiveRequests[0];
    const totalUrgent = urgentActiveRequests.length;

    return (
      <div className="relative mb-4 p-3 sm:p-3.5 rounded-2xl bg-rose-50/95 dark:bg-rose-950/30 border border-rose-200/90 dark:border-rose-900/60 shadow-xs flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200 transition-all animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Heart className="w-4 h-4 fill-white text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Urgent Blood Request
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
                · {primaryReq.hospitalName} ({primaryReq.hospitalArea})
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {primaryReq.unitsRequired} {primaryReq.unitsRequired === 1 ? 'unit' : 'units'} of {primaryReq.bloodGroup} needed ({primaryReq.emergencyLevel})
              {totalUrgent > 1 && (
                <span className="ml-2 font-normal text-[11px] text-rose-600 dark:text-rose-400">
                  +{totalUrgent - 1} more
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateToBloodNetwork}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            View
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss blood notification"
            title="Dismiss blood notification"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-rose-100/80 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Landing Page Section: Simple and clean
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
                Urgent verified blood requests for Notredamians and their families.
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
