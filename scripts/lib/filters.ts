import type { Listing } from "./types.js";

const ANTICIPO_KEYWORDS = [
  "cuota", "anticipo", "plan ", "solo con dni", "retiralo", "retíralo",
  "adjudic", "reserv", "financiacion", "financiación", "entrega inmediata",
  "uber", "cabify", "aplicaciones", "promo ",
];

export function filterSuspiciousListings(listings: Listing[]): Listing[] {
  const groups = new Map<string, number[]>();
  for (const l of listings) {
    const key = `${l.brand}|${l.model}`;
    const arr = groups.get(key) ?? [];
    arr.push(l.priceArs);
    groups.set(key, arr);
  }

  const medians = new Map<string, number>();
  for (const [key, prices] of groups) {
    if (prices.length < 3) continue;
    const sorted = [...prices].sort((a, b) => a - b);
    medians.set(key, sorted[Math.floor(sorted.length / 2)]);
  }

  return listings.filter((l) => {
    const key = `${l.brand}|${l.model}`;
    const median = medians.get(key);
    const fullText =
      `${l.model} ${l.version ?? ""} ${l.sourceUrl}`.toLowerCase();
    const isSuspicious = ANTICIPO_KEYWORDS.some((kw) =>
      fullText.includes(kw)
    );

    if (isSuspicious && (!median || l.priceArs < median * 0.5)) return false;
    if (median && groups.get(key)!.length >= 5 && l.priceArs / median < 0.3)
      return false;
    if (l.isNew && median && l.priceArs / median < 0.4) return false;
    return true;
  });
}
