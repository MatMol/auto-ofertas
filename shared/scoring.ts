import { normalizeText, type QualityFields } from "./quality";
export interface Scorable extends QualityFields {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  km: number | null;
  priceArs: number;
  isNew: boolean;
  dealScore: number;
  transmission?: string | null;
  fuelType?: string | null;
  isActive?: boolean;
}
export function median(values: number[]): number {
  const a = [...values].sort((a, b) => a - b),
    mid = Math.floor(a.length / 2);
  return a.length ? (a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2) : 0;
}
export function calculateScores<T extends Scorable>(listings: T[]): void {
  const groups = new Map<string, T[]>();
  for (const l of listings) {
    l.dealScore = 0;
    l.scoreConfidence = "insufficient";
    l.comparableCount = 0;
    l.referencePrice = null;
    if (
      l.priceKind !== "total" ||
      !Number.isFinite(l.priceArs) ||
      l.priceArs <= 0 ||
      l.year < 1950 ||
      l.isActive === false
    )
      continue;
    const key = normalizeText(
      `${l.brand}|${l.model}|${l.version ?? ""}|${l.isNew}`,
    );
    const group = groups.get(key) ?? [];
    group.push(l);
    groups.set(key, group);
  }
  for (const group of groups.values())
    for (const l of group) {
      if (!l.version || l.km === null) continue;
      const seen = new Set<string>();
      const peers = group.filter((p) => {
        if (
          p.id === l.id ||
          (p.duplicateGroup && p.duplicateGroup === l.duplicateGroup) ||
          p.km === null ||
          p.isNew !== l.isNew ||
          Math.abs(p.year - l.year) > 2
        )
          return false;
        if (
          l.transmission &&
          p.transmission &&
          p.transmission !== l.transmission
        )
          return false;
        if (l.fuelType && p.fuelType && p.fuelType !== l.fuelType) return false;
        if (Math.abs(p.km - l.km!) > Math.max(30_000, l.km! * 0.4))
          return false;
        const key = p.duplicateGroup || p.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const center = median(peers.map((p) => p.priceArs));
      const valid = peers.filter(
        (p) => p.priceArs >= center * 0.5 && p.priceArs <= center * 1.8,
      );
      l.comparableCount = valid.length;
      if (valid.length < 3) continue;
      const reference = median(valid.map((p) => p.priceArs));
      // Extreme discounts require review; never promote possible deposits or parsing errors.
      if (l.priceArs < reference * 0.5 || l.priceArs > reference * 2) continue;
      l.referencePrice = reference;
      l.scoreConfidence =
        valid.length >= 10 ? "high" : valid.length >= 5 ? "medium" : "low";
      l.dealScore = Math.round(
        Math.max(1, Math.min(99, 60 + (1 - l.priceArs / reference) * 150)),
      );
    }
}
