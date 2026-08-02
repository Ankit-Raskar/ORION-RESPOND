"use client";
import { useOrion } from "@/lib/store";
import { OrionShell } from "@/components/orion/shell";
import { HeroView } from "@/components/orion/hero-view";
import { MapView } from "@/components/orion/map-view";
import { CompareView } from "@/components/orion/compare-view";
import { ScenariosView } from "@/components/orion/scenarios-view";

export default function Home() {
  const view = useOrion((s) => s.view);

  return (
    <OrionShell>
      {view === "hero" && <HeroView />}
      {view === "map" && <MapView />}
      {view === "compare" && <CompareView />}
      {view === "scenarios" && <ScenariosView />}
    </OrionShell>
  );
}
