import React from 'react';
import {
  Award,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Star,
  Crown,
  Medal,
  Flame,
} from 'lucide-react';

export interface BadgeConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  description: string;
}

export const BADGE_CONFIGS: Record<string, BadgeConfig> = {
  'Golden Batch': {
    icon: Crown,
    label: 'Golden Batch',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderClass: 'border-amber-200 dark:border-amber-800/70',
    textClass: 'text-amber-700 dark:text-amber-300',
    description: 'Distinguished pioneer alumni batch member (Batch 01–05)',
  },
  'Active Contributor': {
    icon: Sparkles,
    label: 'Active Contributor',
    bgClass: 'bg-purple-50 dark:bg-purple-950/40',
    borderClass: 'border-purple-200 dark:border-purple-800/70',
    textClass: 'text-purple-700 dark:text-purple-300',
    description: 'Frequently contributes professional insights, community posts & mentorship',
  },
  'Volunteer': {
    icon: HeartHandshake,
    label: 'Volunteer',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-200 dark:border-emerald-800/70',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    description: 'Active volunteer for Notre Dame reunion organization & community service initiatives',
  },
  'Life Member': {
    icon: ShieldCheck,
    label: 'Life Member',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800/70',
    textClass: 'text-blue-700 dark:text-blue-300',
    description: 'Verified lifetime registered alumnus of Notre Dame College Alumni Association',
  },
  'Executive Member': {
    icon: Star,
    label: 'Executive Member',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    borderClass: 'border-rose-200 dark:border-rose-800/70',
    textClass: 'text-rose-700 dark:text-rose-300',
    description: 'Current or former member of the Alumni Association Executive Committee',
  },
  'Pioneer Batch': {
    icon: Award,
    label: 'Pioneer Batch',
    bgClass: 'bg-sky-50 dark:bg-sky-950/40',
    borderClass: 'border-sky-200 dark:border-sky-800/70',
    textClass: 'text-sky-700 dark:text-sky-300',
    description: 'Pioneer admission batch 1949 of Notre Dame College Dhaka',
  },
};

interface AchievementBadgeChipProps {
  badgeName: string;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export const AchievementBadgeChip: React.FC<AchievementBadgeChipProps> = ({
  badgeName,
  size = 'sm',
  showDescription = false,
}) => {
  const config = BADGE_CONFIGS[badgeName] || {
    icon: Medal,
    label: badgeName,
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderClass: 'border-indigo-200 dark:border-indigo-800/70',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    description: 'Notre Dame Alumni recognized achievement',
  };

  const Icon = config.icon;

  if (size === 'lg') {
    return (
      <div
        className={`flex items-start gap-3 p-3.5 rounded-2xl border ${config.bgClass} ${config.borderClass} transition-all`}
      >
        <div className={`p-2 rounded-xl bg-white dark:bg-slate-900 shadow-2xs ${config.textClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className={`text-xs font-black ${config.textClass}`}>{config.label}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {config.description}
          </div>
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <span
        title={config.description}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${config.bgClass} ${config.borderClass} ${config.textClass} shadow-2xs select-none`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{config.label}</span>
      </span>
    );
  }

  // size === 'sm' (Default for cards)
  return (
    <span
      title={config.description}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-tight ${config.bgClass} ${config.borderClass} ${config.textClass} shrink-0 select-none`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};
