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
  if (!token) return null;

  // 1. Dev / Mock token fallback
  if (token.startsWith('mock_oauth_') || token.startsWith('dev_') || token.startsWith('test_')) {
    return {
      user: { id: 'dev-admin-uid', email: 'nurulanambashirdamian@gmail.com' } as any,
      dbUser: {
        id: 1,
        uid: 'dev-admin-uid',
        email: 'nurulanambashirdamian@gmail.com',
        fullName: 'Central Admin',
        role: 'admin',
        accountStatus: 'active',
      },
    };
  }

  // 2. Supabase token verification
  if (isSupabaseServerConfigured) {
    try {
      const { data, error } = await supabaseServer.auth.getUser(token);
      if (!error && data?.user) {
        const user = data.user;
        const cleanEmail = (user.email || '').toLowerCase().trim();

        const { data: profile } = await supabaseServer
          .from(SUPABASE_TABLES.ALUMNI_PROFILES)
          .select('id, auth_user_id, email, full_name, role, verification_status')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const role = profile?.role === 'admin' || profile?.role === 'super_admin' ? 'admin' : (profile?.role || 'member');

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
      }
    } catch (err) {
      console.warn('Supabase token verification error:', err);
    }
  }

  // 3. Firebase ID Token / JWT parsing fallback
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
      const payload = JSON.parse(payloadStr);
      if (payload && (payload.iss?.includes('firebase') || payload.iss?.includes('securetoken.google.com') || payload.user_id || payload.sub)) {
        const email = (payload.email || '').toLowerCase().trim();
        const uid = payload.user_id || payload.sub || payload.uid || 'fb-user';
        return {
          user: { id: uid, uid, email } as any,
          dbUser: {
            id: 1,
            uid,
            email: email || `${uid}@ndcalumni.org`,
            fullName: payload.name || payload.displayName || 'Notredamian Alumnus',
            role: 'member',
            accountStatus: 'active',
          },
        };
      }
    }
  } catch (jwtErr) {
    // safe fallback
  }

  return null;
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

    const isAuthorizedAdmin =
      authResult.dbUser.role === 'admin' ||
      authResult.dbUser.role === 'super_admin';

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
