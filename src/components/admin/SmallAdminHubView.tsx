import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Trash2,
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
  Users,
  Eye,
  ArrowLeft,
  Sparkles,
  Info,
  Clock,
  Check,
  RefreshCw,
  MessageSquare,
  Shield,
  Layers,
  Calendar,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  smallAdminVerifyAlumnus,
  smallAdminDeleteBadPost,
  smallAdminRestorePost,
} from '../../services/smallAdminService';
import {
  fetchAdminDocSubmissions,
  reviewAdminDocSubmission,
  fetchFeedPostsForModeration,
  searchAlumniForAdmin,
  AlumniAdminListItem,
  ModerationPostItem,
} from '../../services/adminService';
import { AdminDocSubmission, AlumniProfile } from '../../types';
import { loadStoredAlumniProfiles } from '../../data/mockData';
import { loadVouchRequests, cleanupVerifiedAlumniFromPendingQueues } from '../../utils/verificationService';

interface SmallAdminHubViewProps {
  onNavigate: (route: string) => void;
  onViewProfile?: (profileId: number) => void;
}

type SmallAdminTab = 'verify_alumni' | 'moderate_posts' | 'directory_access' | 'guidelines';

export const SmallAdminHubView: React.FC<SmallAdminHubViewProps> = ({
  onNavigate,
  onViewProfile,
}) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<SmallAdminTab>('verify_alumni');

  // Verify Alumni State
  const [verifySubTab, setVerifySubTab] = useState<'unverified' | 'documents' | 'verified'>('unverified');
  const [alumniSearch, setAlumniSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [unverifiedList, setUnverifiedList] = useState<AlumniAdminListItem[]>([]);
  const [docSubmissions, setDocSubmissions] = useState<AdminDocSubmission[]>([]);
  const [isLoadingAlumni, setIsLoadingAlumni] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<Record<string | number, boolean>>({});

  // Content Moderation State (Delete Bad Posts)
  const [posts, setPosts] = useState<ModerationPostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postSearch, setPostSearch] = useState('');
  const [postFilter, setPostFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [deleteReasonModal, setDeleteReasonModal] = useState<{ postId: number; authorName: string } | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('Inappropriate / Bad content');
  const [customReason, setCustomReason] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // Load Unverified Alumni
  // ---------------------------------------------------------------------------
  const loadAlumniData = async () => {
    setIsLoadingAlumni(true);
    try {
      // 1. Fetch from Supabase
      const result = await searchAlumniForAdmin({
        query: alumniSearch,
        statusFilter: verifySubTab === 'verified' ? 'verified' : 'unverified',
        limit: 100,
      });

      if (result.alumni && result.alumni.length > 0) {
        setUnverifiedList(result.alumni);
      } else {
        // Fallback to local storage mock data
        const local = loadStoredAlumniProfiles();
        const mapped: AlumniAdminListItem[] = local.map((p) => ({
          id: p.id,
          userId: p.userId || p.id,
          fullName: p.fullName,
          avatarUrl: p.avatarUrl,
          batchYear: p.batchYear || 0,
          collegeRoll: p.collegeRoll,
          academicStream: (p.academicStream as string) || (p.group as string) || 'Science',
          academicGroup: p.academicGroup || undefined,
          role: p.role || 'member',
          verificationStatus: p.verificationStatus || 'unverified',
          profession: p.profession,
          institution: p.institution,
          city: p.city,
          country: p.country,
        }));

        const filtered = mapped.filter((a) => {
          if (verifySubTab === 'verified') return a.verificationStatus === 'verified';
          return a.verificationStatus !== 'verified';
        });
        setUnverifiedList(filtered);
      }
    } catch (e) {
      console.warn('Failed to load alumni for small admin:', e);
    } finally {
      setIsLoadingAlumni(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Load ID Document Submissions
  // ---------------------------------------------------------------------------
  const loadDocSubmissions = async () => {
    try {
      const docs = await fetchAdminDocSubmissions('all');
      setDocSubmissions(docs);
    } catch (e) {
      console.warn('Failed to load doc submissions:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // Load Posts for Bad Post Deletion
  // ---------------------------------------------------------------------------
  const loadPostsData = async () => {
    setIsLoadingPosts(true);
    try {
      const fetched = await fetchFeedPostsForModeration({
        query: postSearch,
        filter: postFilter === 'all' ? undefined : postFilter,
        limit: 60,
      });

      if (fetched && fetched.length > 0) {
        setPosts(fetched);
      } else {
        // Fallback to local storage posts
        const raw = localStorage.getItem('ndc_alumni_posts');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const mapped: ModerationPostItem[] = parsed.map((p: any) => ({
              id: p.id,
              authorId: p.author?.id || 0,
              authorName: p.author?.name || p.author?.fullName || 'Notredamian Alumnus',
              authorAvatar: p.author?.avatar || p.author?.avatarUrl || '/ndc-logo.png',
              authorBatch: p.author?.batchYear || p.author?.batch || 0,
              content: p.content || '',
              category: p.category || 'General',
              images: Array.isArray(p.images) ? p.images : [],
              videos: Array.isArray(p.videos) ? p.videos : [],
              likesCount: p.likes || p.likesCount || 0,
              commentsCount: Array.isArray(p.comments) ? p.comments.length : (p.commentsCount || 0),
              isPinned: Boolean(p.isPinned || p.is_pinned),
              isDeleted: Boolean(p.isDeleted || p.is_deleted),
              isEdited: Boolean(p.isEdited || p.is_edited),
              createdAt: p.createdAt || p.timestamp || new Date().toISOString(),
            }));
            setPosts(mapped);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load posts for small admin moderation:', e);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'verify_alumni') {
      loadAlumniData();
      loadDocSubmissions();
    } else if (activeTab === 'moderate_posts') {
      loadPostsData();
    }
  }, [activeTab, verifySubTab, postFilter]);

  // Global Check: When any admin verifies an alumni, auto-remove them from this admin's queue
  useEffect(() => {
    const handleGlobalVerified = (e: any) => {
      const verifiedUserId = e?.detail?.userId;
      if (verifiedUserId) {
        setUnverifiedList((prev) => prev.filter((item) => item.id !== verifiedUserId));
        setDocSubmissions((prev) => prev.filter((doc) => doc.userId !== verifiedUserId));
      }
    };

    window.addEventListener('ndc_alumni_verified_globally', handleGlobalVerified);
    window.addEventListener('ndc_admin_docs_updated', loadDocSubmissions);
    window.addEventListener('storage', loadDocSubmissions);

    return () => {
      window.removeEventListener('ndc_alumni_verified_globally', handleGlobalVerified);
      window.removeEventListener('ndc_admin_docs_updated', loadDocSubmissions);
      window.removeEventListener('storage', loadDocSubmissions);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Action: Small Admin Verify Alumnus
  // ---------------------------------------------------------------------------
  const handleVerifyAlumnus = async (alumnus: AlumniAdminListItem) => {
    const adminName = currentUser.fullName || currentUser.email || 'Small Admin';
    setActionInProgress((prev) => ({ ...prev, [alumnus.id]: true }));

    try {
      const res = await smallAdminVerifyAlumnus({
        targetUserId: alumnus.id,
        smallAdminName: adminName,
        smallAdminProfileId: currentUser.id,
        note: `Verified by Small Admin (${adminName}) on ${new Date().toLocaleDateString()}`,
      });

      if (res.success) {
        showToast(`🎉 Successfully verified ${alumnus.fullName} (Batch ${alumnus.batchYear || 'NDC'})!`, 'success');
        cleanupVerifiedAlumniFromPendingQueues(alumnus.id, adminName, 'Verified by Small Admin');
        // Update local state
        setUnverifiedList((prev) => prev.filter((item) => item.id !== alumnus.id));
      } else {
        showToast(res.error || 'Failed to verify alumnus.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error occurred during verification.', 'error');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [alumnus.id]: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // Action: Review Document Submission (Approve/Reject)
  // ---------------------------------------------------------------------------
  const handleReviewDoc = async (submissionId: string, status: 'approved' | 'rejected') => {
    setActionInProgress((prev) => ({ ...prev, [submissionId]: true }));
    try {
      const res = await reviewAdminDocSubmission({
        submissionId,
        status,
        reviewerProfileId: currentUser.id || 1,
        adminNote: `Reviewed by Small Admin (${currentUser.fullName || 'Moderator'})`,
      });

      if (res.success) {
        showToast(
          status === 'approved'
            ? '✅ ID document approved! Alumnus profile has been verified.'
            : 'Document rejected with notification sent.',
          status === 'approved' ? 'success' : 'info'
        );
        const sub = docSubmissions.find((d) => d.id === submissionId);
        if (status === 'approved' && sub) {
          cleanupVerifiedAlumniFromPendingQueues(sub.userId, currentUser.fullName || 'Moderator');
        }
        loadDocSubmissions();
        loadAlumniData();
      } else {
        showToast(res.error || 'Failed to review document.', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to review document.', 'error');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // Action: Delete Unwanted / Bad Post
  // ---------------------------------------------------------------------------
  const handleConfirmDeletePost = async () => {
    if (!deleteReasonModal) return;
    const { postId, authorName } = deleteReasonModal;
    const finalReason = selectedReason === 'Other' ? customReason : selectedReason;
    const adminName = currentUser.fullName || currentUser.email || 'Small Admin';

    setActionInProgress((prev) => ({ ...prev, [postId]: true }));
    setDeleteReasonModal(null);

    try {
      const res = await smallAdminDeleteBadPost({
        postId,
        smallAdminName: adminName,
        reason: finalReason,
      });

      if (res.success) {
        showToast(`🗑️ Post by ${authorName} removed from feed. Reason: ${finalReason}`, 'success');
        // Mark deleted in state
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isDeleted: true } : p))
        );
      } else {
        showToast(res.error || 'Failed to delete post.', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Error deleting post.', 'error');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [postId]: false }));
      setCustomReason('');
    }
  };

  // ---------------------------------------------------------------------------
  // Action: Restore Post
  // ---------------------------------------------------------------------------
  const handleRestorePost = async (postId: number) => {
    setActionInProgress((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await smallAdminRestorePost(postId);
      if (res.success) {
        showToast('♻️ Post restored to feed successfully.', 'success');
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isDeleted: false } : p))
        );
      } else {
        showToast(res.error || 'Failed to restore post.', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Error restoring post.', 'error');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Filtered Unverified list
  const filteredUnverified = useMemo(() => {
    return unverifiedList.filter((a) => {
      const q = alumniSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.fullName.toLowerCase().includes(q) ||
        (a.collegeRoll && a.collegeRoll.toLowerCase().includes(q)) ||
        (a.batchYear && String(a.batchYear).includes(q));

      const matchBatch =
        selectedBatch === 'all' ||
        (a.batchYear && String(a.batchYear) === selectedBatch);

      return matchSearch && matchBatch;
    });
  }, [unverifiedList, alumniSearch, selectedBatch]);

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const q = postSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);

      const matchFilter =
        postFilter === 'all' ||
        (postFilter === 'active' && !p.isDeleted) ||
        (postFilter === 'deleted' && p.isDeleted);

      return matchSearch && matchFilter;
    });
  }, [posts, postSearch, postFilter]);

  const pendingDocCount = docSubmissions.filter((d) => d.status === 'pending').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-200" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-200" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-200" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Portal Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 text-white p-6 sm:p-8 border border-blue-900/50 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border border-white/20 p-2 flex items-center justify-center shrink-0 backdrop-blur-md shadow-inner">
              <img
                src="/ndc-logo.png"
                alt="Notre Dame Crest"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </span>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    👑 Super Admin Viewing
                  </span>
                )}
                <span className="text-xs text-blue-200/70 font-mono">
                  {currentUser.email || 'Authorized Moderator'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                Admin
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/80 mt-1 max-w-2xl">
                Dedicated authority for verifying alumni profiles, removing unwanted or inappropriate feed posts, and assisting community members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Main Admin Hub</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('feed')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm transition-all border border-white/20 backdrop-blur-md cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>View Public Feed</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Pill Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-blue-300 font-medium">Verify Alumni Queue</div>
            <div className="text-xl font-black text-white mt-0.5">{unverifiedList.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-amber-300 font-medium">Pending ID Documents</div>
            <div className="text-xl font-black text-white mt-0.5">{pendingDocCount}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-emerald-300 font-medium">Active Posts Monitored</div>
            <div className="text-xl font-black text-white mt-0.5">
              {posts.filter((p) => !p.isDeleted).length}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-rose-300 font-medium">Bad Posts Deleted</div>
            <div className="text-xl font-black text-white mt-0.5">
              {posts.filter((p) => p.isDeleted).length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('verify_alumni')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'verify_alumni'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>✅ Verify Alumni</span>
          {unverifiedList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
              {unverifiedList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('moderate_posts')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'moderate_posts'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>🗑️ Delete Bad / Unwanted Posts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('directory_access')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'directory_access'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Directory &amp; Slight Access</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guidelines')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'guidelines'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📜 Moderator Guidelines</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: VERIFY ALUMNI                                                 */}
      {/* ===================================================================== */}
      {activeTab === 'verify_alumni' && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVerifySubTab('unverified')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  verifySubTab === 'unverified'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Waiting for Verification ({unverifiedList.length})
              </button>
              <button
                type="button"
                onClick={() => setVerifySubTab('documents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  verifySubTab === 'documents'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                ID Documents ({pendingDocCount})
              </button>
              <button
                type="button"
                onClick={() => setVerifySubTab('verified')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  verifySubTab === 'verified'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Already Verified
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                loadAlumniData();
                loadDocSubmissions();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAlumni ? 'animate-spin' : ''}`} />
              <span>Refresh List</span>
            </button>
          </div>

          {/* Search and Filters */}
          {verifySubTab !== 'documents' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by alumnus name, roll number, or HSC batch year..."
                  value={alumniSearch}
                  onChange={(e) => setAlumniSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Batches</option>
                {Array.from({ length: 30 }, (_, i) => 2026 - i).map((yr) => (
                  <option key={yr} value={String(yr)}>
                    HSC {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-tab 1: Unverified or Verified Alumni Cards */}
          {verifySubTab !== 'documents' && (
            <div>
              {isLoadingAlumni ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm font-medium">Loading alumni records...</p>
                </div>
              ) : filteredUnverified.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                  <UserCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {verifySubTab === 'unverified'
                      ? 'No Unverified Alumni Found'
                      : 'No Verified Alumni Match Search'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    {verifySubTab === 'unverified'
                      ? 'All registered alumni are currently verified or no matching records match your query.'
                      : 'Try broadening your search term or selecting "All Batches".'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUnverified.map((alumnus) => {
                    const isProcessing = actionInProgress[alumnus.id];
                    const isVerified = alumnus.verificationStatus === 'verified';

                    return (
                      <div
                        key={alumnus.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <img
                            src={alumnus.avatarUrl || '/ndc-logo.png'}
                            alt={alumnus.fullName}
                            className="w-13 h-13 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100"
                            onError={(e) => {
                              e.currentTarget.src = '/ndc-logo.png';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                {alumnus.fullName}
                              </h4>
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <Check className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <Clock className="w-3 h-3" />
                                  Unverified
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {alumnus.batchYear ? `HSC ${alumnus.batchYear}` : 'Batch N/A'}
                              {alumnus.collegeRoll ? ` • Roll ${alumnus.collegeRoll}` : ''}
                              {alumnus.academicStream ? ` • ${alumnus.academicStream}` : ''}
                            </p>

                            {(alumnus.profession || alumnus.institution) && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                                {alumnus.profession}
                                {alumnus.institution ? ` at ${alumnus.institution}` : ''}
                              </p>
                            )}

                            {alumnus.city && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                📍 {alumnus.city}, {alumnus.country || 'Bangladesh'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          {onViewProfile && (
                            <button
                              type="button"
                              onClick={() => onViewProfile(alumnus.id)}
                              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              View Profile
                            </button>
                          )}

                          {!isVerified ? (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleVerifyAlumnus(alumnus)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{isProcessing ? 'Verifying...' : '✅ Verify Alumnus'}</span>
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Official Member
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: ID Documents Submission Review */}
          {verifySubTab === 'documents' && (
            <div className="space-y-4">
              {docSubmissions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    No ID Document Submissions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    When alumni upload their Notre Dame College ID cards or HSC slips, they will appear here for review.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {docSubmissions.map((doc) => {
                    const isProcessing = actionInProgress[doc.id];
                    return (
                      <div
                        key={doc.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={doc.avatarUrl || '/ndc-logo.png'}
                            alt={doc.fullName}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 bg-slate-100"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                {doc.fullName}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {doc.docTypeLabel}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  doc.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : doc.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {doc.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Batch: HSC {doc.batchYear || 'N/A'} • Roll: {doc.collegeRoll || 'N/A'} • {doc.group}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Submitted: {new Date(doc.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          {doc.documentUrl && (
                            <a
                              href={doc.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Document</span>
                            </a>
                          )}

                          {doc.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleReviewDoc(doc.id, 'approved')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleReviewDoc(doc.id, 'rejected')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: DELETE BAD / UNWANTED POSTS                                    */}
      {/* ===================================================================== */}
      {activeTab === 'moderate_posts' && (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold">Content Moderation Authority:</span> You can delete unwanted, offensive, or bad posts from the public alumni feed with a single click. When deleted, the post is instantly hidden from all alumni. You can also restore any post if it was deleted accidentally.
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search posts by author name, keyword, or text content..."
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPostFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  postFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                All Posts ({posts.length})
              </button>
              <button
                type="button"
                onClick={() => setPostFilter('active')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  postFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Active on Feed ({posts.filter((p) => !p.isDeleted).length})
              </button>
              <button
                type="button"
                onClick={() => setPostFilter('deleted')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  postFilter === 'deleted'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Deleted ({posts.filter((p) => p.isDeleted).length})
              </button>
            </div>
          </div>

          {/* Posts List */}
          {isLoadingPosts ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-sm font-medium">Scanning alumni feed posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Posts Found
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                No posts match your current search and filter settings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const isProcessing = actionInProgress[post.id];

                return (
                  <div
                    key={post.id}
                    className={`rounded-2xl p-5 border transition-all ${
                      post.isDeleted
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Author Header */}
                      <div className="flex items-center gap-3">
                        <img
                          src={post.authorAvatar || '/ndc-logo.png'}
                          alt={post.authorName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = '/ndc-logo.png';
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {post.authorName}
                            </h4>
                            {post.authorBatch > 0 && (
                              <span className="text-xs text-slate-500">
                                HSC {post.authorBatch}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {post.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Posted: {new Date(post.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {post.isDeleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <Trash2 className="w-3.5 h-3.5" />
                            Hidden / Deleted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <Check className="w-3.5 h-3.5" />
                            Live on Feed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="mt-3 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </div>

                    {/* Images Preview */}
                    {post.images && post.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.images.map((imgUrl, idx) => (
                          <a
                            key={idx}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0"
                          >
                            <img
                              src={imgUrl}
                              alt="Attachment"
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        {post.likesCount} Likes • {post.commentsCount} Comments
                      </div>

                      <div className="flex items-center gap-2">
                        {post.isDeleted ? (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleRestorePost(post.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{isProcessing ? 'Restoring...' : '♻️ Restore Post to Feed'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              setDeleteReasonModal({
                                postId: post.id,
                                authorName: post.authorName,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>🗑️ Delete / Hide Bad Post</span>
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
      )}

      {/* Delete Confirmation Reason Modal */}
      {deleteReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Remove Bad Post from Feed
                </h3>
                <p className="text-xs text-slate-500">
                  Author: {deleteReasonModal.authorName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              This action will immediately hide the post from the public feed so other alumni cannot see it. Please select a reason for moderation records:
            </p>

            <div className="space-y-2 mb-4">
              {[
                'Inappropriate / Bad content',
                'Offensive or abusive language',
                'Commercial spam or advertising',
                'Misinformation / Unverified claims',
                'Unwanted solicitation',
                'Other',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteReason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {selectedReason === 'Other' && (
              <textarea
                placeholder="Specify reason for removing post..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4 resize-none"
                rows={2}
              />
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteReasonModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePost}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Confirm Delete Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: DIRECTORY & SLIGHT ACCESS                                      */}
      {/* ===================================================================== */}
      {activeTab === 'directory_access' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Alumni Directory Slight Access
              </h3>
              <p className="text-xs text-slate-500">
                Quick lookup tools for admins to inspect profiles, check verification histories, and assist brothers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <Search className="w-4 h-4 text-blue-500" />
                <span>Search Full Directory</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Jump directly to the main interactive directory to inspect any alumnus profile.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('alumni')}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Open Alumni Directory
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>Batch Directory</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Browse alumni lounges by HSC batch year to assist your batchmates.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('batches')}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Browse Batches
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <span>Feed Live View</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Monitor live post streams and engage with verified Notredamians.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('feed')}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Go to Public Feed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: MODERATOR GUIDELINES                                           */}
      {/* ===================================================================== */}
      {activeTab === 'guidelines' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Notre Dame College Admin &amp; Moderator Guidelines
              </h3>
              <p className="text-xs text-slate-500">
                Ethical standards, verification criteria, and deletion policy for delegated moderators.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                1. Alumni Verification Standards
              </h4>
              <p>
                Before approving an alumnus, verify their HSC Batch, College Roll, or ID Card photo. Never approve profiles with fake names, satirical pseudonyms, or non-alumni submissions.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                2. Bad Post Deletion Policy
              </h4>
              <p>
                Delete posts containing abusive language, hate speech, commercial spam, partisan political hostility, or unverified medical/financial solicitations. Keep the alumni space respectful, fraternal, and aligned with Notre Dame College ideals.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                3. Founding Admin
              </h4>
              <p>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">nurulanambashir25@</span> is configured as the first delegated administrator in this system with full verification and post moderation authority.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
