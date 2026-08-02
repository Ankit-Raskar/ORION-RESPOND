"use client";
import { useOrion } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const levelColor: Record<string, string> = {
  info: "var(--muted-foreground)",
  warn: "var(--ochre)",
  success: "var(--forest)",
  error: "var(--oxblood)",
};
// Fixed-width 4-char tags so all messages align at the same x position
const levelTag: Record<string, string> = { info: "INFO", warn: "WARN", success: " OK ", error: "ERR " };

export function SolverLog() {
  const log = useOrion((s) => s.log);
  const status = useOrion((s) => s.status);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever new log lines arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [log]);

  return (
    <div className="flex h-full min-h-0 flex-col border border-border bg-card">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Solver Log
        </span>
        <span className="font-mono text-[9px] text-muted-foreground/50">stdout</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", status === "running" && "orion-blink")}
            style={{
              backgroundColor:
                status === "running"
                  ? "var(--oxblood)"
                  : status === "done"
                    ? "var(--forest)"
                    : status === "error"
                      ? "var(--oxblood)"
                      : "var(--muted-foreground)",
            }}
          />
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {status === "running" ? "SOLVING" : status === "done" ? "COMPLETE" : status === "error" ? "ERROR" : "IDLE"}
          </span>
        </span>
      </div>
      {/* Native scrollable div — auto-scrolls to bottom, no Radix viewport issues */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-thin"
      >
        <div className="p-2 font-mono text-[10.5px] leading-[1.65]">
          {log.length === 0 && (
            <div className="flex items-center justify-center py-10 text-center font-mono text-[11px] text-muted-foreground/50">
              awaiting optimizer run…
            </div>
          )}
          <div className="space-y-0">
            {log.map((line, i) => (
              <div
                key={i}
                className="orion-fade-in grid grid-cols-[auto_3.5em_1fr] gap-x-2 px-1 py-0.5 hover:bg-secondary/50"
              >
                {/* Column 1: timestamp */}
                <span className="shrink-0 text-muted-foreground/40 tabular-nums">
                  {new Date(line.t).toLocaleTimeString("en-US", { hour12: false })}
                </span>
                {/* Column 2: level tag — fixed 3.5em width, centered */}
                <span
                  className="shrink-0 text-center font-bold"
                  style={{ color: levelColor[line.level] }}
                >
                  {levelTag[line.level]}
                </span>
                {/* Column 3: message — wraps with hanging indent so wrapped lines align under the message, not the timestamp */}
                <span
                  className="min-w-0 break-words whitespace-pre-wrap text-foreground/90"
                  style={{ textIndent: "-0.5em", paddingLeft: "0.5em" }}
                >
                  {line.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
