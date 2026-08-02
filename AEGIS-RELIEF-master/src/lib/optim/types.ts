/**
 * ORION-RESPOND — Core domain types.
 *
 * These types model a two-stage stochastic humanitarian logistics problem:
 *   - First stage:  where to open warehouses and how much inventory to pre-position.
 *   - Second stage: per-scenario shipment decisions and unmet-demand penalties.
 *
 * Coordinates use [lat, lng] to stay compatible with Leaflet.
 */

export type LatLng = [number, number];

export type DisasterType = "hurricane" | "earthquake" | "flood" | "wildfire";

export type Priority = "critical" | "high" | "medium" | "low";

/** A candidate pre-positioning warehouse site. */
export interface Warehouse {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Fixed cost to open ($K). */
  fixedCost: number;
  /** Unit inventory holding cost ($/ton). */
  unitCost: number;
  /** Maximum inventory capacity (tons). */
  capacity: number;
}

/** A demand node (affected population zone). */
export interface DemandZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Population within 50 km. */
  population: number;
  /** Infrastructure resilience score 0..1 (lower = more vulnerable). */
  infraScore: number;
  priority: Priority;
  /** Per-priority time window for relief delivery (hours from disaster). */
  windowStart: number;
  windowEnd: number;
}

/** A demand realization for one zone under one scenario. */
export interface ScenarioDemand {
  zoneId: string;
  /** Relief tons required. */
  demandTons: number;
}

/** A discrete demand scenario with probability weight. */
export interface Scenario {
  id: string;
  label: string;
  /** Probability weight (sums to 1 across the scenario set). */
  prob: number;
  demands: ScenarioDemand[];
}

/** A bundled, self-contained problem instance. */
export interface ProblemInstance {
  id: string;
  name: string;
  disasterType: DisasterType;
  /** Human-readable description shown in the UI. */
  description: string;
  /** Map center. */
  center: LatLng;
  /** Default zoom. */
  zoom: number;
  warehouses: Warehouse[];
  zones: DemandZone[];
  scenarios: Scenario[];
  /** Fleet of relief trucks available. */
  fleet: FleetConfig;
  /** Big-M penalty for unmet demand ($/ton). */
  unmetPenalty: number;
  /** Carbon emission factor (kg CO2 per km per ton). */
  carbonFactor: number;
}

export interface FleetConfig {
  /** Number of trucks. */
  count: number;
  /** Capacity per truck (tons). */
  capacityTons: number;
  /** Average speed (km/h). */
  speedKmh: number;
  /** Operating cost ($/km). */
  costPerKm: number;
}

/** First-stage decision: which warehouses open and their inventory. */
export interface OpenSite {
  warehouseId: string;
  inventory: number;
}

/** Per-scenario shipment decision z[i,j,s]. */
export interface Shipment {
  warehouseId: string;
  zoneId: string;
  scenarioId: string;
  tons: number;
}

/** Result of the two-stage stochastic pre-positioning model. */
export interface PrepositionResult {
  openSites: OpenSite[];
  shipments: Shipment[];
  /** Expected unmet demand across scenarios (tons). */
  expectedUnmet: number;
  /** Expected unmet per zone (tons). */
  unmetByZone: Record<string, number>;
  /** Total first-stage cost ($). */
  fixedCost: number;
  /** Total inventory cost ($). */
  inventoryCost: number;
  /** Expected transport cost ($). */
  expectedTransportCost: number;
  /** Expected unmet penalty ($). */
  expectedUnmetCost: number;
  /** Grand total expected cost ($). */
  totalCost: number;
  /** Fraction of demand satisfied in expectation. */
  coverage: number;
  solverStatus: "optimal" | "feasible" | "heuristic";
  mipGap: number;
  solveTimeMs: number;
  /** Iterative solver log lines for the streaming panel. */
  log: SolverLogLine[];
}

/** A single relief route produced by the VRP solver. */
export interface Route {
  id: string;
  truckIndex: number;
  warehouseId: string;
  /** Ordered sequence of zone visits. */
  stops: { zoneId: string; demandTons: number; arrivalHour: number }[];
  /** Polyline coordinates [lat, lng][]. */
  geometry: LatLng[];
  distanceKm: number;
  durationH: number;
  loadTons: number;
  carbonKg: number;
  /** Priority-weighted demand served. */
  priorityServed: number;
}

export interface RoutingResult {
  routes: Route[];
  totalDistanceKm: number;
  totalDurationH: number;
  totalCarbonKg: number;
  totalCost: number;
  priorityUnmet: number;
  servedDemandTons: number;
  totalDemandTons: number;
  solverStatus: "optimal" | "feasible" | "heuristic";
  solveTimeMs: number;
}

/** A streaming solver log line. */
export interface SolverLogLine {
  t: number;
  level: "info" | "warn" | "success" | "error";
  msg: string;
}

/** KPI snapshot for the dashboard cards. */
export interface KpiSet {
  coverage: number;
  expectedUnmet: number;
  totalCost: number;
  carbonKg: number;
}

/** Comparison between a static (deterministic) plan and the stochastic plan. */
export interface PlanComparison {
  metric: string;
  static: number;
  stochastic: number;
  unit: string;
  /** Positive = stochastic is better. */
  betterWhen: "lower" | "higher";
}
