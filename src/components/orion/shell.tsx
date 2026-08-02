"use client";
import { useOrion } from "@/lib/store";
import type { ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Satellite, GitCompareArrows, Layers3, Radio } from "lucide-react";
import { AiAssistant } from "./ai-assistant";
import { StatusTicker } from "./status-ticker";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const NAV: { id: ViewId; label: string; n: string; icon: React.ReactNode }[] = [
  { id: "hero", label: "Overview", n: "01", icon: <Radio className="h-3.5 w-3.5" /> },
  { id: "map", label: "Live Map", n: "02", icon: <Satellite className="h-3.5 w-3.5" /> },
  { id: "compare", label: "Compare", n: "03", icon: <GitCompareArrows className="h-3.5 w-3.5" /> },
  { id: "scenarios", label: "Scenarios", n: "04", icon: <Layers3 className="h-3.5 w-3.5" /> },
];

export function OrionShell({ children }: { children: React.ReactNode }) {
  const view = useOrion((s) => s.view);
  const setView = useOrion((s) => s.setView);
  const status = useOrion((s) => s.status);
  const coverage = useOrion((s) => s.preposition?.coverage);
  const instance = useOrion((s) => s.instance);

  return (
    <div className="flex min-h-screen flex-col orion-paper">
      {/* Masthead — like a newspaper banner */}
      <header className="sticky top-0 z-[1100] border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
          {/* Top metadata strip */}
          <div className="flex items-center justify-between border-b border-border/60 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">ORION-RESPOND</span>
              <span className="text-border">/</span>
              <span>Field Report v2.4</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline">{instance.disasterType} watch</span>
              <span className="hidden md:inline text-border">/</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    status === "running" && "bg-oxblood orion-blink",
                    status === "done" && "bg-forest",
                    status === "idle" && "bg-muted-foreground/50",
                    status === "error" && "bg-destructive",
                  )}
                  style={{
                    backgroundColor:
                      status === "running"
                        ? "var(--oxblood)"
                        : status === "done"
                          ? "var(--forest)"
                          : undefined,
                  }}
                />
                {status === "running"
                  ? "SOLVING"
                  : status === "done"
                    ? `COV ${(coverage! * 100).toFixed(0)}%`
                    : "STANDBY"}
              </span>
            </div>
          </div>

          {/* Main masthead row */}
          <div className="flex h-14 items-center justify-between gap-4">
            <button
              onClick={() => setView("hero")}
              className="group flex items-baseline gap-2.5"
              aria-label="ORION-RESPOND home"
            >
              <span className="font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                ORION
              </span>
              <span className="font-[var(--font-display)] text-xs font-medium italic text-oxblood" style={{ color: "var(--oxblood)" }}>
                /respond
              </span>
            </button>

            {/* Desktop nav — editorial list */}
            <nav className="hidden items-center gap-0 md:flex" aria-label="Primary">
              {NAV.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => setView(n.id)}
                  className={cn(
                    "group relative flex items-center gap-2 px-3.5 py-2 font-mono text-xs transition-colors",
                    view === n.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {i > 0 && <span className="absolute left-0 top-1/2 h-3 -translate-y-1/2 border-l border-border" />}
                  <span className="text-[9px] tabular text-muted-foreground/70 group-hover:text-oxblood" style={{ color: view === n.id ? "var(--oxblood)" : undefined }}>
                    {n.n}
                  </span>
                  <span className="font-medium">{n.label}</span>
                  {view === n.id && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-px left-2 right-2 h-0.5"
                      style={{ backgroundColor: "var(--oxblood)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                </button>
              ))}
            </nav>

            {/* Right: instance tag + mobile nav */}
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 border-l border-border pl-3.5 lg:flex">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Active
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {instance.id.toUpperCase()}
                </span>
              </div>
              <MobileNav view={view} setView={setView} />
            </div>
          </div>
        </div>
      </header>

      <StatusTicker />

      {/* Main content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <AiAssistant />

      {/* Footer — editorial colophon */}
      <footer className="mt-auto border-t-2 border-foreground/80 bg-background">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-[var(--font-display)] text-xl font-black">ORION</span>
                <span className="font-[var(--font-display)] text-sm italic text-muted-foreground">— respond</span>
              </div>
              <p className="mt-2 max-w-md text-[12px] leading-relaxed text-muted-foreground">
                A stochastic optimization platform for humanitarian logistics.
                Two-stage MIP pre-positioning, CVRPTW routing, and a PPO
                re-optimization policy — solved live in the browser.
              </p>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:text-right">
              <div>Orion Global Hackathon 2026</div>
              <div className="text-muted-foreground/60">INFORMS · GDG · UnsaidTalks</div>
              <div className="mt-2 text-muted-foreground/50">
                Data: FEMA · NOAA · USGS · WorldPop · OSM
              </div>
            </div>
          </div>
          <div className="orion-rule mt-5" />
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50">
            © 2026 · For demonstration · MIT License
          </p>
        </div>
      </footer>
    </div>
  );
}

function MobileNav({
  view,
  setView,
}: {
  view: ViewId;
  setView: (v: ViewId) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = NAV.find((n) => n.id === view);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 font-mono text-xs"
      >
        <span className="text-[9px] text-muted-foreground/70">{active?.n}</span>
        <span className="font-medium">{active?.label}</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-[1050] bg-foreground/10 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute right-4 top-14 z-[1060] w-56 border border-border bg-card p-1 shadow-lg"
            >
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setView(n.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 font-mono text-xs transition-colors",
                    view === n.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <span className="text-[9px] text-muted-foreground/70">{n.n}</span>
                  <span className="font-medium">{n.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
