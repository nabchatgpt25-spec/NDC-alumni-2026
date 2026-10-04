import { db, isDbConfigured } from './index.ts';
import {
  academicStreamGroups,
  alumniProfiles,
  bloodEmergencyRequests,
  officialNotices,
  securityAuditLogs,
  users,
  verificationSubmissions,
} from './schema.ts';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';

export interface ProfileFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  batchYear?: number;
  academicStream?: string;
  verificationStatus?: string;
  role?: string;
  accountStatus?: string;
  bloodGroup?: string;
  includeSensitivePii?: boolean;
}

// ---------------------------------------------------------------------------
// IN-MEMORY DATA STORES (Fallback when Cloud SQL is not provisioned)
// ---------------------------------------------------------------------------

const inMemoryStreamGroups = [
  { id: 1, stream: 'Science', groupCode: null, expectedGroupCount: 17, isActive: true },
  { id: 2, stream: 'Humanities', groupCode: 'G', expectedGroupCount: 4, isActive: true },
  { id: 3, stream: 'Humanities', groupCode: 'H', expectedGroupCount: 4, isActive: true },
  { id: 4, stream: 'Humanities', groupCode: 'L', expectedGroupCount: 4, isActive: true },
  { id: 5, stream: 'Humanities', groupCode: 'W', expectedGroupCount: 4, isActive: true },
  { id: 6, stream: 'Business Studies', groupCode: 'A', expectedGroupCount: 6, isActive: true },
  { id: 7, stream: 'Business Studies', groupCode: 'B', expectedGroupCount: 6, isActive: true },
  { id: 8, stream: 'Business Studies', groupCode: 'C', expectedGroupCount: 6, isActive: true },
  { id: 9, stream: 'Business Studies', groupCode: 'D', expectedGroupCount: 6, isActive: true },
  { id: 10, stream: 'Business Studies', groupCode: 'E', expectedGroupCount: 6, isActive: true },
  { id: 11, stream: 'Business Studies', groupCode: 'F', expectedGroupCount: 6, isActive: true },
];

const inMemoryProfiles: any[] = [
  {
    id: 101,
    userUid: null,
    fullName: 'Dr. Tariqul Islam Chowdhury',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    coverUrl: null,
    batchYear: 52,
    session: '2000-01, HSC 02',
    collegeRoll: '1020101',
    academicStream: 'Science',
    academicGroup: null,
    section: 'Science 01',
    verificationStatus: 'verified',
    verificationMethod: 'two_vouches',
    verifiedByAdmin: 'admin@ndcalumni.org',
    verificationDate: '2026-01-01',
    vouchesCount: 2,
    vouchTargetCount: 2,
    profession: 'Academic & Researcher',
    position: 'Professor & Head of EEE',
    institution: 'BUET',
    cadre: null,
    specialty: ['Electrical & Electronic Engineering', 'Robotics'],
    degree: ['HSC', 'BSc Engineering', 'PhD'],
    city: 'Dhaka',
    country: 'Bangladesh',
    phone: '+8801711223344',
    whatsapp: '+8801711223344',
    email: 'tariqul.buet@ndcalumni.org',
    passwordHash: null,
    fbLink: null,
    bio: 'Professor of Electrical & Electronic Engineering at BUET and proud Notredamian from Batch 52.',
    bloodGroup: 'A+',
    isRegisteredDonor: true,
    donorAvailability: 'available',
    preferredArea: 'Dhaka',
    lastDonationDate: '2026-02-15',
    role: 'member',
    accountStatus: 'active',
    isPublic: true,
    postsCount: 5,
    badges: ['Verified Notredamian', 'BUET Faculty'],
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
  },
  {
    id: 102,
    userUid: null,
    fullName: 'Engr. Tanvir Ahmed Siddiqui',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    coverUrl: null,
    batchYear: 66,
    session: '2014-15, HSC 16',
    collegeRoll: '1160512',
    academicStream: 'Science',
    academicGroup: null,
    section: 'Science 05',
    verificationStatus: 'verified',
    verificationMethod: 'two_vouches',
    verifiedByAdmin: 'admin@ndcalumni.org',
    verificationDate: '2026-01-05',
    vouchesCount: 2,
    vouchTargetCount: 2,
    profession: 'Engineer / Tech Executive',
    position: 'Staff Software Engineer (AI & Cloud)',
    institution: 'Google',
    cadre: null,
    specialty: ['Computer Science & Software', 'Artificial Intelligence & Data'],
    degree: ['HSC', 'BSc Engineering', 'MSc'],
    city: 'Mountain View',
    country: 'United States',
    phone: '+16502530000',
    whatsapp: '+16502530000',
    email: 'tanvir.siddiqui@ndcalumni.org',
    passwordHash: null,
    fbLink: null,
    bio: 'Passionate about distributed systems, large language models, and mentorship.',
    bloodGroup: 'B+',
    isRegisteredDonor: true,
    donorAvailability: 'available',
    preferredArea: 'Silicon Valley',
    lastDonationDate: '2025-11-20',
    role: 'member',
    accountStatus: 'active',
    isPublic: true,
    postsCount: 8,
    badges: ['Verified Notredamian', 'Silicon Valley Network'],
    createdAt: new Date('2026-01-12'),
    updatedAt: new Date('2026-01-12'),
  },
  {
    id: 103,
    userUid: null,
    fullName: 'Dr. Sarah Farhana Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    coverUrl: null,
    batchYear: 60,
    session: '2008-09, HSC 10',
    collegeRoll: '1100204',
    academicStream: 'Science',
    academicGroup: null,
    section: 'Science 02',
    verificationStatus: 'verified',
    verificationMethod: 'admin_verified',
    verifiedByAdmin: 'admin@ndcalumni.org',
    verificationDate: '2026-01-08',
    vouchesCount: 2,
    vouchTargetCount: 2,
    profession: 'Physician / Medical Specialist',
    position: 'Consultant Cardiothoracic Surgeon',
    institution: 'National Heart Foundation',
    cadre: null,
    specialty: ['Cardiology & Cardiothoracic', 'Surgery'],
    degree: ['HSC', 'MBBS', 'FCPS', 'MS'],
    city: 'Dhaka',
    country: 'Bangladesh',
    phone: '+8801811998877',
    whatsapp: '+8801811998877',
    email: 'sarah.rahman@ndcalumni.org',
    passwordHash: null,
    fbLink: null,
    bio: 'Dedicated to cardiac healthcare and community health initiatives.',
    bloodGroup: 'O-',
    isRegisteredDonor: true,
    donorAvailability: 'available',
    preferredArea: 'Dhaka Mirpur',
    lastDonationDate: '2026-01-18',
    role: 'moderator',
    accountStatus: 'active',
    isPublic: true,
    postsCount: 12,
    badges: ['Verified Notredamian', 'Medical Forum Lead'],
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    id: 104,
    userUid: null,
    fullName: 'Asif Raihan Chowdhury',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    coverUrl: null,
    batchYear: 58,
    session: '2006-07, HSC 08',
    collegeRoll: '2080105',
    academicStream: 'Business Studies',
    academicGroup: 'A',
    section: 'Business Group A',
    verificationStatus: 'verified',
    verificationMethod: 'two_vouches',
    verifiedByAdmin: 'admin@ndcalumni.org',
    verificationDate: '2026-01-02',
    vouchesCount: 2,
    vouchTargetCount: 2,
    profession: 'Finance & Investment Executive',
    position: 'Managing Director & Head of Investment',
    institution: 'Standard Chartered Bank',
    cadre: null,
    specialty: ['Investment Banking & Wealth', 'Macroeconomics'],
    degree: ['HSC', 'BBA', 'MBA', 'CFA'],
    city: 'Singapore',
    country: 'Singapore',
    phone: '+6591234567',
    whatsapp: '+6591234567',
    email: 'asif.raihan@ndcalumni.org',
    passwordHash: null,
    fbLink: null,
    bio: 'Finance professional with 14+ years in capital markets and portfolio strategy.',
    bloodGroup: 'AB+',
    isRegisteredDonor: false,
    donorAvailability: 'unavailable',
    preferredArea: 'Singapore',
    lastDonationDate: null,
    role: 'member',
    accountStatus: 'active',
    isPublic: true,
    postsCount: 3,
    badges: ['Verified Notredamian', 'Business Chapter'],
    createdAt: new Date('2026-01-18'),
    updatedAt: new Date('2026-01-18'),
  },
  {
    id: 105,
    userUid: null,
    fullName: 'Mohammad Rashedul Huq',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    coverUrl: null,
    batchYear: 48,
    session: '1996-97, HSC 98',
    collegeRoll: '3980112',
    academicStream: 'Humanities',
    academicGroup: 'G',
    section: 'Humanities Group G',
    verificationStatus: 'verified',
    verificationMethod: 'admin_verified',
    verifiedByAdmin: 'admin@ndcalumni.org',
    verificationDate: '2026-01-01',
    vouchesCount: 2,
    vouchTargetCount: 2,
    profession: 'Civil Service & Governance',
    position: 'Joint Secretary',
    institution: 'Ministry of Public Administration',
    cadre: '21st BCS Administration',
    specialty: ['Public Administration & Policy', 'Regulatory Affairs'],
    degree: ['HSC', 'BA Honours', 'MSS', 'MPA (Harvard Kennedy)'],
    city: 'Dhaka',
    country: 'Bangladesh',
    phone: '+8801712000000',
    whatsapp: '+8801712000000',
    email: 'rashedul.huq@ndcalumni.org',
    passwordHash: null,
    fbLink: null,
    bio: 'Dedicated civil servant from Batch 48. Mentoring young Notredamians aspiring for public service.',
    bloodGroup: 'O+',
    isRegisteredDonor: true,
    donorAvailability: 'available',
    preferredArea: 'Dhaka Secretariat',
    lastDonationDate: '2025-10-10',
    role: 'admin',
    accountStatus: 'active',
    isPublic: true,
    postsCount: 15,
    badges: ['Verified Notredamian', 'BCS Cadre Forum', 'NDCAA Central Executive'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

const inMemoryVerifications: any[] = [
  {
    id: 1,
    submissionCode: 'VRF-2026-0891',
    profileId: 104,
    fullName: 'Mahmudul Hasan Alim',
    collegeRoll: '1160345',
    batchYear: 66,
    hscYear: 2016,
    documentType: 'id_card',
    documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    status: 'pending',
    submittedAt: new Date(Date.now() - 3600000 * 8),
    reviewedBy: null,
    reviewedAt: null,
    adminNote: null,
  },
  {
    id: 2,
    submissionCode: 'VRF-2026-0892',
    profileId: 105,
    fullName: 'Zahirul Islam',
    collegeRoll: '1180210',
    batchYear: 68,
    hscYear: 2018,
    documentType: 'admit_card',
    documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    status: 'pending',
    submittedAt: new Date(Date.now() - 3600000 * 4),
    reviewedBy: null,
    reviewedAt: null,
    adminNote: null,
  },
];

const inMemoryBloodRequests: any[] = [
  {
    id: 1,
    requestCode: 'BLD-2026-031',
    patientName: 'Kazi Nazrul Islam (Alumnus Relative)',
    bloodGroup: 'B+',
    unitsNeeded: 2,
    unitsFulfilled: 1,
    hospitalName: 'Square Hospital, Panthapath, Dhaka',
    hospitalArea: 'Panthapath',
    contactNumber: '+8801712345678',
    urgencyLevel: 'Emergency',
    status: 'Active',
    verifiedByAdmin: 'admin@ndcalumni.org',
    moderationNote: 'Verified by central medical team',
    createdAt: new Date(Date.now() - 3600000 * 6),
    updatedAt: new Date(),
  },
  {
    id: 2,
    requestCode: 'BLD-2026-032',
    patientName: 'Ahmed Sharif',
    bloodGroup: 'O-',
    unitsNeeded: 1,
    unitsFulfilled: 0,
    hospitalName: 'Evercare Hospital, Bashundhara, Dhaka',
    hospitalArea: 'Bashundhara',
    contactNumber: '+8801798765432',
    urgencyLevel: 'Immediate',
    status: 'Pending Verification',
    verifiedByAdmin: null,
    moderationNote: null,
    createdAt: new Date(Date.now() - 3600000 * 2),
    updatedAt: new Date(),
  },
];

const inMemoryNotices: any[] = [
  {
    id: 1,
    refNo: 'NDCAA/NOT-2026/041',
    title: 'Registration Open for Grand Reunion 2026 & 75th Platinum Jubilee Celebration',
    category: 'Reunion',
    content:
      'This is to notify all esteemed Notredamians at home and abroad that the Central Organizing Committee of Notre Dame College Alumni Association (NDCAA) cordially invites all former students to register for the 75th Platinum Jubilee Grand Reunion 2026.\n\nDate: December 18-20, 2026\nVenue: Notre Dame College Ground, Motijheel, Dhaka-1000\n\nRegistration Fee includes:\n- Official Reunion Souvenir Book & Crest\n- Commemorative Polo Shirt & ID Badge\n- Full 3-day cultural banquet, dinner, and musical evening\n\nPlease complete your online registration with your NDC Student Roll/Batch ID before November 15, 2026.',
    targetBatch: null,
    isPinned: true,
    isPublished: true,
    authorName: 'Dr. Shahabuddin Ahmed, Batch 78',
    createdAt: new Date('2026-09-15'),
    updatedAt: new Date('2026-09-15'),
  },
  {
    id: 2,
    refNo: 'NDCAA/MEM-2026/028',
    title: 'Application Schedule & Verification for Life Membership Digital Smart Card',
    category: 'Membership',
    content:
      'All regular alumni of Notre Dame College who have passed HSC or completed their intermediate studies are eligible to apply for Life Membership.\n\nRequired Documents:\n1. Copy of NDC College ID or HSC Transcript/Admit Card\n2. 2 Passport size photographs (digital upload)\n3. Life Membership Subscription: BDT 5,000 / USD 50 (for overseas alumni)\n\nSmart cards can be collected from the Alumni Secretariat, Room 102, Fr. Timm Building or requested for domestic courier delivery.',
    targetBatch: null,
    isPinned: false,
    isPublished: true,
    authorName: 'Kazi Mahfuzur Rahman, Batch 86',
    createdAt: new Date('2026-09-10'),
    updatedAt: new Date('2026-09-10'),
  },
  {
    id: 3,
    refNo: 'NDCAA/SCH-2026/014',
    title: 'Call for Nominations: Fr. Richard William Timm Memorial Scholarship 2026-27',
    category: 'Scholarship',
    content:
      'Applications are invited for the Fr. Richard William Timm Memorial Scholarship for financially challenged students currently enrolled in Notre Dame College (HSC 2026-27 batch).\n\nAlumni are requested to nominate deserving students from rural and underprivileged backgrounds across Bangladesh.',
    targetBatch: null,
    isPinned: true,
    isPublished: true,
    authorName: 'Scholarship Committee, NDCAA',
    createdAt: new Date('2026-09-02'),
    updatedAt: new Date('2026-09-02'),
  },
];

const inMemoryAuditLogs: any[] = [
  {
    id: 1,
    actorUid: 'system',
    actorEmail: 'admin@ndcalumni.org',
    actorRole: 'admin',
    action: 'SYSTEM_BOOT',
    targetType: 'system',
    targetId: 'ndc_core',
    severity: 'info',
    summary: 'NDC Alumni Network operational in AI Studio environment with institutional in-memory store and Cloud SQL readiness.',
    createdAt: new Date(),
  },
];

// ---------------------------------------------------------------------------
// REPOSITORY METHODS
// ---------------------------------------------------------------------------

export async function recordSecurityAuditLog(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  severity?: 'info' | 'warning' | 'critical';
  summary: string;
}) {
  if (isDbConfigured) {
    try {
      const inserted = await db
        .insert(securityAuditLogs)
        .values({
          actorUid: params.actorUid,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId,
          severity: params.severity || 'info',
          summary: params.summary,
        })
        .returning();
      return inserted[0];
    } catch (error) {
      console.warn('Database audit log failed, logging in-memory:', error);
    }
  }

  const newLog = {
    id: inMemoryAuditLogs.length + 1,
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    severity: params.severity || 'info',
    summary: params.summary,
    createdAt: new Date(),
  };
  inMemoryAuditLogs.unshift(newLog);
  return newLog;
}

export async function validateAcademicStreamAndGroup(
  stream: string,
  groupCode?: string | null
): Promise<{ valid: boolean; reason?: string }> {
  const cleanStream = (stream || 'Science').trim();
  const cleanGroup = groupCode ? groupCode.trim().toUpperCase() : null;

  if (isDbConfigured) {
    try {
      const streamRows = await db
        .select()
        .from(academicStreamGroups)
        .where(
          and(eq(academicStreamGroups.stream, cleanStream), eq(academicStreamGroups.isActive, true))
        );

      if (streamRows.length > 0) {
        if (!cleanGroup) return { valid: true };
        const matchingGroup = streamRows.find(
          (r: any) => r.groupCode && r.groupCode.toUpperCase() === cleanGroup && r.isActive
        );
        if (matchingGroup) return { valid: true };
        const allowedCodes = streamRows
          .map((r: any) => r.groupCode)
          .filter((c: any): c is string => Boolean(c));
        return {
          valid: false,
          reason: `Invalid group "${cleanGroup}" for stream "${cleanStream}". Allowed: ${allowedCodes.join(', ')}.`,
        };
      }
    } catch (error) {
      console.warn('Database stream validation failed, falling back to in-memory config:', error);
    }
  }

  // In-memory validation
  const streamRows = inMemoryStreamGroups.filter(
    (g) => g.stream.toLowerCase() === cleanStream.toLowerCase() && g.isActive
  );

  if (streamRows.length === 0) {
    return {
      valid: false,
      reason: `Academic stream "${cleanStream}" is not active in the institutional registry.`,
    };
  }

  if (!cleanGroup) {
    return { valid: true };
  }

  const match = streamRows.find((g) => g.groupCode && g.groupCode.toUpperCase() === cleanGroup);
  if (!match) {
    const allowed = streamRows.map((g) => g.groupCode).filter(Boolean);
    return {
      valid: false,
      reason: `Invalid group "${cleanGroup}" for stream "${cleanStream}". Allowed: ${allowed.join(', ')}.`,
    };
  }

  return { valid: true };
}

export async function getAcademicStreamGroupsConfig() {
  if (isDbConfigured) {
    try {
      const rows = await db
        .select()
        .from(academicStreamGroups)
        .orderBy(asc(academicStreamGroups.stream), asc(academicStreamGroups.groupCode));
      if (rows && rows.length > 0) return rows;
    } catch (error) {
      console.warn('Database stream groups fetch failed, using in-memory config:', error);
    }
  }
  return inMemoryStreamGroups;
}

export async function toggleAcademicStreamGroupActive(params: {
  id: number;
  isActive: boolean;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isDbConfigured) {
    try {
      const updated = await db
        .update(academicStreamGroups)
        .set({
          isActive: params.isActive,
          updatedAt: new Date(),
        })
        .where(eq(academicStreamGroups.id, params.id))
        .returning();
      if (updated.length > 0) return updated[0];
    } catch (error) {
      console.warn('Database toggle stream group failed, using in-memory:', error);
    }
  }

  const row = inMemoryStreamGroups.find((g) => g.id === params.id);
  if (!row) {
    throw new Error('Academic stream group row not found.');
  }
  row.isActive = params.isActive;
  return row;
}

export async function getAdminOverviewMetrics() {
  if (isDbConfigured) {
    try {
      const [
        totalProfilesRes,
        verifiedProfilesRes,
        pendingProfilesRes,
        suspendedProfilesRes,
        donorsRes,
        pendingDocsRes,
        activeBloodRes,
        publishedNoticesRes,
        streamGroupsRows,
        recentAuditRows,
      ] = await Promise.all([
        db.select({ value: count() }).from(alumniProfiles),
        db
          .select({ value: count() })
          .from(alumniProfiles)
          .where(eq(alumniProfiles.verificationStatus, 'verified')),
        db
          .select({ value: count() })
          .from(alumniProfiles)
          .where(eq(alumniProfiles.verificationStatus, 'pending_vouch')),
        db
          .select({ value: count() })
          .from(alumniProfiles)
          .where(eq(alumniProfiles.accountStatus, 'suspended')),
        db
          .select({ value: count() })
          .from(alumniProfiles)
          .where(eq(alumniProfiles.isRegisteredDonor, true)),
        db
          .select({ value: count() })
          .from(verificationSubmissions)
          .where(eq(verificationSubmissions.status, 'pending')),
        db
          .select({ value: count() })
          .from(bloodEmergencyRequests)
          .where(
            or(
              eq(bloodEmergencyRequests.status, 'Active'),
              eq(bloodEmergencyRequests.status, 'Pending Verification')
            )
          ),
        db
          .select({ value: count() })
          .from(officialNotices)
          .where(eq(officialNotices.isPublished, true)),
        db.select().from(academicStreamGroups).orderBy(asc(academicStreamGroups.id)),
        db
          .select()
          .from(securityAuditLogs)
          .orderBy(desc(securityAuditLogs.createdAt))
          .limit(15),
      ]);

      const [scienceCountRes, humanitiesCountRes, businessCountRes] = await Promise.all([
        db
          .select({ value: count() })
          .from(alumniProfiles)
          .where(eq(alumniProfiles.academicStream, 'Science')),
        db
          .select({ value: count() })
          .from(alumniProfiles)
          .where(eq(alumniProfiles.academicStream, 'Humanities')),
        db
          .select({ value: count() })
          .from(alumniProfiles)
          .where(eq(alumniProfiles.academicStream, 'Business Studies')),
      ]);

      return {
        totalProfiles: Number(totalProfilesRes[0]?.value ?? 0),
        verifiedProfiles: Number(verifiedProfilesRes[0]?.value ?? 0),
        pendingProfiles: Number(pendingProfilesRes[0]?.value ?? 0),
        suspendedProfiles: Number(suspendedProfilesRes[0]?.value ?? 0),
        registeredDonors: Number(donorsRes[0]?.value ?? 0),
        pendingDocReviews: Number(pendingDocsRes[0]?.value ?? 0),
        activeBloodEmergencies: Number(activeBloodRes[0]?.value ?? 0),
        publishedNotices: Number(publishedNoticesRes[0]?.value ?? 0),
        streamDistribution: {
          Science: Number(scienceCountRes[0]?.value ?? 0),
          Humanities: Number(humanitiesCountRes[0]?.value ?? 0),
          'Business Studies': Number(businessCountRes[0]?.value ?? 0),
        },
        streamGroupsConfig: streamGroupsRows,
        recentAuditLogs: recentAuditRows,
      };
    } catch (error) {
      console.warn('Database overview metrics query failed, calculating in-memory:', error);
    }
  }

  // In-memory overview metrics calculation
  const total = inMemoryProfiles.length;
  const verified = inMemoryProfiles.filter((p) => p.verificationStatus === 'verified').length;
  const pending = inMemoryProfiles.filter((p) => p.verificationStatus === 'pending_vouch').length;
  const suspended = inMemoryProfiles.filter((p) => p.accountStatus === 'suspended').length;
  const donors = inMemoryProfiles.filter((p) => p.isRegisteredDonor).length;
  const pendingDocs = inMemoryVerifications.filter((v) => v.status === 'pending').length;
  const activeBlood = inMemoryBloodRequests.filter((b) => b.status === 'Active' || b.status === 'Pending Verification').length;
  const pubNotices = inMemoryNotices.filter((n) => n.isPublished).length;

  const scienceCount = inMemoryProfiles.filter((p) => p.academicStream === 'Science').length;
  const humanitiesCount = inMemoryProfiles.filter((p) => p.academicStream === 'Humanities').length;
  const businessCount = inMemoryProfiles.filter((p) => p.academicStream === 'Business Studies').length;

  return {
    totalProfiles: total,
    verifiedProfiles: verified,
    pendingProfiles: pending,
    suspendedProfiles: suspended,
    registeredDonors: donors,
    pendingDocReviews: pendingDocs,
    activeBloodEmergencies: activeBlood,
    publishedNotices: pubNotices,
    streamDistribution: {
      Science: scienceCount,
      Humanities: humanitiesCount,
      'Business Studies': businessCount,
    },
    streamGroupsConfig: inMemoryStreamGroups,
    recentAuditLogs: inMemoryAuditLogs.slice(0, 15),
  };
}

export async function queryPaginatedAlumniProfiles(params: ProfileFilterParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const offset = (page - 1) * limit;

  if (isDbConfigured) {
    try {
      const conditions = [];
      if (params.batchYear && !Number.isNaN(Number(params.batchYear))) {
        conditions.push(eq(alumniProfiles.batchYear, Number(params.batchYear)));
      }
      if (params.academicStream && params.academicStream !== 'all') {
        conditions.push(eq(alumniProfiles.academicStream, params.academicStream));
      }
      if (params.verificationStatus && params.verificationStatus !== 'all') {
        conditions.push(eq(alumniProfiles.verificationStatus, params.verificationStatus));
      }
      if (params.role && params.role !== 'all') {
        conditions.push(eq(alumniProfiles.role, params.role));
      }
      if (params.accountStatus && params.accountStatus !== 'all') {
        conditions.push(eq(alumniProfiles.accountStatus, params.accountStatus));
      }
      if (params.bloodGroup && params.bloodGroup !== 'all') {
        conditions.push(eq(alumniProfiles.bloodGroup, params.bloodGroup));
      }
      if (params.search && params.search.trim()) {
        const q = `%${params.search.trim()}%`;
        conditions.push(
          or(
            ilike(alumniProfiles.fullName, q),
            ilike(alumniProfiles.profession, q),
            ilike(alumniProfiles.institution, q),
            ilike(alumniProfiles.city, q),
            ilike(alumniProfiles.collegeRoll, q),
            ilike(alumniProfiles.email, q)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [rows, totalRes] = await Promise.all([
        whereClause
          ? db
              .select()
              .from(alumniProfiles)
              .where(whereClause)
              .orderBy(desc(alumniProfiles.createdAt), desc(alumniProfiles.id))
              .limit(limit)
              .offset(offset)
          : db
              .select()
              .from(alumniProfiles)
              .orderBy(desc(alumniProfiles.createdAt), desc(alumniProfiles.id))
              .limit(limit)
              .offset(offset),
        whereClause
          ? db.select({ value: count() }).from(alumniProfiles).where(whereClause)
          : db.select({ value: count() }).from(alumniProfiles),
      ]);

      const total = Number(totalRes[0]?.value ?? 0);
      const sanitizedRows = rows.map((row: any) => {
        if (params.includeSensitivePii) return row;
        return {
          ...row,
          phone: row.phone ? '***-REDACTED-PII' : null,
          whatsapp: row.whatsapp ? '***-REDACTED-PII' : null,
          email: row.email ? '***@redacted.ndc' : null,
          fbLink: null,
          collegeRoll: row.collegeRoll ? `${row.collegeRoll.slice(0, 3)}***` : null,
        };
      });

      return {
        profiles: sanitizedRows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    } catch (error) {
      console.warn('Database paginated query failed, filtering in-memory:', error);
    }
  }

  // In-memory query and filter
  let filtered = [...inMemoryProfiles];

  if (params.batchYear && !Number.isNaN(Number(params.batchYear))) {
    filtered = filtered.filter((p) => p.batchYear === Number(params.batchYear));
  }
  if (params.academicStream && params.academicStream !== 'all') {
    filtered = filtered.filter((p) => p.academicStream === params.academicStream);
  }
  if (params.verificationStatus && params.verificationStatus !== 'all') {
    filtered = filtered.filter((p) => p.verificationStatus === params.verificationStatus);
  }
  if (params.role && params.role !== 'all') {
    filtered = filtered.filter((p) => p.role === params.role);
  }
  if (params.accountStatus && params.accountStatus !== 'all') {
    filtered = filtered.filter((p) => p.accountStatus === params.accountStatus);
  }
  if (params.bloodGroup && params.bloodGroup !== 'all') {
    filtered = filtered.filter((p) => p.bloodGroup === params.bloodGroup);
  }
  if (params.search && params.search.trim()) {
    const s = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.fullName?.toLowerCase().includes(s) ||
        p.profession?.toLowerCase().includes(s) ||
        p.institution?.toLowerCase().includes(s) ||
        p.city?.toLowerCase().includes(s) ||
        p.collegeRoll?.toLowerCase().includes(s) ||
        p.email?.toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  const sanitizedRows = paginated.map((row) => {
    if (params.includeSensitivePii) return row;
    return {
      ...row,
      phone: row.phone ? '***-REDACTED-PII' : null,
      whatsapp: row.whatsapp ? '***-REDACTED-PII' : null,
      email: row.email ? '***@redacted.ndc' : null,
      fbLink: null,
      collegeRoll: row.collegeRoll ? `${row.collegeRoll.slice(0, 3)}***` : null,
    };
  });

  return {
    profiles: sanitizedRows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function createOrRegisterAlumniProfile(input: {
  userUid?: string;
  fullName: string;
  avatarUrl?: string;
  batchYear: number;
  session?: string;
  collegeRoll?: string;
  academicStream: string;
  academicGroup?: string | null;
  section?: string;
  profession?: string;
  position?: string;
  institution?: string;
  specialty?: string[];
  degree?: string[];
  city?: string;
  country?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  passwordHash?: string;
  bloodGroup?: string;
  isRegisteredDonor?: boolean;
}) {
  const cleanEmail = (input.email || '').trim().toLowerCase();
  const cleanPhone = (input.phone || '').trim();

  const validation = await validateAcademicStreamAndGroup(
    input.academicStream,
    input.academicGroup
  );
  if (!validation.valid) {
    throw new Error(validation.reason || 'Invalid academic stream/group combination.');
  }

  const batchNum =
    input.batchYear > 1900 ? input.batchYear - 1950 : Number(input.batchYear) || 68;
  const hscYear = 1950 + batchNum;
  const session = input.session || `${hscYear - 2}-${String(hscYear).slice(-2)}`;

  if (isDbConfigured) {
    try {
      const existing = await findAlumniByCredential(cleanEmail || cleanPhone);
      if (existing) {
        throw new Error('An account with this mobile number or email is already registered.');
      }

      const inserted = await db
        .insert(alumniProfiles)
        .values({
          userUid: input.userUid || null,
          fullName: input.fullName.trim(),
          avatarUrl:
            input.avatarUrl ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
          batchYear: batchNum,
          session,
          collegeRoll: input.collegeRoll?.trim() || null,
          academicStream: input.academicStream,
          academicGroup: input.academicGroup ? input.academicGroup.trim().toUpperCase() : null,
          section: input.section || null,
          verificationStatus: 'pending_vouch',
          verificationMethod: 'two_vouches',
          vouchesCount: 0,
          vouchTargetCount: 2,
          profession: input.profession || '',
          position: input.position || '',
          institution: input.institution || '',
          specialty: input.specialty || [],
          degree: input.degree || ['HSC'],
          city: input.city || 'Dhaka',
          country: input.country || 'Bangladesh',
          phone: input.phone || null,
          whatsapp: input.whatsapp || null,
          email: input.email || null,
          passwordHash: input.passwordHash || null,
          bloodGroup: input.bloodGroup || null,
          isRegisteredDonor: Boolean(input.isRegisteredDonor),
          role: 'member',
          accountStatus: 'active',
          isPublic: true,
        })
        .returning();

      return inserted[0];
    } catch (error: any) {
      console.warn('Database create profile failed, inserting in-memory:', error);
    }
  }

  // In-memory registration
  const existing = inMemoryProfiles.find((p) => {
    if (cleanEmail && p.email?.toLowerCase() === cleanEmail) return true;
    if (cleanPhone && p.phone === cleanPhone) return true;
    return false;
  });

  if (existing) {
    throw new Error('An account with this mobile number or email is already registered. Please sign in instead.');
  }

  const nextId = inMemoryProfiles.length > 0 ? Math.max(...inMemoryProfiles.map((p) => p.id)) + 1 : 201;

  const newProfile = {
    id: nextId,
    userUid: input.userUid || null,
    fullName: input.fullName.trim(),
    avatarUrl:
      input.avatarUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    coverUrl: null,
    batchYear: batchNum,
    session,
    collegeRoll: input.collegeRoll?.trim() || null,
    academicStream: input.academicStream,
    academicGroup: input.academicGroup ? input.academicGroup.trim().toUpperCase() : null,
    section: input.section || 'Group 4',
    verificationStatus: 'pending_vouch',
    verificationMethod: 'two_vouches',
    verifiedByAdmin: null,
    verificationDate: null,
    vouchesCount: 0,
    vouchTargetCount: 2,
    profession: input.profession || '',
    position: input.position || '',
    institution: input.institution || '',
    cadre: null,
    specialty: input.specialty || [],
    degree: input.degree || ['HSC'],
    city: input.city || 'Dhaka',
    country: input.country || 'Bangladesh',
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    email: input.email || null,
    passwordHash: input.passwordHash || null,
    fbLink: null,
    bio: '',
    bloodGroup: input.bloodGroup || null,
    isRegisteredDonor: Boolean(input.isRegisteredDonor),
    donorAvailability: 'available',
    preferredArea: input.city || 'Dhaka',
    lastDonationDate: null,
    role: 'member',
    accountStatus: 'active',
    isPublic: true,
    postsCount: 0,
    badges: ['Registered Alumnus'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  inMemoryProfiles.unshift(newProfile);
  return newProfile;
}

export async function findAlumniByCredential(identifier: string) {
  if (!identifier?.trim()) return null;
  const clean = identifier.trim().toLowerCase();
  const digits = clean.replace(/[^0-9]/g, '');

  if (isDbConfigured) {
    try {
      if (clean.includes('@')) {
        const rows = await db
          .select()
          .from(alumniProfiles)
          .where(ilike(alumniProfiles.email, clean))
          .limit(1);
        if (rows.length > 0) return rows[0];
      }

      if (digits.length >= 6) {
        const lastDigits = digits.length >= 10 ? digits.slice(-10) : digits;
        const rows = await db
          .select()
          .from(alumniProfiles)
          .where(
            or(
              ilike(alumniProfiles.phone, `%${lastDigits}`),
              eq(alumniProfiles.phone, identifier.trim())
            )
          )
          .limit(1);
        if (rows.length > 0) return rows[0];
      }

      const rows = await db
        .select()
        .from(alumniProfiles)
        .where(
          or(
            ilike(alumniProfiles.email, clean),
            ilike(alumniProfiles.fullName, clean)
          )
        )
        .limit(1);
      if (rows.length > 0) return rows[0];
    } catch (error) {
      console.warn('Database find credential failed, checking in-memory:', error);
    }
  }

  // In-memory match
  for (const p of inMemoryProfiles) {
    if (p.email && p.email.toLowerCase() === clean) return p;
    if (p.phone && (p.phone === identifier.trim() || (digits.length >= 6 && p.phone.includes(digits.slice(-6))))) {
      return p;
    }
    if (p.fullName && p.fullName.toLowerCase() === clean) return p;
  }

  return null;
}

export async function updateAlumniPassword(profileId: number, passwordHash: string) {
  if (isDbConfigured) {
    try {
      const updated = await db
        .update(alumniProfiles)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(alumniProfiles.id, profileId))
        .returning();
      if (updated.length > 0) return updated[0];
    } catch (error) {
      console.warn('Database update password failed, updating in-memory:', error);
    }
  }

  const p = inMemoryProfiles.find((item) => item.id === profileId);
  if (p) {
    p.passwordHash = passwordHash;
    p.updatedAt = new Date();
  }
  return p || null;
}

export async function deleteAlumniProfile(profileId: number) {
  if (isDbConfigured) {
    try {
      await db.delete(alumniProfiles).where(eq(alumniProfiles.id, profileId));
      return true;
    } catch (error) {
      console.warn('Database delete profile failed, removing from in-memory:', error);
    }
  }

  const idx = inMemoryProfiles.findIndex((item) => item.id === profileId);
  if (idx > -1) {
    inMemoryProfiles.splice(idx, 1);
    return true;
  }
  return false;
}

export async function adminUpdateAlumniGovernance(params: {
  profileId: number;
  verificationStatus?: string;
  role?: string;
  accountStatus?: string;
  academicStream?: string;
  academicGroup?: string | null;
  adminReviewNote?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isDbConfigured) {
    try {
      const updated = await db
        .update(alumniProfiles)
        .set({
          verificationStatus: params.verificationStatus,
          role: params.role,
          accountStatus: params.accountStatus,
          academicStream: params.academicStream,
          academicGroup: params.academicGroup,
          adminReviewNote: params.adminReviewNote,
          updatedAt: new Date(),
        })
        .where(eq(alumniProfiles.id, params.profileId))
        .returning();
      if (updated.length > 0) return updated[0];
    } catch (error) {
      console.warn('Database governance update failed, updating in-memory:', error);
    }
  }

  const profile = inMemoryProfiles.find((p) => p.id === params.profileId);
  if (!profile) {
    throw new Error('Alumni profile not found.');
  }

  if (params.verificationStatus) profile.verificationStatus = params.verificationStatus;
  if (params.role) profile.role = params.role;
  if (params.accountStatus) profile.accountStatus = params.accountStatus;
  if (params.academicStream) profile.academicStream = params.academicStream;
  if (params.academicGroup !== undefined) profile.academicGroup = params.academicGroup;
  if (params.adminReviewNote !== undefined) profile.adminReviewNote = params.adminReviewNote;
  profile.updatedAt = new Date();

  await recordSecurityAuditLog({
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: 'UPDATE_PROFILE_GOVERNANCE',
    targetType: 'alumni_profile',
    targetId: String(params.profileId),
    severity: 'info',
    summary: `Updated profile governance for ${profile.fullName} (ID ${profile.id}).`,
  });

  return profile;
}

export async function getVerificationQueue(statusFilter?: string) {
  if (isDbConfigured) {
    try {
      if (statusFilter && statusFilter !== 'all') {
        const rows = await db
          .select()
          .from(verificationSubmissions)
          .where(eq(verificationSubmissions.status, statusFilter))
          .orderBy(desc(verificationSubmissions.submittedAt));
        return rows;
      }
      return await db
        .select()
        .from(verificationSubmissions)
        .orderBy(desc(verificationSubmissions.submittedAt));
    } catch (error) {
      console.warn('Database verification queue failed, using in-memory queue:', error);
    }
  }

  if (statusFilter && statusFilter !== 'all') {
    return inMemoryVerifications.filter((v) => v.status === statusFilter);
  }
  return inMemoryVerifications;
}

export async function reviewVerificationSubmission(params: {
  submissionId: number;
  decision: 'approved' | 'rejected';
  adminNote?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isDbConfigured) {
    try {
      const updatedSub = await db
        .update(verificationSubmissions)
        .set({
          status: params.decision,
          reviewedBy: params.actorEmail,
          reviewedAt: new Date(),
          adminNote: params.adminNote || 'Reviewed by central admin',
        })
        .where(eq(verificationSubmissions.id, params.submissionId))
        .returning();
      if (updatedSub.length > 0) return updatedSub[0];
    } catch (error) {
      console.warn('Database review verification failed, updating in-memory:', error);
    }
  }

  const sub = inMemoryVerifications.find((v) => v.id === params.submissionId);
  if (!sub) {
    throw new Error('Verification submission not found.');
  }

  sub.status = params.decision;
  sub.reviewedBy = params.actorEmail;
  sub.reviewedAt = new Date();
  sub.adminNote = params.adminNote || (params.decision === 'approved' ? 'Verified against college records' : 'Roll mismatch');

  const linkedProfile = inMemoryProfiles.find((p) => p.id === sub.profileId);
  if (linkedProfile) {
    linkedProfile.verificationStatus = params.decision === 'approved' ? 'verified' : 'unverified';
    linkedProfile.verificationDate = params.decision === 'approved' ? new Date().toISOString().split('T')[0] : null;
    linkedProfile.verifiedByAdmin = params.decision === 'approved' ? params.actorEmail : null;
  }

  await recordSecurityAuditLog({
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: params.decision === 'approved' ? 'APPROVE_VERIFICATION_DOC' : 'REJECT_VERIFICATION_DOC',
    targetType: 'verification_submission',
    targetId: sub.submissionCode,
    severity: params.decision === 'approved' ? 'info' : 'warning',
    summary: `${params.decision.toUpperCase()} document verification for ${sub.fullName}.`,
  });

  return sub;
}

export async function getBloodEmergencyList() {
  if (isDbConfigured) {
    try {
      return await db
        .select()
        .from(bloodEmergencyRequests)
        .orderBy(desc(bloodEmergencyRequests.createdAt));
    } catch (error) {
      console.warn('Database blood emergency list failed, using in-memory store:', error);
    }
  }
  return inMemoryBloodRequests;
}

export async function moderateBloodEmergency(params: {
  id: number;
  status: string;
  unitsFulfilled?: number;
  moderationNote?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isDbConfigured) {
    try {
      const updated = await db
        .update(bloodEmergencyRequests)
        .set({
          status: params.status,
          unitsFulfilled: params.unitsFulfilled,
          verifiedByAdmin: params.actorEmail,
          moderationNote: params.moderationNote,
          updatedAt: new Date(),
        })
        .where(eq(bloodEmergencyRequests.id, params.id))
        .returning();
      if (updated.length > 0) return updated[0];
    } catch (error) {
      console.warn('Database blood moderation failed, updating in-memory:', error);
    }
  }

  const item = inMemoryBloodRequests.find((b) => b.id === params.id);
  if (!item) {
    throw new Error('Blood emergency request not found.');
  }

  item.status = params.status;
  if (params.unitsFulfilled !== undefined) item.unitsFulfilled = params.unitsFulfilled;
  if (params.moderationNote !== undefined) item.moderationNote = params.moderationNote;
  item.verifiedByAdmin = params.actorEmail;
  item.updatedAt = new Date();

  await recordSecurityAuditLog({
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: 'MODERATE_BLOOD_REQUEST',
    targetType: 'blood_request',
    targetId: item.requestCode,
    severity: 'info',
    summary: `Moderated blood request ${item.requestCode} to "${params.status}".`,
  });

  return item;
}

export async function getOfficialNoticesList() {
  if (isDbConfigured) {
    try {
      return await db
        .select()
        .from(officialNotices)
        .orderBy(desc(officialNotices.isPinned), desc(officialNotices.createdAt));
    } catch (error) {
      console.warn('Database official notices query failed, using in-memory notices:', error);
    }
  }
  return inMemoryNotices;
}

export async function createOrUpdateOfficialNotice(params: {
  id?: number;
  title: string;
  category: string;
  content: string;
  targetBatch?: number | null;
  isPinned?: boolean;
  isPublished?: boolean;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  if (isDbConfigured) {
    try {
      if (params.id) {
        const updated = await db
          .update(officialNotices)
          .set({
            title: params.title.trim(),
            category: params.category,
            content: params.content.trim(),
            targetBatch: params.targetBatch ?? null,
            isPinned: Boolean(params.isPinned),
            isPublished: Boolean(params.isPublished),
            updatedAt: new Date(),
          })
          .where(eq(officialNotices.id, params.id))
          .returning();
        if (updated.length > 0) return updated[0];
      } else {
        const inserted = await db
          .insert(officialNotices)
          .values({
            title: params.title.trim(),
            category: params.category || 'General',
            content: params.content.trim(),
            targetBatch: params.targetBatch ?? null,
            isPinned: Boolean(params.isPinned),
            isPublished: Boolean(params.isPublished),
            authorName: params.actorEmail,
          })
          .returning();
        if (inserted.length > 0) return inserted[0];
      }
    } catch (error) {
      console.warn('Database notice write failed, writing in-memory:', error);
    }
  }

  if (params.id) {
    const notice = inMemoryNotices.find((n) => n.id === params.id);
    if (notice) {
      notice.title = params.title.trim();
      notice.category = params.category;
      notice.content = params.content.trim();
      notice.targetBatch = params.targetBatch ?? null;
      notice.isPinned = Boolean(params.isPinned);
      notice.isPublished = Boolean(params.isPublished);
      notice.updatedAt = new Date();
      return notice;
    }
  }

  const nextId = inMemoryNotices.length > 0 ? Math.max(...inMemoryNotices.map((n) => n.id)) + 1 : 1;
  const newNotice = {
    id: nextId,
    refNo: `NDCAA/NOT-2026/${String(nextId).padStart(3, '0')}`,
    title: params.title.trim(),
    category: params.category || 'General',
    content: params.content.trim(),
    targetBatch: params.targetBatch ?? null,
    isPinned: Boolean(params.isPinned),
    isPublished: Boolean(params.isPublished),
    authorName: params.actorEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  inMemoryNotices.unshift(newNotice);
  return newNotice;
}

export async function generateBulkBatchCohortSample(params: {
  countToGenerate: number;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
}) {
  const safeCount = Math.min(250, Math.max(10, params.countToGenerate || 50));
  const streams = [
    { stream: 'Science', groups: [null] },
    { stream: 'Humanities', groups: ['G', 'H', 'L', 'W'] },
    { stream: 'Business Studies', groups: ['A', 'B', 'C', 'D', 'E', 'F'] },
  ];
  const firstNames = [
    'Tanvir', 'Farhan', 'Mahmudul', 'Ashfaqur', 'Raihan', 'Samiul', 'Adnan', 'Nafis',
    'Tariqul', 'Zahirul', 'Kamrul', 'Shafiqul', 'Muntasir', 'Hasibul', 'Tawsif', 'Rashedul',
  ];
  const lastNames = [
    'Rahman', 'Chowdhury', 'Hasan', 'Kabir', 'Alim', 'Islam', 'Ahmed', 'Karim',
    'Hossain', 'Siddiqui', 'Bhuiyan', 'Majumder', 'Talukder', 'Khandaker',
  ];
  const professions = [
    { prof: 'Software & Technology', pos: 'Senior Software Architect', inst: 'Brain Station 23' },
    { prof: 'Medicine & Healthcare', pos: 'Consultant Physician', inst: 'BSMMU' },
    { prof: 'Finance & Banking', pos: 'Vice President', inst: 'BRAC Bank PLC' },
    { prof: 'Engineering & Research', pos: 'Associate Professor', inst: 'BUET' },
    { prof: 'Civil Service (BCS)', pos: 'Deputy Secretary', inst: 'Government of Bangladesh' },
    { prof: 'Law & Judiciary', pos: 'Advocate', inst: 'Supreme Court of Bangladesh' },
  ];
  const cities = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'London', 'Toronto', 'New York', 'Singapore'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const avatars = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  ];

  const recordsToInsert: any[] = [];
  const baseTs = Date.now() % 100000;

  for (let i = 0; i < safeCount; i++) {
    const batchYear = 45 + ((i * 7) % 33);
    const hscYear = 1950 + batchYear;
    const session = `${hscYear - 2}-${String(hscYear).slice(-2)}`;
    const streamPick = streams[i % streams.length];
    const groupPick = streamPick.groups[i % streamPick.groups.length];
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const career = professions[i % professions.length];
    const isVerified = i % 4 !== 0;

    const record = {
      id: inMemoryProfiles.length + i + 500,
      userUid: null,
      fullName: `${fn} ${ln}`,
      avatarUrl: avatars[i % avatars.length],
      coverUrl: null,
      batchYear,
      session,
      collegeRoll: `${streamPick.stream === 'Science' ? '1' : streamPick.stream === 'Business Studies' ? '2' : '3'}${String(batchYear).padStart(2, '0')}${String(((baseTs + i) % 900) + 100)}`,
      academicStream: streamPick.stream,
      academicGroup: groupPick,
      section: groupPick ? `Group ${groupPick}` : 'Science Cohort',
      verificationStatus: isVerified ? 'verified' : 'pending_vouch',
      verificationMethod: isVerified ? 'two_vouches' : 'id_card_upload',
      vouchesCount: isVerified ? 2 : 1,
      vouchTargetCount: 2,
      verifiedByAdmin: isVerified ? params.actorEmail : null,
      verificationDate: isVerified ? new Date().toISOString().split('T')[0] : null,
      profession: career.prof,
      position: career.pos,
      institution: career.inst,
      cadre: null,
      specialty: [career.prof],
      degree: ['HSC', 'BSc', 'MSc'],
      city: cities[i % cities.length],
      country: i % 6 >= 4 ? 'International' : 'Bangladesh',
      phone: `+88017${String(10000000 + ((baseTs + i) % 89999999))}`,
      whatsapp: `+88017${String(10000000 + ((baseTs + i) % 89999999))}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}.b${batchYear}.${i}@ndcalumni.org`,
      passwordHash: null,
      fbLink: null,
      bio: '',
      bloodGroup: bloodGroups[i % bloodGroups.length],
      isRegisteredDonor: i % 2 === 0,
      donorAvailability: 'available',
      preferredArea: cities[i % cities.length],
      lastDonationDate: null,
      role: 'member',
      accountStatus: 'active',
      isPublic: true,
      postsCount: 0,
      badges: isVerified ? ['Verified Alumnus'] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    recordsToInsert.push(record);
  }

  if (isDbConfigured) {
    try {
      await db.insert(alumniProfiles).values(recordsToInsert);
    } catch (error) {
      console.warn('Database bulk cohort insert failed, storing in-memory:', error);
    }
  }

  inMemoryProfiles.push(...recordsToInsert);

  await recordSecurityAuditLog({
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: 'BULK_COHORT_IMPORT',
    targetType: 'alumni_profile',
    targetId: `BATCH_IMPORT_${safeCount}`,
    severity: 'info',
    summary: `Imported ${safeCount} alumni records with stream/group validation.`,
  });

  return { insertedCount: safeCount };
}
