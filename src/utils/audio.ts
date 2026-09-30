// Synthesized audio effects matching the original Alumni Connect Web Audio API
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function playSound(kind: 'like' | 'comment' | 'post' | 'pop' | 'theme' | 'tap') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const freqs: Record<string, number[]> = {
      like: [520, 780],
      comment: [440, 660],
      post: [440, 660, 880],
      pop: [600],
      theme: [523.25, 659.25, 783.99, 1046.5], // C-E-G-C chime
      tap: [720],
    };

    const seq = freqs[kind] || freqs.pop;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.0001, now);

    seq.forEach((f, i) => {
      const t = now + i * 0.05;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    });

    osc.start(now);
    osc.stop(now + seq.length * 0.05 + 0.1);
  } catch {
    // Audio may be blocked by autoplay policies
  }
}
