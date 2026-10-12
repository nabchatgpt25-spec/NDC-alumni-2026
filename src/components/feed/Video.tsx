import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

export interface VideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlayOnScroll?: boolean;
  loop?: boolean;
  controls?: boolean;
  mutedDefault?: boolean;
}

/**
 * Feed Video Component with IntersectionObserver API
 * - Pauses any video that is scrolled out of the viewport
 * - Resumes video only when it becomes visible again WITH SOUND (unmuted)
 * - Restores sound automatically upon scroll-in and user interaction
 */
export const Video: React.FC<VideoProps> = ({
  src,
  poster,
  className = '',
  autoPlayOnScroll = true,
  loop = true,
  controls = true,
  mutedDefault = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sound preference: default WITH SOUND (unmuted)
  const [isMuted, setIsMuted] = useState<boolean>(mutedDefault);
  const userExplicitlyMutedRef = useRef<boolean>(mutedDefault);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(false);

  // Resume / Start playback helper WITH SOUND
  const startPlayback = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Pause all other video elements in the document to prevent sound conflict
    document.querySelectorAll('video').forEach((other) => {
      if (other !== videoEl && !other.paused) {
        other.pause();
      }
    });

    // Notify any external embeds to pause
    window.dispatchEvent(new CustomEvent('ndc-pause-all-media', { detail: { except: videoEl } }));

    // Resume WITH SOUND unless user manually clicked mute button
    const shouldMute = userExplicitlyMutedRef.current;
    videoEl.muted = shouldMute;
    setIsMuted(shouldMute);

    videoEl.play()
      .then(() => {
        setIsPlaying(true);
        // Ensure unmuted with sound
        if (!shouldMute && videoEl.muted) {
          videoEl.muted = false;
          setIsMuted(false);
        }
      })
      .catch(() => {
        // If initial autoplay is constrained by browser gesture policy,
        // play muted temporarily but unmute on the very next user gesture (tap/scroll/click)
        videoEl.muted = true;
        videoEl.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });
  }, []);

  // Pause playback helper
  const pausePlayback = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl && !videoEl.paused) {
      videoEl.pause();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    const containerEl = containerRef.current;
    if (!videoEl || !containerEl) return;

    // Listen for user gestures (click/touch/scroll) to immediately activate unmuted sound
    const handleUserGesture = () => {
      if (!userExplicitlyMutedRef.current && videoEl && videoEl.muted) {
        videoEl.muted = false;
        setIsMuted(false);
      }
    };
    window.addEventListener('click', handleUserGesture, { passive: true });
    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });

    // Evaluate visibility on scroll & resize
    const evaluateVisibility = () => {
      if (!containerEl || !videoEl) return;
      const rect = containerEl.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      // 1. Off-screen: completely scrolled out of the viewport
      const isOffScreen =
        rect.bottom <= 20 ||
        rect.top >= windowHeight - 20 ||
        rect.right <= 0 ||
        rect.left >= windowWidth;

      if (isOffScreen) {
        setIsInView(false);
        // PAUSE video that is scrolled out of the viewport
        if (!videoEl.paused) {
          videoEl.pause();
          setIsPlaying(false);
        }
        return;
      }

      // 2. Visible height ratio calculation
      const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
      const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;

      if (ratio < 0.4) {
        // Less than 40% visible in the viewport: PAUSE
        setIsInView(false);
        if (!videoEl.paused) {
          videoEl.pause();
          setIsPlaying(false);
        }
      } else if (ratio >= 0.5) {
        // RESUME video ONLY when it becomes visible again WITH SOUND
        setIsInView(true);
        if (autoPlayOnScroll) {
          if (videoEl.paused) {
            startPlayback();
          }
          // Ensure sound is active (not muted after scrolling)
          if (!userExplicitlyMutedRef.current && videoEl.muted) {
            videoEl.muted = false;
            setIsMuted(false);
          }
        }
      }
    };

    // IntersectionObserver API Implementation:
    // - Pauses any video that is scrolled out of the viewport
    // - Resumes it only when it becomes visible again WITH SOUND
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
            // Scrolled out of the viewport: PAUSE
            setIsInView(false);
            if (!videoEl.paused) {
              videoEl.pause();
              setIsPlaying(false);
            }
          } else if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Visible again: RESUME WITH SOUND
            setIsInView(true);
            if (autoPlayOnScroll) {
              if (videoEl.paused) {
                startPlayback();
              }
              // Ensure sound is unmuted
              if (!userExplicitlyMutedRef.current && videoEl.muted) {
                videoEl.muted = false;
                setIsMuted(false);
              }
            }
          }
        });
      },
      {
        threshold: [0, 0.15, 0.35, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(containerEl);

    // Global scroll listeners for high-speed scrolling accuracy
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        evaluateVisibility();
      });
    };

    // Pause if user changes tabs or minimizes browser
    const handleVisibilityChange = () => {
      if (document.hidden && !videoEl.paused) {
        videoEl.pause();
        setIsPlaying(false);
      }
    };

    // Pause if another media component signals playback
    const handleGlobalPause = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.except !== videoEl && !videoEl.paused) {
        videoEl.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('ndc-pause-all-media', handleGlobalPause);

    // Initial check
    evaluateVisibility();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('ndc-pause-all-media', handleGlobalPause);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [autoPlayOnScroll, startPlayback]);

  // User manual mute / unmute toggle
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const nextMuted = !isMuted;
    videoEl.muted = nextMuted;
    setIsMuted(nextMuted);
    userExplicitlyMutedRef.current = nextMuted; // Track user explicit choice
  };

  const handleVideoPlayPause = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.paused) {
      startPlayback();
    } else {
      pausePlayback();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black group shadow-xs ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={controls}
        playsInline
        webkit-playsinline="true"
        muted={isMuted}
        loop={loop}
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          // Pause all other videos
          document.querySelectorAll('video').forEach((other) => {
            if (other !== videoRef.current && !other.paused) {
              other.pause();
            }
          });
        }}
        onPause={() => setIsPlaying(false)}
        className="w-full max-h-[520px] object-contain bg-black cursor-pointer"
      />

      {/* Floating Controls Bar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none z-10">
        {/* Play/Pause Button if native controls hidden */}
        {!controls && (
          <button
            type="button"
            onClick={handleVideoPlayPause}
            className="pointer-events-auto inline-flex items-center justify-center p-2 rounded-full bg-black/80 hover:bg-black text-white transition-colors cursor-pointer shadow-md"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white ml-0.5" />
            )}
          </button>
        )}

        {/* 1-Tap Sound/Mute Toggle Control */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer shadow-md backdrop-blur-xs"
          title={isMuted ? 'Click to unmute' : 'Click to mute'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px] text-rose-300 font-semibold">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-300 font-semibold">Sound On</span>
            </>
          )}
        </button>
      </div>

      {/* In-view status indicator */}
      {autoPlayOnScroll && (
        <div className="absolute bottom-3 left-3 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-[10px] font-semibold text-white/90">
            {isInView ? (isMuted ? '● Active (Muted)' : '● Active with Sound') : '○ Paused on Scroll'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Video;
