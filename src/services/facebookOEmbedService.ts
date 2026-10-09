/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { apiUrl } from '../lib/apiConfig';

export interface FacebookOEmbedData {
  originalUrl: string;
  resolvedUrl: string;
  mediaType: 'video' | 'reel' | 'photo' | 'post' | 'unknown';
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  authorName?: string;
  authorUrl?: string;
  providerName: 'Facebook';
  html?: string;
  width?: number;
  height?: number;
  extractedId?: string;
  isShortsOrReel?: boolean;
}

const FB_OEMBED_CACHE_PREFIX = 'ndc_fb_oembed_v3_';

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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return _;
      }
    })
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

/**
 * Checks if a given URL belongs to Facebook
 */
export function isFacebookUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  return /(?:facebook\.com|fb\.watch|fb\.com)/i.test(rawUrl.trim());
}

/**
 * Normalizes a Facebook URL to standard canonical format
 */
export function normalizeFacebookUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  let urlStr = trimmed;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host === 'm.facebook.com' || host === 'web.facebook.com' || host === 'touch.facebook.com') {
      parsed.hostname = 'www.facebook.com';
    }
    return parsed.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Extracts numeric Facebook ID (post, video, photo, reel)
 */
export function extractFacebookMediaId(rawUrl: string): { id?: string; kind: 'video' | 'reel' | 'photo' | 'post' | 'unknown' } {
  const norm = normalizeFacebookUrl(rawUrl);
  try {
    const parsed = new URL(norm);
    const path = parsed.pathname;

    // 1. Reel: /reel/123456789 or /reels/123456789 or /share/r/123456789
    const reelMatch = path.match(/\/(?:reel|reels|share\/r)\/(\d+)/i);
    if (reelMatch) return { id: reelMatch[1], kind: 'reel' };

    // 2. Video: /watch/?v=123456789 or /videos/123456789 or /share/v/123456789
    const vParam = parsed.searchParams.get('v');
    if (vParam && /^\d+$/.test(vParam)) return { id: vParam, kind: 'video' };
    const videoMatch = path.match(/\/(?:videos|share\/v)\/(?:[^/]+\/)?(\d+)/i);
    if (videoMatch) return { id: videoMatch[1], kind: 'video' };
    if (parsed.hostname.includes('fb.watch') || path.includes('/watch')) {
      return { kind: 'video' };
    }

    // 3. Photo: /photo.php?fbid=123456789 or /photos/123456789
    const fbid = parsed.searchParams.get('fbid');
    if (fbid && /^\d+$/.test(fbid)) return { id: fbid, kind: 'photo' };
    const photoMatch = path.match(/\/photos\/(?:[^/]+\/)?(\d+)/i);
    if (photoMatch) return { id: photoMatch[1], kind: 'photo' };
    if (path.includes('/photo')) return { kind: 'photo' };

    // 4. Post: /posts/123456789 or /permalink.php?story_fbid=123456789
    const storyFbid = parsed.searchParams.get('story_fbid');
    if (storyFbid && /^\d+$/.test(storyFbid)) return { id: storyFbid, kind: 'post' };
    const postMatch = path.match(/\/(?:posts|share\/p)\/(\d+)/i);
    if (postMatch) return { id: postMatch[1], kind: 'post' };

    return { kind: 'post' };
  } catch {
    return { kind: 'unknown' };
  }
}

/**
 * Custom OEmbed and Open Graph metadata fetcher service for Facebook URLs
 * Follows a robust multi-strategy pipeline:
 *  1. Local storage caching for instantaneous render
 *  2. Server crawler proxy (/api/unfurl) with Facebook external hit user agent
 *  3. Noembed / Open Graph fallback endpoints
 *  4. Microlink Open Graph fallback
 */
export async function fetchFacebookOEmbed(rawUrl: string): Promise<FacebookOEmbedData> {
  const normalized = normalizeFacebookUrl(rawUrl);
  const cacheKey = FB_OEMBED_CACHE_PREFIX + normalized;

  // 1. Check local cache
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as FacebookOEmbedData;
        if (parsed && (parsed.title || parsed.imageUrl || parsed.videoUrl)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  const { id: mediaId, kind: detectedKind } = extractFacebookMediaId(normalized);
  const defaultFallback: FacebookOEmbedData = {
    originalUrl: rawUrl,
    resolvedUrl: normalized,
    mediaType: detectedKind,
    providerName: 'Facebook',
    authorName: 'Facebook',
    extractedId: mediaId,
    isShortsOrReel: detectedKind === 'reel',
  };

  // Strategy A: Server-Side Open Graph Crawler (/api/unfurl)
  try {
    const res = await fetch(apiUrl(`/api/unfurl?url=${encodeURIComponent(normalized)}`));
    if (res.ok) {
      const json = await res.json();
      if (json && (json.imageUrl || json.videoUrl || json.title || json.description)) {
        let inferredType: FacebookOEmbedData['mediaType'] = detectedKind;
        if (json.mediaType === 'video' || json.videoUrl) {
          inferredType = detectedKind === 'reel' ? 'reel' : 'video';
        } else if (json.mediaType === 'photo' || detectedKind === 'photo') {
          inferredType = 'photo';
        }

        let cleanTitle = decodeHtmlEntities(json.title);
        if (cleanTitle && /^(Log into Facebook|Facebook|Log in to Facebook)/i.test(cleanTitle)) {
          cleanTitle = '';
        }

        let cleanDescription = decodeHtmlEntities(json.description);
        if (cleanDescription && /^(Log into Facebook|Facebook helps you connect)/i.test(cleanDescription)) {
          cleanDescription = '';
        }

        const result: FacebookOEmbedData = {
          originalUrl: rawUrl,
          resolvedUrl: json.resolvedUrl || normalized,
          mediaType: inferredType,
          title: cleanTitle || defaultFallback.title,
          description: cleanDescription || undefined,
          imageUrl: json.imageUrl,
          videoUrl: json.videoUrl,
          authorName: decodeHtmlEntities(json.publisher) || 'Facebook',
          providerName: 'Facebook',
          extractedId: mediaId,
          isShortsOrReel: inferredType === 'reel',
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          } catch {}
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('Backend Facebook Open Graph scrape failed, trying fallback...', err);
  }

  // Strategy B: Noembed / Public oEmbed Aggregator
  try {
    const noembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(normalized)}`);
    if (noembedRes.ok) {
      const data = await noembedRes.json();
      if (data && !data.error && (data.title || data.thumbnail_url || data.html)) {
        const result: FacebookOEmbedData = {
          originalUrl: rawUrl,
          resolvedUrl: data.url || normalized,
          mediaType: data.type === 'video' ? 'video' : detectedKind,
          title: data.title,
          description: defaultFallback.description,
          imageUrl: data.thumbnail_url,
          authorName: data.author_name || 'Facebook',
          authorUrl: data.author_url,
          providerName: 'Facebook',
          html: data.html,
          width: data.width,
          height: data.height,
          extractedId: mediaId,
          isShortsOrReel: detectedKind === 'reel',
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          } catch {}
        }
        return result;
      }
    }
  } catch {
    // proceed to Strategy C
  }

  // Strategy C: Microlink Open Graph Fallback
  try {
    const microlinkRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(normalized)}&screenshot=true`);
    if (microlinkRes.ok) {
      const json = await microlinkRes.json();
      if (json && json.status === 'success' && json.data) {
        const d = json.data;
        const result: FacebookOEmbedData = {
          originalUrl: rawUrl,
          resolvedUrl: d.url || normalized,
          mediaType: d.video?.url ? 'video' : detectedKind,
          title: d.title,
          description: d.description,
          imageUrl: d.image?.url || d.screenshot?.url,
          videoUrl: d.video?.url,
          authorName: d.author || d.publisher || 'Facebook',
          providerName: 'Facebook',
          extractedId: mediaId,
          isShortsOrReel: detectedKind === 'reel',
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          } catch {}
        }
        return result;
      }
    }
  } catch {
    // return defaultFallback
  }

  return defaultFallback;
}

/**
 * React Hook to fetch Facebook OEmbed / Open Graph metadata
 */
export function useFacebookOEmbed(url: string, enabled = true) {
  const [data, setData] = useState<FacebookOEmbedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !url || !isFacebookUrl(url)) {
      setData(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetchFacebookOEmbed(url)
      .then((res) => {
        if (!isCancelled) {
          setData(res);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err?.message || 'Failed to fetch Facebook preview');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [url, enabled]);

  return { data, loading, error };
}

