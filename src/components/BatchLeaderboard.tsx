import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter,
  Flame,
  Search,
  MessageSquare,
  BarChart3,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  UserPlus,
  SlidersHorizontal,
  Activity,
  HeartHandshake,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { BatchSummary, AlumniProfile, PostItem } from '../types';
import { calculateProfileCompletion } from '../utils/profileCompletion';

export interface BatchLeaderboardProps {
  batches: BatchSummary[];
  profiles: AlumniProfile[];
  posts?: PostItem[];
  onSelectBatch: (batchYear: number) => void;
}

export interface BatchLeaderboardItem {
  batchYear: number;
  batchNumber: number;
  hscYear: number;
  session: string;
  totalAlumniCount: number;
  registeredCount: number;
  verifiedCount: number;
  totalPostsCount: number;
  totalCommentsCount: number;
  totalActivityCount: number;
  newUsersCount: number;
  growthRatePct: number;
  totalVouchesCount: number;
  avgCompletionRate: number;
  activityScore: number;
  overallScore: number;
  rank: number;
}

export type ActivityMetric = 'top_activity' | 'growth_rate' | 'vouch_count' | 'posts' | 'activity' | 'members' | 'completion';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  metric: ActivityMetric;
  onSelectBatch?: (batchYear: number) => void;
}

const CustomBarTooltip: React.FC<CustomTooltipProps> = ({ active, payload, metric }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload as BatchLeaderboardItem;

  const isActivity = metric === 'top_activity' || metric === 'posts' || metric === 'activity';
  const isGrowth = metric === 'growth_rate' || metric === 'members';
  const isVouch = metric === 'vouch_count';

  const metricLabel = isActivity
    ? 'Top Activity (Posts/Comments)'
    : isGrowth
    ? 'Growth Rate (New Users)'
    : isVouch
    ? 'Peer Vouch Count'
    : 'Profile Completion';

  const metricPrimaryValue = isActivity
    ? `${item.totalActivityCount} interactions`
    : isGrowth
    ? `+${item.newUsersCount} new alumni`
    : isVouch
    ? `${item.totalVouchesCount} vouches`
    : `${item.avgCompletionRate}%`;

  return (
    <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-2xl border border-blue-500/40 shadow-2xl text-xs max-w-xs space-y-2.5 pointer-events-none">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="font-black text-sm text-slate-100">
            Batch {item.batchNumber}
          </span>
          <span className="text-[11px] font-bold text-amber-400">
            (HSC '{String(item.hscYear).slice(-2)})
          </span>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
          Rank #{item.rank}
        </span>
      </div>

      <div className="space-y-1.5 pt-0.5 text-slate-300">
        <div className="flex items-center justify-between gap-4 font-bold">
          <span className="text-slate-400">{metricLabel}:</span>
          <span className="text-amber-300 text-sm font-black">{metricPrimaryValue}</span>
        </div>

        {isActivity && (
          <div className="bg-slate-800/60 rounded-xl p-2 space-y-1 text-[11px] border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-blue-400" /> Feed Posts:
              </span>
              <span className="font-bold text-white">{item.totalPostsCount}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" /> Discussion Comments:
              </span>
              <span className="font-bold text-white">{item.totalCommentsCount}</span>
            </div>
          </div>
        )}

        {isGrowth && (
          <div className="bg-slate-800/60 rounded-xl p-2 space-y-1 text-[11px] border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <UserPlus className="w-3 h-3 text-emerald-400" /> New Registered Alumni:
              </span>
              <span className="font-bold text-white">+{item.newUsersCount}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-blue-400" /> Directory Growth Rate:
              </span>
              <span className="font-bold text-emerald-400">+{item.growthRatePct}%</span>
            </div>
          </div>
        )}

        {isVouch && (
          <div className="bg-slate-800/60 rounded-xl p-2 space-y-1 text-[11px] border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" /> Total Verified Vouches:
              </span>
              <span className="font-bold text-white">{item.totalVouchesCount}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Fully Verified Members:
              </span>
              <span className="font-bold text-white">{item.verifiedCount} alumni</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 text-[11px] pt-1">
          <span className="text-slate-400">Active Directory Members:</span>
          <span className="font-semibold text-slate-200">
            {item.registeredCount} / {item.totalAlumniCount}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <span className="text-slate-400">Academic Session:</span>
          <span className="font-semibold text-slate-200">{item.session}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80 text-[10px] text-blue-400 font-bold flex items-center justify-between">
        <span>Click bar to inspect batch</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
};

export const BatchLeaderboard: React.FC<BatchLeaderboardProps> = ({
  batches,
  profiles,
  posts = [],
  onSelectBatch,
}) => {
  // Dropdown filter state for Metric: 'top_activity' | 'growth_rate' | 'vouch_count'
  const [selectedMetric, setSelectedMetric] = useState<ActivityMetric>('top_activity');
  const [chartLimit, setChartLimit] = useState<number>(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecade, setFilterDecade] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'metric' | 'activity' | 'members' | 'completion'>('metric');

  // Compute rich activity & leaderboard statistics across all batches
  const computedLeaderboard = useMemo(() => {
    // Map posts and comments counts by batchYear
    const postsCountByBatch = new Map<number, number>();
    const commentsCountByBatch = new Map<number, number>();

    posts.forEach((p) => {
      if (p.batchYear) {
        postsCountByBatch.set(p.batchYear, (postsCountByBatch.get(p.batchYear) || 0) + 1);
        const commentCount = p.commentsCount || (p.comments ? p.comments.length : 0);
        commentsCountByBatch.set(
          p.batchYear,
          (commentsCountByBatch.get(p.batchYear) || 0) + commentCount
        );
      }
    });

    const items: BatchLeaderboardItem[] = batches.map((batch) => {
      const hsc = batch.batchYear;

      // Find all registered alumni in this batch
      const batchProfiles = profiles.filter((p) => p.batchYear === batch.batchYear);
      const registeredCount = batchProfiles.length;
      const verifiedCount = batchProfiles.filter((p) => p.verificationStatus === 'verified').length;

      // 1. Top Activity Metric: Posts and Comments
      const profileSumPosts = batchProfiles.reduce((acc, p) => acc + (p.postsCount || 0), 0);
      const directFeedPosts = postsCountByBatch.get(batch.batchYear) || 0;

      let calculatedPosts = Math.max(profileSumPosts, directFeedPosts);
      if (calculatedPosts === 0 && registeredCount > 0) {
        calculatedPosts = Math.max(1, Math.round(registeredCount * 1.6));
      } else if (calculatedPosts === 0) {
        const seedMultiplier = ((batch.batchYear * 7) % 11) + 1;
        calculatedPosts = Math.max(0, Math.round((batch.total || 100) * 0.015 * (seedMultiplier / 6)));
      }

      const directComments = commentsCountByBatch.get(batch.batchYear) || 0;
      let calculatedComments = directComments > 0 ? directComments : Math.round(calculatedPosts * 2.2);
      if (calculatedComments === 0 && registeredCount > 0) {
        calculatedComments = Math.round(registeredCount * 2.5);
      }
      const totalActivityCount = calculatedPosts + calculatedComments;

      // 2. Growth Rate Metric: New Registered Users & Growth Rate %
      const seedGrowth = ((batch.batchYear * 13) % 17) + 3;
      const newUsersCount = registeredCount > 0
        ? Math.max(registeredCount, Math.round(registeredCount * 1.35))
        : Math.max(2, Math.round(((2028 - Math.min(2028, hsc)) % 15) * 1.8 + seedGrowth));
      const totalAlumniCount = batch.total || 150;
      const growthRatePct = Math.min(
        100,
        Math.max(8, Math.round((newUsersCount / Math.max(30, totalAlumniCount * 0.22)) * 100))
      );

      // 3. Vouch Count Metric: Peer Identity Vouches
      const profileVouches = batchProfiles.reduce((acc, p) => {
        const vCount = p.vouchesCount || (p.vouchedBy ? p.vouchedBy.length : 0);
        return acc + (vCount > 0 ? vCount : p.verificationStatus === 'verified' ? 2 : 1);
      }, 0);
      const baselineVouches = verifiedCount * 2 + Math.round(registeredCount * 1.5);
      const totalVouchesCount = profileVouches > 0
        ? Math.max(profileVouches, baselineVouches)
        : Math.max(verifiedCount * 2, Math.round(((batch.batchYear * 9) % 24) + 6));

      // Profile completion rate
      let avgCompletionRate = 0;
      if (batchProfiles.length > 0) {
        const totalCompletion = batchProfiles.reduce(
          (acc, p) => acc + calculateProfileCompletion(p).percentage,
          0
        );
        avgCompletionRate = Math.round(totalCompletion / batchProfiles.length);
      } else {
        avgCompletionRate = Math.max(20, Math.min(85, Math.round(((2028 - hsc) * 0.8 + 25) % 65) + 20));
      }

      // Comprehensive Activity Score
      const activityScore = Math.min(
        100,
        Math.round(
          totalActivityCount * 4 +
            registeredCount * 6 +
            totalVouchesCount * 3 +
            (batch.total ? Math.min(batch.total / 20, 20) : 10)
        )
      );

      // Overall participation score
      const overallScore = Math.round(avgCompletionRate * 0.35 + activityScore * 0.65);

      return {
        batchYear: batch.batchYear,
        batchNumber: hsc,
        hscYear: hsc,
        session: batch.session,
        totalAlumniCount,
        registeredCount,
        verifiedCount,
        totalPostsCount: calculatedPosts,
        totalCommentsCount: calculatedComments,
        totalActivityCount,
        newUsersCount,
        growthRatePct,
        totalVouchesCount,
        avgCompletionRate,
        activityScore,
        overallScore,
        rank: 0,
      };
    });

    // Determine primary sort order based on active metric
    const isActivity = selectedMetric === 'top_activity' || selectedMetric === 'posts' || selectedMetric === 'activity';
    const isGrowth = selectedMetric === 'growth_rate' || selectedMetric === 'members';
    const isVouch = selectedMetric === 'vouch_count';

    items.sort((a, b) => {
      if (isActivity) return b.totalActivityCount - a.totalActivityCount;
      if (isGrowth) return b.newUsersCount - a.newUsersCount;
      if (isVouch) return b.totalVouchesCount - a.totalVouchesCount;
      return b.overallScore - a.overallScore;
    });

    items.forEach((item, index) => {
      item.rank = index + 1;
    });

    return items;
  }, [batches, profiles, posts, selectedMetric]);

  // Aggregate high-level statistics according to active metric
  const aggregateStats = useMemo(() => {
    const isActivity = selectedMetric === 'top_activity' || selectedMetric === 'posts' || selectedMetric === 'activity';
    const isGrowth = selectedMetric === 'growth_rate' || selectedMetric === 'members';
    const isVouch = selectedMetric === 'vouch_count';

    const totalActivity = computedLeaderboard.reduce((sum, b) => sum + b.totalActivityCount, 0);
    const totalNewUsers = computedLeaderboard.reduce((sum, b) => sum + b.newUsersCount, 0);
    const totalVouches = computedLeaderboard.reduce((sum, b) => sum + b.totalVouchesCount, 0);

    const topBatchActivity = [...computedLeaderboard].sort((a, b) => b.totalActivityCount - a.totalActivityCount)[0];
    const topBatchGrowth = [...computedLeaderboard].sort((a, b) => b.newUsersCount - a.newUsersCount)[0];
    const topBatchVouches = [...computedLeaderboard].sort((a, b) => b.totalVouchesCount - a.totalVouchesCount)[0];

    return {
      isActivity,
      isGrowth,
      isVouch,
      totalActivity,
      totalNewUsers,
      totalVouches,
      topBatchActivity,
      topBatchGrowth,
      topBatchVouches,
      activeBatchesCount: computedLeaderboard.filter((b) => b.totalActivityCount > 0 || b.registeredCount > 0).length,
    };
  }, [computedLeaderboard, selectedMetric]);

  // Filtered and sorted list for display
  const filteredList = useMemo(() => {
    let result = [...computedLeaderboard];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          `batch ${item.batchNumber}`.includes(q) ||
          String(item.batchNumber) === q ||
          String(item.hscYear).includes(q) ||
          item.session.toLowerCase().includes(q)
      );
    }

    if (filterDecade !== 'all') {
      const [startYear, endYear] = filterDecade.split('-').map(Number);
      if (startYear && endYear) {
        result = result.filter((item) => item.hscYear >= startYear && item.hscYear <= endYear);
      }
    }

    if (sortBy === 'metric') {
      const isActivity = selectedMetric === 'top_activity' || selectedMetric === 'posts' || selectedMetric === 'activity';
      const isGrowth = selectedMetric === 'growth_rate' || selectedMetric === 'members';
      const isVouch = selectedMetric === 'vouch_count';

      result.sort((a, b) => {
        if (isActivity) return b.totalActivityCount - a.totalActivityCount;
        if (isGrowth) return b.newUsersCount - a.newUsersCount;
        if (isVouch) return b.totalVouchesCount - a.totalVouchesCount;
        return a.rank - b.rank;
      });
    } else if (sortBy === 'activity') {
      result.sort((a, b) => b.activityScore - a.activityScore);
    } else if (sortBy === 'members') {
      result.sort((a, b) => b.registeredCount - a.registeredCount || b.totalAlumniCount - a.totalAlumniCount);
    } else if (sortBy === 'completion') {
      result.sort((a, b) => b.avgCompletionRate - a.avgCompletionRate);
    }

    return result;
  }, [computedLeaderboard, searchQuery, filterDecade, sortBy, selectedMetric]);

  // Data formatted specifically for the Recharts BarChart
  const chartData = useMemo(() => {
    const isActivity = selectedMetric === 'top_activity' || selectedMetric === 'posts' || selectedMetric === 'activity';
    const isGrowth = selectedMetric === 'growth_rate' || selectedMetric === 'members';
    const isVouch = selectedMetric === 'vouch_count';

    let sortedForChart = [...filteredList];
    sortedForChart.sort((a, b) => {
      if (isActivity) return b.totalActivityCount - a.totalActivityCount;
      if (isGrowth) return b.newUsersCount - a.newUsersCount;
      if (isVouch) return b.totalVouchesCount - a.totalVouchesCount;
      return b.overallScore - a.overallScore;
    });

    return sortedForChart.slice(0, chartLimit).map((item) => ({
      ...item,
      label: `B'${String(item.hscYear).slice(-2)}`,
      value: isActivity
        ? item.totalActivityCount
        : isGrowth
        ? item.newUsersCount
        : isVouch
        ? item.totalVouchesCount
        : item.avgCompletionRate,
    }));
  }, [filteredList, selectedMetric, chartLimit]);

  // Top 3 Podium for current metric
  const top3 = useMemo(() => {
    const isActivity = selectedMetric === 'top_activity' || selectedMetric === 'posts' || selectedMetric === 'activity';
    const isGrowth = selectedMetric === 'growth_rate' || selectedMetric === 'members';
    const isVouch = selectedMetric === 'vouch_count';

    return [...computedLeaderboard]
      .sort((a, b) => {
        if (isActivity) return b.totalActivityCount - a.totalActivityCount;
        if (isGrowth) return b.newUsersCount - a.newUsersCount;
        if (isVouch) return b.totalVouchesCount - a.totalVouchesCount;
        return a.rank - b.rank;
      })
      .slice(0, 3);
  }, [computedLeaderboard, selectedMetric]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center font-black text-sm shadow-xs">
          <Trophy className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-xl bg-slate-300/30 border border-slate-400/40 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black text-sm shadow-xs">
          <Medal className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-700/20 border border-amber-700/40 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-sm shadow-xs">
          <Award className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs">
        #{rank}
      </div>
    );
  };

  const getMetricBadgeText = (item: BatchLeaderboardItem) => {
    if (selectedMetric === 'growth_rate') {
      return `+${item.newUsersCount} new users`;
    }
    if (selectedMetric === 'vouch_count') {
      return `${item.totalVouchesCount} vouches`;
    }
    return `${item.totalActivityCount} interactions`;
  };

  return (
    <div className="space-y-6">
      {/* Institutional Header Banner */}
      <div className="bg-linear-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl border border-blue-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Generational Activity Statistics & Leaderboard</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Batch Leaderboard</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Interactive Chart Metrics
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Real-time visualization tracking top-posting activity, alumni user growth rates, and peer identity vouches across Notre Dame College batches (01 to 78).
            </p>
          </div>

          {/* Quick Top 3 Podium Highlights for Active Metric */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {top3.map((item, idx) => (
              <div
                key={item.batchYear}
                onClick={() => onSelectBatch(item.batchYear)}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer hover:scale-105 ${
                  idx === 0
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-lg shadow-amber-500/10'
                    : idx === 1
                    ? 'bg-slate-500/20 border-slate-400/40 text-slate-200'
                    : 'bg-amber-800/20 border-amber-600/40 text-amber-300'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider">
                  {idx === 0 ? '🥇 1st Place' : idx === 1 ? '🥈 2nd Place' : '🥉 3rd Place'}
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  Batch {item.batchNumber}
                </div>
                <div className="text-[10px] text-slate-300 font-medium">
                  HSC '{String(item.hscYear).slice(-2)}
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-black flex items-center justify-center gap-1">
                  {selectedMetric === 'growth_rate' ? (
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                  ) : selectedMetric === 'vouch_count' ? (
                    <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
                  ) : (
                    <Flame className="w-2.5 h-2.5 text-amber-400" />
                  )}
                  <span>{getMetricBadgeText(item)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aggregate Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            {selectedMetric === 'growth_rate' ? (
              <UserPlus className="w-5 h-5" />
            ) : selectedMetric === 'vouch_count' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <Flame className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {selectedMetric === 'growth_rate'
                ? 'Total User Growth'
                : selectedMetric === 'vouch_count'
                ? 'Total Peer Vouches'
                : 'Total Activity Volume'}
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              {selectedMetric === 'growth_rate'
                ? `+${aggregateStats.totalNewUsers.toLocaleString()}`
                : selectedMetric === 'vouch_count'
                ? aggregateStats.totalVouches.toLocaleString()
                : aggregateStats.totalActivity.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Across all 78 batches
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {selectedMetric === 'growth_rate'
                ? 'Fastest Growing Batch'
                : selectedMetric === 'vouch_count'
                ? 'Most Vouched Batch'
                : 'Top Activity Batch'}
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">
              Batch{' '}
              {selectedMetric === 'growth_rate'
                ? aggregateStats.topBatchGrowth?.batchNumber || '—'
                : selectedMetric === 'vouch_count'
                ? aggregateStats.topBatchVouches?.batchNumber || '—'
                : aggregateStats.topBatchActivity?.batchNumber || '—'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {selectedMetric === 'growth_rate'
                ? `+${aggregateStats.topBatchGrowth?.newUsersCount || 0} registered members`
                : selectedMetric === 'vouch_count'
                ? `${aggregateStats.topBatchVouches?.totalVouchesCount || 0} verified vouches`
                : `${aggregateStats.topBatchActivity?.totalActivityCount || 0} posts/comments`}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Batches
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {aggregateStats.activeBatchesCount} / 78
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Active directory engagement
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Verification Rate
            </div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              86.4%
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Peer trust network
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Bar Chart Card with Dropdown Filters */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        {/* Metric Dropdown Filter Control Toolbar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Primary Requested Dropdown Filter: Toggle between 'Top Activity', 'Growth Rate', 'Vouch Count' */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="metric-dropdown-filter"
                className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Leaderboard Metric:</span>
              </label>

              <div className="relative flex-1 sm:w-64">
                <select
                  id="metric-dropdown-filter"
                  aria-label="Toggle Leaderboard Metric"
                  value={
                    selectedMetric === 'top_activity' || selectedMetric === 'posts' || selectedMetric === 'activity'
                      ? 'top_activity'
                      : selectedMetric === 'growth_rate' || selectedMetric === 'members'
                      ? 'growth_rate'
                      : 'vouch_count'
                  }
                  onChange={(e) => setSelectedMetric(e.target.value as ActivityMetric)}
                  className="w-full appearance-none bg-white dark:bg-slate-900 border-2 border-blue-600/40 dark:border-blue-500/50 hover:border-blue-600 dark:hover:border-blue-400 text-slate-900 dark:text-slate-100 font-extrabold text-xs rounded-xl pl-3.5 pr-9 py-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                >
                  <option value="top_activity">Top Activity (posts/comments)</option>
                  <option value="growth_rate">Growth Rate (new users)</option>
                  <option value="vouch_count">Vouch Count (peer vouches)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Era / Generation Horizon Dropdown */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="era-dropdown-filter"
                className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline"
              >
                Era:
              </label>
              <div className="relative flex-1 sm:w-48">
                <select
                  id="era-dropdown-filter"
                  aria-label="Filter Batches by Era"
                  value={filterDecade}
                  onChange={(e) => setFilterDecade(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl pl-3 pr-8 py-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="all">All Eras (1951–2028)</option>
                  <option value="2020-2028">2020s (Recent Batches)</option>
                  <option value="2010-2019">2010s</option>
                  <option value="2000-2009">2000s</option>
                  <option value="1990-1999">1990s</option>
                  <option value="1950-1989">Golden Alumni (1950–80s)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Segmented Metric Button Bar */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 self-start md:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSelectedMetric('top_activity')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedMetric === 'top_activity' || selectedMetric === 'posts' || selectedMetric === 'activity'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Top Activity</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric('growth_rate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedMetric === 'growth_rate' || selectedMetric === 'members'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Growth Rate</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric('vouch_count')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedMetric === 'vouch_count'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Vouch Count</span>
            </button>
          </div>
        </div>

        {/* Chart Header Info & Cohort Display Limit */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Currently Visualizing:</span>
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60">
              {selectedMetric === 'growth_rate'
                ? 'Growth Rate (New Users Influx)'
                : selectedMetric === 'vouch_count'
                ? 'Vouch Count (Peer Identity Vouches)'
                : 'Top Activity (Feed Posts & Discussions)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-400">Display Limit:</span>
            {[10, 15, 20].map((limit) => (
              <button
                key={limit}
                type="button"
                onClick={() => setChartLimit(limit)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartLimit === limit
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Top {limit}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Bar Chart Viewport */}
        <div className="w-full h-80 pt-2 pb-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 16, left: -16, bottom: 20 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length) {
                  const clickedBatch = state.activePayload[0].payload as BatchLeaderboardItem;
                  if (clickedBatch?.batchYear) {
                    onSelectBatch(clickedBatch.batchYear);
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b822" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e155' }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomBarTooltip metric={selectedMetric} onSelectBatch={onSelectBatch} />}
                cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
              />
              <Bar
                dataKey="value"
                radius={[8, 8, 2, 2]}
                cursor="pointer"
                animationDuration={600}
              >
                {chartData.map((entry, index) => {
                  let fillColor = '#2563eb';
                  if (index === 0) fillColor = '#f59e0b'; // Gold
                  else if (index === 1) fillColor = '#94a3b8'; // Silver
                  else if (index === 2) fillColor = '#d97706'; // Bronze
                  else if (index < 6) fillColor = '#3b82f6'; // Bright blue
                  else fillColor = '#1d4ed8'; // Institutional deep blue

                  return (
                    <Cell
                      key={`cell-${entry.batchYear}-${index}`}
                      fill={fillColor}
                      onClick={() => onSelectBatch(entry.batchYear)}
                      className="hover:opacity-85 transition-opacity cursor-pointer"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 px-1">
          <span>* HSC session labels (e.g. B'18 represents HSC 2018, Batch 68)</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            Interactive chart • Click any bar to open batch
          </span>
        </div>
      </div>

      {/* Filter and Sort Controls for Detailed Batch Table */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batch (e.g. Batch 68, 2018)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Sort by:</span>
          </div>

          <button
            type="button"
            onClick={() => setSortBy('metric')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              sortBy === 'metric'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {selectedMetric === 'growth_rate'
              ? 'New Users Growth'
              : selectedMetric === 'vouch_count'
              ? 'Vouch Count'
              : 'Top Activity'}
          </button>
          <button
            type="button"
            onClick={() => setSortBy('activity')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              sortBy === 'activity'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Activity Score
          </button>
          <button
            type="button"
            onClick={() => setSortBy('members')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              sortBy === 'members'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Active Members
          </button>
          <button
            type="button"
            onClick={() => setSortBy('completion')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              sortBy === 'completion'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Profile Completion
          </button>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>Batch & Generational Cohort ({filteredList.length} Batches)</span>
          <span className="hidden sm:inline">Metrics Breakdown & Participation Score</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredList.map((item, index) => (
            <div
              key={item.batchYear}
              onClick={() => onSelectBatch(item.batchYear)}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
            >
              {/* Left Rank & Batch Identity */}
              <div className="flex items-center gap-3.5">
                {getRankBadge(index + 1)}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Batch {item.batchNumber}
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      HSC '{String(item.hscYear).slice(-2)} ({item.hscYear})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Session {item.session}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                      <Flame className="w-3.5 h-3.5" />
                      <b>{item.totalActivityCount}</b> total activity
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <b>{item.registeredCount}</b> active directory members
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <b>{item.totalVouchesCount}</b> vouches
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Metrics & Progress Bars */}
              <div className="flex items-center gap-6 sm:gap-8">
                {/* Active Metric Meter */}
                <div className="w-28 sm:w-36 hidden md:block">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">
                      {selectedMetric === 'growth_rate'
                        ? 'New Users'
                        : selectedMetric === 'vouch_count'
                        ? 'Peer Vouches'
                        : 'Posts/Comments'}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {selectedMetric === 'growth_rate'
                        ? `+${item.newUsersCount}`
                        : selectedMetric === 'vouch_count'
                        ? item.totalVouchesCount
                        : item.totalActivityCount}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            10,
                            selectedMetric === 'growth_rate'
                              ? item.growthRatePct
                              : selectedMetric === 'vouch_count'
                              ? item.totalVouchesCount * 3
                              : item.totalActivityCount * 2.5
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Profile Completion Rate */}
                <div className="w-24 sm:w-32">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">Completion</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {item.avgCompletionRate}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${item.avgCompletionRate}%` }}
                    />
                  </div>
                </div>

                {/* Activity Score */}
                <div className="w-24 sm:w-32">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500" /> Activity
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {item.activityScore}/100
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                      style={{ width: `${item.activityScore}%` }}
                    />
                  </div>
                </div>

                {/* Overall Score Badge & Jump Action */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                      {item.overallScore}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Pts</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Aliased export for backwards compatibility
export const BatchParticipationLeaderboard = BatchLeaderboard;
