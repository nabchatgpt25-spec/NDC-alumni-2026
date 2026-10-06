import {
  AlumniProfile,
  BloodAlertPreference,
  BloodContactMethod,
  BloodDonationHistoryItem,
  BloodDonorAvailability,
  BloodDonorProfile,
  BloodDonorResponse,
  BloodEmergencyLevel,
  BloodEmergencyRequest,
  BloodGroup,
  BloodRequestStatus,
  BLOOD_GROUPS_LIST,
  NotificationItem,
} from '../types';
import { NOTIFICATIONS_LIST } from '../data/mockData';
import { matchDonorsForRequest } from './bloodMatching';
import {
  createBloodRequestInDb,
  registerBloodDonorInDb,
  respondToBloodRequestInDb,
} from '../services/supabaseService';

export const BLOOD_REQUESTS_STORAGE_KEY = 'ndc_blood_requests_v1';
export const BLOOD_DONORS_STORAGE_KEY = 'ndc_blood_donors_v1';
export const PORTAL_NOTIFICATIONS_STORAGE_KEY = 'ndc_portal_notifications_v1';
export const BLOOD_BANNER_DISMISSED_KEY = 'ndc_blood_emergency_banner_dismissed_v2';

export function isBloodBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(BLOOD_BANNER_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function dismissBloodBanner(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BLOOD_BANNER_DISMISSED_KEY, 'true');
    window.dispatchEvent(new CustomEvent('ndc_blood_banner_dismissed'));
  } catch (e) {
    console.warn('Failed to dismiss blood banner', e);
  }
}

export const DONATION_AREAS_LIST: string[] = [
  'Shahbagh / Motijheel / Ramna (DMCH, BSMMU, BIRDEM)',
  'Dhanmondi / Panthapath / Green Road (Square, Labaid)',
  'Gulshan / Banani / Bashundhara (Evercare, United)',
  'Mirpur / Agargaon / Shyamoli (NICVD, NIKDU, Heart Foundation)',
  'Uttara / Kurmitola / Airport Corridor',
  'Mugda / Khilgaon / Malibagh',
  'Chattogram Metropolitan Area',
  'Sylhet / Rajshahi / Khulna Regional Hub',
];

/**
 * Sanitize user-entered text to prevent injection and enforce length bounds.
 */
export function sanitizeInputText(value: string, maxLength = 300): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>?/gm, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Initial blood donor profiles.
 * Production starts with empty list []; populated only with real registered blood donors.
 */
export const INITIAL_BLOOD_DONORS: BloodDonorProfile[] = [];

export const INITIAL_BLOOD_REQUESTS: BloodEmergencyRequest[] = [
  {
    id: 'blood-req-1001',
    bloodGroup: 'O-',
    unitsRequired: 2,
    unitsFulfilled: 0,
    hospitalName: 'Dhaka Medical College Hospital (DMCH) — Cardiac Surgery ICU',
    hospitalArea: 'Shahbagh / Motijheel / Ramna (DMCH, BSMMU, BIRDEM)',
    city: 'Dhaka',
    requiredDateTime: 'Today, within 4 hours',
    emergencyLevel: 'critical',
    contactMethod: 'Portal Secure Coordination',
    coordinationRef: 'DMCH Transfusion Medicine Counter #2 (Ref: NDC-B52-Cardiac)',
    description:
      'Urgent 2 units of O-Negative whole blood needed for emergency bypass surgery of Batch 48 alumnus father. Cross-matching desk is ready at DMCH Transfusion Medicine Dept.',
    patientRelation: 'Father of Batch 48 Alumnus',
    requesterId: 101,
    requesterName: 'Dr. Tariqul Islam Chowdhury',
    requesterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    requesterBatch: 52,
    requesterVerified: true,
    status: 'Active',
    createdAt: '35 mins ago',
    updatedAt: '10 mins ago',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    responses: [],
    verifiedByAdmin: 'NDC Emergency Welfare Desk',
  },
  {
    id: 'blood-req-1002',
    bloodGroup: 'B+',
    unitsRequired: 2,
    unitsFulfilled: 1,
    hospitalName: 'Square Hospital Limited — Level 4 Blood Bank',
    hospitalArea: 'Dhanmondi / Panthapath / Green Road (Square, Labaid)',
    city: 'Dhaka',
    requiredDateTime: 'Today by 8:00 PM',
    emergencyLevel: 'urgent',
    contactMethod: 'Hospital Blood Bank Desk',
    coordinationRef: 'Square Blood Bank Counter, Patient File #SQ-88412',
    description:
      '1 more unit of B+ blood required for scheduled orthopedic reconstruction of a Batch 64 brother following a road accident. 1 unit already pledged by a batchmate.',
    patientRelation: 'Batch 64 Alumnus',
    requesterId: 1005,
    requesterName: 'Barrister Nabeel Hasan',
    requesterAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    requesterBatch: 64,
    requesterVerified: true,
    status: 'Donor Found',
    createdAt: '2 hours ago',
    updatedAt: '45 mins ago',
    expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    responses: [
      {
        id: 'resp-201',
        requestId: 'blood-req-1002',
        donorUserId: 1003,
        donorName: 'Tariqul Islam',
        donorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        donorBatchYear: 52,
        donorBloodGroup: 'B+',
        donorPreferredArea: 'Dhanmondi / Panthapath / Green Road (Square, Labaid)',
        respondedAt: '1 hour ago',
        status: 'accepted',
        note: 'I am 15 minutes from Panthapath. Heading to Square Blood Bank for cross-matching.',
      },
    ],
    verifiedByAdmin: 'NDC Emergency Welfare Desk',
  },
  {
    id: 'blood-req-1003',
    bloodGroup: 'A+',
    unitsRequired: 1,
    unitsFulfilled: 0,
    hospitalName: 'BSMMU (PG Hospital) — Cabin Block Blood Bank',
    hospitalArea: 'Shahbagh / Motijheel / Ramna (DMCH, BSMMU, BIRDEM)',
    city: 'Dhaka',
    requiredDateTime: 'Tomorrow Morning, 9:30 AM',
    emergencyLevel: 'urgent',
    contactMethod: 'Batch Coordinator Relay',
    coordinationRef: 'BSMMU Block C, Transfusion Unit',
    description:
      'Need 1 unit A+ blood for thalassemia support & surgical prep for a Batch 58 alumnus family member at BSMMU Shahbagh.',
    patientRelation: 'Family Member of Batch 58 Alumnus',
    requesterId: 103,
    requesterName: 'Dr. Zubair Al-Mahmud',
    requesterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    requesterBatch: 58,
    requesterVerified: true,
    status: 'Active',
    createdAt: '4 hours ago',
    updatedAt: '2 hours ago',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    responses: [],
    verifiedByAdmin: 'NDC Emergency Welfare Desk',
  },
  {
    id: 'blood-req-1004',
    bloodGroup: 'AB+',
    unitsRequired: 2,
    unitsFulfilled: 0,
    hospitalName: 'National Heart Foundation Hospital & Research Institute',
    hospitalArea: 'Mirpur / Agargaon / Shyamoli (NICVD, NIKDU, Heart Foundation)',
    city: 'Dhaka',
    requiredDateTime: 'Tomorrow, 2:00 PM',
    emergencyLevel: 'standard',
    contactMethod: 'Portal Secure Coordination',
    coordinationRef: 'Heart Foundation Blood Transfusion Wing, Mirpur-2',
    description:
      'Seeking 2 standby AB+ donors for planned valve replacement procedure of a senior Batch 38 Notredamian.',
    patientRelation: 'Batch 38 Senior Alumnus',
    requesterId: 900002,
    requesterName: 'Dr. Ashraful Alam Chowdhury',
    requesterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    requesterBatch: 60,
    requesterVerified: true,
    status: 'Pending Verification',
    createdAt: '1 hour ago',
    updatedAt: '1 hour ago',
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    responses: [],
  },
  {
    id: 'blood-req-1005',
    bloodGroup: 'O+',
    unitsRequired: 2,
    unitsFulfilled: 2,
    hospitalName: 'Evercare Hospital Dhaka',
    hospitalArea: 'Gulshan / Banani / Bashundhara (Evercare, United)',
    city: 'Dhaka',
    requiredDateTime: 'Completed Yesterday',
    emergencyLevel: 'critical',
    contactMethod: 'Hospital Blood Bank Desk',
    coordinationRef: 'Evercare Transfusion Center',
    description:
      '2 units of O+ blood successfully donated by Batch 60 & Batch 66 brothers for emergency neuro-trauma surgery. Alhamdulillah, patient is stable.',
    patientRelation: 'Batch 66 Alumnus',
    requesterId: 102,
    requesterName: 'Engr. Tanvir Ahmed Siddiqui',
    requesterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    requesterBatch: 66,
    requesterVerified: true,
    status: 'Fulfilled',
    createdAt: 'Yesterday',
    updatedAt: 'Yesterday',
    responses: [
      {
        id: 'resp-202',
        requestId: 'blood-req-1005',
        donorUserId: 2003,
        donorName: 'Shahriar Nafis',
        donorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        donorBatchYear: 60,
        donorBloodGroup: 'O+',
        donorPreferredArea: 'Gulshan / Banani / Bashundhara (Evercare, United)',
        respondedAt: 'Yesterday',
        status: 'confirmed_donated',
        note: 'Cross-matched and completed donation at Evercare Blood Bank.',
      },
    ],
    verifiedByAdmin: 'NDC Emergency Welfare Desk',
  },
];

/**
 * Load all blood donors from localStorage merged with INITIAL_BLOOD_DONORS.
 */
export function loadBloodDonors(): BloodDonorProfile[] {
  if (typeof window === 'undefined') return [...INITIAL_BLOOD_DONORS];
  try {
    const raw = localStorage.getItem(BLOOD_DONORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = [...parsed];
        for (const seed of INITIAL_BLOOD_DONORS) {
          if (!merged.some((d) => d.userId === seed.userId)) {
            merged.push(seed);
          }
        }
        return merged;
      }
    }
  } catch (e) {
    console.warn('Failed to load blood donors from storage', e);
  }
  return [...INITIAL_BLOOD_DONORS];
}

export function saveBloodDonors(donors: BloodDonorProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BLOOD_DONORS_STORAGE_KEY, JSON.stringify(donors));
    window.dispatchEvent(new CustomEvent('ndc_blood_network_updated'));
  } catch (e) {
    console.warn('Failed to save blood donors to storage', e);
  }
}

/**
 * Get a specific user's blood donor profile if registered.
 */
export function getDonorProfileByUserId(userId: number): BloodDonorProfile | undefined {
  return loadBloodDonors().find((d) => d.userId === userId);
}

/**
 * Create or update a user's Blood Donor Profile (privacy-safe: never stores phone/email/home address).
 */
export function upsertBloodDonorProfile(
  user: AlumniProfile,
  input: {
    bloodGroup: BloodGroup;
    isRegisteredDonor: boolean;
    availability: BloodDonorAvailability;
    preferredArea: string;
    lastDonationDate?: string;
    emergencyAlertPreference: BloodAlertPreference;
    donationHistory?: BloodDonationHistoryItem[];
  }
): BloodDonorProfile {
  if (!BLOOD_GROUPS_LIST.includes(input.bloodGroup)) {
    throw new Error('Please select a valid blood group.');
  }
  const cleanArea = sanitizeInputText(input.preferredArea || user.city || 'Dhaka', 120);
  if (!cleanArea) {
    throw new Error('Please specify a preferred donation area.');
  }

  const donors = loadBloodDonors();
  const existingIdx = donors.findIndex((d) => d.userId === user.id);

  const updatedDonor: BloodDonorProfile = {
    userId: user.id,
    fullName: sanitizeInputText(user.fullName || 'Notredamian Alumnus', 80),
    avatarUrl: user.avatarUrl,
    batchYear: user.batchYear || 68,
    profession: user.profession,
    institution: user.institution,
    verificationStatus: user.verificationStatus || 'verified',
    bloodGroup: input.bloodGroup,
    isRegisteredDonor: input.isRegisteredDonor,
    availability: input.availability,
    preferredArea: cleanArea,
    city: sanitizeInputText(user.city || 'Dhaka', 60),
    lastDonationDate: input.lastDonationDate || undefined,
    emergencyAlertPreference: input.emergencyAlertPreference,
    donationHistory: input.donationHistory ?? (existingIdx > -1 ? donors[existingIdx].donationHistory : []),
    updatedAt: 'Just now',
  };

  if (existingIdx > -1) {
    donors[existingIdx] = updatedDonor;
  } else {
    donors.unshift(updatedDonor);
  }

  saveBloodDonors(donors);

  // Persist to Supabase blood_donors table
  registerBloodDonorInDb({
    userId: user.id,
    bloodGroup: input.bloodGroup,
    availability: input.availability,
    preferredArea: cleanArea,
    city: sanitizeInputText(user.city || 'Dhaka', 60),
    lastDonationDate: input.lastDonationDate,
    emergencyAlertPreference: input.emergencyAlertPreference,
  }).catch((err) => {
    console.warn('registerBloodDonorInDb fallback:', err);
  });

  return updatedDonor;
}

/**
 * Load all emergency blood requests, automatically marking expired requests if past their expiresAt timestamp.
 */
export function loadBloodRequests(): BloodEmergencyRequest[] {
  if (typeof window === 'undefined') return [...INITIAL_BLOOD_REQUESTS];
  try {
    const raw = localStorage.getItem(BLOOD_REQUESTS_STORAGE_KEY);
    let list: BloodEmergencyRequest[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = [...parsed];
        for (const seed of INITIAL_BLOOD_REQUESTS) {
          if (!list.some((r) => r.id === seed.id)) {
            list.push(seed);
          }
        }
      }
    }
    if (list.length === 0) {
      list = [...INITIAL_BLOOD_REQUESTS];
    }

    // Check if any active/pending request has passed its expiresAt date
    const now = Date.now();
    let changed = false;
    const checked = list.map((req) => {
      if (
        (req.status === 'Active' || req.status === 'Pending Verification') &&
        req.expiresAt &&
        !isNaN(new Date(req.expiresAt).getTime()) &&
        new Date(req.expiresAt).getTime() < now
      ) {
        changed = true;
        return { ...req, status: 'Expired' as BloodRequestStatus, updatedAt: 'Expired automatically' };
      }
      return req;
    });

    if (changed) {
      localStorage.setItem(BLOOD_REQUESTS_STORAGE_KEY, JSON.stringify(checked));
    }
    return checked;
  } catch (e) {
    console.warn('Failed to load blood requests from storage', e);
  }
  return [...INITIAL_BLOOD_REQUESTS];
}

export function saveBloodRequests(requests: BloodEmergencyRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BLOOD_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('ndc_blood_network_updated'));
  } catch (e) {
    console.warn('Failed to save blood requests to storage', e);
  }
}

/**
 * EXISTING Notification System Integration:
 * Loads and persists notifications into the single portal notification list used by Header.tsx.
 */
export function loadPortalNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [...NOTIFICATIONS_LIST];
  try {
    const raw = localStorage.getItem(PORTAL_NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load notifications from storage', e);
  }
  return [...NOTIFICATIONS_LIST];
}

export function savePortalNotifications(items: NotificationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTAL_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('ndc_notifications_updated'));
  } catch (e) {
    console.warn('Failed to save notifications', e);
  }
}

export function pushPortalNotification(input: {
  title: string;
  message: string;
  type?: NotificationItem['type'];
  targetRoute?: string;
  bloodRequestId?: string;
}): NotificationItem {
  const existing = loadPortalNotifications();
  const nextItem: NotificationItem = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    title: sanitizeInputText(input.title, 110),
    message: sanitizeInputText(input.message, 240),
    timeAgo: 'Just now',
    unread: true,
    type: input.type || 'blood',
    targetRoute: input.targetRoute || 'emergency',
    bloodRequestId: input.bloodRequestId,
  };
  const updated = [nextItem, ...existing].slice(0, 35);
  savePortalNotifications(updated);
  return nextItem;
}

/**
 * Security & Authorization check:
 * Only the original requester or a verified moderator/admin can modify a request's status.
 */
export function canModifyBloodRequest(
  request: BloodEmergencyRequest,
  currentUser: AlumniProfile,
  isModeratorMode = false
): boolean {
  if (!currentUser) return false;
  if (request.requesterId === currentUser.id || request.requesterId === currentUser.userId) {
    return true;
  }
  if (isModeratorMode && (currentUser.verificationStatus || 'verified') === 'verified') {
    return true;
  }
  return false;
}

/**
 * Create a new Emergency Blood Request with strict input validation and automatic donor matching notifications.
 */
export function createEmergencyBloodRequest(
  requester: AlumniProfile,
  input: {
    bloodGroup: BloodGroup;
    unitsRequired: number;
    hospitalName: string;
    hospitalArea: string;
    city?: string;
    requiredDateTime: string;
    emergencyLevel: BloodEmergencyLevel;
    contactMethod: BloodContactMethod;
    coordinationRef?: string;
    description: string;
    patientRelation?: string;
  }
): { request: BloodEmergencyRequest; matchedDonorsCount: number } {
  if (!BLOOD_GROUPS_LIST.includes(input.bloodGroup)) {
    throw new Error('Please select a valid blood group.');
  }
  const units = Number(input.unitsRequired);
  if (!Number.isInteger(units) || units < 1 || units > 10) {
    throw new Error('Units required must be between 1 and 10.');
  }

  const hospitalName = sanitizeInputText(input.hospitalName, 140);
  const hospitalArea = sanitizeInputText(input.hospitalArea, 120);
  const requiredDateTime = sanitizeInputText(input.requiredDateTime, 80);
  const description = sanitizeInputText(input.description, 350);

  if (!hospitalName || hospitalName.length < 3) {
    throw new Error('Please enter the hospital or blood bank name.');
  }
  if (!hospitalArea) {
    throw new Error('Please select or enter the hospital area/location.');
  }
  if (!requiredDateTime) {
    throw new Error('Please specify when the blood is required.');
  }
  if (!description || description.length < 10) {
    throw new Error('Please provide a short clinical/coordination description (at least 10 characters).');
  }

  const isRequesterVerified = (requester.verificationStatus || 'verified') === 'verified';
  const initialStatus: BloodRequestStatus = isRequesterVerified ? 'Active' : 'Pending Verification';

  const newRequest: BloodEmergencyRequest = {
    id: `blood-req-${Date.now()}`,
    bloodGroup: input.bloodGroup,
    unitsRequired: units,
    unitsFulfilled: 0,
    hospitalName,
    hospitalArea,
    city: sanitizeInputText(input.city || requester.city || 'Dhaka', 60),
    requiredDateTime,
    emergencyLevel: input.emergencyLevel,
    contactMethod: input.contactMethod,
    coordinationRef: sanitizeInputText(input.coordinationRef || '', 120) || undefined,
    description,
    patientRelation: sanitizeInputText(input.patientRelation || 'Notredamian Family / Alumnus', 80),
    requesterId: requester.id,
    requesterName: sanitizeInputText(requester.fullName || 'Notredamian Alumnus', 80),
    requesterAvatar: requester.avatarUrl,
    requesterBatch: requester.batchYear || 68,
    requesterVerified: isRequesterVerified,
    status: initialStatus,
    createdAt: 'Just now',
    updatedAt: 'Just now',
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    responses: [],
    verifiedByAdmin: isRequesterVerified ? 'Verified Alumnus Auto-Activation' : undefined,
  };

  const requests = loadBloodRequests();
  const updatedRequests = [newRequest, ...requests];
  saveBloodRequests(updatedRequests);

  // Persist to Supabase blood_requests table
  createBloodRequestInDb({
    requesterId: requester.id,
    bloodGroup: input.bloodGroup,
    unitsRequired: units,
    hospitalName,
    hospitalArea,
    city: sanitizeInputText(input.city || requester.city || 'Dhaka', 60),
    requiredDateTime,
    emergencyLevel: input.emergencyLevel,
    contactMethod: input.contactMethod,
    description,
  }).catch((err) => {
    console.warn('createBloodRequestInDb fallback:', err);
  });

  const donors = loadBloodDonors();
  const matched = matchDonorsForRequest(newRequest, donors);

  // Trigger notification through EXISTING notification system
  pushPortalNotification({
    title: `🩸 Emergency ${newRequest.bloodGroup} Blood Request (${newRequest.emergencyLevel.toUpperCase()})`,
    message: `${newRequest.unitsRequired} unit(s) of ${newRequest.bloodGroup} needed at ${newRequest.hospitalName} (${newRequest.hospitalArea}). ${matched.length} matching alumni donors identified.`,
    type: 'blood',
    targetRoute: 'emergency',
    bloodRequestId: newRequest.id,
  });

  return { request: newRequest, matchedDonorsCount: matched.length };
}

/**
 * Record a donor's "I Can Donate" response, update request status if appropriate,
 * and notify the requester via the existing notification system.
 */
export function respondToBloodRequest(
  requestId: string,
  donorUser: AlumniProfile,
  note?: string
): BloodEmergencyRequest {
  const requests = loadBloodRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) {
    throw new Error('Blood request not found.');
  }

  const target = requests[idx];
  if (target.status === 'Fulfilled' || target.status === 'Cancelled' || target.status === 'Expired') {
    throw new Error(`Cannot respond to a ${target.status.toLowerCase()} request.`);
  }

  if (target.responses.some((r) => r.donorUserId === donorUser.id)) {
    throw new Error('You have already responded "I Can Donate" to this request.');
  }

  const donorRecord = getDonorProfileByUserId(donorUser.id);
  const donorBloodGroup: BloodGroup =
    donorRecord?.bloodGroup || donorUser.bloodGroup || target.bloodGroup;
  const donorArea =
    donorRecord?.preferredArea ||
    donorUser.bloodDonorProfile?.preferredArea ||
    `${donorUser.city || 'Dhaka'}`;

  const responseItem: BloodDonorResponse = {
    id: `resp-${Date.now()}`,
    requestId: target.id,
    donorUserId: donorUser.id,
    donorName: sanitizeInputText(donorUser.fullName || 'Notredamian Brother', 80),
    donorAvatar: donorUser.avatarUrl,
    donorBatchYear: donorUser.batchYear || 68,
    donorBloodGroup,
    donorPreferredArea: donorArea,
    respondedAt: 'Just now',
    status: 'offered',
    note: sanitizeInputText(
      note || 'Ready to coordinate at the hospital blood bank for cross-matching.',
      200
    ),
  };

  const nextStatus: BloodRequestStatus =
    target.status === 'Active' ? 'Donor Found' : target.status;

  const updatedRequest: BloodEmergencyRequest = {
    ...target,
    status: nextStatus,
    updatedAt: 'Just now',
    responses: [responseItem, ...target.responses],
  };

  requests[idx] = updatedRequest;
  saveBloodRequests(requests);

  // Persist to Supabase blood_request_responses table
  respondToBloodRequestInDb({
    requestId: target.id,
    donorUserId: donorUser.id,
    status: 'offered',
    note: responseItem.note,
  }).catch((err) => {
    console.warn('respondToBloodRequestInDb fallback:', err);
  });

  // Send notification via the EXISTING notification system
  pushPortalNotification({
    title: `🩸 Donor Response: ${donorUser.fullName} (Batch ${donorUser.batchYear}) Can Donate!`,
    message: `${donorUser.fullName} (${donorBloodGroup}) responded "I Can Donate" for your ${target.bloodGroup} request at ${target.hospitalName}.`,
    type: 'blood',
    targetRoute: 'emergency',
    bloodRequestId: target.id,
  });

  return updatedRequest;
}

/**
 * Update a donor response status (e.g., Confirm Donation) and synchronize request status & notifications.
 */
export function confirmDonorDonationOnRequest(
  requestId: string,
  responseId: string,
  actor: AlumniProfile,
  isModeratorMode = false
): BloodEmergencyRequest {
  const requests = loadBloodRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) throw new Error('Request not found.');

  const target = requests[idx];
  if (!canModifyBloodRequest(target, actor, isModeratorMode)) {
    throw new Error('Only the requester or an authorized moderator can confirm donations on this request.');
  }

  let confirmedDonorName = 'Alumnus Donor';
  let confirmedDonorId = 0;

  const updatedResponses = target.responses.map((resp) => {
    if (resp.id === responseId) {
      confirmedDonorName = resp.donorName;
      confirmedDonorId = resp.donorUserId;
      return { ...resp, status: 'confirmed_donated' as const };
    }
    return resp;
  });

  const confirmedCount = updatedResponses.filter((r) => r.status === 'confirmed_donated').length;
  const nextUnitsFulfilled = Math.min(target.unitsRequired, Math.max(target.unitsFulfilled, confirmedCount));
  const nextStatus: BloodRequestStatus =
    nextUnitsFulfilled >= target.unitsRequired ? 'Fulfilled' : 'Donation Confirmed';

  const updatedRequest: BloodEmergencyRequest = {
    ...target,
    unitsFulfilled: nextUnitsFulfilled,
    status: nextStatus,
    updatedAt: 'Just now',
    responses: updatedResponses,
  };

  requests[idx] = updatedRequest;
  saveBloodRequests(requests);

  // Also update donor's lastDonationDate & history if registered
  if (confirmedDonorId) {
    const donors = loadBloodDonors();
    const dIdx = donors.findIndex((d) => d.userId === confirmedDonorId);
    if (dIdx > -1) {
      const todayIso = new Date().toISOString().slice(0, 10);
      donors[dIdx] = {
        ...donors[dIdx],
        availability: 'on_cooldown',
        lastDonationDate: todayIso,
        donationHistory: [
          {
            id: `dh-${Date.now()}`,
            date: todayIso,
            hospital: target.hospitalName,
            location: target.hospitalArea,
            units: 1,
            notes: `Donated for ${target.bloodGroup} request (${target.patientRelation || 'NDC Alumni Network'})`,
          },
          ...(donors[dIdx].donationHistory || []),
        ],
        updatedAt: 'Just now',
      };
      saveBloodDonors(donors);
    }
  }

  pushPortalNotification({
    title:
      nextStatus === 'Fulfilled'
        ? `✅ Blood Request Fulfilled (${target.bloodGroup} at ${target.hospitalName})`
        : `🩸 Donation Confirmed from ${confirmedDonorName}`,
    message:
      nextStatus === 'Fulfilled'
        ? `All ${target.unitsRequired} unit(s) of ${target.bloodGroup} at ${target.hospitalName} have been confirmed and fulfilled.`
        : `${confirmedDonorName}'s blood donation at ${target.hospitalName} has been confirmed (${nextUnitsFulfilled}/${target.unitsRequired} units).`,
    type: 'blood',
    targetRoute: 'emergency',
    bloodRequestId: target.id,
  });

  return updatedRequest;
}

/**
 * Update blood request status (Requester or Admin/Moderation actions:
 * Verify & Activate, Donor Found, Donation Confirmed, Fulfilled, Cancelled, Expired).
 */
export function updateBloodRequestStatus(
  requestId: string,
  newStatus: BloodRequestStatus,
  actor: AlumniProfile,
  options?: { isModeratorMode?: boolean; moderationNote?: string }
): BloodEmergencyRequest {
  const requests = loadBloodRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) {
    throw new Error('Blood request not found.');
  }

  const target = requests[idx];
  const isMod = Boolean(options?.isModeratorMode);
  if (!canModifyBloodRequest(target, actor, isMod)) {
    throw new Error('Unauthorized: Only the requester or a verified moderator can change this request status.');
  }

  const updatedRequest: BloodEmergencyRequest = {
    ...target,
    status: newStatus,
    unitsFulfilled: newStatus === 'Fulfilled' ? target.unitsRequired : target.unitsFulfilled,
    updatedAt: 'Just now',
    moderationNote: options?.moderationNote
      ? sanitizeInputText(options.moderationNote, 200)
      : target.moderationNote,
    verifiedByAdmin:
      newStatus === 'Active' && target.status === 'Pending Verification'
        ? `${actor.fullName} (Batch ${actor.batchYear})`
        : target.verifiedByAdmin,
  };

  requests[idx] = updatedRequest;
  saveBloodRequests(requests);

  pushPortalNotification({
    title: `🩸 Blood Request Status Updated: ${newStatus}`,
    message: `${target.bloodGroup} request at ${target.hospitalName} is now marked as "${newStatus}" by ${actor.fullName}.`,
    type: 'blood',
    targetRoute: 'emergency',
    bloodRequestId: target.id,
  });

  return updatedRequest;
}
