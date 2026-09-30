import React from 'react';
import { X, Download, Printer, Calendar, Tag, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { OfficialNotice } from '../../data/noticesData';
import { NDCLogo } from '../NDCLogo';

interface OfficialNoticeModalProps {
  notice: OfficialNotice | null;
  onClose: () => void;
}

export const OfficialNoticeModal: React.FC<OfficialNoticeModalProps> = ({
  notice,
  onClose,
}) => {
  if (!notice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2.5 py-1 rounded-md">
              REF: {notice.refNo}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Published: {notice.publishedDate}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Print Circular"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formal Institutional Circular Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Institutional Letterhead */}
          <div className="text-center pb-6 border-b-2 border-double border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 mx-auto mb-2 p-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
              <NDCLogo className="w-full h-full" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              NOTRE DAME COLLEGE ALUMNI ASSOCIATION
            </h2>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider">
              CENTRAL SECRETARIAT • MOTIJHEEL, DHAKA-1000
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Est. 1949 • Diligite Lumen Sapientiae • www.ndc.edu.bd/alumni
            </div>
          </div>

          {/* Title & Classification */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {notice.category} Notice
              </span>
              {notice.isUrgent && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                  Priority Action Required
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
              {notice.title}
            </h3>
          </div>

          {/* Body Text */}
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 whitespace-pre-line font-serif">
            {notice.fullContent}
          </div>

          {/* Official Signatory Box */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <div className="text-right">
              <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold mb-1 italic">
                [Signed Electronically]
              </div>
              <div className="font-black text-sm text-slate-900 dark:text-white">
                {notice.signatory.name}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                {notice.signatory.designation}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {notice.signatory.organization}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Download */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Official Gazette Copy ({notice.fileSize || '1.2 MB'})</span>
          </div>

          <button
            type="button"
            onClick={() => alert(`Downloading circular ${notice.refNo} (PDF)...`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Official Circular PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
