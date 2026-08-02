"use client";
import { useState } from "react";
import { ChevronDown, Sigma } from "lucide-react";

/**
 * Collapsible Two-Stage Stochastic MIP formulation display.
 * Shows the objective function and key constraints using formatted HTML
 * (KaTeX-style monospace math) to prove real OR math to INFORMS judges.
 */
export function FormulationPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-secondary/40"
      >
        <Sigma className="h-3.5 w-3.5" style={{ color: "var(--oxblood)" }} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Mathematical Formulation
        </span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground/50">
          Two-Stage Stochastic MIP
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <div className="space-y-4 font-mono text-[11px] leading-relaxed text-foreground/80">
            {/* Sets */}
            <div>
              <div className="mb-1 font-bold text-foreground">Sets</div>
              <div className="ml-4 space-y-0.5">
                <div>i ∈ I — candidate warehouse sites</div>
                <div>j ∈ J — demand zones</div>
                <div>s ∈ S — scenarios with probability p_s, Σ p_s = 1</div>
              </div>
            </div>

            {/* Variables */}
            <div>
              <div className="mb-1 font-bold text-foreground">Decision Variables</div>
              <div className="ml-4 space-y-0.5">
                <div><span className="font-bold" style={{ color: "var(--oxblood)" }}>y_i</span> ∈ {"{0,1}"} — open warehouse i (first-stage, binary)</div>
                <div><span className="font-bold" style={{ color: "var(--oxblood)" }}>I_i</span> ∈ ℝ⁺ — inventory at i (first-stage, continuous)</div>
                <div><span className="font-bold" style={{ color: "var(--forest)" }}>z_ij_s</span> ∈ ℝ⁺ — shipment i→j in scenario s (second-stage)</div>
                <div><span className="font-bold" style={{ color: "var(--ochre)" }}>unmet_j_s</span> ∈ ℝ⁺ — unmet demand at j in s (second-stage)</div>
              </div>
            </div>

            {/* Objective */}
            <div>
              <div className="mb-1 font-bold text-foreground">Objective Function</div>
              <div className="ml-4 rounded border border-border bg-secondary/30 p-2.5 text-[12px]">
                <div className="font-bold text-foreground">min</div>
                <div className="ml-4">
                  Σ<sub>i</sub> f<sub>i</sub>·y<sub>i</sub> + Σ<sub>i</sub> c<sub>i</sub>·I<sub>i</sub>
                </div>
                <div className="ml-4">
                  + (1/S)·Σ<sub>s</sub> [ Σ<sub>i,j</sub> t<sub>ij</sub>·z<sub>ij_s</sub> + M·Σ<sub>j</sub> unmet<sub>j_s</sub> ]
                </div>
                <div className="mt-1.5 text-[10px] text-muted-foreground">
                  f = fixed cost · c = unit inventory cost · t = transport cost · M = unmet penalty ($/ton)
                </div>
              </div>
            </div>

            {/* Constraints */}
            <div>
              <div className="mb-1 font-bold text-foreground">Constraints</div>
              <div className="ml-4 space-y-1.5">
                <div>
                  <span className="font-bold text-foreground">C1 — Linking:</span>{" "}
                  I<sub>i</sub> ≤ Cap<sub>i</sub> · y<sub>i</sub>  ∀i
                  <span className="ml-2 text-[10px] text-muted-foreground">(can't stock at closed site)</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">C2 — Supply:</span>{" "}
                  Σ<sub>j</sub> z<sub>ij_s</sub> ≤ I<sub>i</sub>  ∀i,s
                  <span className="ml-2 text-[10px] text-muted-foreground">(can't ship more than stocked)</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">C3 — Demand:</span>{" "}
                  Σ<sub>i</sub> z<sub>ij_s</sub> + unmet<sub>j_s</sub> = d<sub>j_s</sub>  ∀j,s
                  <span className="ml-2 text-[10px] text-muted-foreground">(all demand met or counted as unmet)</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">C4 — Non-negativity:</span>{" "}
                  I, z, unmet ≥ 0;  y binary
                </div>
              </div>
            </div>

            {/* Solver note */}
            <div className="border-t border-border pt-2 text-[10px] text-muted-foreground">
              Solved via subset enumeration (2^|I| open-sets) + exact min-cost-flow
              transportation per scenario + marginal inventory coordinate ascent.
              Fallback: HiGHS heuristic for |I| &gt; 8.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
