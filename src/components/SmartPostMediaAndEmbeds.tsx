import React, { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Globe,
  Video as VideoIcon,
  Share2,
  Loader2
} from 'lucide-react';

export type DetectedEmbedType =
  | 'youtube'
  | 'facebook-video'
  | 'facebook-post'
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
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
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
  return trimmed;
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
    ? `https://www.facebook.com/plugins/video.php?href=${encodedHref}&show_text=true&width=500`
    : `https://www.facebook.com/plugins/post.php?href=${encodedHref}&show_text=true&width=500`;

  return {
    originalUrl: rawUrl,
    normalizedUrl,
    type: isVideo ? 'facebook-video' : 'facebook-post',
    embedUrl: pluginUrl,
    platformName: 'Facebook',
    platformColor: 'bg-blue-600',
    hostname: 'facebook.com',
    titleHint: isReel
      ? 'Facebook Reel'
      : isVideo
      ? 'Facebook Video'
      : 'Facebook Post',
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
 * Resolves short/share redirect links (like facebook.com/share/v/..., facebook.com/share/p/..., fb.watch/...)
 * and fetches OpenGraph metadata (title, description, thumbnail image, direct video URL) via Microlink API.
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
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true`)
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
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    const containerEl = containerRef.current;
    if (!videoEl || !containerEl) return;

    if (!autoPlayOnScroll) {
      if (!videoEl.paused) {
        videoEl.pause();
        setIsPlaying(false);
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            setIsInView(true);
            document.querySelectorAll('video').forEach((otherVid) => {
              if (otherVid !== videoEl && !otherVid.paused) {
                otherVid.pause();
              }
            });

            videoEl.muted = isMuted;
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                })
                .catch(() => {
                  videoEl.muted = true;
                  setIsMuted(true);
                  videoEl
                    .play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {});
                });
            }
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
            setIsInView(false);
            if (!videoEl.paused) {
              videoEl.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      {
        threshold: [0, 0.25, 0.45, 0.75],
      }
    );

    observer.observe(containerEl);

    return () => {
      observer.disconnect();
    };
  }, [autoPlayOnScroll, isMuted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const nextMuted = !isMuted;
    videoEl.muted = nextMuted;
    setIsMuted(nextMuted);
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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full max-h-[520px] object-contain bg-black"
      />

      {/* Top Overlay: Auto-Scroll Status Badge + Mute/Unmute Toggle */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold shadow-sm">
          {isPlaying ? (
            <>
              <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
              <span>{isInView && autoPlayOnScroll ? 'Auto-Play ON (In View)' : 'Playing'}</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-slate-300" />
              <span>{autoPlayOnScroll ? 'Auto-Paused (Scroll into view)' : 'Paused'}</span>
            </>
          )}
        </span>

        <button
          type="button"
          onClick={toggleMute}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-[11px] font-bold transition-colors cursor-pointer shadow-md"
          title={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>Muted · Tap for sound</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sound On</span>
            </>
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
  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const sendYouTubeCommand = (func: 'playVideo' | 'pauseVideo' | 'mute' | 'unMute') => {
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
    } catch {
      // Ignore cross-origin frame timing errors
    }
  };

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    if (!autoPlayOnScroll) {
      sendYouTubeCommand('pauseVideo');
      setIsInView(false);
      return;
    }

    let retryTimer1: number | undefined;
    let retryTimer2: number | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            setIsInView(true);
            const triggerPlay = () => {
              if (isMuted) {
                sendYouTubeCommand('mute');
              }
              sendYouTubeCommand('playVideo');
            };
            triggerPlay();
            retryTimer1 = window.setTimeout(triggerPlay, 350);
            retryTimer2 = window.setTimeout(triggerPlay, 900);
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
            setIsInView(false);
            window.clearTimeout(retryTimer1);
            window.clearTimeout(retryTimer2);
            sendYouTubeCommand('pauseVideo');
          }
        });
      },
      {
        threshold: [0, 0.25, 0.45, 0.75],
      }
    );

    observer.observe(containerEl);
    return () => {
      window.clearTimeout(retryTimer1);
      window.clearTimeout(retryTimer2);
      observer.disconnect();
    };
  }, [autoPlayOnScroll, isMuted]);

  const handleToggleYouTubeMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      sendYouTubeCommand('mute');
    } else {
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
              {isInView ? '● Auto-Play ON' : '○ Paused on Scroll'}
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
          src={embedUrl}
          title={titleHint}
          onLoad={() => {
            if (autoPlayOnScroll && isInView) {
              if (isMuted) sendYouTubeCommand('mute');
              sendYouTubeCommand('playVideo');
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
 * Facebook Video / Post / Share Link Card
 * - Resolves `/share/v/...`, `/share/p/...`, `/share/r/...`, and `fb.watch/...` links into canonical Facebook URLs
 * - Extracts direct video streams or canonical video IDs so `plugins/video.php` & `plugins/post.php` load properly
 * - Displays rich OpenGraph title, caption, and image/thumbnail preview alongside the embedded player so the post is ALWAYS visible
 */
const FacebookEmbedCard: React.FC<{
  info: ParsedEmbedInfo;
  autoPlayOnScroll: boolean;
}> = ({ info, autoPlayOnScroll }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  // Unfurl the Facebook link to resolve /share/ redirects and retrieve OpenGraph image/text/video
  const { data: unfurled, loading: unfurlLoading } = useLinkUnfurl(info.normalizedUrl, true);

  // Re-evaluate embed info if Microlink resolved a /share/ or fb.watch redirect to a canonical Facebook URL
  const effectiveInfo: ParsedEmbedInfo = React.useMemo(() => {
    if (
      unfurled?.resolvedUrl &&
      unfurled.resolvedUrl !== info.normalizedUrl &&
      unfurled.resolvedUrl.includes('facebook.com') &&
      !unfurled.resolvedUrl.includes('/login')
    ) {
      try {
        const resolvedParsed = new URL(unfurled.resolvedUrl);
        return buildFacebookPluginInfo(info.originalUrl, resolvedParsed);
      } catch {
        return info;
      }
    }
    return info;
  }, [info, unfurled?.resolvedUrl]);

  const isVideo =
    effectiveInfo.type === 'facebook-video' || Boolean(unfurled?.videoUrl);

  useEffect(() => {
    if (!isVideo || !autoPlayOnScroll) {
      setIsInView(false);
      return;
    }
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            setIsInView(true);
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
            setIsInView(false);
          }
        });
      },
      { threshold: [0, 0.25, 0.45, 0.75] }
    );

    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [isVideo, autoPlayOnScroll]);

  // Wait for redirect resolution if the user pasted a /share/ or fb.watch short link
  const shouldShowPluginIframe =
    Boolean(effectiveInfo.embedUrl) &&
    (!info.needsRedirectResolution || !unfurlLoading);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
    >
      {/* Top Facebook Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs">
        <div className="flex items-center gap-2 font-bold">
          <Share2 className="w-3.5 h-3.5" />
          <span>{unfurled?.author || effectiveInfo.titleHint}</span>
          {isVideo && autoPlayOnScroll && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
              {isInView ? '● Auto-Play Active' : '○ Scroll Auto-Play'}
            </span>
          )}
        </div>
        <a
          href={effectiveInfo.normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
        >
          <span>Open on Facebook</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* 1. If OpenGraph exposed a direct playable video stream, play it with native scroll Auto-Play */}
      {unfurled?.videoUrl ? (
        <div className="bg-black">
          <AutoPlayVideoPlayer
            src={unfurled.videoUrl}
            poster={unfurled.imageUrl}
            autoPlayOnScroll={autoPlayOnScroll}
          />
        </div>
      ) : (
        <>
          {/* 2. Single Interactive Facebook Official Embedded Video / Post Player */}
          {unfurlLoading && info.needsRedirectResolution ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-950">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading Facebook {isVideo ? 'video' : 'post'} preview...</span>
            </div>
          ) : (
            shouldShowPluginIframe && (
              <div className="w-full bg-white dark:bg-slate-950 flex justify-center overflow-hidden">
                <iframe
                  src={`${effectiveInfo.embedUrl}${
                    isVideo && autoPlayOnScroll && isInView ? '&autoplay=true' : ''
                  }`}
                  title={effectiveInfo.titleHint}
                  className={`w-full max-w-[540px] border-0 ${
                    isVideo ? 'aspect-video min-h-[360px]' : 'min-h-[480px]'
                  }`}
                  scrolling="no"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};

/**
 * Renders any shared social post or video link (YouTube, Facebook, Instagram, LinkedIn, TikTok, Vimeo, Direct Video, or Web URL)
 * with full visibility and scroll-based auto-play / auto-pause for videos.
 */
export const SharedEmbedCard: React.FC<{
  url: string;
  autoPlayOnScroll?: boolean;
}> = ({ url, autoPlayOnScroll = true }) => {
  const info = parseUrlForEmbed(url);
  const { data: unfurled } = useLinkUnfurl(
    info.normalizedUrl,
    info.type === 'linkedin' || info.type === 'instagram' || info.type === 'generic-link'
  );

  if (info.type === 'direct-video') {
    return <AutoPlayVideoPlayer src={info.normalizedUrl} autoPlayOnScroll={autoPlayOnScroll} />;
  }

  if (info.type === 'youtube' && info.embedUrl) {
    return (
      <AutoPlayYouTubeEmbed
        embedUrl={info.embedUrl}
        originalUrl={info.normalizedUrl}
        titleHint={info.titleHint}
        autoPlayOnScroll={autoPlayOnScroll}
      />
    );
  }

  if (info.type === 'facebook-video' || info.type === 'facebook-post') {
    return <FacebookEmbedCard info={info} autoPlayOnScroll={autoPlayOnScroll} />;
  }

  if (info.type === 'instagram') {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white text-xs">
          <div className="flex items-center gap-2 font-bold">
            <VideoIcon className="w-3.5 h-3.5" />
            <span>{unfurled?.title || info.titleHint}</span>
          </div>
          <a
            href={info.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
          >
            <span>Open on Instagram</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {unfurled?.videoUrl ? (
          <AutoPlayVideoPlayer
            src={unfurled.videoUrl}
            poster={unfurled.imageUrl}
            autoPlayOnScroll={autoPlayOnScroll}
          />
        ) : info.embedUrl ? (
          <div className="w-full bg-white flex justify-center">
            <iframe
              src={info.embedUrl}
              title={info.titleHint}
              className="w-full min-h-[580px] border-0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : unfurled?.imageUrl ? (
          <img
            src={unfurled.imageUrl}
            alt={unfurled.title || 'Instagram preview'}
            className="w-full max-h-[420px] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : null}

        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-300 break-all font-medium">
            {info.originalUrl}
          </span>
          <a
            href={info.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 dark:text-pink-400 font-bold shrink-0 hover:underline"
          >
            View on Instagram →
          </a>
        </div>
      </div>
    );
  }

  if (info.type === 'linkedin') {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center justify-between px-4 py-2.5 bg-sky-700 text-white text-xs">
          <div className="flex items-center gap-2 font-bold">
            <Globe className="w-3.5 h-3.5" />
            <span>LinkedIn Shared Post</span>
          </div>
          <a
            href={info.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
          >
            <span>Open on LinkedIn</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {info.embedUrl ? (
          <div className="w-full bg-slate-50 dark:bg-slate-950">
            <iframe
              src={info.embedUrl}
              title="LinkedIn Embedded Post"
              className="w-full min-h-[520px] border-0"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={info.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors border-t border-slate-200/60 dark:border-slate-800 space-y-2"
          >
            {unfurled?.imageUrl && (
              <img
                src={unfurled.imageUrl}
                alt={unfurled.title || 'LinkedIn preview'}
                className="w-full max-h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {unfurled?.title || info.titleHint}
            </div>
            {unfurled?.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                {unfurled.description}
              </p>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 break-all">
              {info.originalUrl}
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
              <span>Read full post on LinkedIn</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>
        )}
      </div>
    );
  }

  if (info.type === 'tiktok' && info.embedUrl) {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-950 shadow-xs">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white text-xs">
          <span className="font-bold">{info.titleHint}</span>
          <a
            href={info.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline"
          >
            <span>Open TikTok</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="w-full flex justify-center bg-black">
          <iframe
            src={info.embedUrl}
            title={info.titleHint}
            className="w-full min-h-[580px] border-0"
            allow="autoplay; encrypted-media;"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (info.type === 'vimeo' && info.embedUrl) {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black shadow-xs">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white text-xs">
          <span className="font-bold">{info.titleHint}</span>
          <a
            href={info.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline"
          >
            <span>Watch on Vimeo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="aspect-video w-full">
          <iframe
            src={info.embedUrl}
            title={info.titleHint}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Generic Link Preview Card (Websites, News, Blogs, Portfolios, X/Twitter, Other Platforms) - 100% Full Visibility
  const websitePreviewImage =
    unfurled?.imageUrl ||
    `https://image.thum.io/get/width/900/crop/600/noanimate/${info.normalizedUrl}`;

  return (
    <a
      href={info.normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all group shadow-xs"
    >
      <div className="w-full max-h-64 overflow-hidden bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 relative">
        <img
          src={websitePreviewImage}
          alt={unfurled?.title || info.titleHint}
          className="w-full max-h-64 object-cover group-hover:scale-102 transition-transform"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
          }}
        />
      </div>
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <img
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(info.hostname)}&sz=32`}
              alt=""
              className="w-4 h-4 rounded-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span>{unfurled?.publisher || info.hostname}</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">
            {unfurled?.title || info.titleHint}
          </div>
          {unfurled?.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
              {unfurled.description}
            </p>
          )}
          <div className="text-xs text-slate-500 dark:text-slate-400 break-all">
            {info.originalUrl}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 shrink-0">
          <ExternalLink className="w-4 h-4" />
        </div>
      </div>
    </a>
  );
};
