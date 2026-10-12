import { supabase } from '../lib/supabase';

export interface LinkMetadata {
  ok: boolean;
  type:
    | 'youtube'
    | 'facebook_video'
    | 'facebook_post'
    | 'instagram'
    | 'tiktok'
    | 'twitter'
    | 'vimeo'
    | 'generic';
  canonical_url: string;
  title: string;
  description: string;
  image?: string;
  site_name?: string;
  video_id?: string;
  code?: string;
  is_reel?: boolean;
  error?: string;
}

// In-memory cache: url -> LinkMetadata
const previewMemoryCache = new Map<string, LinkMetadata>();

/**
 * Extracts the first http/https URL from text
 */
export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:?!]/i);
  return match ? match[0] : null;
}

/**
 * Client-side fast fallback detector when Edge Function is not reachable or offline
 */
export function generateClientFallbackMetadata(url: string): LinkMetadata {
  try {
    const raw = url.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname;

    // YouTube
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be' ||
      host === 'youtube-nocookie.com'
    ) {
      let videoId = '';
      if (host === 'youtu.be') {
        videoId = pathname.slice(1).split('/')[0]?.split('?')[0] || '';
      } else if (pathname.startsWith('/shorts/')) {
        videoId = pathname.replace(/^\/shorts\//, '').split('/')[0]?.split('?')[0] || '';
      } else if (pathname.startsWith('/embed/')) {
        videoId = pathname.replace(/^\/embed\//, '').split('/')[0]?.split('?')[0] || '';
      } else if (parsed.searchParams.has('v')) {
        videoId = parsed.searchParams.get('v') || '';
      }
      return {
        ok: true,
        type: 'youtube',
        canonical_url: url,
        title: videoId ? 'YouTube Video' : 'YouTube',
        description: 'Watch video on YouTube',
        site_name: 'YouTube',
        video_id: videoId || undefined,
      };
    }

    // Facebook
    if (
      host === 'facebook.com' ||
      host === 'm.facebook.com' ||
      host === 'fb.watch' ||
      host === 'fb.com' ||
      host.endsWith('.facebook.com')
    ) {
      const isVideo =
        pathname.includes('/videos/') ||
        pathname.includes('/watch') ||
        pathname.includes('/reel/') ||
        pathname.includes('/share/v/') ||
        pathname.includes('/share/r/') ||
        host === 'fb.watch';
      const isReel = pathname.includes('/reel/') || pathname.includes('/share/r/');
      return {
        ok: true,
        type: isVideo ? 'facebook_video' : 'facebook_post',
        canonical_url: url,
        title: isVideo ? (isReel ? 'Facebook Reel' : 'Facebook Video') : 'Facebook Post',
        description: 'View post on Facebook',
        site_name: 'Facebook',
        is_reel: isReel,
      };
    }

    // Instagram
    if (host === 'instagram.com' || host === 'instagr.am') {
      const match = pathname.match(/\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/);
      return {
        ok: true,
        type: 'instagram',
        canonical_url: url,
        title: 'Instagram Post',
        description: 'View post on Instagram',
        site_name: 'Instagram',
        code: match ? match[2] : undefined,
      };
    }

    // TikTok
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      const match = pathname.match(/\/video\/(\d+)/);
      return {
        ok: true,
        type: 'tiktok',
        canonical_url: url,
        title: 'TikTok Video',
        description: 'Watch video on TikTok',
        site_name: 'TikTok',
        video_id: match ? match[1] : undefined,
      };
    }

    // Vimeo
    if (host === 'vimeo.com') {
      const match = pathname.match(/\/(\d+)/);
      return {
        ok: true,
        type: 'vimeo',
        canonical_url: url,
        title: 'Vimeo Video',
        description: 'Watch video on Vimeo',
        site_name: 'Vimeo',
        video_id: match ? match[1] : undefined,
      };
    }

    // Twitter / X
    if (host === 'twitter.com' || host === 'x.com') {
      return {
        ok: true,
        type: 'twitter',
        canonical_url: url,
        title: 'Post on X',
        description: 'View discussion on X',
        site_name: 'X (Twitter)',
      };
    }

    // Generic
    return {
      ok: true,
      type: 'generic',
      canonical_url: url,
      title: host,
      description: url,
      site_name: host,
    };
  } catch {
    return {
      ok: true,
      type: 'generic',
      canonical_url: url,
      title: url,
      description: url,
      site_name: 'Website',
    };
  }
}

/**
 * Fetches link preview metadata from Supabase Edge Function 'link-preview'.
 * Results are cached in memory (Map).
 * Silently falls back to client heuristic detection if Edge Function is not deployed or fails.
 */
export async function fetchLinkPreview(url: string): Promise<LinkMetadata> {
  if (!url || typeof url !== 'string') {
    return {
      ok: false,
      type: 'generic',
      canonical_url: '',
      title: '',
      description: '',
      error: 'Empty URL',
    };
  }

  const cleanUrl = url.trim();

  // Return from in-memory cache if available
  if (previewMemoryCache.has(cleanUrl)) {
    return previewMemoryCache.get(cleanUrl)!;
  }

  try {
    // Attempt invocation of Supabase Edge Function 'link-preview'
    const { data, error } = await supabase.functions.invoke('link-preview', {
      body: { url: cleanUrl },
    });

    if (error || !data || data.ok === false) {
      // Graceful fallback to client detection
      const fallback = generateClientFallbackMetadata(cleanUrl);
      previewMemoryCache.set(cleanUrl, fallback);
      return fallback;
    }

    const result: LinkMetadata = {
      ok: true,
      type: data.type || 'generic',
      canonical_url: data.canonical_url || cleanUrl,
      title: data.title || '',
      description: data.description || '',
      image: data.image,
      site_name: data.site_name,
      video_id: data.video_id,
      code: data.code,
      is_reel: Boolean(
        data.type === 'facebook_video' &&
          (cleanUrl.toLowerCase().includes('/reel/') || cleanUrl.toLowerCase().includes('/share/r/'))
      ),
    };

    previewMemoryCache.set(cleanUrl, result);
    return result;
  } catch {
    const fallback = generateClientFallbackMetadata(cleanUrl);
    previewMemoryCache.set(cleanUrl, fallback);
    return fallback;
  }
}
