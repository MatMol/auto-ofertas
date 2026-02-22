import type { Listing } from "./types.js";

const MIN_SUBGROUP = 3;

function normalizeVersion(v: string | null): string {
  return (v ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Simple linear regression: returns slope (m) and intercept (b)
 * such that predictedPrice = m * year + b.
 */
function linearRegression(
  points: { x: number; y: number }[]
): { m: number; b: number } {
  const n = points.length;
  if (n < 2) return { m: 0, b: points[0]?.y ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return { m: 0, b: sumY / n };

  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

function expectedKmForAge(year: number): number {
  const age = Math.max(0, new Date().getFullYear() - year);
  return age * 15_000;
}

function scoreListingInGroup(l: Listing, peers: Listing[]): number {
  const avgPrice =
    peers.reduce((s, p) => s + p.priceArs, 0) / peers.length;
  const priceRatio = avgPrice > 0 ? l.priceArs / avgPrice : 1;
  const priceScore = Math.max(0, Math.min(100, (2 - priceRatio) * 50));

  const avgKm = peers.reduce((s, p) => s + p.km, 0) / peers.length;
  const kmRatio = avgKm > 0 ? l.km / avgKm : 1;
  const kmScore = l.isNew
    ? 90
    : Math.max(0, Math.min(100, (2 - kmRatio) * 50));

  const pricePerKm = l.km > 0 ? l.priceArs / l.km : l.priceArs;
  const peerPpkm = peers.filter((p) => p.km > 0).map((p) => p.priceArs / p.km);
  const avgPpkm =
    peerPpkm.length > 0
      ? peerPpkm.reduce((a, b) => a + b, 0) / peerPpkm.length
      : pricePerKm;
  const ppkmRatio = avgPpkm > 0 ? pricePerKm / avgPpkm : 1;
  const ppkmScore = Math.max(0, Math.min(100, (2 - ppkmRatio) * 50));

  return priceScore * 0.4 + kmScore * 0.2 + ppkmScore * 0.15;
}

function scoreListingWithRegression(
  l: Listing,
  reg: { m: number; b: number }
): number {
  const expectedPrice = Math.max(1, reg.m * l.year + reg.b);
  const priceRatio = l.priceArs / expectedPrice;
  const priceScore = Math.max(0, Math.min(100, (2 - priceRatio) * 50));

  const expectedKm = expectedKmForAge(l.year);
  const kmRatio = expectedKm > 0 ? l.km / expectedKm : 1;
  const kmScore = l.isNew
    ? 90
    : Math.max(0, Math.min(100, (2 - kmRatio) * 50));

  const pricePerKm = l.km > 0 ? l.priceArs / l.km : l.priceArs;
  const expectedPpkm = expectedKm > 0 ? expectedPrice / expectedKm : pricePerKm;
  const ppkmRatio = expectedPpkm > 0 ? pricePerKm / expectedPpkm : 1;
  const ppkmScore = Math.max(0, Math.min(100, (2 - ppkmRatio) * 50));

  return priceScore * 0.4 + kmScore * 0.2 + ppkmScore * 0.15;
}

function completenessScore(l: Listing): number {
  let score = 0;
  if (l.imageUrls.length > 0) score += 40;
  if (l.version) score += 25;
  if (l.fuelType) score += 15;
  if (l.transmission) score += 10;
  if (l.bodyType) score += 10;
  return score;
}

function trustScore(l: Listing): number {
  if (l.verificationBadge === "ml_verified") return 80;
  if (l.verificationBadge === "concesionaria") return 65;
  if (l.sellerType === "concesionaria") return 55;
  return 35;
}

export function calculateScores(listings: Listing[]): void {
  const groups = new Map<string, Listing[]>();
  for (const l of listings) {
    const key = `${l.brand}|${l.model}`;
    const group = groups.get(key) ?? [];
    group.push(l);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      for (const l of group) l.dealScore = 55;
      continue;
    }

    const versionSubs = new Map<string, Listing[]>();
    for (const l of group) {
      const vKey = normalizeVersion(l.version);
      const sub = versionSubs.get(vKey) ?? [];
      sub.push(l);
      versionSubs.set(vKey, sub);
    }

    const reg = linearRegression(
      group
        .filter((l) => l.year > 0)
        .map((l) => ({ x: l.year, y: l.priceArs }))
    );

    for (const l of group) {
      const vKey = normalizeVersion(l.version);
      const subgroup = versionSubs.get(vKey) ?? [];

      const marketScore =
        subgroup.length >= MIN_SUBGROUP
          ? scoreListingInGroup(l, subgroup)
          : scoreListingWithRegression(l, reg);

      const final =
        marketScore +
        completenessScore(l) * 0.1 +
        50 * 0.1 +
        trustScore(l) * 0.05;

      l.dealScore = Math.round(Math.max(10, Math.min(98, final)));
    }
  }
}
