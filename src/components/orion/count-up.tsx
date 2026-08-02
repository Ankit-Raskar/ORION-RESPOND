"use client";
import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** If provided, formats the number with this function instead of toFixed. */
  format?: (v: number) => string;
}

/**
 * Animated number counter that eases from 0 → end over `duration` ms.
 * Uses requestAnimationFrame with an ease-out cubic curve.
 */
export function CountUp({
  end,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  format,
}: CountUpProps) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            setVal(end * eased);
            if (t < 1) requestAnimationFrame(tick);
            else setVal(end);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  const display = format ? format(val) : val.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
