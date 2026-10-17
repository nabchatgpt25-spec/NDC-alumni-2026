import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Users,
  Sparkles,
  X,
  AlertCircle,
  HeartHandshake,
  ArrowRight,
  GraduationCap,
  Hash,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import {
  submitPeerVouch,
  loadVouchRequests,
  registerUserVouchRequest,
  vouchForAlumniProfile,
  formatBatchDisplay,
} from '../../utils/verificationService';
import { loadStoredAlumniProfiles } from '../../data/mockData';
import { AlumniProfile } from '../../types';
import { NDCLogo } from '../NDCLogo';

interface FriendWhatsAppVouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingTarget: {
    id: number;
    name: string;
    roll: string;
    batch: number;
  };
  onSuccess?: (targetName: string) => void;
}

export const FriendWhatsAppVouchModal: React.FC<FriendWhatsAppVouchModalProps> = ({
  isOpen,
  onClose,
  incomingTarget,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [relationshipNote, setRelationshipNote] = useState<string>(
    incomingTarget.batch && incomingTarget.batch >= 1949
      ? `Confirmed classmate from HSC ${incomingTarget.batch}.`
      : 'Confirmed authentic Notre Dame College brother.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vouchSuccess, setVouchSuccess] = useState(false);
  const [isNowVerifiedResult, setIsNowVerifiedResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSelf = currentUser?.id === incomingTarget.id;
  const sameBatch =
    currentUser?.batchYear &&
    incomingTarget.batch &&
    currentUser.batchYear === incomingTarget.batch;

  const handleConfirmVouch = async () => {
    if (isSelf) {
      setErrorMessage('You cannot vouch for your own profile.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Locate existing target profile from local storage or construct
      const stored = loadStoredAlumniProfiles();
      let targetProfile = stored.find(
        (p) => p.id === incomingTarget.id || p.userId === incomingTarget.id
      );

      if (!targetProfile) {
        targetProfile = {
          id: incomingTarget.id,
          userId: incomingTarget.id,
          fullName: incomingTarget.name,
          avatarUrl: '/ndc-logo.png',
          batchYear: incomingTarget.batch || 0,
          collegeRoll: incomingTarget.roll,
          group: 'Science',
          isPublic: true,
          verificationStatus: 'unverified',
          vouchesCount: 0,
          vouchTargetCount: 2,
        } as AlumniProfile;
      }

      // 2. Execute peer vouch
      const res = await vouchForAlumniProfile(
        targetProfile,
        currentUser,
        relationshipNote.trim() || undefined
      );

      if (res.success) {
        setVouchSuccess(true);
        setIsNowVerifiedResult(res.isNowVerified);

        // Celebratory confetti
        try {
          confetti({
            particleCount: 65,
            spread: 75,
            origin: { y: 0.6, x: 0.5 },
            colors: ['#2563eb', '#10b981', '#f59e0b', '#3b82f6', '#34d399'],
          });
        } catch {}

        // Clear stored incoming request
        try {
          sessionStorage.removeItem('ndc_incoming_vouch_request');
        } catch {}

        if (onSuccess) {
          onSuccess(incomingTarget.name);
        }
      } else {
        setErrorMessage(res.message || 'Could not complete vouch.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit vouch. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.removeItem('ndc_incoming_vouch_request');
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Institutional Blue Header Banner */}
        <div className="relative p-6 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl" />
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center shrink-0">
              <NDCLogo size="md" className="rounded-xl" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-1">
                <HeartHandshake className="w-3 h-3" />
                <span>WhatsApp Vouch Request</span>
              </div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                Verify Your NDC Classmate
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {vouchSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Vouch Confirmed!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  You have successfully vouched for{' '}
                  <strong className="text-blue-600 dark:text-blue-400">{incomingTarget.name}</strong>.
                  {isNowVerifiedResult
                    ? ' With your confirmation, this brother has achieved 2/2 vouches and is now officially Verified!'
                    : ' Your confirmation has been registered to their verification progress.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                Close &amp; Return to Feed
              </button>
            </div>
          ) : (
            <>
              {/* Sender Details Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-lg flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
                      {incomingTarget.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {incomingTarget.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          {formatBatchDisplay(incomingTarget.batch)}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          <Hash className="w-3 h-3 text-slate-400" />
                          Roll: {incomingTarget.roll || 'NDC'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {sameBatch ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      Classmate (Same Batch)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                      NDC Brother
                    </span>
                  )}
                </div>
              </div>

              {/* Authenticity Verification Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Friend Link Verification</strong>
                  This alumnus shared their official WhatsApp peer link with you. By clicking confirm, you certify that you personally recognize this brother from Notre Dame College.
                </div>
              </div>

              {/* Relationship / Comment Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Confirmation Note
                </label>
                <input
                  type="text"
                  value={relationshipNote}
                  onChange={(e) => setRelationshipNote(e.target.value)}
                  placeholder="e.g. Confirmed classmate from HSC 2018 Section B"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  Later
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || isSelf}
                  onClick={handleConfirmVouch}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Confirming...'
                      : `Confirm & Vouch for ${incomingTarget.name.split(' ')[0]}`}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
