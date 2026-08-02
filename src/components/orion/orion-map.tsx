"use client";
import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { ProblemInstance, PrepositionResult, RoutingResult, LatLng } from "@/lib/optim/types";
import { priorityColor } from "@/lib/optim/scenarios";
import { fmtTons, fmtKm } from "@/lib/optim/geo";

// Fix default icon path issue with bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const routeColors = [
  "#9b2c2c",
  "#2f6b4f",
  "#1f5a6b",
  "#b45309",
  "#7c2d12",
  "#374151",
  "#365314",
  "#831843",
];

function FitBounds({ instance }: { instance: ProblemInstance }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const pts: LatLng[] = [
      ...instance.warehouses.map((w) => [w.lat, w.lng] as LatLng),
      ...instance.zones.map((z) => [z.lat, z.lng] as LatLng),
    ];
    if (pts.length) {
      const bounds = L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds.pad(0.15));
      done.current = true;
    }
  }, [map, instance]);
  return null;
}

interface OrionMapProps {
  instance: ProblemInstance;
  preposition: PrepositionResult | null;
  routing: RoutingResult | null;
  selectedScenarioId: string | null;
  timeFilter?: number;
}

export default function OrionMapInner({
  instance,
  preposition,
  routing,
  selectedScenarioId,
  timeFilter = 72,
}: OrionMapProps) {
  const openIds = new Set(preposition?.openSites.map((o) => o.warehouseId) ?? []);

  // demand intensity per zone (from selected scenario or expected)
  const scenario =
    instance.scenarios.find((s) => s.id === selectedScenarioId) ??
    instance.scenarios[0];
  const demandByZone: Record<string, number> = {};
  if (scenario) {
    for (const d of scenario.demands) demandByZone[d.zoneId] = d.demandTons;
  }
  const maxDemand = Math.max(1, ...Object.values(demandByZone));

  return (
    <MapContainer
      center={instance.center}
      zoom={instance.zoom}
      className="h-full w-full"
      zoomControl
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
        subdomains="abcd"
        maxZoom={19}
      />
      <FitBounds instance={instance} />

      {/* Demand zones as heatmap circles */}
      {instance.zones.map((z) => {
        const demand = demandByZone[z.id] ?? 0;
        const intensity = demand / maxDemand;
        const radius = 14 + intensity * 38;
        const color = priorityColor(z.priority);
        return (
          <CircleMarker
            key={z.id}
            center={[z.lat, z.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.18 + intensity * 0.35,
              weight: 1,
            }}
          >
            <Popup>
              <div className="space-y-1 font-mono text-xs">
                <div className="font-bold">{z.name}</div>
                <div>Priority: <span style={{ color }}>{z.priority}</span></div>
                <div>Pop: {z.population.toLocaleString()}</div>
                <div>Demand: {fmtTons(demand)}</div>
                <div>Window: {z.windowStart}–{z.windowEnd}h</div>
                <div>Infra: {(z.infraScore * 100).toFixed(0)}%</div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Candidate warehouses */}
      {instance.warehouses.map((w) => {
        const open = openIds.has(w.id);
        const inv = preposition?.openSites.find((o) => o.warehouseId === w.id)?.inventory;
        return (
          <Marker
            key={w.id}
            position={[w.lat, w.lng]}
            icon={L.divIcon({
              className: "",
              html: open
                ? `<div style="position:relative;width:16px;height:16px;">
                     <div class="orion-pulse-ring" style="position:absolute;inset:0;border-radius:9999px;background:#2f6b4f;opacity:0.4;"></div>
                     <div style="position:absolute;inset:2px;border-radius:9999px;background:#2f6b4f;border:2px solid #f7f4ed;"></div>
                   </div>`
                : `<div style="width:10px;height:10px;border-radius:1px;background:none;border:1.5px solid #9b2c2c;transform:rotate(45deg);"></div>`,
              iconSize: open ? [16, 16] : [10, 10],
              iconAnchor: open ? [8, 8] : [5, 5],
            })}
          >
            <Popup>
              <div className="space-y-1 font-mono text-xs">
                <div className="font-bold">{w.name}</div>
                <div>Status: {open ? <span className="text-emerald-500">OPEN</span> : <span className="text-zinc-400">closed</span>}</div>
                {inv !== undefined && <div>Inventory: {fmtTons(inv)} / {w.capacity}t</div>}
                <div>Fixed cost: ${w.fixedCost}K</div>
                <div>Capacity: {w.capacity}t</div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Routes — filtered by timeFilter (only show routes that complete within the selected hour) */}
      {routing?.routes.filter((r) => r.durationH <= timeFilter).map((r, i) => {
        const color = routeColors[i % routeColors.length];
        return (
          <Polyline
            key={r.id}
            positions={r.geometry}
            pathOptions={{
              color,
              weight: 3,
              opacity: 0.85,
              className: "orion-route-flow",
            }}
          >
            <Popup>
              <div className="space-y-1 font-mono text-xs">
                <div className="font-bold">Route {r.id} · Truck {r.truckIndex + 1}</div>
                <div>From: {r.warehouseId}</div>
                <div>Stops: {r.stops.length}</div>
                <div>Load: {fmtTons(r.loadTons)}</div>
                <div>Distance: {fmtKm(r.distanceKm)}</div>
                <div>Duration: {r.durationH}h</div>
                <div>CO₂: {r.carbonKg}kg</div>
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </MapContainer>
  );
}
