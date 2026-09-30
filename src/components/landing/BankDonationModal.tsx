import React, { useState } from 'react';
import { X, Building2, Smartphone, Copy, Check, ShieldCheck, Heart, Info } from 'lucide-react';
import { BANK_DONATION_INFO } from '../../data/noticesData';
import { NDCLogo } from '../NDCLogo';

interface BankDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BankDonationModal: React.FC<BankDonationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 text-slate-900 flex items-center justify-center">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight leading-tight">
                Alumni Dues & Scholarship Trust Accounts
              </h3>
              <p className="text-xs text-blue-200">
                Official Bank & MFS Channels • NDCAA Secretariat
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Bank Transfer Box */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400 font-bold text-xs">
              <Building2 className="w-4 h-4" />
              <span>OFFICIAL BANK ACCOUNT (DOMESTIC & INTERNATIONAL)</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Bank Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{BANK_DONATION_INFO.bankName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Branch:</span>
                <span className="font-semibold">{BANK_DONATION_INFO.branch}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Account Title:</span>
                <span className="font-bold text-slate-900 dark:text-white">{BANK_DONATION_INFO.accountTitle}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Account No:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400">{BANK_DONATION_INFO.accountNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(BANK_DONATION_INFO.accountNumber, 'account')}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Copy Account Number"
                  >
                    {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Routing / SWIFT:</span>
                <span className="font-mono font-semibold">{BANK_DONATION_INFO.routingNumber} / {BANK_DONATION_INFO.swiftCode}</span>
              </div>
            </div>
          </div>

          {/* MFS Merchant Channels */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3 text-pink-600 dark:text-pink-400 font-bold text-xs">
              <Smartphone className="w-4 h-4" />
              <span>MOBILE FINANCIAL SERVICES (bKash / Nagad / Rocket)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/60 flex items-center justify-between">
                <div>
                  <div className="font-black text-pink-700 dark:text-pink-300">bKash Merchant</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{BANK_DONATION_INFO.bKashMerchant}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(BANK_DONATION_INFO.bKashMerchant, 'bkash')}
                  className="p-1.5 text-pink-700 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-900 rounded-lg transition-colors"
                >
                  {copiedField === 'bkash' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                <div>
                  <div className="font-black text-amber-700 dark:text-amber-300">Nagad Merchant</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{BANK_DONATION_INFO.nagadMerchant}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(BANK_DONATION_INFO.nagadMerchant, 'nagad')}
                  className="p-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-lg transition-colors"
                >
                  {copiedField === 'nagad' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              <span>Reference Format: Please write your Student Roll & Batch (e.g. 119042-B98) in the payment reference.</span>
            </p>
          </div>

          {/* Secretariat Contact */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="font-bold text-slate-700 dark:text-slate-300">Secretariat Office:</div>
            <div>{BANK_DONATION_INFO.secretariatAddress}</div>
            <div>Helpline: {BANK_DONATION_INFO.helpline} • {BANK_DONATION_INFO.email}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
