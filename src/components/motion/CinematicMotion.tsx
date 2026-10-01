import React, { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * 1. Global Cursor-Following Institutional Spotlight
 * Uses CSS custom properties updated via rAF for zero React re-renders.
 * Automatically disabled on touch devices and when prefers-reduced-motion is enabled.
 */
export const CursorSpotlight: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isFinePointer, setIsFinePointer] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion) return;
    const mql = window.matchMedia('(pointer: fine) and (min-width: 768px)');
    setIsFinePointer(mql.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mql.addEventListener?.('change', handleChange);
    return () => mql.removeEventListener?.('change', handleChange);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isFinePointer || prefersReducedMotion) return;
    let rafId: number | null = null;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 3;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (overlayRef.current) {
            overlayRef.current.style.setProperty('--spot-x', `${targetX}px`);
            overlayRef.current.style.setProperty('--spot-y', `${targetY}px`);
          }
          rafId = null;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isFinePointer, prefersReducedMotion]);

  if (!isFinePointer || prefersReducedMotion) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-500"
      style={
        {
          '--spot-x': '50vw',
          '--spot-y': '30vh',
          background:
            'radial-gradient(650px circle at var(--spot-x) var(--spot-y), rgba(29, 78, 216, 0.055), rgba(217, 119, 6, 0.022) 38%, transparent 72%)',
        } as React.CSSProperties
      }
    />
  );
};

/**
 * 2. Subtle Academic Constellation & Alumni Network Canvas
 * Renders refined deep-navy/blue & restrained gold nodes and connecting filaments.
 */
interface AcademicNetworkCanvasProps {
  className?: string;
  density?: 'low' | 'medium';
}

export const AcademicNetworkCanvas: React.FC<AcademicNetworkCanvasProps> = ({
  className = '',
  density = 'medium',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth || 800);
    let height = (canvas.height = canvas.offsetHeight || 500);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile
      ? density === 'low'
        ? 12
        : 18
      : density === 'low'
      ? 24
      : 36;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      isGold: boolean;
    }

    const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
      x: ((i * 137.5) % 100) * (width / 100),
      y: ((i * 73.1) % 100) * (height / 100),
      vx: (((i % 5) - 2) * 0.12) || 0.08,
      vy: ((((i * 3) % 5) - 2) * 0.1) || -0.07,
      r: i % 6 === 0 ? 2.2 : 1.5,
      isGold: i % 6 === 0,
    }));

    let mouseX = -9999;
    let mouseY = -9999;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 800;
      height = canvas.height = canvas.offsetHeight || 500;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    }

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      const isDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        if (p.isGold) {
          ctx.fillStyle = isDark
            ? 'rgba(251, 191, 36, 0.55)'
            : 'rgba(217, 119, 6, 0.45)';
        } else {
          ctx.fillStyle = isDark
            ? 'rgba(96, 165, 250, 0.42)'
            : 'rgba(37, 99, 235, 0.32)';
        }
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = isMobile ? 110 : 145;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (isDark ? 0.16 : 0.11);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle =
              p.isGold || p2.isGold
                ? `rgba(217, 119, 6, ${alpha})`
                : isDark
                ? `rgba(96, 165, 250, ${alpha})`
                : `rgba(30, 64, 175, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // Subtle connection to cursor on desktop
        if (!isMobile && mouseX > 0 && mouseY > 0) {
          const cdx = p.x - mouseX;
          const cdy = p.y - mouseY;
          const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cDist < 170) {
            const cAlpha = (1 - cDist / 170) * (isDark ? 0.24 : 0.18);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.strokeStyle = `rgba(217, 119, 6, ${cAlpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [density, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
};

/**
 * 3. Interactive 3D Tilt & Spotlight Card
 * Provides refined academic 3D perspective tilt + cursor glare on desktop.
 */
interface Tilt3DCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  maxTilt?: number;
}

export const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  children,
  className = '',
  onClick,
  maxTilt = 4.5,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !cardRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    cardRef.current.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(
      2
    )}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px) scale3d(1.01, 1.01, 1.01)`;
    cardRef.current.style.setProperty('--card-mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--card-mouse-y', `${y}px`);
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform =
      'perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)';
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`tilt-3d-surface relative overflow-hidden ${className}`}
    >
      {/* Subtle cursor-following specular spotlight inside card */}
      <div
        aria-hidden="true"
        className="card-spotlight-overlay pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
      {children}
    </div>
  );
};

/**
 * 4. Magnetic CTA Button Wrapper
 * Gently attracts primary CTA buttons toward the cursor with spring physics.
 */
interface MagneticWrapProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const MagneticWrap: React.FC<MagneticWrapProps> = ({
  children,
  className = 'inline-flex',
  strength = 0.22,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !ref.current) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    setOffset({
      x: Math.max(-7, Math.min(7, deltaX)),
      y: Math.max(-5, Math.min(5, deltaY)),
    });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, mass: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 5. Scroll-Reveal Section / Card Wrapper
 */
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  distance = 24,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const initialOffset = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...initialOffset, scale: 0.985 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
