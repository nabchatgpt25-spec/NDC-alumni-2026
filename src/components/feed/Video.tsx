import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

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
 * Video Component for Feed
 * Uses IntersectionObserver API to pause any video that is scrolled out of the viewport
 * and resumes it only when it becomes visible again with sound (unmuted).
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

  // Preserve user sound preference: default with sound (unmuted)
  const [isMuted, setIsMuted] = useState<boolean>(mutedDefault);
  const isMutedRef = useRef<boolean>(mutedDefault);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const videoEl = videoRef.current;
    const containerEl = containerRef.current;
    if (!videoEl || !containerEl) return;

    // Helper to evaluate and resume/pause based on visibility
    const checkVisibility = () => {
      if (!containerEl || !videoEl) return;
      const rect = containerEl.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
      const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;

      // 1. Scrolled out of viewport (or less than 35% visible): PAUSE
      if (rect.bottom < 40 || rect.top > windowHeight - 40 || ratio < 0.35) {
        if (!videoEl.paused) {
          videoEl.pause();
        }
      } else if (ratio >= 0.5) {
        // 2. Visible in viewport: RESUME WITH SOUND
        if (autoPlayOnScroll && videoEl.paused) {
          // Pause other playing videos to avoid conflicting audio
          document.querySelectorAll('video').forEach((otherVid) => {
            if (otherVid !== videoEl && !otherVid.paused) {
              otherVid.pause();
            }
          });

          // Resume with sound
          videoEl.muted = isMutedRef.current;
          videoEl.play().catch(() => {
            // If browser autoplay policy strictly requires user gesture before unmuted playback,
            // play muted initially until first gesture, but do NOT permanently mute
            videoEl.muted = true;
            videoEl.play().catch(() => {});
          });
        }
      }
    };

    // Listen for user gesture to ensure sound is enabled
    const handleUserInteraction = () => {
      if (!isMutedRef.current && videoEl && videoEl.muted) {
        videoEl.muted = false;
        setIsMuted(false);
      }
    };
    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    // 1. IntersectionObserver API Implementation
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Visible in viewport: resume with sound
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (autoPlayOnScroll) {
              document.querySelectorAll('video').forEach((otherVid) => {
                if (otherVid !== videoEl && !otherVid.paused) {
                  otherVid.pause();
                }
              });

              // Resume with sound
              videoEl.muted = isMutedRef.current;
              videoEl.play().catch(() => {
                videoEl.muted = true;
                videoEl.play().catch(() => {});
              });
            }
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
            // Scrolled out of the viewport: pause
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
      className={`relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black group shadow-xs ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={controls}
        playsInline
        muted={isMuted}
        loop={loop}
        preload="metadata"
        className="w-full max-h-[520px] object-contain bg-black"
      />

      {/* Quick Sound/Mute Toggle Control */}
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

export default Video;
