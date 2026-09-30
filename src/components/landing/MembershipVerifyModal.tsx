import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Download,
  Share2,
  Award,
  GraduationCap,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { NDCLogo } from '../NDCLogo';
import { ALUMNI_PROFILES } from '../../data/mockData';
import { AlumniProfile } from '../../types';

interface MembershipVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
}

export const MembershipVerifyModal: React.FC<MembershipVerifyModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedMember, setVerifiedMember] = useState<AlumniProfile | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setHasSearched(true);
    const term = searchTerm.trim().toLowerCase();

    const match = ALUMNI_PROFILES.find(
      (a) =>
        a.fullName.toLowerCase().includes(term) ||
        a.collegeRoll?.toLowerCase().includes(term) ||
        a.profession?.toLowerCase().includes(term) ||
        String(a.batchYear).includes(term)
    );

    setVerifiedMember(match || null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 border border-white/20 flex items-center justify-center">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight leading-tight">
                Alumni Life Member ID Verification
              </h3>
              <p className="text-xs text-blue-200">
                Official Registry • Notre Dame College Alumni Association
              </p>
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

        {/* Search Bar Input */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter Student Roll (e.g. 119042), Name, or Batch Year..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Verify Now
            </button>
          </form>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            Tip: Try searching "Mahmud", "Bashir", "Hasan", or "119042" to test instant registry lookup.
          </p>
        </div>

        {/* Search Result or Card Preview */}
        <div className="p-6">
          {hasSearched && !verifiedMember ? (
            <div className="p-8 text-center rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                No Record Found in Central Life Member Database
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                If you graduated from Notre Dame College but haven't registered your membership number yet, please apply for Life Membership below.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRegister();
                }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
              >
                Apply for Life Membership Online
              </button>
            </div>
          ) : verifiedMember ? (
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-3">
                <CheckCircle2 className="w-4 h-4" />
                <span>OFFICIALLY VERIFIED ACTIVE LIFE MEMBER</span>
              </div>

              {/* Digital Life Membership Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 text-white p-6 shadow-2xl border border-blue-700/60">
                {/* Background Crest Watermark */}
                <div className="absolute right-[-20px] bottom-[-20px] opacity-10 w-64 h-64 pointer-events-none">
                  <NDCLogo className="w-full h-full" />
                </div>

                {/* Card Top Strip */}
                <div className="flex items-center justify-between border-b border-blue-700/60 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white p-1 shrink-0">
                      <NDCLogo className="w-full h-full" />
                    </div>
                    <div>
                      <div className="font-black text-xs tracking-wider uppercase text-blue-200">
                        NOTRE DAME COLLEGE, DHAKA
                      </div>
                      <div className="text-[10px] font-bold text-amber-400">
                        OFFICIAL ALUMNI LIFE MEMBERSHIP CARD
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-blue-300">CARD ID</span>
                    <div className="font-mono font-black text-xs text-amber-400">
                      NDC-LM-{verifiedMember.batchYear}-0{verifiedMember.id}
                    </div>
                  </div>
                </div>

                {/* Card Body: Photo & Info */}
                <div className="flex items-center gap-5">
                  <div className="w-20 h-24 rounded-xl overflow-hidden ring-2 ring-amber-400/80 shrink-0 bg-slate-800">
                    <img
                      src={verifiedMember.avatarUrl}
                      alt={verifiedMember.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="font-black text-base text-white truncate">
                      {verifiedMember.fullName}
                    </h4>
                    <div className="text-xs text-blue-200 font-semibold truncate">
                      {verifiedMember.specialty} • {verifiedMember.currentWorkplace}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-blue-300 pt-1 font-mono">
                      <span>Batch: HSC {verifiedMember.batchYear}</span>
                      <span>•</span>
                      <span>Roll: {verifiedMember.collegeRoll || '119042'}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Permanent Alumni Voting Rights Enrolled</span>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="hidden sm:flex flex-col items-center bg-white p-2 rounded-xl text-slate-900 shrink-0 shadow-md">
                    <QrCode className="w-12 h-12 text-slate-900" />
                    <span className="text-[8px] font-mono font-bold mt-0.5">VERIFIED</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-blue-800/80 flex items-center justify-between text-[10px] text-blue-300">
                  <span>Issued by NDCAA Central Executive Council</span>
                  <span className="font-mono text-amber-300">Diligite Lumen Sapientiae</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => alert(`Certificate verification token: NDCAA-${verifiedMember.batchYear}-${verifiedMember.id}`)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Digital Card</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
              <ShieldCheck className="w-10 h-10 text-blue-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Verify Any Notredamian's Membership Status
              </p>
              <p className="mt-1 max-w-sm mx-auto">
                Enter a name, college roll number, or membership ID to view official verification and generate digital smart card.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
