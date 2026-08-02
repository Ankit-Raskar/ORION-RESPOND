"use client";
import { useState } from "react";
import { useOrion } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Loader2, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preposition = useOrion((s) => s.preposition);
  const staticBaseline = useOrion((s) => s.staticBaseline);
  const routing = useOrion((s) => s.routing);
  const instance = useOrion((s) => s.instance);

  const ready = preposition && staticBaseline && routing;

  const fetchBriefing = async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    setBriefing(null);
    try {
      const res = await fetch("/api/orion/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: instance.name,
          disasterType: instance.disasterType,
          zones: instance.zones.map((z) => ({ id: z.id, name: z.name, priority: z.priority, population: z.population })),
          warehouses: instance.warehouses.map((w) => ({ id: w.id, name: w.name, capacity: w.capacity, fixedCost: w.fixedCost })),
          openSites: preposition.openSites,
          coverage: preposition.coverage,
          expectedUnmet: preposition.expectedUnmet,
          totalCost: preposition.totalCost,
          fixedCost: preposition.fixedCost,
          inventoryCost: preposition.inventoryCost,
          transportCost: preposition.expectedTransportCost,
          unmetPenalty: instance.unmetPenalty,
          routes: routing.routes.map((r) => ({ id: r.id, warehouseId: r.warehouseId, stops: r.stops.length, distanceKm: r.distanceKm, carbonKg: r.carbonKg, loadTons: r.loadTons })),
          staticCoverage: staticBaseline.coverage,
          staticUnmet: staticBaseline.expectedUnmet,
          scenarioCount: instance.scenarios.length,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBriefing(data.briefing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && ready && !briefing && !loading) fetchBriefing();
        }}
        className="fixed bottom-5 right-5 z-[1200] flex h-11 w-11 items-center justify-center bg-foreground text-background shadow-md transition-all hover:scale-105 hover:bg-oxblood"
        style={{ backgroundColor: "var(--ink)" }}
        aria-label="AI assistant"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Bot className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && ready && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ backgroundColor: "var(--forest)" }} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-18 right-5 z-[1200] w-[min(92vw,400px)] overflow-hidden border border-border bg-card shadow-xl"
            style={{ bottom: "4.5rem" }}
          >
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center bg-foreground" style={{ backgroundColor: "var(--ink)" }}>
                <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--paper)" }} />
              </div>
              <div>
                <div className="font-[var(--font-display)] text-sm font-semibold">AEGIS AI Briefing</div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">LLM tactical analysis</div>
              </div>
            </div>

            <div className="p-4">
              {!ready && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Bot className="h-6 w-6 text-muted-foreground/40" />
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Run the optimizer first to get an AI briefing.
                  </p>
                </div>
              )}

              {ready && loading && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--oxblood)" }} />
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Analyzing optimization decisions…
                  </p>
                </div>
              )}

              {error && <p className="py-4 text-center font-mono text-[11px]" style={{ color: "var(--oxblood)" }}>{error}</p>}

              {briefing && !loading && (
                <ScrollArea className="max-h-[50vh] scroll-thin">
                  <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">{briefing}</div>
                </ScrollArea>
              )}

              {ready && !loading && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full gap-2 border-border bg-card font-mono text-[11px]"
                  onClick={fetchBriefing}
                  disabled={loading}
                >
                  <Sparkles className="h-3 w-3" />
                  {briefing ? "Regenerate briefing" : "Generate briefing"}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
