import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  FileCheck2,
  HeartHandshake,
  Megaphone,
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Download,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Award,
  AlertTriangle,
  Pin,
  Eye,
  EyeOff,
  GraduationCap,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  apiUrl,
  CUSTOM_DOMAIN,
  PUBLISHED_AI_STUDIO_URL,
  CLOUD_RUN_BACKEND_URL,
} from '../../lib/apiConfig';

interface StreamGroupConfig {
  id: number;
  stream: string;
  groupCode: string | null;
  expectedGroupCount: number;
  isActive: boolean;
  updatedAt: string;
}

interface AuditItem {
  id: number;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  severity: string;
  summary: string;
  createdAt: string;
}

interface OverviewMetrics {
  totalProfiles: number;
  verifiedProfiles: number;
  pendingProfiles: number;
  suspendedProfiles: number;
  registeredDonors: number;
  pendingDocReviews: number;
  activeBloodEmergencies: number;
  publishedNotices: number;
  streamDistribution: {
    Science: number;
    Humanities: number;
    'Business Studies': number;
  };
  streamGroupsConfig: StreamGroupConfig[];
  recentAuditLogs: AuditItem[];
}

interface DbAlumniRecord {
  id: number;
  fullName: string;
  avatarUrl: string;
  batchYear: number;
  session: string | null;
  collegeRoll: string | null;
  academicStream: string;
  academicGroup: string | null;
  section: string | null;
  verificationStatus: string;
  verificationMethod: string;
  vouchesCount: number;
  vouchTargetCount: number;
  verifiedByAdmin: string | null;
  profession: string;
  position: string;
  institution: string;
  city: string;
  country: string;
  phone: string | null;
  phoneOwnershipVerified?: boolean;
  phoneVerifiedAt?: string | null;
  phoneVerifiedByAdmin?: string | null;
  phoneVerificationNotes?: string | null;
  whatsapp: string | null;
  email: string | null;
  bloodGroup: string | null;
  isRegisteredDonor: boolean;
  role: string;
  accountStatus: string;
  createdAt: string;
}

interface VerificationSubmissionItem {
  id: number;
  submissionCode: string;
  profileId: number;
  fullName: string;
  avatarUrl: string;
  batchYear: number;
  collegeRoll: string;
  academicStream: string;
  academicGroup: string | null;
  phone: string | null;
  email: string | null;
  docType: string;
  docTypeLabel: string;
  documentUrl: string;
  vouchesCount: number;
  targetVouches: number;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNote: string | null;
  submittedAt: string;
}

interface BloodEmergencyItem {
  id: number;
  requestCode: string;
  bloodGroup: string;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalName: string;
  hospitalArea: string;
  city: string;
  requiredDateTime: string;
  emergencyLevel: string;
  contactMethod: string;
  description: string;
  requesterName: string;
  requesterBatch: number;
  status: string;
  verifiedByAdmin: string | null;
  moderationNote: string | null;
}

interface OfficialNoticeItem {
  id: number;
  title: string;
  category: string;
  content: string;
  targetBatch: number | null;
  isPinned: boolean;
  isPublished: boolean;
  authorName: string;
  createdAt: string;
}

interface AdminCommandCenterViewProps {
  onViewProfile?: (profileId: number) => void;
}

export const AdminCommandCenterView: React.FC<AdminCommandCenterViewProps> = ({
  onViewProfile,
}) => {
  const { currentUser, loginWithGoogle, getAuthHeaders, isAdminUser, supabaseToken } = useAuth();

  const [activeSection, setActiveSection] = useState<
    'overview' | 'directory' | 'verifications' | 'streams' | 'blood_notices' | 'domain_export'
  >('overview');

  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [profiles, setProfiles] = useState<DbAlumniRecord[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Filters for 100k Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [revealPii, setRevealPii] = useState(false);

  // Verifications state
  const [submissions, setSubmissions] = useState<VerificationSubmissionItem[]>([]);
  const [verifFilter, setVerifFilter] = useState('all');
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  // Blood & Notices state
  const [bloodRequests, setBloodRequests] = useState<BloodEmergencyItem[]>([]);
  const [notices, setNotices] = useState<OfficialNoticeItem[]>([]);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState('Security');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeBatch, setNewNoticeBatch] = useState('');
  const [newNoticePinned, setNewNoticePinned] = useState(false);
  const [newNoticePublished, setNewNoticePublished] = useState(true);

  const [loading, setLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => {
      setBannerMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const fetchOverview = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/api/admin/overview'), { headers });
      if (!res.ok) throw new Error('Failed to load overview metrics');
      const data = await res.json();
      setOverview(data);
    } catch (err: any) {
      console.error(err);
    }
  }, [getAuthHeaders]);

  const fetchDirectory = useCallback(
    async (targetPage = pagination.page) => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(pagination.limit),
          adminView: String(revealPii),
        });
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (batchFilter.trim()) params.set('batchYear', batchFilter.trim());
        if (streamFilter !== 'all') params.set('academicStream', streamFilter);
        if (statusFilter !== 'all') params.set('verificationStatus', statusFilter);
        if (roleFilter !== 'all') params.set('role', roleFilter);

        const res = await fetch(apiUrl(`/api/alumni?${params.toString()}`), { headers });
        if (!res.ok) throw new Error('Failed to fetch alumni records');
        const data = await res.json();
        setProfiles(data.profiles || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err: any) {
        showBanner('error', err?.message || 'Unable to load alumni records.');
      } finally {
        setLoading(false);
      }
    },
    [
      getAuthHeaders,
      pagination.page,
      pagination.limit,
      revealPii,
      searchQuery,
      batchFilter,
      streamFilter,
      statusFilter,
      roleFilter,
    ]
  );

  const fetchVerifications = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl(`/api/admin/verifications?status=${verifFilter}`), {
        headers,
      });
      if (!res.ok) throw new Error('Failed to load verification submissions');
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      console.error(err);
    }
  }, [getAuthHeaders, verifFilter]);

  const fetchBloodAndNotices = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [bloodRes, noticesRes] = await Promise.all([
        fetch(apiUrl('/api/admin/blood-requests'), { headers }),
        fetch(apiUrl('/api/admin/notices'), { headers }),
      ]);
      if (bloodRes.ok) {
        const bData = await bloodRes.json();
        setBloodRequests(bData.requests || []);
      }
      if (noticesRes.ok) {
        const nData = await noticesRes.json();
        setNotices(nData.notices || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchOverview();
    fetchDirectory(1);
    fetchVerifications();
    fetchBloodAndNotices();
  }, [fetchOverview, fetchDirectory, fetchVerifications, fetchBloodAndNotices]);

  const handleProfileGovernanceUpdate = async (
    profileId: number,
    updates: {
      verificationStatus?: string;
      role?: string;
      accountStatus?: string;
    }
  ) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl(`/api/admin/alumni/${profileId}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      showBanner('success', `Updated governance settings for ${data.profile.fullName}.`);
      fetchDirectory(pagination.page);
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to update profile governance.');
    }
  };

  const handleVerifyPhoneOwnership = async (
    profileId: number,
    fullName: string,
    phone: string | null
  ) => {
    try {
      const notes = window.prompt(
        `Verify Phone Ownership for ${fullName} (${phone || 'No Phone'})?\nEnter optional verification notes (e.g. "Called alumnus on mobile / confirmed roll with batch coordinator"):`,
        'Verified by central administrator'
      );
      if (notes === null) return; // User cancelled prompt

      const trimmedNotes = notes.trim() || 'Verified by central administrator';
      let verifiedPhone = phone || '';

      // 1. Try Supabase Edge Function 'admin-verify-phone'
      let edgeSuccess = false;
      if (isSupabaseConfigured) {
        try {
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-verify-phone', {
            body: { profileId, action: 'verify', notes: trimmedNotes },
          });

          if (edgeErr) {
            let parsedErr = edgeErr.message || '';
            try {
              if (edgeErr.context && typeof edgeErr.context.json === 'function') {
                const j = await edgeErr.context.json();
                if (j?.error) parsedErr = j.error;
              }
            } catch {}
            if (parsedErr && !parsedErr.includes('404') && !parsedErr.includes('Failed to send a request')) {
              throw new Error(parsedErr);
            }
          }

          if (edgeData?.error) throw new Error(edgeData.error);

          if (edgeData?.success) {
            edgeSuccess = true;
            verifiedPhone = edgeData.profile?.phone || verifiedPhone;
          }
        } catch (edgeCallErr: any) {
          const msg = edgeCallErr?.message || '';
          if (msg.includes('already verified for') || msg.includes('Forbidden') || msg.includes('Unauthorized')) {
            throw edgeCallErr;
          }
        }
      }

      // 2. Fallback to Express backend endpoint
      if (!edgeSuccess) {
        const headers = await getAuthHeaders();
        const res = await fetch(apiUrl('/api/admin/verify-phone'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            profileId,
            notes: trimmedNotes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to verify phone ownership');
        verifiedPhone = data.profile?.phone || verifiedPhone;
      }

      showBanner(
        'success',
        `Phone ownership verified for ${fullName} (${verifiedPhone}). Phone + Password login is now active!`
      );
      fetchDirectory(pagination.page);
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to verify phone ownership.');
    }
  };

  const handleRevokePhoneOwnership = async (
    profileId: number,
    fullName: string,
    phone: string | null
  ) => {
    try {
      if (
        !window.confirm(
          `Are you sure you want to revoke phone ownership verification for ${fullName} (${phone || 'Alumnus'})?\nThis will disable phone login for this account until verified again.`
        )
      ) {
        return;
      }

      // 1. Try Supabase Edge Function 'admin-verify-phone'
      let edgeSuccess = false;
      if (isSupabaseConfigured) {
        try {
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-verify-phone', {
            body: { profileId, action: 'revoke' },
          });

          if (!edgeErr && edgeData?.success) {
            edgeSuccess = true;
          }
        } catch {
          // fallback to Express endpoint
        }
      }

      // 2. Fallback to Express backend endpoint
      if (!edgeSuccess) {
        const headers = await getAuthHeaders();
        const res = await fetch(apiUrl('/api/admin/revoke-phone-verification'), {
          method: 'POST',
          headers,
          body: JSON.stringify({ profileId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to revoke phone verification');
      }

      showBanner(
        'success',
        `Phone ownership verification revoked for ${fullName}. Phone login disabled.`
      );
      fetchDirectory(pagination.page);
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to revoke phone verification.');
    }
  };

  const handleReviewSubmission = async (
    submissionId: number,
    decision: 'approved' | 'rejected'
  ) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl(`/api/admin/verifications/${submissionId}/review`), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          decision,
          adminNote: reviewNotes[submissionId] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review document');
      showBanner(
        'success',
        `Submission ${data.submission.submissionCode} ${decision.toUpperCase()}.`
      );
      fetchVerifications();
      fetchOverview();
      fetchDirectory(pagination.page);
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to process verification review.');
    }
  };

  const handleToggleStreamGroup = async (id: number, currentActive: boolean) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl(`/api/admin/stream-groups/${id}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stream group');
      showBanner(
        'success',
        `Updated ${data.streamGroup.stream} ${data.streamGroup.groupCode || 'Capacity'} status.`
      );
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to update stream group.');
    }
  };

  const handleModerateBloodRequest = async (
    id: number,
    status: string,
    unitsFulfilled?: number
  ) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl(`/api/admin/blood-requests/${id}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, unitsFulfilled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update blood request');
      showBanner('success', `Blood request ${data.request.requestCode} marked as ${status}.`);
      fetchBloodAndNotices();
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to moderate blood request.');
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) {
      showBanner('error', 'Please provide both a title and content for the official notice.');
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/api/admin/notices'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newNoticeTitle.trim(),
          category: newNoticeCategory,
          content: newNoticeContent.trim(),
          targetBatch: newNoticeBatch.trim() ? Number(newNoticeBatch.trim()) : null,
          isPinned: newNoticePinned,
          isPublished: newNoticePublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish notice');
      showBanner('success', `Official notice "${data.notice.title}" saved.`);
      setNewNoticeTitle('');
      setNewNoticeContent('');
      setNewNoticeBatch('');
      fetchBloodAndNotices();
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to save notice.');
    }
  };

  const handleToggleNoticePublish = async (notice: OfficialNoticeItem) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/api/admin/notices'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: notice.id,
          title: notice.title,
          category: notice.category,
          content: notice.content,
          targetBatch: notice.targetBatch,
          isPinned: notice.isPinned,
          isPublished: !notice.isPublished,
        }),
      });
      if (!res.ok) throw new Error('Failed to update notice status');
      showBanner(
        'success',
        `Notice "${notice.title}" ${!notice.isPublished ? 'published' : 'unpublished'}.`
      );
      fetchBloodAndNotices();
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to toggle notice.');
    }
  };

  const handleBulkCohortImport = async (count: number) => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/api/admin/bulk-cohort'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk cohort import failed');
      showBanner(
        'success',
        `Imported ${data.insertedCount} indexed alumni profiles across batches with verified stream/group constraints.`
      );
      fetchOverview();
      fetchDirectory(1);
    } catch (err: any) {
      showBanner('error', err?.message || 'Bulk cohort import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (profiles.length === 0) return;
    const headers = [
      'ID',
      'Full Name',
      'Batch',
      'Session',
      'Stream',
      'Group',
      'Verification',
      'Role',
      'Status',
      'Profession',
      'Institution',
      'City',
      'Blood Group',
    ];
    const rows = profiles.map((p) => [
      p.id,
      `"${(p.fullName || '').replace(/"/g, '""')}"`,
      p.batchYear,
      p.session || '',
      p.academicStream,
      p.academicGroup || '',
      p.verificationStatus,
      p.role,
      p.accountStatus,
      `"${(p.profession || '').replace(/"/g, '""')}"`,
      `"${(p.institution || '').replace(/"/g, '""')}"`,
      `"${(p.city || '').replace(/"/g, '""')}"`,
      p.bloodGroup || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ndc_alumni_cohort_page_${pagination.page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSqlBundle = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/api/admin/export-sql-bundle'), { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate SQL bundle');
      const blob = new Blob([data.bundleSql], { type: 'text/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'NDC_Alumni_100k_Complete_Production_Migrations.sql';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showBanner(
        'success',
        'Downloaded complete 4-in-1 Production SQL Migration Bundle (001 -> 004).'
      );
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to download SQL bundle.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFullBackup = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/api/admin/export-full-backup'), { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to export database backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ndc_alumni_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showBanner('success', 'Downloaded complete JSON database backup.');
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to download backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDhakaWebhostIndexHtml = () => {
    const bridgeHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <title>Notre Dame College Alumni Connect | ${CUSTOM_DOMAIN.replace('https://', '')}</title>
    <link rel="canonical" href="${CUSTOM_DOMAIN}/" />
    <meta name="description" content="Official Notre Dame College (NDC) Alumni Network Portal. Diligite Lumen Sapientiae. Connect with Notredamians worldwide." />
    <meta property="og:url" content="${CUSTOM_DOMAIN}/" />
    <meta property="og:title" content="Notre Dame College Alumni Connect" />
    <meta property="og:description" content="Official Notre Dame College (NDC) Alumni Network Portal. Global directory, batch explorer, verification desk, and emergency blood network." />
    <meta property="og:type" content="website" />
    <meta name="theme-color" content="#1e3a8a" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: #0b1120;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .portal-frame {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }
    </style>
  </head>
  <body>
    <iframe
      src="${PUBLISHED_AI_STUDIO_URL}"
      class="portal-frame"
      title="Notre Dame College Alumni Connect"
      allow="geolocation; clipboard-write; web-share"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
    const blob = new Blob([bridgeHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showBanner(
      'success',
      'Downloaded Ready-to-Upload index.html for Dhaka Web Host cPanel (upload to public_html/ndcbogura.alumniworld.xyz/).'
    );
  };

  const handleDownloadHtaccess = () => {
    const htaccessContent = `# ============================================================================
# Dhaka Web Host cPanel (.htaccess) for ${CUSTOM_DOMAIN}
# Connected to Published App: ${PUBLISHED_AI_STUDIO_URL}
# ============================================================================
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Force HTTPS on ndcbogura.alumniworld.xyz
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # Serve existing files and directories directly
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # SPA Fallback to index.html
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
`;
    const blob = new Blob([htaccessContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'htaccess.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showBanner(
      'success',
      'Downloaded cPanel .htaccess configuration (rename to .htaccess in Dhaka Web Host File Manager).'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 border border-blue-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>NDC Secretariat Governance &amp; 100k-Scale Directory Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Admin Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Centralized governance for Notre Dame College alumni profiles, ID card &amp; college
              roll verifications, official Academic Stream &amp; Group rules, and emergency blood
              coordination.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isAdminUser && !supabaseToken ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                    showBanner('success', 'Authenticated with Google OAuth Admin credentials.');
                  } catch (err: any) {
                    showBanner('error', err?.message || 'Google OAuth sign-in cancelled.');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-blue-50 font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Verify Admin via Google OAuth</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>OAuth Admin Session Active ({currentUser.email})</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleBulkCohortImport(50)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 border border-blue-400/30 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Batch Import +50 Alumni</span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchOverview();
                fetchDirectory(pagination.page);
                fetchVerifications();
                fetchBloodAndNotices();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="relative mt-6 pt-5 border-t border-white/10 flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'Executive Overview', icon: Layers },
            {
              id: 'directory',
              label: `Alumni Directory (${overview?.totalProfiles ?? pagination.total})`,
              icon: Users,
            },
            {
              id: 'verifications',
              label: `ID & Roll Verifications (${overview?.pendingDocReviews ?? 0})`,
              icon: FileCheck2,
            },
            {
              id: 'streams',
              label: 'Academic Streams & Groups',
              icon: GraduationCap,
            },
            {
              id: 'blood_notices',
              label: 'Blood Network & Official Notices',
              icon: HeartHandshake,
            },
            {
              id: 'domain_export',
              label: 'Domain, Hosting & Backups',
              icon: Download,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-blue-300'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: EXECUTIVE OVERVIEW ("AT A GLIMPSE")
         ===================================================================== */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Top 6 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Indexed Alumni
                </span>
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {(overview?.totalProfiles ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Partitioned &amp; B-Tree indexed for 100,000+ profile scale
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Verified Notredamians
                </span>
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {(overview?.verifiedProfiles ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview?.pendingProfiles ?? 0} profiles awaiting peer vouch or ID review
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending ID / Roll Reviews
                </span>
                <FileCheck2 className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {overview?.pendingDocReviews ?? 0}
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('verifications')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block cursor-pointer"
              >
                Open Verification Desk →
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registered Blood Donors
                </span>
                <HeartHandshake className="w-5 h-5 text-rose-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {(overview?.registeredDonors ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
                {overview?.activeBloodEmergencies ?? 0} active emergency blood requests
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Academic Stream Distribution
                </span>
                <GraduationCap className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="mt-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600 dark:text-slate-300">
                    Science (17 Groups Cap.)
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    {overview?.streamDistribution.Science ?? 0}
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600 dark:text-slate-300">
                    Humanities (G, H, L, W)
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    {overview?.streamDistribution.Humanities ?? 0}
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600 dark:text-slate-300">
                    Business Studies (A–F)
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    {overview?.streamDistribution['Business Studies'] ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  PII &amp; Privilege Protection
                </span>
                <Lock className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-2">
                Zero-Trust Active
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Phone, WhatsApp, Email &amp; College Roll masked by default.{' '}
                {overview?.suspendedProfiles ?? 0} suspended accounts.
              </p>
            </div>
          </div>

          {/* Recent Governance & Audit Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Recent Governance &amp; Verification Activity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Immutable administrative actions across verifications, roles, and emergency notices
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(overview?.recentAuditLogs || []).map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[10px] shrink-0 mt-0.5 ${
                        item.severity === 'warning' || item.severity === 'critical'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {item.action}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.summary}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Actor: {item.actorEmail} ({item.actorRole}) · Target: {item.targetType}#
                        {item.targetId}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: 100K ALUMNI DIRECTORY & GOVERNANCE MANAGER
         ===================================================================== */}
      {activeSection === 'directory' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                100k-Scale Alumni Directory &amp; Role Governance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server-side B-Tree indexed filtering with field-level PII protection
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRevealPii(!revealPii)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all ${
                  revealPii
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {revealPii ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{revealPii ? 'Mask Protected PII' : 'Reveal Protected PII & Rolls'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Page CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Multi-Column Indexed Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, roll, institution, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <input
              type="number"
              placeholder="Batch (e.g. 68)"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />

            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">All Academic Streams</option>
              <option value="Science">Science (17 Groups)</option>
              <option value="Humanities">Humanities (G, H, L, W)</option>
              <option value="Business Studies">Business Studies (A–F)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">All Verification States</option>
              <option value="verified">Verified Only</option>
              <option value="pending_vouch">Pending Vouch / ID</option>
              <option value="unverified">Unverified</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="moderator">Moderators</option>
              <option value="member">Members</option>
            </select>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Alumnus</th>
                  <th className="py-3 px-3">Batch &amp; Roll</th>
                  <th className="py-3 px-3">Stream &amp; Group</th>
                  <th className="py-3 px-3">Career &amp; City</th>
                  <th className="py-3 px-3">Protected Contact</th>
                  <th className="py-3 px-3">Verification</th>
                  <th className="py-3 px-3">Role &amp; Access</th>
                  <th className="py-3 px-4 text-right">Quick Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {profiles.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      p.accountStatus === 'suspended' ? 'opacity-60 bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.avatarUrl}
                          alt={p.fullName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => onViewProfile && onViewProfile(p.id)}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                          >
                            {p.fullName}
                          </button>
                          <div className="text-[10px] text-slate-400">
                            ID #{p.id} · Blood: {p.bloodGroup || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Batch {p.batchYear}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Roll: {p.collegeRoll || 'Unlisted'}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                        {p.academicStream}
                        {p.academicGroup ? ` · Grp ${p.academicGroup}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {p.position || p.profession || 'Notredamian'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {p.institution} · {p.city}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{p.phone || '—'}</span>
                        {p.phone && (
                          p.phoneOwnershipVerified ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                              title={`Phone verified by admin on ${p.phoneVerifiedAt ? new Date(p.phoneVerifiedAt).toLocaleDateString() : 'N/A'}`}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Phone Verified</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded"
                              title="Phone entered at registration. Requires admin ownership verification to activate Phone + Password login."
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Phone Pending</span>
                            </span>
                          )
                        )}
                      </div>
                      <div className="truncate max-w-[150px] text-slate-500">{p.email || '—'}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          p.verificationStatus === 'verified'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : p.verificationStatus === 'pending_vouch'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {p.verificationStatus === 'verified' ? 'Verified' : p.verificationStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={p.role}
                        onChange={(e) =>
                          handleProfileGovernanceUpdate(p.id, { role: e.target.value })
                        }
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                        {p.phone && !p.phoneOwnershipVerified && (
                          <button
                            type="button"
                            onClick={() => handleVerifyPhoneOwnership(p.id, p.fullName, p.phone)}
                            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Verify Phone Ownership for Phone + Password login"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Verify Phone</span>
                          </button>
                        )}

                        {p.phone && p.phoneOwnershipVerified && (
                          <button
                            type="button"
                            onClick={() => handleRevokePhoneOwnership(p.id, p.fullName, p.phone)}
                            className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-600 text-[10px] font-bold cursor-pointer"
                            title="Revoke Phone Ownership Verification"
                          >
                            Revoke Phone
                          </button>
                        )}

                        {p.verificationStatus !== 'verified' ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleProfileGovernanceUpdate(p.id, {
                                verificationStatus: 'verified',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Verify Alumnus"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Verify</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleProfileGovernanceUpdate(p.id, {
                                verificationStatus: 'pending_vouch',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 font-bold text-[11px] cursor-pointer"
                            title="Set Pending"
                          >
                            Revoke
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleProfileGovernanceUpdate(p.id, {
                              accountStatus:
                                p.accountStatus === 'suspended' ? 'active' : 'suspended',
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                            p.accountStatus === 'suspended'
                              ? 'bg-blue-600 text-white'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                          }`}
                        >
                          {p.accountStatus === 'suspended' ? 'Restore' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
            <div>
              Showing page <span className="font-bold text-slate-900 dark:text-white">{pagination.page}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{pagination.totalPages}</span> ({pagination.total.toLocaleString()} total profiles)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchDirectory(pagination.page - 1)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchDirectory(pagination.page + 1)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: VERIFICATION & ID CARD REVIEW DESK
         ===================================================================== */}
      {activeSection === 'verifications' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Identity Document &amp; College Roll Verification Queue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect submitted NDC ID Cards, NID + Roll Matches, and HSC Registration Slips
              </p>
            </div>

            <div className="flex items-center gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setVerifFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                    verifFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={sub.avatarUrl}
                        alt={sub.fullName}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-black text-sm text-slate-900 dark:text-white">
                          {sub.fullName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Batch {sub.batchYear} · Roll:{' '}
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {sub.collegeRoll}
                          </span>{' '}
                          · {sub.academicStream}
                          {sub.academicGroup ? ` (${sub.academicGroup})` : ''}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        sub.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : sub.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 h-44 relative">
                    <img
                      src={sub.documentUrl}
                      alt={sub.docTypeLabel}
                      className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-bold">
                      {sub.docTypeLabel} ({sub.submissionCode})
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Add admin verification note (optional)..."
                    value={reviewNotes[sub.id] ?? sub.adminNote ?? ''}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Peer Vouches: {sub.vouchesCount}/{sub.targetVouches}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReviewSubmission(sub.id, 'approved')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve &amp; Verify</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: ACADEMIC STREAM & GROUP REGISTRY
         ===================================================================== */}
      {activeSection === 'streams' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Official Academic Stream &amp; Group Configuration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enforces strict stream-group validation across registration and profile updates.
              Science maintains 17 expected groups without fabricated group codes; Humanities
              enforces G, H, L, W; Business Studies enforces A, B, C, D, E, F.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(overview?.streamGroupsConfig || []).map((sg) => (
              <div
                key={sg.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    {sg.stream}{' '}
                    {sg.groupCode ? (
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white ml-1">
                        Group {sg.groupCode}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 ml-1">
                        17 Groups Capacity Metadata
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Expected Stream Groups: {sg.expectedGroupCount}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStreamGroup(sg.id, sg.isActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    sg.isActive
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {sg.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: BLOOD NETWORK & OFFICIAL NOTICES DESK
         ===================================================================== */}
      {activeSection === 'blood_notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blood Emergency Moderation */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-500" />
                <span>Emergency Blood Request Moderation</span>
              </h2>
              <p className="text-xs text-slate-500">
                Verify hospital requisitions and update fulfillment status
              </p>
            </div>

            <div className="space-y-3">
              {bloodRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs">
                        {req.bloodGroup}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {req.hospitalName} ({req.hospitalArea})
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {req.requestCode} · Requester: {req.requesterName} (Batch{' '}
                          {req.requesterBatch})
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold text-[10px]">
                      {req.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">{req.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] text-slate-500">
                      Units: {req.unitsFulfilled}/{req.unitsRequired} · Needed:{' '}
                      {req.requiredDateTime}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleModerateBloodRequest(req.id, 'Active')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Verify Active
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleModerateBloodRequest(req.id, 'Fulfilled', req.unitsRequired)
                        }
                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Mark Fulfilled
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerateBloodRequest(req.id, 'Cancelled')}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Notices Publisher */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                <span>Official Secretariat Notices</span>
              </h2>
              <p className="text-xs text-slate-500">
                Broadcast verified institutional announcements to all or specific batches
              </p>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3">
              <input
                type="text"
                placeholder="Official Notice Title..."
                value={newNoticeTitle}
                onChange={(e) => setNewNoticeTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={newNoticeCategory}
                  onChange={(e) => setNewNoticeCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                >
                  <option value="Security">Security &amp; Governance</option>
                  <option value="Verification">Verification Policy</option>
                  <option value="Reunion">Grand Reunion</option>
                  <option value="Emergency">Emergency Broadcast</option>
                  <option value="General">General Announcement</option>
                </select>
                <input
                  type="number"
                  placeholder="Target Batch (optional)"
                  value={newNoticeBatch}
                  onChange={(e) => setNewNoticeBatch(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Write official notice content..."
                value={newNoticeContent}
                onChange={(e) => setNewNoticeContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newNoticePinned}
                      onChange={(e) => setNewNoticePinned(e.target.checked)}
                    />
                    <span>Pin to Top</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newNoticePublished}
                      onChange={(e) => setNewNoticePublished(e.target.checked)}
                    />
                    <span>Publish Immediately</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                >
                  Broadcast Notice
                </button>
              </div>
            </form>

            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              {notices.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300">
                        {n.category}
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {n.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{n.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNoticePublish(n)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                      n.isPublished
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    {n.isPublished ? 'Published' : 'Draft'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: DOMAIN, HOSTING & ONE-CLICK BACKUP / SQL EXPORT WIZARD
         ===================================================================== */}
      {activeSection === 'domain_export' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: One-Click Database & Migration Exports */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                <Download className="w-3.5 h-3.5" />
                <span>One-Click Production Exports</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Download Complete SQL Bundle &amp; Live Data Backup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Download all 4 security-audited migrations combined into a single runnable file for
                Supabase / PostgreSQL, or export a full snapshot of your live alumni database.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadSqlBundle}
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-md cursor-pointer transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <Download className="w-4 h-4" />
                    <span>Download 4-in-1 Production SQL Bundle (.sql)</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                    001 → 004
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFullBackup}
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Download Full Alumni Database Backup (.json)</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md">
                    Snapshot
                  </span>
                </button>
              </div>
            </div>

            {/* Card 2: Connecting Your Custom Domain & Hosting (Dhaka Web Host) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Live Published Bridge: ndcbogura.alumniworld.xyz ↔ ndc-alumni-2026.ai.studio</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Dhaka Web Host cPanel 2-Minute Setup
              </h2>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                  <div className="font-black text-slate-900 dark:text-white">
                    1. Live Published URL &amp; Custom Domain Pre-Linked
                  </div>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Your published app at{' '}
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {PUBLISHED_AI_STUDIO_URL}
                    </span>{' '}
                    and custom domain{' '}
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {CUSTOM_DOMAIN}
                    </span>{' '}
                    are whitelisted in CORS and linked to your Cloud SQL (`asia-southeast1`)
                    backend ({CLOUD_RUN_BACKEND_URL}).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                  <div className="font-black text-slate-900 dark:text-white">
                    2. Easiest Way in Dhaka Web Host cPanel (Upload 2 Files)
                  </div>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Log in to your Dhaka Web Host cPanel → open{' '}
                    <span className="font-bold">File Manager</span> → open the folder for{' '}
                    <span className="font-mono font-bold">ndcbogura.alumniworld.xyz</span> → upload
                    the <span className="font-mono font-bold">index.html</span> and{' '}
                    <span className="font-mono font-bold">.htaccess</span> files below. Or use{' '}
                    <span className="font-bold">cPanel → Domains → Redirects</span> to forward{' '}
                    <span className="font-mono">ndcbogura.alumniworld.xyz</span> to{' '}
                    <span className="font-mono">{PUBLISHED_AI_STUDIO_URL}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadDhakaWebhostIndexHtml}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>1. Download cPanel index.html</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadHtaccess}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>2. Download cPanel .htaccess</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
