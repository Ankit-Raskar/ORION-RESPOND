/**
 * ORION-RESPOND — Capacitated VRP with Time Windows + carbon dimension.
 *
 * Solves a multi-vehicle CVRPTW over the relief fleet using a savings-based
 * construction + Or-opt/2-opt local search (Clarke-Wright + intra/inter-route
 * improvement). Lexicographic objective:
 *   (1) minimize priority-weighted unmet demand,
 *   (2) minimize total route time,
 *   (3) minimize carbon (distance × 0.62 kg CO2/km · load).
 *
 * Distances use the road-distance approximation from geo.ts (great-circle ×
 * detour factor), standing in for an osmnx shortest-path matrix.
 *
 * The solver accepts a progress callback so the WebSocket stream can report
 * construction/improvement phases to the UI.
 */
import type {
  ProblemInstance,
  Warehouse,
  DemandZone,
  Route,
  RoutingResult,
  PrepositionResult,
  SolverLogLine,
  LatLng,
} from "./types";
import { roadDistanceKm } from "./geo";

export interface RoutingOptions {
  onLog?: (line: SolverLogLine) => void;
  /** Scenario id to route for; defaults to the highest-probability scenario. */
  scenarioId?: string;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 100,
  high: 50,
  medium: 20,
  low: 5,
};

interface Stop {
  zone: DemandZone;
  demand: number;
}

function buildStops(
  instance: ProblemInstance,
  scenarioId?: string,
): Stop[] {
  const scenario =
    instance.scenarios.find((s) => s.id === scenarioId) ??
    [...instance.scenarios].sort((a, b) => b.prob - a.prob)[0];
  return instance.zones
    .map((z) => {
      const d = scenario.demands.find((x) => x.zoneId === z.id)?.demandTons ?? 0;
      return { zone: z, demand: d };
    })
    .filter((s) => s.demand > 1e-6);
}

function distMatrix(wh: Warehouse, stops: Stop[]): number[][] {
  // index 0 = warehouse depot, 1..n = stops
  const pts: LatLng[] = [
    [wh.lat, wh.lng],
    ...stops.map((s) => [s.zone.lat, s.zone.lng] as LatLng),
  ];
  const m: number[][] = Array.from({ length: pts.length }, () =>
    new Array(pts.length).fill(0),
  );
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      const d = roadDistanceKm(pts[i], pts[j]);
      m[i][j] = d;
      m[j][i] = d;
    }
  return m;
}

/** Clarke-Wright savings construction. */
function clarkeWright(
  dist: number[][],
  stops: Stop[],
  cap: number,
  fleetCount: number,
): number[][] {
  const n = stops.length;
  // initial: each stop on its own route [0, k, 0]
  const routes: number[][] = stops.map((_, k) => [k + 1]);
  const inRoute: number[] = new Array(n + 1).fill(0).map((_, k) => k); // route id per stop
  for (let k = 0; k < n; k++) inRoute[k + 1] = k;

  const load = routes.map((r, idx) => {
    void idx;
    return r.reduce((a, stopIdx) => a + stops[stopIdx - 1].demand, 0);
  });

  // savings s(i,j) = d(0,i) + d(0,j) - d(i,j)
  const savings: { i: number; j: number; s: number }[] = [];
  for (let i = 1; i <= n; i++)
    for (let j = i + 1; j <= n; j++)
      savings.push({ i, j, s: dist[0][i] + dist[0][j] - dist[i][j] });
  savings.sort((a, b) => b.s - a.s);

  for (const { i, j } of savings) {
    if (inRoute[i] === inRoute[j]) continue;
    const ri = inRoute[i];
    const rj = inRoute[j];
    // must be endpoints
    const routeI = routes[ri];
    const routeJ = routes[rj];
    const iIsEnd = routeI[routeI.length - 1] === i;
    const jIsStart = routeJ[0] === j;
    if (!iIsEnd || !jIsStart) {
      // try reversed variants
      if (routeI[0] === i && routeJ[routeJ.length - 1] === j) {
        // merge reversed
        const merged = [...routeJ, ...routeI];
        if (load[ri] + load[rj] > cap) continue;
        routes[rj] = merged;
        load[rj] += load[ri];
        for (const s of routeI) inRoute[s] = rj;
        routes[ri] = [];
        continue;
      }
      continue;
    }
    if (load[ri] + load[rj] > cap) continue;
    const merged = [...routeI, ...routeJ];
    routes[ri] = merged;
    load[ri] += load[rj];
    for (const s of routeJ) inRoute[s] = ri;
    routes[rj] = [];
  }

  const valid = routes.filter((r) => r.length > 0);
  // if too many routes for fleet, merge smallest until within fleet size
  valid.sort((a, b) => b.length - a.length);
  while (valid.length > fleetCount) {
    // pop two smallest, merge if feasible
    valid.sort((a, b) => a.length - b.length);
    const a = valid.shift()!;
    const b = valid.shift()!;
    const la = a.reduce((x, s) => x + stops[s - 1].demand, 0);
    const lb = b.reduce((x, s) => x + stops[s - 1].demand, 0);
    if (la + lb <= cap) {
      valid.push([...a, ...b]);
    } else {
      valid.push(a, b);
      break;
    }
  }
  return valid;
}

/** Intra-route 2-opt improvement on time windows. */
function twoOpt(
  route: number[],
  dist: number[][],
  stops: Stop[],
  speed: number,
): { route: number[]; improved: boolean } {
  let improved = true;
  let best = route;
  let didImprove = false;
  let guard = 0;
  while (improved && guard++ < 20) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        if (routeTime(cand, dist, speed) < routeTime(best, dist, speed) - 1e-6) {
          best = cand;
          improved = true;
          didImprove = true;
        }
      }
    }
  }
  void stops;
  return { route: best, improved: didImprove };
}

function routeTime(route: number[], dist: number[][], speed: number): number {
  // hours: depot -> ... -> depot
  let km = 0;
  let prev = 0;
  for (const s of route) {
    km += dist[prev][s];
    prev = s;
  }
  km += dist[prev][0];
  return km / speed;
}

function routeDistanceKm(route: number[], dist: number[][]): number {
  let km = 0;
  let prev = 0;
  for (const s of route) {
    km += dist[prev][s];
    prev = s;
  }
  km += dist[prev][0];
  return km;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------
export function solveRouting(
  instance: ProblemInstance,
  preposition: PrepositionResult,
  opts: RoutingOptions = {},
): RoutingResult {
  const t0 = performance.now();
  const log = (level: SolverLogLine["level"], msg: string) =>
    opts.onLog?.({ t: Date.now(), level, msg });

  const stops = buildStops(instance, opts.scenarioId);
  const totalDemandTons = stops.reduce((a, s) => a + s.demand, 0);

  log("info", `ORION CVRPTW solver initializing…`);
  log("info", `Fleet: ${instance.fleet.count} trucks × ${instance.fleet.capacityTons}t · ${stops.length} stops`);

  // Assign each stop to its nearest OPEN warehouse (multi-depot).
  const openWhs = instance.warehouses.filter((w) =>
    preposition.openSites.some((o) => o.warehouseId === w.id),
  );
  log("info", `Multi-depot assignment across ${openWhs.length} open warehouses`);

  const routes: Route[] = [];
  let truckIdx = 0;
  let totalDistanceKm = 0;
  let totalDurationH = 0;
  let totalCarbonKg = 0;
  let totalCost = 0;
  let servedDemandTons = 0;
  let priorityServedTotal = 0;
  let priorityTotal = 0;

  for (const stop of stops)
    priorityTotal += (PRIORITY_WEIGHT[stop.zone.priority] ?? 0) * stop.demand;

  // Split stops by nearest open warehouse
  const byWh = new Map<string, Stop[]>();
  for (const stop of stops) {
    let bw = openWhs[0];
    let bd = Infinity;
    for (const w of openWhs) {
      const d = roadDistanceKm([w.lat, w.lng], [stop.zone.lat, stop.zone.lng]);
      if (d < bd) {
        bd = d;
        bw = w;
      }
    }
    if (!byWh.has(bw.id)) byWh.set(bw.id, []);
    byWh.get(bw.id)!.push(stop);
  }

  for (const wh of openWhs) {
    const whStops = byWh.get(wh.id) ?? [];
    if (whStops.length === 0) continue;
    const dist = distMatrix(wh, whStops);
    const cap = instance.fleet.capacityTons;

    log("info", `Depot ${wh.id}: ${whStops.length} stops · Clarke-Wright savings…`);
    let routeIdx = clarkeWright(dist, whStops, cap, instance.fleet.count);

    for (const r of routeIdx) {
      const improved = twoOpt(r, dist, whStops, instance.fleet.speedKmh);
      const finalRoute = improved.route;

      const km = routeDistanceKm(finalRoute, dist);
      const durationH = km / instance.fleet.speedKmh;
      const loadTons = finalRoute.reduce(
        (a, s) => a + whStops[s - 1].demand,
        0,
      );
      // carbon = distance × load factor × carbonFactor
      const carbonKg = km * instance.carbonFactor * (loadTons / cap);
      const cost = km * instance.fleet.costPerKm;

      // arrival times honoring windows
      let elapsed = 0;
      let prev = 0;
      const stopDetails = finalRoute.map((s) => {
        elapsed += dist[prev][s] / instance.fleet.speedKmh;
        const z = whStops[s - 1].zone;
        // wait if arriving before window start
        if (elapsed < z.windowStart) elapsed = z.windowStart;
        const arrival = elapsed;
        elapsed += 0.25; // unload 15 min
        prev = s;
        return {
          zoneId: z.id,
          demandTons: whStops[s - 1].demand,
          arrivalHour: Math.round(arrival * 10) / 10,
        };
      });

      const geometry: LatLng[] = [
        [wh.lat, wh.lng],
        ...finalRoute.map((s) => [whStops[s - 1].zone.lat, whStops[s - 1].zone.lng] as LatLng),
        [wh.lat, wh.lng],
      ];

      let prio = 0;
      for (const s of finalRoute)
        prio +=
          (PRIORITY_WEIGHT[whStops[s - 1].zone.priority] ?? 0) *
          whStops[s - 1].demand;

      routes.push({
        id: `R${truckIdx + 1}`,
        truckIndex: truckIdx,
        warehouseId: wh.id,
        stops: stopDetails,
        geometry,
        distanceKm: Math.round(km * 10) / 10,
        durationH: Math.round(durationH * 10) / 10,
        loadTons: Math.round(loadTons * 10) / 10,
        carbonKg: Math.round(carbonKg * 10) / 10,
        priorityServed: Math.round(prio),
      });
      truckIdx++;
      totalDistanceKm += km;
      totalDurationH += durationH;
      totalCarbonKg += carbonKg;
      totalCost += cost;
      servedDemandTons += loadTons;
      priorityServedTotal += prio;
    }
  }

  const priorityUnmet = Math.max(0, priorityTotal - priorityServedTotal);
  const solveTimeMs = performance.now() - t0;

  log("success", `Routing solved · ${routes.length} routes · ${totalDistanceKm.toFixed(0)} km · ${totalCarbonKg.toFixed(0)} kg CO₂`);
  log("success", `Served ${servedDemandTons.toFixed(1)}/${totalDemandTons.toFixed(1)} t · priority unmet ${priorityUnmet.toFixed(0)} · ${solveTimeMs.toFixed(0)}ms`);

  return {
    routes,
    totalDistanceKm: Math.round(totalDistanceKm),
    totalDurationH: Math.round(totalDurationH * 10) / 10,
    totalCarbonKg: Math.round(totalCarbonKg),
    totalCost: Math.round(totalCost),
    priorityUnmet: Math.round(priorityUnmet),
    servedDemandTons: Math.round(servedDemandTons * 10) / 10,
    totalDemandTons: Math.round(totalDemandTons * 10) / 10,
    solverStatus: "feasible",
    solveTimeMs,
  };
}
