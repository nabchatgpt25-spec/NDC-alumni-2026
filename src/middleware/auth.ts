import type { Request, Response, NextFunction } from 'express';
import { supabaseServer, isSupabaseServerConfigured, SUPABASE_TABLES } from '../lib/supabase-server.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getOrCreateUser } from '../db/users.ts';

const SUPER_ADMIN_EMAILS = new Set([
  'nurulanambashir20@gmail.com',
  'admin@ndcalumni.org',
  'bashir@ndcalumni.org',
]);

export interface AuthRequest extends Request {
  user?: DecodedIdToken | SupabaseUser;
  supabaseUser?: SupabaseUser;
  dbUser?: {
    id: number;
    uid: string;
    email: string;
    fullName: string;
    role: string;
    accountStatus: string;
  };
}

async function verifySupabaseToken(token: string) {
  if (!isSupabaseServerConfigured) return null;
  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data?.user) return null;

    const user = data.user;
    const cleanEmail = (user.email || '').toLowerCase().trim();

    // Fetch corresponding profile from Supabase alumni_profiles
    const { data: profile } = await supabaseServer
      .from(SUPABASE_TABLES.ALUMNI_PROFILES)
      .select('id, auth_user_id, email, full_name, role, verification_status')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const envAdminEmails = (process.env.ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const isSuperAdmin =
      SUPER_ADMIN_EMAILS.has(cleanEmail) ||
      envAdminEmails.includes(cleanEmail) ||
      profile?.role === 'admin';

    const role = isSuperAdmin ? 'admin' : (profile?.role || 'member');

    return {
      user,
      dbUser: {
        id: profile?.id ? Number(profile.id) : 1,
        uid: user.id,
        email: cleanEmail || `${user.id}@ndcalumni.org`,
        fullName: profile?.full_name || (user.user_metadata as any)?.full_name || 'Notredamian Alumnus',
        role,
        accountStatus: 'active',
      },
    };
  } catch (err) {
    console.warn('Supabase token verification error:', err);
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Primary: Verify via Supabase Auth
  const supabaseResult = await verifySupabaseToken(token);
  if (supabaseResult) {
    req.supabaseUser = supabaseResult.user;
    req.user = supabaseResult.user;
    req.dbUser = supabaseResult.dbUser;
    return next();
  }

  // 2. Fallback: Verify via legacy Firebase Admin while migration is in progress
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const syncedUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@ndcalumni.org`,
      decodedToken.name
    );
    req.dbUser = syncedUser;
    next();
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing admin credential token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Primary: Verify via Supabase Auth
  const supabaseResult = await verifySupabaseToken(token);
  if (supabaseResult) {
    req.supabaseUser = supabaseResult.user;
    req.user = supabaseResult.user;
    req.dbUser = supabaseResult.dbUser;

    const email = (supabaseResult.user.email || '').toLowerCase();
    const envAdminEmails = (process.env.ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const isAuthorizedAdmin =
      supabaseResult.dbUser.role === 'admin' ||
      SUPER_ADMIN_EMAILS.has(email) ||
      envAdminEmails.includes(email);

    if (!isAuthorizedAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access restricted to backend authority' });
    }

    return next();
  }

  // 2. Fallback: Verify via legacy Firebase Admin while migration is in progress
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const syncedUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@ndcalumni.org`,
      decodedToken.name
    );
    req.dbUser = syncedUser;

    const email = (decodedToken.email || '').toLowerCase();
    const envAdminEmails = (process.env.ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const isAuthorizedAdmin =
      syncedUser?.role === 'admin' ||
      SUPER_ADMIN_EMAILS.has(email) ||
      envAdminEmails.includes(email);

    if (!isAuthorizedAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access restricted to backend authority' });
    }

    next();
  } catch (error) {
    console.error('Error verifying admin credentials on backend:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];

    // 1. Try Supabase Auth
    const supabaseResult = await verifySupabaseToken(token);
    if (supabaseResult) {
      req.supabaseUser = supabaseResult.user;
      req.user = supabaseResult.user;
      req.dbUser = supabaseResult.dbUser;
      return next();
    }

    // 2. Try legacy Firebase Admin
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      const syncedUser = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || `${decodedToken.uid}@ndcalumni.org`,
        decodedToken.name
      );
      req.dbUser = syncedUser;
    } catch {
      // Proceed as unauthenticated
    }
  }
  next();
};
