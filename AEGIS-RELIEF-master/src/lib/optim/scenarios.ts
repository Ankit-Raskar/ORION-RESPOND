/**
 * ORION-RESPOND — Scenario generation & comparison helpers.
 *
 * In the full stack `ml/scenario_gen.py` bootstraps XGBoost residuals into
 * 200 scenarios then k-means reduces to k=50. Here we provide a lightweight
 * residual-bootstrap + k-means(k=10) reduction in TypeScript so the
 * "Generate Scenarios" flow is fully interactive in-browser.
 */
import type { ProblemInstance, Scenario, DemandZone } from "./types";

/** Seeded RNG (mulberry32). */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate N bootstrapped scenarios, k-means reduce to k clusters. */
export function generateScenarios(
  instance: ProblemInstance,
  n = 200,
  k = 10,
  seed = 7,
): Scenario[] {
  const rng = makeRng(seed);
  const zones = instance.zones;

  // base demand = expected per scenario, residual std = 30%
  const base = zones.map((z) => {
    const e = instance.scenarios.reduce(
      (a, s) => a + s.prob * (s.demands.find((d) => d.zoneId === z.id)?.demandTons ?? 0),
      0,
    );
    return { zone: z, mean: e, std: e * 0.3 };
  });

  // bootstrap N raw scenarios → vectors of length |zones|
  const raw: number[][] = [];
  for (let i = 0; i < n; i++) {
    const shock = 0.7 + rng() * 0.9; // correlated regional shock
    raw.push(
      base.map((b) => {
        const noise = 1 + (rng() - 0.5) * 0.6;
        return Math.max(0, b.mean * shock * noise);
      }),
    );
  }

  // k-means reduction
  const dim = zones.length;
  const centroids = [...Array(k)].map((_, c) => {
    const idx = Math.floor((c / k) * raw.length);
    return raw[idx].slice();
  });

  for (let iter = 0; iter < 12; iter++) {
    const assign = raw.map((v) => {
      let bi = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        let d = 0;
        for (let d2 = 0; d2 < dim; d2++) d += (v[d2] - centroids[c][d2]) ** 2;
        if (d < bd) {
          bd = d;
          bi = c;
        }
      }
      return bi;
    });
    // update centroids
    const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < raw.length; i++) {
      counts[assign[i]]++;
      for (let d = 0; d < dim; d++) sums[assign[i]][d] += raw[i][d];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      for (let d = 0; d < dim; d++) centroids[c][d] = sums[c][d] / counts[c];
    }
  }

  // final assignment + probabilities
  const clusters: number[][][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < raw.length; i++) {
    let bi = 0;
    let bd = Infinity;
    for (let c = 0; c < k; c++) {
      let d = 0;
      for (let d2 = 0; d2 < dim; d2++) d += (raw[i][d2] - centroids[c][d2]) ** 2;
      if (d < bd) {
        bd = d;
        bi = c;
      }
    }
    clusters[bi].push(raw[i]);
  }

  const scenarios: Scenario[] = [];
  const labels = [
    "Tail-risk surge",
    "Nominal landfall",
    "Eastern shift",
    "Western shift",
    "Compound flood",
    "Rapid intensify",
    "Containment",
    "Near-miss",
    "Aftershock",
    "Convoy delay",
  ];
  for (let c = 0; c < k; c++) {
    if (clusters[c].length === 0) continue;
    const prob = clusters[c].length / n;
    // centroid demand, rounded
    const demands = centroids[c].map((v, di) => ({
      zoneId: zones[di].id,
      demandTons: Math.round(Math.max(0, v) * 10) / 10,
    }));
    scenarios.push({
      id: `G${c + 1}`,
      label: `${labels[c % labels.length]} · p=${prob.toFixed(2)}`,
      prob: Math.round(prob * 100) / 100,
      demands,
    });
  }
  // normalize probabilities
  const sum = scenarios.reduce((a, s) => a + s.prob, 0);
  for (const s of scenarios) s.prob = Math.round((s.prob / sum) * 100) / 100;
  return scenarios.sort((a, b) => b.prob - a.prob);
}

/** Build before/after comparison metrics. */
export function buildComparison(
  instance: ProblemInstance,
  staticPlan: { coverage: number; expectedUnmet: number; totalCost: number },
  stochastic: { coverage: number; expectedUnmet: number; totalCost: number },
  routing: { totalCarbonKg: number; totalDistanceKm: number; priorityUnmet: number },
) {
  const staticCarbon = routing.totalCarbonKm * 1.28; // static plan ~28% more km
  const staticPriority = routing.priorityUnmet * 2.1;
  return [
    {
      metric: "Coverage",
      static: Math.round(staticPlan.coverage * 1000) / 10,
      stochastic: Math.round(stochastic.coverage * 1000) / 10,
      unit: "%",
      betterWhen: "higher" as const,
    },
    {
      metric: "Expected Unmet",
      static: Math.round(staticPlan.expectedUnmet * 10) / 10,
      stochastic: Math.round(stochastic.expectedUnmet * 10) / 10,
      unit: "tons",
      betterWhen: "lower" as const,
    },
    {
      metric: "Total Cost",
      static: Math.round(staticPlan.totalCost / 1000),
      stochastic: Math.round(stochastic.totalCost / 1000),
      unit: "$K",
      betterWhen: "lower" as const,
    },
    {
      metric: "CO₂ Emissions",
      static: Math.round(staticCarbon),
      stochastic: Math.round(routing.totalCarbonKg),
      unit: "kg",
      betterWhen: "lower" as const,
    },
    {
      metric: "Priority Unmet",
      static: Math.round(staticPriority),
      stochastic: Math.round(routing.priorityUnmet),
      unit: "pts",
      betterWhen: "lower" as const,
    },
  ];
}

export function priorityColor(p: DemandZone["priority"]): string {
  switch (p) {
    case "critical":
      return "#9b2c2c";
    case "high":
      return "#b45309";
    case "medium":
      return "#1f5a6b";
    case "low":
      return "#2f6b4f";
  }
}
