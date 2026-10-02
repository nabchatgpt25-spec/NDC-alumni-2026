import React from 'react';
import {
  X,
  ShieldCheck,
  Users,
  FileCheck2,
  Lock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { NDCLogo } from '../NDCLogo';

interface VerificationExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
}

export const VerificationExplainerModal: React.FC<VerificationExplainerModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 text-slate-900 flex items-center justify-center shrink-0">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>INTEGRITY & TRUST SYSTEM</span>
              </div>
              <h3 className="font-black text-base sm:text-lg tracking-tight leading-tight">
                How We Verify Real Notredamians
              </h3>
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

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          {/* Why We Verify */}
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
            <h4 className="font-black text-xs uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero Outsiders. 100% Genuine Brotherhood.</span>
            </h4>
            <p className="text-xs text-blue-800/90 dark:text-blue-200/80 leading-relaxed">
              To preserve authentic classmate privacy, protect our alumni and professionals, and ensure safe mentorship for young graduates, our network operates on a <b>strict peer-verification trust protocol</b>.
            </p>
          </div>

          {/* 3 Step Verification Workflow */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              The 3-Step Verification Protocol
            </h4>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                  1
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    Sign Up with Your NDC Roll & Batch Year
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Provide your student roll (e.g., <code className="text-blue-600 dark:text-blue-400 font-mono font-bold">118042</code> for HSC 2018) and your college group (Science, Humanities, or Commerce). Our system verifies the roll format against historical NDC batch ranges.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-black text-sm flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                  2
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    Choose Your Verification Path
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>Method A: 2-Brother Vouch</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Share your vouch link with your batchmates. Once <b>two already-verified brothers</b> from your batch confirm you were classmates, you are approved!
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Method B: ID / Souvenir Photo</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Upload a photo of your old NDC student ID, library card, HSC fee receipt, or a batch souvenir page showing your roll.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                  3
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <span>Unlock Blue/Gold Verified Badge</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Once verified, you unlock permanent entry into your private Batch Lounge, post rights on the Quad Feed, access to global directory search, and the ability to vouch for 5 other classmates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* College Authority Alignment Note */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Future College Authority Lifetime Integration</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              As our verified student census grows across each batch, this peer-verified network will serve as the unified bridge to present to Notre Dame College Secretariat to synchronize official lifetime membership cards.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
          >
            <span>Register & Get Verified</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
