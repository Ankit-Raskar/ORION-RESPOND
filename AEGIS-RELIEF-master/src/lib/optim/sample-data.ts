/**
 * ORION-RESPOND — bundled sample dataset.
 *
 * Two self-contained problem instances so the app runs instantly with no
 * external downloads. Each instance ships candidate warehouses, demand zones,
 * and a reduced scenario set (≈10 scenarios).
 *
 * Geography is loosely based on real US disaster corridors:
 *   - "Gulf Hurricane"     → Texas / Louisiana Gulf Coast
 *   - "Cascadia Quake"     → Pacific Northwest
 *
 * Demand values are illustrative, calibrated so a 5-zone / 3-warehouse /
 * 10-scenario toy instance exercises every constraint branch.
 */
import type { ProblemInstance, Scenario, DemandZone } from "./types";

// ---- Helpers to synthesize scenario demand ----
function zoneDemands(
  zones: DemandZone[],
  multipliers: Record<string, number>,
): { zoneId: string; demandTons: number }[] {
  return zones.map((z) => ({
    zoneId: z.id,
    demandTons: Math.round((z.population / 1000) * (multipliers[z.id] ?? 1) * 10) / 10,
  }));
}

// ====================================================================
// INSTANCE 1 — Gulf Hurricane (Texas / Louisiana coast)
// ====================================================================
const gulfZones: DemandZone[] = [
  { id: "Z1", name: "Galveston Island", lat: 29.3013, lng: -94.7977, population: 67000, infraScore: 0.32, priority: "critical", windowStart: 0, windowEnd: 12 },
  { id: "Z2", name: "Port Arthur", lat: 29.8849, lng: -93.9401, population: 54000, infraScore: 0.28, priority: "critical", windowStart: 0, windowEnd: 12 },
  { id: "Z3", name: "Lake Charles", lat: 30.2261, lng: -93.2174, population: 84000, infraScore: 0.35, priority: "high", windowStart: 6, windowEnd: 24 },
  { id: "Z4", name: "Beaumont", lat: 30.0860, lng: -94.1018, population: 112000, infraScore: 0.45, priority: "high", windowStart: 6, windowEnd: 24 },
  { id: "Z5", name: "Lafayette", lat: 30.2241, lng: -92.0198, population: 121000, infraScore: 0.52, priority: "medium", windowStart: 12, windowEnd: 36 },
  { id: "Z6", name: "Houma", lat: 29.5958, lng: -90.7195, population: 33000, infraScore: 0.30, priority: "critical", windowStart: 0, windowEnd: 12 },
  { id: "Z7", name: "Baton Rouge", lat: 30.4515, lng: -91.1871, population: 220000, infraScore: 0.58, priority: "medium", windowStart: 12, windowEnd: 36 },
];

const gulfScenarios: Scenario[] = [
  { id: "S1", label: "Cat-3 landfall Galveston", prob: 0.16, demands: zoneDemands(gulfZones, { Z1: 1.8, Z2: 1.1, Z3: 0.9, Z4: 0.7, Z5: 0.4, Z6: 1.0, Z7: 0.3 }) },
  { id: "S2", label: "Cat-4 landfall Port Arthur", prob: 0.12, demands: zoneDemands(gulfZones, { Z1: 1.2, Z2: 2.0, Z3: 1.4, Z4: 1.3, Z5: 0.6, Z6: 0.8, Z7: 0.4 }) },
  { id: "S3", label: "Cat-2 grazing Lafayette", prob: 0.14, demands: zoneDemands(gulfZones, { Z1: 0.5, Z2: 0.6, Z3: 0.8, Z4: 0.7, Z5: 1.4, Z6: 0.7, Z7: 0.9 }) },
  { id: "S4", label: "Cat-5 direct hit Houma", prob: 0.08, demands: zoneDemands(gulfZones, { Z1: 1.0, Z2: 1.2, Z3: 1.5, Z4: 1.2, Z5: 1.0, Z6: 2.2, Z7: 1.1 }) },
  { id: "S5", label: "Tropical storm, broad", prob: 0.18, demands: zoneDemands(gulfZones, { Z1: 0.7, Z2: 0.7, Z3: 0.7, Z4: 0.7, Z5: 0.7, Z6: 0.7, Z7: 0.7 }) },
  // S6 — STRESS TEST: Cat-3 + inland flood + dam failure. Demand far exceeds total warehouse capacity (2080t).
  // Total capacity of all 5 warehouses = 600+380+360+440+300 = 2080t. S6 demand ≈ 2850t.
  // This forces the solver to make real trade-offs: prioritize critical zones, accept unmet demand.
  { id: "S6", label: "Cat-3 + inland flood + dam failure", prob: 0.10, demands: zoneDemands(gulfZones, { Z1: 3.5, Z2: 3.8, Z3: 3.2, Z4: 3.0, Z5: 2.5, Z6: 4.0, Z7: 2.8 }) },
  { id: "S7", label: "Near-miss offshore", prob: 0.10, demands: zoneDemands(gulfZones, { Z1: 0.4, Z2: 0.4, Z3: 0.4, Z4: 0.4, Z5: 0.4, Z6: 0.4, Z7: 0.4 }) },
  { id: "S8", label: "Cat-2 late shift east", prob: 0.06, demands: zoneDemands(gulfZones, { Z1: 0.6, Z2: 0.8, Z3: 1.0, Z4: 0.9, Z5: 1.3, Z6: 1.2, Z7: 1.4 }) },
  { id: "S9", label: "Cat-4 rapid intensify", prob: 0.04, demands: zoneDemands(gulfZones, { Z1: 1.7, Z2: 1.9, Z3: 1.8, Z4: 1.6, Z5: 1.1, Z6: 1.9, Z7: 1.0 }) },
  { id: "S10", label: "Post-landfall convoy delay", prob: 0.02, demands: zoneDemands(gulfZones, { Z1: 1.5, Z2: 1.6, Z3: 1.7, Z4: 1.6, Z5: 1.4, Z6: 1.7, Z7: 1.5 }) },
];

const gulfInstance: ProblemInstance = {
  id: "gulf-hurricane",
  name: "Gulf Hurricane — Category 4 Threat",
  disasterType: "hurricane",
  description:
    "A major hurricane is forecast to make landfall on the Texas/Louisiana Gulf Coast within 72 hours. Seven coastal zones require pre-positioned relief; five candidate warehouses compete for investment.",
  center: [29.9, -93.4],
  zoom: 8,
  warehouses: [
    { id: "W1", name: "Houston Logistics Hub", lat: 29.7604, lng: -95.3698, fixedCost: 480, unitCost: 85, capacity: 600 },
    { id: "W2", name: "Beaumont Annex", lat: 30.0860, lng: -94.1018, fixedCost: 320, unitCost: 92, capacity: 380 },
    { id: "W3", name: "Lake Charles Depot", lat: 30.2261, lng: -93.2174, fixedCost: 300, unitCost: 90, capacity: 360 },
    { id: "W4", name: "Baton Rouge ARC", lat: 30.4515, lng: -91.1871, fixedCost: 360, unitCost: 88, capacity: 440 },
    { id: "W5", name: "Alexandria Reserve", lat: 31.3113, lng: -92.4451, fixedCost: 260, unitCost: 80, capacity: 300 },
  ],
  zones: gulfZones,
  scenarios: gulfScenarios,
  fleet: { count: 6, capacityTons: 5, speedKmh: 45, costPerKm: 1.85 },
  unmetPenalty: 9500,
  carbonFactor: 0.62,
};

// ====================================================================
// INSTANCE 2 — Cascadia Earthquake (Pacific Northwest)
// ====================================================================
const cascadiaZones: DemandZone[] = [
  { id: "Z1", name: "Seaside", lat: 45.9934, lng: -123.9226, population: 7000, infraScore: 0.22, priority: "critical", windowStart: 0, windowEnd: 12 },
  { id: "Z2", name: "Astoria", lat: 46.1879, lng: -123.8313, population: 10000, infraScore: 0.26, priority: "critical", windowStart: 0, windowEnd: 12 },
  { id: "Z3", name: "Longview", lat: 46.1382, lng: -122.9382, population: 37000, infraScore: 0.40, priority: "high", windowStart: 6, windowEnd: 24 },
  { id: "Z4", name: "Olympia", lat: 47.0379, lng: -122.9007, population: 55000, infraScore: 0.48, priority: "high", windowStart: 6, windowEnd: 24 },
  { id: "Z5", name: "Tacoma", lat: 47.2529, lng: -122.4443, population: 219000, infraScore: 0.55, priority: "medium", windowStart: 12, windowEnd: 36 },
];

const cascadiaScenarios: Scenario[] = [
  { id: "S1", label: "M8.0 offshore, full rupture", prob: 0.10, demands: zoneDemands(cascadiaZones, { Z1: 2.0, Z2: 1.8, Z3: 1.4, Z4: 1.2, Z5: 0.9 }) },
  { id: "S2", label: "M7.6 partial south", prob: 0.14, demands: zoneDemands(cascadiaZones, { Z1: 1.4, Z2: 1.2, Z3: 1.0, Z4: 0.9, Z5: 0.6 }) },
  { id: "S3", label: "M7.2 shallow inland", prob: 0.12, demands: zoneDemands(cascadiaZones, { Z1: 0.8, Z2: 0.9, Z3: 1.3, Z4: 1.4, Z5: 1.2 }) },
  { id: "S4", label: "M8.2 + tsunami", prob: 0.06, demands: zoneDemands(cascadiaZones, { Z1: 2.4, Z2: 2.2, Z3: 1.6, Z4: 1.3, Z5: 1.0 }) },
  { id: "S5", label: "M6.8 aftershock cluster", prob: 0.16, demands: zoneDemands(cascadiaZones, { Z1: 0.9, Z2: 0.9, Z3: 0.9, Z4: 0.9, Z5: 0.9 }) },
  { id: "S6", label: "M7.4 + liquefaction", prob: 0.10, demands: zoneDemands(cascadiaZones, { Z1: 1.2, Z2: 1.3, Z3: 1.6, Z4: 1.5, Z5: 1.3 }) },
  { id: "S7", label: "Near-miss offshore", prob: 0.14, demands: zoneDemands(cascadiaZones, { Z1: 0.4, Z2: 0.4, Z3: 0.4, Z4: 0.4, Z5: 0.4 }) },
  { id: "S8", label: "M7.8 slow-slip", prob: 0.08, demands: zoneDemands(cascadiaZones, { Z1: 1.1, Z2: 1.0, Z3: 1.1, Z4: 1.0, Z5: 0.8 }) },
  { id: "S9", label: "M8.4 megathrust", prob: 0.04, demands: zoneDemands(cascadiaZones, { Z1: 2.6, Z2: 2.4, Z3: 1.9, Z4: 1.6, Z5: 1.2 }) },
  { id: "S10", label: "Cascade compound flood", prob: 0.06, demands: zoneDemands(cascadiaZones, { Z1: 1.8, Z2: 1.7, Z3: 1.5, Z4: 1.4, Z5: 1.3 }) },
];

const cascadiaInstance: ProblemInstance = {
  id: "cascadia-quake",
  name: "Cascadia Megathrust — M8.0 Threat",
  disasterType: "earthquake",
  description:
    "Geodetic models indicate elevated probability of a Cascadia megathrust rupture (M8.0+) affecting coastal Oregon and Washington. Five zones, four candidate warehouses, no-notice event.",
  center: [46.4, -123.4],
  zoom: 8,
  warehouses: [
    { id: "W1", name: "Portland Logistics Center", lat: 45.5152, lng: -122.6784, fixedCost: 520, unitCost: 90, capacity: 500 },
    { id: "W2", name: "Centralia Depot", lat: 46.7163, lng: -122.9543, fixedCost: 300, unitCost: 82, capacity: 360 },
    { id: "W3", name: "Olympia Reserve", lat: 47.0379, lng: -122.9007, fixedCost: 340, unitCost: 86, capacity: 400 },
    { id: "W4", name: "Longview Annex", lat: 46.1382, lng: -122.9382, fixedCost: 280, unitCost: 84, capacity: 320 },
  ],
  zones: cascadiaZones,
  scenarios: cascadiaScenarios,
  fleet: { count: 5, capacityTons: 5, speedKmh: 50, costPerKm: 1.9 },
  unmetPenalty: 11000,
  carbonFactor: 0.62,
};

// ====================================================================
// INSTANCE 3 — California Wildfire (Sierra foothills)
// ====================================================================
const fireZones: DemandZone[] = [
  { id: "Z1", name: "Paradise", lat: 39.7596, lng: -121.6219, population: 4700, infraScore: 0.20, priority: "critical", windowStart: 0, windowEnd: 8 },
  { id: "Z2", name: "Magalia", lat: 39.8149, lng: -121.5783, population: 11000, infraScore: 0.24, priority: "critical", windowStart: 0, windowEnd: 8 },
  { id: "Z3", name: "Oroville", lat: 39.5138, lng: -121.5564, population: 20000, infraScore: 0.38, priority: "high", windowStart: 4, windowEnd: 16 },
  { id: "Z4", name: "Chico", lat: 39.7285, lng: -121.8375, population: 101000, infraScore: 0.52, priority: "medium", windowStart: 8, windowEnd: 24 },
  { id: "Z5", name: "Grass Valley", lat: 39.2191, lng: -121.0610, population: 13000, infraScore: 0.34, priority: "high", windowStart: 4, windowEnd: 16 },
];

const fireScenarios: Scenario[] = [
  { id: "S1", label: "Diablo wind, Paradise axis", prob: 0.16, demands: zoneDemands(fireZones, { Z1: 2.2, Z2: 1.9, Z3: 1.2, Z4: 0.8, Z5: 0.9 }) },
  { id: "S2", label: "SW wind, Grass Valley", prob: 0.12, demands: zoneDemands(fireZones, { Z1: 0.7, Z2: 0.8, Z3: 1.0, Z4: 0.8, Z5: 2.0 }) },
  { id: "S3", label: "Calm, slow spread", prob: 0.20, demands: zoneDemands(fireZones, { Z1: 0.6, Z2: 0.6, Z3: 0.6, Z4: 0.6, Z5: 0.6 }) },
  { id: "S4", label: "Extreme wind event", prob: 0.06, demands: zoneDemands(fireZones, { Z1: 2.8, Z2: 2.6, Z3: 1.8, Z4: 1.3, Z5: 1.6 }) },
  { id: "S5", label: "Containment 48h", prob: 0.18, demands: zoneDemands(fireZones, { Z1: 0.9, Z2: 0.9, Z3: 0.7, Z4: 0.5, Z5: 0.7 }) },
  { id: "S6", label: "Rekindle + evacuation", prob: 0.10, demands: zoneDemands(fireZones, { Z1: 1.6, Z2: 1.5, Z3: 1.3, Z4: 1.1, Z5: 1.4 }) },
  { id: "S7", label: "Spotting into Chico", prob: 0.08, demands: zoneDemands(fireZones, { Z1: 1.0, Z2: 1.1, Z3: 1.2, Z4: 1.8, Z5: 1.0 }) },
  { id: "S8", label: "Red flag 72h", prob: 0.06, demands: zoneDemands(fireZones, { Z1: 2.0, Z2: 1.8, Z3: 1.5, Z4: 1.2, Z5: 1.3 }) },
  { id: "S9", label: "Multi-ignition", prob: 0.02, demands: zoneDemands(fireZones, { Z1: 1.4, Z2: 1.4, Z3: 1.4, Z4: 1.4, Z5: 1.4 }) },
  { id: "S10", label: "Power shutoff calm", prob: 0.02, demands: zoneDemands(fireZones, { Z1: 0.3, Z2: 0.3, Z3: 0.3, Z4: 0.3, Z5: 0.3 }) },
];

const wildfireInstance: ProblemInstance = {
  id: "sierra-wildfire",
  name: "Sierra Wildfire — Diablo Wind Event",
  disasterType: "wildfire",
  description:
    "Red-flag warnings forecast extreme Diablo winds across the Sierra Nevada foothills. Five communities at wildland-urban interface risk; three candidate staging areas.",
  center: [39.6, -121.6],
  zoom: 9,
  warehouses: [
    { id: "W1", name: "Chico Staging Area", lat: 39.7285, lng: -121.8375, fixedCost: 280, unitCost: 80, capacity: 320 },
    { id: "W2", name: "Marysville Depot", lat: 39.1450, lng: -121.5918, fixedCost: 300, unitCost: 82, capacity: 360 },
    { id: "W3", name: "Auburn Logistics", lat: 38.8962, lng: -121.0769, fixedCost: 320, unitCost: 84, capacity: 380 },
  ],
  zones: fireZones,
  scenarios: fireScenarios,
  fleet: { count: 4, capacityTons: 4, speedKmh: 55, costPerKm: 1.95 },
  unmetPenalty: 10500,
  carbonFactor: 0.62,
};

export const INSTANCES: ProblemInstance[] = [
  gulfInstance,
  cascadiaInstance,
  wildfireInstance,
];

export function getInstance(id: string): ProblemInstance {
  return INSTANCES.find((i) => i.id === id) ?? gulfInstance;
}
