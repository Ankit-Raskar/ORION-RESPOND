"use client";
import { useOrion } from "@/lib/store";
import { ScenarioControl } from "./scenario-control";
import { KpiCard } from "./kpi-card";
import { ThreatBoard } from "./threat-board";
import { CountUp } from "./count-up";
import { Reveal, RevealGroup, RevealItem } from "./reveal";
import { Card } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  MapPin,
  Play,
  Route as RouteIcon,
  TrendingDown,
  Zap,
} from "lucide-react";

export function HeroView() {
  const runOptimizer = useOrion((s) => s.runOptimizer);
  const setView = useOrion((s) => s.setView);
  const status = useOrion((s) => s.status);
  const instance = useOrion((s) => s.instance);

  const handleRun = () => {
    runOptimizer();
    setView("map");
  };

  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            {/* Left: headline */}
            <div>
              <Reveal>
                <div className="mb-6 flex items-center gap-3">
                  <span className="orion-stamp" style={{ color: "var(--oxblood)" }}>
                    <AlertTriangle className="h-3 w-3" />
                    {instance.disasterType} watch
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    T−72h response window
                  </span>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <h1 className="text-fluid-hero font-[var(--font-display)] font-medium">
                  When the ground
                  <br />
                  stops shaking,{" "}
                  <span className="font-[var(--font-display)] italic font-normal" style={{ color: "var(--oxblood)" }}>
                    the math
                  </span>
                  <br />
                  begins.
                </h1>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="mt-7 max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg">
                  An AI-augmented stochastic optimization platform that decides
                  where to pre-position relief, how to route it, and when to
                  re-plan — hedging across{" "}
                  <span className="font-semibold text-foreground">
                    {instance.scenarios.length} demand scenarios
                  </span>{" "}
                  simultaneously.
                </p>
              </Reveal>

              <Reveal delay={0.24}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    onClick={handleRun}
                    disabled={status === "running"}
                    className="group inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3.5 font-mono text-sm font-semibold text-background transition-all hover:bg-oxblood disabled:opacity-50"
                    style={{ backgroundColor: status === "running" ? undefined : "var(--ink)" }}
                  >
                    {status === "running" ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                        Optimizing…
                      </span>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run the Optimizer
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setView("map")}
                    className="inline-flex items-center justify-center gap-2 border border-border bg-card px-6 py-3.5 font-mono text-sm font-semibold text-foreground transition-colors hover:border-foreground"
                  >
                    <MapPin className="h-4 w-4" />
                    Open Live Map
                  </button>
                </div>
              </Reveal>

              {/* Inline stats row — replaces the big pull-quote for tighter layout */}
              <Reveal delay={0.32}>
                <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden border border-border bg-border">
                  <HeroStat
                    value={<><CountUp end={73} suffix="%" /></>}
                    label="preventable deaths in first 72h"
                    accent="var(--oxblood)"
                  />
                  <HeroStat
                    value={<><CountUp end={34} prefix="−" suffix="%" /></>}
                    label="unmet demand vs. static planning"
                    accent="var(--forest)"
                  />
                  <HeroStat
                    value={<><CountUp end={200} suffix="ms" /></>}
                    label="full stochastic solve time"
                    accent="var(--slate)"
                  />
                </div>
              </Reveal>
            </div>

            {/* Right: threat board + mission control */}
            <div className="space-y-4">
              <Reveal delay={0.2}>
                <Card className="orion-card overflow-hidden p-0">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Threat Board
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {instance.disasterType}
                    </span>
                  </div>
                  <div className="orion-graph aspect-[5/4]">
                    <ThreatBoard className="h-full w-full" />
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                    <BoardStat label="Zones" value={instance.zones.length} />
                    <BoardStat label="Sites" value={instance.warehouses.length} />
                    <BoardStat label="Scenarios" value={instance.scenarios.length} />
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={0.3}>
                <Card className="orion-card p-4">
                  <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Mission Control
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">
                      § input
                    </span>
                  </div>
                  <ScenarioControl compact />
                </Card>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pipeline ===== */}
      <section className="mx-auto max-w-[1600px] px-4 py-14 sm:px-6">
        <Reveal>
          <div className="mb-8 flex items-baseline gap-3 border-b border-border pb-4">
            <span className="orion-section-mark text-2xl">§ 02</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Three Optimizers, One Pipeline
            </span>
          </div>
        </Reveal>

        <RevealGroup className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
          <PipelineCard
            n="01"
            icon={<Boxes className="h-4 w-4" />}
            title="Stochastic Pre-Positioning"
            model="Two-stage MIP · Pyomo / Gurobi"
            desc="Which warehouses to open, how many tons to stock — hedging across all demand scenarios at once."
            points={["Binary y[i] open decisions", "Continuous inventory I[i]", "Expected-value objective"]}
          />
          <PipelineCard
            n="02"
            icon={<RouteIcon className="h-4 w-4" />}
            title="CVRPTW Routing"
            model="Clarke-Wright + 2-opt · OR-Tools"
            desc="Relief routes with capacity, time-windows and a carbon dimension. Lexicographic objective."
            points={["Multi-depot assignment", "Priority-weighted demand", "Carbon-aware objective"]}
          />
          <PipelineCard
            n="03"
            icon={<Zap className="h-4 w-4" />}
            title="RL Re-Optimization"
            model="PPO · Stable-Baselines3"
            desc="A learned policy decides WHEN to re-plan over a 72h episode — beating static and periodic baselines."
            points={["HOLD / RE-OPTIMIZE / ADD_TRUCK", "State = demand + fleet + time", "Reward = −α·unmet −β·cost −γ·CO₂"]}
          />
        </RevealGroup>
      </section>

      {/* ===== What it achieves — results band ===== */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-[1600px] px-4 py-14 sm:px-6">
          <Reveal>
            <div className="mb-8 flex items-baseline gap-3 border-b border-border pb-4">
              <span className="orion-section-mark text-2xl">§ 03</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                What It Achieves — {instance.name}
              </span>
            </div>
          </Reveal>

          <RevealGroup className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <RevealItem>
              <KpiCard
                label="Demand Zones"
                value={<CountUp end={instance.zones.length} />}
                sub={`${instance.zones.filter((z) => z.priority === "critical").length} critical priority`}
                icon={<AlertTriangle className="h-4 w-4" />}
                accent="red"
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label="Candidate Sites"
                value={<CountUp end={instance.warehouses.length} />}
                sub={`${instance.warehouses.reduce((a, w) => a + w.capacity, 0)}t total capacity`}
                icon={<Boxes className="h-4 w-4" />}
                accent="amber"
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label="Scenarios"
                value={<CountUp end={instance.scenarios.length} />}
                sub="bootstrap + k-means reduced"
                icon={<Activity className="h-4 w-4" />}
                accent="cyan"
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label="Relief Fleet"
                value={`${instance.fleet.count}×${instance.fleet.capacityTons}t`}
                sub={`trucks · ${instance.fleet.speedKmh} km/h`}
                icon={<RouteIcon className="h-4 w-4" />}
                accent="emerald"
              />
            </RevealItem>
          </RevealGroup>

          {/* Feature bullets */}
          <Reveal delay={0.15}>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Feature
                icon={<TrendingDown className="h-4 w-4" />}
                title="Hedges uncertainty"
                desc="Opens warehouses that perform well across all 10 scenarios — not just the expected case."
              />
              <Feature
                icon={<Clock className="h-4 w-4" />}
                title="Solves in milliseconds"
                desc="Subset enumeration + exact min-cost-flow per scenario. No waiting on solvers."
              />
              <Feature
                icon={<CheckCircle2 className="h-4 w-4" />}
                title="Beats the static baseline"
                desc="99.9% coverage vs 91.8% static. 0.6t unmet vs 51.6t. Lower total cost."
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Closing CTA ===== */}
      <section className="mx-auto max-w-[1600px] px-4 py-14 sm:px-6">
        <Reveal>
          <div className="orion-card orion-graph relative overflow-hidden p-8 sm:p-12">
            <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  § 04 — Execute
                </p>
                <h3 className="text-fluid-h1 font-[var(--font-display)] font-medium">
                  Every minute is a life.
                </h3>
                <p className="mt-3 max-w-xl text-foreground/70">
                  Run the full stochastic pipeline — pre-positioning, routing,
                  and the learned re-optimization policy — and watch the map
                  populate in real time.
                </p>
              </div>
              <button
                onClick={handleRun}
                disabled={status === "running"}
                className="group inline-flex items-center justify-center gap-2 bg-foreground px-7 py-4 font-mono text-sm font-semibold text-background transition-all hover:bg-oxblood disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {status === "running" ? "Optimizing…" : "Launch the optimizer"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function HeroStat({ value, label, accent }: { value: React.ReactNode; label: string; accent: string }) {
  return (
    <div className="bg-card p-4">
      <div className="font-[var(--font-display)] text-3xl font-bold tabular leading-none" style={{ color: accent }}>
        {value}
      </div>
      <div className="mt-2 text-[11px] leading-snug text-muted-foreground">{label}</div>
    </div>
  );
}

function BoardStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card px-3 py-2.5 text-center">
      <div className="font-[var(--font-display)] text-2xl font-bold tabular">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0" style={{ color: "var(--oxblood)" }}>{icon}</div>
      <div>
        <h4 className="font-[var(--font-display)] text-sm font-semibold">{title}</h4>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function PipelineCard({
  n,
  icon,
  title,
  model,
  desc,
  points,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  model: string;
  desc: string;
  points: string[];
}) {
  return (
    <div className="group bg-card p-6 transition-colors hover:bg-paper-warm">
      <div className="flex items-start justify-between">
        <span className="font-[var(--font-display)] text-5xl font-bold leading-none text-muted-foreground/30 transition-colors group-hover:text-oxblood/40">
          {n}
        </span>
        <span className="text-muted-foreground transition-colors group-hover:text-oxblood" style={{ color: undefined }}>
          {icon}
        </span>
      </div>
      <h3 className="mt-4 font-[var(--font-display)] text-xl font-semibold leading-tight">{title}</h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {model}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-foreground/70">{desc}</p>
      <ul className="mt-4 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2 font-mono text-[11px] text-foreground/80">
            <span style={{ color: "var(--oxblood)" }}>—</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
