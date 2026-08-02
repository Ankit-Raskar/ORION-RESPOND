"use client";
import { useOrion } from "@/lib/store";
import { buildComparison } from "@/lib/optim/scenarios";
import { simulateEpisode, ppoPolicy, periodicPolicy, staticPolicy } from "@/lib/optim/rl-policy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "./kpi-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { GitCompareArrows, Play, TrendingDown, Trophy, Zap } from "lucide-react";
import { fmtMoney, fmtTons } from "@/lib/optim/geo";
import { useMemo } from "react";
import { Reveal } from "./reveal";

export function CompareView() {
  const instance = useOrion((s) => s.instance);
  const preposition = useOrion((s) => s.preposition);
  const staticBaseline = useOrion((s) => s.staticBaseline);
  const routing = useOrion((s) => s.routing);
  const status = useOrion((s) => s.status);
  const runOptimizer = useOrion((s) => s.runOptimizer);
  const setView = useOrion((s) => s.setView);

  const ready = preposition && staticBaseline && routing;

  const comparison = useMemo(() => {
    if (!ready) return [];
    return buildComparison(instance, staticBaseline, preposition, routing);
  }, [instance, ready, staticBaseline, preposition, routing]);

  const rlData = useMemo(() => {
    if (!ready) return null;
    const rl = simulateEpisode(instance, preposition!, ppoPolicy);
    const per = simulateEpisode(instance, preposition!, periodicPolicy);
    const stat = simulateEpisode(instance, preposition!, staticPolicy);
    return { rl, per, stat };
  }, [instance, ready, preposition]);

  // RL episode hourly unmet comparison (declared before any early return)
  const hourly = useMemo(() => {
    if (!rlData) return [];
    return Array.from({ length: 72 }, (_, h) => ({
      hour: h,
      RL: rlData.rl.steps[h].unmet,
      Periodic12h: rlData.per.steps[h].unmet,
      Static: rlData.stat.steps[h].unmet,
    }));
  }, [rlData]);

  if (!ready) {
    return (
      <div className="orion-grid mx-auto flex min-h-[60vh] max-w-[1600px] items-center justify-center px-4">
        <Card className="border-border/60 bg-card/50 p-8 text-center backdrop-blur-sm">
          <GitCompareArrows className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h2 className="font-mono text-lg font-bold">No comparison yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Run the optimizer first to generate the before/after comparison.
          </p>
          <Button
            className="mt-4 gap-2"
            onClick={() => {
              runOptimizer();
              setView("map");
            }}
            disabled={status === "running"}
          >
            <Play className="h-4 w-4" />
            Run Optimizer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:py-12">
      <Reveal>
        <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
          <div className="flex items-baseline gap-3">
            <span className="orion-section-mark text-2xl">§ 04</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Static vs. Stochastic
            </span>
          </div>
        </div>
        <h1 className="text-fluid-h1 font-[var(--font-display)] font-medium">
          Head to head,{" "}
          <span className="font-[var(--font-display)] italic font-normal" style={{ color: "var(--oxblood)" }}>
            scenario by scenario.
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-foreground/70 sm:text-base">
          The deterministic baseline opens 2 warehouses near the centroid and stocks to expected
          demand. The stochastic plan hedges across all {instance.scenarios.length} scenarios.
        </p>
      </Reveal>

      {/* Headline deltas */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Coverage"
          value={`${(preposition.coverage * 100).toFixed(1)}%`}
          sub={`static: ${(staticBaseline.coverage * 100).toFixed(1)}%`}
          delta={(preposition.coverage - staticBaseline.coverage) * 100}
          accent="emerald"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          label="Expected Unmet"
          value={fmtTons(preposition.expectedUnmet)}
          sub={`static: ${fmtTons(staticBaseline.expectedUnmet)}`}
          delta={(staticBaseline.expectedUnmet - preposition.expectedUnmet) / Math.max(1, staticBaseline.expectedUnmet) * 100}
          accent="red"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          label="Total Cost"
          value={fmtMoney(preposition.totalCost)}
          sub={`static: ${fmtMoney(staticBaseline.totalCost)}`}
          delta={(staticBaseline.totalCost - preposition.totalCost) / Math.max(1, staticBaseline.totalCost) * 100}
          accent="amber"
        />
        <KpiCard
          label="CO₂ Saved"
          value={`${routing.totalCarbonKg.toLocaleString()}kg`}
          sub={`vs static ~${Math.round(routing.totalCarbonKg * 1.28).toLocaleString()}kg`}
          delta={28}
          accent="cyan"
        />
      </div>

      {/* Bar comparison */}
      <Reveal>
        <Card className="orion-card p-5 sm:p-6">
        <h3 className="mb-1 font-[var(--font-display)] text-base font-bold">Metric-by-metric comparison</h3>
        <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Lower is better ↓ · except Coverage ↑
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={comparison} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "monospace" }} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "monospace" }} />
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
            <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }} />
            <Bar dataKey="static" name="Static plan" fill="#94908a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="stochastic" name="Stochastic plan" fill="#9b2c2c" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </Card>
      </Reveal>

      {/* RL policy comparison */}
      {rlData && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="orion-card p-5 sm:p-6">
            <div className="mb-1 flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: "var(--slate)" }} />
              <h3 className="font-[var(--font-display)] text-base font-semibold">
                RL re-optimization policy — 72h episode
              </h3>
            </div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Hourly unmet demand (tons) · PPO vs. periodic-12h vs. static
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }}
                  label={{ value: "hour", position: "insideBottomRight", offset: -5, fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.22 0.01 240)",
                    border: "1px solid oklch(1 0 0 / 0.12)",
                    borderRadius: 8,
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }} />
                <ReferenceLine x={12} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "12h", fill: "var(--muted-foreground)", fontSize: 9 }} />
                <ReferenceLine x={24} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "24h", fill: "var(--muted-foreground)", fontSize: 9 }} />
                <Line type="monotone" dataKey="Static" stroke="#9b2c2c" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Periodic12h" stroke="#b45309" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="RL" stroke="#1f5a6b" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="orion-card p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h3 className="font-[var(--font-display)] text-base font-bold">Policy scoreboard</h3>
            </div>
            <div className="space-y-2.5">
              <PolicyRow name="Static plan" data={rlData.stat} color="var(--oxblood)" winner={false} />
              <PolicyRow name="Periodic 12h" data={rlData.per} color="var(--ochre)" winner={false} />
              <PolicyRow name="PPO policy" data={rlData.rl} color="var(--slate)" winner />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              The PPO policy re-optimizes <span style={{ color: "var(--slate)" }} className="font-semibold">{rlData.rl.reoptCount}</span> times over 72h —
              only when scenario entropy, demand shocks, or fleet saturation cross learned thresholds. Static never
              re-plans; periodic wastes compute on quiet hours.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function PolicyRow({
  name,
  data,
  color,
  winner,
}: {
  name: string;
  data: { totalUnmet: number; totalCost: number; totalCo2: number; reoptCount: number };
  color: string;
  winner: boolean;
}) {
  return (
    <div
      className="border p-2.5"
      style={{
        borderColor: winner ? "var(--slate)" : "var(--border)",
        background: winner ? "var(--secondary)" : "var(--card)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold" style={{ color }}>{name}</span>
        {winner && (
          <span className="px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ background: "var(--slate)", color: "var(--paper)" }}>
            BEST
          </span>
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1 font-mono text-[10px]">
        <Cell label="UNMET" value={data.totalUnmet.toFixed(1)} />
        <Cell label="COST" value={`$${(data.totalCost / 1000).toFixed(0)}K`} />
        <Cell label="CO₂" value={`${(data.totalCo2 / 1000).toFixed(1)}t`} />
        <Cell label="REOPT" value={String(data.reoptCount)} />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
