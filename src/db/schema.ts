import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Authenticated Users table (linked to Firebase Auth UID)
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(), // Firebase Auth UID
    email: text('email').notNull(),
    fullName: text('full_name').default('Notredamian Alumnus').notNull(),
    role: text('role').default('member').notNull(), // 'member' | 'moderator' | 'admin'
    accountStatus: text('account_status').default('active').notNull(), // 'active' | 'suspended' | 'restricted'
    lastLoginAt: timestamp('last_login_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_role').on(table.role),
  ]
);

// 2. Academic Stream & Group Configuration Reference Table
export const academicStreamGroups = pgTable(
  'academic_stream_groups',
  {
    id: serial('id').primaryKey(),
    stream: text('stream').notNull(), // 'Science' | 'Humanities' | 'Business Studies'
    groupCode: text('group_code'), // NULL for Science metadata row; 'G','H','L','W' for Humanities; 'A'..'F' for Business Studies
    expectedGroupCount: smallint('expected_group_count').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_stream_groups_stream').on(table.stream),
  ]
);

// 3. High-Scale Alumni Profiles Table (Optimized for 100k+ records)
export const alumniProfiles = pgTable(
  'alumni_profiles',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid').unique(), // Optional link to Firebase Auth user.uid
    fullName: text('full_name').notNull(),
    avatarUrl: text('avatar_url').notNull(),
    coverUrl: text('cover_url'),
    batchYear: integer('batch_year').notNull(),
    session: text('session'),
    collegeRoll: text('college_roll'), // Protected PII: server-side controlled
    academicStream: text('academic_stream').default('Science').notNull(), // 'Science' | 'Humanities' | 'Business Studies'
    academicGroup: text('academic_group'), // Validated against academic_stream_groups
    section: text('section'),
    verificationStatus: text('verification_status').default('pending_vouch').notNull(), // 'verified' | 'pending_vouch' | 'unverified'
    verificationMethod: text('verification_method').default('two_vouches').notNull(), // 'two_vouches' | 'id_card_upload' | 'souvenir_photo' | 'admin_verified'
    vouchesCount: integer('vouches_count').default(0).notNull(),
    vouchTargetCount: integer('vouch_target_count').default(2).notNull(),
    verifiedByAdmin: text('verified_by_admin'),
    adminReviewNote: text('admin_review_note'),
    verificationDate: text('verification_date'),
    profession: text('profession').default('').notNull(),
    position: text('position').default('').notNull(),
    institution: text('institution').default('').notNull(),
    cadre: text('cadre'),
    specialty: jsonb('specialty').$type<string[]>().default([]).notNull(),
    degree: jsonb('degree').$type<string[]>().default([]).notNull(),
    city: text('city').default('').notNull(),
    country: text('country').default('Bangladesh').notNull(),
    latitude: text('latitude'),
    longitude: text('longitude'),
    // Protected Contact PII (Never exposed in public unverified queries)
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    email: text('email'),
    passwordHash: text('password_hash'),
    fbLink: text('fb_link'),
    bio: text('bio'),
    bloodGroup: text('blood_group'), // 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
    isRegisteredDonor: boolean('is_registered_donor').default(false).notNull(),
    donorAvailability: text('donor_availability').default('available').notNull(), // 'available' | 'on_cooldown' | 'unavailable'
    preferredArea: text('preferred_area').default(''),
    lastDonationDate: text('last_donation_date'),
    role: text('role').default('member').notNull(), // 'member' | 'moderator' | 'admin'
    accountStatus: text('account_status').default('active').notNull(), // 'active' | 'suspended' | 'flagged'
    isPublic: boolean('is_public').default(true).notNull(),
    postsCount: integer('posts_count').default(0).notNull(),
    badges: jsonb('badges').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_alumni_batch_year').on(table.batchYear),
    index('idx_alumni_verification_status').on(table.verificationStatus),
    index('idx_alumni_stream_group').on(table.academicStream, table.academicGroup),
    index('idx_alumni_blood_group').on(table.bloodGroup, table.isRegisteredDonor),
    index('idx_alumni_city').on(table.city),
    index('idx_alumni_role').on(table.role),
    index('idx_alumni_account_status').on(table.accountStatus),
    index('idx_alumni_created_at').on(table.createdAt),
  ]
);

// 4. Verification & Document Submissions Queue (Admin & Moderator Review)
export const verificationSubmissions = pgTable(
  'verification_submissions',
  {
    id: serial('id').primaryKey(),
    submissionCode: text('submission_code').notNull().unique(),
    profileId: integer('profile_id')
      .references(() => alumniProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    fullName: text('full_name').notNull(),
    avatarUrl: text('avatar_url').notNull(),
    batchYear: integer('batch_year').notNull(),
    collegeRoll: text('college_roll').notNull(),
    academicStream: text('academic_stream').default('Science').notNull(),
    academicGroup: text('academic_group'),
    phone: text('phone'),
    email: text('email'),
    docType: text('doc_type').notNull(), // 'id_card' | 'nid_card' | 'hsc_slip' | 'souvenir'
    docTypeLabel: text('doc_type_label').notNull(),
    documentUrl: text('document_url').notNull(),
    vouchesCount: integer('vouches_count').default(0).notNull(),
    targetVouches: integer('target_vouches').default(2).notNull(),
    status: text('status').default('pending').notNull(), // 'pending' | 'approved' | 'rejected'
    reviewedBy: text('reviewed_by'),
    reviewedAt: timestamp('reviewed_at'),
    adminNote: text('admin_note'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_verif_sub_status').on(table.status),
    index('idx_verif_sub_batch').on(table.batchYear),
    index('idx_verif_sub_profile').on(table.profileId),
  ]
);

// 5. Blood Emergency Requests Table
export const bloodEmergencyRequests = pgTable(
  'blood_emergency_requests',
  {
    id: serial('id').primaryKey(),
    requestCode: text('request_code').notNull().unique(),
    bloodGroup: text('blood_group').notNull(),
    unitsRequired: integer('units_required').default(1).notNull(),
    unitsFulfilled: integer('units_fulfilled').default(0).notNull(),
    hospitalName: text('hospital_name').notNull(),
    hospitalArea: text('hospital_area').notNull(),
    city: text('city').default('Dhaka').notNull(),
    requiredDateTime: text('required_date_time').notNull(),
    emergencyLevel: text('emergency_level').default('urgent').notNull(), // 'critical' | 'urgent' | 'standard'
    contactMethod: text('contact_method').default('Portal Secure Coordination').notNull(),
    description: text('description').notNull(),
    requesterId: integer('requester_id').notNull(),
    requesterName: text('requester_name').notNull(),
    requesterAvatar: text('requester_avatar').notNull(),
    requesterBatch: integer('requester_batch').notNull(),
    status: text('status').default('Active').notNull(), // 'Pending Verification' | 'Active' | 'Donor Found' | 'Fulfilled' | 'Cancelled'
    verifiedByAdmin: text('verified_by_admin'),
    moderationNote: text('moderation_note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_blood_req_status').on(table.status),
    index('idx_blood_req_group').on(table.bloodGroup),
  ]
);

// 6. Official Institutional Notices & Broadcasts
export const officialNotices = pgTable(
  'official_notices',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    category: text('category').default('General').notNull(), // 'Reunion' | 'Security' | 'Verification' | 'Emergency' | 'General'
    content: text('content').notNull(),
    targetBatch: integer('target_batch'), // NULL = all batches
    isPinned: boolean('is_pinned').default(false).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    authorName: text('author_name').default('NDC Alumni Secretariat').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_notices_published').on(table.isPublished, table.isPinned),
  ]
);

// 7. Immutable Security & Admin Audit Logs
export const securityAuditLogs = pgTable(
  'security_audit_logs',
  {
    id: serial('id').primaryKey(),
    actorUid: text('actor_uid').notNull(),
    actorEmail: text('actor_email').notNull(),
    actorRole: text('actor_role').notNull(),
    action: text('action').notNull(), // e.g., 'VERIFY_PROFILE', 'REJECT_DOC', 'ROLE_CHANGE', 'SUSPEND_PROFILE', 'PII_ACCESS'
    targetType: text('target_type').notNull(), // 'alumni_profile' | 'verification_submission' | 'blood_request' | 'stream_config' | 'notice'
    targetId: text('target_id').notNull(),
    severity: text('severity').default('info').notNull(), // 'info' | 'warning' | 'critical'
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_created_at').on(table.createdAt),
    index('idx_audit_action').on(table.action),
    index('idx_audit_severity').on(table.severity),
  ]
);

// Relations
export const alumniProfilesRelations = relations(alumniProfiles, ({ many }) => ({
  verificationSubmissions: many(verificationSubmissions),
}));

export const verificationSubmissionsRelations = relations(verificationSubmissions, ({ one }) => ({
  profile: one(alumniProfiles, {
    fields: [verificationSubmissions.profileId],
    references: [alumniProfiles.id],
  }),
}));
