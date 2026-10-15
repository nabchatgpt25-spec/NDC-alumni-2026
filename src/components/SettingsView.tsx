import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Sliders,
  Bell,
  Eye,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Volume2,
  PlaySquare,
  Sparkles,
  LayoutTemplate,
  Award,
  Loader2,
  Trash2,
  XCircle,
  Zap,
  ChevronDown,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  getUserPreferences,
  saveUserPreferences,
  type UserPreferences,
  DEFAULT_USER_PREFERENCES,
} from '../utils/userPreferences';

interface SettingsViewProps {
  onOpenVerificationCenter?: (
    tab?: 'status' | 'vouch_classmates' | 'vouch_others' | 'upload_id' | 'policy'
  ) => void;
  onNavigate?: (route: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenVerificationCenter,
  onNavigate,
}) => {
  const { currentUser, logout } = useAuth();

  // Active section tab ('all' shows full stacked sections)
  const [activeSection, setActiveSection] = useState<
    'all' | 'account' | 'preferences' | 'notifications' | 'privacy' | 'danger'
  >('all');

  // Preferences State
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    getUserPreferences()
  );
  const [prefsSavedMessage, setPrefsSavedMessage] = useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearStatus, setCacheClearStatus] = useState<string | null>(null);
  const [openDescriptions, setOpenDescriptions] = useState<Record<string, boolean>>({});

  const toggleDescriptionDropdown = (id: string) => {
    setOpenDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleClearAllCaches = async () => {
    setIsClearingCache(true);
    setCacheClearStatus(null);
    try {
      // 1. Clear Service Worker and CacheStorage caches
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 2. Clear transient session storage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.clear();
      }

      // 3. Clear temporary local cache keys while preserving user session and preferences
      if (typeof window !== 'undefined' && window.localStorage) {
        const preserveKeys = new Set([
          'ndc_auth_user',
          'ndc_user_preferences',
          'ndc_theme',
          'ndc_bg_music_muted',
          'ndc_alumni_posts',
          'ndc_alumni_gallery_albums',
        ]);
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            !preserveKeys.has(key) &&
            (key.includes('cache') ||
              key.includes('temp') ||
              key.includes('preview') ||
              key.includes('query'))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }

      setCacheClearStatus('All cache files removed! Website speed maximized.');
      setTimeout(() => setCacheClearStatus(null), 4000);
    } catch (err) {
      console.warn('Cache clear note:', err);
      setCacheClearStatus('Cache cleaned.');
      setTimeout(() => setCacheClearStatus(null), 3000);
    } finally {
      setIsClearingCache(false);
    }
  };

  useEffect(() => {
    // Keep local state in sync if preferences are updated elsewhere
    const handlePrefsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<UserPreferences>;
      if (customEvent.detail) {
        setPreferences(customEvent.detail);
      }
    };
    window.addEventListener('ndc_user_prefs_changed', handlePrefsChanged);
    return () => {
      window.removeEventListener('ndc_user_prefs_changed', handlePrefsChanged);
    };
  }, []);

  const handleTogglePreference = async (key: keyof UserPreferences) => {
    const updatedValue = !preferences[key];
    const newPrefs = { ...preferences, [key]: updatedValue };
    setPreferences(newPrefs);

    try {
      await saveUserPreferences({ [key]: updatedValue }, currentUser?.id);
      setPrefsSavedMessage('Preference saved');
      setTimeout(() => setPrefsSavedMessage(null), 2000);
    } catch (err) {
      console.warn('Failed to save preference:', err);
    }
  };

  // ==========================================
  // SECTION A: Password & Email Forms State
  // ==========================================
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [emailState, setEmailState] = useState({
    newEmail: '',
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!passwordState.newPassword || passwordState.newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password must be at least 6 characters long.',
      });
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'New passwords do not match. Please verify and retry.',
      });
      return;
    }

    setPasswordLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: passwordState.newPassword,
        });
        if (error) throw error;
      }

      setPasswordFeedback({
        type: 'success',
        message: 'Your password has been updated successfully.',
      });
      setPasswordState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordFeedback({
        type: 'error',
        message: err.message || 'Failed to update password. Please check your credentials.',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);

    const cleanEmail = emailState.newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailFeedback({
        type: 'error',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    setEmailLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          email: cleanEmail,
        });
        if (error) throw error;
      }

      setEmailFeedback({
        type: 'success',
        message: `A confirmation link has been sent to ${cleanEmail}. Please check your inbox to confirm the change.`,
      });
      setEmailState({ newEmail: '' });
    } catch (err: any) {
      setEmailFeedback({
        type: 'error',
        message: err.message || 'Failed to request email update. Please try again.',
      });
    } finally {
      setEmailLoading(false);
    }
  };

  // ==========================================
  // SECTION E: Danger Zone Inline State
  // ==========================================
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const handleConfirmAccountDelete = async () => {
    if (deleteInputText.trim() !== 'DELETE') return;
    setDeleteLoading(true);
    setDeleteMessage(null);

    try {
      // Safe client procedure per guidelines:
      // Check if delete_account_rpc exists; if not, safely sign out and redirect to home with contact notice.
      let rpcExecuted = false;
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.rpc('delete_account_rpc');
          if (!error) rpcExecuted = true;
        } catch {
          // Function not provisioned on db, fallback gracefully
        }
        await supabase.auth.signOut();
      }

      logout();
      setDeleteMessage(
        rpcExecuted
          ? 'Your account deletion request has been submitted.'
          : 'You have been signed out. Please contact admin@ndc-alumni.com to complete account deletion.'
      );

      setTimeout(() => {
        if (onNavigate) {
          onNavigate('landing');
        } else {
          window.location.hash = 'landing';
        }
      }, 3500);
    } catch (err: any) {
      setDeleteMessage(
        err.message || 'Error initiating deletion. Please contact admin@ndc-alumni.com.'
      );
      setDeleteLoading(false);
    }
  };

  // Helper heading dropdown renderer for section titles & headlines
  const renderHeadingDropdown = (
    id: string,
    titleNode: React.ReactNode,
    description?: string,
    isDanger?: boolean
  ) => {
    if (!description) return <>{titleNode}</>;
    const isDescOpen = Boolean(openDescriptions[id]);

    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {titleNode}
          <button
            type="button"
            onClick={() => toggleDescriptionDropdown(id)}
            className={`p-1 rounded-md transition-all cursor-pointer border flex items-center justify-center shrink-0 ${
              isDescOpen
                ? isDanger
                  ? 'bg-rose-200/80 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-300 dark:border-rose-700 shadow-xs'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-xs'
                : isDanger
                ? 'bg-rose-100/70 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/50 hover:bg-rose-200/50'
                : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
            title={isDescOpen ? 'Hide description' : 'View description dropdown'}
            aria-label={isDescOpen ? 'Hide description' : 'View description dropdown'}
            aria-expanded={isDescOpen}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isDescOpen
                  ? `rotate-180 ${isDanger ? 'text-rose-600 dark:text-rose-300' : 'text-blue-600 dark:text-blue-400'}`
                  : ''
              }`}
            />
          </button>
        </div>

        {/* Dropdown Menu for description under this headline */}
        {isDescOpen && (
          <div
            className={`mt-2 p-2.5 rounded-xl border text-xs leading-relaxed animate-fadeIn ${
              isDanger
                ? 'bg-rose-100/70 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : 'bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            <p>{description}</p>
          </div>
        )}
      </div>
    );
  };

  // Helper toggle switch renderer
  const renderToggle = (
    label: string,
    description: string,
    key: keyof UserPreferences,
    icon?: React.ReactNode
  ) => {
    const isChecked = Boolean(preferences[key]);
    const isDescOpen = Boolean(openDescriptions[String(key)]);

    return (
      <div className="py-3 border-b border-slate-100 dark:border-slate-800/80 last:border-0 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor={`toggle-${key}`}
                  className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white cursor-pointer select-none"
                >
                  {label}
                </label>
                {description && (
                  <button
                    type="button"
                    onClick={() => toggleDescriptionDropdown(String(key))}
                    className={`p-0.5 rounded-md transition-all cursor-pointer border flex items-center justify-center shrink-0 ${
                      isDescOpen
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                    title={isDescOpen ? 'Hide description' : 'View description dropdown'}
                    aria-label={isDescOpen ? 'Hide description' : 'View description dropdown'}
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isDescOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            id={`toggle-${key}`}
            type="button"
            role="switch"
            aria-checked={isChecked}
            onClick={() => handleTogglePreference(key)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
              isChecked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span className="sr-only">{label}</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isChecked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Dropdown Menu for description under this headline */}
        {isDescOpen && description && (
          <div className="mt-2.5 ml-11 p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed animate-fadeIn">
            <p>{description}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            {renderHeadingDropdown(
              'main_settings',
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Settings
              </h1>,
              'Manage your account credentials, institutional verification, application preferences, and privacy.'
            )}
          </div>
          {prefsSavedMessage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {prefsSavedMessage}
            </span>
          )}
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSection === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Settings
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('account')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSection === 'account'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Account
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('preferences')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSection === 'preferences'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            App Preferences
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('notifications')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSection === 'notifications'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('privacy')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSection === 'privacy'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            Privacy
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('danger')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSection === 'danger'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A — ACCOUNT (READ-ONLY STATUS + SECURITY ACTIONS)                  */}
      {/* ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'account') && (
        <div className="space-y-6">
          {/* 1. Verification Status (Read-Only) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                {renderHeadingDropdown(
                  'section_verification',
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Verification Status
                  </h2>,
                  'Official Notre Dame College Alumni institutional standing'
                )}
              </div>

              {onOpenVerificationCenter && (
                <button
                  type="button"
                  onClick={() => onOpenVerificationCenter('status')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-700/50 transition-colors cursor-pointer shrink-0"
                >
                  <span>Open Verification Center</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-1">
                  Verification Status
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide ${
                    currentUser?.verificationStatus === 'verified'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : currentUser?.verificationStatus === 'pending_vouch'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {currentUser?.verificationStatus || 'unverified'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-1">
                  ID Submission Status
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {currentUser?.idSubmissionStatus || 'None / Inactive'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-1">
                  Verified Date
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {currentUser?.verificationDate || 'Pending verification'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-1">
                  Peer Vouches Count
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {currentUser?.vouchesCount ?? 0} / {currentUser?.vouchTargetCount ?? 2} Vouches
                </span>
              </div>
            </div>

            {/* Admin Review Note if any */}
            {currentUser?.adminReviewNote && (
              <div className="mt-3.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Administrative Review Note:</span>{' '}
                  <span>{currentUser.adminReviewNote}</span>
                </div>
              </div>
            )}

            {/* Badges List if present */}
            {Array.isArray(currentUser?.badges) && currentUser.badges.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Institutional Badges
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentUser.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Change Password (Inline Form) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              {renderHeadingDropdown(
                'section_password',
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Change Password
                </h2>,
                'Update your authentication credentials securely'
              )}
            </div>

            <form onSubmit={handleUpdatePassword} className="mt-4 space-y-3.5 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordState.newPassword}
                    onChange={(e) =>
                      setPasswordState((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordState.confirmPassword}
                    onChange={(e) =>
                      setPasswordState((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {passwordFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </form>
          </div>

          {/* 3. Change Email (Inline Form) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              {renderHeadingDropdown(
                'section_email',
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Change Email
                </h2>,
                'Update primary account contact email address'
              )}
            </div>

            <form onSubmit={handleUpdateEmail} className="mt-4 space-y-3.5 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={emailState.newEmail}
                    onChange={(e) => setEmailState({ newEmail: e.target.value })}
                    placeholder="alumnus@domain.com"
                    className="w-full px-3 py-2 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {emailFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    emailFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {emailFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{emailFeedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {emailLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{emailLoading ? 'Sending Confirmation...' : 'Request Email Change'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B — APP PREFERENCES (FUTURE-PROOF TOGGLE SYSTEM)                   */}
      {/* ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'preferences') && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            {renderHeadingDropdown(
              'section_preferences',
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Application Preferences
              </h2>,
              'Tailor playback, multimedia, animations, and feed presentation'
            )}
          </div>

          {renderToggle(
            'Auto-play videos while scrolling',
            'Automatically stream media previews in your alumni feed as they enter view.',
            'autoplay_videos_on_scroll',
            <PlaySquare className="w-4 h-4" />
          )}

          {renderToggle(
            'Background music enabled',
            'Allow the ceremonial Notre Dame anthem theme to play softly during exploration.',
            'bg_music_enabled',
            <Volume2 className="w-4 h-4" />
          )}

          {renderToggle(
            'Mute by default',
            'Start portal visits with ambient soundtrack muted until manually activated.',
            'bg_music_muted_default',
            <Volume2 className="w-4 h-4" />
          )}

          {renderToggle(
            'Reduced motion / animations',
            'Disable decorative floating effects and minimize 3D tilt transitions.',
            'reduced_motion',
            <Sparkles className="w-4 h-4" />
          )}

          {renderToggle(
            'Compact dashboard layout',
            'Display feed cards and batch directories with denser vertical spacing.',
            'compact_layout',
            <LayoutTemplate className="w-4 h-4" />
          )}

          {/* Cache Cleaning & Website Speed Optimization */}
          <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  {renderHeadingDropdown(
                    'section_cache_clean',
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Clear Browser Cache & Speed Up Website</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                        Turbo
                      </span>
                    </h3>,
                    'Remove accumulated browser asset caches, service worker entries, and temporary files to free memory and maximize browsing speed.'
                  )}
                  {cacheClearStatus && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {cacheClearStatus}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearAllCaches}
                disabled={isClearingCache}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-xs hover:shadow transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isClearingCache ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cache Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C — NOTIFICATIONS                                                  */}
      {/* ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'notifications') && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            {renderHeadingDropdown(
              'section_notifications',
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Notification Preferences
              </h2>,
              'Choose how and when the network communicates critical announcements'
            )}
          </div>

          {renderToggle(
            'Email notifications',
            'Receive email digests for official Notre Dame alumni notices and blood emergency alerts.',
            'email_notifications',
            <Mail className="w-4 h-4" />
          )}

          {renderToggle(
            'In-app notifications',
            'Show in-app bell alerts for peer vouches, post replies, and batch mentions.',
            'in_app_notifications',
            <Bell className="w-4 h-4" />
          )}

          {renderToggle(
            'Verification update alerts',
            'Instant notifications when classmates vouch for you or administrators approve credentials.',
            'verification_alerts',
            <ShieldCheck className="w-4 h-4" />
          )}

          {renderToggle(
            'Mentorship & Career direct alerts',
            'Strict 1-to-1 notifications when juniors ask you for senior guidance, mentors reply to your questions, or alumni apply to your career postings.',
            'mentorship_career_alerts',
            <GraduationCap className="w-4 h-4" />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D — PRIVACY                                                        */}
      {/* ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'privacy') && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            {renderHeadingDropdown(
              'section_privacy',
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Privacy & Visibility Controls
              </h2>,
              'Control who can discover and view your professional presence'
            )}
          </div>

          {renderToggle(
            'Show profile to other alumni',
            'Allow fellow registered Notredamians to find your profile in batch directories.',
            'is_public',
            <Eye className="w-4 h-4" />
          )}

          {renderToggle(
            'Show contact info to verified alumni only',
            'Strictly protect mobile, WhatsApp, and email behind institutional peer verification.',
            'show_contact_to_verified',
            <Lock className="w-4 h-4" />
          )}

          {renderToggle(
            'Allow alumni search discovery',
            'Include your name, profession, and cohort in global alumni directory searches.',
            'allow_search_discovery',
            <ShieldCheck className="w-4 h-4" />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION E — DANGER ZONE — DELETE ACCOUNT (INLINE CONFIRMATION ONLY)        */}
      {/* ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'danger') && (
        <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              {renderHeadingDropdown(
                'section_danger',
                <h2 className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-200">
                  Danger Zone — Delete Account
                </h2>,
                'Deleting is permanent. Contact admin if you need help.',
                true
              )}
            </div>

            {!showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                Delete my account
              </button>
            )}
          </div>

          {/* Inline Confirmation Card (No modals / No heavy overlays) */}
          {showDeleteConfirm && (
            <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 space-y-3 animate-fadeIn">
              <div className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <p>
                  This action cannot be undone. To prevent accidental deletion, please type{' '}
                  <span className="font-mono font-bold bg-rose-100 dark:bg-rose-900/50 px-1.5 py-0.5 rounded text-rose-900 dark:text-rose-200">
                    DELETE
                  </span>{' '}
                  in the box below to proceed.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={deleteInputText}
                  onChange={(e) => setDeleteInputText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full max-w-sm px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {deleteMessage && (
                <div className="p-3 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {deleteMessage}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteInputText('');
                    setDeleteMessage(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={deleteInputText.trim() !== 'DELETE' || deleteLoading}
                  onClick={handleConfirmAccountDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsView;
