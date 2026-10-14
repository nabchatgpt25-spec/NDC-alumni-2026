import React, { useMemo } from 'react';
import { Sparkles, X, ChevronRight, Check } from 'lucide-react';

interface MentorshipCelebrationBannerProps {
  type: 'request' | 'offer';
  title: string;
  message: string;
  snippet?: string;
  onDismiss: () => void;
  onActionClick?: () => void;
  actionText?: string;
}

interface ConfettiPiece {
  id: number;
  left: number; // percentage 0 - 95
  delay: number; // seconds
  duration: number; // seconds
  size: number; // px
  color: string;
  shape: 'rect' | 'circle' | 'diamond';
  rotate: number; // deg
}

export const MentorshipCelebrationBanner: React.FC<MentorshipCelebrationBannerProps> = ({
  type,
  title,
  message,
  snippet,
  onDismiss,
  onActionClick,
  actionText,
}) => {
  // Generate random CSS confetti pieces on mount
  const confettiPieces: ConfettiPiece[] = useMemo(() => {
    const colors =
      type === 'request'
        ? ['#f59e0b', '#3b82f6', '#fbbf24', '#60a5fa', '#10b981', '#f97316', '#a855f7']
        : ['#10b981', '#059669', '#3b82f6', '#f59e0b', '#34d399', '#6ee7b7', '#06b6d4'];

    const shapes: ('rect' | 'circle' | 'diamond')[] = ['rect', 'circle', 'diamond', 'rect'];

    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.round(4 + (i * 92) / 18 + (Math.random() * 4 - 2)),
      delay: Number((Math.random() * 0.7).toFixed(2)),
      duration: Number((2.2 + Math.random() * 1.4).toFixed(2)),
      size: Math.round(6 + Math.random() * 6),
      color: colors[i % colors.length],
      shape: shapes[i % shapes.length],
      rotate: Math.round(Math.random() * 360),
    }));
  }, [type]);

  const isRequest = type === 'request';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
        isRequest
          ? 'bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-900/20 border-amber-300 dark:border-amber-700/60 shadow-amber-500/10'
          : 'bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-teal-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-900/20 border-emerald-300 dark:border-emerald-700/60 shadow-emerald-500/10'
      }`}
    >
      {/* CSS Floating Confetti Layer (pointer-events-none) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {confettiPieces.map((p) => {
          return (
            <div
              key={p.id}
              className="absolute top-0 animate-confetti-particle"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            >
              {p.shape === 'circle' && (
                <div
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                  }}
                  className="rounded-full shadow-xs opacity-90"
                />
              )}
              {p.shape === 'rect' && (
                <div
                  style={{
                    width: `${p.size * 1.5}px`,
                    height: `${p.size * 0.65}px`,
                    backgroundColor: p.color,
                    transform: `rotate(${p.rotate}deg)`,
                  }}
                  className="rounded-xs shadow-xs opacity-90"
                />
              )}
              {p.shape === 'diamond' && (
                <div
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                    transform: 'rotate(45deg)',
                  }}
                  className="rounded-xs shadow-xs opacity-90"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex items-start gap-3 sm:gap-4">
        {/* Lottie-style animated badge with expanding pulse ring & sparkles */}
        <div className="relative shrink-0 mt-0.5">
          {/* Animated pulse ring */}
          <div
            className={`absolute -inset-1 rounded-full animate-pulse-ring pointer-events-none ${
              isRequest ? 'bg-amber-400/40' : 'bg-emerald-400/40'
            }`}
          />

          {/* Core badge */}
          <div
            className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md ${
              isRequest
                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/30'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30'
            }`}
          >
            {/* Animated Lottie SVG checkmark */}
            <svg
              className="w-6 h-6 stroke-white"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline
                className="animate-lottie-check"
                points="20 6 9 17 4 12"
              />
            </svg>

            {/* Sparkle badge decorator */}
            <Sparkles
              className={`absolute -top-1 -right-1 w-4 h-4 animate-sparkle-spin ${
                isRequest ? 'text-amber-200' : 'text-emerald-100'
              }`}
            />
          </div>
        </div>

        {/* Content & Snippet */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isRequest
                  ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {isRequest ? '🎉 অনুরোধ সফল' : '🌟 মেন্টর রেজিস্ট্রেশন সফল'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
            {message}
          </p>

          {snippet && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 italic line-clamp-2">
              "{snippet}"
            </div>
          )}

          {/* Action Button */}
          {onActionClick && actionText && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onActionClick}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer ${
                  isRequest
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                <span>{actionText}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="বন্ধ করুন"
          aria-label="বিজ্ঞপ্তি বন্ধ করুন"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
