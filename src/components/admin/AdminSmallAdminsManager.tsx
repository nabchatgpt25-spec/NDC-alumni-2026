import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Shield,
  Search,
  Check,
  X,
  Clock,
  Sparkles,
  Info,
  Lock,
} from 'lucide-react';
import {
  SmallAdminUser,
  getSmallAdminsList,
  appointSmallAdmin,
  removeSmallAdmin,
  toggleSmallAdminStatus,
} from '../../services/smallAdminService';
import { useAuth } from '../../context/AuthContext';

interface AdminSmallAdminsManagerProps {
  onNavigateToSmallAdmin?: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminSmallAdminsManager: React.FC<AdminSmallAdminsManagerProps> = ({
  onNavigateToSmallAdmin,
  showToast,
}) => {
  const { currentUser } = useAuth();
  const [adminsList, setAdminsList] = useState<SmallAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [notes, setNotes] = useState('');
  const [canVerify, setCanVerify] = useState(true);
  const [canDeletePosts, setCanDeletePosts] = useState(true);
  const [canViewDir, setCanViewDir] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Load list
  const loadAdmins = () => {
    setIsLoading(true);
    try {
      const list = getSmallAdminsList();
      setAdminsList(list);
    } catch (e) {
      console.warn('Failed to load small admins:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();

    const handleUpdate = () => loadAdmins();
    window.addEventListener('ndc_small_admins_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ndc_small_admins_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Handle Appointing a new Small Admin
  const handleAppointAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await appointSmallAdmin({
        email: cleanEmail,
        fullName: fullName.trim() || undefined,
        notes: notes.trim() || undefined,
        appointedBy: currentUser.fullName || currentUser.email || 'Central Admin',
        permissions: {
          canVerifyAlumni: canVerify,
          canDeletePosts: canDeletePosts,
          canViewDirectory: canViewDir,
        },
      });

      if (result.success && result.user) {
        showToast(
          `🎉 Appointed ${result.user.fullName} (${cleanEmail}) as Small Admin!`,
          'success'
        );
        setEmail('');
        setFullName('');
        setNotes('');
        loadAdmins();
      } else {
        showToast(result.error || 'Failed to appoint small admin.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error appointing small admin.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Revoking an Admin
  const handleRemove = async (sa: SmallAdminUser) => {
    const isFounding =
      sa.email.toLowerCase().includes('nurulanambashir25') ||
      sa.id === 'sa-nurulanambashir25';

    if (
      !confirm(
        `Are you sure you want to revoke Small Admin privileges from ${sa.fullName} (${sa.email})?`
      )
    ) {
      return;
    }

    try {
      const res = await removeSmallAdmin(sa.id);
      if (res.success) {
        showToast(`Revoked Small Admin access from ${sa.email}.`, 'info');
        loadAdmins();
      } else {
        showToast(res.error || 'Failed to remove small admin.', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Error removing small admin.', 'error');
    }
  };

  // Handle Toggle Active
  const handleToggle = (sa: SmallAdminUser) => {
    toggleSmallAdminStatus(sa.id, !sa.isActive);
    showToast(
      `${sa.fullName} is now ${!sa.isActive ? 'Active' : 'Inactive'}.`,
      'info'
    );
    loadAdmins();
  };

  const filtered = adminsList.filter((sa) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      sa.email.toLowerCase().includes(q) ||
      sa.fullName.toLowerCase().includes(q) ||
      (sa.notes && sa.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/40 rounded-3xl p-6 border border-blue-500/20 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Main Admin Hub
                </span>
                <span className="text-xs text-slate-400">Delegated Authority</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                Small Admin Making System
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                Appoint any email address as a Small Admin. Small Admins can verify registered alumni and delete unwanted or bad posts, without receiving access to system audit logs, site branding customizer, or database configuration.
              </p>
            </div>
          </div>

          {onNavigateToSmallAdmin && (
            <button
              type="button"
              onClick={onNavigateToSmallAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Launch Small Admin Portal</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* =================================================================== */}
        {/* LEFT COLUMN: Appoint Form                                          */}
        {/* =================================================================== */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Appoint New Small Admin
                </h3>
                <p className="text-[11px] text-slate-400">
                  Enter an email to grant sub-admin access
                </p>
              </div>
            </div>

            <form onSubmit={handleAppointAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. batch_mod@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  When this user logs in with this email, they will automatically receive Small Admin tools.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name / Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nurul Anam Bashir"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Assigned Permissions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canVerify}
                      onChange={(e) => setCanVerify(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Verify Alumni Profiles
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Approve unverified members &amp; ID submissions
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDeletePosts}
                      onChange={(e) => setCanDeletePosts(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Delete Bad / Unwanted Posts
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Hide inappropriate content from the public feed
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canViewDir}
                      onChange={(e) => setCanViewDir(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Slight Directory Access
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Inspect alumni records &amp; search batches
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Administrative Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch coordinator or community moderator"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Appointing...' : 'Appoint Small Admin'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: Appointed Small Admins Directory                     */}
        {/* =================================================================== */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Appointed Small Admins</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {adminsList.length} Total
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Active delegators with verification &amp; post moderation authority
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search small admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No Small Admins Match Query
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Use the appointment form on the left to add a small admin by email.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((sa, index) => {
                const isFounding =
                  sa.email.toLowerCase().includes('nurulanambashir25') ||
                  sa.id === 'sa-nurulanambashir25' ||
                  index === 0;

                return (
                  <div
                    key={sa.id}
                    className={`rounded-2xl p-5 border transition-all ${
                      isFounding
                        ? 'bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 dark:from-blue-950/30 dark:via-slate-900 dark:to-blue-950/20 border-blue-200 dark:border-blue-800 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                          {sa.fullName ? sa.fullName.charAt(0).toUpperCase() : 'M'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {sa.fullName}
                            </h4>
                            {isFounding && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-xs">
                                <Sparkles className="w-3 h-3" />
                                First / Founding Small Admin
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sa.isActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {sa.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </div>

                          <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
                            {sa.email}
                          </div>

                          {sa.notes && (
                            <p className="text-xs text-slate-500 mt-1">
                              💬 {sa.notes}
                            </p>
                          )}

                          {/* Permissions tags */}
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {sa.permissions.canVerifyAlumni && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Check className="w-2.5 h-2.5" />
                                Verify Alumni
                              </span>
                            )}
                            {sa.permissions.canDeletePosts && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <Check className="w-2.5 h-2.5" />
                                Delete Bad Posts
                              </span>
                            )}
                            {sa.permissions.canViewDirectory && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <Check className="w-2.5 h-2.5" />
                                Slight Access
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(sa)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            sa.isActive
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          }`}
                        >
                          {sa.isActive ? 'Disable' : 'Enable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemove(sa)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Revoke Small Admin access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
