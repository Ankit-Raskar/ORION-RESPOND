"use client";
import { useOrion } from "@/lib/store";

/**
 * Marquee status ticker — like a news wire / situation report feed.
 */
export function StatusTicker() {
  const instance = useOrion((s) => s.instance);
  const status = useOrion((s) => s.status);
  const preposition = useOrion((s) => s.preposition);
  const routing = useOrion((s) => s.routing);

  const items = [
    `${instance.name.toUpperCase()}`,
    `${instance.zones.length} ZONES`,
    `${instance.warehouses.length} SITES`,
    `${instance.scenarios.length} SCENARIOS`,
    `${instance.fleet.count} TRUCKS`,
    status === "done" && preposition
      ? `COVERAGE ${(preposition.coverage * 100).toFixed(1)}%`
      : "AWAITING SOLUTION",
    routing ? `${routing.routes.length} ROUTES` : "ROUTES PENDING",
    "T+72H WINDOW",
    "FEMA · NOAA · USGS",
    "MIP v2.4",
  ].filter(Boolean);

  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-b border-border bg-secondary/40">
      <div className="orion-ticker py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
        {doubled.map((item, i) => (
          <span key={i} className="mx-5 inline-flex items-center gap-2">
            <span className="text-muted-foreground/40">·</span>
            <span
              className={
                item.startsWith("COVERAGE")
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }
            >
              {item}
            </span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-secondary/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-secondary/60 to-transparent" />
    </div>
  );
}
