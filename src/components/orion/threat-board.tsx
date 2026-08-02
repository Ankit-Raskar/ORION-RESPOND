"use client";
import { useOrion } from "@/lib/store";
import { useMemo } from "react";

/**
 * ORION threat board — a minimalist technical-diagram map fragment.
 * Shows the active scenario's zones + candidate warehouses plotted on a
 * coordinate grid with lat/lng ticks. Printed-report aesthetic.
 */
export function ThreatBoard({ className }: { className?: string }) {
  const instance = useOrion((s) => s.instance);
  const preposition = useOrion((s) => s.preposition);

  const { zones, warehouses, bounds } = useMemo(() => {
    const lats = [...instance.warehouses.map((w) => w.lat), ...instance.zones.map((z) => z.lat)];
    const lngs = [...instance.warehouses.map((w) => w.lng), ...instance.zones.map((z) => z.lng)];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padLat = (maxLat - minLat) * 0.12 || 0.1;
    const padLng = (maxLng - minLng) * 0.12 || 0.1;
    const b = {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
    const project = (lat: number, lng: number): [number, number] => {
      const x = ((lng - b.minLng) / (b.maxLng - b.minLng)) * 100;
      const y = (1 - (lat - b.minLat) / (b.maxLat - b.minLat)) * 100;
      return [x, y];
    };
    return {
      bounds: b,
      zones: instance.zones.map((z) => ({ ...z, pos: project(z.lat, z.lng) })),
      warehouses: instance.warehouses.map((w) => ({ ...w, pos: project(w.lat, w.lng) })),
    };
  }, [instance]);

  const openIds = new Set(preposition?.openSites.map((o) => o.warehouseId) ?? []);
  const maxPop = Math.max(...zones.map((z) => z.population));

  // Draw lines from open warehouses to their nearest zones (planned coverage)
  const links = useMemo(() => {
    if (!preposition) return [];
    return warehouses
      .filter((w) => openIds.has(w.id))
      .flatMap((w) =>
        zones
          .map((z) => ({
            w: w.pos,
            z: z.pos,
            d: Math.hypot(w.pos[0] - z.pos[0], w.pos[1] - z.pos[1]),
          }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 3),
      );
  }, [warehouses, zones, openIds, preposition]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
        {/* Coordinate grid */}
        {[20, 40, 60, 80].map((p) => (
          <g key={p}>
            <line x1={p} y1="0" x2={p} y2="100" stroke="var(--rule)" strokeWidth="0.15" />
            <line x1="0" y1={p} x2="100" y2={p} stroke="var(--rule)" strokeWidth="0.15" />
          </g>
        ))}
        {/* Border frame */}
        <rect x="0" y="0" width="100" height="100" fill="none" stroke="var(--border)" strokeWidth="0.4" />

        {/* Coverage links */}
        {links.map((l, i) => (
          <line
            key={i}
            x1={l.w[0]}
            y1={l.w[1]}
            x2={l.z[0]}
            y2={l.z[1]}
            stroke="var(--forest)"
            strokeWidth="0.25"
            strokeOpacity="0.5"
            strokeDasharray="0.8 0.6"
          />
        ))}

        {/* Demand zones — circles sized by population */}
        {zones.map((z) => {
          const r = 1.2 + (z.population / maxPop) * 3;
          const fill =
            z.priority === "critical"
              ? "var(--oxblood)"
              : z.priority === "high"
                ? "var(--ochre)"
                : "var(--slate)";
          return (
            <g key={z.id}>
              {z.priority === "critical" && (
                <circle
                  cx={z.pos[0]}
                  cy={z.pos[1]}
                  r={r + 2}
                  fill="none"
                  stroke="var(--oxblood)"
                  strokeWidth="0.2"
                  className="orion-pulse-ring"
                  style={{ transformOrigin: `${z.pos[0]}px ${z.pos[1]}px` }}
                />
              )}
              <circle cx={z.pos[0]} cy={z.pos[1]} r={r} fill={fill} fillOpacity="0.85" stroke="var(--paper)" strokeWidth="0.3" />
              <text
                x={z.pos[0]}
                y={z.pos[1] + r + 2.2}
                textAnchor="middle"
                fontSize="1.6"
                fontFamily="var(--font-mono)"
                fill="var(--ink-soft)"
              >
                {z.id}
              </text>
            </g>
          );
        })}

        {/* Warehouses — diamonds */}
        {warehouses.map((w) => {
          const open = openIds.has(w.id);
          const color = open ? "var(--forest)" : "var(--muted-foreground)";
          return (
            <g key={w.id}>
              <rect
                x={w.pos[0] - 1.4}
                y={w.pos[1] - 1.4}
                width="2.8"
                height="2.8"
                fill={open ? "var(--forest)" : "none"}
                stroke={color}
                strokeWidth="0.4"
                transform={`rotate(45 ${w.pos[0]} ${w.pos[1]})`}
              />
              <text
                x={w.pos[0]}
                y={w.pos[1] - 2.6}
                textAnchor="middle"
                fontSize="1.6"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                fill={open ? "var(--forest)" : "var(--muted-foreground)"}
              >
                {w.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Coordinate labels (corners) */}
      <div className="pointer-events-none absolute left-2 top-2 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
        {bounds.maxLat.toFixed(2)}°N
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
        {bounds.minLat.toFixed(2)}°N
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
        {bounds.maxLng.toFixed(2)}°W
      </div>
      <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
        {bounds.minLng.toFixed(2)}°W
      </div>

      {/* Scale bar */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1.5 font-mono text-[8px] text-muted-foreground">
          <div className="h-1.5 w-8 border border-foreground/60">
            <div className="h-full w-1/2 bg-foreground/60" />
          </div>
          <span>50 km</span>
        </div>
      </div>
    </div>
  );
}
