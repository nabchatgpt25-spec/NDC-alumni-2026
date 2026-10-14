/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Mail,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NDCLogo } from './NDCLogo';

interface ResetPasswordViewProps {
  errorMessage?: string | null;
  userEmail?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
  onRequestNewLink: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  errorMessage: initialErrorMessage,
  userEmail,
  onSuccess,
  onCancel,
  onRequestNewLink,
}) => {
  const { completePasswordRecovery, requestPasswordReset } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(initialErrorMessage || null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fallback "Request new reset link" state when link is expired/invalid
  const [reqEmail, setReqEmail] = useState(userEmail || '');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  const isLengthValid = newPassword.length >= 8;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newPassword.trim()) {
      setFormError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (!confirmPassword.trim()) {
      setFormError('Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);
    try {
      await completePasswordRecovery(newPassword);
      setIsSuccess(true);
      // Brief pause for visual confirmation then trigger onSuccess
      setTimeout(() => {
        onSuccess();
      }, 1400);
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password. Your reset link may have expired.';
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(null);
    const email = reqEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setReqError('Please enter a valid registered email address.');
      return;
    }

    setReqLoading(true);
    try {
      await requestPasswordReset(email);
      setReqSuccess(true);
    } catch (err: any) {
      setReqError(err?.message || 'Unable to send password reset link. Please verify your email.');
    } finally {
      setReqLoading(false);
    }
  };

  const isExpiredOrInvalid = Boolean(
    initialErrorMessage &&
      (initialErrorMessage.toLowerCase().includes('expired') ||
        initialErrorMessage.toLowerCase().includes('invalid') ||
        initialErrorMessage.toLowerCase().includes('already'))
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Institutional Top Crest Header */}
      <div className="mb-6 flex flex-col items-center text-center max-w-md z-10">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-2 border border-white/20 shadow-xl flex items-center justify-center mb-3">
          <NDCLogo className="w-full h-full drop-shadow-md" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-serif">
          নটর ডেম কলেজ অ্যালামনাই
        </h1>
        <p className="text-xs uppercase tracking-widest text-amber-400 font-bold mt-0.5">
          Notre Dame College Alumni Network
        </p>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 z-10 text-slate-900 dark:text-slate-100 backdrop-blur-xl">
        {isSuccess ? (
          /* Success State */
          <div className="text-center py-6 flex flex-col items-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Password Reset Complete!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-xs leading-relaxed">
              Your password has been successfully updated. You will now be redirected to sign in with your new password.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to sign in...</span>
            </div>
          </div>
        ) : isExpiredOrInvalid ? (
          /* Expired or Invalid Link Error State */
          <div className="flex flex-col animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-center text-slate-900 dark:text-white">
              Reset Link Expired or Invalid
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center mt-2 leading-relaxed">
              For your account security, password reset links expire after a short time and can only be used once.
            </p>

            <div className="mt-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError || 'This link is no longer valid or has already been used.'}</span>
            </div>

            {reqSuccess ? (
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  New Reset Link Sent!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Please check your inbox (and spam folder) for a fresh password reset email.
                </p>
                <button
                  type="button"
                  onClick={onCancel}
                  className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestNewReset} className="mt-6 flex flex-col gap-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Request a new password reset email:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="Enter your registered email address"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {reqError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {reqError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={reqLoading}
                  className="mt-1 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-60"
                >
                  {reqLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset email...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Send New Reset Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  className="mt-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  Cancel & Back to Sign In
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Active Reset Password Form */
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Set New Password
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {userEmail ? (
                    <>For account <span className="font-semibold text-slate-700 dark:text-slate-200">{userEmail}</span></>
                  ) : (
                    'Enter your new secure account password'
                  )}
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 transition ${
                      confirmPassword && !isMatchValid
                        ? 'border-rose-400 focus:ring-rose-500'
                        : confirmPassword && isMatchValid
                        ? 'border-emerald-400 focus:ring-emerald-500'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Requirements Checklist */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isLengthValid
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span
                    className={
                      isLengthValid
                        ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                        : 'text-slate-600 dark:text-slate-400'
                    }
                  >
                    Minimum 8 characters
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isMatchValid
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span
                    className={
                      isMatchValid
                        ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                        : 'text-slate-600 dark:text-slate-400'
                    }
                  >
                    Passwords match exactly
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isLengthValid || !isMatchValid}
                className="mt-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving new password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Cancel & Return to Sign In
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Security Note Footer */}
      <div className="mt-6 text-center text-[11px] text-slate-400 flex items-center gap-1.5 z-10">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
        <span>Secured by Notre Dame College Alumni Network Authentication</span>
      </div>
    </div>
  );
};
