import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Listing, SearchFilters } from "@/lib/types";

async function getDB(): Promise<D1Database> {
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { DB: D1Database }).DB;
}

function rowToListing(r: Record<string, unknown>): Listing {
  return {
    id: r.id as string,
    source: r.source as Listing["source"],
    sourceId: r.source_id as string,
    sourceUrl: r.source_url as string,
    brand: r.brand as string,
    model: r.model as string,
    version: (r.version as string) ?? null,
    year: r.year as number,
    isNew: r.is_new === 1,
    price: r.price as number,
    currency: (r.currency as Listing["currency"]) ?? "ARS",
    priceArs: (r.price_ars as number) ?? (r.price as number),
    priceUsd: (r.price_usd as number) ?? null,
    km: r.km as number,
    fuelType: (r.fuel_type as Listing["fuelType"]) ?? null,
    transmission: (r.transmission as Listing["transmission"]) ?? null,
    bodyType: (r.body_type as Listing["bodyType"]) ?? null,
    doors: (r.doors as number) ?? null,
    isImported: r.is_imported === 1,
    location: r.location as string,
    province: r.province as string,
    imageUrls: JSON.parse((r.image_urls as string) || "[]"),
    sellerType: (r.seller_type as Listing["sellerType"]) ?? "particular",
    verificationBadge: (r.verification_badge as Listing["verificationBadge"]) ?? null,
    acceptsSwap: r.accepts_swap === 1,
    hasFinancing: r.has_financing === 1,
    dealScore: r.deal_score as number,
    consumption: (r.consumption as number) ?? null,
    tankCapacity: (r.tank_capacity as number) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    isActive: r.is_active === 1,
  };
}

const SORT_MAP: Record<string, string> = {
  deal_score: "deal_score DESC",
  price_asc: "price_ars ASC",
  price_desc: "price_ars DESC",
  km_asc: "km ASC",
  newest: "created_at DESC",
  price_per_km: "CASE WHEN km > 0 THEN price_ars / km ELSE 999999999 END ASC",
};

export async function getListings(
  filters: SearchFilters
): Promise<{ listings: Listing[]; total: number }> {
  const db = await getDB();
  const conditions: string[] = ["is_active = 1"];
  const params: unknown[] = [];

  if (filters.query) {
    conditions.push("(brand || ' ' || model || ' ' || COALESCE(version, '')) LIKE ?");
    params.push(`%${filters.query}%`);
  }
  if (filters.brands?.length) {
    conditions.push(`brand IN (${filters.brands.map(() => "?").join(",")})`);
    params.push(...filters.brands);
  }
  if (filters.models?.length) {
    conditions.push(`model IN (${filters.models.map(() => "?").join(",")})`);
    params.push(...filters.models);
  }
  if (filters.yearMin) {
    conditions.push("year >= ?");
    params.push(filters.yearMin);
  }
  if (filters.yearMax) {
    conditions.push("year <= ?");
    params.push(filters.yearMax);
  }
  if (filters.priceMin) {
    conditions.push("price_ars >= ?");
    params.push(filters.priceMin);
  }
  if (filters.priceMax) {
    conditions.push("price_ars <= ?");
    params.push(filters.priceMax);
  }
  if (filters.kmMin) {
    conditions.push("km >= ?");
    params.push(filters.kmMin);
  }
  if (filters.kmMax !== undefined) {
    conditions.push("km <= ?");
    params.push(filters.kmMax);
  }
  if (filters.provinces?.length) {
    conditions.push(`province IN (${filters.provinces.map(() => "?").join(",")})`);
    params.push(...filters.provinces);
  }
  if (filters.fuelTypes?.length) {
    conditions.push(`fuel_type IN (${filters.fuelTypes.map(() => "?").join(",")})`);
    params.push(...filters.fuelTypes);
  }
  if (filters.transmissions?.length) {
    conditions.push(`transmission IN (${filters.transmissions.map(() => "?").join(",")})`);
    params.push(...filters.transmissions);
  }
  if (filters.bodyTypes?.length) {
    conditions.push(`body_type IN (${filters.bodyTypes.map(() => "?").join(",")})`);
    params.push(...filters.bodyTypes);
  }
  if (filters.sellerTypes?.length) {
    conditions.push(`seller_type IN (${filters.sellerTypes.map(() => "?").join(",")})`);
    params.push(...filters.sellerTypes);
  }
  if (filters.sources?.length) {
    conditions.push(`source IN (${filters.sources.map(() => "?").join(",")})`);
    params.push(...filters.sources);
  }
  if (filters.verifiedOnly) {
    conditions.push("verification_badge IS NOT NULL");
  }
  if (filters.acceptsSwap) {
    conditions.push("accepts_swap = 1");
  }
  if (filters.hasFinancing) {
    conditions.push("has_financing = 1");
  }
  if (filters.dealScoreMin) {
    conditions.push("deal_score >= ?");
    params.push(filters.dealScoreMin);
  }

  const where = conditions.join(" AND ");
  const orderBy = SORT_MAP[filters.sortBy ?? "deal_score"] ?? "deal_score DESC";
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const offset = (page - 1) * pageSize;

  const countResult = await db
    .prepare(`SELECT COUNT(*) as cnt FROM listings WHERE ${where}`)
    .bind(...params)
    .first<{ cnt: number }>();

  const total = countResult?.cnt ?? 0;

  const { results } = await db
    .prepare(`SELECT * FROM listings WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .bind(...params, pageSize, offset)
    .all();

  const listings = (results ?? []).map((r) => rowToListing(r as Record<string, unknown>));

  return { listings, total };
}

export async function getListingById(id: string): Promise<Listing | null> {
  const db = await getDB();
  const row = await db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .bind(id)
    .first();

  if (!row) return null;
  return rowToListing(row as Record<string, unknown>);
}

export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  const db = await getDB();
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await db
    .prepare(`SELECT * FROM listings WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all();

  return (results ?? []).map((r) => rowToListing(r as Record<string, unknown>));
}

export async function getSimilarListings(
  brand: string,
  model: string,
  excludeId: string,
  limit = 4
): Promise<Listing[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT * FROM listings
       WHERE is_active = 1 AND brand = ? AND model = ? AND id != ?
       ORDER BY deal_score DESC LIMIT ?`
    )
    .bind(brand, model, excludeId, limit)
    .all();

  return (results ?? []).map((r) => rowToListing(r as Record<string, unknown>));
}

export async function getAvgPriceArs(
  brand: string,
  model: string,
  year?: number
): Promise<number> {
  const db = await getDB();

  if (year && year > 0) {
    const row = await db
      .prepare(
        "SELECT AVG(price_ars) as avg_price FROM listings WHERE is_active = 1 AND brand = ? AND model = ? AND year BETWEEN ? AND ?"
      )
      .bind(brand, model, year - 2, year + 2)
      .first<{ avg_price: number | null }>();

    if (row?.avg_price) return row.avg_price;
  }

  const row = await db
    .prepare(
      "SELECT AVG(price_ars) as avg_price FROM listings WHERE is_active = 1 AND brand = ? AND model = ?"
    )
    .bind(brand, model)
    .first<{ avg_price: number | null }>();

  return row?.avg_price ?? 0;
}

export async function getTopListings(
  options: { isNew?: boolean; limit?: number; sortBy?: string }
): Promise<Listing[]> {
  const db = await getDB();
  const conditions = ["is_active = 1"];
  const params: unknown[] = [];

  if (options.isNew !== undefined) {
    conditions.push("is_new = ?");
    params.push(options.isNew ? 1 : 0);
  }

  const orderBy = SORT_MAP[options.sortBy ?? "deal_score"] ?? "deal_score DESC";
  const limit = options.limit ?? 6;

  const { results } = await db
    .prepare(`SELECT * FROM listings WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy} LIMIT ?`)
    .bind(...params, limit)
    .all();

  return (results ?? []).map((r) => rowToListing(r as Record<string, unknown>));
}

export async function getBrands(): Promise<{ brand: string; count: number }[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      "SELECT brand, COUNT(*) as count FROM listings WHERE is_active = 1 GROUP BY brand ORDER BY COUNT(*) DESC"
    )
    .all();

  return (results ?? []).map((r: Record<string, unknown>) => ({
    brand: r.brand as string,
    count: r.count as number,
  }));
}

export async function getRankingData() {
  const db = await getDB();

  const queries = [
    db.prepare("SELECT * FROM listings WHERE is_active = 1 ORDER BY deal_score DESC LIMIT 5").all(),
    db.prepare("SELECT * FROM listings WHERE is_active = 1 AND km > 0 ORDER BY CASE WHEN km > 0 THEN price_ars / km ELSE 999999999 END ASC LIMIT 5").all(),
    db.prepare("SELECT * FROM listings WHERE is_active = 1 AND is_new = 0 AND km > 0 ORDER BY km ASC LIMIT 5").all(),
    db.prepare("SELECT * FROM listings WHERE is_active = 1 AND is_new = 1 ORDER BY deal_score DESC LIMIT 5").all(),
    db.prepare("SELECT * FROM listings WHERE is_active = 1 AND body_type = 'sedan' ORDER BY deal_score DESC LIMIT 5").all(),
    db.prepare("SELECT * FROM listings WHERE is_active = 1 AND body_type = 'suv' ORDER BY deal_score DESC LIMIT 5").all(),
    db.prepare("SELECT * FROM listings WHERE is_active = 1 AND body_type = 'pickup' ORDER BY deal_score DESC LIMIT 5").all(),
  ];

  const [topDeals, bestPricePerKm, lowestKmUsed, best0km, sedanDeals, suvDeals, pickupDeals] =
    await Promise.all(queries);

  const mapResults = (r: D1Result<Record<string, unknown>>) =>
    (r.results ?? []).map((row: Record<string, unknown>) => rowToListing(row));

  return {
    topDeals: mapResults(topDeals),
    bestPricePerKm: mapResults(bestPricePerKm),
    lowestKmUsed: mapResults(lowestKmUsed),
    best0km: mapResults(best0km),
    sedanDeals: mapResults(sedanDeals),
    suvDeals: mapResults(suvDeals),
    pickupDeals: mapResults(pickupDeals),
  };
}
