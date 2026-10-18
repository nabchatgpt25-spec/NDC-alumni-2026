import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  HeartHandshake,
  Search,
  CheckCircle2,
  Send,
  UserCheck,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Stethoscope,
  Plane,
  Building,
  Rocket,
  ChevronRight,
  CornerDownRight,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  MentorshipCategory,
  MentorshipRequest,
  MentorOffer,
} from '../types';
import {
  MENTORSHIP_CATEGORIES,
  loadMentorshipRequests,
  fetchMentorshipRequestsFromDb,
  createMentorshipRequest,
  addMentorshipAnswer,
  loadMentorOffers,
  fetchMentorOffersFromDb,
  registerMentorOffer,
} from '../utils/mentorshipService';
import { triggerMentorshipConfetti } from '../utils/confettiHelper';
import { MentorshipCelebrationBanner } from './MentorshipCelebrationBanner';
import { notifyMentorshipQuestion, notifyMentorshipAnswer } from '../utils/notificationService';

interface MentorshipViewProps {
  onViewProfile?: (userId: number) => void;
  onNavigate?: (route: string) => void;
}

type MainActionType = 'ask' | 'offer' | 'find';

export const MentorshipView: React.FC<MentorshipViewProps> = ({
  onViewProfile,
  onNavigate,
}) => {
  const { currentUser, isLoggedIn } = useAuth();

  // Main 3 Actions selection
  const [activeAction, setActiveAction] = useState<MainActionType>('find');

  // ACTION 1: “সাহায্য চাই” state
  const [askTopic, setAskTopic] = useState<MentorshipCategory>('Medical');
  const [targetedMentor, setTargetedMentor] = useState<MentorOffer | null>(null);
  const [askQuestion, setAskQuestion] = useState('');
  const [askContact, setAskContact] = useState('');
  const [askSuccessMessage, setAskSuccessMessage] = useState<string | null>(null);
  const [askSubmittedSnippet, setAskSubmittedSnippet] = useState<string | null>(null);

  // ACTION 2: “সাহায্য দিতে চাই” state
  const [offerCategory, setOfferCategory] = useState<MentorshipCategory>('Job');
  const [offerExpertise, setOfferExpertise] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerInstitution, setOfferInstitution] = useState(currentUser?.institution || '');
  const [offerPosition, setOfferPosition] = useState(currentUser?.position || '');
  const [offerContactPref, setOfferContactPref] = useState('হোয়াটসঅ্যাপ / মেসেজ');
  const [offerSuccessMessage, setOfferSuccessMessage] = useState<string | null>(null);
  const [offerSubmittedSnippet, setOfferSubmittedSnippet] = useState<string | null>(null);

  // ACTION 3: “সিনিয়র খুঁজুন” state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MentorshipCategory | 'all'>('all');

  // Data lists
  const [requests, setRequests] = useState<MentorshipRequest[]>(() => loadMentorshipRequests());
  const [mentors, setMentors] = useState<MentorOffer[]>(() => loadMentorOffers());

  // Cloud sync with Supabase on mount
  useEffect(() => {
    let isMounted = true;
    fetchMentorOffersFromDb().then((data) => {
      if (isMounted && data && data.length > 0) {
        setMentors(data);
      }
    });

    fetchMentorshipRequestsFromDb().then((data) => {
      if (isMounted && data && data.length > 0) {
        setRequests(data);
      }
    });

    const handleMentorsUpdate = () => {
      setMentors(loadMentorOffers());
    };
    const handleRequestsUpdate = () => {
      setRequests(loadMentorshipRequests());
    };

    window.addEventListener('ndc_mentors_updated', handleMentorsUpdate);
    window.addEventListener('ndc_mentorship_requests_updated', handleRequestsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('ndc_mentors_updated', handleMentorsUpdate);
      window.removeEventListener('ndc_mentorship_requests_updated', handleRequestsUpdate);
    };
  }, []);

  // Inline answering state
  const [answeringReqId, setAnsweringReqId] = useState<string | null>(null);
  const [answerInputText, setAnswerInputText] = useState('');

  // Category icons helper (English badges for senior profiles)
  const getCategoryBadge = (cat: MentorshipCategory) => {
    switch (cat) {
      case 'Medical':
        return { label: 'Medical', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' };
      case 'Job':
        return { label: 'Job & Career', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' };
      case 'Abroad':
        return { label: 'Study Abroad', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800' };
      case 'Degree':
        return { label: 'University & Degree', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };
      case 'Business':
        return { label: 'Business & Startup', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
      default:
        return { label: cat, color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    }
  };

  // Submit Question handler (Action 1)
  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;

    const currentText = askQuestion.trim();
    createMentorshipRequest(
      askTopic,
      currentText,
      {
        id: currentUser?.id || Date.now(),
        name: currentUser?.fullName || 'নটরডেমিয়ান ব্রাদার',
        batch: currentUser?.batchYear,
        avatar: currentUser?.avatarUrl,
        contact: askContact || currentUser?.phone || currentUser?.email,
      },
      targetedMentor ? { id: targetedMentor.userId, name: targetedMentor.fullName } : undefined
    );

    // STRICT 1-to-1 Community Notification:
    // When a user asks a mentor, notify ONLY that specific mentor.
    // Do NOT broadcast to other users.
    if (targetedMentor && targetedMentor.userId && currentUser) {
      notifyMentorshipQuestion({
        mentorId: targetedMentor.userId,
        mentorName: targetedMentor.fullName,
        questionText: currentText,
        topic: askTopic,
        actor: currentUser,
      });
    }

    setRequests(loadMentorshipRequests());
    setAskSubmittedSnippet(currentText);
    setAskQuestion('');
    setAskContact('');
    setTargetedMentor(null);

    // Trigger subtle celebratory confetti effect
    triggerMentorshipConfetti('request');

    setAskSuccessMessage('আপনার প্রশ্নটি সফলভাবে জমা হয়েছে! সিনিয়র নটরডেমিয়ানরা উত্তর দিলে এখানে দেখতে পাবেন।');
  };

  // Save Mentor Offer handler (Action 2)
  const handleSaveMentorOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerExpertise.trim() || !offerDescription.trim()) return;

    const currentExpertise = offerExpertise.trim();
    registerMentorOffer({
      userId: currentUser?.id || Date.now(),
      fullName: currentUser?.fullName || 'সিনিয়র নটরডেমিয়ান',
      batchYear: currentUser?.batchYear,
      avatarUrl: currentUser?.avatarUrl,
      category: offerCategory,
      expertise: currentExpertise,
      shortDescription: offerDescription.trim(),
      institution: offerInstitution.trim() || undefined,
      position: offerPosition.trim() || undefined,
      contactPreference: offerContactPref,
    });

    setMentors(loadMentorOffers());
    setOfferSubmittedSnippet(`${currentExpertise}${offerInstitution ? ` • ${offerInstitution}` : ''}`);

    // Trigger subtle celebratory confetti effect
    triggerMentorshipConfetti('offer');

    setOfferSuccessMessage('ধন্যবাদ ভাই! আপনার মেন্টর প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে। জুনিয়ররা এখন আপনার সহায়তা নিতে পারবে।');
  };

  // Inline Answer handler
  const handlePostAnswer = (requestId: string) => {
    if (!answerInputText.trim()) return;

    const targetReq = requests.find((r) => r.id === requestId);

    addMentorshipAnswer(requestId, answerInputText, {
      id: currentUser?.id || Date.now(),
      name: currentUser?.fullName || 'সিনিয়র নটরডেমিয়ান',
      batch: currentUser?.batchYear,
      avatar: currentUser?.avatarUrl,
      profession: currentUser?.position || currentUser?.profession || 'অ্যালামনাই',
    });

    // STRICT 1-to-1 Community Notification:
    // When a mentor replies, notify ONLY the original requester.
    // Do NOT broadcast to other users.
    if (targetReq && targetReq.userId && currentUser) {
      notifyMentorshipAnswer({
        requesterId: targetReq.userId,
        answerText: answerInputText,
        actor: currentUser,
      });
    }

    setRequests(loadMentorshipRequests());
    setAnswerInputText('');
    setAnsweringReqId(null);
    triggerMentorshipConfetti('offer');
  };

  // Filtered mentors for Action 3
  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      // Category filter
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = m.fullName.toLowerCase().includes(q);
      const matchExp = m.expertise.toLowerCase().includes(q);
      const matchInst = m.institution?.toLowerCase().includes(q) || false;
      const matchPos = m.position?.toLowerCase().includes(q) || false;
      const matchDesc = m.shortDescription.toLowerCase().includes(q);
      const matchBatch = m.batchYear ? String(m.batchYear).includes(q) : false;
      return matchName || matchExp || matchInst || matchPos || matchDesc || matchBatch;
    });
  }, [mentors, selectedCategory, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner - Bangla-First, Mobile-friendly */}
      <div className="rounded-2xl p-5 sm:p-7 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-blue-100 text-xs font-semibold mb-3">
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>নটর ডেম মেন্টরশিপ ও সিনিয়র সহায়তা</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            কীভাবে সাহায্য চান বা করতে চান?
          </h1>
          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
            জুনিয়রদের সরাসরি প্রশ্ন ও সিনিয়র নটরডেমিয়ানদের নির্ভরযোগ্য দিকনির্দেশনা। নিচের যেকোনো একটি অ্যাকশন বেছে নিন।
          </p>
        </div>
      </div>

      {/* 3 CLEAR ACTIONS BAR (Mobile-friendly, prominent, high-contrast) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Action 1: সাহায্য চাই */}
        <button
          type="button"
          onClick={() => {
            setActiveAction('ask');
            setAskSuccessMessage(null);
          }}
          className={`relative p-4 sm:p-5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
            activeAction === 'ask'
              ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 shadow-md ring-2 ring-amber-400/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-800/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🙋‍♂️
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
              অ্যাকশন ১
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              সাহায্য চাই
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              বিষয় বেছে নিন ও প্রশ্ন লিখে জমা দিন
            </p>
          </div>
          {activeAction === 'ask' && (
            <div className="mt-3 flex items-center text-xs font-semibold text-amber-700 dark:text-amber-300">
              <span>ফর্ম নিচে খোলা আছে</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 animate-pulse" />
            </div>
          )}
        </button>

        {/* Action 2: সাহায্য দিতে চাই */}
        <button
          type="button"
          onClick={() => {
            setActiveAction('offer');
            setOfferSuccessMessage(null);
          }}
          className={`relative p-4 sm:p-5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
            activeAction === 'offer'
              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-400/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-800/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🤝
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
              অ্যাকশন ২
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              সাহায্য দিতে চাই
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              দক্ষতা ও সংক্ষিপ্ত বিবরণ দিয়ে যুক্ত হোন
            </p>
          </div>
          {activeAction === 'offer' && (
            <div className="mt-3 flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span>ফর্ম নিচে খোলা আছে</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 animate-pulse" />
            </div>
          )}
        </button>

        {/* Action 3: সিনিয়র খুঁজুন */}
        <button
          type="button"
          onClick={() => setActiveAction('find')}
          className={`relative p-4 sm:p-5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
            activeAction === 'find'
              ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🔍
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
              অ্যাকশন ৩
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              সিনিয়র খুঁজুন
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              ফিল্টার ও সার্চ করে সিনিয়রদের খুঁজে নিন
            </p>
          </div>
          {activeAction === 'find' && (
            <div className="mt-3 flex items-center text-xs font-semibold text-blue-700 dark:text-blue-300">
              <span>তালিকা ও ফিল্টার সক্রিয়</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ACTION 1 INLINE FORM: সাহায্য চাই (Topic + Short Question + Submit) */}
      {/* ========================================================================= */}
      {activeAction === 'ask' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-base">
              🙋‍♂️
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                ১. সাহায্য চাই — আপনার প্রশ্নটি জমা দিন
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                যেকোনো ক্যারিয়ার বা উচ্চশিক্ষা বিষয়ে জুনিয়রদের জন্য সম্পূর্ণ উন্মুক্ত সহায়তা
              </p>
            </div>
          </div>

          {askSuccessMessage && (
            <MentorshipCelebrationBanner
              type="request"
              title="প্রশ্নটি সফলভাবে জমা হয়েছে!"
              message="আপনার জিজ্ঞাসাটি সিনিয়র নটরডেমিয়ান কমিউনিটিতে পোস্ট করা হয়েছে। সিনিয়ররা উত্তর দিলে নিচে দেখতে পাবেন।"
              snippet={askSubmittedSnippet || undefined}
              actionText="নিচে সাম্প্রতিক প্রশ্ন ও উত্তর দেখুন"
              onActionClick={() => {
                const el = document.getElementById('recent-questions-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onDismiss={() => {
                setAskSuccessMessage(null);
                setAskSubmittedSnippet(null);
              }}
            />
          )}

          <form onSubmit={handleSubmitQuestion} className="space-y-4">
            {/* Targeted 1-to-1 Mentor Indicator */}
            {targetedMentor ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/70 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ring-2 ring-amber-200 dark:ring-amber-900">
                    {targetedMentor.avatarUrl ? (
                      <img src={targetedMentor.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      targetedMentor.fullName.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        Directing to Mentor: {targetedMentor.fullName}
                      </span>
                      {targetedMentor.batchYear && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          (HSC {targetedMentor.batchYear})
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold uppercase tracking-wider">
                        1-to-1 Private
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Only {targetedMentor.fullName} receives this notification. Zero broadcast to other users.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTargetedMentor(null)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg text-amber-800 dark:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
                >
                  Ask Open Community Instead
                </button>
              </div>
            ) : mentors.length > 0 ? (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0 text-slate-400">🎯</span>
                  <span className="truncate">Want to ask a specific senior mentor directly?</span>
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    const found = mentors.find((m) => m.id === e.target.value);
                    if (found) {
                      setTargetedMentor(found);
                      setAskTopic(found.category);
                    }
                  }}
                  className="text-xs font-semibold py-1 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="">Choose Mentor (Optional)</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.category})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Step 1: Choose Topic */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                বিষয় বেছে নিন (Choose Topic) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {MENTORSHIP_CATEGORIES.map((cat) => {
                  const isSelected = askTopic === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAskTopic(cat.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold ring-2 ring-amber-400/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xl mb-1">{cat.icon}</span>
                      <span className="text-sm font-bold">{cat.labelBn}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {cat.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: One Short Question */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                সংক্ষিপ্ত প্রশ্ন লিখুন (Write one short question) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                placeholder="যেমন: HSC শেষ করে বিদেশে আন্ডারগ্র্যাডের প্রিপারেশন কীভাবে শুরু করব? বা মেডিকেল ও বিসিএসের জন্য কীভাবে প্রস্তুতি নেব?"
                rows={3}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                নির্দিষ্ট ও স্পষ্ট প্রশ্ন করলে সিনিয়ররা দ্রুত ও সুনির্দিষ্ট উত্তর দিতে পারেন।
              </p>
            </div>

            {/* Optional contact preference */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                আপনার ইমেইল বা ফোন (ঐচ্ছিক — সিনিয়ররা সরাসরি যোগাযোগ করতে চাইলে):
              </label>
              <input
                type="text"
                value={askContact}
                onChange={(e) => setAskContact(e.target.value)}
                placeholder={currentUser?.email || currentUser?.phone || 'যেমন: 017xxxxxxxx বা yourname@email.com'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {currentUser ? `পোস্টকারী: ${currentUser.fullName}` : 'নটরডেম শিক্ষার্থী/অ্যালামনাই হিসেবে জমা হচ্ছে'}
              </span>
              <button
                type="submit"
                disabled={!askQuestion.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>জমা দিন</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION 2 INLINE FORM: সাহায্য দিতে চাই (Expertise + Short Desc + Save) */}
      {/* ========================================================================= */}
      {activeAction === 'offer' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-base">
              🤝
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                ২. সাহায্য দিতে চাই — সিনিয়র মেন্টর প্রোফাইল
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                আপনার পেশাগত অভিজ্ঞতা ও পরামর্শ দিয়ে জুনিয়র ভাইদের ক্যারিয়ার গড়তে সহায়তা করুন
              </p>
            </div>
          </div>

          {offerSuccessMessage && (
            <MentorshipCelebrationBanner
              type="offer"
              title="সিনিয়র মেন্টর প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!"
              message="ধন্যবাদ ভাই! আপনার পরামর্শ ও অভিজ্ঞতা দিয়ে জুনিয়রদের পথপ্রদর্শনে অংশ নেওয়ার জন্য নটরডেম পরিবার কৃতজ্ঞ।"
              snippet={offerSubmittedSnippet || undefined}
              actionText="৩. সিনিয়রদের তালিকায় প্রোফাইল দেখুন"
              onActionClick={() => {
                setActiveAction('find');
                setTimeout(() => {
                  const el = document.getElementById('seniors-search-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              onDismiss={() => {
                setOfferSuccessMessage(null);
                setOfferSubmittedSnippet(null);
              }}
            />
          )}

          <form onSubmit={handleSaveMentorOffer} className="space-y-4">
            {/* Step 1: Choose Expertise Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                ক্যাটেগরি বেছে নিন <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {MENTORSHIP_CATEGORIES.map((cat) => {
                  const isSelected = offerCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setOfferCategory(cat.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-2 ring-emerald-400/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xl mb-1">{cat.icon}</span>
                      <span className="text-sm font-bold">{cat.labelBn}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {cat.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expertise Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                আপনার দক্ষতার ক্ষেত্র (Choose Expertise) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={offerExpertise}
                onChange={(e) => setOfferExpertise(e.target.value)}
                placeholder="যেমন: কার্ডিওলজি ও এফসিপিএস, সিলিকন ভ্যালি সফটওয়্যার ইঞ্জিনিয়ারিং, ইউএসএ ফুল-ফান্ডিং, ইত্যাদি"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                সংক্ষিপ্ত বিবরণ (Short Description) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                placeholder="কীভাবে জুনিয়রদের সাহায্য করতে পারবেন তা সংক্ষেপে লিখুন (যেমন: মেডিকেল এডমিশন ও বিসিএস স্বাস্থ্য পরীক্ষার কৌশল এবং ইন্টার্নশিপ বিষয়ে দিকনির্দেশনা দিতে পারব।)"
                rows={3}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Institution & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  প্রতিষ্ঠান (কর্মক্ষেত্র / বিশ্ববিদ্যালয়):
                </label>
                <input
                  type="text"
                  value={offerInstitution}
                  onChange={(e) => setOfferInstitution(e.target.value)}
                  placeholder="যেমন: ঢাকা মেডিকেল কলেজ / গুগল / বুয়েট"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  পদবী / প্রফেশন:
                </label>
                <input
                  type="text"
                  value={offerPosition}
                  onChange={(e) => setOfferPosition(e.target.value)}
                  placeholder="যেমন: সহকারী অধ্যাপক / সফটওয়্যার ইঞ্জিনিয়ার"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Preferred contact */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                যোগাযোগের পছন্দের মাধ্যম:
              </label>
              <select
                value={offerContactPref}
                onChange={(e) => setOfferContactPref(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="হোয়াটসঅ্যাপ / মেসেজ">হোয়াটসঅ্যাপ / মেসেজ</option>
                <option value="ইমেইল">ইমেইল</option>
                <option value="গুগল মিট / ভিডিও কল">গুগল মিট / ভিডিও কল</option>
                <option value="লিংকডইন">লিংকডইন</option>
              </select>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {currentUser?.fullName ? `মেন্টর: ${currentUser.fullName} (${currentUser.batchYear ? `ব্যাচ ${currentUser.batchYear}` : ''})` : ''}
              </span>
              <button
                type="submit"
                disabled={!offerExpertise.trim() || !offerDescription.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>সংরক্ষণ করুন</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION 3: সিনিয়র খুঁজুন (Search + 5 Category Filters: Medical, Job, Abroad, Degree, Business) */}
      {/* ========================================================================= */}
      <div id="seniors-search-section" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span>৩. সিনিয়র খুঁজুন — ক্যাটাগরি ও সার্চ</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              মেডিকেল, চাকরি, উচ্চশিক্ষা, ডিগ্রি ও ব্যবসা ক্ষেত্রের সিনিয়র নটরডেমিয়ান
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-fit">
            মোট {filteredMentors.length} জন সিনিয়র পাওয়া গেছে
          </span>
        </div>

        {/* Simple Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সিনিয়রদের নাম, প্রতিষ্ঠান, পদবী বা দক্ষতার বিষয় দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              মুছে ফেলুন
            </button>
          )}
        </div>

        {/* 5 CLEAR CATEGORY FILTERS (Medical, Job, Abroad, Degree, Business) + All */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 'সব' (All) filter */}
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            সব ({mentors.length})
          </button>

          {/* 5 specified categories */}
          {MENTORSHIP_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = mentors.filter((m) => m.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.id}</span>
                <span className="opacity-70 text-[11px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Seniors Grid Cards */}
        {filteredMentors.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xl mb-3">
              👨‍🏫
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {mentors.length === 0
                ? 'এখনো কোনো সিনিয়র মেন্টর তালিকাভুক্ত হননি'
                : 'কোনো সিনিয়র পাওয়া যায়নি'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {mentors.length === 0
                ? 'আপনি কি অনুজদের দিকনির্দেশনা দিতে চান? উপরের ‘২. সাহায্য দিতে চাই’ বাটন চেপে নিজের অভিজ্ঞতা ও দক্ষতা সেভ করুন।'
                : 'অন্য কোনো কি-ওয়ার্ড দিয়ে খুঁজুন অথবা ‘সব’ ক্যাটাগরিতে ক্লিক করুন।'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMentors.map((senior) => {
              const badge = getCategoryBadge(senior.category);
              return (
                <div
                  key={senior.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-blue-300 dark:hover:border-blue-800/80 transition-all shadow-xs flex flex-col justify-between space-y-3 font-sans"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={
                        senior.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          senior.fullName
                        )}&background=1e40af&color=fff`
                      }
                      alt={senior.fullName}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500/10 shrink-0"
                    />
                    <div className="min-w-0 flex-1 font-sans">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate font-sans tracking-tight">
                          {senior.fullName}
                        </h4>
                        {senior.batchYear && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0 font-sans">
                            Batch {senior.batchYear}
                          </span>
                        )}
                      </div>

                      {(senior.position || senior.institution) && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5 font-sans">
                          {senior.position}
                          {senior.position && senior.institution && ' • '}
                          {senior.institution}
                        </p>
                      )}

                      <div className="mt-1.5 font-sans">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border font-sans ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expertise & Description in English */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-sans">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 font-sans">
                      🎯 Expertise: {senior.expertise}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                      {senior.shortDescription}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1 font-sans">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                      Contact: {senior.contactPreference || 'Message'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetedMentor(senior);
                          setAskTopic(senior.category);
                          setActiveAction('ask');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer font-sans"
                      >
                        Ask Question
                      </button>
                      {onViewProfile && senior.userId && (
                        <button
                          type="button"
                          onClick={() => onViewProfile(senior.userId)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all cursor-pointer font-sans"
                        >
                          View Profile
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RECENT QUESTIONS & SENIOR ANSWERS (Inline, transparent, helpful) */}
      {/* ========================================================================= */}
      <div id="recent-questions-section" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <span>সাম্প্রতিক প্রশ্নোত্তর ও সিনিয়রদের পরামর্শ</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              জুনিয়রদের করা প্রশ্ন ও সিনিয়রদের দেওয়া দিকনির্দেশনা সরাসরি পড়ুন
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            {requests.length}টি প্রশ্ন
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl mb-3">
              🙋
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              এখনো কোনো প্রশ্ন জমা হয়নি
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              আপনার পড়ালেখা, উচ্চশিক্ষা বা ক্যারিয়ার সংক্রান্ত যেকোনো প্রশ্ন করতে উপরের ‘১. সাহায্য চাই’ ফর্মটি পূরণ করে সাবমিট করুন।
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
            const badge = getCategoryBadge(req.topic);
            const isAnsweringThis = answeringReqId === req.id;
            const answersCount = req.answers?.length || 0;

            return (
              <div
                key={req.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                      🙋
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {req.userName}
                        </span>
                        {req.userBatch && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            ব্যাচ {req.userBatch}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          • {req.createdAt}
                        </span>
                      </div>
                      <span
                        className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {answersCount > 0 ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{answersCount}টি উত্তর</span>
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">
                      উত্তরের অপেক্ষায়
                    </span>
                  )}
                </div>

                {/* Question Body */}
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed pl-1">
                  “{req.question}”
                </p>

                {/* Answers list */}
                {req.answers && req.answers.length > 0 && (
                  <div className="space-y-2.5 pt-2 pl-3 sm:pl-5 border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-2">
                    {req.answers.map((ans) => (
                      <div
                        key={ans.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-sans">
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 font-sans">
                              {ans.mentorName}
                            </span>
                            {ans.mentorBatch && (
                              <span className="text-[10px] text-slate-500 font-sans">
                                (Batch {ans.mentorBatch})
                              </span>
                            )}
                            {ans.mentorProfession && (
                              <span className="text-[10px] text-slate-400 font-sans">
                                • {ans.mentorProfession}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {ans.createdAt}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                          {ans.answerText}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Reply / Answer Box for Seniors */}
                <div className="pt-1">
                  {!isAnsweringThis ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAnsweringReqId(req.id);
                        setAnswerInputText('');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>সিনিয়র পরামর্শ বা উত্তর লিখুন</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>আপনার পরামর্শ বা উত্তর:</span>
                        <button
                          type="button"
                          onClick={() => setAnsweringReqId(null)}
                          className="text-[11px] text-slate-400 hover:text-slate-600"
                        >
                          বাতিল
                        </button>
                      </div>
                      <textarea
                        value={answerInputText}
                        onChange={(e) => setAnswerInputText(e.target.value)}
                        placeholder="জুনিয়র ভাইয়ের প্রশ্নের উত্তর ও পরামর্শ সংক্ষেপে লিখুন..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handlePostAnswer(req.id)}
                          disabled={!answerInputText.trim()}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer"
                        >
                          উত্তর পোস্ট করুন
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
