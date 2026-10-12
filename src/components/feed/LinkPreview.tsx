import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ExternalLink,
  Globe,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Share2,
} from 'lucide-react';
import { LinkMetadata, fetchLinkPreview } from '../../services/linkPreviewService';
import { Video } from './Video';

export interface LinkPreviewProps {
  url?: string;
  data?: LinkMetadata;
  className?: string;
  autoPlayOnScroll?: boolean;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({
  url: directUrl,
  data: initialData,
  className = '',
  autoPlayOnScroll = true,
}) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData && Boolean(directUrl));
  const containerRef = useRef<HTMLDivElement>(null);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);

  const [isInView, setIsInView] = useState(false);
  const [showEmbedPlayer, setShowEmbedPlayer] = useState(false);

  const effectiveUrl = metadata?.canonical_url || directUrl || '';

  // Hydrate metadata if only url was provided
  useEffect(() => {
    if (initialData) {
      setMetadata(initialData);
      setLoading(false);
      return;
    }

    if (!directUrl) return;

    let isMounted = true;
    setLoading(true);

    fetchLinkPreview(directUrl)
      .then((meta) => {
        if (isMounted) {
          setMetadata(meta);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [directUrl, initialData]);

  const type = metadata?.type || 'generic';
  const isVideo =
    type === 'youtube' ||
    type === 'facebook_video' ||
    type === 'vimeo' ||
    type === 'direct_video' ||
    Boolean(metadata?.video_url);

  const isReel = Boolean(
    metadata?.is_reel ||
      effectiveUrl.toLowerCase().includes('/reel/') ||
      effectiveUrl.toLowerCase().includes('/reels/') ||
      effectiveUrl.toLowerCase().includes('/share/r/')
  );

  const ytPlayerRef = useRef<any>(null);
  const wasPlayingRef = useRef<boolean>(false);

  const sendYouTubeCommand = useCallback((func: 'playVideo' | 'pauseVideo' | 'stopVideo' | 'unMute' | 'mute') => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
      win.postMessage(JSON.stringify({ event: 'command', func, args: '' }), '*');
      win.postMessage(`{"event":"command","func":"${func}","args":""}`, '*');
    } catch {}
  }, []);

  // Connect YouTube API for precise scroll autoplay/pause
  useEffect(() => {
    let isCancelled = false;

    if (typeof window !== 'undefined' && type === 'youtube') {
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
        if (isCancelled || !ytIframeRef.current || !(window as any).YT?.Player) return;
        try {
          ytPlayerRef.current = new (window as any).YT.Player(ytIframeRef.current, {
            events: {
              onStateChange: (event: any) => {
                if (event.data === 1) {
                  wasPlayingRef.current = true;
                } else if (event.data === 2) {
                  wasPlayingRef.current = false;
                }
              },
            },
          });
        } catch {}
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
  }, [type]);

  // Viewport observer: pause YouTube or unload active social embeds when scrolled out of view!
  useEffect(() => {
    if (!isVideo && type !== 'instagram' && type !== 'facebook_video') return;
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const pausePlayback = () => {
      setIsInView(false);

      // YouTube API pause
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      sendYouTubeCommand('pauseVideo');
      sendYouTubeCommand('stopVideo');

      // CRITICAL FOR FACEBOOK & INSTAGRAM:
      // When scrolled out of the viewport, UNMOUNT the iframe embed so sound immediately stops!
      setShowEmbedPlayer((prev) => {
        if (prev) {
          return false;
        }
        return false;
      });
    };

    const resumePlayback = () => {
      setIsInView(true);
      if (type === 'youtube' && (wasPlayingRef.current || autoPlayOnScroll)) {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          try {
            ytPlayerRef.current.playVideo();
          } catch {}
        }
        sendYouTubeCommand('playVideo');
      }
    };

    const checkVisibility = () => {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isOffScreen = rect.bottom <= 20 || rect.top >= windowHeight - 20;

      if (isOffScreen) {
        pausePlayback();
        return;
      }

      const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
      const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;

      if (ratio < 0.4) {
        pausePlayback();
      } else if (ratio >= 0.5) {
        resumePlayback();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
            pausePlayback();
          } else if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            resumePlayback();
          }
        });
      },
      {
        threshold: [0, 0.1, 0.25, 0.4, 0.5, 0.75, 1.0],
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pausePlayback();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isVideo, type, autoPlayOnScroll, sendYouTubeCommand]);

  if (loading) {
    return (
      <div className={`w-full my-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 animate-pulse flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!effectiveUrl) return null;

  // View original footer button
  const renderViewOriginal = (label = 'View original') => (
    <div className="mt-2 text-right">
      <a
        href={effectiveUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline transition-colors"
      >
        <span>{label}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );

  // 1. Direct Video / Uploaded Video Stream
  if (type === 'direct_video' || metadata?.video_url || effectiveUrl.startsWith('data:video/') || effectiveUrl.startsWith('blob:')) {
    const videoSrc = metadata?.video_url || effectiveUrl;
    return (
      <div ref={containerRef} className={`w-full my-3 ${className}`}>
        <Video
          src={videoSrc}
          poster={metadata?.image}
          autoPlayOnScroll={autoPlayOnScroll}
          controls={true}
        />
        {renderViewOriginal('Watch Video')}
      </div>
    );
  }

  // 2. YouTube: 16:9 responsive embed with pause-on-scroll
  if (type === 'youtube' && metadata?.video_id) {
    const ytEmbedSrc = `https://www.youtube-nocookie.com/embed/${metadata.video_id}?enablejsapi=1&playsinline=1&rel=0${
      typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
    }`;

    return (
      <div ref={containerRef} className={`w-full my-3 ${className}`}>
        <div className="relative w-full overflow-hidden rounded-2xl bg-black aspect-video shadow-xs border border-slate-200/80 dark:border-slate-800">
          <iframe
            ref={ytIframeRef}
            src={ytEmbedSrc}
            onLoad={() => {
              const win = ytIframeRef.current?.contentWindow;
              if (win) {
                win.postMessage('{"event":"listening"}', '*');
              }
            }}
            className="w-full h-full border-0"
            frameBorder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={metadata.title || 'YouTube video'}
          />
        </div>
        {renderViewOriginal(isReel ? 'Watch on YouTube Shorts' : 'Watch on YouTube')}
      </div>
    );
  }

  // 3. Facebook Video / Reel: Cinematic Preview Card with Stop-on-Scroll Embed
  if (type === 'facebook_video') {
    const encodedUrl = encodeURIComponent(effectiveUrl);
    const videoEmbedSrc = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&autoplay=1`;
    const previewThumbnail = metadata?.image;
    const postTitle = metadata?.title || (isReel ? 'Facebook Reel' : 'Facebook Video');

    return (
      <div
        ref={containerRef}
        className={`w-full my-3 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white text-xs border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1877F2] text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <span className="w-3.5 h-3.5 rounded-full bg-white text-[#1877F2] flex items-center justify-center font-black text-[9px] select-none">
                f
              </span>
              <span>{isReel ? 'Facebook Reel' : 'Facebook Video'}</span>
            </span>
            <span className="font-semibold text-slate-200 truncate">{postTitle}</span>
          </div>

          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#1877F2] hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <span>Open on Facebook</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Media Player / Preview Body */}
        {showEmbedPlayer ? (
          <div
            className={`relative w-full bg-black flex items-center justify-center ${
              isReel ? 'aspect-[9/16] max-w-sm mx-auto' : 'aspect-video'
            }`}
          >
            <iframe
              src={videoEmbedSrc}
              className="w-full h-full border-0"
              scrolling="no"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Facebook video"
            />
            <button
              type="button"
              onClick={() => setShowEmbedPlayer(false)}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/80 hover:bg-black text-white text-[10px] font-bold rounded-lg backdrop-blur-xs transition-colors cursor-pointer z-20 shadow-md"
            >
              Close Player
            </button>
          </div>
        ) : (
          <div
            onClick={() => setShowEmbedPlayer(true)}
            className="relative group cursor-pointer bg-slate-950 aspect-video flex items-center justify-center overflow-hidden"
          >
            {previewThumbnail ? (
              <img
                src={previewThumbnail}
                alt={postTitle}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-black" />
            )}

            {/* Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/40 pointer-events-none" />

            {/* Glowing Frosted Play Button */}
            <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1877F2] group-hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all ring-4 ring-white/30">
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
            </div>

            {/* Bottom Meta */}
            <div className="absolute bottom-3 left-3 right-3 z-10 text-left">
              <div className="text-sm font-bold text-white drop-shadow-md line-clamp-1">
                {postTitle}
              </div>
              {metadata?.description && (
                <div className="text-xs text-slate-300 drop-shadow-xs line-clamp-1 mt-0.5">
                  {metadata.description}
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] text-blue-300 font-semibold mt-1">
                <span>Click to play video</span>
                <span className="text-slate-400">Autostops when scrolling away</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. Instagram: Reel / Post with Preview Card & Stop-on-Scroll Embed
  if (type === 'instagram') {
    const rawCode = metadata?.code || effectiveUrl.match(/\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i)?.[1];
    const igEmbedSrc = rawCode ? `https://www.instagram.com/p/${rawCode}/embed` : undefined;
    const postTitle = metadata?.title || (isReel ? 'Instagram Reel' : 'Instagram Post');

    return (
      <div
        ref={containerRef}
        className={`w-full my-3 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}
      >
        {/* Instagram Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white text-xs border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0">
              <span>{isReel ? 'Instagram Reel' : 'Instagram'}</span>
            </span>
            <span className="font-semibold text-slate-200 truncate">{postTitle}</span>
          </div>

          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <span>Open on Instagram</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Media Player / Preview Body */}
        {showEmbedPlayer && igEmbedSrc ? (
          <div className="relative w-full max-w-md mx-auto aspect-[4/5] bg-black">
            <iframe
              src={igEmbedSrc}
              className="w-full h-full border-0"
              frameBorder="0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Instagram embed"
            />
            <button
              type="button"
              onClick={() => setShowEmbedPlayer(false)}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/80 hover:bg-black text-white text-[10px] font-bold rounded-lg backdrop-blur-xs transition-colors cursor-pointer z-20 shadow-md"
            >
              Close Embed
            </button>
          </div>
        ) : (
          <div
            onClick={() => {
              if (igEmbedSrc) {
                setShowEmbedPlayer(true);
              } else {
                window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            className="relative group cursor-pointer bg-slate-950 aspect-video flex items-center justify-center overflow-hidden"
          >
            {metadata?.image ? (
              <img
                src={metadata.image}
                alt={postTitle}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-slate-900 to-pink-950" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/40 pointer-events-none" />

            <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-pink-600 to-amber-500 group-hover:from-pink-500 group-hover:to-amber-400 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all ring-4 ring-white/30">
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
            </div>

            <div className="absolute bottom-3 left-3 right-3 z-10 text-left">
              <div className="text-sm font-bold text-white drop-shadow-md line-clamp-1">
                {postTitle}
              </div>
              <div className="flex items-center justify-between text-[11px] text-pink-300 font-semibold mt-1">
                <span>Click to view reel</span>
                <span className="text-slate-400">Autostops on scroll</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. Facebook Post: 500px embed or clean rich card
  if (type === 'facebook_post') {
    const postEmbedSrc = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(
      effectiveUrl
    )}`;

    return (
      <div className={`w-full my-3 ${className}`}>
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          {metadata?.image ? (
            <div className="relative aspect-video bg-slate-950 overflow-hidden">
              <img
                src={metadata.image}
                alt={metadata.title || 'Facebook Post'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#1877F2] text-white text-[10px] font-bold">
                Facebook
              </div>
            </div>
          ) : null}
          <div className="p-3.5 space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
              {metadata?.title || 'Facebook Post'}
            </h4>
            {metadata?.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                {metadata.description}
              </p>
            )}
          </div>
        </div>
        {renderViewOriginal('View on Facebook')}
      </div>
    );
  }

  // 6. Generic Rich Card: image left, title+desc right, "View on {site_name}"
  const siteName = metadata?.site_name || new URL(effectiveUrl).hostname.replace(/^www\./, '');
  const title = metadata?.title || siteName;
  const description = metadata?.description || effectiveUrl;

  return (
    <div className={`w-full my-3 ${className}`}>
      <a
        href={effectiveUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="group flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-blue-50/40 dark:hover:bg-slate-800/80 transition-all shadow-xs"
      >
        {metadata?.image ? (
          <div className="sm:w-44 h-36 sm:h-auto bg-slate-950 shrink-0 overflow-hidden relative">
            <img
              src={metadata.image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="hidden sm:flex w-24 bg-slate-100 dark:bg-slate-800 items-center justify-center shrink-0 text-slate-400">
            <Globe className="w-8 h-8" />
          </div>
        )}

        <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                {siteName}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
              {title}
            </h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-800">
            <span className="truncate max-w-[200px] sm:max-w-xs font-mono text-[11px]">
              {effectiveUrl}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 group-hover:underline shrink-0 ml-2">
              <span>View on {siteName}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </a>
      {renderViewOriginal()}
    </div>
  );
};

export default LinkPreview;
