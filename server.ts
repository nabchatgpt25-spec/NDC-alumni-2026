// Defensively clean up any global __dirname / __filename polluted by tsx CLI
// so that ESM packages like vite-plugin-pwa and Vite resolve relative to import.meta.url correctly
if (typeof (globalThis as any).__dirname !== 'undefined') {
  delete (globalThis as any).__dirname;
}
if (typeof (globalThis as any).__filename !== 'undefined') {
  delete (globalThis as any).__filename;
}

import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createHttpServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import { requireAuth, requireAdmin, optionalAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  adminUpdateAlumniGovernance,
  createOrRegisterAlumniProfile,
  createOrUpdateOfficialNotice,
  findAlumniByCredential,
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
  updateAlumniPassword,
  deleteAlumniProfile,
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    const user = req.user as any;
    return {
      uid: user.uid || user.id || 'admin-user',
      email: user.email || 'admin@ndcalumni.org',
      role: 'admin',
    };
  }
  throw new Error('Unauthorized: Valid admin credentials required on backend');
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

function formatAlumniRowToProfile(row: any) {
  return {
    id: row.id,
    userId: row.id,
    fullName: row.fullName || 'Notredamian Alumnus',
    avatarUrl:
      row.avatarUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    coverUrl: row.coverUrl || undefined,
    batchYear: row.batchYear || 68,
    session: row.session || undefined,
    collegeRoll: row.collegeRoll || '',
    academicStream: row.academicStream,
    academicGroup: row.academicGroup,
    group: row.academicStream || 'Science',
    section: row.section || 'Group 4',
    verificationStatus: row.verificationStatus || 'pending_vouch',
    verificationMethod: row.verificationMethod || 'two_vouches',
    verifiedBy: row.verifiedByAdmin ? [row.verifiedByAdmin] : [],
    vouchesCount: row.vouchesCount || 0,
    vouchTargetCount: row.vouchTargetCount || 2,
    profession: row.profession || '',
    position: row.position || '',
    institution: row.institution || '',
    cadre: row.cadre || '',
    specialty: Array.isArray(row.specialty) ? row.specialty : [],
    degree: Array.isArray(row.degree) ? row.degree : ['HSC'],
    city: row.city || 'Dhaka',
    country: row.country || 'Bangladesh',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    fbLink: row.fbLink || '',
    bio: row.bio || '',
    bloodGroup: row.bloodGroup || undefined,
    isRegisteredDonor: Boolean(row.isRegisteredDonor),
    donorAvailability: row.donorAvailability || 'available',
    role: row.role || 'member',
    accountStatus: row.accountStatus || 'active',
    isPublic: Boolean(row.isPublic),
    postsCount: row.postsCount || 0,
    badges: Array.isArray(row.badges) ? row.badges : [],
  };
}

const PASSWORD_SALT = 'ndc_dhaka_1949_salt_v1:';

function hashPasswordServer(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('sha256:')) return raw;
  const hash = crypto.createHash('sha256').update(PASSWORD_SALT + raw).digest('hex');
  return `sha256:${hash}`;
}

function verifyPasswordServer(storedHash: string | null | undefined, inputPass: string): boolean {
  if (!storedHash) return true;
  const hashedInput = hashPasswordServer(inputPass);
  if (storedHash === hashedInput) return true;
  if (storedHash === inputPass) return true;
  return false;
}

// Global Cross-Device Registration Endpoint (stores directly in Cloud SQL)
app.post('/api/auth/register', rateLimitGuard(25, 60_000), async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      avatarUrl,
      coverUrl,
      batchYear,
      session,
      collegeRoll,
      academicStream,
      academicGroup,
      section,
      profession,
      position,
      institution,
      specialty,
      degree,
      city,
      country,
      phone,
      whatsapp,
      email,
      password,
      bloodGroup,
      isRegisteredDonor,
    } = req.body;

    if (!fullName?.trim()) {
      return res.status(400).json({ error: 'Please provide your Full Name.' });
    }
    if (!phone?.trim() && !email?.trim()) {
      return res.status(400).json({ error: 'Please provide your Mobile Number or Email.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const hashedPassword = hashPasswordServer(password);

    const created = await createOrRegisterAlumniProfile({
      fullName: fullName.trim(),
      avatarUrl,
      batchYear: Number(batchYear) || 68,
      session,
      collegeRoll: collegeRoll?.trim(),
      academicStream:
        academicStream === 'Humanities' || academicStream === 'Business Studies'
          ? academicStream
          : 'Science',
      academicGroup: academicGroup || null,
      section: section || 'Group 4',
      profession: profession || '',
      position: position || '',
      institution: institution || '',
      specialty: Array.isArray(specialty) ? specialty : [],
      degree: Array.isArray(degree) ? degree : ['HSC'],
      city: city || 'Dhaka',
      country: country || 'Bangladesh',
      phone: phone?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      email: email?.trim() || null,
      passwordHash: hashedPassword,
      bloodGroup: bloodGroup || null,
      isRegisteredDonor: Boolean(isRegisteredDonor),
    });

    res.status(201).json({
      success: true,
      profile: formatAlumniRowToProfile(created),
    });
  } catch (error: any) {
    console.error('Registration failed:', error);
    res.status(400).json({ error: error.message || 'Registration failed.' });
  }
});

// Global Cross-Device Login Endpoint (verifies credentials against Cloud SQL)
app.post('/api/auth/login', rateLimitGuard(40, 60_000), async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier?.trim() || !password) {
      return res.status(400).json({ error: 'Please enter your mobile number or email and password.' });
    }

    const alumnus = await findAlumniByCredential(identifier.trim());
    if (!alumnus) {
      return res.status(404).json({
        error: 'No registered account found with this phone number or email. Please register your verified profile first.',
      });
    }

    if (alumnus.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Your account is currently suspended. Please contact Notre Dame Alumni support.' });
    }

    const isValid = verifyPasswordServer(alumnus.passwordHash, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // If account was created without a passwordHash, persist it now for seamless cross-device auth
    if (!alumnus.passwordHash) {
      const newHash = hashPasswordServer(password);
      await updateAlumniPassword(alumnus.id, newHash);
    }

    res.json({
      success: true,
      profile: formatAlumniRowToProfile(alumnus),
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    res.status(500).json({ error: error.message || 'Login failed. Please try again.' });
  }
});

// Global Cross-Device Password Reset Endpoint
app.post('/api/auth/reset-password', rateLimitGuard(15, 60_000), async (req: Request, res: Response) => {
  try {
    const { phone, newPassword } = req.body;
    if (!phone?.trim() || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid phone number and new password (min 6 chars) required.' });
    }

    const alumnus = await findAlumniByCredential(phone.trim());
    if (!alumnus) {
      return res.status(404).json({ error: 'No account found with this mobile number.' });
    }

    const newHash = hashPasswordServer(newPassword);
    await updateAlumniPassword(alumnus.id, newHash);

    res.json({ success: true, message: 'Password updated successfully across all devices.' });
  } catch (error: any) {
    console.error('Password reset failed:', error);
    res.status(500).json({ error: error.message || 'Password reset failed.' });
  }
});

// Self-Service Profile / Account Deletion Endpoint
app.post('/api/auth/delete-account', rateLimitGuard(15, 60_000), async (req: Request, res: Response) => {
  try {
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required for deletion.' });
    }

    await deleteAlumniProfile(Number(profileId));
    res.json({ success: true, message: 'Profile and associated account deleted successfully.' });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete account.' });
  }
});

function decodeHtmlEntities(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x3D;/gi, '=')
    .replace(/&middot;/gi, '·')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return _;
      }
    });
}

// Universal Rich Link Unfurl & OpenGraph Media Extractor (Facebook Pictures, Posts, Videos, YouTube, Instagram, LinkedIn, Web)
app.get('/api/unfurl', rateLimitGuard(120, 60_000), async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ error: 'Valid HTTP/HTTPS URL required' });
  }

  const cleanUrl = targetUrl.trim();
  // Handle direct media files immediately
  if (/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(cleanUrl)) {
    return res.json({
      resolvedUrl: cleanUrl,
      imageUrl: cleanUrl,
      mediaType: 'photo',
      title: 'Direct Photo',
      publisher: new URL(cleanUrl).hostname,
    });
  }
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanUrl)) {
    return res.json({
      resolvedUrl: cleanUrl,
      videoUrl: cleanUrl,
      mediaType: 'video',
      title: 'Direct Video Stream',
      publisher: new URL(cleanUrl).hostname,
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const isFacebook = /(?:facebook\.com|fb\.watch|fb\.com)/i.test(cleanUrl);
    // Facebook and social networks serve rich public OpenGraph metadata to crawler UAs without login wall
    const crawlerUa = isFacebook
      ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    const resp = await fetch(cleanUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': crawlerUa,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timer);

    const finalResolvedUrl = resp.url || cleanUrl;
    const rawHtml = await resp.text();

    const getMeta = (propName: string): string | undefined => {
      const p1 = new RegExp(`<meta[^>]+(?:property|name)=["']${propName}["'][^>]+content=["']([^"']*)["']`, 'i');
      const m1 = rawHtml.match(p1);
      if (m1 && m1[1]) return decodeHtmlEntities(m1[1].trim());

      const p2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${propName}["']`, 'i');
      const m2 = rawHtml.match(p2);
      if (m2 && m2[1]) return decodeHtmlEntities(m2[1].trim());

      return undefined;
    };

    const titleMatch = rawHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
    const htmlTitle = titleMatch && titleMatch[1] ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;

    let title = getMeta('og:title') || getMeta('twitter:title') || htmlTitle;
    let description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');
    let imageUrl =
      getMeta('og:image:secure_url') ||
      getMeta('og:image') ||
      getMeta('twitter:image');
    let videoUrl =
      getMeta('og:video:secure_url') ||
      getMeta('og:video:url') ||
      getMeta('og:video') ||
      getMeta('twitter:player:stream');
    let siteName = getMeta('og:site_name') || getMeta('publisher');
    const ogType = getMeta('og:type');

    // Extract link[rel="image_src"] fallback
    if (!imageUrl) {
      const linkImgMatch = rawHtml.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']*)["']/i);
      if (linkImgMatch && linkImgMatch[1]) {
        imageUrl = decodeHtmlEntities(linkImgMatch[1].trim());
      }
    }

    if (isFacebook) {
      if (title && /^(Log into Facebook|Facebook|Log in to Facebook)/i.test(title)) {
        title = undefined;
      }
      if (description && /^(Log into Facebook|Facebook helps you connect)/i.test(description)) {
        description = undefined;
      }

      // If Facebook direct scrape was thin on metadata, enrich via public oEmbed endpoint
      if (!imageUrl || !title) {
        try {
          const oembedResp = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(finalResolvedUrl)}`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (oembedResp.ok) {
            const oeJson = await oembedResp.json();
            if (oeJson && !oeJson.error) {
              if (!title && oeJson.title) title = oeJson.title;
              if (!imageUrl && oeJson.thumbnail_url) imageUrl = oeJson.thumbnail_url;
              if (!siteName && oeJson.author_name) siteName = oeJson.author_name;
            }
          }
        } catch {
          // graceful fallback
        }
      }
    }

    let mediaType: 'photo' | 'video' | 'post' | 'article' | 'website' = 'website';
    if (
      videoUrl ||
      ogType?.includes('video') ||
      /(?:videos\/|reel\/|reels\/|watch|\/share\/v\/|\/share\/r\/|fb\.watch)/i.test(
        finalResolvedUrl
      )
    ) {
      mediaType = 'video';
    } else if (
      imageUrl &&
      (/(?:photo\.php|photos\/|\/photo\/)/i.test(finalResolvedUrl) || ogType?.includes('image'))
    ) {
      mediaType = 'photo';
    } else if (isFacebook) {
      mediaType = 'post';
    }

    res.json({
      resolvedUrl: finalResolvedUrl,
      title,
      description,
      imageUrl,
      videoUrl,
      publisher: siteName || (isFacebook ? 'Facebook' : undefined),
      mediaType,
      ogType,
    });
  } catch (error: any) {
    const isFb = /(?:facebook\.com|fb\.watch|fb\.com)/i.test(cleanUrl);
    res.json({
      resolvedUrl: cleanUrl,
      publisher: isFb ? 'Facebook' : undefined,
      mediaType: isFb ? 'post' : 'website',
      error: error.message,
    });
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
        (req.dbUser?.role === 'admin' ||
          (req.user?.email && req.user.email === 'nurulanambashir20@gmail.com'));

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
      const user = req.user as any;
      const created = await createOrRegisterAlumniProfile({
        userUid: user?.uid || user?.id || req.body.userUid,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
  requireAdmin,
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
        allowedHosts: true,
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
