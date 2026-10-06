import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'motion/react';

interface AnimatedCounterProps {
  end?: number;
  to?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  end,
  to,
  suffix = '',
  prefix = '',
  duration = 1800,
  className = '',
}) => {
  const targetEnd = Number(end ?? to ?? 0);
  const [count, setCount] = useState<number>(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.25 });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    let animFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic curve from 0 to targetEnd
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * targetEnd));
      if (progress < 1) {
        animFrameId = requestAnimationFrame(step);
      } else {
        setCount(targetEnd);
      }
    };

    setCount(0);
    animFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameId);
  }, [isInView, targetEnd, duration]);

  const displayCount = typeof count === 'number' && !Number.isNaN(count) ? count : 0;

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {displayCount.toLocaleString()}
      {suffix}
    </span>
  );
};
