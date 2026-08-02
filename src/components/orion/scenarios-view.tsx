"use client";
import { useOrion } from "@/lib/store";
import { generateScenarios, priorityColor } from "@/lib/optim/scenarios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell as RCell,
} from "recharts";
import { Dices, Layers3, MapPin, Sparkles, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtTons } from "@/lib/optim/geo";

export function ScenariosView() {
  const instance = useOrion((s) => s.instance);
  const selectedScenarioId = useOrion((s) => s.selectedScenarioId);
  const setSelectedScenario = useOrion((s) => s.setSelectedScenario);
  const setView = useOrion((s) => s.setView);
  const [generated, setGenerated] = useState(false);

  const scenarios = useMemo(
    () => (generated ? generateScenarios(instance, 200, 10) : instance.scenarios),
    [generated, instance],
  );

  const selected = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];

  const chartData = useMemo(() => {
    if (!selected) return [];
    return instance.zones.map((z) => ({
      zone: z.id,
      demand: selected.demands.find((d) => d.zoneId === z.id)?.demandTons ?? 0,
      priority: z.priority,
    }));
  }, [selected, instance.zones]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="mb-2 flex items-baseline gap-3">
            <span className="orion-section-mark text-2xl">§ 05</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Demand Uncertainty
            </span>
          </div>
          <h1 className="text-fluid-h1 font-[var(--font-display)] font-medium">
            Scenario{" "}
            <span className="font-[var(--font-display)] italic font-normal" style={{ color: "var(--oxblood)" }}>
              explorer
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/70">
            {generated
              ? "200 bootstrapped scenarios → k-means(k=10) reduction. Same algorithm as ml/scenario_gen.py."
              : "The bundled reduced scenario set for this instance. Generate fresh to see the full pipeline."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border bg-card"
            onClick={() => setGenerated((g) => !g)}
          >
            <Dices className="h-4 w-4" />
            {generated ? "Show bundled set" : "Generate scenarios"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border bg-card"
            disabled
            title="CSV upload of zones/demand (POST /scenarios/upload in full stack)"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Scenario list */}
        <Card className="orion-card p-3">
          <div className="mb-2 flex items-center gap-2 border-b border-border px-1 pb-2">
            <Layers3 className="h-3.5 w-3.5" style={{ color: "var(--oxblood)" }} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Scenarios ({scenarios.length})
            </span>
          </div>
          <ScrollArea className="h-[60vh] scroll-thin">
            <div className="space-y-1.5 pr-1">
              {scenarios.map((s) => {
                const total = s.demands.reduce((a, d) => a + d.demandTons, 0);
                const isSel = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s.id)}
                    className={`w-full rounded border px-2.5 py-2 text-left transition-colors ${
                      isSel
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-border/50 bg-background/30 hover:border-border hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold">
                        {s.id}
                      </span>
                      <Badge variant="outline" className="font-mono text-[9px]">
                        p={s.prob.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {s.label}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${Math.min(100, (total / 200) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {fmtTons(total)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* Selected scenario detail */}
        <div className="space-y-4">
          {selected && (
            <>
              <Card className="orion-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <h2 className="font-mono text-base font-bold">
                        {selected.id} · {selected.label}
                      </h2>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      probability {selected.prob.toFixed(3)} · {selected.demands.length} zones · total{" "}
                      {fmtTons(selected.demands.reduce((a, d) => a + d.demandTons, 0))}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setSelectedScenario(selected.id);
                      setView("map");
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                    View on Map
                  </Button>
                </div>
              </Card>

              <Card className="orion-card p-5 sm:p-6">
                <h3 className="mb-1 font-mono text-sm font-bold">Per-zone demand</h3>
                <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Relief tons required by zone, colored by priority
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "monospace" }} />
                    <YAxis
                      type="category"
                      dataKey="zone"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "monospace" }}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--foreground)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                      itemStyle={{ color: "var(--foreground)" }}
                    />
                    <Bar dataKey="demand" radius={[0, 4, 4, 0]}>
                      {chartData.map((d, i) => (
                        <RCell key={i} fill={priorityColor(d.priority as "critical")} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
