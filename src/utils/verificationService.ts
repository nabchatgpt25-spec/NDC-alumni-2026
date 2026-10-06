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
  const safeRoll = (user.collegeRoll || '118042').trim();
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

// Initial seed requests (starts empty; populated only by real user submissions)
const INITIAL_VOUCH_REQUESTS: VouchRequest[] = [];

// Initial ID / NID Document Submissions (starts empty; populated only by real user submissions)
const INITIAL_ADMIN_DOC_SUBMISSIONS: AdminDocSubmission[] = [];

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
            !r.id.startsWith('vouch-req-10') &&
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
            !d.id.startsWith('doc-sub-10') &&
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
const syncProfileVerificationInStorage = (
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
export const submitDocumentForAdminReview = (
  user: AlumniProfile,
  docType: VerificationDocType,
  documentUrl: string
): AdminDocSubmission => {
  const submissions = loadAdminDocSubmissions();
  const existingIdx = submissions.findIndex((s) => s.userId === user.id);

  const submission: AdminDocSubmission = {
    id: existingIdx >= 0 ? submissions[existingIdx].id : `doc-sub-${Date.now()}`,
    userId: user.id,
    fullName: user.fullName || 'Notredamian Alumnus',
    avatarUrl:
      user.avatarUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
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

  // Persist to Supabase admin_doc_submissions table
  submitAdminDocSubmissionInDb({
    userId: user.id,
    batchYear: user.batchYear || 68,
    collegeRoll: user.collegeRoll || '118042',
    academicStream: (user.academicStream as string) || (user.group as string) || 'Science',
    academicGroup: user.academicGroup || null,
    docType,
    docTypeLabel: DOC_TYPE_LABELS[docType] || 'Identity Document',
    storageObjectPath: documentUrl,
  }).catch((err) => {
    console.warn('submitAdminDocSubmissionInDb fallback:', err);
  });

  // Also ensure a VouchRequest exists and attach the idProofUrl so Admin sees it in both places
  const requests = loadVouchRequests();
  const reqIdx = requests.findIndex((r) => r.requesterId === user.id);
  if (reqIdx >= 0) {
    requests[reqIdx] = {
      ...requests[reqIdx],
      idProofUrl: documentUrl,
      idDocType: docType,
      status: 'pending',
    };
    saveVouchRequests(requests);
  } else {
    const createdReq = registerUserVouchRequest(
      { ...user, idProofUrl: documentUrl, idDocType: docType },
      `Uploaded ${DOC_TYPE_LABELS[docType]} for Admin Verification.`
    );
    createdReq.idProofUrl = documentUrl;
    createdReq.idDocType = docType;
  }

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
          verificationMethod: 'admin_verified',
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
 * Admin Action: Directly approve any VouchRequest (even without 2 vouches)
 */
export const adminApproveVouchRequest = (
  requestId: string,
  adminName: string
): VouchRequest => {
  const requests = loadVouchRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) {
    throw new Error('Verification request not found');
  }

  const req = requests[idx];
  const adminVouch: VouchItem = {
    id: `admin-vouch-${Date.now()}`,
    voucherId: 999999,
    voucherName: `${adminName} (Admin)`,
    voucherAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    voucherBatch: 68,
    date: 'Just now',
    comment: 'Officially verified by Portal Admin.',
  };

  const updatedReq: VouchRequest = {
    ...req,
    status: 'verified',
    vouches: [...req.vouches, adminVouch],
  };

  requests[idx] = updatedReq;
  saveVouchRequests(requests);

  // Also mark any pending doc submission for this user as approved
  const docs = loadAdminDocSubmissions();
  const docIdx = docs.findIndex((d) => d.userId === req.requesterId && d.status === 'pending');
  if (docIdx >= 0) {
    docs[docIdx] = {
      ...docs[docIdx],
      status: 'approved',
      reviewedBy: adminName,
      reviewedAt: 'Just now',
      adminNote: 'Approved by Admin via Verification Queue.',
    };
    saveAdminDocSubmissions(docs);
  }

  syncProfileVerificationInStorage(req.requesterId, {
    verificationStatus: 'verified',
    verificationMethod: 'admin_verified',
    idSubmissionStatus: 'approved',
    verificationDate: 'Today',
    vouchesCount: Math.max(2, updatedReq.vouches.length),
    verifiedBy: updatedReq.vouches.map((v) => `${v.voucherName}`),
  });

  return updatedReq;
};

/**
 * Add or update a user's own vouch request
 */
export const registerUserVouchRequest = (
  user: AlumniProfile,
  customNote?: string
): VouchRequest => {
  const requests = loadVouchRequests();
  const existingIndex = requests.findIndex((r) => r.requesterId === user.id);

  if (existingIndex > -1) {
    if (user.idProofUrl) {
      requests[existingIndex].idProofUrl = user.idProofUrl;
    }
    if (customNote) {
      requests[existingIndex].message = customNote;
    }
    saveVouchRequests(requests);
    return requests[existingIndex];
  }

  const newRequest: VouchRequest = {
    id: `vouch-req-${Date.now()}`,
    requesterId: user.id,
    requesterName: user.fullName || 'Notredamian Alumnus',
    requesterAvatar:
      user.avatarUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
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
    vouches: user.verifiedBy
      ? user.verifiedBy.map((name, idx) => ({
          id: `seed-${idx}`,
          voucherId: 1000 + idx,
          voucherName: name,
          voucherAvatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
          voucherBatch: user.batchYear || 68,
          date: 'Recently',
          comment: 'Verified classmate from Notre Dame College.',
        }))
      : [],
    message:
      customNote ||
      `Batch ${user.batchYear || 68} brother. Please vouch for my profile so I can participate in our batch lounge.`,
  };

  requests.unshift(newRequest);
  saveVouchRequests(requests);

  // Persist to Supabase verification_requests table
  createVerificationRequestInDb({
    requesterId: user.id,
    batchYear: user.batchYear || 68,
    collegeRoll: user.collegeRoll || '118042',
    academicStream: (user.academicStream as string) || (user.group as string) || 'Science',
    academicGroup: user.academicGroup || null,
    section: user.section || null,
    message: customNote || null,
    targetVouches: 2,
  }).catch((err) => {
    console.warn('createVerificationRequestInDb fallback:', err);
  });

  return newRequest;
};

/**
 * Submit a peer vouch from a logged-in user to a requesting brother
 */
export const submitPeerVouch = (
  requestId: string,
  voucher: AlumniProfile,
  comment: string
): { success: boolean; isNowVerified: boolean; request: VouchRequest } => {
  const requests = loadVouchRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);

  if (reqIndex === -1) {
    throw new Error('Vouch request not found');
  }

  const req = requests[reqIndex];

  // Prevent duplicate vouch from the same person
  const alreadyVouched = req.vouches.some(
    (v) => v.voucherId === voucher.id || v.voucherName === voucher.fullName
  );
  if (alreadyVouched) {
    throw new Error('You have already vouched for this brother!');
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

  // Persist peer vouch to Supabase peer_vouches table
  submitPeerVouchInDb({
    verificationRequestId: req.id,
    requesterId: req.requesterId,
    voucherId: voucher.id,
    voucherBatch: voucher.batchYear,
    comment,
  }).catch((err) => {
    console.warn('submitPeerVouchInDb fallback:', err);
  });

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
 * Simulate an instant classmate vouch for the current user (useful for testing/demo)
 */
export const simulateDemoVouchForUser = (
  currentUser: AlumniProfile,
  onUserUpdated?: (updated: AlumniProfile) => void
): AlumniProfile => {
  const demoClassmates = [
    {
      name: 'Tanvir Ahmed Chowdhury',
      batch: 58,
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    },
    {
      name: 'Dr. Tariqul Islam',
      batch: 52,
      avatar:
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&auto=format&fit=crop&q=80',
    },
    {
      name: 'Prof. Dr. Mahfuzur Rahman',
      batch: 45,
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
    {
      name: 'Syed Farhan Rezwan',
      batch: 60,
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    },
  ];

  const currentVouchesCount =
    currentUser.vouchesCount || (currentUser.verifiedBy?.length || 0);
  const nextClassmate = demoClassmates[currentVouchesCount % demoClassmates.length];
  const newVoucherString = `${nextClassmate.name} (Batch ${nextClassmate.batch})`;

  const updatedVerifiedBy = [...(currentUser.verifiedBy || []), newVoucherString];
  const newCount = updatedVerifiedBy.length;
  const isVerified = newCount >= 2;

  const updatedProfile: AlumniProfile = {
    ...currentUser,
    vouchesCount: newCount,
    verifiedBy: updatedVerifiedBy,
    verificationStatus: isVerified ? 'verified' : 'pending_vouch',
    verificationMethod: 'two_vouches',
    verificationDate: isVerified ? 'Today' : currentUser.verificationDate,
    badges:
      isVerified && !currentUser.badges?.includes('Verified Notredamian')
        ? [...(currentUser.badges || []), 'Verified Notredamian']
        : currentUser.badges,
  };

  syncProfileVerificationInStorage(currentUser.id, updatedProfile);
  if (onUserUpdated) {
    onUserUpdated(updatedProfile);
  }
  return updatedProfile;
};

/**
 * Ensure an incoming shared vouch link (?vouch_for=... or #vouch?roll=...&batch=...&name=...) creates or matches a pending vouch request
 */
export const ensureVouchRequestFromUrlParams = (params?: {
  id?: number;
  name?: string;
  roll?: string;
  batch?: number;
}): VouchRequest | null => {
  let resolvedParams = params;
  if (!resolvedParams) {
    if (typeof window === 'undefined') return null;
    const searchParams = new URLSearchParams(window.location.search);
    const vouchFor = searchParams.get('vouch_for');
    const urlName = searchParams.get('name');
    const urlRoll = searchParams.get('roll');
    const urlBatch = searchParams.get('batch');
    if (!vouchFor && !urlName) return null;
    resolvedParams = {
      id: vouchFor ? Number(vouchFor) || undefined : undefined,
      name: urlName || undefined,
      roll: urlRoll || undefined,
      batch: urlBatch ? Number(urlBatch) || 68 : 68,
    };
  }

  if (!resolvedParams?.name?.trim() && !resolvedParams?.id) return null;
  const requests = loadVouchRequests();
  const cleanName = (resolvedParams.name || '').trim().toLowerCase();
  const cleanRoll = (resolvedParams.roll || '').trim();
  const existing = requests.find(
    (r) =>
      (resolvedParams?.id && r.requesterId === resolvedParams.id) ||
      (cleanName && r.requesterName.toLowerCase() === cleanName) ||
      (cleanRoll && r.collegeRoll === cleanRoll)
  );
  if (existing) return existing;

  const batchNum = normalizeToBatchNumber(resolvedParams.batch || 68);
  const created: VouchRequest = {
    id: `vouch-req-link-${Date.now()}`,
    requesterId: resolvedParams.id || Date.now(),
    requesterName: (resolvedParams.name || 'Notredamian Alumnus').trim(),
    requesterAvatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    batchYear: batchNum,
    collegeRoll: cleanRoll || '118042',
    group: 'Science',
    section: 'Shared Vouch Link',
    profession: 'Notredamian Alumnus',
    city: 'Dhaka',
    createdAt: 'Just now',
    status: 'pending',
    targetVouches: 2,
    vouches: [],
    message: `Shared verification link from ${(resolvedParams.name || 'Alumnus').trim()} (Roll: ${cleanRoll || 'NDC'}, Batch ${batchNum}). Please vouch if you recognize this classmate!`,
  };
  requests.unshift(created);
  saveVouchRequests(requests);
  return created;
};

/**
 * Directly vouch for an AlumniProfile from their ProfileView or Directory card
 */
export const vouchForAlumniProfile = (
  targetProfile: AlumniProfile,
  voucher: AlumniProfile,
  comment?: string
): {
  success: boolean;
  message: string;
  updatedProfile: AlumniProfile;
  updatedTarget: AlumniProfile;
  isNowVerified: boolean;
} => {
  try {
    const requests = loadVouchRequests();
    let req = requests.find(
      (r) =>
        r.requesterId === targetProfile.id ||
        r.requesterName.toLowerCase() === targetProfile.fullName.toLowerCase()
    );

    if (!req) {
      req = registerUserVouchRequest(targetProfile);
    }

    const res = submitPeerVouch(
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
