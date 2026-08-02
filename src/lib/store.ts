/**
 * ORION-RESPOND — global client state (Zustand).
 * Holds the selected instance, solver results, streaming log, and view.
 */
"use client";
import { create } from "zustand";
import type {
  ProblemInstance,
  PrepositionResult,
  RoutingResult,
  SolverLogLine,
} from "@/lib/optim/types";
import { INSTANCES } from "@/lib/optim/sample-data";
import { solvePreposition, solveStaticBaseline } from "@/lib/optim/preposition";
import { solveRouting } from "@/lib/optim/routing";

export type ViewId = "hero" | "map" | "compare" | "scenarios";

interface OrionState {
  view: ViewId;
  instance: ProblemInstance;
  // solver state
  status: "idle" | "running" | "done" | "error";
  log: SolverLogLine[];
  preposition: PrepositionResult | null;
  staticBaseline: PrepositionResult | null;
  routing: RoutingResult | null;
  selectedScenarioId: string | null;
  // actions
  setView: (v: ViewId) => void;
  setInstance: (id: string) => void;
  setSelectedScenario: (id: string | null) => void;
  pushLog: (line: SolverLogLine) => void;
  clearLog: () => void;
  runOptimizer: () => Promise<void>;
  reset: () => void;
}

export const useOrion = create<OrionState>((set, get) => ({
  view: "hero",
  instance: INSTANCES[0],
  status: "idle",
  log: [],
  preposition: null,
  staticBaseline: null,
  routing: null,
  selectedScenarioId: INSTANCES[0].scenarios[0]?.id ?? null,

  setView: (v) => set({ view: v }),
  setInstance: (id) => {
    const inst = INSTANCES.find((i) => i.id === id) ?? INSTANCES[0];
    set({
      instance: inst,
      status: "idle",
      log: [],
      preposition: null,
      staticBaseline: null,
      routing: null,
      selectedScenarioId: inst.scenarios[0]?.id ?? null,
    });
  },
  setSelectedScenario: (id) => set({ selectedScenarioId: id }),
  pushLog: (line) => set((s) => ({ log: [...s.log.slice(-200), line] })),
  clearLog: () => set({ log: [] }),

  runOptimizer: async () => {
    const { instance, pushLog, clearLog } = get();
    clearLog();
    set({ status: "running", preposition: null, routing: null });
    try {
      // Stage 1: stochastic pre-positioning (streaming log via callback)
      const pre = solvePreposition(instance, {
        onLog: (l) => pushLog(l),
      });
      set({ preposition: pre });

      // Stage 2: CVRPTW routing on the open warehouses
      const rt = solveRouting(instance, pre, {
        onLog: (l) => pushLog(l),
      });
      set({ routing: rt });

      // Baseline for comparison
      const base = solveStaticBaseline(instance);
      set({ staticBaseline: base, status: "done" });
      pushLog({
        t: Date.now(),
        level: "success",
        msg: `Pipeline complete. Stochastic coverage ${(pre.coverage * 100).toFixed(1)}% vs static ${(base.coverage * 100).toFixed(1)}%.`,
      });
    } catch (e) {
      console.error("[ORION] optimizer failed:", e);
      set({ status: "error" });
      pushLog({
        t: Date.now(),
        level: "error",
        msg: `Optimizer error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  },

  reset: () =>
    set({
      status: "idle",
      log: [],
      preposition: null,
      staticBaseline: null,
      routing: null,
    }),
}));

// Expose store on window for runtime diagnostics (dev only).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __orion?: unknown }).__orion = useOrion;
}
