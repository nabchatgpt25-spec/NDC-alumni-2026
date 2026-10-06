import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  Upload,
  CheckCircle2,
  Copy,
  Clock,
  Sparkles,
  ExternalLink,
  AlertCircle,
  FileCheck2,
  ArrowRight,
  UserCheck,
  HelpCircle,
  Camera,
  Search,
  MessageCircle,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AlumniProfile, VouchRequest } from '../../types';
import {
  loadVouchRequests,
  submitPeerVouch,
  simulateDemoVouchForUser,
  getVouchShareLink,
  getWhatsAppVouchShareUrl,
  registerUserVouchRequest,
  isSameBatch,
  normalizeToBatchNumber
} from '../../utils/verificationService';
import { saveMediaFile, isVideoUrl, formatFileSize } from '../../utils/mediaStorage';
import { NDCLogo } from '../NDCLogo';
import { WhatsAppIcon } from '../SocialIcons';
import { fetchVerificationRequestsFromDb } from '../../services/supabaseService';

interface VerificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'status' | 'vouch_classmates' | 'vouch_others' | 'upload_id' | 'policy';
}

const resolveTab = (
  tab?: string
): 'status' | 'vouch_classmates' | 'upload_id' | 'policy' => {
  if (tab === 'vouch_others' || tab === 'vouch_classmates') return 'vouch_classmates';
  if (tab === 'upload_id') return 'upload_id';
  if (tab === 'policy') return 'policy';
  return 'status';
};

export const VerificationCenterModal: React.FC<VerificationCenterModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const { currentUser, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'status' | 'vouch_classmates' | 'upload_id' | 'policy'>(
    resolveTab(initialTab)
  );
  const [vouchRequests, setVouchRequests] = useState<VouchRequest[]>(loadVouchRequests());
  const [copiedLink, setCopiedLink] = useState(false);
  const [vouchSuccessMsg, setVouchSuccessMsg] = useState('');
  const [vouchErrorMsg, setVouchErrorMsg] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<'all' | 'my_batch'>('all');
  const [confirmingVouchFor, setConfirmingVouchFor] = useState<VouchRequest | null>(null);
  const [vouchComment, setVouchComment] = useState('');

  // ID Upload State
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [docType, setDocType] = useState<'id_card' | 'hsc_slip' | 'souvenir'>('id_card');
  const [isVerifyingDoc, setIsVerifyingDoc] = useState(false);
  const [docVerifiedSuccess, setDocVerifiedSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setActiveTab(resolveTab(initialTab));
      setVouchRequests(loadVouchRequests());

      fetchVerificationRequestsFromDb()
        .then((dbReqs) => {
          if (isMounted && dbReqs && dbReqs.length > 0) {
            setVouchRequests((prev) => {
              const map = new Map<string, VouchRequest>();
              dbReqs.forEach((r) => map.set(r.id, r));
              prev.forEach((r) => {
                if (!map.has(r.id)) map.set(r.id, r);
              });
              return Array.from(map.values());
            });
          }
        })
        .catch((err) => {
          console.warn('VerificationCenter: Supabase requests fetch fallback:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleUpdate = () => {
      setVouchRequests(loadVouchRequests());
    };
    window.addEventListener('ndc_vouch_requests_updated', handleUpdate);
    return () => window.removeEventListener('ndc_vouch_requests_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const isVerified = (currentUser.verificationStatus || 'verified') === 'verified';
  const vouchesCount = currentUser.vouchesCount ?? (currentUser.verifiedBy?.length ?? (isVerified ? 2 : 0));
  const targetVouches = currentUser.vouchTargetCount || 2;
  const progressPercent = isVerified ? 100 : Math.min(100, Math.round((vouchesCount / targetVouches) * 100));

  const handleCopyLink = () => {
    const link = getVouchShareLink(currentUser);
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSimulateClassmateVouch = () => {
    simulateDemoVouchForUser(currentUser, (updated) => {
      updateProfile(updated);
      setVouchSuccessMsg(
        updated.verificationStatus === 'verified'
          ? '2/2 Vouches Complete! Your profile is now officially Verified Notredamian.'
          : `1 Classmate Vouch received (${updated.vouchesCount}/2)! Need 1 more vouch to complete verification.`
      );
      setTimeout(() => setVouchSuccessMsg(''), 4000);
    });
  };

  const handleResetToPendingForDemo = () => {
    const resetProfile: Partial<AlumniProfile> = {
      verificationStatus: 'pending_vouch',
      verificationMethod: 'two_vouches',
      vouchesCount: 0,
      vouchTargetCount: 2,
      verifiedBy: [],
      badges: (currentUser.badges || []).filter((b) => b !== 'Verified Notredamian'),
    };
    updateProfile(resetProfile);
    registerUserVouchRequest({ ...currentUser, ...resetProfile });
    setDocVerifiedSuccess(false);
    setVouchSuccessMsg('Verification status set to Pending (0/2 Vouches) so you can test the Peer Vouch or ID Upload flow.');
    setTimeout(() => setVouchSuccessMsg(''), 4000);
  };

  const handleConfirmVouch = (request: VouchRequest) => {
    try {
      setVouchErrorMsg('');
      const res = submitPeerVouch(request.id, currentUser, vouchComment);
      setVouchRequests(loadVouchRequests());
      setConfirmingVouchFor(null);
      setVouchComment('');
      setVouchSuccessMsg(`Successfully vouched for ${request.requesterName}! ${res.isNowVerified ? 'They are now a Verified Notredamian.' : '1 vouch added.'}`);
      setTimeout(() => setVouchSuccessMsg(''), 4000);
    } catch (err: unknown) {
      const error = err as Error;
      setConfirmingVouchFor(null);
      setVouchErrorMsg(error.message || 'Could not submit vouch.');
      setTimeout(() => setVouchErrorMsg(''), 4000);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const saved = await saveMediaFile(file);
        setUploadedImagePreview(saved.url);
      } catch {
        if (typeof window !== 'undefined' && window.URL) {
          setUploadedImagePreview(window.URL.createObjectURL(file));
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            setUploadedImagePreview(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleVerifyDocument = () => {
    if (!uploadedImagePreview) return;
    setIsVerifyingDoc(true);

    setTimeout(() => {
      setIsVerifyingDoc(false);
      setDocVerifiedSuccess(true);

      const updated = {
        verificationStatus: 'verified' as const,
        verificationMethod: 'id_card_upload' as const,
        idProofUrl: uploadedImagePreview,
        verificationDate: 'Today',
        badges: currentUser.badges?.includes('Verified Notredamian')
          ? currentUser.badges
          : [...(currentUser.badges || []), 'Verified Notredamian'],
      };
      updateProfile(updated);
    }, 1500);
  };

  const filteredRequests = vouchRequests.filter((req) => {
    if (selectedBatchFilter === 'my_batch') {
      return isSameBatch(req.batchYear, currentUser.batchYear) && req.status === 'pending';
    }
    return req.status === 'pending';
  });

  const allPendingCount = vouchRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white p-1 text-slate-900 flex items-center justify-center shrink-0 shadow-md">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-black uppercase tracking-wider mb-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>3-TIER TRUST & VERIFICATION PROTOCOL</span>
              </div>
              <h2 className="font-black text-lg sm:text-xl tracking-tight leading-tight">
                Notredamian Verification Center
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 sm:px-6 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>My Status</span>
            {isVerified ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vouch_classmates')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'vouch_classmates'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Vouch for Classmates</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-black">
              {filteredRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload_id')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload_id'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Upload ID Proof</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'policy'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>How Trust Works</span>
          </button>
        </div>

        {/* Success or Error toast if any */}
        {vouchSuccessMsg && (
          <div className="bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{vouchSuccessMsg}</span>
          </div>
        )}
        {vouchErrorMsg && (
          <div className="bg-rose-600 text-white px-5 py-2.5 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{vouchErrorMsg}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: MY STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Profile Verification Card */}
              <div
                className={`p-6 rounded-3xl border ${
                  isVerified
                    ? 'bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-blue-950/20 border-emerald-500/40'
                    : 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 dark:from-amber-950/20 dark:via-slate-900 dark:to-orange-950/20 border-amber-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.fullName}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md"
                      />
                      {isVerified ? (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          {currentUser.fullName}
                        </h3>
                        {isVerified && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        Roll: <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{currentUser.collegeRoll || '118042'}</span> · NDC Batch <span className="font-bold text-blue-600 dark:text-blue-400">{currentUser.batchYear}</span> ({currentUser.group || 'Science'})
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Trust Level
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${
                        isVerified
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-amber-500 text-white shadow-xs'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isVerified ? 'Tier 3: Verified Notredamian' : `Tier 2: Pending (${vouchesCount}/${targetVouches} Vouches)`}</span>
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Peer Vouch Verification Progress
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {isVerified ? '100% Complete' : `${vouchesCount} of ${targetVouches} Classmates Vouched`}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isVerified
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Who has vouched */}
                {currentUser.verifiedBy && currentUser.verifiedBy.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Classmates Who Vouched for You:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {currentUser.verifiedBy.map((vouchName, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{vouchName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* If Not Verified, Offer 2 Paths */}
              {!isVerified && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: Request Vouch from Classmates */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1">
                        1. Invite Classmates to Vouch
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                        Share your unique vouch link in your batch WhatsApp or Facebook group. Once 2 verified batchmates confirm your identity, your profile is unlocked!
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedLink ? 'Copied Link!' : 'Copy Vouch Link'}</span>
                        </button>

                        <a
                          href={getWhatsAppVouchShareUrl(currentUser)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors"
                          title="Share to WhatsApp"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      {/* Demo Quick Test Button */}
                      <button
                        type="button"
                        onClick={handleSimulateClassmateVouch}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 transition-colors"
                        title="Simulate a batchmate vouching for you"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>⚡ Test Vouch (Simulate Classmate Endorsement)</span>
                      </button>
                    </div>
                  </div>

                  {/* Option B: Upload Document */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1">
                        2. Fast-Track with NDC ID Photo
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                        Don't have batchmates online right now? Upload a photo of your college ID card, HSC registration card, library card, or batch souvenir page.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('upload_id')}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload ID / Souvenir Photo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* If already verified, show privilege checklist */}
              {isVerified && (
                <div className="p-5 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-4">
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Unlocked Verified Notredamian Privileges</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Full posting & commenting in Quad Feed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Access to Batch {normalizeToBatchNumber(currentUser.batchYear)} Private Lounge</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Right to vouch for incoming classmates</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Official Verified Badge on directory card</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('vouch_classmates')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Vouch for Classmates ({allPendingCount} Pending)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetToPendingForDemo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Switch status to Pending (0/2 Vouches) to test peer vouching or ID upload"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Test Pending Verification Flow</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VOUCH FOR CLASSMATES */}
          {activeTab === 'vouch_classmates' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Pending Verification Requests
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vouch for real classmates you recognize from your college days.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchFilter('my_batch')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      selectedBatchFilter === 'my_batch'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    My Batch ({currentUser.batchYear})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBatchFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      selectedBatchFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    All Batches
                  </button>
                </div>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    All Batchmates are Verified!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    There are no pending verification requests in this queue right now. You will be notified when a new classmate signs up.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((req) => {
                    const alreadyVouchedByMe = req.vouches.some((v) => v.voucherId === currentUser.id);

                    return (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={req.requesterAvatar}
                            alt={req.requesterName}
                            className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {req.requesterName}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                                Batch {req.batchYear} · {req.group}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Roll: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{req.collegeRoll}</span>
                              {req.section && <span> · {req.section}</span>}
                              {req.profession && <span> · {req.profession}</span>}
                            </div>
                            {req.message && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                "{req.message}"
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>{req.vouches.length} of {req.targetVouches} vouches received</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 w-full sm:w-auto">
                          {alreadyVouchedByMe ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>You Vouched</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingVouchFor(req)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>✓ Vouch for Brother</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UPLOAD ID PROOF */}
          {activeTab === 'upload_id' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white mb-1">
                  Upload Official Notre Dame College Document
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide a clear photo of your student identity document. Our system instantly verifies student authenticity.
                </p>
              </div>

              {/* Document Type Selector */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'id_card', label: 'College ID Card', desc: 'Plastic or laminated ID' },
                  { id: 'hsc_slip', label: 'HSC Fee / Admit Card', desc: 'Board registration' },
                  { id: 'souvenir', label: 'Batch Souvenir Photo', desc: 'Yearbook / Directory' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDocType(item.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      docType === item.id
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>

              {/* Upload Drop Area */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-6 sm:p-8 text-center bg-slate-50/50 dark:bg-slate-800/20">
                {uploadedImagePreview ? (
                  <div className="space-y-4">
                    {isVideoUrl(uploadedImagePreview) ? (
                      <video
                        src={uploadedImagePreview}
                        controls
                        playsInline
                        className="max-h-56 mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md"
                      />
                    ) : (
                      <img
                        src={uploadedImagePreview}
                        alt="Uploaded proof preview"
                        className="max-h-56 mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md object-contain"
                      />
                    )}
                    <div className="flex justify-center gap-3">
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                        Change File
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={handleImageFileChange}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                      Upload Photo or Video of your {docType === 'id_card' ? 'College ID' : docType === 'hsc_slip' ? 'HSC Admit Slip' : 'Souvenir'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                      Supports any photo or video file of any size.
                    </p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Select File from Device</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleImageFileChange}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Submission Action */}
              {uploadedImagePreview && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isVerifyingDoc || docVerifiedSuccess}
                    onClick={handleVerifyDocument}
                    className={`w-full py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 text-white shadow-md transition-all ${
                      docVerifiedSuccess
                        ? 'bg-emerald-600 cursor-default'
                        : isVerifyingDoc
                        ? 'bg-blue-400 cursor-wait'
                        : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    }`}
                  >
                    {isVerifyingDoc ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Scanning NDC Credentials & Match...</span>
                      </>
                    ) : docVerifiedSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verified! Welcome Verified Notredamian.</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit for Instant Verification</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRUST POLICY */}
          {activeTab === 'policy' && (
            <div className="space-y-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
                <h4 className="font-black text-xs uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>The Notredamian Code of Trust</span>
                </h4>
                <p className="text-blue-800/90 dark:text-blue-200/80">
                  Notre Dame College Dhaka has produced leaders in engineering, science, technology, civil administration, and business across 75+ batches. Because the college authority does not maintain an open public API for member lookups, our grassroots network uses a proven peer-attestation protocol.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h5 className="font-bold text-slate-900 dark:text-white mb-1">
                    1. Why 2 Brother Vouches?
                  </h5>
                  <p>
                    A single endorsement could be an error. Two independent endorsements from verified batchmates create cryptographic certainty that the individual actually walked the halls of Motijheel campus.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h5 className="font-bold text-slate-900 dark:text-white mb-1">
                    2. Future College Authority & Lifetime Membership Sync
                  </h5>
                  <p>
                    This verified alumni register is being formatted according to the guidelines of the Notre Dame College Alumni Association. Verified members will be eligible for streamlined processing of official lifetime membership cards issued by the college authority.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h5 className="font-bold text-slate-900 dark:text-white mb-1">
                    3. Zero Outsiders Guarantee
                  </h5>
                  <p>
                    Anyone found misrepresenting their batch or roll number is permanently suspended from the network by our council moderators.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal when Vouching for someone */}
        {confirmingVouchFor && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    Confirm Classmate Vouch
                  </h4>
                  <p className="text-xs text-slate-500">
                    Vouching for {confirmingVouchFor.requesterName} (Batch {confirmingVouchFor.batchYear})
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                Do you personally confirm that this brother studied at Notre Dame College Dhaka with you?
              </p>

              <textarea
                value={vouchComment}
                onChange={(e) => setVouchComment(e.target.value)}
                placeholder="Optional: Add a quick classmate memory (e.g. 'Classmate from Group 4' or 'Room 202 brother')..."
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingVouchFor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmVouch(confirmingVouchFor)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                >
                  Confirm & Vouch ✓
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
