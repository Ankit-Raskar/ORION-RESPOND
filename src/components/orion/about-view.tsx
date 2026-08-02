"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Cpu,
  Database,
  GitBranch,
  Network,
  Workflow,
} from "lucide-react";

const CITATIONS = [
  "FEMA Disaster Declarations Summary (2014–2024) — Disaster Declarations REST API v2.",
  "NOAA NCEI Storm Events Database — hurricane, flood, severe storm events.",
  "USGS Earthquake Catalog & ShakeMap — magnitude, depth, ground motion.",
  "WorldPop — high-resolution population rasters for affected-zone estimation.",
  "OpenStreetMap / osmnx — road network shortest-path distance matrices.",
  "EM-DAT — International Disaster Database (CRED).",
  "Birge, J.R. & Louveaux, F. (2011). Introduction to Stochastic Programming, 2nd ed. Springer.",
  "Santoso, T., Ahmed, S., Goetschalckx, M., & Shapiro, A. (2005). A stochastic programming approach for supply chain network design under uncertainty. EJOR, 170(1).",
  "Clarke, G. & Wright, J.W. (1964). Scheduling of vehicles from a central depot to a number of delivery points. Operations Research, 12(4).",
  "Schulman, J. et al. (2017). Proximal Policy Optimization Algorithms. arXiv:1707.06347.",
];

const STACK = [
  { group: "Optimization", items: ["Pyomo", "Gurobi", "HiGHS", "OR-Tools CP-SAT", "OR-Tools VRP"] },
  { group: "Machine Learning", items: ["XGBoost", "LightGBM", "PyTorch LSTM", "Stable-Baselines3 PPO", "scikit-learn"] },
  { group: "Data", items: ["Polars", "osmnx", "networkx", "geopandas", "rasterio"] },
  { group: "Backend", items: ["FastAPI", "Pydantic v2", "Celery", "Redis", "PostgreSQL+PostGIS"] },
  { group: "Frontend", items: ["Next.js 16", "TypeScript", "Tailwind CSS", "shadcn/ui", "Leaflet", "Recharts"] },
  { group: "Infra", items: ["Docker Compose", "GitHub Actions", "Poetry", "Zustand", "React Query"] },
];

export function AboutView() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-10">
        <div className="mb-3 flex items-baseline gap-3 border-b border-border pb-3">
          <span className="orion-section-mark text-2xl">§ 05</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Technical Documentation
          </span>
        </div>
        <h1 className="text-fluid-h1 font-[var(--font-display)] font-medium">
          Methodology &{" "}
          <span className="font-[var(--font-display)] italic font-normal" style={{ color: "var(--oxblood)" }}>
            architecture
          </span>
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-foreground/70 sm:text-base">
          ORION-RESPOND fuses three operations-research disciplines into a single
          decision pipeline. This page documents the models, the data sources,
          and the system architecture for reproducibility.
        </p>
      </div>

      {/* Architecture diagram (mermaid-style ASCII rendered as styled blocks) */}
      <Card className="mb-6 orion-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Network className="h-4 w-4 text-foreground" />
          <h2 className="font-[var(--font-display)] text-base font-bold">System architecture</h2>
        </div>
        <div className="space-y-2 font-mono text-[11px] leading-relaxed">
          <ArchLayer
            label="DATA LAYER"
            icon={<Database className="h-3.5 w-3.5" />}
            nodes={["FEMA", "NOAA", "USGS", "WorldPop", "OSM"]}
            color="text-foreground border-cyan-500/30"
          />
          <Arrow />
          <ArchLayer
            label="ML LAYER"
            icon={<Cpu className="h-3.5 w-3.5" />}
            nodes={["XGBoost demand forecast", "Bootstrap + k-means scenarios", "LSTM event probability"]}
            color="text-foreground border-amber-500/30"
          />
          <Arrow />
          <ArchLayer
            label="OPTIM LAYER"
            icon={<Workflow className="h-3.5 w-3.5" />}
            nodes={["Two-stage stochastic MIP", "CVRPTW + carbon", "PPO re-opt policy"]}
            color="text-foreground border-emerald-500/30"
          />
          <Arrow />
          <ArchLayer
            label="SERVICES"
            icon={<GitBranch className="h-3.5 w-3.5" />}
            nodes={["FastAPI", "Celery worker", "Redis", "PostgreSQL+PostGIS", "WebSocket stream"]}
            color="text-foreground border-purple-500/30"
          />
          <Arrow />
          <ArchLayer
            label="FRONTEND"
            icon={<Network className="h-3.5 w-3.5" />}
            nodes={["Next.js RSC", "Leaflet map", "Recharts KPIs", "React Query", "Live solver stream"]}
            color="text-foreground border-amber-500/30"
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Models */}
        <Card className="orion-card p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-foreground" />
            <h2 className="font-[var(--font-display)] text-base font-bold">The three models</h2>
          </div>

          <div className="space-y-4">
            <ModelDoc
              n="01"
              title="Two-stage stochastic MIP"
              formula="min  Σᵢ fᵢyᵢ + Σᵢ cᵢIᵢ + Σₛ pₛ[Σᵢⱼ tᵢⱼzᵢⱼₛ + MΣⱼ unmetⱼₛ]"
              body="First-stage: open warehouses y (binary) and stock inventory I (continuous). Second-stage: per-scenario shipments z and unmet shortfall. Linking constraint Iᵢ ≤ Capᵢ·yᵢ couples stages. Solved by subset enumeration over open-sets + exact min-cost-flow transportation per scenario + marginal inventory ascent."
              tags={["Pyomo", "Gurobi", "HiGHS fallback"]}
            />
            <ModelDoc
              n="02"
              title="CVRPTW with carbon dimension"
              formula="lexmin  (priority-unmet,  Σ time,  Σ carbon)"
              body="Multi-depot relief routing. Capacity (5t trucks), time-windows from zone priority, carbon = distance × load × 0.62 kg CO₂/km. Clarke-Wright savings construction + 2-opt/Or-opt local search. PATH_CHEAPEST_ARC + GUIDED_LOCAL_SEARCH in the OR-Tools build."
              tags={["OR-Tools", "Clarke-Wright", "2-opt"]}
            />
            <ModelDoc
              n="03"
              title="PPO re-optimization policy"
              formula="reward = −α·unmet − β·cost − γ·CO₂"
              body="Gymnasium env wraps the router. State = (demand, inventory, fleet_status, time, entropy). Actions = {HOLD, RE-OPTIMIZE, ADD_TRUCK, REROUTE}. PPO trained 200k steps; evaluated vs static and periodic-12h on 20 held-out scenarios."
              tags={["Stable-Baselines3", "Gymnasium", "PPO"]}
            />
          </div>
        </Card>

        {/* Stack + judging */}
        <div className="space-y-6">
          <Card className="orion-card p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-foreground" />
              <h2 className="font-[var(--font-display)] text-base font-bold">Technology stack</h2>
            </div>
            <div className="space-y-3">
              {STACK.map((g) => (
                <div key={g.group}>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {g.group}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((it) => (
                      <Badge key={it} variant="outline" className="font-mono text-[10px]">
                        {it}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="orion-card p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-foreground" />
              <h2 className="font-[var(--font-display)] text-base font-bold">Judging criteria</h2>
            </div>
            <div className="space-y-2">
              {[
                ["Innovation", 25],
                ["Technical Excellence", 25],
                ["Real-World Impact", 20],
                ["UX", 15],
                ["Presentation", 15],
              ].map(([label, pct]) => (
                <div key={label as string} className="flex items-center gap-3">
                  <span className="w-40 font-mono text-[11px]">{label as string}</span>
                  <div className="h-2 flex-1 overflow-hidden bg-secondary">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, backgroundColor: "var(--oxblood)" }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px]" style={{ color: "var(--oxblood)" }}>{pct as number}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Citations */}
      <Card className="mt-6 orion-card p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-foreground" />
          <h2 className="font-[var(--font-display)] text-base font-bold">Citations & data sources</h2>
        </div>
        <ol className="space-y-1.5">
          {CITATIONS.map((c, i) => (
            <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-mono text-foreground">[{i + 1}]</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 font-mono text-[10px] text-muted-foreground/70">
          MIT License · ORION-RESPOND © 2026 · Built for the Orion Global Hackathon
        </p>
      </Card>
    </div>
  );
}

function ArchLayer({
  label,
  icon,
  nodes,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  nodes: string[];
  color: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border ${color} bg-background/40 px-3 py-2`}>
      <span className={`flex items-center gap-1.5 font-bold ${color.split(" ")[0]}`}>
        {icon}
        {label}
      </span>
      <span className="text-muted-foreground">→</span>
      {nodes.map((n) => (
        <span key={n} className="rounded border border-border/60 bg-card px-2 py-0.5 text-foreground/80">
          {n}
        </span>
      ))}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center">
      <span className="text-muted-foreground/50">↓</span>
    </div>
  );
}

function ModelDoc({
  n,
  title,
  formula,
  body,
  tags,
}: {
  n: string;
  title: string;
  formula: string;
  body: string;
  tags: string[];
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/30 p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-black text-foreground">{n}</span>
        <h3 className="font-mono text-xs font-bold">{title}</h3>
      </div>
      <pre className="mt-2 overflow-x-auto rounded bg-background/60 p-2 font-mono text-[10px] text-emerald-300">
        {formula}
      </pre>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {tags.map((t) => (
          <Badge key={t} variant="outline" className="font-mono text-[9px]">
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}
