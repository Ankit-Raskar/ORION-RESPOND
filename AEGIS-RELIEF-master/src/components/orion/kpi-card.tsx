"use client";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  delta?: number;
  deltaSuffix?: string;
  icon?: React.ReactNode;
  accent?: "amber" | "emerald" | "red" | "cyan" | "neutral";
  loading?: boolean;
}

const accentColor: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  amber: "var(--ochre)",
  emerald: "var(--forest)",
  red: "var(--oxblood)",
  cyan: "var(--slate)",
  neutral: "var(--ink)",
};

export function KpiCard({
  label,
  value,
  sub,
  delta,
  deltaSuffix = "%",
  icon,
  accent = "neutral",
  loading,
}: KpiCardProps) {
  const color = accentColor[accent];
  return (
    <div className="group relative bg-card p-4 transition-colors hover:bg-paper-warm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-20 orion-shimmer rounded" />
          ) : (
            <p
              className="mt-1.5 font-[var(--font-display)] text-3xl font-bold tabular leading-none"
              style={{ color }}
            >
              {value}
            </p>
          )}
          {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
        </div>
        {icon && (
          <div
            className="shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
            style={{ color }}
          >
            {icon}
          </div>
        )}
      </div>
      {delta !== undefined && !loading && (
        <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
          <span
            className="font-mono text-[10px] font-semibold tabular"
            style={{ color: delta > 0 ? "var(--forest)" : delta < 0 ? "var(--oxblood)" : "var(--muted-foreground)" }}
          >
            {delta > 0 ? "↑" : delta < 0 ? "↓" : "—"} {Math.abs(delta).toFixed(1)}
            {deltaSuffix}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            vs static
          </span>
        </div>
      )}
    </div>
  );
}
