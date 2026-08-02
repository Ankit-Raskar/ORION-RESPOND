"use client";
import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost";
  strength?: number;
}

/**
 * Button that subtly follows the cursor for a tactile, premium feel.
 * Content shifts slightly toward the pointer on hover.
 */
export function MagneticButton({
  children,
  onClick,
  className,
  disabled,
  variant = "primary",
  strength = 0.3,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) * strength;
    const y = (e.clientY - (rect.top + rect.height / 2)) * strength;
    setPos({ x, y });
  };

  const reset = () => setPos({ x: 0, y: 0 });

  const variants = {
    primary:
      "bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-black hover:from-amber-200 hover:to-orange-400 shadow-[0_8px_30px_-8px_oklch(0.82_0.17_68/0.5)]",
    outline:
      "border border-border bg-card/40 text-foreground hover:bg-accent/40 backdrop-blur-md",
    ghost: "text-foreground hover:bg-accent/40",
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      disabled={disabled}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 200, damping: 15, mass: 0.3 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-mono text-sm font-semibold tracking-tight transition-colors",
        variants[variant],
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant === "primary" && (
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity hover:opacity-100" />
      )}
    </motion.button>
  );
}
