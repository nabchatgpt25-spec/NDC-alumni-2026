import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, Calendar, CheckCircle2, Share2, Award, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    // Fallback if Intl timeZone unavailable
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

  // Day of epoch in UTC
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

export interface DailyStreakData {
  currentStreak: number;
  maxStreak: number;
  lastAnsweredDate: string;
  history: string[]; // List of YYYY-MM-DD
}

export function getDailyStreakStorageKey(userId?: number | string): string {
  return `ndc_daily_streak_${userId || 'guest'}`;
}

export function loadDailyStreak(userId?: number | string): DailyStreakData {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, maxStreak: 0, lastAnsweredDate: '', history: [] };
  }
  try {
    const raw = localStorage.getItem(getDailyStreakStorageKey(userId));
    if (raw) {
      const data = JSON.parse(raw);
      const today = getDhakaDateString();
      const last = data.lastAnsweredDate;

      if (!last) return { currentStreak: 0, maxStreak: 0, lastAnsweredDate: '', history: [] };

      // Calculate difference in days between last answered date and today
      const dToday = new Date(today).getTime();
      const dLast = new Date(last).getTime();
      const diffDays = Math.round((dToday - dLast) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Answered today!
        return data;
      } else if (diffDays === 1) {
        // Answered yesterday, streak still active
        return data;
      } else {
        // Missed at least one day, streak reset
        return {
          currentStreak: 0,
          maxStreak: data.maxStreak || 0,
          lastAnsweredDate: data.lastAnsweredDate,
          history: Array.isArray(data.history) ? data.history : [],
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load daily streak:', e);
  }
  return { currentStreak: 0, maxStreak: 0, lastAnsweredDate: '', history: [] };
}

export function recordStreakAnswer(userId?: number | string): DailyStreakData {
  const today = getDhakaDateString();
  const current = loadDailyStreak(userId);

  if (current.lastAnsweredDate === today) {
    return current; // Already recorded today
  }

  const dToday = new Date(today).getTime();
  const dLast = current.lastAnsweredDate ? new Date(current.lastAnsweredDate).getTime() : 0;
  const diffDays = current.lastAnsweredDate ? Math.round((dToday - dLast) / (1000 * 60 * 60 * 24)) : 999;

  let newStreak = 1;
  if (diffDays === 1) {
    newStreak = current.currentStreak + 1;
  }

  const newMax = Math.max(newStreak, current.maxStreak || 0);
  const updatedHistory = Array.from(new Set([...(current.history || []), today])).slice(-30);

  const updated: DailyStreakData = {
    currentStreak: newStreak,
    maxStreak: newMax,
    lastAnsweredDate: today,
    history: updatedHistory,
  };

  try {
    localStorage.setItem(getDailyStreakStorageKey(userId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ndc_daily_streak_updated', { detail: updated }));
  } catch (e) {
    console.warn('Failed to save daily streak:', e);
  }

  return updated;
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

interface DailyQuestionProps {
  onAnswerQuestion: (question: string) => void;
}

export const DailyQuestion: React.FC<DailyQuestionProps> = ({ onAnswerQuestion }) => {
  const { currentUser } = useAuth();
  const todayStr = getDhakaDateString();
  const { question, index, formattedDateBangla } = getDailyQuestion(todayStr);

  const [streakData, setStreakData] = useState<DailyStreakData>(() =>
    loadDailyStreak(currentUser?.id)
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    isDailyQuestionDismissed(currentUser?.id)
  );
  const [isDismissing, setIsDismissing] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sync = () => {
      setStreakData(loadDailyStreak(currentUser?.id));
      setIsDismissed(isDailyQuestionDismissed(currentUser?.id));
    };
    sync();
    window.addEventListener('ndc_daily_streak_updated', sync);
    window.addEventListener('ndc_daily_question_dismissed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ndc_daily_streak_updated', sync);
      window.removeEventListener('ndc_daily_question_dismissed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [currentUser?.id]);

  const isAnsweredToday = streakData.lastAnsweredDate === todayStr;

  // Once answered today or skipped via cross button, do not show again
  if (isAnsweredToday || (isDismissed && !isDismissing)) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      dismissDailyQuestion(currentUser?.id);
      setIsDismissed(true);
      setIsDismissing(false);
    }, 200);
  };

  const handleAnswerClick = () => {
    onAnswerQuestion(question);
  };

  const handleShareQuestion = async () => {
    const text = `আজকের এনডিসি নস্টালজিয়া প্রশ্ন:\n"${question}"\n\nউত্তর দিতে জয়েন করুন নটর ডেম কলেজ অ্যালামনাই পোর্টালে!`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  const banglaDigits = (n: number) =>
    String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 border border-blue-500/30 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-blue-500/50 ${
        isDismissing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Decorative Golden / Flame Glow Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Row: Badge, Date & Duolingo-style Streak Counter + Cross Button */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>দৈনিক নস্টালজিয়া প্রশ্ন #{banglaDigits(index)}</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-blue-200/80 font-medium">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span>{formattedDateBangla}</span>
          </span>
        </div>

        {/* Right Header Area: Streak Counter + Cross / Dismiss Button */}
        <div className="flex items-center gap-2">
          {/* Duolingo Style Streak Counter Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/40 border border-amber-500/30 backdrop-blur-md shadow-inner">
            <div className="relative flex items-center justify-center">
              <Flame
                className={`w-5 h-5 transition-transform duration-300 ${
                  streakData.currentStreak > 0
                    ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-bounce'
                    : 'text-slate-500'
                }`}
              />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1">
                <span className="text-sm font-extrabold text-amber-300 font-mono">
                  {banglaDigits(streakData.currentStreak)}
                </span>
                <span className="text-[11px] font-bold text-amber-200/90">
                  দিনের স্ট্রিক!
                </span>
              </div>
            </div>
          </div>

          {/* Cross Button to skip today's question */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="আজকের প্রশ্নটি স্কিপ করুন"
            title="আজকের প্রশ্নটি স্কিপ / ক্রস করুন"
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5 hover:border-white/20 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The Bangla Nostalgia Question */}
      <div className="relative z-10 mb-5">
        <blockquote className="text-base sm:text-lg md:text-xl font-bold text-slate-100 leading-snug tracking-tight">
          "{question}"
        </blockquote>
      </div>

      {/* 7-Day Streak Week Tracker (Duolingo Style Flame Dots) */}
      <div className="relative z-10 mb-5 p-3 rounded-2xl bg-black/25 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>সাপ্তাহিক স্ট্রিক ট্র্যাকার</span>
          </span>
          <span className="text-[10px] text-amber-300/90 font-medium">
            আজ উত্তর দিলে স্ট্রিক বৃদ্ধি পাবে 🔥
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {past7Days.map((d) => (
            <div
              key={d.date}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl border transition-all ${
                d.isToday
                  ? 'bg-blue-600/20 border-blue-400 ring-2 ring-blue-400/30 animate-pulse'
                  : d.answered
                  ? 'bg-amber-500/15 border-amber-500/30'
                  : 'bg-white/5 border-white/5 opacity-60'
              }`}
            >
              <span className="text-[10px] font-medium text-slate-300 mb-1">
                {d.dayName}
              </span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  d.answered
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : d.isToday
                    ? 'bg-blue-500/20 text-blue-300 border border-dashed border-blue-400'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {d.answered ? (
                  <Flame className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer: "✏️ উত্তর লিখুন" Button + Share Option + Skip Option */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium">
            আপনার ব্যাচমেট ও ভাইদের সাথে স্মৃতি শেয়ার করুন
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Skip Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer border border-white/10 shrink-0"
          >
            এড়িয়ে যান
          </button>

          {/* Copy / Share Button */}
          <button
            type="button"
            onClick={handleShareQuestion}
            title="প্রশ্ন কপি করুন"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer border border-white/10 shrink-0"
          >
            {copied ? (
              <span className="text-[11px] font-bold text-emerald-300 px-1">কপি হয়েছে!</span>
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>

          {/* Write Answer Button */}
          <button
            type="button"
            onClick={handleAnswerClick}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>✏️ উত্তর লিখুন</span>
            <ChevronRight className="w-4 h-4 text-blue-200" />
          </button>
        </div>
      </div>
    </div>
  );
};
