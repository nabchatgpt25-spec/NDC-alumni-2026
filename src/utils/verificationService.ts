import { VouchRequest, VouchItem, AlumniProfile } from '../types';
import { ALUMNI_PROFILES, saveStoredAlumniProfiles } from '../data/mockData';

export const VOUCH_STORAGE_KEY = 'ndc_vouch_requests';

// Initial seed requests from real batch cohorts needing peer vouches
const INITIAL_VOUCH_REQUESTS: VouchRequest[] = [
  {
    id: 'vouch-req-101',
    requesterId: 2001,
    requesterName: 'Raihan Kabir',
    requesterAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    batchYear: 68,
    collegeRoll: '118105',
    group: 'Science',
    section: 'Group 4 (Day Shift)',
    profession: 'Software Engineer at Shohoz',
    city: 'Dhaka',
    createdAt: '2 hours ago',
    status: 'pending',
    targetVouches: 2,
    vouches: [
      {
        id: 'v-1',
        voucherId: 1002,
        voucherName: 'Tanvir Ahmed Chowdhury',
        voucherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        voucherBatch: 58,
        date: '1 hour ago',
        comment: 'I know Raihan from NDSC programming club. Genuine Notredamian!',
      },
    ],
    message: 'Hello brothers of Batch 68! Room 304, Father Timm building memories. Please vouch for my profile so I can access our batch lounge.',
  },
  {
    id: 'vouch-req-102',
    requesterId: 2002,
    requesterName: 'Samiul Alim',
    requesterAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    batchYear: 68,
    collegeRoll: '118240',
    group: 'Business Studies',
    section: 'Group 8 (Morning Shift)',
    profession: 'Financial Analyst at IDLC',
    city: 'Dhaka',
    createdAt: '5 hours ago',
    status: 'pending',
    targetVouches: 2,
    vouches: [],
    message: 'Commerce Batch 68. Class teacher was Fr. Joseph. Looking for batchmates to vouch for my profile!',
  },
  {
    id: 'vouch-req-103',
    requesterId: 2003,
    requesterName: 'Shahriar Nafis',
    requesterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    batchYear: 60,
    collegeRoll: '110052',
    group: 'Science',
    section: 'Group 1',
    profession: 'Senior Software Engineer at Pathao',
    city: 'Dhaka',
    createdAt: '1 day ago',
    status: 'pending',
    targetVouches: 2,
    vouches: [
      {
        id: 'v-2',
        voucherId: 1003,
        voucherName: 'Tariqul Islam',
        voucherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        voucherBatch: 52,
        date: '18 hours ago',
        comment: 'Studied together at NDC in Science Group. Dedicated Notredamian brother and tech lead.',
      },
    ],
    message: 'Batch 60 brother here. Need 1 more vouch to complete verification on the portal.',
  },
  {
    id: 'vouch-req-104',
    requesterId: 2004,
    requesterName: 'Adnan Sami Chowdhury',
    requesterAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    batchYear: 72,
    collegeRoll: '122019',
    group: 'Science',
    section: 'Group 3',
    profession: 'BUET CSE Student (Batch 22)',
    city: 'Dhaka',
    createdAt: '3 days ago',
    status: 'pending',
    targetVouches: 2,
    vouches: [],
    message: 'NDC Batch 72. Just joined to find seniors for machine learning research guidance.',
  },
];

export const loadVouchRequests = (): VouchRequest[] => {
  if (typeof window === 'undefined') return INITIAL_VOUCH_REQUESTS;
  try {
    const raw = localStorage.getItem(VOUCH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load vouch requests from storage', e);
  }
  return INITIAL_VOUCH_REQUESTS;
};

export const saveVouchRequests = (requests: VouchRequest[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOUCH_STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('ndc_vouch_requests_updated'));
  } catch (e) {
    console.warn('Failed to save vouch requests to storage', e);
  }
};

/**
 * Add or update a user's own vouch request
 */
export const registerUserVouchRequest = (user: AlumniProfile, customNote?: string): VouchRequest => {
  const requests = loadVouchRequests();
  const existingIndex = requests.findIndex((r) => r.requesterId === user.id);

  if (existingIndex > -1) {
    return requests[existingIndex];
  }

  const newRequest: VouchRequest = {
    id: `vouch-req-${Date.now()}`,
    requesterId: user.id,
    requesterName: user.fullName,
    requesterAvatar: user.avatarUrl,
    batchYear: user.batchYear,
    collegeRoll: user.collegeRoll || '118042',
    group: (user.group as 'Science' | 'Business Studies' | 'Humanities') || 'Science',
    section: user.section || 'General Section',
    profession: user.position || user.profession,
    city: user.city,
    createdAt: 'Just now',
    status: user.verificationStatus === 'verified' ? 'verified' : 'pending',
    targetVouches: 2,
    vouches: user.verifiedBy
      ? user.verifiedBy.map((name, idx) => ({
          id: `seed-${idx}`,
          voucherId: 1000 + idx,
          voucherName: name,
          voucherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
          voucherBatch: user.batchYear,
          date: 'Recently',
          comment: 'Verified classmate from Notre Dame College.',
        }))
      : [],
    message: customNote || `Batch ${user.batchYear} brother. Please vouch for my profile so I can participate in our batch lounge.`,
  };

  requests.unshift(newRequest);
  saveVouchRequests(requests);
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
  const alreadyVouched = req.vouches.some((v) => v.voucherId === voucher.id || v.voucherName === voucher.fullName);
  if (alreadyVouched) {
    throw new Error('You have already vouched for this brother!');
  }

  const newVouchItem: VouchItem = {
    id: `vouch-${Date.now()}`,
    voucherId: voucher.id,
    voucherName: voucher.fullName,
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

  // If this requester corresponds to a known profile in ALUMNI_PROFILES, update them
  const targetAlumni = ALUMNI_PROFILES.find((p) => p.id === req.requesterId);
  if (targetAlumni) {
    targetAlumni.vouchesCount = req.vouches.length;
    targetAlumni.verifiedBy = req.vouches.map((v) => `${v.voucherName} (Batch ${v.voucherBatch})`);
    if (isNowVerified) {
      targetAlumni.verificationStatus = 'verified';
      targetAlumni.verificationMethod = 'two_vouches';
      targetAlumni.verificationDate = 'Today';
      if (!targetAlumni.badges?.includes('Verified Notredamian')) {
        targetAlumni.badges = [...(targetAlumni.badges || []), 'Verified Notredamian'];
      }
    }
    saveStoredAlumniProfiles(ALUMNI_PROFILES);
  }

  return { success: true, isNowVerified, request: req };
};

/**
 * Simulate an instant classmate vouch for the current user (useful for testing/demo)
 */
export const simulateDemoVouchForUser = (
  currentUser: AlumniProfile,
  onUserUpdated: (updated: AlumniProfile) => void
): AlumniProfile => {
  const demoClassmates = [
    { name: 'Tanvir Ahmed Chowdhury', batch: 58, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
    { name: 'Dr. Tariqul Islam', batch: 52, avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&auto=format&fit=crop&q=80' },
    { name: 'Prof. Dr. Mahfuzur Rahman', batch: 45, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
    { name: 'Syed Farhan Rezwan', batch: 60, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  ];

  const currentVouchesCount = currentUser.vouchesCount || (currentUser.verifiedBy?.length || 0);
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
    badges: isVerified && !currentUser.badges?.includes('Verified Notredamian')
      ? [...(currentUser.badges || []), 'Verified Notredamian']
      : currentUser.badges,
  };

  onUserUpdated(updatedProfile);
  return updatedProfile;
};

/**
 * Generate deep share link for requesting vouches
 */
export const getVouchShareLink = (user: AlumniProfile): string => {
  if (typeof window === 'undefined') return '';
  const url = `${window.location.origin}${window.location.pathname}#vouch?roll=${encodeURIComponent(user.collegeRoll || '')}&batch=${user.batchYear}&name=${encodeURIComponent(user.fullName)}`;
  return url;
};

/**
 * Generate WhatsApp share intent message
 */
export const getWhatsAppVouchShareUrl = (user: AlumniProfile): string => {
  const link = getVouchShareLink(user);
  const text = `Assalamu Alaikum / Brother! I have registered my Notre Dame College Alumni profile (${user.fullName}, Roll: ${user.collegeRoll || 'NDC'}, Batch ${user.batchYear}). Please vouch for me as your classmate to complete my verification: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};
