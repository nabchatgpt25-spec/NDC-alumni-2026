import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  FileCheck,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ZoomIn,
  MessageSquare,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  BadgeCheck,
  X,
  Pin,
  PinOff,
  Trash2,
  RotateCcw,
  UserCog,
  History,
  Code2,
  Filter,
  Check,
  Lock,
  Sparkles,
  Award,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAdminOverviewStats,
  fetchAdminDocSubmissions,
  reviewAdminDocSubmission,
  searchAlumniForAdmin,
  updateUserRole,
  fetchFeedPostsForModeration,
  togglePostPinnedStatus,
  togglePostDeletedStatus,
  fetchSystemAuditLogs,
  AdminOverviewStats,
  AlumniAdminListItem,
  ModerationPostItem,
  SystemAuditLogItem,
} from '../../services/adminService';
import { AdminDocSubmission, UserRole } from '../../types';
import { cleanupVerifiedAlumniFromPendingQueues } from '../../utils/verificationService';
import { NDCLogo } from '../NDCLogo';
import { AdminCommandCenterView } from './AdminCommandCenterView';
import { AdminFeaturedAlumniManager } from './AdminFeaturedAlumniManager';
import { AdminSiteCustomizer } from './AdminSiteCustomizer';
import { AdminSmallAdminsManager } from './AdminSmallAdminsManager';

interface AdminHubViewProps {
  onNavigate: (route: string) => void;
  onViewProfile?: (userId: number) => void;
}

type AdminTab =
  | 'overview'
  | 'site_customizer'
  | 'verifications'
  | 'users'
  | 'moderation'
  | 'audit'
  | 'command_center'
  | 'featured_alumni'
  | 'small_admins';

export const AdminHubView: React.FC<AdminHubViewProps> = ({
  onNavigate,
  onViewProfile,
}) => {
  const { currentUser } = useAuth();
  const isAdminOrMod = currentUser.role === 'admin' || currentUser.role === 'moderator';
  const isSuperAdmin = currentUser.role === 'admin';

  // Active Tab State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Overview Stats State
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // ID Verification Submissions State
  const [submissions, setSubmissions] = useState<AdminDocSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [docFilter, setDocFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingSubmissions, setProcessingSubmissions] = useState<Record<string, boolean>>({});

  // Lightbox Preview Modal for Documents
  const [previewDoc, setPreviewDoc] = useState<{ url: string; label: string; applicantName: string } | null>(null);

  // User Management State
  const [alumniList, setAlumniList] = useState<AlumniAdminListItem[]>([]);
  const [isLoadingAlumni, setIsLoadingAlumni] = useState(false);
  const [alumniSearchQuery, setAlumniSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'moderator' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAlumniCount, setTotalAlumniCount] = useState(0);
  const pageSize = 20;

  // Role Elevation Modal State
  const [roleEditTarget, setRoleEditTarget] = useState<AlumniAdminListItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('member');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Content Moderation State
  const [moderationPosts, setModerationPosts] = useState<ModerationPostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [postFilter, setPostFilter] = useState<'all' | 'pinned' | 'deleted' | 'active'>('all');
  const [processingPostIds, setProcessingPostIds] = useState<Record<number, boolean>>({});

  // System Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SystemAuditLogItem[]>([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('all');
  const [auditLogAuthError, setAuditLogAuthError] = useState<string | null>(null);
  const [inspectedAuditJson, setInspectedAuditJson] = useState<{ title: string; json: any } | null>(null);

  // Global Notification / Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // 1. Load Overview Stats
  // ---------------------------------------------------------------------------
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await fetchAdminOverviewStats();
      setStats(data);
    } catch (err) {
      console.warn('Failed to load admin stats:', err);
      showToast('Could not load real-time statistics.', 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Load ID Verification Submissions
  // ---------------------------------------------------------------------------
  const loadSubmissions = async (filter = docFilter) => {
    setIsLoadingSubmissions(true);
    try {
      const data = await fetchAdminDocSubmissions(filter);
      setSubmissions(data);
    } catch (err) {
      console.warn('Failed to load submissions:', err);
      showToast('Failed to load verification documents.', 'error');
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Load Alumni for User Management
  // ---------------------------------------------------------------------------
  const loadAlumni = async (query = alumniSearchQuery, rFilter = roleFilter, sFilter = statusFilter, page = currentPage) => {
    setIsLoadingAlumni(true);
    try {
      const result = await searchAlumniForAdmin({
        query,
        roleFilter: rFilter,
        statusFilter: sFilter,
        page,
        limit: pageSize,
      });
      setAlumniList(result.alumni);
      setTotalAlumniCount(result.totalCount);
    } catch (err) {
      console.warn('Failed to load alumni:', err);
      showToast('Failed to query alumni list.', 'error');
    } finally {
      setIsLoadingAlumni(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Load Posts for Moderation
  // ---------------------------------------------------------------------------
  const loadModerationPosts = async (query = postSearchQuery, filter = postFilter) => {
    setIsLoadingPosts(true);
    try {
      const posts = await fetchFeedPostsForModeration({ query, filter, limit: 50 });
      setModerationPosts(posts);
    } catch (err) {
      console.warn('Failed to load moderation posts:', err);
      showToast('Failed to load feed posts for moderation.', 'error');
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Load System Audit Logs
  // ---------------------------------------------------------------------------
  const loadAuditLogs = async (category = auditCategoryFilter) => {
    setIsLoadingAuditLogs(true);
    setAuditLogAuthError(null);
    try {
      const res = await fetchSystemAuditLogs({ categoryFilter: category, limit: 50 });
      if (res.error) {
        setAuditLogAuthError(
          res.error.includes('permission denied') || res.error.includes('policy')
            ? 'Access restricted: System Audit Logs are strictly viewable by Super Administrators (role: admin).'
            : res.error
        );
        setAuditLogs([]);
      } else {
        setAuditLogs(res.logs);
      }
    } catch (err: any) {
      setAuditLogAuthError(err?.message || 'Failed to fetch audit records.');
    } finally {
      setIsLoadingAuditLogs(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAdminOrMod) {
      loadStats();
      loadSubmissions('pending');
      loadAlumni();
    }
  }, [isAdminOrMod]);

  // Global Check: When ANY administrator verifies an alumnus, automatically remove
  // them from the pending submissions queue for all other administrators immediately
  useEffect(() => {
    const handleGlobalVerified = (e: any) => {
      const verifiedUserId = e?.detail?.userId;
      if (verifiedUserId) {
        setSubmissions((prev) => prev.filter((s) => s.userId !== verifiedUserId));
      }
      loadStats();
    };

    window.addEventListener('ndc_alumni_verified_globally', handleGlobalVerified);
    window.addEventListener('ndc_admin_docs_updated', () => loadSubmissions(docFilter));
    window.addEventListener('storage', () => loadSubmissions(docFilter));

    return () => {
      window.removeEventListener('ndc_alumni_verified_globally', handleGlobalVerified);
      window.removeEventListener('ndc_admin_docs_updated', () => loadSubmissions(docFilter));
      window.removeEventListener('storage', () => loadSubmissions(docFilter));
    };
  }, [docFilter]);

  // Tab change effect
  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'verifications') {
      loadSubmissions(docFilter);
    } else if (activeTab === 'users') {
      loadAlumni(alumniSearchQuery, roleFilter, statusFilter, currentPage);
    } else if (activeTab === 'moderation') {
      loadModerationPosts(postSearchQuery, postFilter);
    } else if (activeTab === 'audit') {
      loadAuditLogs(auditCategoryFilter);
    }
  }, [activeTab]);

  // Handle Review Action (Approve / Reject ID submission)
  const handleReviewSubmission = async (submission: AdminDocSubmission, action: 'approved' | 'rejected') => {
    const submissionId = submission.id;
    const note = adminNotes[submissionId] || '';

    setProcessingSubmissions((prev) => ({ ...prev, [submissionId]: true }));

    try {
      const res = await reviewAdminDocSubmission({
        submissionId,
        status: action,
        adminNote: note,
        reviewerProfileId: currentUser.id,
      });

      if (res.success) {
        showToast(
          action === 'approved'
            ? `Successfully approved ${submission.fullName}! Their profile is now verified.`
            : `Rejected submission for ${submission.fullName}. Applicant has been notified.`,
          action === 'approved' ? 'success' : 'info'
        );

        if (action === 'approved') {
          cleanupVerifiedAlumniFromPendingQueues(
            submission.userId,
            currentUser.fullName || 'Admin',
            note || 'Approved by Admin Secretariat'
          );
        }

        setSubmissions((prev) =>
          prev.filter((s) => s.id !== submissionId && (action === 'approved' ? s.userId !== submission.userId : true))
        );
        loadStats();
      } else {
        showToast(res.error || 'Review submission failed. Please try again.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error executing review.', 'error');
    } finally {
      setProcessingSubmissions((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  // Handle Role Elevation Confirm
  const handleConfirmRoleChange = async () => {
    if (!roleEditTarget) return;

    if (roleEditTarget.id === currentUser.id) {
      showToast('Self-demotion protection: You cannot alter your own administrative role.', 'error');
      setRoleEditTarget(null);
      return;
    }

    setIsUpdatingRole(true);
    try {
      const res = await updateUserRole({
        targetUserId: roleEditTarget.id,
        newRole: selectedNewRole,
      });

      if (res.success) {
        showToast(
          `Successfully updated ${roleEditTarget.fullName}'s role to ${selectedNewRole.toUpperCase()}!`,
          'success'
        );

        setAlumniList((prev) =>
          prev.map((a) => (a.id === roleEditTarget.id ? { ...a, role: selectedNewRole } : a))
        );
        loadStats();
        setRoleEditTarget(null);
      } else {
        showToast(res.error || 'Failed to update role. Ensure you have administrator rights.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating user role.', 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Handle Toggle Pin on Post
  const handleTogglePinPost = async (post: ModerationPostItem) => {
    const nextPinned = !post.isPinned;
    setProcessingPostIds((prev) => ({ ...prev, [post.id]: true }));

    try {
      const res = await togglePostPinnedStatus(post.id, nextPinned);
      if (res.success) {
        showToast(nextPinned ? 'Post pinned to top of the Quad feed!' : 'Post unpinned.', 'success');
        setModerationPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, isPinned: nextPinned } : p))
        );
      } else {
        showToast(res.error || 'Failed to update pinned status.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating pin status.', 'error');
    } finally {
      setProcessingPostIds((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  // Handle Toggle Delete / Restore on Post
  const handleToggleDeletePost = async (post: ModerationPostItem) => {
    const nextDeleted = !post.isDeleted;
    setProcessingPostIds((prev) => ({ ...prev, [post.id]: true }));

    try {
      const res = await togglePostDeletedStatus(post.id, nextDeleted);
      if (res.success) {
        showToast(
          nextDeleted ? 'Post soft-deleted and hidden from public Quad feed.' : 'Post restored to Quad feed.',
          nextDeleted ? 'info' : 'success'
        );
        setModerationPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, isDeleted: nextDeleted } : p))
        );
        loadStats();
      } else {
        showToast(res.error || 'Failed to update post deletion status.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating post status.', 'error');
    } finally {
      setProcessingPostIds((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    const query = submissionSearch.toLowerCase().trim();
    if (!query) return submissions;
    return submissions.filter((s) => {
      return (
        s.fullName.toLowerCase().includes(query) ||
        String(s.batchYear).includes(query) ||
        s.collegeRoll.toLowerCase().includes(query) ||
        s.group.toLowerCase().includes(query)
      );
    });
  }, [submissions, submissionSearch]);

  const pendingCount = stats?.pendingDocReviews ?? submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/90 border-blue-500/50 text-blue-200'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toastMessage.type === 'info' && <Shield className="w-5 h-5 text-blue-400 shrink-0" />}
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-white/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-inner shrink-0">
              <NDCLogo className="w-12 h-12 object-contain" />
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-slate-950 shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Governance Hub • Phase 2
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentUser.role === 'admin' ? 'Super Administrator' : 'Moderator'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Notre Dame Admin Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
                Official governance, ID verification reviews, feed moderation, role delegation, and system audit trail.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'overview') loadStats();
                else if (activeTab === 'verifications') loadSubmissions();
                else if (activeTab === 'users') loadAlumni();
                else if (activeTab === 'moderation') loadModerationPosts();
                else loadAuditLogs();
                showToast('Refreshed administrative data directly from Supabase.', 'info');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('feed')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <span>Back to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar (5 Tabs) */}
        <div className="relative z-10 flex items-center gap-2 mt-8 border-t border-white/10 pt-4 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('site_customizer')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'site_customizer'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md font-black ring-2 ring-white/30'
                : 'text-blue-300 hover:text-white hover:bg-white/10 font-bold'
            }`}
          >
            <Sliders className="w-4 h-4 text-blue-300" />
            <span>🎨 Branding, Logo &amp; Background</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === 'verifications'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>ID Document Verification</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-xs">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('moderation')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'moderation'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Content Moderation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <History className="w-4 h-4" />
            <span>System Audit Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('featured_alumni')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'featured_alumni'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-amber-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Featured Positions &amp; Luminaries</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('command_center')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'command_center'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-amber-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>⚡ 100k Command Center</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('small_admins')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'small_admins'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md font-black ring-2 ring-white/30'
                : 'text-emerald-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>🛡️ Appoint Small Admins</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
              Delegation
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OVERVIEW                                                      */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Alumni
                </span>
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isLoadingStats ? (
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                  ) : (
                    stats?.totalUsers.toLocaleString() ?? '0'
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Registered alumni across all HSC cohorts
                </p>
              </div>
            </div>

            {/* Verified Users */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Verified Notredamians
                </span>
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {isLoadingStats ? (
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                  ) : (
                    stats?.verifiedUsers.toLocaleString() ?? '0'
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {stats && stats.totalUsers > 0
                    ? `${Math.round((stats.verifiedUsers / stats.totalUsers) * 100)}% verified brotherhood rate`
                    : 'Authentic verified alumni'}
                </p>
              </div>
            </div>

            {/* Pending Document Reviews */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border border-amber-200/80 dark:border-amber-900/40 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Pending Document Reviews
                </span>
                <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  {isLoadingStats ? (
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                  ) : (
                    stats?.pendingDocReviews.toLocaleString() ?? '0'
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('verifications')}
                  className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <span>Review Submissions</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Total Posts */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Community Posts
                </span>
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isLoadingStats ? (
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                  ) : (
                    stats?.totalPosts.toLocaleString() ?? '0'
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Active Quad feed updates &amp; articles
                </p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab('verifications')}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 group-hover:scale-110 transition-transform">
                  <FileCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  Inspect →
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Review ID Submissions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Approve or reject collegiate ID card uploads with atomic trigger updates.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('moderation')}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  Moderate →
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Feed Content Moderation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pin community announcements to top or remove inappropriate posts.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('users')}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 group-hover:scale-110 transition-transform">
                  <UserCog className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  Manage →
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Role Delegation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Promote trusted alumni to Moderators or Super Admins with audit logs.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('small_admins')}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  Appoint →
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Appoint Small Admins</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Delegate verification &amp; post deletion to emails like nurulanambashir25@.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('featured_alumni')}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                  Manage →
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Featured Positions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Add, edit, or remove distinguished career positions in the Hall of Fame.
              </p>
            </div>
          </div>

          {/* Institutional Studio Banner */}
          <div
            onClick={() => setActiveTab('site_customizer')}
            className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-xl border border-blue-800/80 hover:border-blue-400 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 p-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Sliders className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-black uppercase tracking-wider mb-1">
                  <span>No-Code Control</span>
                </div>
                <h3 className="text-base font-black tracking-tight">
                  Institutional Customizer &amp; Portal Studio
                </h3>
                <p className="text-xs text-blue-100/80 mt-0.5">
                  Update college crest logo, campus background artwork, reunion countdown timer, and circulars live.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-5 py-2.5 bg-white text-slate-950 font-black text-xs rounded-xl shadow-md group-hover:bg-blue-50 transition-colors flex items-center gap-1.5 shrink-0 self-start md:self-auto cursor-pointer"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: SITE CUSTOMIZER (NO-CODE LOGO, BACKGROUND, REUNION, ETC.)        */}
      {/* ===================================================================== */}
      {activeTab === 'site_customizer' && (
        <div className="animate-in fade-in duration-200">
          <AdminSiteCustomizer onShowToast={showToast} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ID DOCUMENT VERIFICATION (CRITICAL)                           */}
      {/* ===================================================================== */}
      {activeTab === 'verifications' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Submissions Filter & Search Toolbar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => {
                    setDocFilter(statusKey);
                    loadSubmissions(statusKey);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize whitespace-nowrap ${
                    docFilter === statusKey
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {statusKey === 'pending'
                    ? `Pending (${pendingCount})`
                    : statusKey === 'all'
                    ? 'All Records'
                    : statusKey}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, roll, batch..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {submissionSearch && (
                <button
                  type="button"
                  onClick={() => setSubmissionSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Submissions List */}
          {isLoadingSubmissions ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <span className="text-xs font-semibold">Loading verification document submissions...</span>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {docFilter === 'pending'
                  ? 'No Pending Document Submissions!'
                  : 'No Matching Submissions Found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {docFilter === 'pending'
                  ? 'All alumni ID card and document verification uploads have been reviewed. New submissions will appear here automatically.'
                  : 'Try selecting a different status filter or clearing your search keywords.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSubmissions.map((sub) => {
                const isProcessing = processingSubmissions[sub.id] || false;

                return (
                  <div
                    key={sub.id}
                    className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 transition-all"
                  >
                    {/* Header: Applicant Info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={sub.avatarUrl || '/ndc-logo.png'}
                          alt={sub.fullName}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            {sub.fullName}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              HSC {sub.batchYear || '—'}
                            </span>
                            <span>•</span>
                            <span>Roll: {sub.collegeRoll || 'N/A'}</span>
                            <span>•</span>
                            <span>{sub.group}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          sub.status === 'approved'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : sub.status === 'rejected'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    {/* Document Preview Box */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>{sub.docTypeLabel}</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Clickable Image Container */}
                      <div
                        onClick={() => {
                          if (sub.documentUrl) {
                            setPreviewDoc({
                              url: sub.documentUrl,
                              label: sub.docTypeLabel,
                              applicantName: sub.fullName,
                            });
                          }
                        }}
                        className="group relative h-48 sm:h-56 rounded-2xl bg-slate-950/5 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-blue-500"
                      >
                        {sub.documentUrl ? (
                          <>
                            <img
                              src={sub.documentUrl}
                              alt={sub.docTypeLabel}
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                              <span className="p-2 rounded-full bg-black/60 backdrop-blur-xs flex items-center gap-1 text-xs font-bold">
                                <ZoomIn className="w-4 h-4" />
                                <span>Inspect Full Resolution</span>
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                            <span className="text-xs font-medium">Document preview unavailable in current environment</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Note Input */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Review Note / Feedback (Optional on approval, included on reject):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Roll & HSC session verified; or Re-upload with clearer image."
                        defaultValue={sub.adminNote || ''}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                        }
                        disabled={sub.status !== 'pending' || isProcessing}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>

                    {/* Action Buttons for Pending Items */}
                    {sub.status === 'pending' ? (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(sub.userId)}
                          className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewSubmission(sub, 'rejected')}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{isProcessing ? 'Processing...' : 'Reject'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReviewSubmission(sub, 'approved')}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isProcessing ? 'Processing...' : 'Approve'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span>Reviewed {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleDateString() : 'recently'}</span>
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(sub.userId)}
                          className="font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: USER MANAGEMENT & ROLE ELEVATION                              */}
      {/* ===================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Search & Filters Bar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search alumni by full name or 4-digit HSC batch year (e.g. 2024)..."
                  value={alumniSearchQuery}
                  onChange={(e) => {
                    const q = e.target.value;
                    setAlumniSearchQuery(q);
                    setCurrentPage(1);
                    loadAlumni(q, roleFilter, statusFilter, 1);
                  }}
                  className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {alumniSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setAlumniSearchQuery('');
                      loadAlumni('', roleFilter, statusFilter, 1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Role filter */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    const r = e.target.value as any;
                    setRoleFilter(r);
                    setCurrentPage(1);
                    loadAlumni(alumniSearchQuery, r, statusFilter, 1);
                  }}
                  className="px-3 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="moderator">Moderators</option>
                  <option value="member">General Members</option>
                </select>

                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const s = e.target.value as any;
                    setStatusFilter(s);
                    setCurrentPage(1);
                    loadAlumni(alumniSearchQuery, roleFilter, s, 1);
                  }}
                  className="px-3 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>
                Showing <strong>{alumniList.length}</strong> of <strong>{totalAlumniCount}</strong> matching alumni
              </span>
              <button
                type="button"
                onClick={() => loadAlumni()}
                className="hover:text-blue-600 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Table</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {isLoadingAlumni ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-xs font-semibold">Querying alumni database...</span>
              </div>
            ) : alumniList.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No alumni match your filters</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Try adjusting the name query or cohort filters above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Alumnus</th>
                      <th className="py-3.5 px-4">HSC Batch</th>
                      <th className="py-3.5 px-4">Stream &amp; Group</th>
                      <th className="py-3.5 px-4">College Roll</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {alumniList.map((alumnus) => {
                      const isVerified = alumnus.verificationStatus === 'verified';
                      const isMod = alumnus.role === 'moderator';
                      const isAdmin = alumnus.role === 'admin';
                      const isSelf = alumnus.id === currentUser.id;

                      return (
                        <tr
                          key={alumnus.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Alumnus Profile */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={alumnus.avatarUrl || '/ndc-logo.png'}
                                alt={alumnus.fullName}
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                  <span>{alumnus.fullName}</span>
                                  {isSelf && (
                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {alumnus.profession || alumnus.city || 'Alumnus'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Batch */}
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {alumnus.batchYear > 0 ? `HSC ${alumnus.batchYear}` : '—'}
                          </td>

                          {/* Stream & Group */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {alumnus.academicGroup
                              ? `${alumnus.academicStream || 'Science'} ${alumnus.academicGroup}`
                              : alumnus.academicStream || 'Science'}
                          </td>

                          {/* College Roll */}
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {alumnus.collegeRoll || '—'}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isAdmin
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : isMod
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {alumnus.role}
                            </span>
                          </td>

                          {/* Verification Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isVerified
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {isVerified ? (
                                <>
                                  <BadgeCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Verified</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Unverified</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Role Button */}
                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => {
                                    setRoleEditTarget(alumnus);
                                    setSelectedNewRole(alumnus.role);
                                  }}
                                  title={isSelf ? 'Self-demotion protection: Cannot change your own role' : 'Edit User Role'}
                                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <UserCog className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Role</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onViewProfile?.(alumnus.id)}
                                className="px-2.5 py-1 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Profile</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalAlumniCount > pageSize && (
              <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {Math.ceil(totalAlumniCount / pageSize)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || isLoadingAlumni}
                    onClick={() => {
                      const prev = currentPage - 1;
                      setCurrentPage(prev);
                      loadAlumni(alumniSearchQuery, roleFilter, statusFilter, prev);
                    }}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= Math.ceil(totalAlumniCount / pageSize) || isLoadingAlumni}
                    onClick={() => {
                      const next = currentPage + 1;
                      setCurrentPage(next);
                      loadAlumni(alumniSearchQuery, roleFilter, statusFilter, next);
                    }}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CONTENT MODERATION (FEED POSTS MANAGER)                       */}
      {/* ===================================================================== */}
      {activeTab === 'moderation' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Moderation Controls Toolbar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(['all', 'active', 'pinned', 'deleted'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => {
                    setPostFilter(filterKey);
                    loadModerationPosts(postSearchQuery, filterKey);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize whitespace-nowrap ${
                    postFilter === filterKey
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {filterKey === 'all'
                    ? 'All Posts'
                    : filterKey === 'pinned'
                    ? '📌 Pinned Posts'
                    : filterKey === 'deleted'
                    ? '🗑️ Soft-Deleted'
                    : 'Active Posts'}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search post text, author name..."
                value={postSearchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setPostSearchQuery(q);
                  loadModerationPosts(q, postFilter);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {postSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setPostSearchQuery('');
                    loadModerationPosts('', postFilter);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Posts Grid */}
          {isLoadingPosts ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <span className="text-xs font-semibold">Loading feed posts for moderation...</span>
            </div>
          ) : moderationPosts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No matching posts found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try selecting a different filter or clearing your search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {moderationPosts.map((post) => {
                const isProcessing = processingPostIds[post.id] || false;

                return (
                  <div
                    key={post.id}
                    className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all shadow-sm flex flex-col justify-between space-y-3.5 ${
                      post.isDeleted
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                        : post.isPinned
                        ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    {/* Author & Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={post.authorAvatar || '/ndc-logo.png'}
                          alt={post.authorName}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {post.authorName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-blue-600">HSC {post.authorBatch || '—'}</span>
                            <span>•</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                              {post.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {post.isPinned && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" />
                            <span>Pinned</span>
                          </span>
                        )}
                        {post.isDeleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Hidden</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content text */}
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-4 whitespace-pre-line break-words">
                      {post.content}
                    </p>

                    {/* Image thumbnails if any */}
                    {post.images && post.images.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {post.images.slice(0, 3).map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt="Attachment"
                            className="w-16 h-16 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          />
                        ))}
                        {post.images.length > 3 && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            +{post.images.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats & Actions Footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>❤️ {post.likesCount}</span>
                        <span>💬 {post.commentsCount}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Pin Button */}
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleTogglePinPost(post)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            post.isPinned
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {post.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          <span>{post.isPinned ? 'Unpin' : 'Pin to Top'}</span>
                        </button>

                        {/* Toggle Delete / Restore Button */}
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleToggleDeletePost(post)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            post.isDeleted
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {post.isDeleted ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                          <span>{post.isDeleted ? 'Restore Post' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: SYSTEM AUDIT LOGS                                              */}
      {/* ===================================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Audit Controls & Category Selector */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'VERIFICATION', label: 'Verifications' },
                { id: 'ADMIN_DOC', label: 'Doc Reviews' },
                { id: 'PROFILE', label: 'Profile Changes' },
                { id: 'VOUCH', label: 'Peer Vouches' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setAuditCategoryFilter(cat.id);
                    loadAuditLogs(cat.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    auditCategoryFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <History className="w-3.5 h-3.5" />
              <span>Immutable security trail (Last 50 entries)</span>
            </div>
          </div>

          {/* Audit Error Notice (e.g. if Moderator accesses Super Admin restricted table) */}
          {auditLogAuthError && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3">
              <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-sm block">Restricted Security Trail</span>
                <p>{auditLogAuthError}</p>
                <p className="text-[11px] opacity-80">
                  Per Notre Dame Governance RLS policies, raw audit trails require Super Administrator authentication credentials.
                </p>
              </div>
            </div>
          )}

          {/* Audit Table */}
          {isLoadingAuditLogs ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <span className="text-xs font-semibold">Loading system audit records...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No audit records found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audit logs are recorded automatically upon administrative reviews and profile transitions.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Table &amp; ID</th>
                      <th className="py-3 px-4">Executed By</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {auditLogs.map((log) => {
                      const isApproved = log.action.includes('APPROVED');
                      const isRejected = log.action.includes('REJECTED');

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Action Name */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isRejected
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>

                          {/* Target Table & Entity ID */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            <span className="font-bold text-slate-900 dark:text-white">{log.entityTable}</span>
                            <span className="text-slate-400 mx-1">#</span>
                            <span>{log.entityId}</span>
                          </td>

                          {/* Executed By */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{log.actorName}</div>
                            {log.actorRole && (
                              <span className="text-[10px] uppercase font-bold text-slate-500">
                                {log.actorRole}
                              </span>
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>

                          {/* Changes JSON Button */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setInspectedAuditJson({
                                  title: `${log.action} (ID #${log.id})`,
                                  json: {
                                    action: log.action,
                                    entity_table: log.entityTable,
                                    entity_id: log.entityId,
                                    actor_name: log.actorName,
                                    reason: log.reason,
                                    old_values: log.oldValues,
                                    new_values: log.newValues,
                                    timestamp: log.createdAt,
                                  },
                                })
                              }
                              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Code2 className="w-3.5 h-3.5 text-blue-500" />
                              <span>Inspect JSON</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ROLE ELEVATION CONFIRMATION MODAL                                    */}
      {/* ===================================================================== */}
      {roleEditTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUpdatingRole) setRoleEditTarget(null);
          }}
        >
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Delegate Member Role
                  </h3>
                  <p className="text-xs text-slate-500">Notre Dame Governance Authority</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUpdatingRole}
                onClick={() => setRoleEditTarget(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Alumnus Overview */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <img
                src={roleEditTarget.avatarUrl || '/ndc-logo.png'}
                alt={roleEditTarget.fullName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
              />
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {roleEditTarget.fullName}
                </div>
                <div className="text-xs text-slate-500">
                  HSC {roleEditTarget.batchYear || '—'} • Current Role:{' '}
                  <span className="font-bold uppercase text-purple-600 dark:text-purple-400">
                    {roleEditTarget.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Role Options Radio */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Elevated Role:
              </label>

              {(
                [
                  {
                    role: 'member' as UserRole,
                    title: 'General Member',
                    desc: 'Standard alumni portal access, feed interactions, and batch directory.',
                  },
                  {
                    role: 'moderator' as UserRole,
                    title: 'Moderator',
                    desc: 'Review ID document submissions, pin posts, and moderate Quad discussions.',
                  },
                  {
                    role: 'admin' as UserRole,
                    title: 'Super Administrator',
                    desc: 'Full administrative access: delegate roles, audit trail, and database governance.',
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.role}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    selectedNewRole === option.role
                      ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="elevated_role"
                    value={option.role}
                    checked={selectedNewRole === option.role}
                    onChange={() => setSelectedNewRole(option.role)}
                    className="mt-0.5 accent-purple-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {option.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal block">
                      {option.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Warning notice */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              ℹ️ Role updates are enforced via server trigger <code className="text-purple-600">protect_privileged_profile_columns</code> and logged in the system audit trail.
            </p>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isUpdatingRole}
                onClick={() => setRoleEditTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isUpdatingRole || selectedNewRole === roleEditTarget.role}
                onClick={handleConfirmRoleChange}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdatingRole ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm Role Change</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* AUDIT LOG JSON INSPECTOR MODAL                                        */}
      {/* ===================================================================== */}
      {inspectedAuditJson && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedAuditJson(null);
          }}
        >
          <div className="max-w-2xl w-full max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold truncate max-w-md">{inspectedAuditJson.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedAuditJson(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-black/50 p-4 font-mono text-xs text-emerald-400 border border-slate-800">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(inspectedAuditJson.json, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectedAuditJson(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: 100K COMMAND CENTER                                           */}
      {/* ===================================================================== */}
      {activeTab === 'command_center' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <AdminCommandCenterView onViewProfile={onViewProfile} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: FEATURED POSITIONS & LUMINARIES                                */}
      {/* ===================================================================== */}
      {activeTab === 'featured_alumni' && (
        <AdminFeaturedAlumniManager onViewProfile={onViewProfile} />
      )}

      {/* ===================================================================== */}
      {/* TAB 8: SMALL ADMIN MAKING SYSTEM                                      */}
      {/* ===================================================================== */}
      {activeTab === 'small_admins' && (
        <AdminSmallAdminsManager
          onNavigateToSmallAdmin={() => onNavigate('small-admin')}
          showToast={showToast}
        />
      )}

      {/* Full-Screen Document Inspection Modal */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewDoc(null);
          }}
        >
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>{previewDoc.label}</span>
                </h4>
                <p className="text-xs text-slate-400">Applicant: {previewDoc.applicantName}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Open image in new browser tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
              <img
                src={previewDoc.url}
                alt={previewDoc.label}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg ring-1 ring-white/10"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
