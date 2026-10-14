import confetti from 'canvas-confetti';

/**
 * Triggers a subtle, tasteful celebratory confetti effect for mentorship actions.
 * Designed to feel rewarding without being loud or distracting.
 */
export function triggerMentorshipConfetti(type: 'request' | 'offer' = 'request'): void {
  try {
    if (typeof window === 'undefined') return;

    if (type === 'request') {
      // Subtle warm amber, sky blue & gold particles for junior question submission
      confetti({
        particleCount: 45,
        spread: 60,
        startVelocity: 26,
        origin: { y: 0.62, x: 0.5 },
        colors: ['#f59e0b', '#3b82f6', '#fbbf24', '#60a5fa', '#fcd34d', '#10b981'],
        ticks: 200,
        gravity: 0.85,
        decay: 0.92,
        scalar: 0.85,
        shapes: ['circle', 'square'],
      });
    } else {
      // Celebratory emerald, sapphire & gold particles for senior mentor offer
      confetti({
        particleCount: 55,
        spread: 72,
        startVelocity: 30,
        origin: { y: 0.62, x: 0.5 },
        colors: ['#10b981', '#059669', '#3b82f6', '#f59e0b', '#34d399', '#6ee7b7'],
        ticks: 220,
        gravity: 0.8,
        decay: 0.92,
        scalar: 0.9,
        shapes: ['circle', 'square'],
      });

      // Gentle secondary side sparkle
      setTimeout(() => {
        confetti({
          particleCount: 20,
          angle: 110,
          spread: 40,
          startVelocity: 22,
          origin: { x: 0.75, y: 0.68 },
          colors: ['#10b981', '#fbbf24', '#3b82f6'],
          gravity: 0.85,
          scalar: 0.75,
        });
      }, 160);
    }
  } catch (err) {
    console.warn('Mentorship confetti error:', err);
  }
}
