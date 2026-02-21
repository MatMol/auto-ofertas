export interface ListingForScoring {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  km: number;
  imageUrls: string[];
  version: string | null;
  fuelType: string | null;
  transmission: string | null;
  source: string;
  verificationBadge: string | null;
  sellerType: string;
  createdAt: string;
}

type GroupKey = string;

function groupKey(listing: ListingForScoring): GroupKey {
  return `${listing.brand}|${listing.model}|${listing.year}`;
}

interface GroupStats {
  avgPrice: number;
  avgKm: number;
  avgPricePerKm: number;
  count: number;
}

function computeGroupStats(listings: ListingForScoring[]): GroupStats {
  const valid = listings.filter((l) => l.price > 0);
  const count = valid.length;
  if (count === 0) {
    return { avgPrice: 0, avgKm: 0, avgPricePerKm: 0, count: 0 };
  }
  const avgPrice = valid.reduce((s, l) => s + l.price, 0) / count;
  const avgKm = valid.reduce((s, l) => s + l.km, 0) / count;
  const withKm = valid.filter((l) => l.km > 0);
  const avgPricePerKm =
    withKm.length > 0
      ? withKm.reduce((s, l) => s + l.price / l.km, 0) / withKm.length
      : 0;
  return { avgPrice, avgKm, avgPricePerKm, count };
}

/** Price vs market (40%): lower price = better. 0–100. */
export function scorePriceVsMarket(
  price: number,
  avgPrice: number,
  minPrice: number,
  maxPrice: number
): number {
  if (avgPrice <= 0 || price <= 0) return 50;
  const ratio = price / avgPrice;
  if (ratio <= 0.7) return 100;
  if (ratio >= 1.3) return 0;
  return Math.round(100 - ((ratio - 0.7) / 0.6) * 100);
}

/** Kilometers relative (20%): lower km = better. 0–100. */
export function scoreKilometersRelative(
  km: number,
  avgKm: number,
  minKm: number,
  maxKm: number
): number {
  if (avgKm <= 0) return 50;
  const ratio = km / avgKm;
  if (ratio <= 0.5) return 100;
  if (ratio >= 1.5) return 0;
  return Math.round(100 - ((ratio - 0.5) / 1) * 100);
}

/** Price per KM (15%): lower ratio = better. 0–100. */
export function scorePricePerKm(
  price: number,
  km: number,
  avgPricePerKm: number
): number {
  if (km <= 0 || avgPricePerKm <= 0) return 50;
  const ratio = (price / km) / avgPricePerKm;
  if (ratio <= 0.7) return 100;
  if (ratio >= 1.3) return 0;
  return Math.round(100 - ((ratio - 0.7) / 0.6) * 100);
}

/** Listing completeness (10%): images, version, fuel, transmission. 0–100. */
export function scoreCompleteness(listing: ListingForScoring): number {
  let score = 0;
  const imgCount = listing.imageUrls?.length ?? 0;
  if (imgCount >= 10) score += 30;
  else if (imgCount >= 5) score += 25;
  else if (imgCount >= 3) score += 20;
  else if (imgCount >= 1) score += 10;
  if (listing.version) score += 25;
  if (listing.fuelType) score += 25;
  if (listing.transmission) score += 20;
  return Math.min(100, score);
}

/** Freshness (10%): more recent = higher. 0–100. */
export function scoreFreshness(createdAt: string, nowMs: number): number {
  const created = new Date(createdAt).getTime();
  const ageDays = (nowMs - created) / (24 * 60 * 60 * 1000);
  if (ageDays <= 1) return 100;
  if (ageDays <= 7) return 90;
  if (ageDays <= 14) return 75;
  if (ageDays <= 30) return 55;
  if (ageDays <= 60) return 35;
  if (ageDays <= 90) return 20;
  return 5;
}

/** Trusted source (5%): Kavak/verified/concesionaria. 0–100. */
export function scoreTrustedSource(listing: ListingForScoring): number {
  const source = (listing.source ?? "").toLowerCase();
  const badge = (listing.verificationBadge ?? "").toString().toLowerCase();
  const seller = (listing.sellerType ?? "").toLowerCase();
  if (source === "kavak" || badge.includes("kavak")) return 100;
  if (badge && (badge.includes("verified") || badge.includes("verificado"))) return 85;
  if (seller.includes("concesionaria") || badge.includes("concesionaria")) return 70;
  return 40;
}

const WEIGHTS = {
  priceVsMarket: 0.4,
  kilometers: 0.2,
  pricePerKm: 0.15,
  completeness: 0.1,
  freshness: 0.1,
  trustedSource: 0.05,
};

export function calculateDealScores(listings: ListingForScoring[]): Map<string, number> {
  const result = new Map<string, number>();
  if (listings.length === 0) return result;

  const groups = new Map<GroupKey, ListingForScoring[]>();
  for (const l of listings) {
    const key = groupKey(l);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }

  const groupStats = new Map<GroupKey, GroupStats>();
  for (const [key, groupListings] of groups) {
    groupStats.set(key, computeGroupStats(groupListings));
  }

  const nowMs = Date.now();

  for (const listing of listings) {
    const key = groupKey(listing);
    const stats = groupStats.get(key)!;
    const groupListings = groups.get(key)!;

    const minPrice = Math.min(...groupListings.map((l) => l.price).filter((p) => p > 0), Infinity) || listing.price;
    const maxPrice = Math.max(...groupListings.map((l) => l.price), 0) || listing.price;
    const minKm = Math.min(...groupListings.map((l) => l.km).filter((k) => k > 0), Infinity) || listing.km;
    const maxKm = Math.max(...groupListings.map((l) => l.km), 0) || listing.km;

    const sPrice = scorePriceVsMarket(listing.price, stats.avgPrice, minPrice, maxPrice);
    const sKm = scoreKilometersRelative(listing.km, stats.avgKm, minKm, maxKm);
    const sPricePerKm = scorePricePerKm(listing.price, listing.km, stats.avgPricePerKm);
    const sCompleteness = scoreCompleteness(listing);
    const sFreshness = scoreFreshness(listing.createdAt, nowMs);
    const sTrusted = scoreTrustedSource(listing);

    const total =
      sPrice * WEIGHTS.priceVsMarket +
      sKm * WEIGHTS.kilometers +
      sPricePerKm * WEIGHTS.pricePerKm +
      sCompleteness * WEIGHTS.completeness +
      sFreshness * WEIGHTS.freshness +
      sTrusted * WEIGHTS.trustedSource;

    result.set(listing.id, Math.round(Math.max(0, Math.min(100, total))));
  }

  return result;
}
