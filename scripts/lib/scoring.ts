import type { Listing } from "./types.js";

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

    const avgPrice =
      group.reduce((s, l) => s + l.priceArs, 0) / group.length;
    const avgKm = group.reduce((s, l) => s + l.km, 0) / group.length;

    for (const l of group) {
      const priceRatio = avgPrice > 0 ? l.priceArs / avgPrice : 1;
      const priceScore = Math.max(0, Math.min(100, (2 - priceRatio) * 50));

      const kmRatio = avgKm > 0 ? l.km / avgKm : 1;
      const kmScore = l.isNew
        ? 90
        : Math.max(0, Math.min(100, (2 - kmRatio) * 50));

      const pricePerKm = l.km > 0 ? l.priceArs / l.km : l.priceArs;
      const groupPpkm = group
        .filter((g) => g.km > 0)
        .map((g) => g.priceArs / g.km);
      const avgPpkm =
        groupPpkm.length > 0
          ? groupPpkm.reduce((a, b) => a + b, 0) / groupPpkm.length
          : pricePerKm;
      const ppkmRatio = avgPpkm > 0 ? pricePerKm / avgPpkm : 1;
      const ppkmScore = Math.max(0, Math.min(100, (2 - ppkmRatio) * 50));

      let completeness = 0;
      if (l.imageUrls.length > 0) completeness += 40;
      if (l.version) completeness += 25;
      if (l.fuelType) completeness += 15;
      if (l.transmission) completeness += 10;
      if (l.bodyType) completeness += 10;

      const trusted =
        l.verificationBadge === "ml_verified"
          ? 80
          : l.verificationBadge === "concesionaria"
            ? 65
            : l.sellerType === "concesionaria"
              ? 55
              : 35;

      const score =
        priceScore * 0.4 +
        kmScore * 0.2 +
        ppkmScore * 0.15 +
        completeness * 0.1 +
        50 * 0.1 +
        trusted * 0.05;

      l.dealScore = Math.round(Math.max(10, Math.min(98, score)));
    }
  }
}
