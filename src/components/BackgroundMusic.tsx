import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserPreferences, type UserPreferences } from '../utils/userPreferences';

const AUDIO_SRC = '/audio/ndc-theme.mp3';
const STORAGE_KEY = 'ndc_bg_music_muted';
const TARGET_VOLUME = 0.25;
const FADE_STEP_MS = 30;
const FADE_DURATION_MS = 400;

export function BackgroundMusic() {
  const { isLoggedIn } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch (e) {
      console.warn('Failed to read music mute state from localStorage:', e);
    }
    const prefs = getUserPreferences();
    return prefs.bg_music_muted_default || false;
  });

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return getUserPreferences().bg_music_enabled;
  });

  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current !== null) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  // Smooth volume ramping for fade-in and fade-out
  const rampVolume = useCallback(
    (target: number, durationMs: number = FADE_DURATION_MS, onComplete?: () => void) => {
      clearFade();
      const audio = audioRef.current;
      if (!audio) return;

      const start = audio.volume;
      const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
      const delta = (target - start) / steps;
      let currentStep = 0;

      fadeIntervalRef.current = window.setInterval(() => {
        currentStep++;
        if (!audioRef.current) {
          clearFade();
          return;
        }

        const nextVol = Math.max(0, Math.min(1, start + delta * currentStep));
        audioRef.current.volume = nextVol;

        if (currentStep >= steps) {
          audioRef.current.volume = Math.max(0, Math.min(1, target));
          clearFade();
          if (onComplete) onComplete();
        }
      }, FADE_STEP_MS);
    },
    [clearFade]
  );

  // Play audio smoothly with sound fade-in
  const playWithFade = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isLoggedIn || isMuted || !isEnabled) return;

    audio.muted = false;
    audio.volume = 0;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          rampVolume(TARGET_VOLUME, 600);
        })
        .catch((err) => {
          console.warn('Background music autoplay blocked, waiting for interaction:', err);
          setIsPlaying(false);
        });
    }
  }, [isLoggedIn, isMuted, isEnabled, rampVolume]);

  // Pause audio smoothly with sound fade-out
  const pauseWithFade = useCallback(
    (instant: boolean = false) => {
      clearFade();
      const audio = audioRef.current;
      if (!audio) return;

      if (instant || audio.paused) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      rampVolume(0, 300, () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });
    },
    [clearFade, rampVolume]
  );

  // Toggle mute state and persist in localStorage (ndc_bg_music_muted)
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    try {
      localStorage.setItem(STORAGE_KEY, String(nextMuted));
    } catch (e) {
      console.warn('Failed to save music mute state to localStorage:', e);
    }

    if (nextMuted) {
      pauseWithFade();
    } else {
      playWithFade();
    }
  };

  // Main lifecycle: Start music when guest visits homepage, handle browser autoplay policies
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;

    // Rule 1: Logged-in users are browsing portal/feed -> keep music silent
    if (isLoggedIn) {
      pauseWithFade();
      return;
    }

    // Rule 2: Respect application preferences
    if (!isEnabled || isMuted) {
      pauseWithFade(true);
      return;
    }

    // Guest on Homepage: Attempt autoplay with interaction fallback
    let interactionCleanup: (() => void) | null = null;

    const triggerPlayOnInteraction = () => {
      if (interactionCleanup) {
        interactionCleanup();
        interactionCleanup = null;
      }
      playWithFade();
    };

    audio.volume = 0;
    audio.muted = false;

    const promise = audio.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setIsPlaying(true);
          rampVolume(TARGET_VOLUME, 600);
        })
        .catch(() => {
          // Autoplay policy prevented immediate playback
          // Add passive listeners for first gesture (click, touch, scroll, keypress)
          const events: (keyof WindowEventMap)[] = [
            'pointerdown',
            'touchstart',
            'mousedown',
            'click',
            'keydown',
            'scroll',
          ];
          const options: AddEventListenerOptions = { capture: true, passive: true, once: true };

          events.forEach((evt) => {
            window.addEventListener(evt, triggerPlayOnInteraction as EventListener, options);
          });

          interactionCleanup = () => {
            events.forEach((evt) => {
              window.removeEventListener(evt, triggerPlayOnInteraction as EventListener, options);
            });
          };
        });
    }

    return () => {
      clearFade();
      if (interactionCleanup) {
        interactionCleanup();
      }
    };
  }, [isLoggedIn, isMuted, isEnabled, clearFade, rampVolume, playWithFade, pauseWithFade]);

  // Synchronize with User Preferences in real-time when changed from Settings
  useEffect(() => {
    const handlePrefsChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserPreferences>;
      const prefs = customEvent.detail || getUserPreferences();
      setIsEnabled(prefs.bg_music_enabled);

      if (!prefs.bg_music_enabled) {
        pauseWithFade(true);
      } else if (prefs.bg_music_muted_default && localStorage.getItem(STORAGE_KEY) === null) {
        setIsMuted(true);
        pauseWithFade(true);
      }
    };

    window.addEventListener('ndc_user_prefs_changed', handlePrefsChange);
    return () => window.removeEventListener('ndc_user_prefs_changed', handlePrefsChange);
  }, [pauseWithFade]);

  // Pause playback when tab is backgrounded, resume when tab is focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio || isLoggedIn || isMuted || !isEnabled) return;

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
  }, [isLoggedIn, isMuted, isEnabled, isPlaying]);

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

      {/* Floating sound toggle for homepage visitors (discreet, compact, non-intrusive) */}
      {!isLoggedIn && isEnabled && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
            title={
              isMuted
                ? 'Notre Dame Anthem: Muted (Click to unmute)'
                : 'Notre Dame Anthem: Playing (Click to mute)'
            }
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
            ) : (
              <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            )}
          </button>
        </div>
      )}
    </>
  );
}
