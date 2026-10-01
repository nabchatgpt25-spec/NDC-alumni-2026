import React from 'react';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { AlumniProfile, VerificationStatus } from '../../types';

interface VerificationStatusBadgeProps {
  profile?: AlumniProfile;
  status?: VerificationStatus;
  vouchesCount?: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showLabel?: boolean;
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  profile,
  status: statusProp,
  vouchesCount: vouchesCountProp,
  onClick,
  size = 'md',
  showText = true,
  showLabel,
}) => {
  const status = statusProp || profile?.verificationStatus || 'verified'; // default to verified for demo consistency
  const vouchesCount =
    vouchesCountProp ??
    profile?.vouchesCount ??
    (profile?.verifiedBy ? profile.verifiedBy.length : 2);
  const displayLabel = showLabel !== undefined ? showLabel : showText;

  if (status === 'verified') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all ${
          onClick ? 'cursor-pointer hover:opacity-90 active:scale-95' : 'cursor-default'
        } ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : size === 'lg'
            ? 'px-3.5 py-1.5 text-xs bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs'
            : 'px-2.5 py-1 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
        }`}
        title="Verified Notre Dame College Alumnus"
      >
        <ShieldCheck className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-emerald-500 shrink-0`} />
        {displayLabel && <span>Verified Notredamian</span>}
      </button>
    );
  }

  if (status === 'pending_vouch') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all animate-pulse ${
          onClick ? 'cursor-pointer hover:opacity-90 active:scale-95' : 'cursor-default'
        } ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            : size === 'lg'
            ? 'px-3.5 py-1.5 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs'
            : 'px-2.5 py-1 text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
        }`}
        title="Pending Classmate Verification"
      >
        <Clock className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-amber-500 shrink-0`} />
        {displayLabel && <span>{vouchesCount}/2 Vouches Received</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all ${
        onClick ? 'cursor-pointer hover:opacity-90 active:scale-95' : 'cursor-default'
      } ${
        size === 'sm'
          ? 'px-2 py-0.5 text-[10px] bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
          : size === 'lg'
          ? 'px-3.5 py-1.5 text-xs bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
          : 'px-2.5 py-1 text-[11px] bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
      }`}
      title="Click to Verify Your Profile"
    >
      <AlertTriangle className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-slate-400 shrink-0`} />
      {displayLabel && <span>Verify Profile</span>}
    </button>
  );
};
