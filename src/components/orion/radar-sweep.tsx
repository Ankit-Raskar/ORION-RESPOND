"use client";
import { useOrion } from "@/lib/store";
import { useMemo } from "react";

/**
 * ORION threat radar — the signature hero visualization.
 *
 * A live SVG radar display showing candidate warehouses (as blips) and the
 * active disaster zone (center). A sweeping line rotates continuously;
 * blips pulse when swept. Built purely with SVG + CSS for crispness at
 * any resolution.
 */
export function RadarSweep({ className }: { className?: string }) {
  const instance = useOrion((s) => s.instance);
  const status = useOrion((s) => s.status);
  const preposition = useOrion((s) => s.preposition);

  // Project warehouses onto the radar using their relative geo position.
  const blips = useMemo(() => {
    if (!instance.warehouses.length) return [];
    const lats = instance.warehouses.map((w) => w.lat);
    const lngs = instance.warehouses.map((w) => w.lng);
    const zLats = instance.zones.map((z) => z.lat);
    const zLngs = instance.zones.map((z) => z.lng);
    const minLat = Math.min(...lats, ...zLats);
    const maxLat = Math.max(...lats, ...zLats);
    const minLng = Math.min(...lngs, ...zLngs);
    const maxLng = Math.max(...lngs, ...zLngs);
    const cx = (minLng + maxLng) / 2;
    const cy = (minLat + maxLat) / 2;
    const span = Math.max(maxLat - minLat, maxLng - minLng) || 1;

    const openIds = new Set(preposition?.openSites.map((o) => o.warehouseId) ?? []);
    return instance.warehouses.map((w) => {
      // normalize to [-0.8, 0.8] on the radar
      const nx = ((w.lng - cx) / span) * 0.8;
      const ny = -((w.lat - cy) / span) * 0.8; // invert lat
      const r = 42 + Math.abs(nx) * 8; // distance from center (% of radius)
      const ang = Math.atan2(ny, nx);
      return {
        id: w.id,
        x: 50 + Math.cos(ang) * r,
        y: 50 + Math.sin(ang) * r,
        open: openIds.has(w.id),
      };
    });
  }, [instance, preposition]);

  const zoneBlips = useMemo(() => {
    if (!instance.zones.length) return [];
    const lats = instance.warehouses.map((w) => w.lat);
    const lngs = instance.warehouses.map((w) => w.lng);
    const zLats = instance.zones.map((z) => z.lat);
    const zLngs = instance.zones.map((z) => z.lng);
    const minLat = Math.min(...lats, ...zLats);
    const maxLat = Math.max(...lats, ...zLats);
    const minLng = Math.min(...lngs, ...zLngs);
    const maxLng = Math.max(...lngs, ...zLngs);
    const cx = (minLng + maxLng) / 2;
    const cy = (minLat + maxLat) / 2;
    const span = Math.max(maxLat - minLat, maxLng - minLng) || 1;
    return instance.zones.map((z) => {
      const nx = ((z.lng - cx) / span) * 0.85;
      const ny = -((z.lat - cy) / span) * 0.85;
      const r = 42 + Math.abs(nx) * 8;
      const ang = Math.atan2(ny, nx);
      return {
        id: z.id,
        x: 50 + Math.cos(ang) * r,
        y: 50 + Math.sin(ang) * r,
        critical: z.priority === "critical",
      };
    });
  }, [instance]);

  return (
    <div className={`relative aspect-square ${className ?? ""}`}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        style={{ filter: "drop-shadow(0 0 20px oklch(0.82 0.17 68 / 0.25))" }}
      >
        <defs>
          <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.82 0.17 68 / 0.12)" />
            <stop offset="60%" stopColor="oklch(0.82 0.17 68 / 0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="sweep-grad" x1="50%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="oklch(0.82 0.17 68 / 0.6)" />
            <stop offset="100%" stopColor="oklch(0.82 0.17 68 / 0)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background glow */}
        <circle cx="50" cy="50" r="48" fill="url(#radar-bg)" />

        {/* Range rings */}
        {[12, 24, 36, 46].map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="oklch(0.82 0.17 68 / 0.18)"
            strokeWidth="0.2"
            strokeDasharray={r === 46 ? "0" : "1 1.5"}
          />
        ))}

        {/* Cross hairs */}
        <line x1="50" y1="2" x2="50" y2="98" stroke="oklch(0.82 0.17 68 / 0.12)" strokeWidth="0.2" />
        <line x1="2" y1="50" x2="98" y2="50" stroke="oklch(0.82 0.17 68 / 0.12)" strokeWidth="0.2" />
        <line x1="14" y1="14" x2="86" y2="86" stroke="oklch(0.82 0.17 68 / 0.08)" strokeWidth="0.15" />
        <line x1="86" y1="14" x2="14" y2="86" stroke="oklch(0.82 0.17 68 / 0.08)" strokeWidth="0.15" />

        {/* Cardinal labels */}
        <text x="50" y="6" textAnchor="middle" fill="oklch(0.66 0.012 280)" fontSize="2.4" fontFamily="monospace">N</text>
        <text x="50" y="97" textAnchor="middle" fill="oklch(0.66 0.012 280)" fontSize="2.4" fontFamily="monospace">S</text>
        <text x="3" y="51" fill="oklch(0.66 0.012 280)" fontSize="2.4" fontFamily="monospace">W</text>
        <text x="94" y="51" fill="oklch(0.66 0.012 280)" fontSize="2.4" fontFamily="monospace">E</text>

        {/* Range labels */}
        <text x="51" y="38" fill="oklch(0.55 0.01 280)" fontSize="1.8" fontFamily="monospace">50km</text>
        <text x="51" y="26" fill="oklch(0.55 0.01 280)" fontSize="1.8" fontFamily="monospace">100km</text>
        <text x="51" y="14" fill="oklch(0.55 0.01 280)" fontSize="1.8" fontFamily="monospace">150km</text>

        {/* Demand zone blips (red) */}
        {zoneBlips.map((z) => (
          <g key={`z-${z.id}`} className="orion-blip" style={{ animationDelay: `${Math.random() * 2}s` }}>
            <circle cx={z.x} cy={z.y} r="1.4" fill={z.critical ? "oklch(0.64 0.22 25)" : "oklch(0.84 0.15 90)"} filter="url(#glow)" />
            {z.critical && (
              <circle cx={z.x} cy={z.y} r="2.8" fill="none" stroke="oklch(0.64 0.22 25 / 0.5)" strokeWidth="0.3" className="orion-ping-ring" />
            )}
          </g>
        ))}

        {/* Warehouse blips */}
        {blips.map((b) => (
          <g key={`w-${b.id}`} className="orion-blip" style={{ animationDelay: `${Math.random() * 2}s` }}>
            {b.open && (
              <circle cx={b.x} cy={b.y} r="3" fill="none" stroke="oklch(0.74 0.16 158 / 0.6)" strokeWidth="0.4" className="orion-ping-ring" />
            )}
            <rect
              x={b.x - 1}
              y={b.y - 1}
              width="2"
              height="2"
              fill={b.open ? "oklch(0.74 0.16 158)" : "oklch(0.6 0.01 280)"}
              stroke={b.open ? "oklch(0.85 0.16 158)" : "oklch(0.7 0.01 280)"}
              strokeWidth="0.2"
              transform={`rotate(45 ${b.x} ${b.y})`}
              filter="url(#glow)"
            />
          </g>
        ))}

        {/* Center: disaster epicenter */}
        <circle cx="50" cy="50" r="2.5" fill="oklch(0.64 0.22 25)" filter="url(#glow)" />
        <circle cx="50" cy="50" r="5" fill="none" stroke="oklch(0.64 0.22 25 / 0.5)" strokeWidth="0.4" className="orion-ping-ring" />
        <circle cx="50" cy="50" r="8" fill="none" stroke="oklch(0.64 0.22 25 / 0.3)" strokeWidth="0.3" className="orion-ping-ring" style={{ animationDelay: "0.5s" }} />

        {/* Sweeping radar line */}
        <g className="orion-radar-sweep">
          <path
            d="M 50 50 L 50 2 A 48 48 0 0 1 84 16 Z"
            fill="url(#sweep-grad)"
            opacity="0.7"
          />
          <line x1="50" y1="50" x2="50" y2="2" stroke="oklch(0.82 0.17 68)" strokeWidth="0.3" />
        </g>

        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="oklch(0.82 0.17 68 / 0.3)"
          strokeWidth="0.3"
        />
      </svg>

      {/* Status overlay */}
      <div className="pointer-events-none absolute left-4 top-4 font-mono text-[9px] uppercase tracking-widest text-amber-400/80">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 orion-blink" />
          SCAN ACTIVE
        </div>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 text-right font-mono text-[9px] uppercase tracking-widest text-muted-foreground/80">
        <div>{instance.disasterType} watch</div>
        <div className="text-amber-400/60">{instance.scenarios.length} scenarios</div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        {status === "done" ? "● SOLUTION LOCKED" : status === "running" ? "● OPTIMIZING" : "○ STANDBY"}
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        GRID {instance.id.slice(0, 4).toUpperCase()}
      </div>
    </div>
  );
}
