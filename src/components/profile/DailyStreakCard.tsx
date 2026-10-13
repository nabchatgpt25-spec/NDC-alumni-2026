/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Award,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  PartyPopper,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  fetchUserStreak,
  loadDailyStreakLocal,
  triggerStreakMilestoneConfetti,
  type UserStreakData,
} from '../../services/streakService';
import { getDhakaDateString, banglaDigits } from '../DailyQuestion';

interface DailyStreakCardProps {
  userId: number;
  authUserId?: string;
  isOwnProfile?: boolean;
  onNavigateToDailyQuestion?: () => void;
  className?: string;
}

interface DayActivityDatum {
  date: string;
  dayNumber: string;
  dayLabel: string;
  dayNameBangla: string;
  answered: boolean;
  value: number;
}

export const DailyStreakCard: React.FC<DailyStreakCardProps> = ({
  userId,
  authUserId,
  isOwnProfile = false,
  onNavigateToDailyQuestion,
  className = '',
}) => {
  const todayStr = getDhakaDateString();
  const [streakData, setStreakData] = useState<UserStreakData>(() =>
    loadDailyStreakLocal(userId)
  );
  const [isLoading, setIsLoading] = useState(true);

  // Sync from Supabase user_streaks table
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchUserStreak(userId, authUserId)
      .then((data) => {
        if (isMounted) {
          setStreakData(data);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Listen to real-time events when user answers in the feed
    const handleUpdate = (e: any) => {
      if (isMounted) {
        setStreakData(loadDailyStreakLocal(userId));
      }
    };

    window.addEventListener('ndc_daily_streak_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('ndc_daily_streak_updated', handleUpdate);
    };
  }, [userId, authUserId]);

  const isAnsweredToday = streakData.lastAnsweredDate === todayStr;
  const currentStreak = streakData.currentStreak || 0;
  const maxStreak = Math.max(streakData.maxStreak || 0, currentStreak);
  const has7DayBadge =
    currentStreak >= 7 ||
    streakData.milestoneBadges?.some((b) => b.includes('7-Day') || b.includes('7_day'));

  // Generate 30-day activity dataset for Recharts
  const past30DaysData = useMemo<DayActivityDatum[]>(() => {
    const historySet = new Set(streakData.history || []);
    if (isAnsweredToday) {
      historySet.add(todayStr);
    }

    const result: DayActivityDatum[] = [];
    const banglaDayNames: Record<number, string> = {
      0: 'রবি',
      1: 'সোম',
      2: 'মঙ্গল',
      3: 'বুধ',
      4: 'বৃহঃ',
      5: 'শুক্র',
      6: 'শনি',
    };

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = getDhakaDateString(d);
      const dayNum = String(d.getDate());
      const answered = historySet.has(iso);
      const dayOfWeek = d.getDay();

      result.push({
        date: iso,
        dayNumber: dayNum,
        dayLabel: i === 0 ? 'আজ' : (i % 5 === 0 ? banglaDigits(Number(dayNum)) : ''),
        dayNameBangla: banglaDayNames[dayOfWeek] || '',
        answered,
        value: answered ? 1 : 0.12, // Slight bar height for missed days so grid stays visible
      });
    }

    return result;
  }, [streakData.history, isAnsweredToday, todayStr]);

  const activeDaysCount = useMemo(() => {
    return past30DaysData.filter((d) => d.answered).length;
  }, [past30DaysData]);

  const participationPercent = Math.round((activeDaysCount / 30) * 100);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayActivityDatum = payload[0].payload;
      const isToday = data.date === todayStr;

      return (
        <div className="p-2.5 rounded-xl bg-slate-900/95 dark:bg-black/95 text-white border border-amber-500/40 shadow-xl text-xs space-y-1 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
            <span>{data.date} ({data.dayNameBangla})</span>
            {isToday && (
              <span className="px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-300 font-bold text-[10px]">
                আজ
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            {data.answered ? (
              <>
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-amber-300">স্মৃতিচারণ প্রশ্নের উত্তর দেওয়া হয়েছে 🔥</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">কোনো উত্তর জমা পড়েনি</span>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 border border-amber-500/30 shadow-xl transition-all hover:shadow-2xl hover:border-amber-500/50 ${className}`}
    >
      {/* Decorative Golden Ambient Glows */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Row: Title, Badge, and Action */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 border border-white/20 shrink-0">
            <Flame
              className={`w-7 h-7 fill-white ${
                currentStreak > 0 ? 'animate-bounce' : ''
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>দৈনিক নস্টালজিয়া স্ট্রিক</span>
                <span className="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30">
                  Daily Streak
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300/90 mt-0.5">
              নটর ডেম স্মৃতিচারণ ও নিয়মিত উপস্থিতি ট্র্যাকার (Supabase Synced)
            </p>
          </div>
        </div>

        {/* Milestone Badges & Confetti Action */}
        <div className="flex items-center gap-2">
          {has7DayBadge && (
            <button
              type="button"
              onClick={() => triggerStreakMilestoneConfetti(currentStreak || 7)}
              title="৭ দিনের স্ট্রিক ব্যাজ — কনফেটি ওড়ান!"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <span>🔥 ৭ দিনের স্ট্রিক ব্যাজ</span>
              <PartyPopper className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold text-slate-300">
            {isAnsweredToday ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">আজ সুরক্ষিত</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-bold">আজ বাকি আছে</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Stat Metrics */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Metric 1: Current Streak */}
        <div className="p-3.5 rounded-2xl bg-black/35 border border-amber-500/30 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300/90 uppercase tracking-wider mb-1">
            <Flame className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>বর্তমান স্ট্রিক</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono flex items-baseline gap-1">
            <span>{banglaDigits(currentStreak)}</span>
            <span className="text-xs font-bold text-amber-200/80 font-sans">দিন</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {currentStreak > 0 ? 'টানা উপস্থিতি অব্যাহত 🔥' : 'আজ উত্তর দিয়ে শুরু করুন'}
          </div>
        </div>

        {/* Metric 2: Max Streak */}
        <div className="p-3.5 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
            <Award className="w-3.5 h-3.5 text-blue-400" />
            <span>সর্বোচ্চ রেকর্ড</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-baseline gap-1">
            <span>{banglaDigits(maxStreak)}</span>
            <span className="text-xs font-bold text-slate-300 font-sans">দিন</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            সর্বকালের সেরা স্ট্রিক
          </div>
        </div>

        {/* Metric 3: 30-Day Active Days */}
        <div className="p-3.5 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>গত ৩০ দিনে সক্রিয়</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono flex items-baseline gap-1">
            <span>{banglaDigits(activeDaysCount)}</span>
            <span className="text-xs font-bold text-slate-300 font-sans">/৩০ দিন</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            উপস্থিতি হার: {banglaDigits(participationPercent)}%
          </div>
        </div>

        {/* Metric 4: Milestone Status */}
        <div className="p-3.5 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>পরবর্তী মাইলফলক</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-200 font-mono flex items-baseline gap-1">
            <span>{banglaDigits(currentStreak < 7 ? 7 - currentStreak : (currentStreak < 14 ? 14 - currentStreak : (currentStreak < 30 ? 30 - currentStreak : 7 - (currentStreak % 7))))}</span>
            <span className="text-xs font-bold text-slate-300 font-sans">দিন বাকি</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {currentStreak < 7 ? '৭ দিনের ব্যাজের জন্য' : 'পরবর্তী বড় স্বীকৃতির জন্য'}
          </div>
        </div>
      </div>

      {/* 30-Day Activity Bar Chart (Recharts) */}
      <div className="relative z-10 p-4 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-200 px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>গত ৩০ দিনের উপস্থিতি চার্ট (Streak History - Last 30 Days)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
              <span>উত্তর দেওয়া হয়েছে ({banglaDigits(activeDaysCount)})</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-white/15" />
              <span>অনুপস্থিত ({banglaDigits(30 - activeDaysCount)})</span>
            </span>
          </div>
        </div>

        {/* The Recharts Bar Chart */}
        <div className="w-full h-24 sm:h-28 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={past30DaysData}
              margin={{ top: 5, right: 2, left: 2, bottom: 5 }}
            >
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.08)' }} />
              <XAxis
                dataKey="dayLabel"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {past30DaysData.map((entry, index) => {
                  const isToday = entry.date === todayStr;
                  const fillColor = entry.answered
                    ? isToday
                      ? '#f59e0b' // Gold today
                      : '#fbbf24' // Bright amber
                    : '#334155'; // Dark slate muted for missed

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fillColor}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Call to action for own profile if not answered today */}
      {isOwnProfile && !isAnsweredToday && (
        <div className="relative z-10 mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium text-center sm:text-left">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>আজকের নস্টালজিয়া প্রশ্নের উত্তর দিয়ে আপনার স্ট্রিক অক্ষুণ্ণ রাখুন!</span>
          </div>

          <button
            type="button"
            onClick={onNavigateToDailyQuestion}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>✏️ আজকের স্মৃতিচারণ প্রশ্নের উত্তর দিন</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DailyStreakCard;
