import { SUPABASE_API_URL, SUPABASE_API_ANON_KEY } from './supabase';

export const CUSTOM_DOMAIN = 'https://ndcbogura.alumniworld.xyz';
export const PUBLISHED_AI_STUDIO_URL = 'https://ndc-alumni-2026.ai.studio';
export const CLOUD_RUN_BACKEND_URL =
  'https://ais-pre-siz5cxwdtehl5ayj3qiu3s-456498149201.asia-southeast1.run.app';

const SUPABASE_URL = SUPABASE_API_URL.replace(/\/$/, '');
const SUPABASE_ANON_KEY = SUPABASE_API_ANON_KEY;

export function getEdgeFunctionUrl(functionName: string): string {
  if (SUPABASE_URL) {
    return `${SUPABASE_URL}/functions/v1/${functionName}`;
  }
  return `/api/${functionName}`;
}

export function apiUrl(path: string): string {
  if (!SUPABASE_URL) {
    return path;
  }

  // 1. Unfurl OpenGraph crawler proxy -> Supabase 'unfurl' Edge Function
  if (path.startsWith('/api/unfurl')) {
    const query = path.includes('?') ? path.slice(path.indexOf('?') + 1) : '';
    const keyParam = SUPABASE_ANON_KEY ? `&apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}` : '';
    return `${getEdgeFunctionUrl('unfurl')}?${query}${keyParam}`;
  }

  // 2. Unified phone login -> Supabase 'unified-phone-login' Edge Function
  if (path.startsWith('/api/auth/unified-login') || path.startsWith('/api/auth/login')) {
    return getEdgeFunctionUrl('unified-phone-login');
  }

  // 3. Admin Command Center & Directory routes -> Supabase 'admin-hub' Edge Function
  if (path.startsWith('/api/admin') || path.startsWith('/api/alumni')) {
    const [pathname, queryString] = path.split('?');
    const params = new URLSearchParams(queryString || '');
    params.set('endpoint', pathname);
    if (SUPABASE_ANON_KEY && !params.has('apikey')) {
      params.set('apikey', SUPABASE_ANON_KEY);
    }
    return `${getEdgeFunctionUrl('admin-hub')}?${params.toString()}`;
  }

  return path;
}

