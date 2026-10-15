import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  Droplet,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  Eye,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Lock,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Building2,
  Clock,
  RotateCcw,
  Plus,
  X,
  Radio,
  FileText,
  Edit2,
  Save,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  CouncilMember,
  getExecutiveCouncilMembers,
  addCouncilMember,
  removeCouncilMember,
  updateCouncilMember,
  fetchCouncilPendingSubmissions,
  executeCouncilDocDecision,
  fetchCouncilBloodEmergencies,
  updateCouncilBloodRequest,
  fetchCouncilFeedForScamAudit,
  councilTakedownPost,
  councilRestorePost,
} from '../../services/executiveCouncilService';
import { AdminDocSubmission, BloodEmergencyRequest } from '../../types';
import { ModerationPostItem } from '../../services/adminService';
import { NDCLogo } from '../NDCLogo';

interface ExecutiveCouncilHubViewProps {
  onNavigate: (route: string) => void;
  onViewProfile?: (userId: number) => void;
}

type CouncilTab = 'verifications' | 'blood' | 'scam_shield' | 'roster';

export const ExecutiveCouncilHubView: React.FC<ExecutiveCouncilHubViewProps> = ({
  onNavigate,
  onViewProfile,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<CouncilTab>('verifications');

  // Council Members State
  const [councilMembers, setCouncilMembers] = useState<CouncilMember[]>(getExecutiveCouncilMembers);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDesignation, setNewMemberDesignation] = useState('');

  // Edit Council Member State
  const [editingMember, setEditingMember] = useState<CouncilMember | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Verifications Desk State
  const [submissions, setSubmissions] = useState<AdminDocSubmission[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [inspectDocUrl, setInspectDocUrl] = useState<string | null>(null);

  // 2. Blood Oversight State
  const [bloodRequests, setBloodRequests] = useState<BloodEmergencyRequest[]>([]);
  const [isLoadingBlood, setIsLoadingBlood] = useState(false);
  const [bloodSearch, setBloodSearch] = useState('');
  const [bloodStatusFilter, setBloodStatusFilter] = useState<string>('all');

  // 3. Scam Elimination Shield State
  const [posts, setPosts] = useState<ModerationPostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postSearch, setPostSearch] = useState('');
  const [scamFilter, setScamFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [takedownReason, setTakedownReason] = useState<Record<number, string>>({});

  // Load Verifications
  const loadDocs = async () => {
    setIsLoadingDocs(true);
    try {
      const data = await fetchCouncilPendingSubmissions();
      setSubmissions(data);
    } catch {
      showToast('Could not load pending verification queue.', 'error');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Load Blood Requests
  const loadBlood = async () => {
    setIsLoadingBlood(true);
    try {
      const data = await fetchCouncilBloodEmergencies();
      setBloodRequests(data);
    } catch {
      showToast('Could not load blood emergencies.', 'error');
    } finally {
      setIsLoadingBlood(false);
    }
  };

  // Load Posts for Scam Shield
  const loadPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const data = await fetchCouncilFeedForScamAudit(postSearch);
      setPosts(data);
    } catch {
      showToast('Could not load feed posts.', 'error');
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'verifications') loadDocs();
    if (activeTab === 'blood') loadBlood();
    if (activeTab === 'scam_shield') loadPosts();
    if (activeTab === 'roster') setCouncilMembers(getExecutiveCouncilMembers());
  }, [activeTab]);

  // ID Approval Action
  const handleDocDecision = async (sub: AdminDocSubmission, decision: 'approved' | 'rejected') => {
    const res = await executeCouncilDocDecision({
      submissionId: sub.id,
      decision,
      adminNotes: `Council verified by ${currentUser.email || 'Supreme Admin'}`,
      adminProfileId: currentUser.id,
    });

    if (res.success) {
      showToast(
        decision === 'approved'
          ? `Alumnus ${sub.fullName} (Batch ${sub.batchYear}) officially verified!`
          : `Submission rejected. Notification sent.`,
        decision === 'approved' ? 'success' : 'info'
      );
      setSubmissions((prev) => prev.filter((item) => item.id !== sub.id));
    } else {
      showToast(`Action failed: ${res.error}`, 'error');
    }
  };

  // Blood Request Status Action
  const handleBloodStatusUpdate = async (
    reqId: string,
    status: 'Active' | 'Donor Found' | 'Fulfilled' | 'Cancelled'
  ) => {
    const success = await updateCouncilBloodRequest({
      requestId: reqId,
      status,
      moderationNote: `Status updated by Executive Council (${currentUser.email})`,
      adminProfileId: currentUser.id,
    });

    if (success) {
      showToast(`Blood request updated to "${status}"`, 'success');
      loadBlood();
    } else {
      showToast('Failed to update blood request status.', 'error');
    }
  };

  // Post Takedown Action
  const handleTakedownPost = async (postId: number, permanent = false) => {
    const reason = takedownReason[postId] || 'Fraudulent scam / Violation of College Conduct';
    const res = await councilTakedownPost({ postId, reason, permanent });

    if (res.success) {
      showToast(
        permanent
          ? 'Post permanently deleted from database.'
          : 'Scam post eliminated and hidden from public feed.',
        'success'
      );
      loadPosts();
    } else {
      showToast(`Takedown failed: ${res.error}`, 'error');
    }
  };

  // Restore Post Action
  const handleRestorePost = async (postId: number) => {
    const res = await councilRestorePost(postId);
    if (res.success) {
      showToast('Post restored to public feed.', 'success');
      loadPosts();
    } else {
      showToast(`Restore failed: ${res.error}`, 'error');
    }
  };

  // Council Roster Actions
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    if (councilMembers.length >= 7) {
      showToast('Executive Council limit reached (maximum 5-7 alumni).', 'error');
      return;
    }

    const success = addCouncilMember({
      email: newMemberEmail.trim(),
      name: newMemberName.trim() || 'Council Trustee',
      designation: newMemberDesignation.trim() || 'Executive High Authority',
    });

    if (success) {
      showToast(`Added ${newMemberEmail} to Executive Council.`, 'success');
      setCouncilMembers(getExecutiveCouncilMembers());
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberDesignation('');
    } else {
      showToast('Member with this email is already on the council.', 'error');
    }
  };

  const handleRemoveMember = (email: string) => {
    if (window.confirm(`Revoke Executive Council authority for ${email}?`)) {
      const success = removeCouncilMember(email);
      if (success) {
        showToast('Council authority revoked.', 'info');
        setCouncilMembers(getExecutiveCouncilMembers());
      } else {
        showToast('Primary foundational council emails cannot be removed.', 'error');
      }
    }
  };

  const handleStartEdit = (m: CouncilMember) => {
    setEditingMember(m);
    setEditEmail(m.email);
    setEditName(m.name);
    setEditDesignation(m.designation);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editEmail.trim()) return;

    const success = updateCouncilMember(editingMember.email, {
      email: editEmail.trim(),
      name: editName.trim() || editingMember.name,
      designation: editDesignation.trim() || editingMember.designation,
    });

    if (success) {
      showToast(`Updated council member details to ${editEmail.trim()}`, 'success');
      setCouncilMembers(getExecutiveCouncilMembers());
      setEditingMember(null);
    } else {
      showToast('Failed to update council member.', 'error');
    }
  };

  // Filtered lists
  const filteredSubmissions = useMemo(() => {
    if (!docSearch.trim()) return submissions;
    const q = docSearch.toLowerCase();
    return submissions.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        String(s.batchYear).includes(q) ||
        s.collegeRoll?.toLowerCase().includes(q)
    );
  }, [submissions, docSearch]);

  const filteredBlood = useMemo(() => {
    return bloodRequests.filter((b) => {
      const matchSearch =
        !bloodSearch.trim() ||
        b.hospitalName.toLowerCase().includes(bloodSearch.toLowerCase()) ||
        b.bloodGroup.toLowerCase().includes(bloodSearch.toLowerCase()) ||
        b.city.toLowerCase().includes(bloodSearch.toLowerCase());
      const matchStatus = bloodStatusFilter === 'all' || b.status.toLowerCase() === bloodStatusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [bloodRequests, bloodSearch, bloodStatusFilter]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchSearch =
        !postSearch.trim() ||
        p.content.toLowerCase().includes(postSearch.toLowerCase()) ||
        p.authorName.toLowerCase().includes(postSearch.toLowerCase());
      const matchFilter =
        scamFilter === 'all'
          ? true
          : scamFilter === 'deleted'
          ? p.isDeleted
          : !p.isDeleted;
      return matchSearch && matchFilter;
    });
  }, [posts, postSearch, scamFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-rose-600'
              : 'bg-blue-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Supreme Executive Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 border border-amber-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 p-2.5 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-1.5">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Executive Council • 4-5 Authorized Alumni Whitelist</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Executive High Command Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Supreme administration authority for collegiate ID approvals, real-time blood emergency oversight, and 1-click elimination of fraudulent posts or scams.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 text-right hidden sm:block">
              <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                Logged In Authority
              </div>
              <div className="text-xs font-mono font-bold text-white truncate max-w-[200px]">
                {currentUser.email || 'Council Trustee'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Back to Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* High Authority Tabs Bar */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-white/10 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'verifications'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Collegiate ID Approvals ({submissions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blood')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'blood'
                ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Droplet className="w-4 h-4 text-rose-300" />
            <span>Emergency Blood Oversight</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scam_shield')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'scam_shield'
                ? 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-300" />
            <span>Anti-Scam Takedown Shield</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4 text-blue-300" />
            <span>Authorized Council ({councilMembers.length})</span>
          </button>
        </div>
      </div>

      {/* =======================================================================
          TAB 1: COLLEGIATE ID VERIFICATIONS DESK
          ======================================================================= */}
      {activeTab === 'verifications' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search applicant name, college roll, or batch..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <button
              type="button"
              onClick={loadDocs}
              disabled={isLoadingDocs}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDocs ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {isLoadingDocs ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              Loading collegiate verification submissions...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="font-black text-sm text-slate-900 dark:text-white">
                Queue is Clear!
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All collegiate ID cards and transcripts have been processed by the Executive Council.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm hover:border-amber-400/80 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {sub.docTypeLabel || 'College ID'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sub.submittedAt.slice(0, 10)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {sub.avatarUrl ? (
                          <img src={sub.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          sub.fullName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {sub.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Batch {sub.batchYear} • Roll #{sub.collegeRoll || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Document Preview Thumbnail */}
                    <div
                      onClick={() => setInspectDocUrl(sub.documentUrl)}
                      className="relative h-36 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer group"
                    >
                      <img
                        src={sub.documentUrl}
                        alt="Submitted credential"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>Inspect Full Image</span>
                      </div>
                    </div>
                  </div>

                  {/* Council Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleDocDecision(sub, 'rejected')}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Decline</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDocDecision(sub, 'approved')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 2: EMERGENCY BLOOD OVERSIGHT
          ======================================================================= */}
      {activeTab === 'blood' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={bloodSearch}
                onChange={(e) => setBloodSearch(e.target.value)}
                placeholder="Search hospital, city, blood group..."
                className="w-full py-1 text-xs bg-transparent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bloodStatusFilter}
                onChange={(e) => setBloodStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="pending verification">Pending Review</option>
                <option value="donor found">Donor Found</option>
                <option value="fulfilled">Fulfilled</option>
              </select>

              <button
                type="button"
                onClick={loadBlood}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBlood ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredBlood.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No blood requests found.
              </div>
            ) : (
              filteredBlood.map((req) => (
                <div
                  key={req.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-black text-lg flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900">
                      {req.bloodGroup}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {req.hospitalName} ({req.city})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {req.unitsRequired} Bag{req.unitsRequired > 1 ? 's' : ''} Needed
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            req.emergencyLevel === 'critical'
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {req.emergencyLevel}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                        {req.description}
                      </p>

                      <div className="text-[11px] text-slate-400 flex items-center gap-4 flex-wrap">
                        <span>Attendant: {req.contactMethod}</span>
                        <span>Requester Batch: {req.requesterBatch || 'Alumnus'}</span>
                        <span>Status: <b className="text-slate-700 dark:text-slate-200">{req.status}</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Council Emergency Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleBloodStatusUpdate(req.id, 'Active')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Verify &amp; Broadcast
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBloodStatusUpdate(req.id, 'Donor Found')}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Donor Found
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBloodStatusUpdate(req.id, 'Fulfilled')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Mark Fulfilled
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBloodStatusUpdate(req.id, 'Cancelled')}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel / Scam Flag
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 3: ANTI-SCAM TAKEDOWN SHIELD
          ======================================================================= */}
      {activeTab === 'scam_shield' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder="Search post text, scam keywords, author..."
                className="w-full py-1 text-xs bg-transparent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScamFilter('all')}
                  className={`px-3 py-1 rounded-lg ${
                    scamFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-xs' : ''
                  }`}
                >
                  All ({posts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScamFilter('active')}
                  className={`px-3 py-1 rounded-lg ${
                    scamFilter === 'active' ? 'bg-white dark:bg-slate-700 shadow-xs' : ''
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setScamFilter('deleted')}
                  className={`px-3 py-1 rounded-lg text-rose-600 ${
                    scamFilter === 'deleted' ? 'bg-white dark:bg-slate-700 shadow-xs' : ''
                  }`}
                >
                  Eliminated
                </button>
              </div>

              <button
                type="button"
                onClick={loadPosts}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPosts ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {filteredPosts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No matching posts found.
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className={`p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-colors ${
                    post.isDeleted
                      ? 'bg-rose-50/30 dark:bg-rose-950/15'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {post.authorName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Batch {post.authorBatch}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {post.category}
                      </span>
                      {post.isDeleted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white">
                          ELIMINATED / TAKEN DOWN
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {post.createdAt.slice(0, 10)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {post.images && post.images.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {post.images.slice(0, 3).map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Council Takedown Controls */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                    {!post.isDeleted ? (
                      <button
                        type="button"
                        onClick={() => handleTakedownPost(post.id, false)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminate Scam (Takedown)</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRestorePost(post.id)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTakedownPost(post.id, true)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-900 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Permanent database wipe"
                        >
                          <span>Permanent Wipe</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 4: AUTHORIZED EXECUTIVE COUNCIL ROSTER
          ======================================================================= */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Authorized Executive Council ({councilMembers.length}/7)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only these exact Gmail accounts are granted High Authority and see this Executive Hub.
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {councilMembers.map((m) => {
                const isMe = (currentUser.email || '').toLowerCase() === m.email.toLowerCase();
                return (
                  <div key={m.email} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {m.name}
                        </span>
                        {isMe && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white">
                            YOU
                          </span>
                        )}
                        {m.isPrimary && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            LEAD
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-blue-600 dark:text-blue-400 truncate">
                        {m.email}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {m.designation} {m.batchYear ? `• Batch ${m.batchYear}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(m)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        title="Edit Email & Role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {!m.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.email)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Revoke Council Authority"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Council Member Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Authorize Fellow Council Alumnus
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter the alumnus Gmail to grant them Executive High Command access.
              </p>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gmail Address *
                </label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="alumnus@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alumnus Full Name
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Kazi Mahfuzur Rahman"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Designation / Role in Council
                </label>
                <input
                  type="text"
                  value={newMemberDesignation}
                  onChange={(e) => setNewMemberDesignation(e.target.value)}
                  placeholder="e.g. Disciplinary Officer / Moderator"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Grant Council Authority</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Full Document Inspector Modal */}
      {inspectDocUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setInspectDocUrl(null)}
        >
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 p-4">
            <div className="flex justify-between items-center mb-3 text-white">
              <span className="font-bold text-xs text-amber-300">
                Collegiate Credential Full Resolution
              </span>
              <button
                type="button"
                onClick={() => setInspectDocUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={inspectDocUrl}
              alt="Collegiate credential"
              className="max-h-[75vh] w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Edit Council Member Modal */}
      {editingMember && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEditingMember(null)}
        >
          <div
            className="relative max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Council Member
                </h4>
                <p className="text-xs text-slate-500">
                  Update authorized Gmail address or title
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gmail Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="alumnus@gmail.com"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Only this Gmail will see the Executive Council menu item when logging in.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. Mahfuzur Rahman"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Designation / Role in Council
                </label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. Disciplinary Officer & Emergency Desk"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
