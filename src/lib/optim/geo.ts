/**
 * Geo helpers: Haversine distance, bearing, interpolation.
 * Used by the routing solver and map layers.
 */
import type { LatLng } from "./types";

const R = 6371; // Earth radius km

const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance between two [lat,lng] points in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Road-network detour factor (~1.3) applied to great-circle distance. */
export function roadDistanceKm(a: LatLng, b: LatLng, detour = 1.32): number {
  return haversineKm(a, b) * detour;
}

/** Build a symmetric distance matrix (km) using road-distance approximation. */
export function distanceMatrix(points: LatLng[]): number[][] {
  const n = points.length;
  const m: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = roadDistanceKm(points[i], points[j]);
      m[i][j] = d;
      m[j][i] = d;
    }
  }
  return m;
}

/** Linearly interpolate between two coordinates. t in [0,1]. */
export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Bearing in degrees [0,360). */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function fmtKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  return `${Math.round(km)} km`;
}

export function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

export function fmtTons(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2)}k t`;
  return `${v.toFixed(1)} t`;
}
