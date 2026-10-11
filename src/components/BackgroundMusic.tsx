import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'ndc_bg_music_muted';
const AUDIO_SRC = '/audio/ndc-theme.mp3';
const TARGET_VOLUME = 0.18; // Comfortable, non-intrusive ambient background volume

export function BackgroundMusic() {
  const { isLoggedIn } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const clearFade = () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  };

  // Smoothly ramp volume from current level to target level
  const rampVolume = (start: number, target: number, durationMs: number, onComplete?: () => void) => {
    clearFade();
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = Math.max(0, Math.min(1, start));
    const stepInterval = 50;
    const steps = Math.max(1, durationMs / stepInterval);
    const volumeDelta = (target - start) / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      if (!audioRef.current) {
        clearFade();
        return;
      }
      const newVol = start + volumeDelta * currentStep;
      if (currentStep >= steps) {
        audioRef.current.volume = Math.max(0, Math.min(1, target));
        clearFade();
        if (onComplete) onComplete();
      } else {
        audioRef.current.volume = Math.max(0, Math.min(1, newVol));
      }
    }, stepInterval);
  };

  // Sync Supabase auth state changes directly to ensure immediate pausing on login
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && audioRef.current) {
        clearFade();
        audioRef.current.pause();
      }
    });

    return () => {
      clearFade();
      subscription.unsubscribe();
    };
  }, []);

  // Main playback manager
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;

    // Strict rule: Music must stay off for logged-in users on all pages
    if (isLoggedIn) {
      clearFade();
      audio.pause();
      return;
    }

    // If user muted music, keep it muted and paused
    if (isMuted) {
      clearFade();
      audio.muted = true;
      audio.pause();
      return;
    }

    audio.muted = false;

    let cleanupListeners: (() => void) | null = null;

    const tryPlay = () => {
      if (isLoggedIn || !audioRef.current) return;
      audioRef.current.volume = 0.02; // Start very soft
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Smoothly ease in volume over 3 seconds so intro is never harsh
            rampVolume(0.02, TARGET_VOLUME, 3000);
            if (cleanupListeners) {
              cleanupListeners();
              cleanupListeners = null;
            }
          })
          .catch(() => {
            // Autoplay was blocked by browser policy.
            // Start music after the first user interaction: click, scroll, touchstart, or keydown
            attachInteractionListeners();
          });
      }
    };

    const attachInteractionListeners = () => {
      if (cleanupListeners) return;

      const handleInteraction = () => {
        tryPlay();
        if (cleanupListeners) {
          cleanupListeners();
          cleanupListeners = null;
        }
      };

      const options = { once: true, passive: true };
      window.addEventListener('click', handleInteraction, options);
      window.addEventListener('scroll', handleInteraction, options);
      window.addEventListener('touchstart', handleInteraction, options);
      window.addEventListener('keydown', handleInteraction, options);

      cleanupListeners = () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('scroll', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
      };
    };

    tryPlay();

    return () => {
      clearFade();
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [isLoggedIn, isMuted]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem(STORAGE_KEY, String(nextMuted));
    } catch {
      // Ignore localStorage availability errors
    }

    if (audioRef.current) {
      if (nextMuted) {
        // Quick gentle fade out before pausing
        rampVolume(audioRef.current.volume, 0, 300, () => {
          if (audioRef.current) {
            audioRef.current.muted = true;
            audioRef.current.pause();
          }
        });
      } else if (!isLoggedIn) {
        audioRef.current.muted = false;
        audioRef.current.volume = 0.02;
        audioRef.current
          .play()
          .then(() => {
            rampVolume(0.02, TARGET_VOLUME, 2000);
          })
          .catch(() => {});
      }
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="metadata"
        loop
      />

      {/* Small circular mute/unmute button, shown ONLY when user is logged out */}
      {!isLoggedIn && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute Notre Dame background music' : 'Mute Notre Dame background music'}
          title={isMuted ? 'Unmute background music (Amra Notredamian)' : 'Mute background music'}
          className="fixed bottom-4 right-4 z-40 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/20 shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <span className="text-sm sm:text-base leading-none select-none" aria-hidden="true">
            {isMuted ? '🔇' : '🔊'}
          </span>
        </button>
      )}
    </>
  );
}
