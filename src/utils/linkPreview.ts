/**
 * Link Preview Utility
 * Detects and classifies URLs for media embeds and preview rendering.
 */

export type LinkPreviewType = 'youtube' | 'facebook_video' | 'facebook_post' | 'generic';

export interface LinkPreviewData {
  url: string;
  type: LinkPreviewType;
  videoId?: string;
  isReel?: boolean;
  isShorts?: boolean;
  domain?: string;
}

/**
 * Checks if a given URL belongs to Facebook domains:
 * facebook.com, m.facebook.com, fb.watch, fb.com
 */
export function isFacebookUrl(url: string): boolean {
  if (!url) return false;
  try {
    const raw = url.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase();
    const cleanHost = host.replace(/^www\./, '');
    return (
      cleanHost === 'facebook.com' ||
      cleanHost === 'm.facebook.com' ||
      cleanHost === 'fb.watch' ||
      cleanHost === 'fb.com' ||
      host.endsWith('.facebook.com')
    );
  } catch {
    return /(?:facebook\.com|m\.facebook\.com|fb\.watch|fb\.com)/i.test(url);
  }
}

/**
 * Checks if a Facebook URL is a video:
 * Contains /videos/, /watch, /reel/, /share/v/, /share/r/, or is fb.watch
 */
export function isFacebookVideo(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('/videos/') ||
    lower.includes('/watch') ||
    lower.includes('/reel/') ||
    lower.includes('/share/v/') ||
    lower.includes('/share/r/') ||
    lower.includes('fb.watch')
  );
}

/**
 * Checks if a given URL is a YouTube video or short
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  try {
    const raw = url.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be' ||
      host === 'youtube-nocookie.com'
    );
  } catch {
    return /(?:youtube\.com|youtu\.be)/i.test(url);
  }
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const raw = url.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0]?.split('?')[0] || null;
    }
    if (parsed.pathname.startsWith('/shorts/')) {
      return parsed.pathname.replace(/^\/shorts\//, '').split('/')[0]?.split('?')[0] || null;
    }
    if (parsed.pathname.startsWith('/embed/')) {
      return parsed.pathname.replace(/^\/embed\//, '').split('/')[0]?.split('?')[0] || null;
    }
    if (parsed.pathname.startsWith('/live/')) {
      return parsed.pathname.replace(/^\/live\//, '').split('/')[0]?.split('?')[0] || null;
    }
    if (parsed.searchParams.has('v')) {
      return parsed.searchParams.get('v');
    }
  } catch {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    return match ? match[1] : null;
  }
  return null;
}

/**
 * Main classification helper:
 * For facebook.com, m.facebook.com, fb.watch, and fb.com URLs:
 * - If the URL contains /videos/, /watch, /reel/, /share/v/, /share/r/, or is fb.watch -> 'facebook_video'
 * - Otherwise -> 'facebook_post'
 * For YouTube URLs -> 'youtube'
 * Otherwise -> 'generic'
 */
export function getLinkPreviewType(url: string): LinkPreviewType {
  if (!url) return 'generic';

  if (isFacebookUrl(url)) {
    return isFacebookVideo(url) ? 'facebook_video' : 'facebook_post';
  }

  if (isYouTubeUrl(url)) {
    return 'youtube';
  }

  return 'generic';
}

/**
 * Parses a URL into structured link preview metadata
 */
export function getLinkPreview(url: string): LinkPreviewData {
  if (!url) {
    return { url: '', type: 'generic' };
  }

  const cleanUrl = url.trim();

  // 1. Facebook URLs
  if (isFacebookUrl(cleanUrl)) {
    const isVideo = isFacebookVideo(cleanUrl);
    const isReel = cleanUrl.toLowerCase().includes('/reel/');
    return {
      url: cleanUrl,
      type: isVideo ? 'facebook_video' : 'facebook_post',
      isReel,
      domain: 'facebook.com',
    };
  }

  // 2. YouTube URLs
  if (isYouTubeUrl(cleanUrl)) {
    const videoId = getYouTubeVideoId(cleanUrl);
    const isShorts = cleanUrl.toLowerCase().includes('/shorts/');
    return {
      url: cleanUrl,
      type: 'youtube',
      videoId: videoId || undefined,
      isShorts,
      domain: 'youtube.com',
    };
  }

  // 3. Generic URLs
  let domain = '';
  try {
    const parsed = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {
    domain = cleanUrl;
  }

  return {
    url: cleanUrl,
    type: 'generic',
    domain,
  };
}

export default getLinkPreview;
