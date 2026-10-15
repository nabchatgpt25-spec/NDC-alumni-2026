import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Building2,
  MapPin,
  User,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  Clock,
  Trash2,
  Send,
  Mail,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  CareerOpportunity,
  CareerType,
  CAREER_FILTER_TYPES,
  getCareerTypeLabel,
  loadCareerOpportunities,
  createCareerOpportunity,
  applyToCareerOpportunity,
  deleteCareerOpportunity,
} from '../utils/careerService';
import { notifyCareerApplication } from '../utils/notificationService';

interface CareerViewProps {
  onViewProfile?: (profileId: number) => void;
  onNavigate?: (route: string) => void;
}

export const CareerView: React.FC<CareerViewProps> = ({ onViewProfile, onNavigate }) => {
  const { currentUser, isLoggedIn } = useAuth();

  // Primary mode: 'browse' ("চাকরি খুঁজছি") | 'post' ("চাকরি/সুযোগ দিতে চাই")
  const [activeMode, setActiveMode] = useState<'browse' | 'post'>('browse');

  // Filter chips: 'all' | 'job' | 'internship' | 'referral'
  const [activeFilter, setActiveFilter] = useState<'all' | CareerType>('all');

  // Opportunities state
  const [opportunities, setOpportunities] = useState<CareerOpportunity[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<CareerType>('job');
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [applyFeedback, setApplyFeedback] = useState<{ id: string; message: string; isError?: boolean } | null>(null);

  // Check verified alumni status
  const isVerifiedAlumnus = useMemo(() => {
    if (!currentUser || !isLoggedIn) return false;
    return Boolean(
      currentUser.verificationStatus === 'verified' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'moderator' ||
      currentUser.badges?.includes('Verified Notredamian')
    );
  }, [currentUser, isLoggedIn]);

  // Poster batch display
  const posterBatchText = useMemo(() => {
    if (!currentUser) return '';
    if (currentUser.batchYear) return `HSC ${currentUser.batchYear}`;
    if (currentUser.session) return currentUser.session;
    return 'Notredamian Alumnus';
  }, [currentUser]);

  // Load opportunities on mount and sync with events
  useEffect(() => {
    const refreshData = () => {
      setOpportunities(loadCareerOpportunities());
    };
    refreshData();

    window.addEventListener('ndc_careers_updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      window.removeEventListener('ndc_careers_updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  // Filtered opportunities
  const filteredOpportunities = useMemo(() => {
    if (activeFilter === 'all') return opportunities;
    return opportunities.filter((item) => item.type === activeFilter);
  }, [opportunities, activeFilter]);

  // Handle post submission
  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccessMessage(null);

    if (!isLoggedIn) {
      setFormError('সুযোগ পোস্ট করার জন্য অনুগ্রহ করে আগে লগইন করুন।');
      return;
    }

    if (!isVerifiedAlumnus) {
      setFormError('শুধুমাত্র ভেরিফাইড নটর ডেম অ্যালামনাইরা চাকরির সুযোগ পোস্ট করতে পারেন।');
      return;
    }

    if (!formTitle.trim()) {
      setFormError('অনুগ্রহ করে পদের নাম (Title) লিখুন।');
      return;
    }

    if (!formCompany.trim()) {
      setFormError('অনুগ্রহ করে প্রতিষ্ঠানের নাম (Company) লিখুন।');
      return;
    }

    if (!formLocation.trim()) {
      setFormError('অনুগ্রহ করে লোকেশন (Location) লিখুন।');
      return;
    }

    if (!formDescription.trim()) {
      setFormError('অনুগ্রহ করে সংক্ষিপ্ত বিবরণ লিখুন।');
      return;
    }

    const created = createCareerOpportunity({
      title: formTitle.trim(),
      company: formCompany.trim(),
      location: formLocation.trim(),
      type: formType,
      description: formDescription.trim(),
      posterId: currentUser.id || 0,
      posterName: currentUser.fullName || 'Notredamian Alumnus',
      posterBatch: posterBatchText,
      posterAvatar: currentUser.avatarUrl,
      posterEmail: currentUser.email,
    });

    // Reset form
    setFormTitle('');
    setFormCompany('');
    setFormLocation('');
    setFormDescription('');
    setFormSuccessMessage('আপনার চাকরির সুযোগটি সফলভাবে পোস্ট করা হয়েছে!');

    // Switch back to browse mode after brief moment
    setTimeout(() => {
      setActiveMode('browse');
      setFormSuccessMessage(null);
      setExpandedId(created.id);
    }, 1200);
  };

  // Handle one-click apply
  const handleOneClickApply = (opportunityId: string) => {
    setApplyFeedback(null);

    if (!isLoggedIn) {
      setApplyFeedback({
        id: opportunityId,
        message: 'আবেদন করার জন্য অনুগ্রহ করে আগে লগইন করুন।',
        isError: true,
      });
      return;
    }

    const targetOpp = opportunities.find((item) => item.id === opportunityId);

    const result = applyToCareerOpportunity(opportunityId, {
      applicantId: currentUser.id || 0,
      applicantName: currentUser.fullName || 'Notredamian Alumnus',
      applicantBatch: posterBatchText,
      applicantAvatar: currentUser.avatarUrl,
      applicantEmail: currentUser.email,
      applicantPhone: currentUser.phone,
    });

    setApplyFeedback({
      id: opportunityId,
      message: result.message,
      isError: !result.success,
    });

    if (result.success) {
      setOpportunities(loadCareerOpportunities());

      // STRICT 1-to-1 Community Notification:
      // When an alumnus applies to a job, notify ONLY the job poster.
      // Do NOT broadcast to other users. Never notify self.
      if (targetOpp && targetOpp.posterId && currentUser) {
        notifyCareerApplication({
          posterId: targetOpp.posterId,
          jobTitle: targetOpp.title,
          company: targetOpp.company,
          actor: currentUser,
        });
      }
    }

    setTimeout(() => {
      setApplyFeedback((prev) => (prev?.id === opportunityId ? null : prev));
    }, 4000);
  };

  // Handle delete post
  const handleDeletePost = (opportunityId: string) => {
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'moderator';
    const ok = deleteCareerOpportunity(opportunityId, currentUser.id || 0, isAdmin);
    if (ok) {
      setOpportunities(loadCareerOpportunities());
      if (expandedId === opportunityId) {
        setExpandedId(null);
      }
    }
  };

  const toggleDetails = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'কিছুক্ষণ আগে';
      if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'গতকাল';
      return `${diffDays} দিন আগে`;
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 font-sans">
      {/* =========================================================================
          TOP OF PAGE: Two Buttons ("চাকরি খুঁজছি" & "চাকরি/সুযোগ দিতে চাই")
          Strictly NO marketing text, calm and minimal.
      ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-sm mb-6">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveMode('browse');
              setFormError(null);
            }}
            className={`py-3 px-4 rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center justify-center gap-2 ${
              activeMode === 'browse'
                ? 'bg-blue-900 dark:bg-blue-700 text-white shadow-sm ring-2 ring-blue-500/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>চাকরি খুঁজছি</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('post');
              setFormError(null);
            }}
            className={`py-3 px-4 rounded-xl text-sm sm:text-base font-semibold transition-all flex items-center justify-center gap-2 ${
              activeMode === 'post'
                ? 'bg-blue-900 dark:bg-blue-700 text-white shadow-sm ring-2 ring-blue-500/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>চাকরি/সুযোগ দিতে চাই</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: BROWSE JOBS ("চাকরি খুঁজছি")
      ========================================================================= */}
      {activeMode === 'browse' && (
        <div className="space-y-5">
          {/* Filter chips only: সব | চাকরি | ইন্টার্নশিপ | রেফারেল */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CAREER_FILTER_TYPES.map((chip) => {
              const isSelected = activeFilter === chip.id;
              const count =
                chip.id === 'all'
                  ? opportunities.length
                  : opportunities.filter((o) => o.type === chip.id).length;

              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span>{chip.labelBn}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 dark:bg-slate-900/20 text-current'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Job List / Cards */}
          {filteredOpportunities.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                বর্তমানে কোনো সুযোগ তালিকাভুক্ত নেই
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                আপনার প্রতিষ্ঠানে কোনো ইন্টার্নশিপ বা চাকরির সুযোগ থাকলে পোস্ট করতে পারেন।
              </p>
              <button
                type="button"
                onClick={() => setActiveMode('post')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold"
              >
                সুযোগ পোস্ট করুন
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOpportunities.map((opp) => {
                const typeInfo = getCareerTypeLabel(opp.type);
                const isExpanded = expandedId === opp.id;
                const isPoster = isLoggedIn && currentUser && opp.posterId === currentUser.id;
                const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
                const hasApplied =
                  isLoggedIn &&
                  opp.applicants?.some(
                    (app) =>
                      app.applicantId === currentUser.id ||
                      (currentUser.email && app.applicantEmail === currentUser.email)
                  );

                return (
                  <div
                    key={opp.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    {/* Top Row: Title + Type Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          {opp.title}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${typeInfo.badgeClass}`}
                      >
                        {typeInfo.bn}
                      </span>
                    </div>

                    {/* Company & Location */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3">
                      <div className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{opp.company}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{opp.location}</span>
                      </div>
                    </div>

                    {/* Poster Info & Time */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mb-4">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          পোস্ট করেছেন: <span className="font-medium text-slate-700 dark:text-slate-300">{opp.posterName}</span>{' '}
                          <span className="text-slate-400">({opp.posterBatch})</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatRelativeTime(opp.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action Row: Apply and Details buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        {/* Apply Button */}
                        {isPoster ? (
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            আপনার পোস্ট ({opp.applicants.length} আবেদন)
                          </span>
                        ) : hasApplied ? (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>আবেদন সম্পন্ন ✓</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOneClickApply(opp.id)}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
                          >
                            আবেদন করুন
                          </button>
                        )}

                        {/* Inline Feedback Message */}
                        {applyFeedback && applyFeedback.id === opp.id && (
                          <span
                            className={`text-xs ${
                              applyFeedback.isError
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {applyFeedback.message}
                          </span>
                        )}
                      </div>

                      {/* Details Button */}
                      <button
                        type="button"
                        onClick={() => toggleDetails(opp.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span>{isExpanded ? 'সংক্ষিপ্ত করুন' : 'বিস্তারিত'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* =========================================================================
                        INLINE DETAILS EXPANSION (No popups!)
                    ========================================================================= */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 text-slate-800 dark:text-slate-200">
                        {/* Short Description */}
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                            বিবরণ
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            {opp.description}
                          </p>
                        </div>

                        {/* If user is applicant, show confirmation */}
                        {hasApplied && (
                          <div className="text-xs bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-xl flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              আপনার নটর ডেম প্রোফাইলের তথ্যসহ এই সুযোগে সফলভাবে আবেদন রেকর্ড করা হয়েছে।
                            </span>
                          </div>
                        )}

                        {/* POSTER VIEW: Applicant Count and Applicant List */}
                        {(isPoster || isAdmin) && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                আবেদনকারী তালিকা ({opp.applicants.length} জন)
                              </h4>
                              {(isPoster || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePost(opp.id)}
                                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>পোস্ট মুছুন</span>
                                </button>
                              )}
                            </div>

                            {opp.applicants.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">
                                এখনো কোনো অ্যালামনাই আবেদন করেননি।
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {opp.applicants.map((app) => (
                                  <div
                                    key={app.id}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                                        {app.applicantName}
                                      </p>
                                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                                        {app.applicantBatch || 'Notredamian'} •{' '}
                                        {formatRelativeTime(app.appliedAt)}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {app.applicantEmail && (
                                        <a
                                          href={`mailto:${app.applicantEmail}`}
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                                          title={`Email: ${app.applicantEmail}`}
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      {app.applicantPhone && (
                                        <a
                                          href={`tel:${app.applicantPhone}`}
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                                          title={`Call: ${app.applicantPhone}`}
                                        >
                                          <Phone className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      {onViewProfile && app.applicantId > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => onViewProfile(app.applicantId)}
                                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 text-[11px]"
                                        >
                                          প্রোফাইল
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: POST OPPORTUNITY ("চাকরি/সুযোগ দিতে চাই")
          Only verified alumni can post.
          Title, Company, Location, Short Description only; auto-fill poster name and batch.
      ========================================================================= */}
      {activeMode === 'post' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
          {!isVerifiedAlumnus ? (
            /* Calm notice if not verified - NO jarring popups */
            <div className="py-8 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                শুধুমাত্র ভেরিফাইড অ্যালামনাইরা পোস্ট করতে পারবেন
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                প্লাটফর্মের নিরাপত্তা ও নির্ভরযোগ্যতা বজায় রাখতে চাকরির সুযোগ ও রেফারেল পোস্ট করার সুবিধাটি নটর ডেম কলেজের ভেরিফাইড অ্যালামনাইদের জন্য সংরক্ষিত।
              </p>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('feed')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold hover:opacity-90"
                >
                  <span>সহপাঠীদের থেকে ভাউচ নিন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            /* Post Form: Title, Company, Location, Short Description only */
            <form onSubmit={handlePostSubmit} className="space-y-4">
              {/* Type selection: চাকরি | ইন্টার্নশিপ | রেফারেল */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  সুযোগের ধরন
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['job', 'internship', 'referral'] as CareerType[]).map((type) => {
                    const label = getCareerTypeLabel(type);
                    const isSelected = formType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormType(type)}
                        className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold border text-center transition-all ${
                          isSelected
                            ? 'bg-blue-900 text-white border-blue-900 dark:bg-blue-700 dark:border-blue-700 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {label.bn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  পদের নাম / শিরোনাম (Title) *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="যেমন: Software Engineer, Finance Intern"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* Company & Location (2 cols on sm) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    প্রতিষ্ঠান / কোম্পানি (Company) *
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="যেমন: bKash Limited, গ্রামীণফোন"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    কর্মস্থল / লোকেশন (Location) *
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="যেমন: ঢাকা (বনানী / রিমোট)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Short Description only */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  সংক্ষিপ্ত বিবরণ (Short Description) *
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="দায়িত্ব, যোগ্যতা এবং আবেদন সংক্রান্ত সংক্ষিপ্ত তথ্য লিখুন..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  required
                />
              </div>

              {/* Auto-filled poster info display */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>
                    পোস্টদাতা: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.fullName}</span> ({posterBatchText})
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ অটো-পূরণকৃত
                </span>
              </div>

              {/* Errors and Success feedback */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccessMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMode('browse')}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>সুযোগ প্রকাশ করুন</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
