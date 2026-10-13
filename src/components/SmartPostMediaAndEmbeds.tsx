import React, { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Volume2,
  VolumeX,
  Play,
  Globe,
  Video as VideoIcon,
  Share2,
  Loader2,
  Image as ImageIcon,
  Copy,
  Check,
  Maximize2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  useFacebookOEmbed,
  isFacebookUrl,
  fetchFacebookOEmbed,
  type FacebookOEmbedData,
} from '../services/facebookOEmbedService';
import { apiUrl } from '../lib/apiConfig';

export type DetectedEmbedType =
  | 'youtube'
  | 'facebook-video'
  | 'facebook-post'
  | 'facebook-photo'
  | 'instagram'
  | 'linkedin'
  | 'vimeo'
  | 'tiktok'
  | 'direct-video'
  | 'generic-link';

export interface ParsedEmbedInfo {
  originalUrl: string;
  normalizedUrl: string;
  type: DetectedEmbedType;
  embedUrl?: string;
  platformName: string;
  platformColor: string;
  hostname: string;
  titleHint: string;
  isShortsOrReel?: boolean;
  needsRedirectResolution?: boolean;
}

export interface UnfurledLinkData {
  resolvedUrl?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  author?: string;
  publisher?: string;
}

const UNFURL_CACHE_PREFIX = 'ndc_unfurl_v3_';

/**
 * Normalizes a raw URL string so links like "www.facebook.com/..." or "facebook.com/..."
 * or "fb.watch/..." or "notredame.edu.bd" work even if the user omitted "https://"
 */
export function normalizeUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    (lower.startsWith('data:') && !lower.startsWith('data:image/') && !lower.startsWith('data:video/'))
  ) {
    return '';
  }
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('data:video/') ||
    lower.startsWith('blob:')
  ) {
    return trimmed;
  }
  if (
    /^(www\.|m\.|web\.|facebook\.com|fb\.watch|fb\.com|youtube\.com|youtu\.be|instagram\.com|linkedin\.com|lnkd\.in|tiktok\.com|vimeo\.com)/i.test(
      trimmed
    ) ||
    /^[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com|org|net|edu|gov|bd|io|co|tc|info|me|app|dev|ai|news|tv|uk|us|ca|au|in|xyz|live|online|site|tech)(?:\/.*|$)/i.test(
      trimmed
    )
  ) {
    return `https://${trimmed}`;
  }
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/**
 * Extracts all URLs (including http://, https://, www., facebook.com/, fb.watch/, youtu.be/, or domain links) from text
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const urlRegex =
    /(?:https?:\/\/|www\.|(?:facebook\.com|fb\.watch|fb\.com|youtube\.com|youtu\.be|instagram\.com|linkedin\.com|tiktok\.com|vimeo\.com)\/|(?:[a-z0-9-]+\.)+(?:com|org|net|edu|gov|bd|io|co|tc|info|me|app|dev|ai|news|tv|uk|us|ca|au|in|xyz|live|online|site|tech)(?:\/|$))[^\s<>"')]*/gi;
  const matches: string[] = text.match(urlRegex) || [];
  return Array.from(
    new Set(
      matches
        .filter((u: string) => !u.includes('@'))
        .map((u: string) => normalizeUrlInput(u.replace(/[.,;!?]+$/, '')))
        .filter((u: string) => /^https?:\/\//i.test(u))
    )
  );
}

/**
 * Detects the first valid http/https URL in a post.
 * Rejects unsafe protocols (javascript:, data:, vbscript:, file:, etc.)
 * Strips common sentence-ending punctuation (.,;!?).
 */
export function extractFirstValidUrl(text: string): string | null {
  if (!text) return null;
  const urlRegex = /https?:\/\/[^\s<>"')]+/gi;
  const matches = text.match(urlRegex);
  if (!matches || matches.length === 0) return null;

  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;!?]+$/, '').trim();
    if (!cleaned) continue;
    try {
      const parsed = new URL(cleaned);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        if (parsed.hostname && parsed.hostname.includes('.')) {
          return cleaned;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

const VALID_YOUTUBE_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export interface ValidYouTubeResult {
  isValid: boolean;
  videoId: string | null;
  embedUrl: string | null;
  isShorts: boolean;
}

export function parseValidYouTubeUrl(rawUrl: string): ValidYouTubeResult {
  if (!rawUrl) return { isValid: false, videoId: null, embedUrl: null, isShorts: false };

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, videoId: null, embedUrl: null, isShorts: false };
    }

    const host = parsed.hostname.toLowerCase();
    if (!VALID_YOUTUBE_HOSTNAMES.has(host)) {
      return { isValid: false, videoId: null, embedUrl: null, isShorts: false };
    }

    let videoId: string | null = null;
    let isShorts = false;

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      const segment = parsed.pathname.slice(1).split('/')[0]?.split('?')[0];
      if (segment && YOUTUBE_ID_PATTERN.test(segment)) {
        videoId = segment;
      }
    } else if (parsed.pathname.startsWith('/shorts/')) {
      const segment = parsed.pathname.replace(/^\/shorts\//, '').split('/')[0]?.split('?')[0];
      if (segment && YOUTUBE_ID_PATTERN.test(segment)) {
        videoId = segment;
        isShorts = true;
      }
    } else if (parsed.pathname.startsWith('/embed/')) {
      const segment = parsed.pathname.replace(/^\/embed\//, '').split('/')[0]?.split('?')[0];
      if (segment && YOUTUBE_ID_PATTERN.test(segment)) {
        videoId = segment;
      }
    } else if (parsed.pathname.startsWith('/live/')) {
      const segment = parsed.pathname.replace(/^\/live\//, '').split('/')[0]?.split('?')[0];
      if (segment && YOUTUBE_ID_PATTERN.test(segment)) {
        videoId = segment;
      }
    } else if (parsed.pathname === '/watch' || parsed.searchParams.has('v')) {
      const v = parsed.searchParams.get('v');
      if (v && YOUTUBE_ID_PATTERN.test(v)) {
        videoId = v;
      }
    }

    if (videoId) {
      return {
        isValid: true,
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0`,
        isShorts,
      };
    }
  } catch {
    // URL parse failed
  }

  return { isValid: false, videoId: null, embedUrl: null, isShorts: false };
}

export interface SiteMetadata {
  siteName: string;
  hostname: string;
  colorClass: string;
}

export function getSiteMetadata(rawUrl: string): SiteMetadata {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.|web\.)/i, '');

    if (host === 'facebook.com' || host === 'fb.watch' || host === 'fb.com') {
      return { siteName: 'Facebook', hostname: host, colorClass: 'bg-[#1877F2] text-white' };
    }
    if (host === 'instagram.com') {
      return { siteName: 'Instagram', hostname: host, colorClass: 'bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white' };
    }
    if (host === 'linkedin.com' || host === 'lnkd.in') {
      return { siteName: 'LinkedIn', hostname: host, colorClass: 'bg-[#0A66C2] text-white' };
    }
    if (host === 'twitter.com' || host === 'x.com') {
      return { siteName: 'X (Twitter)', hostname: host, colorClass: 'bg-slate-900 dark:bg-black text-white' };
    }
    if (host === 'github.com') {
      return { siteName: 'GitHub', hostname: host, colorClass: 'bg-slate-800 dark:bg-slate-900 text-white' };
    }
    if (host === 'reddit.com') {
      return { siteName: 'Reddit', hostname: host, colorClass: 'bg-[#FF4500] text-white' };
    }
    if (host === 'tiktok.com') {
      return { siteName: 'TikTok', hostname: host, colorClass: 'bg-slate-900 dark:bg-black text-white' };
    }
    if (host === 'vimeo.com') {
      return { siteName: 'Vimeo', hostname: host, colorClass: 'bg-sky-600 text-white' };
    }

    const firstPart = host.split('.')[0] || host;
    const formatted = firstPart.length > 2
      ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1)
      : host;

    return { siteName: formatted, hostname: host, colorClass: 'bg-slate-700 dark:bg-slate-800 text-slate-100' };
  } catch {
    return { siteName: 'Website', hostname: rawUrl, colorClass: 'bg-slate-700 dark:bg-slate-800 text-slate-100' };
  }
}

/**
 * Renders post text with full clickable hyperlinks so shared links are always interactive and visible
 */
export function renderTextWithClickableLinks(text: string): React.ReactNode {
  if (!text) return null;
  const splitRegex =
    /((?:https?:\/\/|www\.|(?:facebook\.com|fb\.watch|fb\.com|youtube\.com|youtu\.be|instagram\.com|linkedin\.com|tiktok\.com|vimeo\.com)\/|(?:[a-z0-9-]+\.)+(?:com|org|net|edu|gov|bd|io|co|tc|info|me|app|dev|ai|news|tv|uk|us|ca|au|in|xyz|live|online|site|tech)\/)[^\s<>"')]*)/gi;
  const parts = text.split(splitRegex);
  return parts.map((part, idx) => {
    if (
      !part.includes('@') &&
      /^(?:https?:\/\/|www\.|(?:facebook\.com|fb\.watch|fb\.com|youtube\.com|youtu\.be|instagram\.com|linkedin\.com|tiktok\.com|vimeo\.com)\/|(?:[a-z0-9-]+\.)+(?:com|org|net|edu|gov|bd|io|co|tc|info|me|app|dev|ai|news|tv|uk|us|ca|au|in|xyz|live|online|site|tech)\/)/i.test(
        part
      )
    ) {
      const cleanDisplay = part.replace(/[.,;!?]+$/, '');
      const cleanHref = normalizeUrlInput(cleanDisplay);
      const trailingPunct = part.slice(cleanDisplay.length);
      return (
        <React.Fragment key={idx}>
          <a
            href={cleanHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 break-all hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {cleanDisplay}
          </a>
          {trailingPunct}
        </React.Fragment>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Decodes HTML entities commonly returned by Facebook/Open Graph tags (e.g. &#xb7; -> ·, &amp; -> &)
 */
export function decodeHtmlEntities(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&#xb7;/gi, '·')
    .replace(/&#183;/gi, '·')
    .replace(/&middot;/gi, '·')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

/**
 * Helper to extract a numeric Facebook Video or Reel ID from any Facebook URL
 */
function extractFacebookVideoId(parsedUrl: URL): string | null {
  const path = parsedUrl.pathname;
  // 1. ?v=123456789 (watch/?v=... or video.php?v=...)
  const vParam = parsedUrl.searchParams.get('v');
  if (vParam && /^\d+$/.test(vParam)) {
    return vParam;
  }
  // 2. /reel/123456789 or /videos/123456789 or /videos/slug/123456789
  const reelMatch = path.match(/\/reel\/(\d+)/i);
  if (reelMatch) return reelMatch[1];

  const videoMatches = path.match(/\/videos\/(?:[^/]+\/)?(\d+)/i);
  if (videoMatches) return videoMatches[1];

  return null;
}

/**
 * Builds canonical Facebook plugin embed URLs that work reliably across desktop/mobile links
 */
function buildFacebookPluginInfo(rawUrl: string, parsedUrl: URL): ParsedEmbedInfo {
  const host = parsedUrl.hostname.replace(/^(www\.|m\.|web\.)/i, '').toLowerCase();
  const path = parsedUrl.pathname;

  // Normalize m.facebook.com / web.facebook.com to www.facebook.com
  const canonicalUrlObj = new URL(parsedUrl.toString());
  if (host.endsWith('facebook.com')) {
    canonicalUrlObj.hostname = 'www.facebook.com';
  }
  const normalizedUrl = canonicalUrlObj.toString();

  // Check if this is a short/share redirect link (/share/v/..., /share/p/..., /share/r/..., /share/..., fb.watch/...)
  const isShareOrShortLink =
    host === 'fb.watch' ||
    path.startsWith('/share/');

  const isPhoto =
    path.startsWith('/photo') ||
    path.includes('/photos/') ||
    path.includes('/photo.php') ||
    canonicalUrlObj.searchParams.has('fbid');

  const videoId = extractFacebookVideoId(canonicalUrlObj);

  const isVideo =
    Boolean(videoId) ||
    host === 'fb.watch' ||
    path.includes('/videos/') ||
    path.includes('/reel/') ||
    path.includes('/watch') ||
    path.includes('/share/v/') ||
    path.includes('/share/r/');

  const isReel = path.includes('/reel/') || path.includes('/share/r/');

  // When we have a numeric videoId, Facebook's plugins/video.php works most reliably
  // when given the canonical https://www.facebook.com/facebook/videos/{videoId}/ href
  const hrefForVideoPlugin = videoId
    ? `https://www.facebook.com/facebook/videos/${videoId}/`
    : normalizedUrl;

  const encodedHref = encodeURIComponent(isVideo ? hrefForVideoPlugin : normalizedUrl);
  const pluginUrl = isVideo
    ? `https://www.facebook.com/plugins/video.php?href=${encodedHref}&show_text=false&width=500`
    : isPhoto
    ? undefined
    : `https://www.facebook.com/plugins/post.php?href=${encodedHref}&show_text=true&width=500`;

  let detectedType: DetectedEmbedType = 'facebook-post';
  let titleHint = 'Facebook Post';
  if (isPhoto && !isVideo) {
    detectedType = 'facebook-photo';
    titleHint = 'Facebook Photo';
  } else if (isVideo) {
    detectedType = 'facebook-video';
    titleHint = isReel ? 'Facebook Reel' : 'Facebook Video';
  }

  return {
    originalUrl: rawUrl,
    normalizedUrl,
    type: detectedType,
    embedUrl: pluginUrl,
    platformName: 'Facebook',
    platformColor: 'bg-[#1877F2]',
    hostname: 'facebook.com',
    titleHint,
    isShortsOrReel: isReel,
    needsRedirectResolution: isShareOrShortLink,
  };
}

/**
 * Analyzes any URL (YouTube, Facebook, Instagram, LinkedIn, Vimeo, TikTok, direct video, or any web link)
 * and determines how to render a full-visibility embed or video player.
 */
export function parseUrlForEmbed(rawInputUrl: string): ParsedEmbedInfo {
  const url = normalizeUrlInput(rawInputUrl);

  // 1. Direct uploaded or linked video (data:video/... or blob:... or .mp4/.webm/.ogg/.mov)
  if (
    url.startsWith('data:video/') ||
    url.startsWith('blob:') ||
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
  ) {
    return {
      originalUrl: rawInputUrl,
      normalizedUrl: url,
      type: 'direct-video',
      embedUrl: url,
      platformName: 'Video',
      platformColor: 'bg-purple-600',
      hostname: 'Video Stream',
      titleHint: 'Post Video',
    };
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      originalUrl: rawInputUrl,
      normalizedUrl: url,
      type: 'generic-link',
      platformName: 'Shared Link',
      platformColor: 'bg-slate-700',
      hostname: url,
      titleHint: url,
    };
  }

  const host = parsedUrl.hostname.replace(/^(www\.|m\.|web\.)/i, '').toLowerCase();
  const path = parsedUrl.pathname;

  // 2. YouTube (watch, youtu.be, shorts, embed, live)
  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    let videoId: string | null = null;
    let isShorts = false;
    if (host === 'youtu.be') {
      videoId = path.split('/').filter(Boolean)[0] || null;
    } else if (path.startsWith('/watch')) {
      videoId = parsedUrl.searchParams.get('v');
    } else if (path.startsWith('/shorts/')) {
      videoId = path.split('/').filter(Boolean)[1] || null;
      isShorts = true;
    } else if (path.startsWith('/embed/') || path.startsWith('/live/')) {
      videoId = path.split('/').filter(Boolean)[1] || null;
    }

    if (videoId) {
      return {
        originalUrl: rawInputUrl,
        normalizedUrl: url,
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0`,
        platformName: 'YouTube',
        platformColor: 'bg-red-600',
        hostname: 'youtube.com',
        titleHint: isShorts ? `YouTube Shorts (${videoId})` : `YouTube Video (${videoId})`,
        isShortsOrReel: isShorts,
      };
    }
  }

  // 3. Facebook (Videos, Reels, Watch, Share/v, Share/r, Posts, Photos, Share/p, Permalinks)
  if (
    host.endsWith('facebook.com') ||
    host === 'fb.watch' ||
    host === 'fb.com'
  ) {
    return buildFacebookPluginInfo(rawInputUrl, parsedUrl);
  }

  // 4. Instagram (Posts /p/, Reels /reel/ or /reels/, IGTV /tv/, or Profile/Share)
  if (host.endsWith('instagram.com')) {
    const igMatch = path.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
    if (igMatch) {
      const rawKind = igMatch[1].toLowerCase();
      const kind = rawKind === 'reels' ? 'reel' : rawKind;
      const shortcode = igMatch[2];
      return {
        originalUrl: rawInputUrl,
        normalizedUrl: url,
        type: 'instagram',
        embedUrl: `https://www.instagram.com/${kind}/${shortcode}/embed/captioned/`,
        platformName: 'Instagram',
        platformColor: 'bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500',
        hostname: 'instagram.com',
        titleHint: `Instagram ${kind === 'reel' ? 'Reel' : 'Post'}`,
        isShortsOrReel: kind === 'reel',
      };
    }

    const cleanIgHandle = path.split('/').filter(Boolean)[0] || 'Instagram';
    return {
      originalUrl: rawInputUrl,
      normalizedUrl: url,
      type: 'instagram',
      platformName: 'Instagram',
      platformColor: 'bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500',
      hostname: 'instagram.com',
      titleHint: `Instagram (@${cleanIgHandle})`,
    };
  }

  // 5. LinkedIn (Feed updates, Posts, Activity URNs, Pulse Articles, Profiles)
  if (host.endsWith('linkedin.com') || host === 'lnkd.in') {
    const urnMatch = url.match(/urn:li:(activity|share|ugcPost):(\d+)/i);
    const activityDigitsMatch = path.match(/(?:activity|ugcPost|share)-(\d{15,22})/i);
    let embedUrl: string | undefined;

    if (urnMatch) {
      embedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:${urnMatch[1]}:${urnMatch[2]}`;
    } else if (activityDigitsMatch) {
      const kind = path.toLowerCase().includes('ugcpost-') ? 'ugcPost' : 'activity';
      embedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:${kind}:${activityDigitsMatch[1]}`;
    } else if (path.startsWith('/embed/')) {
      embedUrl = url;
    }

    const rawSlug =
      path
        .split('/')
        .filter(Boolean)
        .pop()
        ?.replace(/-(?:activity|ugcPost|share)-\d+.*$/i, '')
        ?.replace(/[-_]/g, ' ')
        .trim() || 'LinkedIn Professional Update';

    return {
      originalUrl: rawInputUrl,
      normalizedUrl: url,
      type: 'linkedin',
      embedUrl,
      platformName: 'LinkedIn',
      platformColor: 'bg-sky-700',
      hostname: 'linkedin.com',
      titleHint: rawSlug.charAt(0).toUpperCase() + rawSlug.slice(1, 110),
    };
  }

  // 6. TikTok Videos
  if (host.endsWith('tiktok.com')) {
    const ttMatch = path.match(/\/video\/(\d+)/i);
    if (ttMatch) {
      return {
        originalUrl: rawInputUrl,
        normalizedUrl: url,
        type: 'tiktok',
        embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
        platformName: 'TikTok',
        platformColor: 'bg-slate-900',
        hostname: 'tiktok.com',
        titleHint: `TikTok Video (${ttMatch[1]})`,
        isShortsOrReel: true,
      };
    }
  }

  // 7. Vimeo
  if (host.endsWith('vimeo.com')) {
    const vimeoMatch = path.match(/\/(\d+)/);
    if (vimeoMatch) {
      return {
        originalUrl: rawInputUrl,
        normalizedUrl: url,
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?api=1&autoplay=0`,
        platformName: 'Vimeo',
        platformColor: 'bg-cyan-600',
        hostname: 'vimeo.com',
        titleHint: `Vimeo Video (${vimeoMatch[1]})`,
      };
    }
  }

  // 8. Generic Website / Article / Other Social Link
  const cleanSegments = path
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      try {
        return decodeURIComponent(seg).replace(/[-_]/g, ' ');
      } catch {
        return seg.replace(/[-_]/g, ' ');
      }
    });
  const titleHint =
    cleanSegments.length > 0
      ? cleanSegments[cleanSegments.length - 1]
      : parsedUrl.hostname;

  return {
    originalUrl: rawInputUrl,
    normalizedUrl: url,
    type: 'generic-link',
    platformName: host,
    platformColor: 'bg-slate-800',
    hostname: host,
    titleHint: titleHint.charAt(0).toUpperCase() + titleHint.slice(1),
  };
}

/**
 * Resolves short/share redirect links and fetches OpenGraph metadata (title, description, thumbnail image, direct video URL)
 * via our server-side crawler proxy first (/api/unfurl) with fallback to Microlink API.
 */
function useLinkUnfurl(url: string, enabled = true) {
  const [data, setData] = useState<UnfurledLinkData | null>(() => {
    if (typeof window === 'undefined' || !url) return null;
    try {
      const cached = localStorage.getItem(UNFURL_CACHE_PREFIX + url);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled || !url || url.startsWith('data:') || url.startsWith('blob:')) return;

    let isCancelled = false;
    const cacheKey = UNFURL_CACHE_PREFIX + url;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached));
        return;
      }
    } catch {
      // ignore
    }

    setLoading(true);

    // 1. Try our backend OpenGraph crawler proxy first (/api/unfurl) which uses facebookexternalhit UA and bypasses CORS/rate-limits
    fetch(apiUrl(`/api/unfurl?url=${encodeURIComponent(url)}`))
      .then((res) => {
        if (!res.ok) throw new Error('Backend unfurl failed');
        return res.json();
      })
      .then((json) => {
        if (isCancelled) return;
        if (json && (json.imageUrl || json.videoUrl || json.title || json.description)) {
          const unfurled: UnfurledLinkData = {
            resolvedUrl: json.resolvedUrl || url,
            title: json.title || undefined,
            description: json.description || undefined,
            imageUrl: json.imageUrl || undefined,
            videoUrl: json.videoUrl || undefined,
            author: json.publisher || json.author || undefined,
            publisher: json.publisher || undefined,
          };
          setData(unfurled);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(unfurled));
          } catch {
            // ignore storage quota
          }
          return;
        }
        throw new Error('No metadata from backend');
      })
      .catch(() => {
        if (isCancelled) return;
        // 2. Fallback to Microlink if backend crawler had an error
        return fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true`)
          .then((res) => res.json())
          .then((json) => {
            if (isCancelled) return;
            if (json && json.status === 'success' && json.data) {
              const d = json.data;
              const unfurled: UnfurledLinkData = {
                resolvedUrl: d.url || url,
                title: d.title || undefined,
                description: d.description || undefined,
                imageUrl: d.image?.url || d.screenshot?.url || d.logo?.url || undefined,
                videoUrl: d.video?.url || undefined,
                author: d.author || undefined,
                publisher: d.publisher || undefined,
              };
              setData(unfurled);
              try {
                localStorage.setItem(cacheKey, JSON.stringify(unfurled));
              } catch {
                // ignore storage quota
              }
            }
          });
      })
      .catch(() => {
        // Fallback silently if offline
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [url, enabled]);

  return { data, loading };
}

/**
 * Native HTML5 Video Player that automatically turns ON (plays) when scrolled into view
 * and automatically turns OFF (pauses) when scrolled out of view.
 */
export const AutoPlayVideoPlayer: React.FC<{
  src: string;
  poster?: string;
  autoPlayOnScroll?: boolean;
}> = ({ src, poster, autoPlayOnScroll = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Resume with sound by default (unmuted)
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const videoEl = videoRef.current;
    const containerEl = containerRef.current;
    if (!videoEl || !containerEl) return;

    // When the user interacts with the page, ensure sound is unmuted if user desires sound
    const handleUserInteraction = () => {
      if (!isMutedRef.current && videoEl && videoEl.muted) {
        videoEl.muted = false;
        setIsMuted(false);
      }
    };
    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    const checkVisibility = () => {
      if (!containerEl || !videoEl) return;
      const rect = containerEl.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
      const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;

      // When scrolled out of viewport: pause
      if (rect.bottom < 40 || rect.top > windowHeight - 40 || ratio < 0.35) {
        if (!videoEl.paused) {
          videoEl.pause();
        }
      } else if (ratio >= 0.5) {
        // When visible again in viewport: resume WITH SOUND
        if (autoPlayOnScroll && videoEl.paused) {
          document.querySelectorAll('video').forEach((otherVid) => {
            if (otherVid !== videoEl && !otherVid.paused) {
              otherVid.pause();
            }
          });

          // Resume with sound
          videoEl.muted = false;
          setIsMuted(false);
          isMutedRef.current = false;
          videoEl.play().catch(() => {
            // If browser blocks unmuted autoplay before first gesture, fallback to muted temporarily
            videoEl.muted = true;
            videoEl.play().catch(() => {});
          });
        }
      }
    };

    // 1. IntersectionObserver for viewport entry and exit
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (autoPlayOnScroll) {
              document.querySelectorAll('video').forEach((otherVid) => {
                if (otherVid !== videoEl && !otherVid.paused) {
                  otherVid.pause();
                }
              });

              // Resume with sound
              videoEl.muted = false;
              setIsMuted(false);
              isMutedRef.current = false;
              videoEl.play().catch(() => {
                videoEl.muted = true;
                videoEl.play().catch(() => {});
              });
            }
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
            // Pause any video that is scrolled out of the viewport
            if (!videoEl.paused) {
              videoEl.pause();
            }
          }
        });
      },
      {
        threshold: [0, 0.15, 0.35, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(containerEl);

    // 2. Window scroll & resize listeners for high-speed scrolling accuracy
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        checkVisibility();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [autoPlayOnScroll]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const nextMuted = !isMuted;
    videoEl.muted = nextMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black group shadow-xs"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        playsInline
        muted={isMuted}
        loop
        preload="metadata"
        className="w-full max-h-[520px] object-contain bg-black"
      />

      {/* Mute/unmute control; autoplay remains managed by visibility */}
      <div className="absolute top-3 right-3 flex items-center pointer-events-none z-10">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="pointer-events-auto inline-flex items-center justify-center p-2 rounded-full bg-black/80 hover:bg-black text-white transition-colors cursor-pointer shadow-md"
          title={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * YouTube IFrame Player that automatically plays (muted) when scrolled into view
 * and automatically pauses when scrolled out of view via YouTube IFrame JS API postMessage.
 */
export const AutoPlayYouTubeEmbed: React.FC<{
  embedUrl: string;
  originalUrl: string;
  titleHint?: string;
  autoPlayOnScroll?: boolean;
}> = ({ embedUrl, originalUrl, titleHint = 'YouTube Video', autoPlayOnScroll = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const wasPlayingRef = useRef<boolean>(false);
  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Ensure iframe URL contains enablejsapi=1, playsinline=1, and origin for postMessage API control
  const normalizedEmbedUrl = React.useMemo(() => {
    try {
      const u = new URL(embedUrl);
      u.searchParams.set('enablejsapi', '1');
      u.searchParams.set('playsinline', '1');
      u.searchParams.set('rel', '0');
      if (typeof window !== 'undefined') {
        u.searchParams.set('origin', window.location.origin);
      }
      return u.toString();
    } catch {
      const sep = embedUrl.includes('?') ? '&' : '?';
      return `${embedUrl}${sep}enablejsapi=1&playsinline=1&rel=0`;
    }
  }, [embedUrl]);

  const sendYouTubeCommand = (func: 'playVideo' | 'pauseVideo' | 'stopVideo' | 'mute' | 'unMute') => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args: [],
        }),
        '*'
      );
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args: '',
        }),
        '*'
      );
      win.postMessage(`{"event":"command","func":"${func}","args":""}`, '*');
    } catch {
      // Ignore cross-origin frame timing errors
    }
  };

  // Connect YouTube IFrame API to track play state and pause programmatically
  useEffect(() => {
    let isCancelled = false;

    if (typeof window !== 'undefined') {
      if (!(window as any).YT) {
        const existing = document.getElementById('youtube-iframe-api');
        if (!existing) {
          const tag = document.createElement('script');
          tag.id = 'youtube-iframe-api';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(tag);
        }
      }

      const initPlayer = () => {
        if (isCancelled || !iframeRef.current || !(window as any).YT?.Player) return;
        try {
          ytPlayerRef.current = new (window as any).YT.Player(iframeRef.current, {
            events: {
              onStateChange: (event: any) => {
                // 1 = Playing, 2 = Paused, 0 = Ended
                if (event.data === 1) {
                  wasPlayingRef.current = true;
                } else if (event.data === 2) {
                  wasPlayingRef.current = false;
                }
              },
            },
          });
        } catch {
          // Fallback to postMessage
        }
      };

      if ((window as any).YT?.Player) {
        initPlayer();
      } else {
        const timer = setInterval(() => {
          if ((window as any).YT?.Player) {
            clearInterval(timer);
            initPlayer();
          }
        }, 150);
        setTimeout(() => clearInterval(timer), 4000);
      }
    }

    return () => {
      isCancelled = true;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
      }
    };
  }, []);

  // Monitor visibility: pause when scrolled out of viewport, resume with sound when visible again
  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const pausePlayback = () => {
      setIsInView(false);
      // 1. Programmatic YT Player API pause
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      // 2. Redundant postMessage commands
      sendYouTubeCommand('pauseVideo');
      sendYouTubeCommand('stopVideo');
    };

    const resumePlayback = () => {
      setIsInView(true);
      // Resume if user was actively playing this video, or if autoPlayOnScroll is enabled
      if (wasPlayingRef.current || autoPlayOnScroll) {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          try {
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.playVideo();
          } catch {}
        }
        sendYouTubeCommand('unMute');
        sendYouTubeCommand('playVideo');
      }
    };

    const checkVisibility = () => {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
      const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;

      // Scrolled out of viewport: pause immediately
      if (rect.bottom < 40 || rect.top > windowHeight - 40 || ratio < 0.35) {
        pausePlayback();
      } else if (ratio >= 0.5) {
        resumePlayback();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            resumePlayback();
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
            pausePlayback();
          }
        });
      },
      {
        threshold: [0, 0.15, 0.35, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(containerEl);

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        checkVisibility();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [autoPlayOnScroll]);

  const handleToggleYouTubeMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.mute === 'function') {
        try {
          ytPlayerRef.current.mute();
        } catch {}
      }
      sendYouTubeCommand('mute');
    } else {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.unMute === 'function') {
        try {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.playVideo();
        } catch {}
      }
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('playVideo');
    }
  };

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-950 shadow-xs"
    >
      {/* Platform Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900 text-white text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider">
            YouTube
          </span>
          <span className="font-semibold text-slate-200 truncate max-w-[180px] sm:max-w-xs">
            {titleHint}
          </span>
          {autoPlayOnScroll && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isInView
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isInView ? '● Active in View' : '○ Paused on Scroll'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleYouTubeMute}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>Unmute</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sound On</span>
              </>
            )}
          </button>

          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:underline px-2 py-1"
          >
            <span>Open YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Full 16:9 Responsive IFrame */}
      <div className="aspect-video w-full bg-black">
        <iframe
          ref={iframeRef}
          src={normalizedEmbedUrl}
          title={titleHint}
          onLoad={() => {
            const win = iframeRef.current?.contentWindow;
            if (win) {
              win.postMessage('{"event":"listening"}', '*');
            }
          }}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
};

/**
 * Facebook Picture / Post / Video / Reel Card
 * - Resolves `/share/v/...`, `/share/p/...`, `/share/r/...`, and `fb.watch/...` links into canonical Facebook URLs
 * - Extracts direct video streams or high-res photos so posts, pictures, and videos always show clearly in the feed
 * - Multi-layered engine: native HTML5 video player, high-res photo gallery with lightbox, and embedded interactive preview
 */
const FacebookEmbedCard: React.FC<{
  info: ParsedEmbedInfo;
  autoPlayOnScroll: boolean;
}> = ({ info, autoPlayOnScroll }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showIframeEmbed, setShowIframeEmbed] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Custom OEmbed and Open Graph metadata fetcher
  const { data: fbOEmbed, loading: fbOEmbedLoading } = useFacebookOEmbed(info.normalizedUrl, true);

  // Unfurl fallback service
  const { data: unfurled, loading: unfurlLoading } = useLinkUnfurl(info.normalizedUrl, true);

  // Re-evaluate embed info if backend or oembed resolved a /share/ redirect to a canonical URL
  const effectiveInfo: ParsedEmbedInfo = React.useMemo(() => {
    const canonical = fbOEmbed?.resolvedUrl || unfurled?.resolvedUrl;
    if (
      canonical &&
      canonical !== info.normalizedUrl &&
      canonical.includes('facebook.com') &&
      !canonical.includes('/login')
    ) {
      try {
        const resolvedParsed = new URL(canonical);
        return buildFacebookPluginInfo(info.originalUrl, resolvedParsed);
      } catch {
        return info;
      }
    }
    return info;
  }, [info, fbOEmbed?.resolvedUrl, unfurled?.resolvedUrl]);

  const previewImage = fbOEmbed?.imageUrl || unfurled?.imageUrl;
  const videoStreamUrl = fbOEmbed?.videoUrl || unfurled?.videoUrl;
  const postTitle = decodeHtmlEntities(fbOEmbed?.title || unfurled?.title || effectiveInfo.titleHint);
  const postDescription = decodeHtmlEntities(fbOEmbed?.description || unfurled?.description);
  const authorName = decodeHtmlEntities(
    fbOEmbed?.authorName ||
    unfurled?.author ||
    (effectiveInfo.hostname === 'facebook.com' ? 'Facebook' : effectiveInfo.hostname)
  );

  const isVideo =
    effectiveInfo.type === 'facebook-video' ||
    Boolean(videoStreamUrl) ||
    fbOEmbed?.mediaType === 'video' ||
    fbOEmbed?.mediaType === 'reel';

  const isReel =
    effectiveInfo.isShortsOrReel ||
    fbOEmbed?.isShortsOrReel ||
    fbOEmbed?.mediaType === 'reel';

  const isPhoto =
    !isVideo &&
    (effectiveInfo.type === 'facebook-photo' ||
      fbOEmbed?.mediaType === 'photo' ||
      (Boolean(previewImage) && !effectiveInfo.embedUrl));

  useEffect(() => {
    if (!isVideo || !autoPlayOnScroll) {
      setIsInView(false);
      return;
    }
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const checkVisibility = () => {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
      const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;

      if (rect.bottom < 40 || rect.top > windowHeight - 40 || ratio < 0.35) {
        setIsInView(false);
        if (showIframeEmbed) {
          setShowIframeEmbed(false);
        }
      } else if (ratio >= 0.5) {
        setIsInView(true);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setIsInView(true);
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
            setIsInView(false);
            if (showIframeEmbed) {
              setShowIframeEmbed(false);
            }
          }
        });
      },
      { threshold: [0, 0.15, 0.35, 0.5, 0.75, 1.0] }
    );

    observer.observe(containerEl);

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        checkVisibility();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isVideo, autoPlayOnScroll, showIframeEmbed]);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(effectiveInfo.normalizedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all hover:shadow-sm"
    >
      {/* Sleek, Modern Facebook Header (Comfortable, Non-Jarring Theme) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900 text-white text-xs border-b border-slate-800">
        <div className="flex items-center gap-2 font-bold min-w-0">
          <span className="px-2.5 py-0.5 rounded-full bg-[#1877F2] text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-xs shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-white text-[#1877F2] flex items-center justify-center font-black text-[9px] select-none">
              f
            </span>
            <span>
              {isReel
                ? 'Facebook Reel'
                : isVideo
                ? 'Facebook Video'
                : isPhoto
                ? 'Facebook Photo'
                : 'Facebook'}
            </span>
          </span>
          <span className="truncate max-w-[200px] sm:max-w-md font-semibold text-slate-200">
            {postTitle || authorName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="Copy Facebook link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <a
            href={effectiveInfo.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#1877F2] hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Open on Facebook"
          >
            <span>Open on Facebook</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Body */}
      {/* 1. Direct Playable Video Stream if OpenGraph provides direct MP4 */}
      {videoStreamUrl ? (
        <div className="aspect-video w-full bg-black">
          <AutoPlayVideoPlayer
            src={videoStreamUrl}
            poster={previewImage}
            autoPlayOnScroll={autoPlayOnScroll}
          />
        </div>
      ) : isVideo ? (
        /* 2. Facebook Video / Reel Cinematic Card (Guaranteed 100% reliable, no broken black embed error) */
        <div className="relative group bg-slate-950 aspect-video min-h-[300px] max-h-[500px] flex items-center justify-center overflow-hidden">
          {showIframeEmbed && effectiveInfo.embedUrl && !iframeError ? (
            <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
              <iframe
                src={`${effectiveInfo.embedUrl}${autoPlayOnScroll && isInView ? '&autoplay=true' : ''}`}
                title={postTitle}
                className="w-full h-full border-0"
                scrolling="no"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                onError={() => setIframeError(true)}
              />
              <button
                type="button"
                onClick={() => setShowIframeEmbed(false)}
                className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white text-[11px] font-bold rounded-lg backdrop-blur-xs transition-colors cursor-pointer z-10"
              >
                Close Embed
              </button>
            </div>
          ) : (
            <div
              className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6 cursor-pointer"
              onClick={() => {
                const link = document.createElement('a');
                link.href = effectiveInfo.normalizedUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.click();
              }}
            >
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={postTitle}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 opacity-90 group-hover:opacity-95"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-black" />
              )}

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/45 pointer-events-none" />

              {/* Top Row: Reel / Video Badge */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-[11px] flex items-center gap-1.5 border border-white/10 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>{isReel ? 'Facebook Reel' : 'Facebook Video'}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#1877F2]/90 backdrop-blur-md text-white font-bold text-[11px] flex items-center gap-1 shadow-md">
                  <span>Watch on Facebook</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>

              {/* Center: Glowing Frosted Play Button */}
              <div className="relative z-10 flex items-center justify-center my-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1877F2] group-hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all ring-4 ring-white/30">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
                </div>
              </div>

              {/* Bottom: Title, Description, and Author Meta */}
              <div className="relative z-10 space-y-1.5 max-w-xl">
                <div className="text-sm sm:text-base font-bold text-white drop-shadow-md line-clamp-2 leading-snug">
                  {postTitle}
                </div>
                {postDescription && postDescription !== postTitle && (
                  <div className="text-xs text-slate-300 drop-shadow-xs line-clamp-2 leading-relaxed">
                    {postDescription}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
                  <span className="font-semibold text-white">{authorName}</span>
                  <span>•</span>
                  <span>Click to watch full reel on Facebook</span>
                  {effectiveInfo.embedUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowIframeEmbed(true);
                      }}
                      className="ml-auto underline text-slate-400 hover:text-white cursor-pointer"
                    >
                      Try Embed
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : isPhoto ? (
        /* 3. Facebook Photo / Picture Display */
        <div className="space-y-3 bg-slate-950/5 dark:bg-slate-950/40">
          {previewImage ? (
            <div
              className="relative group cursor-pointer overflow-hidden bg-slate-950 flex items-center justify-center max-h-[520px]"
              onClick={() => setIsLightboxOpen(true)}
            >
              <img
                src={previewImage}
                alt={postTitle}
                className="w-full max-h-[520px] object-contain group-hover:scale-[1.01] transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                <span className="p-2.5 rounded-full bg-black/60 backdrop-blur-xs">
                  <Maximize2 className="w-5 h-5 text-white" />
                </span>
                <span className="text-xs font-bold">Click to view full picture</span>
              </div>
            </div>
          ) : unfurlLoading ? (
            <div className="py-14 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#1877F2]" />
              <span>Fetching Facebook photo preview...</span>
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-900/60">
              <ImageIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {postTitle}
              </div>
              <a
                href={effectiveInfo.normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors"
              >
                <span>View Photo on Facebook</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Photo Caption snippet if present */}
          {(postDescription || (postTitle && postTitle !== 'Facebook Photo')) && (
            <div className="px-4 pb-3 pt-1 space-y-1">
              {postTitle && postTitle !== 'Facebook Photo' && (
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {postTitle}
                </div>
              )}
              {postDescription && (
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                  {postDescription}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 4. Facebook Post / Shared Update Display */
        <div className="p-4 space-y-3 bg-slate-50/70 dark:bg-slate-900/40">
          {previewImage && (
            <div
              className="relative rounded-xl overflow-hidden cursor-pointer bg-slate-950 max-h-[380px]"
              onClick={() => setIsLightboxOpen(true)}
            >
              <img
                src={previewImage}
                alt={postTitle}
                className="w-full max-h-[380px] object-cover hover:scale-[1.01] transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {postTitle}
            </div>
            {postDescription && (
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed">
                {postDescription}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href={effectiveInfo.normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1877F2] hover:underline"
            >
              <span>Read full post on Facebook</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Photo viewing */}
      {isLightboxOpen && previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              title="Close full picture"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt={postTitle}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            {postTitle && (
              <div className="mt-3 text-center text-sm font-semibold text-white/90 max-w-2xl px-4">
                {postTitle}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Footer Info */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400 truncate font-mono text-[11px]">
          {effectiveInfo.originalUrl}
        </span>
        <a
          href={effectiveInfo.normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1877F2] font-bold shrink-0 hover:underline inline-flex items-center gap-1"
        >
          <span>Facebook</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

/**
/**
 * Smart Link Share V1 Component
 * - Embeds valid YouTube links as responsive, lazy-loaded videos using youtube-nocookie.com
 * - Accepts only valid YouTube hostnames and 11-char video IDs
 * - For Facebook, Instagram, and other sites, shows a simple card with site name and URL (no fake metadata/embeds)
 * - Adds "View Original" opening in a new tab with rel="noopener noreferrer"
 * - Rejects unsafe URLs (e.g. javascript:)
 */
export const SharedEmbedCard: React.FC<{
  url: string;
  autoPlayOnScroll?: boolean;
}> = ({ url, autoPlayOnScroll = true }) => {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Reject truly unsafe protocols (javascript:, vbscript:, file:)
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }

  // 1. Direct uploaded or linked video (data:video/..., blob:..., .mp4, .webm, .mov)
  const isDirectVideo =
    lower.startsWith('data:video/') ||
    lower.startsWith('blob:') ||
    /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(lower);

  if (isDirectVideo) {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black shadow-xs">
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 text-white text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px] uppercase tracking-wider">
              Video
            </span>
            <span className="text-[11px] text-slate-300 truncate font-mono">
              {lower.startsWith('data:') ? 'Uploaded Video File' : lower.startsWith('blob:') ? 'Local Video' : 'Video Stream'}
            </span>
          </div>
          {!lower.startsWith('data:') && !lower.startsWith('blob:') && (
            <a
              href={trimmed}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
            >
              <span>View Original</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="w-full aspect-video bg-black flex items-center justify-center">
          <AutoPlayVideoPlayer src={trimmed} autoPlayOnScroll={autoPlayOnScroll} />
        </div>
      </div>
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
  } catch {
    return null;
  }

  const safeUrl = parsed.toString();

  // 2. YouTube: embed responsive video with autoplay and scroll-stop
  const yt = parseValidYouTubeUrl(safeUrl);
  if (yt.isValid && yt.embedUrl) {
    return (
      <AutoPlayYouTubeEmbed
        embedUrl={yt.embedUrl}
        originalUrl={safeUrl}
        titleHint={yt.isShorts ? 'YouTube Shorts' : 'YouTube Video'}
        autoPlayOnScroll={autoPlayOnScroll}
      />
    );
  }

  // 3. Facebook URLs (Video, Reel, Post, Photo): use dedicated FacebookEmbedCard with preview & scroll-stop
  if (
    parsed.hostname.toLowerCase().includes('facebook.com') ||
    parsed.hostname.toLowerCase() === 'fb.watch' ||
    parsed.hostname.toLowerCase() === 'fb.com'
  ) {
    const fbInfo = buildFacebookPluginInfo(safeUrl, parsed);
    return <FacebookEmbedCard info={fbInfo} autoPlayOnScroll={autoPlayOnScroll} />;
  }

  // 4. Instagram URLs (Reels / Posts): use parsed embed info or LinkPreview
  if (parsed.hostname.toLowerCase().includes('instagram.com')) {
    const igMatch = parsed.pathname.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
    const isReel = parsed.pathname.includes('/reel');
    const igCode = igMatch ? igMatch[2] : '';
    const igEmbedSrc = igCode ? `https://www.instagram.com/p/${igCode}/embed` : undefined;

    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider">
              {isReel ? 'Instagram Reel' : 'Instagram'}
            </span>
            <span className="font-semibold text-slate-200 truncate">Instagram Post</span>
          </div>
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-400 hover:underline"
          >
            <span>View on Instagram</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {igEmbedSrc ? (
          <div className="relative w-full max-w-md mx-auto aspect-[4/5] bg-black">
            <iframe
              src={igEmbedSrc}
              className="w-full h-full border-0"
              frameBorder="0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Instagram embed"
            />
          </div>
        ) : (
          <div className="p-4 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono truncate">{safeUrl}</span>
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline shrink-0"
            >
              Open on Instagram
            </a>
          </div>
        )}
      </div>
    );
  }

  // 5. Generic Website / Article Card with Rich Unfurl & Fallback
  return <GenericRichArticleEmbedCard url={safeUrl} />;
};

const GenericRichArticleEmbedCard: React.FC<{ url: string }> = ({ url }) => {
  const { data: unfurled } = useLinkUnfurl(url, true);
  const meta = getSiteMetadata(url);
  const [imageError, setImageError] = useState(false);

  const displayTitle = decodeHtmlEntities(unfurled?.title) || meta.siteName;
  const displayDescription = decodeHtmlEntities(unfurled?.description) || url;
  const displayImage = unfurled?.imageUrl;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 transition-all shadow-xs hover:shadow-sm">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="group flex flex-col sm:flex-row"
      >
        {displayImage && !imageError ? (
          <div className="sm:w-44 h-36 sm:h-auto bg-slate-950 shrink-0 overflow-hidden relative">
            <img
              src={displayImage}
              alt={displayTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="hidden sm:flex w-20 bg-slate-100 dark:bg-slate-800 items-center justify-center shrink-0 text-slate-400">
            <Globe className="w-6 h-6 text-blue-500" />
          </div>
        )}

        <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${meta.colorClass}`}>
                {meta.siteName}
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {meta.hostname}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
              {displayTitle}
            </h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {displayDescription}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-800">
            <span className="truncate max-w-[200px] sm:max-w-xs font-mono text-[11px]">
              {url}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 group-hover:underline shrink-0 ml-2">
              <span>View on {meta.siteName}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </a>
    </div>
  );
};

export const SmartLinkCard = SharedEmbedCard;
export const Video = AutoPlayVideoPlayer;

