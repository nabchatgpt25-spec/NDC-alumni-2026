import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { LinkMetadata, fetchLinkPreview } from '../../services/linkPreviewService';

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
  const isVideo = type === 'youtube' || type === 'facebook_video' || type === 'vimeo';
  const isReel = Boolean(
    metadata?.is_reel ||
      effectiveUrl.toLowerCase().includes('/reel/') ||
      effectiveUrl.toLowerCase().includes('/share/r/')
  );

  const ytPlayerRef = useRef<any>(null);
  const wasPlayingRef = useRef<boolean>(false);

  const sendYouTubeCommand = (func: 'playVideo' | 'pauseVideo' | 'stopVideo' | 'unMute' | 'mute') => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
      win.postMessage(JSON.stringify({ event: 'command', func, args: '' }), '*');
      win.postMessage(`{"event":"command","func":"${func}","args":""}`, '*');
    } catch {}
  };

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

  // IntersectionObserver + scroll listener to stop playback when scrolled away
  useEffect(() => {
    if (!isVideo) return;
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const pausePlayback = () => {
      setIsInView(false);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      sendYouTubeCommand('pauseVideo');
      sendYouTubeCommand('stopVideo');
    };

    const resumePlayback = () => {
      setIsInView(true);
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
  }, [isVideo, autoPlayOnScroll]);

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

  // 1. YouTube: 16:9 responsive embed
  if (type === 'youtube' && metadata?.video_id) {
    const ytEmbedSrc = `https://www.youtube-nocookie.com/embed/${metadata.video_id}?enablejsapi=1&playsinline=1&rel=0${
      typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
    }`;

    return (
      <div ref={containerRef} className={`w-full my-3 ${className}`}>
        <div className="relative w-full overflow-hidden rounded-2xl bg-black aspect-video shadow-xs">
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
        {renderViewOriginal('Watch on YouTube')}
      </div>
    );
  }

  // 2. Facebook Video / Reel: 16:9 for normal, 9:16 max-w-sm for reel
  if (type === 'facebook_video') {
    const videoEmbedSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      effectiveUrl
    )}&show_text=false&autoplay=0`;

    return (
      <div ref={containerRef} className={`w-full my-3 ${className}`}>
        <div
          className={`relative w-full overflow-hidden rounded-2xl bg-black shadow-xs ${
            isReel ? 'aspect-[9/16] max-w-sm mx-auto' : 'aspect-video'
          }`}
        >
          <iframe
            src={videoEmbedSrc}
            className="w-full h-full border-0"
            frameBorder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="Facebook video"
          />
        </div>
        {renderViewOriginal('View on Facebook')}
      </div>
    );
  }

  // 3. Facebook Post: 100% x 500px iframe
  if (type === 'facebook_post') {
    const postEmbedSrc = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(
      effectiveUrl
    )}`;

    return (
      <div className={`w-full my-3 ${className}`}>
        <div className="w-full h-[500px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <iframe
            src={postEmbedSrc}
            width="100%"
            height={500}
            className="w-full h-[500px] border-0 overflow-hidden"
            frameBorder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="Facebook post"
          />
        </div>
        {renderViewOriginal('View on Facebook')}
      </div>
    );
  }

  // 4. Instagram: 4:5 max-w-md centered
  if (type === 'instagram' && metadata?.code) {
    const igEmbedSrc = `https://www.instagram.com/p/${metadata.code}/embed`;

    return (
      <div className={`w-full my-3 ${className}`}>
        <div className="relative w-full max-w-md mx-auto aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <iframe
            src={igEmbedSrc}
            className="w-full h-full border-0"
            frameBorder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="Instagram embed"
          />
        </div>
        {renderViewOriginal('View on Instagram')}
      </div>
    );
  }

  // 5. TikTok: 9:16 max-w-sm
  if (type === 'tiktok' && metadata?.video_id) {
    const tiktokEmbedSrc = `https://www.tiktok.com/embed/v2/${metadata.video_id}`;

    return (
      <div className={`w-full my-3 ${className}`}>
        <div className="relative w-full max-w-sm mx-auto aspect-[9/16] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-black shadow-xs">
          <iframe
            src={tiktokEmbedSrc}
            className="w-full h-full border-0"
            frameBorder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="TikTok video"
          />
        </div>
        {renderViewOriginal('View on TikTok')}
      </div>
    );
  }

  // 6. Vimeo: 16:9
  if (type === 'vimeo' && metadata?.video_id) {
    const vimeoEmbedSrc = `https://player.vimeo.com/video/${metadata.video_id}`;

    return (
      <div ref={containerRef} className={`w-full my-3 ${className}`}>
        <div className="relative w-full overflow-hidden rounded-2xl bg-black aspect-video shadow-xs">
          <iframe
            src={vimeoEmbedSrc}
            className="w-full h-full border-0"
            frameBorder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="Vimeo video"
          />
        </div>
        {renderViewOriginal('View on Vimeo')}
      </div>
    );
  }

  // 7. Twitter / X: Rich card (image + title + "View on X")
  if (type === 'twitter') {
    return (
      <div className={`w-full my-3 ${className}`}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-400 transition-colors">
          {metadata?.image && (
            <div className="w-full h-48 sm:h-56 bg-slate-950 overflow-hidden">
              <img
                src={metadata.image}
                alt={metadata.title || 'X post'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
              {metadata?.title || 'Post on X'}
            </h4>
            {metadata?.description && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                {metadata.description}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-500">X (Twitter)</span>
              <a
                href={effectiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 hover:underline"
              >
                <span>View on X</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 8. Generic Rich Card: image left, title+desc right, "View on {site_name}"
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
