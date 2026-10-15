/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronDown,
  ChevronUp,
  Lock,
  Users,
  MessageSquare,
  BookOpen,
  Send,
  UserCheck,
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
  fetchUserStreakAnswers,
  fetchFriendsAnswersForQuestion,
  recordStreakAnswerInDb,
  type UserStreakData,
  type DailyQuestionAnswerItem,
} from '../../services/streakService';
import { getDhakaDateString, banglaDigits, getDailyQuestion } from '../DailyQuestion';
import { useAuth } from '../../context/AuthContext';

interface DailyStreakCardProps {
  userId: number;
  authUserId?: string;
  isOwnProfile?: boolean;
  onNavigateToDailyQuestion?: () => void;
  onViewProfile?: (userId: number) => void;
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
  onViewProfile,
  className = '',
}) => {
  const { currentUser } = useAuth();
  const todayStr = getDhakaDateString();
  const todayQuestion = useMemo(() => getDailyQuestion(todayStr), [todayStr]);

  const [streakData, setStreakData] = useState<UserStreakData>(() =>
    loadDailyStreakLocal(userId)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeStreakTab, setActiveStreakTab] = useState<'memories' | 'overview'>('memories');

  // User's private streak answers (only stored on profile, NOT public feed posts)
  const [streakAnswers, setStreakAnswers] = useState<DailyQuestionAnswerItem[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);

  // Map of date -> friends who answered that same question
  const [friendsAnswersMap, setFriendsAnswersMap] = useState<Record<string, DailyQuestionAnswerItem[]>>({});
  const [friendsBatchFilter, setFriendsBatchFilter] = useState<'all' | 'my_batch'>('all');

  // Inline Answer Composer state directly on profile streak
  const [inlineAnswerText, setInlineAnswerText] = useState('');
  const [isSubmittingInline, setIsSubmittingInline] = useState(false);
  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Sync from Supabase user_streaks table & load streak answers
  const loadStreakAndAnswers = () => {
    fetchUserStreak(userId, authUserId).then((data) => {
      setStreakData(data);
    });

    setIsLoadingAnswers(true);
    fetchUserStreakAnswers(userId)
      .then((answers) => {
        setStreakAnswers(answers);
        // Pre-fetch friends answers for today and recent answered questions
        const datesToFetch = Array.from(new Set([todayStr, ...answers.map((a) => a.questionDate)]));
        datesToFetch.forEach((qDate) => {
          fetchFriendsAnswersForQuestion(qDate, userId, currentUser?.batchYear).then((friendsList) => {
            setFriendsAnswersMap((prev) => ({ ...prev, [qDate]: friendsList }));
          });
        });
      })
      .finally(() => {
        setIsLoadingAnswers(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    loadStreakAndAnswers();
    setIsLoading(false);

    // Listen to real-time streak updates
    const handleUpdate = () => {
      if (isMounted) {
        setStreakData(loadDailyStreakLocal(userId));
        fetchUserStreakAnswers(userId).then((answers) => {
          if (isMounted) setStreakAnswers(answers);
        });
      }
    };

    window.addEventListener('ndc_daily_streak_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('ndc_daily_streak_updated', handleUpdate);
    };
  }, [userId, authUserId, todayStr]);

  const isAnsweredToday = streakData.lastAnsweredDate === todayStr;
  const currentStreak = streakData.currentStreak || 0;
  const maxStreak = Math.max(streakData.maxStreak || 0, currentStreak);
  const has7DayBadge =
    currentStreak >= 7 ||
    streakData.milestoneBadges?.some((b) => b.includes('7-Day') || b.includes('7_day'));

  // Submit private streak answer from profile
  const handleProfileSubmitAnswer = async () => {
    if (!inlineAnswerText.trim() || !currentUser?.id) return;
    setIsSubmittingInline(true);
    try {
      const res = await recordStreakAnswerInDb({
        userId: currentUser.id,
        authUserId: currentUser.authUserId,
        authorName: currentUser.fullName,
        authorAvatar: currentUser.avatarUrl,
        authorBatch: currentUser.batchYear ? Number(currentUser.batchYear) : null,
        questionText: todayQuestion.question,
        answerText: inlineAnswerText.trim(),
        questionIndex: todayQuestion.index,
        // No postId: strictly keeps it private to streak profile without posting to feed
      });

      setStreakData(res.streakData);
      setInlineFeedback('🎉 আপনার স্মৃতিচারণ সফলভাবে প্রোফাইল স্ট্রিকে সংরক্ষিত হয়েছে!');
      setInlineAnswerText('');
      setIsComposerOpen(false);

      if (res.isMilestone) {
        triggerStreakMilestoneConfetti(res.milestoneDays);
      }

      // Refresh answers list immediately
      const refreshed = await fetchUserStreakAnswers(currentUser.id);
      setStreakAnswers(refreshed);

      // Refresh friends answers for today
      const friends = await fetchFriendsAnswersForQuestion(todayStr, currentUser.id, currentUser.batchYear);
      setFriendsAnswersMap((prev) => ({ ...prev, [todayStr]: friends }));

      // Dispatch real-time event for other components
      window.dispatchEvent(new CustomEvent('ndc_daily_streak_updated'));

      setTimeout(() => setInlineFeedback(null), 5000);
    } catch (e) {
      console.error('Failed to submit profile streak memory:', e);
    } finally {
      setIsSubmittingInline(false);
    }
  };

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
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white border border-amber-500/35 shadow-lg transition-all hover:border-amber-400/70 hover:shadow-xl hover:shadow-amber-500/15 ${className}`}
    >
      {/* Decorative Golden Ambient Glows */}
      <div className="absolute top-0 right-0 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Interactive Photocard Header Bar (Always visible & Clickable to Expand/Collapse) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="relative z-10 w-full p-3.5 sm:p-4.5 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer group select-none transition-all hover:bg-white/[0.04] active:scale-[0.998]"
        title={isExpanded ? 'ক্লিক করে সংক্ষিপ্ত করুন' : 'ক্লিক করে বিস্তারিত স্ট্রিক চার্ট, স্মৃতিচারণ ও বন্ধুদের উত্তর দেখুন'}
      >
        {/* Left: Photocard Emblem & Title */}
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/35 border border-white/25 shrink-0 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-200">
            <Flame
              className={`w-6 h-6 sm:w-6.5 sm:h-6.5 fill-white ${
                currentStreak > 0 ? 'animate-bounce' : ''
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight truncate flex items-center gap-2">
                <span>দৈনিক নস্টালজিয়া স্ট্রিক</span>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 shadow-xs">
                  Daily Streak
                </span>
              </h3>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-300/90 truncate mt-0.5 font-medium">
              {isExpanded
                ? 'নটর ডেম স্মৃতিচারণ ট্র্যাকার • স্মৃতি ও বন্ধুদের উত্তর'
                : 'নটর ডেম স্মৃতিচারণ ট্র্যাকার • ক্লিক করে বিস্তারিত দেখুন'}
            </p>
          </div>
        </div>

        {/* Right: Streak Counter Pill, Status & Expand Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Current Streak Counter Pill */}
          <div className="px-3 sm:px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/25 to-orange-500/25 border border-amber-400/50 text-amber-300 font-mono font-black text-sm sm:text-base flex items-center gap-1.5 shadow-sm group-hover:border-amber-400/80 group-hover:shadow-amber-500/20 transition-all">
            <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current text-amber-400" />
            <span>{banglaDigits(currentStreak)} দিন</span>
          </div>

          {/* Today Status Pill */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/45 border border-white/15 text-xs font-semibold text-slate-200">
            {isAnsweredToday ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">আজ সুরক্ষিত</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-bold">আজ বাকি</span>
              </>
            )}
          </div>

          {/* Interactive Expand / Collapse Toggle Badge */}
          <div className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 group-hover:bg-amber-500/25 border border-white/15 group-hover:border-amber-400/50 text-xs font-bold text-slate-200 group-hover:text-amber-200 flex items-center gap-1.5 transition-all shadow-xs">
            <span className="hidden xs:inline">{isExpanded ? 'সংক্ষেপ' : 'বিস্তারিত'}</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Smoothly Expandable Body Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="streak-expanded-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 p-4 sm:p-5 space-y-4">
              {/* Header Details with Milestone Action & Mobile Status */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>নটর ডেম স্মৃতিচারণ প্রশ্ন নিয়মিত উত্তর দিয়ে স্ট্রিক বৃদ্ধি করুন</span>
                </div>

                <div className="flex items-center gap-2">
                  {has7DayBadge && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerStreakMilestoneConfetti(currentStreak || 7);
                      }}
                      title="৭ দিনের স্ট্রিক ব্যাজ — কনফেটি ওড়ান!"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95"
                    >
                      <span>🔥 ৭ দিনের ব্যাজ</span>
                      <PartyPopper className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    </button>
                  )}

                  <div className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-semibold text-slate-300">
                    {isAnsweredToday ? (
                      <span className="text-emerald-300 font-bold">আজ সুরক্ষিত</span>
                    ) : (
                      <span className="text-amber-300 font-bold">আজ বাকি আছে</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-Tabs: [স্মৃতিচারণ ও বন্ধুদের উত্তর] vs [উপস্থিতি চার্ট ও রেকর্ড] */}
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-black/40 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveStreakTab('memories')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeStreakTab === 'memories'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>সংরক্ষিত স্মৃতি ও বন্ধুদের উত্তর</span>
                  {streakAnswers.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      activeStreakTab === 'memories' ? 'bg-slate-950/20 text-slate-950' : 'bg-white/15 text-amber-300'
                    }`}>
                      {banglaDigits(streakAnswers.length)}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStreakTab('overview')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeStreakTab === 'overview'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>চার্ট ও উপস্থিতি রেকর্ড</span>
                </button>
              </div>

              {/* TAB 1: MEMORIES & FRIENDS' ANSWERS (The User's Core Request) */}
              {activeStreakTab === 'memories' && (
                <div className="space-y-3.5">
                  {/* Feedback Message */}
                  {inlineFeedback && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{inlineFeedback}</span>
                    </div>
                  )}

                  {/* Private streak guarantee info note */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <span>ব্যক্তিগত স্ট্রিক স্মৃতিচারণ (Private Streak Part)</span>
                        <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                          পাবলিক ফিডে পোস্ট হয় না
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-300/90 mt-0.5">
                        আপনার উত্তরগুলো শুধুমাত্র আপনার প্রোফাইলের এই স্ট্রিক অংশে সংরক্ষিত থাকে। এখানে আপনি নিজের উত্তর দেখতে পাবেন এবং জানতে পারবেন আপনার কোন বন্ধুরা একই প্রশ্নের উত্তর দিয়েছেন।
                      </p>
                    </div>
                  </div>

                  {/* Inline Composer if today is not answered yet and viewing own profile */}
                  {isOwnProfile && !isAnsweredToday && (
                    <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/40 backdrop-blur-md space-y-3 shadow-lg">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
                          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                          <span>আজকের প্রশ্ন (#{banglaDigits(todayQuestion.index)})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                          আজকের স্ট্রিক বাকি
                        </span>
                      </div>

                      <blockquote className="text-xs sm:text-sm font-bold text-slate-100 bg-white/5 p-3 rounded-xl border border-white/10">
                        "{todayQuestion.question}"
                      </blockquote>

                      {!isComposerOpen ? (
                        <button
                          type="button"
                          onClick={() => setIsComposerOpen(true)}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Flame className="w-4 h-4 fill-current" />
                          <span>✏️ প্রোফাইলে উত্তর লিখুন ও স্ট্রিক বাড়ান</span>
                        </button>
                      ) : (
                        <div className="space-y-2.5 animate-fade-in">
                          <textarea
                            value={inlineAnswerText}
                            onChange={(e) => setInlineAnswerText(e.target.value)}
                            placeholder="আপনার স্মৃতিচারণ বা অনুভূতির কথা লিখুন... (পাবলিক ফিডে যাবে না, শুধু প্রোফাইলে থাকবে)"
                            rows={3}
                            className="w-full p-3 rounded-xl bg-slate-900/90 border border-white/20 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 resize-none"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400">
                              {inlineAnswerText.trim().length > 0 ? `${banglaDigits(inlineAnswerText.trim().length)} অক্ষর` : ''}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsComposerOpen(false);
                                  setInlineAnswerText('');
                                }}
                                disabled={isSubmittingInline}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                              >
                                বাতিল
                              </button>
                              <button
                                type="button"
                                onClick={handleProfileSubmitAnswer}
                                disabled={!inlineAnswerText.trim() || isSubmittingInline}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer"
                              >
                                {isSubmittingInline ? (
                                  <span>সংরক্ষণ হচ্ছে...</span>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>প্রোফাইলে সংরক্ষণ করুন</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* List of User's Saved Streak Memories */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                        <span>সংরক্ষিত স্মৃতিচারণ তালিকা</span>
                      </h4>

                      {/* Friends Batch Filter */}
                      {currentUser?.batchYear && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-400 text-[10px] hidden sm:inline">বন্ধুদের ফিল্টার:</span>
                          <button
                            type="button"
                            onClick={() => setFriendsBatchFilter((prev) => (prev === 'all' ? 'my_batch' : 'all'))}
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              friendsBatchFilter === 'my_batch'
                                ? 'bg-blue-600 text-white border-blue-400'
                                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {friendsBatchFilter === 'my_batch' ? `ব্যাচ '${String(currentUser.batchYear).slice(-2)}` : 'সকল বন্ধু'}
                          </button>
                        </div>
                      )}
                    </div>

                    {isLoadingAnswers ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        স্মৃতিচারণ লোড হচ্ছে...
                      </div>
                    ) : streakAnswers.length === 0 ? (
                      <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-center space-y-2">
                        <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs sm:text-sm text-slate-300 font-medium">
                          {isOwnProfile
                            ? 'আপনার এখনও কোনো সংরক্ষিত স্ট্রিক স্মৃতিচারণ নেই।'
                            : 'এই অ্যালামনাই এখনও কোনো স্ট্রিক উত্তর জমা দেননি।'}
                        </p>
                        {isOwnProfile && (
                          <p className="text-[11px] text-amber-300">
                            আজকের প্রশ্নের উত্তর দিয়ে স্ট্রিক রক্ষা করুন ও ব্যাচমেট বন্ধুদের উত্তর দেখুন!
                          </p>
                        )}
                      </div>
                    ) : (
                      streakAnswers.map((item) => {
                        const rawFriends = friendsAnswersMap[item.questionDate] || [];
                        const friends = rawFriends.filter((f) => {
                          if (friendsBatchFilter === 'my_batch' && currentUser?.batchYear) {
                            return Number(f.authorBatch) === Number(currentUser.batchYear);
                          }
                          return true;
                        });

                        return (
                          <div
                            key={item.id || item.questionDate}
                            className="p-4 rounded-2xl bg-black/45 border border-white/10 hover:border-amber-500/30 transition-all space-y-3"
                          >
                            {/* Question Header & Date */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                                  {item.questionDate === todayStr ? 'আজকের স্মৃতি' : item.questionDate}
                                </span>
                                <span className="text-xs font-semibold text-slate-300">
                                  {item.questionText}
                                </span>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                                <Lock className="w-2.5 h-2.5" />
                                <span>প্রোফাইল স্ট্রিকে সংরক্ষিত</span>
                              </span>
                            </div>

                            {/* Alumnus's Own Written Answer */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                              <span className="text-[10px] text-amber-300 font-bold block">
                                ✍️ {isOwnProfile ? 'আপনার উত্তর' : 'অ্যালামনাইয়ের উত্তর'}:
                              </span>
                              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed italic">
                                "{item.answerText}"
                              </p>
                            </div>

                            {/* Section: Friends Who Answered The Same Question (Core User Requirement) */}
                            <div className="pt-2 border-t border-white/10 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-blue-400" />
                                  <span>একই প্রশ্নের উত্তর দিয়েছেন যে বন্ধুরা ({banglaDigits(friends.length)} জন):</span>
                                </div>
                              </div>

                              {friends.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic bg-white/[0.02] p-2 rounded-lg">
                                  {friendsBatchFilter === 'my_batch'
                                    ? 'আপনার ব্যাচের কোনো বন্ধু এখনও এই প্রশ্নের উত্তর দেননি।'
                                    : 'এখনও কোনো বন্ধু এই নির্দিষ্ট প্রশ্নের উত্তর দেননি।'}
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {friends.map((friend) => (
                                    <div
                                      key={friend.id}
                                      className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition-all space-y-1 text-left"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div
                                          onClick={() => onViewProfile && onViewProfile(friend.userId)}
                                          className="flex items-center gap-2 cursor-pointer group flex-wrap"
                                        >
                                          <img
                                            src={friend.authorAvatar}
                                            alt={friend.authorName}
                                            className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20"
                                          />
                                          <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                                            {friend.authorName}
                                          </span>
                                          {friend.authorBatch && (
                                            <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold">
                                              ব্যাচ '{String(friend.authorBatch).slice(-2)}
                                            </span>
                                          )}
                                          {currentUser?.batchYear && Number(friend.authorBatch) === Number(currentUser.batchYear) && (
                                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                                              🤝 ব্যাচমেট বন্ধু
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-slate-400">বন্ধু</span>
                                      </div>
                                      <p className="text-xs text-slate-200 pl-8 leading-relaxed italic">
                                        "{friend.answerText}"
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: OVERVIEW (METRICS & 30-DAY RECHARTS GRAPH) */}
              {activeStreakTab === 'overview' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Prominent Stat Metrics - Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {/* Metric 1: Current Streak */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/35 backdrop-blur-md hover:border-amber-400/60 transition-colors">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                        <Flame className="w-3.5 h-3.5 fill-current text-amber-400" />
                        <span>বর্তমান স্ট্রিক</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono flex items-baseline gap-1">
                        <span>{banglaDigits(currentStreak)}</span>
                        <span className="text-xs font-bold text-amber-200/80 font-sans">দিন</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {currentStreak > 0 ? 'টানা উপস্থিতি অব্যাহত 🔥' : 'আজ উত্তর দিয়ে শুরু করুন'}
                      </div>
                    </div>

                    {/* Metric 2: Max Streak */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md hover:border-white/30 transition-colors">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        <Award className="w-3.5 h-3.5 text-blue-400" />
                        <span>সর্বোচ্চ রেকর্ড</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white font-mono flex items-baseline gap-1">
                        <span>{banglaDigits(maxStreak)}</span>
                        <span className="text-xs font-bold text-slate-300 font-sans">দিন</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        সর্বকালের সেরা স্ট্রিক
                      </div>
                    </div>

                    {/* Metric 3: 30-Day Active Days */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md hover:border-emerald-400/40 transition-colors">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>গত ৩০ দিনে সক্রিয়</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono flex items-baseline gap-1">
                        <span>{banglaDigits(activeDaysCount)}</span>
                        <span className="text-xs font-bold text-slate-300 font-sans">/৩০ দিন</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        উপস্থিতি হার: {banglaDigits(participationPercent)}%
                      </div>
                    </div>

                    {/* Metric 4: Milestone Status */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md hover:border-indigo-400/40 transition-colors">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>পরবর্তী মাইলফলক</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-indigo-200 font-mono flex items-baseline gap-1">
                        <span>{banglaDigits(currentStreak < 7 ? 7 - currentStreak : (currentStreak < 14 ? 14 - currentStreak : (currentStreak < 30 ? 30 - currentStreak : 7 - (currentStreak % 7))))}</span>
                        <span className="text-xs font-bold text-slate-300 font-sans">দিন বাকি</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {currentStreak < 7 ? '৭ দিনের ব্যাজের জন্য' : 'পরবর্তী স্বীকৃতির জন্য'}
                      </div>
                    </div>
                  </div>

                  {/* 30-Day Activity Bar Chart (Recharts) */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200 px-0.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>গত ৩০ দিনের উপস্থিতি চার্ট (Streak History)</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                          <span>উপস্থিত ({banglaDigits(activeDaysCount)})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-white/15" />
                          <span>অনুপস্থিত ({banglaDigits(30 - activeDaysCount)})</span>
                        </span>
                      </div>
                    </div>

                    {/* The Recharts Bar Chart */}
                    <div className="w-full h-18 sm:h-22 pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={past30DaysData}
                          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                        >
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.08)' }} />
                          <XAxis
                            dataKey="dayLabel"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                            {past30DaysData.map((entry, index) => {
                              const isToday = entry.date === todayStr;
                              const fillColor = entry.answered
                                ? isToday
                                  ? '#f59e0b'
                                  : '#fbbf24'
                                : '#334155';

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
                </div>
              )}

              {/* Collapse Trigger at bottom */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-300 transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-white/5"
                >
                  <span>সংক্ষিপ্ত করুন</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DailyStreakCard;
