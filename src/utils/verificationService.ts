import {
  VouchRequest,
  VouchItem,
  AlumniProfile,
  AdminDocSubmission,
  VerificationDocType,
} from '../types';
import {
  ALUMNI_PROFILES,
  loadStoredAlumniProfiles,
  saveStoredAlumniProfiles,
} from '../data/mockData';
import {
  submitPeerVouchInDb,
  createVerificationRequestInDb,
  submitAdminDocSubmissionInDb,
  fetchUserActiveVerificationRequestFromDb,
} from '../services/supabaseService';

export const VOUCH_STORAGE_KEY = 'ndc_vouch_requests';
export const ADMIN_DOCS_STORAGE_KEY = 'ndc_admin_doc_submissions';

export const DOC_TYPE_LABELS: Record<VerificationDocType, string> = {
  id_card: 'Notre Dame College ID Card',
  nid_card: 'National ID Card (NID) + Roll Match',
  hsc_slip: 'HSC Admit / Registration Card',
  souvenir: 'Batch Souvenir / Yearbook Photo',
};

/**
 * Helper to compare batch years whether stored as 2-digit Batch Number (e.g., 68)
 * or 4-digit HSC Year (e.g., 2018, where 1950 + 68 = 2018).
 */
export const normalizeToBatchNumber = (batchOrYear: number): number => {
  if (!batchOrYear) return 68;
  return batchOrYear > 1900 ? batchOrYear - 1950 : batchOrYear;
};

export const formatBatchDisplay = (batchOrYear: number): string => {
  if (!batchOrYear) return 'Batch 68';
  if (batchOrYear > 1900) {
    const batchNum = batchOrYear - 1950;
    return `Batch ${batchNum} (HSC ${batchOrYear})`;
  }
  return `Batch ${batchOrYear} (HSC ${1950 + batchOrYear})`;
};

export const isSameBatch = (batchA?: number, batchB?: number): boolean => {
  if (!batchA || !batchB) return false;
  return normalizeToBatchNumber(batchA) === normalizeToBatchNumber(batchB);
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
  const safeBatch = user.batchYear || 68;
  const safeId = user.id || 1001;
  return `${origin}?vouch_for=${safeId}&roll=${encodeURIComponent(safeRoll)}&batch=${safeBatch}&name=${encodeURIComponent(safeName)}`;
};

/**
 * Generate WhatsApp share intent message
 */
export const getWhatsAppVouchShareUrl = (user: AlumniProfile): string => {
  const link = getVouchShareLink(user);
  const text = `Assalamu Alaikum / Brother! I have registered my Notre Dame College Alumni profile (${user.fullName || 'Notredamian'}, Roll: ${user.collegeRoll || 'NDC'}, Batch ${user.batchYear || 68}). Please click this link to vouch for me or verify my profile: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

export const loadVouchRequests = (): VouchRequest[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VOUCH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (r: VouchRequest) =>
            r &&
            r.id &&
            !r.id.startsWith('demo-')
        );
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
        return parsed.filter(
          (d: AdminDocSubmission) =>
            d &&
            d.id &&
            !d.id.startsWith('demo-')
        );
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

  // Persist directly to Supabase admin_doc_submissions table
  const dbSubmissionId = await submitAdminDocSubmissionInDb({
    userId: user.id,
    batchYear: user.batchYear || 68,
    collegeRoll: user.collegeRoll || '118042',
    academicStream: (user.academicStream as string) || (user.group as string) || 'Science',
    academicGroup: user.academicGroup || null,
    docType,
    docTypeLabel: DOC_TYPE_LABELS[docType] || 'Identity Document',
    storageObjectPath: documentUrl,
  });

  const submission: AdminDocSubmission = {
    id: dbSubmissionId || (existingIdx >= 0 ? submissions[existingIdx].id : `doc-sub-${Date.now()}`),
    userId: user.id,
    fullName: user.fullName || 'Notredamian Alumnus',
    avatarUrl: user.avatarUrl || '/ndc-logo.png',
    batchYear: user.batchYear || 68,
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

  return updatedReq;
};

/**
 * Add or update a user's own vouch request
 */
export const registerUserVouchRequest = async (
  user: AlumniProfile,
  customNote?: string
): Promise<VouchRequest> => {
  // 1. Create or retrieve real UUID from Supabase verification_requests table
  let dbRequestId: string | null = null;
  try {
    dbRequestId = await createVerificationRequestInDb({
      requesterId: user.id,
      batchYear: user.batchYear || 68,
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
    batchYear: user.batchYear || 68,
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
      `Batch ${user.batchYear || 68} brother. Please vouch for my profile so I can participate in our batch lounge.`,
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

  // 4. Persist peer vouch directly to Supabase peer_vouches table (trigger handles counter & promotion)
  const dbResult = await submitPeerVouchInDb({
    verificationRequestId: req.id,
    requesterId: req.requesterId,
    voucherId: voucher.id,
    voucherBatch: voucher.batchYear,
    comment,
  });

  if (!dbResult.success) {
    throw new Error(dbResult.error || 'Failed to submit peer vouch on the server.');
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

  // Resolve active verification request from Supabase
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
      comment || `Confirmed classmate from Batch ${normalizeToBatchNumber(targetProfile.batchYear)}.`
    );

    const vouchesList = res.request.vouches.map(
      (v) => `${v.voucherName} (Batch ${normalizeToBatchNumber(v.voucherBatch)})`
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

