import type { Request, Response, NextFunction } from 'express';
import { supabaseServer, isSupabaseServerConfigured, SUPABASE_TABLES } from '../lib/supabase-server.ts';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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

async function verifyAuthToken(token: string) {
  if (!token || !isSupabaseServerConfigured) return null;

  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data?.user) return null;

    const user = data.user;
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const { data: profile, error: profileError } = await supabaseServer
      .from(SUPABASE_TABLES.ALUMNI_PROFILES)
      .select('id, auth_user_id, email, full_name, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !profile?.id) return null;

    const role =
      profile.role === 'admin' || profile.role === 'moderator'
        ? profile.role
        : 'member';

    return {
      user,
      dbUser: {
        id: Number(profile.id),
        uid: user.id,
        email: cleanEmail || `${user.id}@ndcalumni.org`,
        fullName: profile.full_name || (user.user_metadata as any)?.full_name || 'Notredamian Alumnus',
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
  const authResult = await verifyAuthToken(token);
  if (authResult) {
    req.supabaseUser = authResult.user;
    req.user = authResult.user;
    req.dbUser = authResult.dbUser;
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
  const authResult = await verifyAuthToken(token);
  if (authResult) {
    req.supabaseUser = authResult.user;
    req.user = authResult.user;
    req.dbUser = authResult.dbUser;

    const isAuthorizedAdmin = authResult.dbUser.role === 'admin';

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
    const authResult = await verifyAuthToken(token);
    if (authResult) {
      req.supabaseUser = authResult.user;
      req.user = authResult.user;
      req.dbUser = authResult.dbUser;
    }
  }
  next();
};
