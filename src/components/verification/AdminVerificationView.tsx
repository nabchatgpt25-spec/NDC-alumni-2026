import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileCheck2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  ZoomIn,
  X,
  Search,
  Sparkles,
  UserCheck,
  AlertCircle,
  Link2,
  Eye,
  Upload,
} from 'lucide-react';
import {
  AdminDocSubmission,
  VouchRequest,
  AlumniProfile,
} from '../../types';
import {
  loadAdminDocSubmissions,
  adminReviewDocumentSubmission,
  loadVouchRequests,
  adminApproveVouchRequest,
  submitPeerVouch,
  getVouchShareLink,
  getWhatsAppVouchShareUrl,
  formatBatchDisplay,
} from '../../utils/verificationService';
import { useAuth } from '../../context/AuthContext';
import { isVideoUrl } from '../../utils/mediaStorage';
import { WhatsAppIcon } from '../SocialIcons';

interface AdminVerificationViewProps {
  onViewProfile?: (profileId: number) => void;
  onOpenVerificationModal?: (initialTab?: 'status' | 'vouch_others' | 'upload_id' | 'admin_queue') => void;
}

export const AdminVerificationView: React.FC<AdminVerificationViewProps> = ({
  onViewProfile,
  onOpenVerificationModal,
}) => {
  const { currentUser, updateProfile } = useAuth();
  const [activeSection, setActiveSection] = useState<'nid_docs' | 'vouch_requests' | 'my_link'>('nid_docs');
  const [docFilter, setDocFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [docSubmissions, setDocSubmissions] = useState<AdminDocSubmission[]>(() =>
    loadAdminDocSubmissions()
  );
  const [vouchRequests, setVouchRequests] = useState<VouchRequest[]>(() =>
    loadVouchRequests()
  );
  const [inspectingDoc, setInspectingDoc] = useState<AdminDocSubmission | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshAll = () => {
    setDocSubmissions(loadAdminDocSubmissions());
    setVouchRequests(loadVouchRequests());
  };

  useEffect(() => {
    refreshAll();
    window.addEventListener('ndc_admin_docs_updated', refreshAll);
    window.addEventListener('ndc_vouch_requests_updated', refreshAll);
    window.addEventListener('storage', refreshAll);
    return () => {
      window.removeEventListener('ndc_admin_docs_updated', refreshAll);
      window.removeEventListener('ndc_vouch_requests_updated', refreshAll);
      window.removeEventListener('storage', refreshAll);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Verification / Vouch link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAdminDocDecision = (
    submission: AdminDocSubmission,
    decision: 'approved' | 'rejected',
    note?: string
  ) => {
    try {
      const { updatedProfilePartial } = adminReviewDocumentSubmission(
        submission.id,
        decision,
        currentUser.fullName || 'Admin Bashir',
        note
      );
      if (submission.userId === currentUser.id) {
        updateProfile(updatedProfilePartial);
      }
      refreshAll();
      setInspectingDoc(null);
      setAdminNoteInput('');
      showToast(
        decision === 'approved'
          ? `Approved ${submission.fullName}'s ${submission.docTypeLabel}! Profile is now officially Verified.`
          : `Marked ${submission.fullName}'s document submission as Rejected.`
      );
    } catch (err: any) {
      showToast(err?.message || 'Could not process review.');
    }
  };

  const handleAdminDirectVerifyVouch = (req: VouchRequest) => {
    try {
      adminApproveVouchRequest(req.id, currentUser.fullName || 'Admin Bashir');
      if (req.requesterId === currentUser.id) {
        updateProfile({
          verificationStatus: 'verified',
          verificationMethod: 'admin_verified',
          vouchesCount: 2,
          verificationDate: 'Today',
        });
      }
      refreshAll();
      showToast(`Officially verified ${req.requesterName} (Batch ${req.batchYear}) by Admin authority!`);
    } catch (err: any) {
      showToast(err?.message || 'Could not verify request.');
    }
  };

  const handlePeerVouch = async (req: VouchRequest) => {
    try {
      const res = await submitPeerVouch(
        req.id,
        currentUser,
        `Verified by ${currentUser.fullName} (Batch ${currentUser.batchYear}).`
      );
      if (req.requesterId === currentUser.id) {
        updateProfile({
          vouchesCount: res.request.vouches.length,
          verificationStatus: res.isNowVerified ? 'verified' : 'pending_vouch',
        });
      }
      refreshAll();
      showToast(
        res.isNowVerified
          ? `${req.requesterName} now has 2/2 vouches and is Verified!`
          : `Recorded +1 vouch for ${req.requesterName} (${res.request.vouches.length}/2).`
      );
    } catch (err: any) {
      showToast(err?.message || 'Already vouched.');
    }
  };

  const pendingDocsCount = docSubmissions.filter((d) => d.status === 'pending').length;
  const pendingVouchesCount = vouchRequests.filter((r) => r.status === 'pending').length;

  const filteredDocs = docSubmissions.filter((d) => {
    if (docFilter !== 'all' && d.status !== docFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.collegeRoll.toLowerCase().includes(q) ||
        d.docTypeLabel.toLowerCase().includes(q) ||
        String(d.batchYear).includes(q)
      );
    }
    return true;
  });

  const filteredVouches = vouchRequests.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.requesterName.toLowerCase().includes(q) ||
        r.collegeRoll.toLowerCase().includes(q) ||
        String(r.batchYear).includes(q)
      );
    }
    return true;
  });

  const myShareLink = getVouchShareLink(currentUser);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Admin Command Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-emerald-950 text-white p-6 sm:p-8 border border-blue-500/20 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Verification & NID / ID Review Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Notredamian Verification & Document Review Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every uploaded <strong>National ID (NID)</strong>, <strong>College ID Card</strong>, and <strong>HSC Admit Slip</strong> is sent here for Admin inspection. You can also generate & copy shareable Vouch Links or directly verify classmates.
            </p>
          </div>

          {/* Live Summary Counters */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <div className="text-2xl font-black text-amber-400">{pendingDocsCount}</div>
              <div className="text-[11px] font-bold text-slate-300">Pending NID/IDs</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <div className="text-2xl font-black text-blue-400">{pendingVouchesCount}</div>
              <div className="text-[11px] font-bold text-slate-300">Pending Vouches</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <div className="text-2xl font-black text-emerald-400">
                {docSubmissions.filter((d) => d.status === 'approved').length +
                  vouchRequests.filter((r) => r.status === 'verified').length}
              </div>
              <div className="text-[11px] font-bold text-slate-300">Approved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Always-Visible Shareable Vouch Link Generator Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-blue-200 dark:border-blue-900/60 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Your Personal Shareable Vouch & Verification Link
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share this link on WhatsApp, Messenger, or Facebook. Anyone who opens it will see your verification card to vouch for you or verify your profile.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenVerificationModal && onOpenVerificationModal('upload_id')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload My NID / College ID</span>
            </button>

            <a
              href={getWhatsAppVouchShareUrl(currentUser)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              <span>Share Link on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Visible Copyable URL Box */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-700 dark:text-blue-300 overflow-x-auto">
            <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="truncate select-all">{myShareLink}</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopyText(myShareLink, 'my-main-link')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
          >
            {copiedId === 'my-main-link' ? (
              <>
                <Check className="w-4 h-4" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Vouch Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs + Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('nid_docs')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'nid_docs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Uploaded NID / ID Cards ({docSubmissions.length})</span>
            {pendingDocsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {pendingDocsCount} Pending
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('vouch_requests')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'vouch_requests'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Peer Vouch Requests & Links ({vouchRequests.length})</span>
            {pendingVouchesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {pendingVouchesCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, roll, batch..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: UPLOADED NID / COLLEGE ID / HSC ADMIT CARD SUBMISSIONS */}
      {activeSection === 'nid_docs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((statusFilter) => (
                <button
                  key={statusFilter}
                  type="button"
                  onClick={() => setDocFilter(statusFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    docFilter === statusFilter
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {statusFilter} (
                  {statusFilter === 'all'
                    ? docSubmissions.length
                    : docSubmissions.filter((d) => d.status === statusFilter).length}
                  )
                </button>
              ))}
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800">
              <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No NID / ID Document Submissions Match This Filter
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                When any user uploads an NID, College ID, or HSC Admit Card during registration or in the Verification Center, it appears here for Admin verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredDocs.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Applicant Header */}
                    <div className="p-5 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <img
                          src={sub.avatarUrl}
                          alt={sub.fullName}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white">
                              {sub.fullName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                              {formatBatchDisplay(sub.batchYear)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            College Roll: <strong className="font-mono text-slate-800 dark:text-slate-200">{sub.collegeRoll}</strong> · Group: <strong>{sub.group}</strong>
                          </div>
                          {(sub.phone || sub.email) && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {sub.phone && <span>{sub.phone}</span>}
                              {sub.phone && sub.email && <span> · </span>}
                              {sub.email && <span>{sub.email}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          sub.status === 'approved'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : sub.status === 'rejected'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {sub.status === 'approved'
                          ? '✓ Approved'
                          : sub.status === 'rejected'
                          ? '✕ Rejected'
                          : '⏳ Needs Admin Review'}
                      </span>
                    </div>

                    {/* Uploaded NID / ID Document Preview */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileCheck2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Submitted Document: {sub.docTypeLabel}</span>
                        </span>
                        <span className="text-[11px] text-slate-400">{sub.submittedAt}</span>
                      </div>

                      <div
                        onClick={() => setInspectingDoc(sub)}
                        className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 h-48 flex items-center justify-center cursor-pointer"
                      >
                        {isVideoUrl(sub.documentUrl) ? (
                          <video
                            src={sub.documentUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <img
                            src={sub.documentUrl}
                            alt={sub.docTypeLabel}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg">
                            <ZoomIn className="w-4 h-4" />
                            <span>Click to Inspect Full NID / ID Document</span>
                          </span>
                        </div>
                      </div>

                      {sub.adminNote && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                          <strong className="text-slate-900 dark:text-white">Admin Note:</strong> {sub.adminNote}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Action Footer */}
                  <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectingDoc(sub)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Document</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {sub.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleAdminDocDecision(sub, 'rejected')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      {sub.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleAdminDocDecision(sub, 'approved')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Verify</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PEER VOUCH REQUESTS & SHAREABLE VOUCH LINKS */}
      {activeSection === 'vouch_requests' && (
        <div className="space-y-4">
          {filteredVouches.map((req) => {
            const reqShareLink = `${window.location.origin}${window.location.pathname}?vouch_for=${req.requesterId}&roll=${encodeURIComponent(req.collegeRoll)}&batch=${req.batchYear}&name=${encodeURIComponent(req.requesterName)}`;

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={req.requesterAvatar}
                      alt={req.requesterName}
                      className="w-13 h-13 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-base text-slate-900 dark:text-white">
                          {req.requesterName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
                          Batch {req.batchYear} · {req.group}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            req.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {req.status === 'verified'
                            ? '✓ Verified'
                            : `${req.vouches.length}/${req.targetVouches} Vouches`}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        College Roll: <strong className="font-mono text-slate-800 dark:text-slate-200">{req.collegeRoll}</strong>
                        {req.profession && <span> · {req.profession}</span>}
                      </div>

                      {req.message && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 italic">
                          "{req.message}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Admin & Peer Vouch Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {req.status !== 'verified' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePeerVouch(req)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>+1 Peer Vouch</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminDirectVerifyVouch(req)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Admin Verify Instantly</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Member's Shareable Vouch Link Row */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                    <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate select-all">{reqShareLink}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(reqShareLink, req.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedId === req.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-blue-500" />
                        <span>Copy Member's Vouch Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen NID / ID Document Inspector Modal */}
      {inspectingDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectingDoc(null)}
        >
          <div
            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Admin Document Verification Inspector
                </span>
                <h3 className="text-lg font-black">
                  {inspectingDoc.fullName} · Batch {inspectingDoc.batchYear} (Roll: {inspectingDoc.collegeRoll})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDoc(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center max-h-[420px]">
                {isVideoUrl(inspectingDoc.documentUrl) ? (
                  <video
                    src={inspectingDoc.documentUrl}
                    controls
                    autoPlay
                    className="max-h-[400px] w-auto"
                  />
                ) : (
                  <img
                    src={inspectingDoc.documentUrl}
                    alt={inspectingDoc.docTypeLabel}
                    className="max-h-[400px] w-auto object-contain"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block">Document Type</span>
                  <strong className="text-slate-900 dark:text-white">{inspectingDoc.docTypeLabel}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block">College Roll & Group</span>
                  <strong className="text-slate-900 dark:text-white">
                    {inspectingDoc.collegeRoll} ({inspectingDoc.group})
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block">Current Status</span>
                  <strong className="capitalize text-slate-900 dark:text-white">
                    {inspectingDoc.status}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin Review Note (Optional):
                </label>
                <input
                  type="text"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="e.g. Verified NID & NDC Roll 118105 match against batch register..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInspectingDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdminDocDecision(inspectingDoc, 'rejected', adminNoteInput)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAdminDocDecision(inspectingDoc, 'approved', adminNoteInput)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Verify Alumnus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
