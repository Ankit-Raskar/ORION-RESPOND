"use client";
import dynamic from "next/dynamic";
import { useOrion } from "@/lib/store";
import { ScenarioControl } from "./scenario-control";
import { KpiCard } from "./kpi-card";
import { SolverLog } from "./solver-log";
import { CountUp } from "./count-up";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtMoney } from "@/lib/optim/geo";
import {
  Boxes,
  CloudOff,
  Gauge,
  Leaf,
  MapPin,
  Route as RouteIcon,
  ShieldCheck,
  Truck,
  Crosshair,
  Activity,
  Play,
  Clock,
} from "lucide-react";
import { useEffect } from "react";
import { FormulationPanel } from "./formulation-panel";

const OrionMap = dynamic(() => import("./orion-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary/40">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border" style={{ borderTopColor: "var(--oxblood)" }} />
        <div className="font-mono text-[11px] text-muted-foreground">Loading map tiles…</div>
      </div>
    </div>
  ),
});

export function MapView() {
  const instance = useOrion((s) => s.instance);
  const status = useOrion((s) => s.status);
  const preposition = useOrion((s) => s.preposition);
  const routing = useOrion((s) => s.routing);
  const staticBaseline = useOrion((s) => s.staticBaseline);
  const selectedScenarioId = useOrion((s) => s.selectedScenarioId);
  const setSelectedScenario = useOrion((s) => s.setSelectedScenario);
  const runOptimizer = useOrion((s) => s.runOptimizer);
  const timeFilter = useOrion((s) => s.timeFilter);
  const setTimeFilter = useOrion((s) => s.setTimeFilter);

  useEffect(() => {
    if (!selectedScenarioId && instance.scenarios.length) {
      setSelectedScenario(instance.scenarios[0].id);
    }
  }, [instance, selectedScenarioId, setSelectedScenario]);

  const loading = status === "running";
  const covDelta = preposition && staticBaseline ? (preposition.coverage - staticBaseline.coverage) * 100 : undefined;
  const unmetDelta = preposition && staticBaseline ? (staticBaseline.expectedUnmet - preposition.expectedUnmet) / Math.max(1, staticBaseline.expectedUnmet) * 100 : undefined;
  const costDelta = preposition && staticBaseline ? (staticBaseline.totalCost - preposition.totalCost) / Math.max(1, staticBaseline.totalCost) * 100 : undefined;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
      {/* Section header */}
      <div className="mb-4 flex items-end justify-between border-b border-border pb-3">
        <div className="flex items-baseline gap-3">
          <span className="orion-section-mark text-xl">§ 02</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Live Operations Map
          </span>
          <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:inline">
            — {instance.name}
          </span>
        </div>
        {preposition && (
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">
            {(preposition.coverage * 100).toFixed(1)}% coverage · {routing?.routes.length ?? 0} routes
          </span>
        )}
      </div>

      {/* KPI strip — full width horizontal */}
      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border lg:grid-cols-4">
        <KpiCard
          label="Coverage"
          value={preposition ? <CountUp end={preposition.coverage * 100} decimals={1} suffix="%" /> : "—"}
          sub="expected demand met"
          delta={covDelta}
          accent="emerald"
          icon={<ShieldCheck className="h-4 w-4" />}
          loading={loading && !preposition}
        />
        <KpiCard
          label="Exp. Unmet"
          value={preposition ? <CountUp end={preposition.expectedUnmet} decimals={1} suffix="t" /> : "—"}
          sub="across scenarios"
          delta={unmetDelta}
          accent="red"
          icon={<MapPin className="h-4 w-4" />}
          loading={loading && !preposition}
        />
        <KpiCard
          label="Total Cost"
          value={preposition ? fmtMoney(preposition.totalCost) : "—"}
          sub="fixed + variable"
          delta={costDelta}
          accent="amber"
          icon={<Gauge className="h-4 w-4" />}
          loading={loading && !preposition}
        />
        <KpiCard
          label="CO₂"
          value={routing ? `${routing.totalCarbonKg.toLocaleString()}kg` : "—"}
          sub={`${routing?.totalDistanceKm.toLocaleString() ?? 0} km`}
          accent="cyan"
          icon={<Leaf className="h-4 w-4" />}
          loading={loading && !routing}
        />
      </div>

      {/* Time slider — T+0h to T+72h, filters visible routes */}
      {routing && (
        <div className="mb-4 flex items-center gap-4 border border-border bg-card px-4 py-2.5">
          <div className="flex shrink-0 items-center gap-2">
            <Clock className="h-3.5 w-3.5" style={{ color: "var(--oxblood)" }} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Time Elapsed</span>
          </div>
          <div className="flex flex-1 items-center gap-3">
            <input
              type="range"
              min={0}
              max={72}
              step={1}
              value={timeFilter}
              onChange={(e) => setTimeFilter(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--oxblood)]"
              style={{ accentColor: "var(--oxblood)" }}
            />
            <span className="w-16 shrink-0 text-right font-mono text-sm font-bold tabular-nums" style={{ color: "var(--oxblood)" }}>
              T+{timeFilter}h
            </span>
          </div>
          <div className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:block">
            {routing.routes.filter((r) => r.durationH <= timeFilter).length}/{routing.routes.length} routes shown
          </div>
        </div>
      )}

      {/* Main layout: map dominant + right sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Map — the hero element, takes most space */}
        <div className="space-y-4">
          {/* Map container — tall and dominant. Overlays use z-[1000+] to stay above Leaflet panes (max z=800) */}
          <div className="relative h-[65vh] overflow-hidden border border-border bg-card sm:h-[70vh] lg:h-[calc(100vh-14rem)]">
            <OrionMap instance={instance} preposition={preposition} routing={routing} selectedScenarioId={selectedScenarioId} timeFilter={timeFilter} />

            {/* Title chip — top left, above all map panes */}
            <div className="pointer-events-none absolute left-3 top-3 z-[1000] hidden sm:block">
              <div className="border border-border bg-card px-3 py-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-3 w-3" style={{ color: "var(--oxblood)" }} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-foreground">
                    {instance.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Legend — bottom right, comprehensive marker guide */}
            <div className="absolute bottom-3 right-3 z-[1000] max-w-[calc(100vw-1.5rem)]">
              <div className="border border-border bg-card/95 px-3 py-2.5 shadow-md backdrop-blur-sm">
                <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  Map Legend
                </div>
                <div className="space-y-1 font-mono text-[10px]">
                  <LegendItem color="#2f6b4f" label="Open Warehouse" shape="diamond-filled" />
                  <LegendItem color="#9b2c2c" label="Candidate (unused)" shape="diamond-outline" />
                  <LegendItem color="#9b2c2c" label="Critical unmet demand" shape="circle" />
                  <LegendItem color="#b45309" label="High priority demand" shape="circle" />
                  <LegendItem color="#1f5a6b" label="Medium priority demand" shape="circle" />
                  <LegendItem color="#2f6b4f" label="Active relief route" shape="line" />
                </div>
              </div>
            </div>

            {/* Scenario selector — top right, above all map panes */}
            <div className="absolute right-3 top-3 z-[1000] w-44 sm:w-56">
              <Select value={selectedScenarioId ?? undefined} onValueChange={setSelectedScenario}>
                <SelectTrigger className="h-10 w-full border-foreground/30 bg-card font-mono text-xs shadow-md">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-bold" style={{ color: "var(--oxblood)" }}>SCN</span>
                    <span className="truncate font-semibold text-foreground">
                      {selectedScenarioId ?? "—"}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent className="z-[2000]">
                  {instance.scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="font-mono text-[11px]">
                      {s.id} · {s.label} (p={s.prob.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Idle overlay */}
            {status === "idle" && (
              <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-background/85 backdrop-blur-sm">
                <div className="max-w-sm text-center">
                  <CloudOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="mb-1 font-[var(--font-display)] text-lg font-semibold">Awaiting optimization</p>
                  <p className="mb-4 font-mono text-[11px] text-muted-foreground">
                    Run the stochastic MIP to populate the map with optimal warehouses and relief routes
                  </p>
                  <button
                    onClick={runOptimizer}
                    className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 font-mono text-xs font-semibold text-background transition-colors hover:bg-oxblood"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run Optimizer →
                  </button>
                </div>
              </div>
            )}

            {/* Running indicator */}
            {status === "running" && (
              <div className="pointer-events-none absolute right-3 bottom-3 z-[1000]">
                <div className="flex items-center gap-2 border border-border bg-card px-3 py-2">
                  <span className="h-2 w-2 rounded-full orion-blink" style={{ backgroundColor: "var(--oxblood)" }} />
                  <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--oxblood)" }}>
                    Solver running…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Below map: open warehouses + routes side by side */}
          {preposition && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Open warehouses */}
              <Card className="orion-card p-3">
                <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-3.5 w-3.5" style={{ color: "var(--forest)" }} />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Open Warehouses
                    </span>
                  </div>
                  <span className="font-mono text-[10px] tabular" style={{ color: "var(--forest)" }}>
                    {preposition.openSites.length}/{instance.warehouses.length}
                  </span>
                </div>
                <ScrollArea className="max-h-40 scroll-thin">
                  <div className="space-y-1.5">
                    {preposition.openSites.map((o) => {
                      const w = instance.warehouses.find((x) => x.id === o.warehouseId)!;
                      const pct = (o.inventory / w.capacity) * 100;
                      return (
                        <div key={o.warehouseId} className="border border-border bg-card p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-mono text-[11px] font-semibold">{w.name}</div>
                              <div className="font-mono text-[9px] text-muted-foreground">
                                {w.id} · ${w.fixedCost}K fixed
                              </div>
                            </div>
                            <div className="text-right font-mono text-[11px] tabular" style={{ color: "var(--forest)" }}>
                              {o.inventory.toFixed(0)}t
                              <div className="text-[9px] text-muted-foreground">/{w.capacity}t</div>
                            </div>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "var(--forest)" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>

              {/* Relief routes */}
              {routing && (
                <Card className="orion-card p-3">
                  <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5" style={{ color: "var(--oxblood)" }} />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Relief Routes
                      </span>
                    </div>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <Activity className="h-3 w-3" style={{ color: "var(--forest)" }} />
                      {routing.routes.length} active
                    </span>
                  </div>
                  <ScrollArea className="max-h-40 scroll-thin">
                    <div className="space-y-1">
                      {routing.routes.map((r, i) => {
                        const color = ["#9b2c2c", "#2f6b4f", "#1f5a6b", "#b45309", "#7c2d12", "#374151", "#365314", "#831843"][i % 8];
                        return (
                          <div key={r.id} className="flex items-center gap-2 border border-border bg-card px-2 py-1.5">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[9px] font-bold" style={{ background: `${color}1a`, color }}>
                              {i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-mono text-[10px] font-semibold">
                                {r.warehouseId} → {r.stops.length} stops
                              </div>
                              <div className="font-mono text-[9px] text-muted-foreground">
                                {r.distanceKm}km · {r.durationH}h · {r.carbonKg}kg
                              </div>
                            </div>
                            <div className="text-right font-mono text-[10px] tabular" style={{ color: "var(--forest)" }}>
                              {r.loadTons}t
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </div>
          )}

          {/* Mathematical formulation — collapsible */}
          <FormulationPanel />
        </div>

        {/* Right sidebar — scenario control + solver log (fills remaining height) */}
        <div className="flex flex-col gap-4 lg:h-[calc(100vh-14rem)]">
          <Card className="orion-card shrink-0 p-4">
            <ScenarioControl compact />
          </Card>

          {/* Solver log — fills all remaining vertical space */}
          <div className="min-h-0 flex-1">
            <SolverLog />
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, shape }: { color: string; label: string; shape: "diamond-filled" | "diamond-outline" | "circle" | "line" }) {
  return (
    <div className="flex items-center gap-2">
      {shape === "diamond-filled" && (
        <span
          className="inline-block h-2.5 w-2.5"
          style={{ background: color, transform: "rotate(45deg)" }}
        />
      )}
      {shape === "diamond-outline" && (
        <span
          className="inline-block h-2.5 w-2.5"
          style={{ background: "none", border: `1.5px solid ${color}`, transform: "rotate(45deg)" }}
        />
      )}
      {shape === "circle" && (
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: color, opacity: 0.8 }}
        />
      )}
      {shape === "line" && (
        <svg width="20" height="6" className="inline-block">
          <line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="2.5" strokeDasharray="4 3" />
        </svg>
      )}
      <span className="text-foreground/80">{label}</span>
    </div>
  );
}
