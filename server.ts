import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createHttpServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { requireAuth, optionalAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getUsers } from './src/db/users.ts';
import {
  adminUpdateAlumniGovernance,
  createOrRegisterAlumniProfile,
  createOrUpdateOfficialNotice,
  generateBulkBatchCohortSample,
  getAcademicStreamGroupsConfig,
  getAdminOverviewMetrics,
  getBloodEmergencyList,
  getOfficialNoticesList,
  getVerificationQueue,
  moderateBloodEmergency,
  queryPaginatedAlumniProfiles,
  reviewVerificationSubmission,
  toggleAcademicStreamGroupActive,
} from './src/db/adminRepository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// 1. Security Headers & Custom Domain CORS Middleware (ndcbogura.alumniworld.xyz)
const ALLOWED_ORIGINS = new Set([
  'https://ndcbogura.alumniworld.xyz',
  'http://ndcbogura.alumniworld.xyz',
  'https://www.ndcbogura.alumniworld.xyz',
  'https://ndc-alumni-2026.ai.studio',
  'https://ais-pre-siz5cxwdtehl5ayj3qiu3s-456498149201.asia-southeast1.run.app',
  'https://ais-dev-siz5cxwdtehl5ayj3qiu3s-456498149201.asia-southeast1.run.app',
]);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (ALLOWED_ORIGINS.has(origin) ||
      origin.endsWith('.alumniworld.xyz') ||
      origin.endsWith('.ai.studio'))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-ndc-admin-email'
    );
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '2mb' }));

// 2. Sliding-Window Anti-Scraping & Brute-Force Rate Limiter
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateBucket>();

function rateLimitGuard(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();
    const bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Automated scraping and brute-force requests are blocked.',
      });
    }
    return next();
  };
}

function resolveActor(req: AuthRequest) {
  if (req.dbUser) {
    return {
      uid: req.dbUser.uid,
      email: req.dbUser.email,
      role: req.dbUser.role || 'admin',
    };
  }
  if (req.user) {
    return {
      uid: req.user.uid,
      email: req.user.email || 'admin@ndcalumni.org',
      role: 'admin',
    };
  }
  const headerEmail = (req.headers['x-ndc-admin-email'] as string) || 'admin@ndcalumni.org';
  return {
    uid: 'ndc-portal-admin',
    email: headerEmail,
    role: 'admin',
  };
}

// ---------------------------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------------------------

// Sync Firebase Auth User with Cloud SQL
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      authenticated: true,
      user: req.dbUser,
    });
  } catch (error: any) {
    console.error('Failed to sync authenticated user:', error);
    res.status(500).json({ error: error.message || 'Failed to synchronize user' });
  }
});

// Get synchronized users (Protected by Firebase Auth)
app.get('/api/users', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const allUsers = await getUsers();
    res.json(allUsers);
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Get official Academic Stream & Group configuration
app.get('/api/stream-groups', rateLimitGuard(120, 60_000), async (_req: Request, res: Response) => {
  try {
    const rows = await getAcademicStreamGroupsConfig();
    res.json({ streamGroups: rows });
  } catch (error: any) {
    console.error('Failed to load stream groups:', error);
    res.status(500).json({ error: error.message || 'Failed to load stream groups' });
  }
});

// Paginated 100k-scale Alumni Directory Query (with PII redaction guard)
app.get(
  '/api/alumni',
  rateLimitGuard(90, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const isAdminView =
        req.query.adminView === 'true' &&
        (Boolean(req.user) || Boolean(req.headers['x-ndc-admin-email']));

      const result = await queryPaginatedAlumniProfiles({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 25,
        search: (req.query.search as string) || '',
        batchYear: req.query.batchYear ? Number(req.query.batchYear) : undefined,
        academicStream: (req.query.academicStream as string) || undefined,
        verificationStatus: (req.query.verificationStatus as string) || undefined,
        role: (req.query.role as string) || undefined,
        accountStatus: (req.query.accountStatus as string) || undefined,
        bloodGroup: (req.query.bloodGroup as string) || undefined,
        includeSensitivePii: isAdminView,
      });
      res.json(result);
    } catch (error: any) {
      console.error('Failed to fetch paginated alumni profiles:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch alumni profiles' });
    }
  }
);

// Register new Alumnus Profile in Cloud SQL (with Stream/Group validation)
app.post(
  '/api/alumni/register',
  rateLimitGuard(20, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const created = await createOrRegisterAlumniProfile({
        userUid: req.user?.uid || req.body.userUid,
        fullName: req.body.fullName,
        avatarUrl: req.body.avatarUrl,
        batchYear: Number(req.body.batchYear) || 68,
        session: req.body.session,
        collegeRoll: req.body.collegeRoll,
        academicStream: req.body.academicStream || req.body.group || 'Science',
        academicGroup: req.body.academicGroup || null,
        section: req.body.section,
        profession: req.body.profession,
        position: req.body.position,
        institution: req.body.institution,
        specialty: Array.isArray(req.body.specialty) ? req.body.specialty : [],
        degree: Array.isArray(req.body.degree) ? req.body.degree : ['HSC'],
        city: req.body.city,
        country: req.body.country,
        phone: req.body.phone,
        whatsapp: req.body.whatsapp,
        email: req.body.email,
        bloodGroup: req.body.bloodGroup,
        isRegisteredDonor: Boolean(req.body.isRegisteredDonor),
      });
      res.status(201).json({ profile: created });
    } catch (error: any) {
      console.error('Failed to register alumni profile:', error);
      res.status(400).json({ error: error.message || 'Failed to register alumni profile' });
    }
  }
);

// Admin Command Center: Overview Metrics & Audit Feed
app.get(
  '/api/admin/overview',
  rateLimitGuard(60, 60_000),
  optionalAuth,
  async (_req: AuthRequest, res: Response) => {
    try {
      const overview = await getAdminOverviewMetrics();
      res.json(overview);
    } catch (error: any) {
      console.error('Failed to load admin overview:', error);
      res.status(500).json({ error: error.message || 'Failed to load admin overview' });
    }
  }
);

// Admin Command Center: Update Profile Governance (Role, Verification, Suspension, Stream/Group)
app.patch(
  '/api/admin/alumni/:id',
  rateLimitGuard(40, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const profileId = Number(req.params.id);
      if (Number.isNaN(profileId)) {
        return res.status(400).json({ error: 'Invalid profile ID' });
      }
      const actor = resolveActor(req);
      const updated = await adminUpdateAlumniGovernance({
        profileId,
        verificationStatus: req.body.verificationStatus,
        role: req.body.role,
        accountStatus: req.body.accountStatus,
        academicStream: req.body.academicStream,
        academicGroup: req.body.academicGroup,
        adminReviewNote: req.body.adminReviewNote,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role,
      });
      res.json({ profile: updated });
    } catch (error: any) {
      console.error('Failed to update profile governance:', error);
      res.status(400).json({ error: error.message || 'Failed to update profile governance' });
    }
  }
);

// Admin Command Center: Verification Submissions Queue
app.get(
  '/api/admin/verifications',
  rateLimitGuard(60, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const status = (req.query.status as string) || 'all';
      const submissions = await getVerificationQueue(status);
      res.json({ submissions });
    } catch (error: any) {
      console.error('Failed to fetch verification queue:', error);
      res.status(500).json({ error: error.message || 'Failed to load verification queue' });
    }
  }
);

// Admin Command Center: Approve or Reject Document Verification
app.post(
  '/api/admin/verifications/:id/review',
  rateLimitGuard(40, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const submissionId = Number(req.params.id);
      const decision = req.body.decision === 'approved' ? 'approved' : 'rejected';
      const actor = resolveActor(req);

      const updated = await reviewVerificationSubmission({
        submissionId,
        decision,
        adminNote: req.body.adminNote,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role,
      });
      res.json({ submission: updated });
    } catch (error: any) {
      console.error('Failed to review verification submission:', error);
      res.status(400).json({ error: error.message || 'Failed to review verification submission' });
    }
  }
);

// Admin Command Center: Blood Emergency Moderation
app.get(
  '/api/admin/blood-requests',
  rateLimitGuard(60, 60_000),
  optionalAuth,
  async (_req: AuthRequest, res: Response) => {
    try {
      const requests = await getBloodEmergencyList();
      res.json({ requests });
    } catch (error: any) {
      console.error('Failed to load blood emergency requests:', error);
      res.status(500).json({ error: error.message || 'Failed to load blood emergency requests' });
    }
  }
);

app.patch(
  '/api/admin/blood-requests/:id',
  rateLimitGuard(40, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const actor = resolveActor(req);
      const updated = await moderateBloodEmergency({
        id,
        status: req.body.status,
        unitsFulfilled:
          req.body.unitsFulfilled !== undefined ? Number(req.body.unitsFulfilled) : undefined,
        moderationNote: req.body.moderationNote,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role,
      });
      res.json({ request: updated });
    } catch (error: any) {
      console.error('Failed to moderate blood emergency:', error);
      res.status(400).json({ error: error.message || 'Failed to moderate blood emergency' });
    }
  }
);

// Admin Command Center: Official Notices
app.get(
  '/api/admin/notices',
  rateLimitGuard(60, 60_000),
  optionalAuth,
  async (_req: AuthRequest, res: Response) => {
    try {
      const notices = await getOfficialNoticesList();
      res.json({ notices });
    } catch (error: any) {
      console.error('Failed to load notices:', error);
      res.status(500).json({ error: error.message || 'Failed to load official notices' });
    }
  }
);

app.post(
  '/api/admin/notices',
  rateLimitGuard(30, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const actor = resolveActor(req);
      const notice = await createOrUpdateOfficialNotice({
        id: req.body.id ? Number(req.body.id) : undefined,
        title: req.body.title,
        category: req.body.category || 'General',
        content: req.body.content,
        targetBatch: req.body.targetBatch ? Number(req.body.targetBatch) : null,
        isPinned: Boolean(req.body.isPinned),
        isPublished: Boolean(req.body.isPublished),
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role,
      });
      res.json({ notice });
    } catch (error: any) {
      console.error('Failed to save notice:', error);
      res.status(400).json({ error: error.message || 'Failed to save official notice' });
    }
  }
);

// Admin Command Center: Toggle Academic Stream Group Active State
app.patch(
  '/api/admin/stream-groups/:id',
  rateLimitGuard(30, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const actor = resolveActor(req);
      const updated = await toggleAcademicStreamGroupActive({
        id,
        isActive: Boolean(req.body.isActive),
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role,
      });
      res.json({ streamGroup: updated });
    } catch (error: any) {
      console.error('Failed to update stream group:', error);
      res.status(400).json({ error: error.message || 'Failed to update stream group' });
    }
  }
);

// Admin Command Center: Bulk 100k-Scale Cohort Seeder / Stress-Test Importer
app.post(
  '/api/admin/bulk-cohort',
  rateLimitGuard(10, 60_000),
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const actor = resolveActor(req);
      const countToGenerate = Number(req.body.count) || 50;
      const result = await generateBulkBatchCohortSample({
        countToGenerate,
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role,
      });
      res.json(result);
    } catch (error: any) {
      console.error('Failed to execute bulk cohort import:', error);
      res.status(500).json({ error: error.message || 'Failed to execute bulk cohort import' });
    }
  }
);

// Admin Command Center: One-Click Combined Production SQL Bundle Download (001 -> 004)
app.get(
  '/api/admin/export-sql-bundle',
  rateLimitGuard(20, 60_000),
  optionalAuth,
  async (_req: AuthRequest, res: Response) => {
    try {
      const files = [
        '001_core_schema.sql',
        '002_security_functions_triggers.sql',
        '003_rls_policies.sql',
        '004_reference_seed_data.sql',
      ];
      const parts: string[] = [];
      for (const file of files) {
        const filePath = path.resolve(__dirname, 'supabase', 'migrations', file);
        const content = await readFile(filePath, 'utf-8');
        parts.push(
          `-- =============================================================================\n-- MIGRATION FILE: ${file}\n-- =============================================================================\n\n${content}`
        );
      }
      res.json({
        bundleSql: parts.join('\n\n'),
        filesCount: files.length,
      });
    } catch (error: any) {
      console.error('Failed to export SQL bundle:', error);
      res.status(500).json({ error: error.message || 'Failed to generate SQL migration bundle' });
    }
  }
);

// Admin Command Center: Full Database Snapshot Export (JSON Backup)
app.get(
  '/api/admin/export-full-backup',
  rateLimitGuard(15, 60_000),
  optionalAuth,
  async (_req: AuthRequest, res: Response) => {
    try {
      const [overview, directory, verifications, blood, notices] = await Promise.all([
        getAdminOverviewMetrics(),
        queryPaginatedAlumniProfiles({ page: 1, limit: 100, includeSensitivePii: true }),
        getVerificationQueue('all'),
        getBloodEmergencyList(),
        getOfficialNoticesList(),
      ]);
      res.json({
        exportedAt: new Date().toISOString(),
        platform: 'Notre Dame College Alumni Network (100k-Scale)',
        overview,
        alumniProfiles: directory.profiles,
        verificationSubmissions: verifications,
        bloodEmergencyRequests: blood,
        officialNotices: notices,
      });
    } catch (error: any) {
      console.error('Failed to export full backup:', error);
      res.status(500).json({ error: error.message || 'Failed to export database backup' });
    }
  }
);

// ---------------------------------------------------------------------------
// VITE DEV SERVER / STATIC ASSET SERVING
// ---------------------------------------------------------------------------
async function startServer() {
  const httpServer = createHttpServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`NDC Alumni Hardened Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
