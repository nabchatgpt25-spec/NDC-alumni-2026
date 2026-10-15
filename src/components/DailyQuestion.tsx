import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Sparkles,
  Calendar,
  CheckCircle2,
  Share2,
  Award,
  ChevronRight,
  X,
  Lock,
  Unlock,
  Users,
  PartyPopper,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserStreak,
  loadDailyStreakLocal,
  fetchTodayAnswers,
  triggerStreakMilestoneConfetti,
  recordStreakAnswerInDb,
  type DailyQuestionAnswerItem,
  type UserStreakData,
} from '../services/streakService';

/**
 * 30 Authentic Notre Dame College (Dhaka) Nostalgia Questions in Bangla.
 */
export const NDC_NOSTALGIA_QUESTIONS: string[] = [
  'এনডিসির ক্যান্টিনের কোন খাবারটা আপনার সবচেয়ে বেশি মনে পড়ে? আলু পরোটা, হালিম নাকি গরম শিঙাড়া?',
  'ফাদার টিম, ফাদার পিশোতো কিংবা ফাদার হ্যারিংটন — কোন ফাদারের কথা আজও স্মৃতিতে অমলিন?',
  'ল্যাব ক্লাসের সবচেয়ে মজার বা অদ্ভুত কোনো ঘটনা মনে আছে কি?',
  'এনডিসির করিডোরে বন্ধুদের সাথে প্রথম আড্ডার স্মৃতি মনে পড়ে?',
  'ম্যাথ বা ফিজিক্স ক্লাসের কোন শিক্ষকের ডায়লগ ক্লাসে মুখস্থ হয়ে গিয়েছিল?',
  'কলেজ মাঠে শেষ কবে বসে বন্ধুদের সাথে বিকেল কাটিয়েছিলেন?',
  'এনডিসির ক্লাবগুলোর কথা মনে আছে? সায়েন্স ক্লাব, ডিবেটিং নাকি নেচার স্টাডি ক্লাব?',
  'এনডিসির প্রথম দিন ক্লাসে ঢোকার সেই প্রথম অনুভূতি কেমন ছিল?',
  'বর্ষাকালে কলেজ প্রাঙ্গণ আর লাল গির্জার পাশের শান্ত পরিবেশের কথা মনে পড়ে?',
  'ক্যান্টিনে বন্ধুদের ‘ট্রিট’ দেওয়া বা বিল ভাগ করার কোনো বিশেষ মজার স্মৃতি মনে আছে?',
  'এনডিসির বার্ষিক ক্রীড়া প্রতিযোগিতা বা স্পোর্টস ডে-র কোনো স্মৃতি মনে আছে?',
  'প্র্যাক্টিক্যাল খাতা সাইন করানোর সেই টানটান উত্তেজনার মুহূর্তগুলোর কথা মনে পড়ে?',
  'এইচএসসি পরীক্ষার আগের শেষ ক্লাসে বন্ধুদের সাথে বিদায়ের অনুভূতি কেমন ছিল?',
  'লাইব্রেরির পিনপতন নীরবতায় বসে পড়ার অভিজ্ঞতা কেমন ছিল?',
  'এনডিসির মূল ফটক দিয়ে সকাল ৮টায় ঢোকার সেই তাড়া আর দৌড়ঝাঁপ মনে পড়ে?',
  'অন্য কলেজের সাথে ফুটবল বা ক্রিকেট ম্যাচের টানটান উত্তেজনার কথা মনে আছে?',
  'কলেজ অডিটোরিয়ামে কোনো সাংস্কৃতিক অনুষ্ঠান, নাটক বা কুইজ প্রতিযোগিতার স্মৃতি?',
  'পরীক্ষার আগের রাতে বন্ধুদের সাথে গ্রুপ স্টাডি বা ফোনালাপের কথা মনে আছে?',
  'কোন শিক্ষকের অনুপ্রেরণা আপনার ব্যক্তি ও ক্যারিয়ার জীবনে সবচেয়ে বড় প্রভাব ফেলেছে?',
  'এনডিসির সবুজ বাগান আর শান্ত গাছপালার নিচে কাটানো কোনো প্রিয় মুহূর্ত?',
  'কলেজ ইউনিফর্ম পরা শেষ দিনটির কথা মনে পড়ে? কেমন অনুভূতি হয়েছিল?',
  'এনডিসির ফাদারদের আন্তরিক উপদেশ বা মরালিটি ক্লাসের কোনো শিক্ষা যা আজও মেনে চলেন?',
  'কলেজের কোন বন্ধুটির সাথে বহু বছর দেখা নেই কিন্তু তাকে আজও খুব মনে পড়ে?',
  'ল্যাব এপ্রন পরে প্রথম দিন রসায়ন বা জীববিজ্ঞানের ক্লাসের অনুভূতি কেমন ছিল?',
  'এনডিসির পিকনিক, স্টাডি ট্যুর বা রিইউনিয়নের মজার কোনো স্মৃতি মনে আছে?',
  'বৃষ্টির দিনে কলেজ বাসে বা রিকশায় চেপে আরামবাগ ক্যাম্পাসে আসার স্মৃতি মনে পড়ে?',
  'কলেজের টিফিন টাইমে বন্ধুদের সাথে টিফিন ভাগাভাগি করার কোনো বিশেষ গল্প?',
  'এনডিসি আপনাকে জীবনের কোন বড় শিক্ষাটি শিখিয়েছে — শৃঙ্খলা, সততা নাকি ভ্রাতৃত্ববোধ?',
  'বিদায় সংবর্ধনা বা ফাদারদের আশীর্বাদ পাওয়ার সেই আবেগঘন মুহূর্তটির কথা মনে আছে?',
  'যদি আজ আবার একদিনের জন্য নটর ডেম কলেজের ছাত্র হতে পারতেন, সবার আগে কী করতেন?',
];

/**
 * Returns current date string in Asia/Dhaka timezone (YYYY-MM-DD).
 */
export function getDhakaDateString(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const d = new Date(date.getTime() + 6 * 60 * 60 * 1000); // UTC+6
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Deterministically picks the question of the day using Asia/Dhaka calendar date.
 */
export function getDailyQuestion(dateStr = getDhakaDateString()): {
  question: string;
  index: number;
  formattedDateBangla: string;
} {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;

  const utcDate = Date.UTC(year, month, day);
  const epochDays = Math.floor(utcDate / (1000 * 60 * 60 * 24));
  const questionIndex = Math.abs(epochDays) % NDC_NOSTALGIA_QUESTIONS.length;

  const monthNamesBangla = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const banglaDigits = (n: number) =>
    String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);

  const formattedDateBangla = `${banglaDigits(day)} ${monthNamesBangla[month]} ${banglaDigits(year)}`;

  return {
    question: NDC_NOSTALGIA_QUESTIONS[questionIndex],
    index: questionIndex + 1,
    formattedDateBangla,
  };
}

export function getDailyQuestionDismissStorageKey(userId?: number | string): string {
  return `ndc_daily_question_dismissed_${userId || 'guest'}`;
}

export function isDailyQuestionDismissed(userId?: number | string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const today = getDhakaDateString();
    const saved = localStorage.getItem(getDailyQuestionDismissStorageKey(userId));
    return saved === today;
  } catch {
    return false;
  }
}

export function dismissDailyQuestion(userId?: number | string): void {
  if (typeof window === 'undefined') return;
  try {
    const today = getDhakaDateString();
    localStorage.setItem(getDailyQuestionDismissStorageKey(userId), today);
    window.dispatchEvent(
      new CustomEvent('ndc_daily_question_dismissed', { detail: { date: today, userId } })
    );
  } catch (e) {
    console.warn('Failed to dismiss daily question:', e);
  }
}

export const banglaDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);

interface DailyQuestionProps {
  onAnswerQuestion?: (question: string) => void;
  onViewProfile?: (userId: number) => void;
}

export const DailyQuestion: React.FC<DailyQuestionProps> = ({
  onAnswerQuestion,
  onViewProfile,
}) => {
  const { currentUser } = useAuth();
  const todayStr = getDhakaDateString();
  const { question, index, formattedDateBangla } = getDailyQuestion(todayStr);

  // 2-Minute Login Delay: Streak card/notification only appears after 2 minutes of login
  const [isDelayPassed, setIsDelayPassed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const loginTs = parseInt(sessionStorage.getItem('ndc_login_timestamp') || '0', 10);
    if (!loginTs) return false;
    return Date.now() - loginTs >= 120_000;
  });

  useEffect(() => {
    if (isDelayPassed) return;
    if (typeof window === 'undefined') {
      setIsDelayPassed(true);
      return;
    }

    let loginTs = parseInt(sessionStorage.getItem('ndc_login_timestamp') || '0', 10);
    if (!loginTs) {
      loginTs = Date.now();
      sessionStorage.setItem('ndc_login_timestamp', String(loginTs));
    }

    const elapsed = Date.now() - loginTs;
    const remaining = Math.max(0, 120_000 - elapsed);

    if (remaining <= 0) {
      setIsDelayPassed(true);
    } else {
      const timer = setTimeout(() => {
        setIsDelayPassed(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ndc_daily_streak_available', {
              detail: { question, formattedDateBangla },
            })
          );
        }
      }, remaining);
      return () => clearTimeout(timer);
    }
  }, [isDelayPassed, question, formattedDateBangla]);

  const [streakData, setStreakData] = useState<UserStreakData>(() =>
    loadDailyStreakLocal(currentUser?.id)
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    isDailyQuestionDismissed(currentUser?.id)
  );
  const [isDismissing, setIsDismissing] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  // Private Streak Answer Composer State (Not a public post, only stored on profile streak)
  const [isWritingAnswer, setIsWritingAnswer] = useState<boolean>(false);
  const [answerInputText, setAnswerInputText] = useState<string>('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Reveal Gate State
  const [todayAnswers, setTodayAnswers] = useState<DailyQuestionAnswerItem[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);
  const [batchFilter, setBatchFilter] = useState<'all' | 'my_batch'>('all');
  const [isAnswersCollapsed, setIsAnswersCollapsed] = useState(false);

  // 7-Day Milestone Celebration Modal State
  const [showMilestoneModal, setShowMilestoneModal] = useState<boolean>(false);
  const [milestoneDaysCelebrated, setMilestoneDaysCelebrated] = useState<number>(7);

  // 1. Sync streak data from Supabase & localStorage on mount and auth change
  useEffect(() => {
    let isMounted = true;

    fetchUserStreak(currentUser?.id, currentUser?.authUserId).then((synced) => {
      if (isMounted) {
        setStreakData(synced);
      }
    });

    const syncLocal = () => {
      setStreakData(loadDailyStreakLocal(currentUser?.id));
      setIsDismissed(isDailyQuestionDismissed(currentUser?.id));
    };

    window.addEventListener('ndc_daily_streak_updated', syncLocal);
    window.addEventListener('ndc_daily_question_dismissed', syncLocal);
    window.addEventListener('storage', syncLocal);

    // Listen for milestone event
    const handleMilestoneEvent = (e: any) => {
      const days = e?.detail?.streakDays || 7;
      setMilestoneDaysCelebrated(days);
      setShowMilestoneModal(true);
    };
    window.addEventListener('ndc_streak_milestone_achieved', handleMilestoneEvent);

    return () => {
      isMounted = false;
      window.removeEventListener('ndc_daily_streak_updated', syncLocal);
      window.removeEventListener('ndc_daily_question_dismissed', syncLocal);
      window.removeEventListener('storage', syncLocal);
      window.removeEventListener('ndc_streak_milestone_achieved', handleMilestoneEvent);
    };
  }, [currentUser?.id, currentUser?.authUserId]);

  const isAnsweredToday = streakData.lastAnsweredDate === todayStr;

  // 2. Load today's answers for the Reveal Gate
  useEffect(() => {
    let isMounted = true;
    setIsLoadingAnswers(true);
    fetchTodayAnswers(todayStr, currentUser?.id)
      .then((answers) => {
        if (isMounted) {
          setTodayAnswers(answers);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingAnswers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [todayStr, isAnsweredToday, currentUser?.id]);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      dismissDailyQuestion(currentUser?.id);
      setIsDismissed(true);
      setIsDismissing(false);
    }, 200);
  };

  // Submit private streak answer (NOT public post, stored on profile streak)
  const handleSubmitAnswer = async () => {
    if (!answerInputText.trim() || !currentUser?.id) return;
    setIsSubmittingAnswer(true);
    try {
      const res = await recordStreakAnswerInDb({
        userId: currentUser.id,
        authUserId: currentUser.authUserId,
        authorName: currentUser.fullName,
        authorAvatar: currentUser.avatarUrl,
        authorBatch: currentUser.batchYear ? Number(currentUser.batchYear) : null,
        questionText: question,
        answerText: answerInputText.trim(),
        questionIndex: index,
        // No postId: strictly keeps it private to streak profile without posting to feed
      });

      setStreakData(res.streakData);
      setSubmissionFeedback('🎉 আপনার স্মৃতিচারণ উত্তর সফলভাবে প্রোফাইল স্ট্রিকে সংরক্ষিত হয়েছে!');
      setIsWritingAnswer(false);
      setAnswerInputText('');

      if (res.isMilestone) {
        setMilestoneDaysCelebrated(res.milestoneDays);
        setShowMilestoneModal(true);
        triggerStreakMilestoneConfetti(res.milestoneDays);
      }

      // Refresh today's answers list so user immediately sees their friends' answers
      fetchTodayAnswers(todayStr, currentUser.id).then((answers) => {
        setTodayAnswers(answers);
      });

      // Notify profile streak component
      window.dispatchEvent(new CustomEvent('ndc_daily_streak_updated'));

      setTimeout(() => setSubmissionFeedback(null), 5000);
    } catch (e) {
      console.error('Failed to submit private streak answer:', e);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleAnswerClick = () => {
    setIsWritingAnswer((prev) => !prev);
  };

  const handleShareQuestion = async () => {
    const text = `আজকের এনডিসি নস্টালজিয়া প্রশ্ন:\n"${question}"\n\nউত্তর দিতে জয়েন করুন নটর ডেম কলেজ অ্যালামনাই পোর্টালে!`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTriggerCelebration = () => {
    triggerStreakMilestoneConfetti(streakData.currentStreak || 7);
  };

  // 7-day streak visualizer (past 6 days + today)
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = getDhakaDateString(d);
    const dayName = new Intl.DateTimeFormat('bn-BD', {
      timeZone: 'Asia/Dhaka',
      weekday: 'short',
    }).format(d);

    const isToday = iso === todayStr;
    const answered = streakData.history?.includes(iso) || (isToday && isAnsweredToday);

    return {
      date: iso,
      dayName,
      isToday,
      answered,
    };
  });

  // Filter today's answers by batch if selected
  const filteredAnswers = useMemo(() => {
    if (batchFilter === 'my_batch' && currentUser?.batchYear) {
      const myBatchNum = Number(currentUser.batchYear);
      return todayAnswers.filter((a) => a.authorBatch === myBatchNum);
    }
    return todayAnswers;
  }, [todayAnswers, batchFilter, currentUser?.batchYear]);

  const has7DayBadge =
    streakData.currentStreak >= 7 ||
    streakData.milestoneBadges?.some((b) => b.includes('7-Day') || b.includes('7_day'));

  // If user dismissed via cross button for today, hide the card (placed after all hooks)
  if (isDismissed && !isDismissing) {
    return null;
  }

  // 2-Minute Login Delay: The daily streak card/notification only appears 2 minutes after login
  if (!isDelayPassed) {
    return null;
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-blue-950 text-white p-3 sm:p-4 border border-blue-500/25 shadow-md transition-all duration-300 hover:border-blue-500/40 ${
          isDismissing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        {/* Decorative Golden / Flame Glow Background (scaled down) */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

        {/* Compact Header Row: Badge, Date & Duolingo-style Streak Counter + Cross Button */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold tracking-tight shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>নস্টালজিয়া #{banglaDigits(index)}</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-blue-200/70 font-medium">
              <Calendar className="w-2.5 h-2.5 text-blue-400" />
              <span>{formattedDateBangla}</span>
            </span>
          </div>

          {/* Right Header Area: Streak Counter + 7-Day Badge + Cross Button */}
          <div className="flex items-center gap-1.5">
            {/* 7-Day Streak Milestone Badge Chip */}
            {has7DayBadge && (
              <button
                type="button"
                onClick={() => {
                  setMilestoneDaysCelebrated(streakData.currentStreak || 7);
                  setShowMilestoneModal(true);
                  handleTriggerCelebration();
                }}
                title="৭ দিনের স্ট্রিক ব্যাজ — কনফেটি ওড়ান!"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[10px] font-bold shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <span>🔥 ৭ দিন</span>
                <PartyPopper className="w-2.5 h-2.5 text-amber-300" />
              </button>
            )}

            {/* Unified Compact Streak Pill */}
            <div
              onClick={streakData.currentStreak >= 7 ? handleTriggerCelebration : undefined}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-black/40 border border-amber-500/25 backdrop-blur-md shadow-xs cursor-pointer hover:border-amber-400/50 transition-colors"
              title={
                isAnsweredToday
                  ? `আজকের স্ট্রিক সংরক্ষিত 🔥 (${streakData.currentStreak} দিন)`
                  : `আজ উত্তর দিলে স্ট্রিক বৃদ্ধি পাবে 🔥 (${streakData.currentStreak} দিন)`
              }
            >
              <Flame
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  streakData.currentStreak > 0
                    ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                    : 'text-slate-500'
                }`}
              />
              <span className="text-xs font-black text-amber-300 font-mono">
                {banglaDigits(streakData.currentStreak)}
              </span>

              {/* Integrated 7-Day Mini Dots */}
              <div className="h-3 w-px bg-white/20 shrink-0 mx-0.5" />
              <div className="flex items-center gap-0.5">
                {past7Days.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.dayName}: ${d.answered ? 'স্ট্রিক সংরক্ষিত' : d.isToday ? 'আজকের দিন' : 'বাকি'}`}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold transition-all ${
                      d.answered
                        ? 'bg-amber-500 text-slate-950'
                        : d.isToday
                        ? 'bg-blue-500/30 text-blue-300 border border-amber-400/80 animate-pulse'
                        : 'bg-white/10 text-slate-500'
                    }`}
                  >
                    {d.answered ? (
                      <Flame className="w-2 h-2 fill-current" />
                    ) : (
                      <span className="w-0.5 h-0.5 rounded-full bg-slate-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cross Button to dismiss today's banner */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="আজকের ব্যানারটি বন্ধ করুন"
              title="আজকের ব্যানারটি বন্ধ করুন"
              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The Bangla Nostalgia Question (Sleek, condensed font & spacing) */}
        <div className="relative z-10 my-2">
          <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug tracking-tight">
            "{question}"
          </p>
        </div>

        {/* Submission Feedback Banner (Compact) */}
        {submissionFeedback && (
          <div className="relative z-10 my-2 p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{submissionFeedback}</span>
          </div>
        )}

        {/* Private Streak Answer Composer (Compact & Shrunk) */}
        {isWritingAnswer && (
          <div className="relative z-10 my-2 p-2.5 sm:p-3 rounded-xl bg-black/60 border border-amber-500/35 backdrop-blur-md shadow-lg space-y-2 animate-fade-in">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>আপনার স্মৃতিচারণ লিখুন</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-medium bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Lock className="w-2.5 h-2.5" />
                <span>প্রাইভেট স্ট্রিক মেমোরি (ফিডে যাবে না)</span>
              </span>
            </div>

            <textarea
              value={answerInputText}
              onChange={(e) => setAnswerInputText(e.target.value)}
              placeholder="ক্যান্টিনের শিঙাড়া, ল্যাব ক্লাস বা কোনো প্রিয় শিক্ষকের স্মৃতি সংক্ষেপে লিখুন..."
              rows={2}
              className="w-full p-2.5 rounded-lg bg-slate-900/90 border border-white/15 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 resize-none transition-all"
            />

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[10px] text-slate-400">
                {answerInputText.trim().length > 0 ? `${banglaDigits(answerInputText.trim().length)} অক্ষর` : '🔒 প্রোফাইলে সংরক্ষিত হবে'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsWritingAnswer(false);
                    setAnswerInputText('');
                  }}
                  disabled={isSubmittingAnswer}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!answerInputText.trim() || isSubmittingAnswer}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingAnswer ? (
                    <span>সংরক্ষণ হচ্ছে...</span>
                  ) : (
                    <>
                      <Flame className="w-3 h-3 fill-current" />
                      <span>সংরক্ষণ ও স্ট্রিক বৃদ্ধি</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REVEAL GATE SECTION (Compact & Shrunk) */}
        {!isAnsweredToday ? (
          /* LOCKED STATE (Sleek 1-line teaser strip instead of massive card) */
          <div className="relative z-10 my-2 rounded-xl border border-amber-500/25 bg-black/35 backdrop-blur-md px-3 py-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                <Lock className="w-3 h-3" />
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                উত্তর দিলে বন্ধুদের স্মৃতিচারণ আনলক হবে
              </p>
            </div>

            {todayAnswers.length > 0 ? (
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Overlapping mini avatar teasers */}
                <div className="flex -space-x-1.5 overflow-hidden">
                  {todayAnswers.slice(0, 3).map((a, idx) => (
                    <img
                      key={idx}
                      src={a.authorAvatar}
                      alt={a.authorName}
                      className="inline-block w-4.5 h-4.5 rounded-full ring-1 ring-slate-900 object-cover opacity-80"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-amber-300">
                  {banglaDigits(todayAnswers.length)} জন
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-amber-400/90 font-medium shrink-0">
                প্রথম উত্তরদাতা হোন!
              </span>
            )}
          </div>
        ) : (
          /* UNLOCKED STATE (Compact friends list with collapse support) */
          <div className="relative z-10 my-2 rounded-xl border border-emerald-500/35 bg-black/40 backdrop-blur-md p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Unlock className="w-3 h-3" />
                </span>
                <span className="text-xs font-bold text-white">
                  বন্ধুদের উত্তরসমূহ ({banglaDigits(todayAnswers.length)})
                </span>
              </div>

              <div className="flex items-center gap-1">
                {currentUser?.batchYear && (
                  <button
                    type="button"
                    onClick={() => setBatchFilter((prev) => (prev === 'all' ? 'my_batch' : 'all'))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer border ${
                      batchFilter === 'my_batch'
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {batchFilter === 'my_batch' ? `ব্যাচ '${String(currentUser.batchYear).slice(-2)}` : 'আমার ব্যাচ'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAnswersCollapsed(!isAnswersCollapsed)}
                  className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                  title={isAnswersCollapsed ? 'তালিকা খুলুন' : 'সংক্ষেপ করুন'}
                >
                  {isAnswersCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* List of Answers (Streamlined & Compact) */}
            {!isAnswersCollapsed && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {isLoadingAnswers ? (
                  <div className="py-3 text-center text-[11px] text-slate-400">
                    উত্তর লোড হচ্ছে...
                  </div>
                ) : filteredAnswers.length === 0 ? (
                  <div className="p-2.5 rounded-lg bg-white/5 text-center text-[11px] text-slate-300">
                    নির্বাচিত ফিল্টারে কোনো উত্তর পাওয়া যায়নি।
                  </div>
                ) : (
                  filteredAnswers.map((ans) => (
                    <div
                      key={ans.id}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div
                          className="flex items-center gap-1.5 cursor-pointer group"
                          onClick={() => onViewProfile && onViewProfile(ans.userId)}
                        >
                          <img
                            src={ans.authorAvatar}
                            alt={ans.authorName}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20"
                          />
                          <span className="text-[11px] font-bold text-white group-hover:text-blue-300 transition-colors">
                            {ans.authorName}
                          </span>
                          {ans.authorBatch && (
                            <span className="px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-medium">
                              '{String(ans.authorBatch).slice(-2)}
                            </span>
                          )}
                          {ans.userId !== currentUser?.id && currentUser?.batchYear && Number(ans.authorBatch) === Number(currentUser.batchYear) && (
                            <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                              🤝 ব্যাচমেট
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400">
                          {ans.userId === currentUser?.id ? 'আপনি' : 'আজ'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-snug pl-6 italic">
                        "{ans.answerText}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Compact Action Footer */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-slate-300 truncate">
            {isAnsweredToday ? (
              <span className="text-emerald-300 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>আজকের স্ট্রিক সম্পন্ন</span>
              </span>
            ) : (
              <span className="text-slate-300">
                স্মৃতি শেয়ার করে স্ট্রিক বাড়ান
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Share Button */}
            <button
              type="button"
              onClick={handleShareQuestion}
              title="প্রশ্ন কপি করুন"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
            >
              {copied ? (
                <span className="text-[10px] font-bold text-emerald-300 px-0.5">কপি!</span>
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Skip / Dismiss Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-[11px] font-medium transition-colors cursor-pointer"
            >
              এড়িয়ে যান
            </button>

            {/* Answer Button */}
            <button
              type="button"
              onClick={handleAnswerClick}
              className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                isAnsweredToday
                  ? 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
              }`}
            >
              <span>{isWritingAnswer ? '✖️ বন্ধ করুন' : (isAnsweredToday ? '✏️ আরও স্মৃতি' : '✏️ উত্তর দিন')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-200" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 7-DAY MILESTONE CELEBRATION MODAL (Requirement 3)                 */}
      {/* ----------------------------------------------------------------- */}
      {showMilestoneModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowMilestoneModal(false)}
        >
          <div
            className="relative max-w-md w-full bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-2xl text-center space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background radiant flame aura */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close Cross */}
            <button
              type="button"
              onClick={() => setShowMilestoneModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Radiant Flame Icon */}
            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/30 border border-white/20">
              <Flame className="w-12 h-12 fill-white animate-bounce" />
            </div>

            {/* Congratulatory Text in Bengali */}
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-widest inline-block">
                অর্জিত মাইলফলক!
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                অভিনন্দন! আপনি টানা {banglaDigits(milestoneDaysCelebrated)} দিনের স্ট্রিক পূর্ণ করেছেন! 🔥
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                আপনার নটর ডেম স্মৃতিচারণ ও একাত্মতা প্রশংসনীয়। আপনি সফলভাবে আনলক করেছেন:
              </p>
            </div>

            {/* Unlocked Badge Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/15 border border-amber-500/40 flex items-center justify-center gap-3 shadow-inner">
              <Award className="w-7 h-7 text-amber-400" />
              <div className="text-left">
                <div className="text-sm font-black text-amber-300">
                  🔥 {banglaDigits(milestoneDaysCelebrated)} দিনের স্ট্রিক ব্যাজ
                </div>
                <div className="text-[11px] text-amber-200/80 font-medium">
                  আপনার অ্যালামনাই প্রোফাইলে যুক্ত হয়েছে
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleTriggerCelebration}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <PartyPopper className="w-4 h-4" />
                <span>কনফেটি ওড়ান!</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMilestoneModal(false)}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer border border-white/10"
              >
                ধন্যবাদ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const recordStreakAnswer = (userId?: number | string) => {
  return recordStreakAnswerInDb({
    userId: Number(userId) || 0,
    questionText: 'আজকের প্রশ্ন',
    answerText: 'উত্তর দেওয়া হয়েছে',
  });
};
