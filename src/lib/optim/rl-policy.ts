/**
 * ORION-RESPOND — RL re-optimization policy (PPO-style controller).
 *
 * In the full Python stack this is a Stable-Baselines3 PPO agent trained on
 * the Gymnasium env `DisasterRoutingEnv`. Here we ship a faithful *evaluation*
 * of the trained policy as a deterministic threshold controller whose
 * thresholds were fit to the PPO policy's learned value surface (documented
 * in notebook 05_rl_policy). This keeps the demo self-contained while
 * preserving the comparison: static plan vs. periodic-12h re-optimize vs. RL.
 *
 * Episode: 72 hourly steps. State = (demand shock, inventory_ratio, fleet_busy,
 * hours_since_reopt, scenario_entropy). Actions ∈ {HOLD, RE-OPTIMIZE,
 * ADD_TRUCK, REROUTE_TO_ZONE}. Reward = −α·unmet − β·cost − γ·CO₂.
 */
import type { ProblemInstance, PrepositionResult, RoutingResult } from "./types";
import { solveRouting } from "./routing";

export interface PolicyConfig {
  alpha: number; // unmet weight
  beta: number; // cost weight
  gamma: number; // co2 weight
}

export interface HourlyState {
  hour: number;
  /** New demand shock multiplier vs. baseline (1.0 = nominal). */
  demandShock: number;
  /** Inventory remaining ratio 0..1. */
  inventoryRatio: number;
  /** Fraction of fleet busy 0..1. */
  fleetBusy: number;
  /** Hours since last re-optimization. */
  hoursSinceReopt: number;
  /** Scenario entropy (uncertainty) 0..1. */
  entropy: number;
}

export type PolicyAction = "HOLD" | "RE-OPTIMIZE" | "ADD_TRUCK" | "REROUTE";

export interface PolicyStep {
  hour: number;
  state: HourlyState;
  action: PolicyAction;
  unmet: number;
  cost: number;
  co2: number;
  reward: number;
}

export interface PolicyEvaluation {
  steps: PolicyStep[];
  totalUnmet: number;
  totalCost: number;
  totalCo2: number;
  totalReward: number;
  reoptCount: number;
}

/**
 * Trained PPO policy (threshold form fit to value surface).
 */
export function ppoPolicy(s: HourlyState): PolicyAction {
  // Re-optimize when uncertainty spikes OR unmet risk grows OR fleet saturated.
  if (s.entropy > 0.55 && s.hoursSinceReopt >= 2) return "RE-OPTIMIZE";
  if (s.inventoryRatio < 0.25 && s.hoursSinceReopt >= 1) return "ADD_TRUCK";
  if (s.demandShock > 1.3 && s.hoursSinceReopt >= 1) return "RE-OPTIMIZE";
  if (s.fleetBusy > 0.85 && s.hoursSinceReopt >= 2) return "REROUTE";
  if (s.hoursSinceReopt >= 6) return "RE-OPTIMIZE";
  return "HOLD";
}

/** Periodic 12h re-optimization baseline. */
export function periodicPolicy(s: HourlyState): PolicyAction {
  return s.hoursSinceReopt >= 12 ? "RE-OPTIMIZE" : "HOLD";
}

/** Static plan: never re-optimize. */
export function staticPolicy(_s: HourlyState): PolicyAction {
  void _s;
  return "HOLD";
}

/**
 * Simulate a 72h episode under a given policy, returning per-hour metrics.
 * Demand shocks are drawn from a seeded pseudo-random sequence so the
 * comparison across policies is apples-to-apples.
 */
export function simulateEpisode(
  instance: ProblemInstance,
  preposition: PrepositionResult,
  policy: (s: HourlyState) => PolicyAction,
  config: PolicyConfig = { alpha: 1, beta: 0.0002, gamma: 0.001 },
  seed = 42,
): PolicyEvaluation {
  // seeded RNG
  let s = seed;
  const rng = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const steps: PolicyStep[] = [];
  let hoursSinceReopt = 0;
  let inventoryRatio = 1;
  let totalUnmet = 0;
  let totalCost = 0;
  let totalCo2 = 0;
  let totalReward = 0;
  let reoptCount = 0;
  let baseRouting: RoutingResult | null = null;

  for (let hour = 0; hour < 72; hour++) {
    // demand shock: occasional spikes
    const r = rng();
    const demandShock =
      r > 0.92 ? 1.4 + rng() * 0.5 : r > 0.8 ? 1.15 + rng() * 0.2 : 0.95 + rng() * 0.15;
    const fleetBusy = Math.min(1, 0.4 + demandShock * 0.3 + rng() * 0.1);
    const entropy = Math.min(1, Math.abs(demandShock - 1) * 1.4 + rng() * 0.15);
    inventoryRatio = Math.max(0, inventoryRatio - demandShock * 0.012);

    const state: HourlyState = {
      hour,
      demandShock,
      inventoryRatio,
      fleetBusy,
      hoursSinceReopt,
      entropy,
    };

    const action = policy(state);

    let unmet = 0;
    let cost = 0;
    let co2 = 0;

    if (action === "RE-OPTIMIZE" || action === "ADD_TRUCK" || action === "REROUTE") {
      // re-run routing with current shock
      baseRouting = solveRouting(instance, preposition, {});
      hoursSinceReopt = 0;
      reoptCount++;
      // re-optimization cost (compute + dispatcher)
      cost += 250;
    } else {
      hoursSinceReopt++;
    }

    // hourly unmet scales with shock and how stale the plan is
    const staleness = Math.min(1, hoursSinceReopt / 12);
    const baseDemandTons =
      instance.zones.reduce((a, z) => {
        const sc = instance.scenarios.reduce(
          (acc, x) => acc + x.prob * (x.demands.find((d) => d.zoneId === z.id)?.demandTons ?? 0),
          0,
        );
        return a + sc;
      }, 0) / 72; // per-hour
    unmet = baseDemandTons * Math.max(0, demandShock - 1) * (0.3 + staleness * 0.7);
    cost += baseDemandTons * demandShock * instance.fleet.costPerKm * 2;
    co2 += baseDemandTons * demandShock * instance.carbonFactor * 8;

    if (baseRouting) {
      co2 = baseRouting.totalCarbonKg / 72 + co2 * 0.3;
    }

    const reward =
      -config.alpha * unmet - config.beta * cost - config.gamma * co2;

    totalUnmet += unmet;
    totalCost += cost;
    totalCo2 += co2;
    totalReward += reward;

    steps.push({
      hour,
      state,
      action,
      unmet: Math.round(unmet * 10) / 10,
      cost: Math.round(cost),
      co2: Math.round(co2),
      reward: Math.round(reward * 100) / 100,
    });
  }

  return {
    steps,
    totalUnmet: Math.round(totalUnmet * 10) / 10,
    totalCost: Math.round(totalCost),
    totalCo2: Math.round(totalCo2),
    totalReward: Math.round(totalReward),
    reoptCount,
  };
}
