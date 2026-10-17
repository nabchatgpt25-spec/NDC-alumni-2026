import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserPreferences, type UserPreferences } from '../utils/userPreferences';

const AUDIO_SRC = '/audio/ndc-theme.mp3';
const TARGET_VOLUME = 0.5;

const INTERACTION_EVENTS = [
  'click',
  'pointerdown',
  'mousedown',
  'touchstart',
  'touchend',
  'keydown',
] as const;

export function BackgroundMusic() {
  const { isLoggedIn } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const userManuallyMutedRef = useRef<boolean>(false);

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return getUserPreferences().bg_music_enabled;
  });

  // Toggle sound on/off when clicking the floating button
  const handleToggleSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // User explicitly wants to pause/mute
      userManuallyMutedRef.current = true;
      audio.pause();
      setIsPlaying(false);
    } else {
      // User explicitly wants to play
      userManuallyMutedRef.current = false;
      audio.muted = false;
      audio.volume = TARGET_VOLUME;

      // Resume WebAudio context if suspended in mobile browsers
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }
      } catch {}

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Manual audio play failed:', err);
        });
    }
  }, [isPlaying]);

  // Main Audio Lifecycle:
  // 1. Starts immediately when visitor opens the homepage
  // 2. Continues playing across the homepage
  // 3. Immediately stops as soon as user logs in
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;

    // RULE 1: As soon as the user logs in, stop the sound immediately and reset
    if (isLoggedIn) {
      if (!audio.paused) {
        audio.pause();
      }
      audio.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // RULE 2: If disabled in settings, keep paused
    if (!isEnabled) {
      if (!audio.paused) {
        audio.pause();
      }
      setIsPlaying(false);
      return;
    }

    // Keep state in sync with real HTML5 audio events
    const onPlayEvent = () => setIsPlaying(true);
    const onPauseEvent = () => setIsPlaying(false);

    audio.addEventListener('play', onPlayEvent);
    audio.addEventListener('pause', onPauseEvent);

    let isCleanedUp = false;

    const cleanupListeners = () => {
      INTERACTION_EVENTS.forEach((evt) => {
        window.removeEventListener(evt, onFirstInteraction, { capture: true });
        document.removeEventListener(evt, onFirstInteraction, { capture: true });
      });
    };

    const onFirstInteraction = () => {
      if (isCleanedUp || isLoggedIn || userManuallyMutedRef.current) return;
      const el = audioRef.current;
      if (!el) return;

      // Unmute and play at target volume
      el.muted = false;
      el.volume = TARGET_VOLUME;

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }
      } catch {}

      const p = el.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          cleanupListeners();
        }).catch(() => {
          // If still blocked, keep listeners active for the next gesture
        });
      }
    };

    const attachInteractionListeners = () => {
      INTERACTION_EVENTS.forEach((evt) => {
        window.addEventListener(evt, onFirstInteraction, { capture: true, passive: true });
        document.addEventListener(evt, onFirstInteraction, { capture: true, passive: true });
      });
    };

    // Attempt 1: Immediate unmuted playback on page load
    if (!userManuallyMutedRef.current) {
      audio.muted = false;
      audio.volume = TARGET_VOLUME;

      const initialPromise = audio.play();
      if (initialPromise !== undefined) {
        initialPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Browser autoplay policy prevented unmuted sound.
            // Start muted in background so buffer is primed, and wait for first gesture.
            audio.muted = true;
            audio.play().catch(() => {});
            attachInteractionListeners();
          });
      } else {
        attachInteractionListeners();
      }
    }

    return () => {
      isCleanedUp = true;
      cleanupListeners();
      audio.removeEventListener('play', onPlayEvent);
      audio.removeEventListener('pause', onPauseEvent);
    };
  }, [isLoggedIn, isEnabled]);

  // Synchronize with User Preferences in real-time when changed from Settings
  useEffect(() => {
    const handlePrefsChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserPreferences>;
      const prefs = customEvent.detail || getUserPreferences();
      setIsEnabled(prefs.bg_music_enabled);

      if (!prefs.bg_music_enabled) {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          audio.pause();
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('ndc_user_prefs_changed', handlePrefsChange);
    return () => window.removeEventListener('ndc_user_prefs_changed', handlePrefsChange);
  }, []);

  // Pause playback when tab is hidden, resume when tab is re-focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio || isLoggedIn || !isEnabled || userManuallyMutedRef.current) return;

      if (document.hidden) {
        if (!audio.paused) {
          audio.pause();
        }
      } else {
        if (isPlaying && audio.paused) {
          audio.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoggedIn, isEnabled, isPlaying]);

  return (
    <>
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="auto"
        loop
        playsInline
        className="hidden"
        aria-hidden="true"
      />

      {/* Floating sound toggle for homepage visitors (kept exactly as designed) */}
      {!isLoggedIn && isEnabled && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={isPlaying ? 'Mute background music' : 'Play background music'}
            title={
              isPlaying
                ? 'Notre Dame Anthem: Playing (Click to mute)'
                : 'Notre Dame Anthem: Paused (Click to play)'
            }
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {isPlaying ? (
              <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
            )}
          </button>
        </div>
      )}
    </>
  );
}
