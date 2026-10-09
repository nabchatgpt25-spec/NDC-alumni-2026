import {
  AcademicStreamType,
  UserRole,
  VerificationDocType,
  VerificationMethod,
  VerificationStatus,
} from '../../types';

export type AdminSectionId =
  | 'overview'
  | 'verifications'
  | 'documents'
  | 'alumni'
  | 'batches'
  | 'streams-groups'
  | 'posts'
  | 'blood'
  | 'notices'
  | 'gallery'
  | 'inquiries'
  | 'audit-logs';

export interface AcademicStreamGroupRow {
  id: number;
  stream: AcademicStreamType;
  group_code: string | null;
  expected_group_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatchRow {
  batch_year: number;
  session: string | null;
  hsc_year: number | null;
  special_note: string | null;
  representative_name: string | null;
  representative_profile_id: number | null;
  registered_count: number;
  estimated_total: number | null;
  created_at: string;
  updated_at: string;
}

export interface AlumniProfileRow {
  id: number;
  auth_user_id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string;
  cover_url: string | null;
  batch_year: number;
  session: string | null;
  academic_stream: AcademicStreamType | null;
  academic_group: string | null;
  section: string | null;
  verification_status: VerificationStatus;
  verification_method: VerificationMethod | null;
  vouches_count: number;
  vouch_target_count: number;
  verified_at: string | null;
  verified_by_profile_id: number | null;
  profession: string;
  position: string;
  institution: string;
  cadre: string | null;
  specialty: string[];
  specialty_other: string | null;
  degree: string[];
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  bio: string | null;
  career_history: string[];
  badges: string[];
  blood_group: string | null;
  is_public: boolean;
  show_contact_to_verified: boolean;
  phone_ownership_verified?: boolean;
  phone_verified_at?: string | null;
  phone_verified_by_profile_id?: number | null;
  phone_verification_notes?: string | null;
  posts_count: number;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlumniContactDetailsRow {
  profile_id: number;
  email: string | null;
  phone: string | null;
  phone_ownership_verified?: boolean;
  phone_verified_at?: string | null;
  phone_verified_by_profile_id?: number | null;
  phone_verification_notes?: string | null;
  whatsapp: string | null;
  fb_link: string | null;
  college_roll: string | null;
}

export interface VerificationRequestRow {
  id: string;
  requester_id: number;
  batch_year: number;
  college_roll: string;
  academic_stream: AcademicStreamType;
  academic_group: string | null;
  section: string | null;
  message: string | null;
  status: 'pending' | 'verified' | 'declined';
  target_vouches: number;
  current_vouches: number;
  id_doc_submission_id: string | null;
  admin_note: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeerVouchRow {
  id: string;
  verification_request_id: string;
  requester_id: number;
  voucher_id: number;
  voucher_batch: number;
  comment: string | null;
  created_at: string;
}

export interface AdminDocSubmissionRow {
  id: string;
  user_id: number;
  batch_year: number;
  college_roll: string;
  academic_stream: AcademicStreamType;
  academic_group: string | null;
  doc_type: VerificationDocType;
  doc_type_label: string;
  storage_object_path: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  reviewed_at: string | null;
  admin_note: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface PostRow {
  id: number;
  author_id: number;
  content: string;
  category:
    | 'General Update'
    | 'Tech & Innovation'
    | 'Professional Insights'
    | 'Reunion'
    | 'Achievement';
  images: string[];
  videos: string[];
  likes_count: number;
  comments_count: number;
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostCommentRow {
  id: number;
  post_id: number;
  parent_comment_id: number | null;
  user_id: number;
  content: string;
  likes_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BloodDonorRow {
  user_id: number;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  is_registered_donor: boolean;
  availability: 'available' | 'on_cooldown' | 'unavailable';
  preferred_area: string;
  city: string;
  last_donation_date: string | null;
  emergency_alert_preference: 'all_urgent' | 'same_area_only' | 'critical_only' | 'paused';
  donation_history: any[];
  created_at: string;
  updated_at: string;
}

export interface BloodRequestRow {
  id: string;
  requester_id: number;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  units_required: number;
  units_fulfilled: number;
  hospital_name: string;
  hospital_area: string;
  city: string;
  required_datetime: string;
  emergency_level: 'critical' | 'urgent' | 'standard';
  contact_method:
    | 'Portal Secure Coordination'
    | 'Hospital Blood Bank Desk'
    | 'Batch Coordinator Relay'
    | 'Attendant Emergency Line';
  coordination_ref: string | null;
  description: string;
  patient_relation: string | null;
  status:
    | 'Pending Verification'
    | 'Active'
    | 'Donor Found'
    | 'Donation Confirmed'
    | 'Fulfilled'
    | 'Cancelled'
    | 'Expired';
  moderation_note: string | null;
  verified_by_admin_id: number | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface BloodRequestResponseRow {
  id: string;
  request_id: string;
  donor_user_id: number;
  status: 'offered' | 'accepted' | 'confirmed_donated' | 'declined';
  note: string | null;
  responded_at: string;
  updated_at: string;
}

export interface OfficialNoticeRow {
  id: string;
  ref_no: string;
  title: string;
  category: 'Membership' | 'Reunion' | 'Scholarship' | 'General' | 'AGM';
  published_date: string;
  is_urgent: boolean;
  summary: string;
  full_content: string;
  pdf_url: string | null;
  file_size: string | null;
  signatory_name: string;
  signatory_designation: string;
  signatory_organization: string;
  created_by: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryAlbumRow {
  id: number;
  title: string;
  description: string | null;
  category: 'reunion' | 'academic' | 'campus' | 'convocation' | 'sports' | 'cultural' | 'all';
  event_date_label: string;
  location: string | null;
  batch_year: number | null;
  cover_url: string;
  photos_count: number;
  created_by_id: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryPhotoRow {
  id: string;
  album_id: number;
  uploader_id: number | null;
  url: string;
  storage_object_path: string | null;
  caption: string | null;
  batch_year: number | null;
  tags: string[];
  media_type: 'image' | 'video';
  file_size: string | null;
  likes_count: number;
  is_approved: boolean;
  uploaded_at: string;
}

export interface ContactInquiryRow {
  id: string;
  sender_profile_id: number | null;
  name: string;
  batch_year: number | null;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'archived';
  handled_by: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: number;
  actor_profile_id: number | null;
  actor_auth_id: string | null;
  actor_role: UserRole | null;
  action: string;
  entity_table: string;
  entity_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  reason: string | null;
  created_at: string;
}
