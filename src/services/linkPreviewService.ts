import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/apiConfig';

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
    | 'direct_video'
    | 'generic';
  canonical_url: string;
  title: string;
  description: string;
  image?: string;
  video_url?: string;
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
 * Client-side fast fallback detector when network crawler is offline or for local/blob URLs
 */
export function generateClientFallbackMetadata(url: string): LinkMetadata {
  try {
    const raw = url.trim();

    // Direct uploaded video file / data URL / blob URL
    if (
      raw.startsWith('data:video/') ||
      raw.startsWith('blob:') ||
      /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(raw)
    ) {
      return {
        ok: true,
        type: 'direct_video',
        canonical_url: raw,
        video_url: raw,
        title: 'Uploaded Video',
        description: 'Direct playable video stream',
        site_name: 'Video',
      };
    }

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
      let isShorts = false;
      if (host === 'youtu.be') {
        videoId = pathname.slice(1).split('/')[0]?.split('?')[0] || '';
      } else if (pathname.startsWith('/shorts/')) {
        videoId = pathname.replace(/^\/shorts\//, '').split('/')[0]?.split('?')[0] || '';
        isShorts = true;
      } else if (pathname.startsWith('/embed/')) {
        videoId = pathname.replace(/^\/embed\//, '').split('/')[0]?.split('?')[0] || '';
      } else if (parsed.searchParams.has('v')) {
        videoId = parsed.searchParams.get('v') || '';
      }
      return {
        ok: true,
        type: 'youtube',
        canonical_url: url,
        title: videoId ? (isShorts ? 'YouTube Shorts' : 'YouTube Video') : 'YouTube',
        description: 'Watch video on YouTube',
        site_name: 'YouTube',
        image: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined,
        video_id: videoId || undefined,
        is_reel: isShorts,
      };
    }

    // Facebook
    if (
      host === 'facebook.com' ||
      host === 'm.facebook.com' ||
      host === 'web.facebook.com' ||
      host === 'fb.watch' ||
      host === 'fb.com' ||
      host.endsWith('.facebook.com')
    ) {
      const isVideo =
        pathname.includes('/videos/') ||
        pathname.includes('/watch') ||
        pathname.includes('/reel/') ||
        pathname.includes('/reels/') ||
        pathname.includes('/share/v/') ||
        pathname.includes('/share/r/') ||
        host === 'fb.watch';
      const isReel =
        pathname.includes('/reel/') ||
        pathname.includes('/reels/') ||
        pathname.includes('/share/r/');

      // Extract numeric video ID if available
      const videoMatch = pathname.match(/\/(?:videos|reel|reels|share\/[vr])\/(?:[^/]+\/)?(\d+)/i);
      const vParam = parsed.searchParams.get('v');
      const numericId = vParam || (videoMatch ? videoMatch[1] : undefined);

      return {
        ok: true,
        type: isVideo ? 'facebook_video' : 'facebook_post',
        canonical_url: url,
        title: isVideo ? (isReel ? 'Facebook Reel' : 'Facebook Video') : 'Facebook Post',
        description: 'View post on Facebook',
        site_name: 'Facebook',
        video_id: numericId,
        is_reel: isReel,
      };
    }

    // Instagram
    if (host === 'instagram.com' || host === 'instagr.am') {
      const match = pathname.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
      const kind = match ? match[1].toLowerCase() : '';
      const isReel = kind === 'reel' || kind === 'reels';
      return {
        ok: true,
        type: 'instagram',
        canonical_url: url,
        title: isReel ? 'Instagram Reel' : 'Instagram Post',
        description: 'View on Instagram',
        site_name: 'Instagram',
        code: match ? match[2] : undefined,
        is_reel: isReel,
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
        is_reel: true,
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
 * Fetches link preview metadata.
 * Pipeline:
 *  1. In-memory cache
 *  2. Direct video/blob instant detector
 *  3. Backend OpenGraph crawler (/api/unfurl) with crawler User-Agent
 *  4. Client-side heuristic fallback with platform-specific thumbnail & IDs
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

  // Instant response for uploaded video data URLs or blob URLs
  if (
    cleanUrl.startsWith('data:video/') ||
    cleanUrl.startsWith('blob:') ||
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanUrl)
  ) {
    const meta = generateClientFallbackMetadata(cleanUrl);
    previewMemoryCache.set(cleanUrl, meta);
    return meta;
  }

  try {
    // 1. Try our backend crawler proxy (/api/unfurl)
    const unfurlUrl = apiUrl(`/api/unfurl?url=${encodeURIComponent(cleanUrl)}`);
    const resp = await fetch(unfurlUrl, { signal: AbortSignal.timeout(6000) });

    if (resp.ok) {
      const data = await resp.json();
      if (data && (data.imageUrl || data.videoUrl || data.title || data.description || data.resolvedUrl)) {
        const canonical = data.resolvedUrl || cleanUrl;
        const lowerUrl = canonical.toLowerCase();

        // Determine specific platform type
        let type: LinkMetadata['type'] = 'generic';
        let isReel = false;

        if (
          lowerUrl.includes('youtube.com') ||
          lowerUrl.includes('youtu.be') ||
          data.publisher === 'YouTube'
        ) {
          type = 'youtube';
          isReel = lowerUrl.includes('/shorts/');
        } else if (
          lowerUrl.includes('facebook.com') ||
          lowerUrl.includes('fb.watch') ||
          data.publisher === 'Facebook'
        ) {
          const isVideo =
            data.mediaType === 'video' ||
            Boolean(data.videoUrl) ||
            /(?:videos\/|reel\/|reels\/|watch|\/share\/v\/|\/share\/r\/|fb\.watch)/i.test(canonical);
          type = isVideo ? 'facebook_video' : 'facebook_post';
          isReel =
            Boolean(data.is_reel) ||
            /(?:reel\/|reels\/|\/share\/r\/)/i.test(canonical);
        } else if (lowerUrl.includes('instagram.com') || data.publisher === 'Instagram') {
          type = 'instagram';
          isReel = /(?:reel\/|reels\/)/i.test(canonical);
        } else if (lowerUrl.includes('tiktok.com')) {
          type = 'tiktok';
          isReel = true;
        } else if (lowerUrl.includes('vimeo.com')) {
          type = 'vimeo';
        } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
          type = 'twitter';
        } else if (data.videoUrl || data.mediaType === 'video') {
          type = 'direct_video';
        }

        // Extract IDs
        let videoId: string | undefined = undefined;
        let code: string | undefined = undefined;

        if (type === 'youtube') {
          const match = canonical.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (match) videoId = match[1];
        } else if (type === 'instagram') {
          const match = canonical.match(/\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
          if (match) code = match[1];
        } else if (type === 'facebook_video') {
          const match = canonical.match(/\/(?:videos|reel|reels)\/(?:[^/]+\/)?(\d+)/i);
          if (match) videoId = match[1];
        }

        const result: LinkMetadata = {
          ok: true,
          type,
          canonical_url: canonical,
          title: data.title || (isReel ? 'Video Reel' : 'Shared Link'),
          description: data.description || '',
          image: data.imageUrl,
          video_url: data.videoUrl,
          site_name: data.publisher || (type === 'youtube' ? 'YouTube' : type === 'instagram' ? 'Instagram' : type.startsWith('facebook') ? 'Facebook' : undefined),
          video_id: videoId,
          code,
          is_reel: isReel,
        };

        previewMemoryCache.set(cleanUrl, result);
        return result;
      }
    }
  } catch {
    // Backend crawler error or offline - proceed to fallback
  }

  // 2. Client-side heuristic fallback
  const fallback = generateClientFallbackMetadata(cleanUrl);
  previewMemoryCache.set(cleanUrl, fallback);
  return fallback;
}
