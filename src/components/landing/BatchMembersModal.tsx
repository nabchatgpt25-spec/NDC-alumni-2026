import React from 'react';
import {
  X,
  GraduationCap,
  Users,
  MapPin,
  Building2,
  ArrowRight,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { AlumniProfile, BatchSummary } from '../../types';

interface BatchMembersModalProps {
  batch: BatchSummary | null;
  members: AlumniProfile[];
  onClose: () => void;
  onSelectMember: (profile: AlumniProfile) => void;
  onRegisterPrompt: () => void;
}

export const BatchMembersModal: React.FC<BatchMembersModalProps> = ({
  batch,
  members,
  onClose,
  onSelectMember,
  onRegisterPrompt,
}) => {
  if (!batch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-bold mb-2 backdrop-blur-xs">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Notre Dame College Academic Session: {batch.session}</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">
              Batch {batch.batchYear < 10 ? `0${batch.batchYear}` : batch.batchYear} Alumni Roster
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Representative: <span className="font-semibold text-white">{batch.representative}</span> • {batch.total} Total Graduates
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto p-6 flex-1">
          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {members.map((alumnus) => (
                <div
                  key={alumnus.id}
                  onClick={() => {
                    onClose();
                    onSelectMember(alumnus);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 group"
                >
                  <img
                    src={alumnus.avatarUrl}
                    alt={alumnus.fullName}
                    loading="lazy"
                    decoding="async"
                    className="w-13 h-13 rounded-xl object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {alumnus.fullName}
                      </h4>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    </div>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate">
                      {alumnus.position || 'Professional'}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{alumnus.institution || alumnus.city || 'Bangladesh'}</span>
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Are you from Batch {batch.batchYear < 10 ? `0${batch.batchYear}` : batch.batchYear}?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                Be the first to claim and register your verified profile for Batch {batch.batchYear}! Reconnect with your batchmates worldwide.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegisterPrompt();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register as Batch {batch.batchYear} Alumnus</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {members.length} registered profiles displayed
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
