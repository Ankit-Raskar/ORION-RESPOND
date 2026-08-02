"use client";
import { useOrion } from "@/lib/store";
import { INSTANCES } from "@/lib/optim/sample-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, RotateCcw, Tornado, Mountain, Flame, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

const disasterIcon: Record<string, React.ReactNode> = {
  hurricane: <Tornado className="h-3.5 w-3.5" />,
  earthquake: <Mountain className="h-3.5 w-3.5" />,
  flood: <Waves className="h-3.5 w-3.5" />,
  wildfire: <Flame className="h-3.5 w-3.5" />,
};

export function ScenarioControl({ compact }: { compact?: boolean }) {
  const instance = useOrion((s) => s.instance);
  const status = useOrion((s) => s.status);
  const setInstance = useOrion((s) => s.setInstance);
  const runOptimizer = useOrion((s) => s.runOptimizer);
  const reset = useOrion((s) => s.reset);
  const setView = useOrion((s) => s.setView);

  // Short name = everything before the em-dash, for the compact trigger display
  const shortName = instance.name.split("—")[0].trim();

  return (
    <div className={cn("space-y-3", compact && "space-y-3")}>
      <div>
        <label className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
          <span>Disaster Scenario</span>
          <span className="text-muted-foreground/50">select</span>
        </label>
        <Select value={instance.id} onValueChange={setInstance} disabled={status === "running"}>
          <SelectTrigger className="w-full bg-card font-mono text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {disasterIcon[instance.disasterType]}
              <span className="truncate">{shortName}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {INSTANCES.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                <span className="flex items-center gap-2">
                  {disasterIcon[i.disasterType]}
                  <span className="font-mono text-sm">{i.name.split("—")[0].trim()}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="border-border bg-secondary/40 font-mono text-[10px]">
          {instance.zones.length} zones
        </Badge>
        <Badge variant="outline" className="border-border bg-secondary/40 font-mono text-[10px]">
          {instance.warehouses.length} sites
        </Badge>
        <Badge variant="outline" className="border-border bg-secondary/40 font-mono text-[10px]">
          {instance.scenarios.length} scn
        </Badge>
        <Badge variant="outline" className="border-border bg-secondary/40 font-mono text-[10px]">
          {instance.fleet.count} trucks
        </Badge>
      </div>

      {!compact && (
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {instance.description}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => {
            runOptimizer();
            setView("map");
          }}
          disabled={status === "running"}
          className="flex-1 gap-2 bg-foreground text-background hover:bg-oxblood"
        >
          {status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {status === "running" ? "Optimizing…" : "Run Optimizer"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={reset}
          disabled={status === "running"}
          aria-label="Reset"
          className="border-border bg-card"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
