import type { Request, Response, NextFunction } from 'express';
import { supabaseServer, isSupabaseServerConfigured, SUPABASE_TABLES } from '../lib/supabase-server.ts';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAILS = new Set([
  'nurulanambashir20@gmail.com',
  'admin@ndcalumni.org',
  'bashir@ndcalumni.org',
]);

export interface AuthRequest extends Request {
  user?: SupabaseUser | any;
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
  if (!isSupabaseServerConfigured) {
    // Dev/Offline token fallback
    if (token.startsWith('mock_oauth_') || token.startsWith('dev_')) {
      return {
        user: { id: 'dev-admin-uid', email: 'nurulanambashir20@gmail.com' } as any,
        dbUser: {
          id: 1,
          uid: 'dev-admin-uid',
          email: 'nurulanambashir20@gmail.com',
          fullName: 'Central Admin',
          role: 'admin',
          accountStatus: 'active',
        },
      };
    }
    return null;
  }

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
  const supabaseResult = await verifySupabaseToken(token);
  if (supabaseResult) {
    req.supabaseUser = supabaseResult.user;
    req.user = supabaseResult.user;
    req.dbUser = supabaseResult.dbUser;
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Invalid token' });
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

  return res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    const supabaseResult = await verifySupabaseToken(token);
    if (supabaseResult) {
      req.supabaseUser = supabaseResult.user;
      req.user = supabaseResult.user;
      req.dbUser = supabaseResult.dbUser;
    }
  }
  next();
};
