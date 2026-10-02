export const CUSTOM_DOMAIN = 'https://ndcbogura.alumniworld.xyz';
export const PUBLISHED_AI_STUDIO_URL = 'https://ndc-alumni-2026.ai.studio';
export const CLOUD_RUN_BACKEND_URL =
  'https://ais-pre-siz5cxwdtehl5ayj3qiu3s-456498149201.asia-southeast1.run.app';

export function apiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('alumniworld.xyz')) {
      return `${PUBLISHED_AI_STUDIO_URL}${path}`;
    }
  }
  return path;
}
