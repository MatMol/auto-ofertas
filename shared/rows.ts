import type { ListingRecord as Listing } from "./listing";
export function rowToListing(r: Record<string, unknown>): Listing {
  const json = (v: unknown): string[] => {
    try {
      const x = JSON.parse(String(v || "[]"));
      return Array.isArray(x) ? x.filter((a) => typeof a === "string") : [];
    } catch {
      return [];
    }
  };
  return {
    id: String(r.id),
    source: String(r.source),
    sourceId: String(r.source_id),
    sourceUrl: String(r.source_url),
    brand: String(r.brand),
    model: String(r.model),
    version: r.version as string | null,
    year: Number(r.year),
    isNew: r.is_new === 1,
    price: Number(r.price),
    currency: r.currency === "USD" ? "USD" : "ARS",
    priceArs: Number(r.price_ars) || 0,
    priceUsd: r.price_usd == null ? null : Number(r.price_usd),
    km: r.km_known === 1 ? Number(r.km) : null,
    fuelType: r.fuel_type as string | null,
    transmission: r.transmission as string | null,
    bodyType: r.body_type as string | null,
    doors: r.doors as number | null,
    isImported: r.is_imported === 1,
    location: String(r.location),
    province: String(r.province),
    imageUrls: json(r.image_urls),
    sellerType:
      r.seller_type === "concesionaria" ? "concesionaria" : "particular",
    verificationBadge: r.verification_badge as string | null,
    acceptsSwap: r.accepts_swap === 1,
    hasFinancing: r.has_financing === 1,
    dealScore: Number(r.deal_score),
    consumption: r.consumption as number | null,
    tankCapacity: r.tank_capacity as number | null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    isActive: r.is_active === 1,
    priceKind: (r.price_kind as Listing["priceKind"]) || "unknown",
    usdRate: r.usd_rate as number | null,
    rateDate: r.rate_date as string | null,
    scoreConfidence:
      (r.score_confidence as Listing["scoreConfidence"]) || "insufficient",
    comparableCount: Number(r.comparable_count) || 0,
    referencePrice: r.reference_price as number | null,
    inferredFields: json(r.inferred_fields),
    duplicateGroup: r.duplicate_group as string | null,
  };
}
