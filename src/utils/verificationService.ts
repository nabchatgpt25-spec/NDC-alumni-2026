import {
  VouchRequest,
  VouchItem,
  AlumniProfile,
  AdminDocSubmission,
  VerificationDocType,
} from '../types';
import {
  ALUMNI_PROFILES,
  DEFAULT_BLANK_USER,
  loadStoredAlumniProfiles,
  saveStoredAlumniProfiles,
} from '../data/mockData';
import {
  submitPeerVouchInDb,
  createVerificationRequestInDb,
  submitAdminDocSubmissionInDb,
  fetchUserActiveVerificationRequestFromDb,
} from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import { normalizeAcademicStreamAndGroup } from './academicGroupMapping';
import { sendSocialNotification } from './notificationService';

export const VOUCH_STORAGE_KEY = 'ndc_vouch_requests';
export const ADMIN_DOCS_STORAGE_KEY = 'ndc_admin_doc_submissions';

export const DOC_TYPE_LABELS: Record<VerificationDocType, string> = {
  id_card: 'Notre Dame College ID Card',
  nid_card: 'National ID Card (NID) + Roll Match',
  hsc_slip: 'HSC Admit / Registration Card',
  souvenir: 'Batch Souvenir / Yearbook Photo',
};

/**
 * Helper to ensure batch year is a valid 4-digit HSC Year (1949-2100).
 */
export const normalizeToBatchNumber = (batchOrYear?: number | null): number => {
  if (!batchOrYear || batchOrYear < 1949) return 0;
  return batchOrYear;
};

export const formatBatchDisplay = (batchOrYear?: number | null): string => {
  if (!batchOrYear || batchOrYear < 1949) return 'N/A';
  return `HSC ${batchOrYear}`;
};

export const isSameBatch = (batchA?: number, batchB?: number): boolean => {
  if (!batchA || !batchB || batchA < 1949 || batchB < 1949) return false;
  return batchA === batchB;
};

/**
 * Generate deep share link for requesting vouches or admin verification
 */
export const getVouchShareLink = (user: AlumniProfile): string => {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://ndcbogura.alumniworld.xyz/';
  const safeName = (user.fullName || 'Notredamian Alumnus').trim();
  const safeRoll = (user.collegeRoll || '').trim();
  const safeBatch = user.batchYear && user.batchYear >= 1949 ? user.batchYear : 'N/A';
  const safeId = user.id || 1001;
  return `${origin}?vouch_for=${safeId}&roll=${encodeURIComponent(safeRoll)}&batch=${safeBatch}&name=${encodeURIComponent(safeName)}`;
};

/**
 * Generate WhatsApp share intent message
 */
export const getWhatsAppVouchShareUrl = (user: AlumniProfile): string => {
  const link = getVouchShareLink(user);
  const batchLabel = user.batchYear && user.batchYear >= 1949 ? `HSC ${user.batchYear}` : 'HSC Year: N/A';
  const text = `Assalamu Alaikum / Brother! I have registered my Notre Dame College Alumni profile (${user.fullName || 'Notredamian'}, Roll: ${user.collegeRoll || 'NDC'}, ${batchLabel}). Please click this link to vouch for me or verify my profile: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

/**
 * Global check: Verifies whether a specific alumnus is already verified across
 * memory records, stored directory, or active session.
 */
export const isAlumnusAlreadyVerified = (userId: number): boolean => {
  if (!userId) return false;
  // 1. Check in-memory ALUMNI_PROFILES
  const mem = ALUMNI_PROFILES.find((p) => p.id === userId || p.userId === userId);
  if (mem && mem.verificationStatus === 'verified') return true;

  // 2. Check localStorage stores
  if (typeof window !== 'undefined') {
    try {
      const stored = loadStoredAlumniProfiles();
      const p = stored.find((sp) => sp.id === userId || sp.userId === userId);
      if (p && p.verificationStatus === 'verified') return true;

      const rawCurrent = localStorage.getItem('ndc_alumni_current_user');
      if (rawCurrent) {
        const cur = JSON.parse(rawCurrent);
        if ((cur?.id === userId || cur?.userId === userId) && cur?.verificationStatus === 'verified') {
          return true;
        }
      }
    } catch {}
  }
  return false;
};

/**
 * Global queue cleanup: Once an alumnus is verified by ANY admin, automatically
 * resolve and remove all their pending requests from every administrator queue.
 */
export const cleanupVerifiedAlumniFromPendingQueues = (
  userId: number,
  reviewerName: string = 'Administrator',
  reason: string = 'Automatically resolved: Alumnus identity verified'
) => {
  if (typeof window === 'undefined' || !userId) return;

  try {
    // 1. Auto-resolve any pending document submissions for this user
    const docSubs = loadAdminDocSubmissions();
    let docsChanged = false;
    const updatedDocs = docSubs.map((sub) => {
      if (sub.userId === userId && sub.status === 'pending') {
        docsChanged = true;
        return {
          ...sub,
          status: 'approved' as const,
          reviewedBy: reviewerName,
          reviewedAt: 'Just now',
          adminNote: sub.adminNote || reason,
        };
      }
      return sub;
    });

    if (docsChanged) {
      localStorage.setItem(ADMIN_DOCS_STORAGE_KEY, JSON.stringify(updatedDocs));
      window.dispatchEvent(new CustomEvent('ndc_admin_docs_updated'));
    }

    // 2. Auto-resolve any pending peer vouch requests for this user
    const vouchReqs = loadVouchRequests();
    let reqsChanged = false;
    const updatedReqs = vouchReqs.map((req) => {
      if (req.requesterId === userId && req.status === 'pending') {
        reqsChanged = true;
        return {
          ...req,
          status: 'verified' as const,
          adminNote: req.adminNote || reason,
        };
      }
      return req;
    });

    if (reqsChanged) {
      localStorage.setItem(VOUCH_STORAGE_KEY, JSON.stringify(updatedReqs));
      window.dispatchEvent(new CustomEvent('ndc_vouch_requests_updated'));
    }

    // 3. Broadcast global synchronization event to all admin views & tabs
    window.dispatchEvent(
      new CustomEvent('ndc_alumni_verified_globally', {
        detail: { userId, reviewerName },
      })
    );
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('cleanupVerifiedAlumniFromPendingQueues error:', err);
  }
};

export const loadVouchRequests = (): VouchRequest[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VOUCH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter(
            (r: VouchRequest) =>
              r &&
              r.id &&
              !r.id.startsWith('demo-')
          )
          .map((r: VouchRequest) => {
            // Global check: if requester is already verified by any admin, auto-resolve pending state
            if (r.status === 'pending' && isAlumnusAlreadyVerified(r.requesterId)) {
              return {
                ...r,
                status: 'verified' as const,
                adminNote: r.adminNote || 'Auto-resolved: Alumnus identity verified',
              };
            }
            return r;
          });
      }
    }
  } catch (e) {
    console.warn('Failed to load vouch requests from storage', e);
  }
  return [];
};

export const saveVouchRequests = (requests: VouchRequest[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOUCH_STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('ndc_vouch_requests_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Failed to save vouch requests to storage', e);
  }
};

export const loadAdminDocSubmissions = (): AdminDocSubmission[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMIN_DOCS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter(
            (d: AdminDocSubmission) =>
              d &&
              d.id &&
              !d.id.startsWith('demo-')
          )
          .map((d: AdminDocSubmission) => {
            // Global check: if applicant is already verified by any admin, auto-resolve pending state
            if (d.status === 'pending' && isAlumnusAlreadyVerified(d.userId)) {
              return {
                ...d,
                status: 'approved' as const,
                adminNote: d.adminNote || 'Auto-resolved: Alumnus identity verified',
              };
            }
            return d;
          });
      }
    }
  } catch (e) {
    console.warn('Failed to load admin document submissions', e);
  }
  return [];
};

export const saveAdminDocSubmissions = (submissions: AdminDocSubmission[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_DOCS_STORAGE_KEY, JSON.stringify(submissions));
    window.dispatchEvent(new CustomEvent('ndc_admin_docs_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Failed to save admin document submissions', e);
  }
};

/**
 * Helper to sync verification status changes across all localStorage stores
 */
export const syncProfileVerificationInStorage = (
  userId: number,
  updates: Partial<AlumniProfile>
) => {
  if (typeof window === 'undefined') return;
  try {
    // 1. Update in-memory ALUMNI_PROFILES and stored directory
    const storedProfiles = loadStoredAlumniProfiles();
    const updatedStored = storedProfiles.map((p) =>
      p.id === userId || p.userId === userId ? { ...p, ...updates } : p
    );
    saveStoredAlumniProfiles(updatedStored);

    const memIdx = ALUMNI_PROFILES.findIndex(
      (p) => p.id === userId || p.userId === userId
    );
    if (memIdx >= 0) {
      ALUMNI_PROFILES[memIdx] = { ...ALUMNI_PROFILES[memIdx], ...updates };
    }

    // 2. Update registered accounts list
    const rawAccounts = localStorage.getItem('ndc_registered_accounts');
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts);
      if (Array.isArray(accounts)) {
        const updatedAccounts = accounts.map((acc: any) =>
          acc.profile && (acc.profile.id === userId || acc.profile.userId === userId)
            ? { ...acc, profile: { ...acc.profile, ...updates } }
            : acc
        );
        localStorage.setItem('ndc_registered_accounts', JSON.stringify(updatedAccounts));
      }
    }

    // 3. If this matches the currently logged in user in localStorage, update it and dispatch event
    const rawCurrent = localStorage.getItem('ndc_alumni_current_user');
    if (rawCurrent) {
      const parsedCurrent = JSON.parse(rawCurrent);
      if (parsedCurrent && (parsedCurrent.id === userId || parsedCurrent.userId === userId)) {
        const merged = { ...parsedCurrent, ...updates };
        localStorage.setItem('ndc_alumni_current_user', JSON.stringify(merged));
        window.dispatchEvent(
          new CustomEvent('ndc_current_user_updated', { detail: merged })
        );
      }
    }
  } catch (e) {
    console.warn('Error syncing profile verification in storage', e);
  }
};

/**
 * Submit an NID / College ID / HSC Admit Card / Souvenir photo to the Admin Review Queue
 */
export const submitDocumentForAdminReview = async (
  user: AlumniProfile,
  docType: VerificationDocType,
  documentUrl: string
): Promise<AdminDocSubmission> => {
  const submissions = loadAdminDocSubmissions();
  const existingIdx = submissions.findIndex((s) => s.userId === user.id);

  const cleanBatch = user.batchYear && user.batchYear >= 1949 ? user.batchYear : 0;
  const streamInfo = normalizeAcademicStreamAndGroup(
    (user.academicStream as string) || (user.group as string) || 'Science'
  );

  let dbSubmissionId: string | null = null;
  if (isSupabaseConfigured) {
    try {
      dbSubmissionId = await submitAdminDocSubmissionInDb({
        userId: user.id,
        batchYear: cleanBatch,
        collegeRoll: user.collegeRoll || '118042',
        academicStream: streamInfo.academicStream,
        academicGroup: user.academicGroup || streamInfo.academicGroup || null,
        docType,
        docTypeLabel: DOC_TYPE_LABELS[docType] || 'Identity Document',
        storageObjectPath: documentUrl,
      });
    } catch (err) {
      console.warn('submitAdminDocSubmissionInDb fallback:', err);
    }
  }

  const submission: AdminDocSubmission = {
    id: dbSubmissionId || (existingIdx >= 0 ? submissions[existingIdx].id : `doc-sub-${Date.now()}`),
    userId: user.id,
    fullName: user.fullName || 'Notredamian Alumnus',
    avatarUrl: user.avatarUrl || '/ndc-logo.png',
    batchYear: cleanBatch,
    collegeRoll: user.collegeRoll || '118042',
    group: user.group || 'Science',
    phone: user.phone || user.whatsapp,
    email: user.email,
    docType,
    docTypeLabel: DOC_TYPE_LABELS[docType] || 'Identity Document',
    documentUrl,
    submittedAt: 'Just now',
    status: 'pending',
    vouchLink: getVouchShareLink(user),
  };

  if (existingIdx >= 0) {
    submissions[existingIdx] = submission;
  } else {
    submissions.unshift(submission);
  }
  saveAdminDocSubmissions(submissions);

  syncProfileVerificationInStorage(user.id, {
    idSubmissionStatus: 'pending',
    adminReviewNote: undefined,
  });

  return submission;
};

/**
 * Admin Action: Approve or Reject an uploaded NID / ID Card document submission
 */
export const adminReviewDocumentSubmission = (
  submissionId: string,
  decision: 'approved' | 'rejected',
  adminName: string,
  adminNote?: string
): { submission: AdminDocSubmission; updatedProfilePartial: Partial<AlumniProfile> } => {
  const submissions = loadAdminDocSubmissions();
  const idx = submissions.findIndex((s) => s.id === submissionId);
  if (idx === -1) {
    throw new Error('Document submission not found');
  }

  const sub = submissions[idx];
  const updatedSub: AdminDocSubmission = {
    ...sub,
    status: decision,
    reviewedBy: adminName || 'Admin Moderator',
    reviewedAt: 'Just now',
    adminNote:
      adminNote ||
      (decision === 'approved'
        ? `Verified by Admin (${adminName}) via ${sub.docTypeLabel}`
        : 'Document unclear or incomplete. Please upload a clearer photo of your NID / College ID.'),
  };

  submissions[idx] = updatedSub;
  saveAdminDocSubmissions(submissions);

  // Also update matching VouchRequest
  const requests = loadVouchRequests();
  const reqIdx = requests.findIndex(
    (r) =>
      r.requesterId === sub.userId ||
      r.requesterName.toLowerCase() === sub.fullName.toLowerCase()
  );
  if (reqIdx >= 0) {
    requests[reqIdx] = {
      ...requests[reqIdx],
      status: decision === 'approved' ? 'verified' : 'declined',
      adminNote: updatedSub.adminNote,
    };
    saveVouchRequests(requests);
  }

  const updatedProfilePartial: Partial<AlumniProfile> =
    decision === 'approved'
      ? {
          verificationStatus: 'verified',
          verificationMethod: 'id_card_upload',
          idSubmissionStatus: 'approved',
          verificationDate: 'Today',
          verifiedBy: [`Admin Verified (${adminName})`],
          vouchesCount: 2,
          adminReviewNote: updatedSub.adminNote,
        }
      : {
          verificationStatus: 'unverified',
          idSubmissionStatus: 'rejected',
          adminReviewNote: updatedSub.adminNote,
        };

  syncProfileVerificationInStorage(sub.userId, updatedProfilePartial);

  if (decision === 'approved') {
    cleanupVerifiedAlumniFromPendingQueues(sub.userId, adminName, updatedSub.adminNote);
  }

  // Send Facebook-style notification to the alumnus
  sendSocialNotification({
    recipientId: sub.userId,
    actor: {
      id: 999999,
      userId: 999999,
      fullName: `Admin (${adminName})`,
      avatarUrl: '/ndc-logo.png',
      profession: 'College Administration',
      position: 'Portal Admin',
      institution: 'Notre Dame College',
      city: 'Dhaka',
      country: 'Bangladesh',
      isPublic: true,
      online: true,
      specialty: ['Administration'],
      degree: ['HSC'],
    },
    type: 'verification',
    title:
      decision === 'approved'
        ? '✅ Identity Verified by Administration!'
        : '⚠️ Verification Document Update',
    message:
      decision === 'approved'
        ? 'Your document credentials have been approved. Your profile now carries the Verified badge.'
        : `Document review notice: ${updatedSub.adminNote}`,
    targetRoute: 'profile',
  }).catch(() => {});

  return { submission: updatedSub, updatedProfilePartial };
};

/**
 * Admin Action: Directly approve any VouchRequest
 */
export const adminApproveVouchRequest = (
  requestId: string,
  adminName: string
): VouchRequest => {
  const requests = loadVouchRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) {
    throw new Error('Vouch request not found');
  }

  const req = requests[idx];
  const updatedReq: VouchRequest = {
    ...req,
    status: 'verified',
    adminNote: `Directly approved by Administrator (${adminName})`,
  };

  requests[idx] = updatedReq;
  saveVouchRequests(requests);

  syncProfileVerificationInStorage(req.requesterId, {
    verificationStatus: 'verified',
    verificationMethod: 'admin_verified',
    verificationDate: 'Today',
    verifiedBy: [`Admin Verified (${adminName})`],
    vouchesCount: 2,
  });

  cleanupVerifiedAlumniFromPendingQueues(
    req.requesterId,
    adminName,
    updatedReq.adminNote || `Directly approved by Administrator (${adminName})`
  );

  return updatedReq;
};

/**
 * Add or update a user's own vouch request
 */
export const registerUserVouchRequest = async (
  user: AlumniProfile,
  customNote?: string
): Promise<VouchRequest> => {
  const cleanBatch = user.batchYear && user.batchYear >= 1949 ? user.batchYear : 0;

  // 1. Create or retrieve real UUID from Supabase verification_requests table
  let dbRequestId: string | null = null;
  try {
    dbRequestId = await createVerificationRequestInDb({
      requesterId: user.id,
      batchYear: cleanBatch,
      collegeRoll: user.collegeRoll || '118042',
      academicStream: (user.academicStream as string) || (user.group as string) || 'Science',
      academicGroup: user.academicGroup || null,
      section: user.section || null,
      message: customNote || null,
      targetVouches: 2,
    });
  } catch (err) {
    console.warn('createVerificationRequestInDb fallback:', err);
  }

  const activeId = dbRequestId || `vouch-req-${user.id}`;
  const requests = loadVouchRequests();
  const existingIndex = requests.findIndex((r) => r.requesterId === user.id);

  if (existingIndex > -1) {
    if (dbRequestId) requests[existingIndex].id = dbRequestId;
    if (user.idProofUrl) requests[existingIndex].idProofUrl = user.idProofUrl;
    if (customNote) requests[existingIndex].message = customNote;
    saveVouchRequests(requests);
    return requests[existingIndex];
  }

  const newRequest: VouchRequest = {
    id: activeId,
    requesterId: user.id,
    requesterName: user.fullName || 'Notredamian Alumnus',
    requesterAvatar: user.avatarUrl || '/ndc-logo.png',
    batchYear: cleanBatch,
    collegeRoll: user.collegeRoll || '118042',
    group: (user.group as 'Science' | 'Business Studies' | 'Humanities') || 'Science',
    section: user.section || 'General Section',
    profession: user.position || user.profession,
    city: user.city || 'Dhaka',
    createdAt: 'Just now',
    status: user.verificationStatus === 'verified' ? 'verified' : 'pending',
    targetVouches: 2,
    idProofUrl: user.idProofUrl,
    idDocType: user.idDocType,
    vouches: [],
    message:
      customNote ||
      (user.batchYear && user.batchYear >= 1949
        ? `HSC ${user.batchYear} brother. Please vouch for my profile so I can participate in our batch lounge.`
        : 'Notre Dame College brother. Please vouch for my profile so I can participate in our batch lounge.'),
  };

  requests.unshift(newRequest);
  saveVouchRequests(requests);

  return newRequest;
};

/**
 * Submit a peer vouch from a logged-in user to a requesting brother
 * Enforces server verification, self-vouch prevention, duplicate prevention, and real DB record insertion.
 */
export const submitPeerVouch = async (
  requestId: string,
  voucher: AlumniProfile,
  comment: string
): Promise<{ success: boolean; isNowVerified: boolean; request: VouchRequest }> => {
  if (!voucher || !voucher.id) {
    throw new Error('You must be signed in to vouch for a classmate.');
  }

  // 1. Voucher eligibility check: only verified alumni may vouch
  if (voucher.verificationStatus !== 'verified') {
    throw new Error('Only verified alumni can vouch for a classmate. Please complete your own verification first.');
  }

  const requests = loadVouchRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);

  if (reqIndex === -1) {
    throw new Error('Verification request not found.');
  }

  const req = requests[reqIndex];

  // 2. Self-vouch prevention
  if (voucher.id === req.requesterId) {
    throw new Error('You cannot vouch for your own profile. Share your link with classmates!');
  }

  // 3. Duplicate vouch prevention
  const alreadyVouched = req.vouches.some(
    (v) => v.voucherId === voucher.id || v.voucherName === voucher.fullName
  );
  if (alreadyVouched) {
    throw new Error('You have already vouched for this brother!');
  }

  // 4. Persist peer vouch directly to Supabase peer_vouches table if connected
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let activeRequestId = req.id;

  if (isSupabaseConfigured) {
    if (!uuidRegex.test(activeRequestId)) {
      try {
        const existingDbReq = await fetchUserActiveVerificationRequestFromDb(req.requesterId);
        if (existingDbReq?.id && uuidRegex.test(existingDbReq.id)) {
          activeRequestId = existingDbReq.id;
          req.id = activeRequestId;
        } else {
          const newDbId = await createVerificationRequestInDb({
            requesterId: req.requesterId,
            batchYear: req.batchYear,
            collegeRoll: req.collegeRoll,
            academicStream: req.group,
            section: req.section,
            message: req.message,
          });
          if (newDbId && uuidRegex.test(newDbId)) {
            activeRequestId = newDbId;
            req.id = activeRequestId;
          }
        }
      } catch (err) {
        console.warn('Could not resolve or create DB verification request:', err);
      }
    }

    if (uuidRegex.test(activeRequestId)) {
      try {
        const dbResult = await submitPeerVouchInDb({
          verificationRequestId: activeRequestId,
          requesterId: req.requesterId,
          voucherId: voucher.id,
          voucherBatch: voucher.batchYear,
          comment,
        });

        if (!dbResult.success) {
          if (dbResult.error?.toLowerCase().includes('already vouched') || dbResult.error?.toLowerCase().includes('duplicate')) {
            throw new Error('You have already vouched for this brother!');
          }
          console.warn('DB peer vouch insertion warning:', dbResult.error);
        }
      } catch (err: any) {
        if (err.message?.includes('already vouched')) {
          throw err;
        }
        console.warn('submitPeerVouch database sync exception:', err);
      }
    }
  }

  const newVouchItem: VouchItem = {
    id: `vouch-${Date.now()}`,
    voucherId: voucher.id,
    voucherName: voucher.fullName || 'Verified Batchmate',
    voucherAvatar: voucher.avatarUrl,
    voucherBatch: voucher.batchYear,
    date: 'Just now',
    comment: comment || `I confirm this brother attended Notre Dame College with us.`,
  };

  req.vouches.push(newVouchItem);
  const isNowVerified = req.vouches.length >= req.targetVouches;
  if (isNowVerified) {
    req.status = 'verified';
  }

  requests[reqIndex] = req;
  saveVouchRequests(requests);

  syncProfileVerificationInStorage(req.requesterId, {
    vouchesCount: req.vouches.length,
    verifiedBy: req.vouches.map((v) => `${v.voucherName} (Batch ${v.voucherBatch})`),
    ...(isNowVerified
      ? {
          verificationStatus: 'verified',
          verificationMethod: 'two_vouches',
          verificationDate: 'Today',
        }
      : {}),
  });

  if (isNowVerified) {
    cleanupVerifiedAlumniFromPendingQueues(
      req.requesterId,
      voucher.fullName,
      `Completed 2/2 classmate vouches`
    );
  }

  // Notify the requesting alumnus in their notification bar
  sendSocialNotification({
    recipientId: req.requesterId,
    actor: voucher,
    type: 'verification',
    title: isNowVerified
      ? '🎉 Congratulations! Your profile is officially Verified!'
      : `${voucher.fullName} vouched for your profile!`,
    message: isNowVerified
      ? `${voucher.fullName} completed your 2nd vouch. Your Verified Notredamian badge is now active!`
      : `${voucher.fullName} confirmed your identity (${req.vouches.length}/2 vouches needed).`,
    targetRoute: 'profile',
  }).catch(() => {});

  return { success: true, isNowVerified, request: req };
};

/**
 * Ensure an incoming shared vouch link (?vouch_for=...) resolves to an actual database request
 */
export const ensureVouchRequestFromUrlParams = async (params?: {
  id?: number;
  name?: string;
  roll?: string;
  batch?: number;
}): Promise<VouchRequest | null> => {
  let resolvedId = params?.id;
  if (!resolvedId && typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const vouchFor = searchParams.get('vouch_for');
    if (vouchFor) resolvedId = Number(vouchFor);
  }

  if (!resolvedId) return null;

  // 1. Resolve active verification request from Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const dbReq = await fetchUserActiveVerificationRequestFromDb(resolvedId);
      if (dbReq) {
        const requests = loadVouchRequests();
        const idx = requests.findIndex((r) => r.id === dbReq.id || r.requesterId === dbReq.requesterId);
        if (idx >= 0) {
          requests[idx] = dbReq;
        } else {
          requests.unshift(dbReq);
        }
        saveVouchRequests(requests);
        return dbReq;
      }
    } catch (e) {
      console.warn('fetchUserActiveVerificationRequestFromDb fallback:', e);
    }
  }

  // 2. Check local requests store
  const localRequests = loadVouchRequests();
  const existingLocal = localRequests.find((r) => r.requesterId === resolvedId);
  if (existingLocal) {
    return existingLocal;
  }

  // 3. Fallback: resolve from stored alumni profiles or reconstruct from URL parameters
  const storedProfiles = loadStoredAlumniProfiles();
  const matchedProfile = storedProfiles.find((p) => p.id === resolvedId || p.userId === resolvedId);

  if (matchedProfile) {
    return await registerUserVouchRequest(matchedProfile);
  }

  // 4. Reconstruct from URL search params if provided
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const nameParam = searchParams?.get('name') || params?.name;
  const rollParam = searchParams?.get('roll') || params?.roll;
  const batchParam = searchParams?.get('batch') ? Number(searchParams.get('batch')) : params?.batch;

  if (nameParam) {
    const tempProfile: AlumniProfile = {
      ...DEFAULT_BLANK_USER,
      id: resolvedId,
      userId: resolvedId,
      fullName: decodeURIComponent(nameParam),
      avatarUrl: '/ndc-logo.png',
      collegeRoll: rollParam ? decodeURIComponent(rollParam) : 'NDC',
      batchYear: batchParam && batchParam >= 1949 ? batchParam : 2018,
      group: 'Science',
      verificationStatus: 'unverified',
      profession: 'Notredamian Alumnus',
      isPublic: true,
    };
    return await registerUserVouchRequest(tempProfile);
  }

  return null;
};

/**
 * Directly vouch for an AlumniProfile from their ProfileView or Directory card
 */
export const vouchForAlumniProfile = async (
  targetProfile: AlumniProfile,
  voucher: AlumniProfile,
  comment?: string
): Promise<{
  success: boolean;
  message: string;
  updatedProfile: AlumniProfile;
  updatedTarget: AlumniProfile;
  isNowVerified: boolean;
}> => {
  try {
    if (!voucher || !voucher.id) {
      throw new Error('Please sign in to vouch for this classmate.');
    }
    if (voucher.verificationStatus !== 'verified') {
      throw new Error('Only verified alumni can vouch for a classmate. Please complete your own verification first.');
    }
    if (voucher.id === targetProfile.id) {
      throw new Error('You cannot vouch for your own profile.');
    }

    const requests = loadVouchRequests();
    let req = requests.find((r) => r.requesterId === targetProfile.id);

    if (!req) {
      req = await registerUserVouchRequest(targetProfile);
    }

    const res = await submitPeerVouch(
      req.id,
      voucher,
      comment ||
        (targetProfile.batchYear && targetProfile.batchYear >= 1949
          ? `Confirmed classmate from HSC ${targetProfile.batchYear}.`
          : 'Confirmed Notre Dame College classmate.')
    );

    const vouchesList = res.request.vouches.map(
      (v) =>
        `${v.voucherName} (${v.voucherBatch && v.voucherBatch >= 1949 ? `HSC ${v.voucherBatch}` : 'HSC N/A'})`
    );
    const updatedProfile: AlumniProfile = {
      ...targetProfile,
      vouchesCount: res.request.vouches.length,
      vouchTargetCount: res.request.targetVouches,
      verifiedBy: vouchesList,
      verificationStatus: res.isNowVerified ? 'verified' : 'pending_vouch',
      verificationMethod: 'two_vouches',
      verificationDate: res.isNowVerified ? 'Today' : targetProfile.verificationDate,
      badges:
        res.isNowVerified && !targetProfile.badges?.includes('Verified Notredamian')
          ? [...(targetProfile.badges || []), 'Verified Notredamian']
          : targetProfile.badges,
    };

    if (res.isNowVerified) {
      cleanupVerifiedAlumniFromPendingQueues(
        targetProfile.id,
        voucher.fullName,
        'Completed 2/2 classmate vouches'
      );
    }

    const message = res.isNowVerified
      ? `You vouched for ${targetProfile.fullName}! They now have 2/2 vouches and are officially Verified!`
      : `You vouched for ${targetProfile.fullName} (${res.request.vouches.length}/2 vouches)!`;

    return {
      success: true,
      message,
      updatedProfile,
      updatedTarget: updatedProfile,
      isNowVerified: res.isNowVerified,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'You have already vouched for this classmate.',
      updatedProfile: targetProfile,
      updatedTarget: targetProfile,
      isNowVerified: targetProfile.verificationStatus === 'verified',
    };
  }
};

