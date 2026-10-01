export type ThemeId = 'light' | 'dark' | 'ndc-blue' | 'midnight';

export type ThemeMode = 'light' | 'dark';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  tagline: string;
  isDark: boolean;
  category: 'light' | 'dark';
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
    textPreview: string;
  };
  palette: string[];
}

export type VerificationStatus = 'verified' | 'pending_vouch' | 'unverified';
export type VerificationMethod = 'two_vouches' | 'id_card_upload' | 'souvenir_photo' | 'admin_verified';
export type VerificationDocType = 'id_card' | 'nid_card' | 'hsc_slip' | 'souvenir';

export interface AdminDocSubmission {
  id: string;
  userId: number;
  fullName: string;
  avatarUrl: string;
  batchYear: number;
  collegeRoll: string;
  group: string;
  phone?: string;
  email?: string;
  docType: VerificationDocType;
  docTypeLabel: string;
  documentUrl: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  adminNote?: string;
  vouchLink?: string;
}

export interface VouchItem {
  id: string;
  voucherId: number;
  voucherName: string;
  voucherAvatar: string;
  voucherBatch: number;
  date: string;
  comment?: string;
}

export interface VouchRequest {
  id: string;
  requesterId: number;
  requesterName: string;
  requesterAvatar: string;
  batchYear: number;
  collegeRoll: string;
  group: 'Science' | 'Business Studies' | 'Humanities' | string;
  section?: string;
  profession?: string;
  city?: string;
  createdAt: string;
  status: 'pending' | 'verified' | 'declined';
  vouches: VouchItem[];
  targetVouches: number;
  idProofUrl?: string;
  idDocType?: VerificationDocType;
  adminNote?: string;
  message?: string;
}

export interface AlumniProfile {
  id: number;
  userId: number;
  fullName: string;
  avatarUrl: string;
  coverUrl?: string;
  batchYear: number;
  session?: string;
  collegeRoll?: string;
  group?: 'Science' | 'Business Studies' | 'Humanities' | string;
  section?: string;
  verificationStatus?: VerificationStatus;
  verificationMethod?: VerificationMethod;
  verifiedBy?: string[];
  vouchedBy?: { id?: number; name: string; batchYear: number; collegeRoll?: string; timestamp?: string }[];
  vouchedForIds?: number[];
  vouchesCount?: number;
  vouchTargetCount?: number;
  idProofUrl?: string;
  idDocType?: VerificationDocType;
  idSubmissionStatus?: 'pending' | 'approved' | 'rejected';
  adminReviewNote?: string;
  verificationDate?: string;
  profession: string;
  position: string;
  institution: string;
  cadre?: string;
  specialty: string[];
  specialtyOther?: string;
  degree: string[];
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  whatsapp?: string;
  fbLink?: string;
  phone?: string;
  email?: string;
  bio?: string;
  careerHistory?: string[];
  isPublic: boolean;
  online: boolean;
  lastSeen?: string;
  postsCount?: number;
  badges?: string[];
  bloodGroup?: BloodGroup;
  bloodDonorProfile?: {
    isRegisteredDonor: boolean;
    availability: BloodDonorAvailability;
    preferredArea: string;
    lastDonationDate?: string;
    emergencyAlertPreference: BloodAlertPreference;
    donationHistory?: BloodDonationHistoryItem[];
  };
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export const BLOOD_GROUPS_LIST: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export type BloodDonorAvailability = 'available' | 'on_cooldown' | 'unavailable';

export type BloodAlertPreference = 'all_urgent' | 'same_area_only' | 'critical_only' | 'paused';

export type BloodEmergencyLevel = 'critical' | 'urgent' | 'standard';

export type BloodRequestStatus =
  | 'Pending Verification'
  | 'Active'
  | 'Donor Found'
  | 'Donation Confirmed'
  | 'Fulfilled'
  | 'Cancelled'
  | 'Expired';

export type BloodContactMethod =
  | 'Portal Secure Coordination'
  | 'Hospital Blood Bank Desk'
  | 'Batch Coordinator Relay'
  | 'Attendant Emergency Line';

export interface BloodDonationHistoryItem {
  id: string;
  date: string;
  hospital: string;
  location?: string;
  units?: number;
  notes?: string;
}

export interface BloodDonorProfile {
  userId: number;
  fullName: string;
  avatarUrl: string;
  batchYear: number;
  profession?: string;
  institution?: string;
  verificationStatus?: VerificationStatus;
  bloodGroup: BloodGroup;
  isRegisteredDonor: boolean;
  availability: BloodDonorAvailability;
  preferredArea: string;
  city: string;
  lastDonationDate?: string;
  emergencyAlertPreference: BloodAlertPreference;
  donationHistory: BloodDonationHistoryItem[];
  updatedAt: string;
}

export interface BloodDonorResponse {
  id: string;
  requestId: string;
  donorUserId: number;
  donorName: string;
  donorAvatar: string;
  donorBatchYear: number;
  donorBloodGroup: BloodGroup;
  donorPreferredArea: string;
  respondedAt: string;
  status: 'offered' | 'accepted' | 'confirmed_donated' | 'declined';
  note?: string;
}

export interface BloodEmergencyRequest {
  id: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalName: string;
  hospitalArea: string;
  city: string;
  requiredDateTime: string;
  emergencyLevel: BloodEmergencyLevel;
  contactMethod: BloodContactMethod;
  coordinationRef?: string;
  description: string;
  patientRelation?: string;
  requesterId: number;
  requesterName: string;
  requesterAvatar: string;
  requesterBatch: number;
  requesterVerified?: boolean;
  status: BloodRequestStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  responses: BloodDonorResponse[];
  moderationNote?: string;
  verifiedByAdmin?: string;
}

export interface PostComment {
  id: number;
  postId: number;
  userId: number;
  fullName: string;
  avatarUrl: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  replies?: PostComment[];
}

export interface PostItem {
  id: number;
  userId: number;
  fullName: string;
  avatarUrl: string;
  batchYear: number;
  content: string;
  images: string[];
  videos?: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  likedByMe: boolean;
  comments: PostComment[];
  category?: 'General Update' | 'Tech & Innovation' | 'Professional Insights' | 'Reunion' | 'Achievement';
  isEdited?: boolean;
  isSaved?: boolean;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  timeAgo: string;
  unread: boolean;
  type: 'like' | 'comment' | 'post' | 'system' | 'blood';
  targetRoute?: string;
  bloodRequestId?: string;
}

export interface BatchSummary {
  batchYear: number;
  session: string;
  total: number;
  representative?: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption?: string;
  uploaderName?: string;
  uploaderAvatar?: string;
  batchYear?: number;
  uploadedAt?: string;
  likesCount?: number;
  likedByMe?: boolean;
  tags?: string[];
  mediaType?: 'image' | 'video';
  fileSize?: string;
}

export interface GalleryAlbum {
  id: number;
  title: string;
  description?: string;
  category: 'reunion' | 'academic' | 'campus' | 'convocation' | 'sports' | 'cultural' | 'all';
  date: string;
  location?: string;
  batchYear?: number;
  photosCount: number;
  coverUrl: string;
  photos: GalleryPhoto[];
  createdBy?: string;
  createdDate?: string;
}

export const SPECIALTIES_LIST = [
  'Computer Science & Software', 'Artificial Intelligence & Data', 'Electrical & Electronic Engineering',
  'Civil & Structural Engineering', 'Mechanical & Robotics', 'Industrial & Production Engineering',
  'Chemical & Materials Engineering', 'Biomedical & Biotechnology', 'Aeronautical & Marine Engineering',
  'Telecommunications & Networks', 'Cybersecurity & Cloud', 'Energy & Sustainable Systems',
  'Medicine, Surgery & Healthcare', 'Public Health & Epidemiology', 'Pharmaceutical Sciences',
  'Business Administration & Management', 'Finance, Banking & Investment', 'Chartered Accountancy & Audit',
  'Supply Chain & Operations', 'Marketing & Brand Strategy', 'Economics & Development Policy',
  'Entrepreneurship & Startups', 'Physics & Physical Sciences', 'Mathematics & Statistics',
  'Chemistry & Environmental Science', 'Civil Service & Administration (BCS)', 'Foreign Affairs & Diplomacy',
  'Constitutional & Corporate Law', 'Architecture & Urban Planning', 'Higher Education & Research',
  'Journalism & Media Communications', 'Defense & Strategic Leadership', 'Literature & Creative Arts',
  'Others'
];

export const DEGREES_LIST = [
  'HSC', 'BSc Engineering', 'BSc', 'MSc', 'BBA', 'MBA', 'EMBA',
  'MBBS', 'BDS', 'MD', 'MS', 'FCPS', 'MRCP', 'MRCS', 'MPH',
  'PhD', 'PostDoc', 'MPhil', 'B.Arch', 'M.Arch',
  'LLB', 'LLM', 'Barrister-at-Law', 'B.Pharm', 'M.Pharm',
  'BA', 'MA', 'BSS', 'MSS', 'BCom', 'MCom',
  'CA / ACA', 'FCA', 'ACCA', 'CFA', 'CMA', 'CS',
  'BCS', 'PGD', 'Diploma', 'Others'
];
