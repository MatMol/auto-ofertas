import { rowToListing as mapRow } from "../../../../shared/rows";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Listing, SearchFilters } from "@/lib/types";

async function getDB(): Promise<D1Database> {
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { DB: D1Database }).DB;
}

function rowToListing(r: Record<string, unknown>): Listing {
  return mapRow(r) as Listing;
}

const SORT_MAP: Record<string, string> = {
  deal_score:
    "(score_confidence != 'insufficient') DESC, deal_score DESC, id ASC",
  price_asc: "price_ars ASC, id ASC",
  price_desc: "price_ars DESC, id ASC",
  km_asc: "km_known DESC, km ASC, id ASC",
  newest: "created_at DESC, id ASC",
};

export async function getListings(
  filters: SearchFilters,
): Promise<{ listings: Listing[]; total: number }> {
  const db = await getDB();
  const conditions: string[] = ["is_active = 1"];
  const params: unknown[] = [];

  if (!filters.includeUnconfirmed)
    conditions.push("price_kind = 'total' AND price_ars > 0");
  if (filters.isNew !== undefined) {
    conditions.push("is_new = ?");
    params.push(+filters.isNew);
  }
  if (filters.query)
    for (const token of filters.query.split(/\s+/).filter(Boolean)) {
      conditions.push(
        "(brand || ' ' || model || ' ' || COALESCE(version, '') || ' ' || year || ' ' || COALESCE(fuel_type, '') || ' ' || COALESCE(transmission, '')) LIKE ? ESCAPE '\\'",
      );
      params.push(`%${token.replace(/[\\%_]/g, "\\$&")}%`);
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
    conditions.push("km_known = 1 AND km >= ?");
    params.push(filters.kmMin);
  }
  if (filters.kmMax !== undefined) {
    conditions.push("km_known = 1 AND km <= ?");
    params.push(filters.kmMax);
  }
  if (filters.provinces?.length) {
    conditions.push(
      `province IN (${filters.provinces.map(() => "?").join(",")})`,
    );
    params.push(...filters.provinces);
  }
  if (filters.fuelTypes?.length) {
    conditions.push(
      `fuel_type IN (${filters.fuelTypes.map(() => "?").join(",")})`,
    );
    params.push(...filters.fuelTypes);
  }
  if (filters.transmissions?.length) {
    conditions.push(
      `transmission IN (${filters.transmissions.map(() => "?").join(",")})`,
    );
    params.push(...filters.transmissions);
  }
  if (filters.bodyTypes?.length) {
    conditions.push(
      `body_type IN (${filters.bodyTypes.map(() => "?").join(",")})`,
    );
    params.push(...filters.bodyTypes);
  }
  if (filters.sellerTypes?.length) {
    conditions.push(
      `seller_type IN (${filters.sellerTypes.map(() => "?").join(",")})`,
    );
    params.push(...filters.sellerTypes);
  }
  if (filters.sources?.length) {
    conditions.push(`source IN (${filters.sources.map(() => "?").join(",")})`);
    params.push(...filters.sources);
  }
  if (filters.verifiedOnly) {
    conditions.push("verification_badge IN ('kavak_verified', 'ml_verified')");
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
  const orderBy =
    SORT_MAP[filters.sortBy ?? "deal_score"] ??
    "(score_confidence != 'insufficient') DESC, deal_score DESC, id ASC";
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const offset = (page - 1) * pageSize;

  const countResult = await db
    .prepare(`SELECT COUNT(*) as cnt FROM listings WHERE ${where}`)
    .bind(...params)
    .first<{ cnt: number }>();

  const total = countResult?.cnt ?? 0;

  const { results } = await db
    .prepare(
      `SELECT * FROM listings WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    )
    .bind(...params, pageSize, offset)
    .all();

  const listings = (results ?? []).map((r) =>
    rowToListing(r as Record<string, unknown>),
  );

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
  limit = 4,
): Promise<Listing[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT * FROM listings
       WHERE is_active = 1 AND price_kind = 'total' AND brand = ? AND model = ? AND id != ?
       ORDER BY deal_score DESC LIMIT ?`,
    )
    .bind(brand, model, excludeId, limit)
    .all();

  return (results ?? []).map((r) => rowToListing(r as Record<string, unknown>));
}

export async function getTopListings(options: {
  isNew?: boolean;
  limit?: number;
  sortBy?: string;
}): Promise<Listing[]> {
  const db = await getDB();
  const conditions = ["is_active = 1", "price_kind = 'total'", "price_ars > 0"];
  const params: unknown[] = [];

  if (options.sortBy !== "newest")
    conditions.push("score_confidence != 'insufficient'");

  if (options.isNew !== undefined) {
    conditions.push("is_new = ?");
    params.push(options.isNew ? 1 : 0);
  }

  const orderBy =
    SORT_MAP[options.sortBy ?? "deal_score"] ??
    "(score_confidence != 'insufficient') DESC, deal_score DESC, id ASC";
  const limit = options.limit ?? 6;

  const { results } = await db
    .prepare(
      `SELECT * FROM listings WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy} LIMIT ?`,
    )
    .bind(...params, limit)
    .all();

  return (results ?? []).map((r) => rowToListing(r as Record<string, unknown>));
}

export async function getBrands(): Promise<{ brand: string; count: number }[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      "SELECT brand, COUNT(*) as count FROM listings WHERE is_active = 1 AND price_kind = 'total' GROUP BY brand ORDER BY COUNT(*) DESC",
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
    db
      .prepare(
        "SELECT * FROM listings WHERE is_active = 1 AND price_kind = 'total' AND score_confidence != 'insufficient' ORDER BY deal_score DESC LIMIT 5",
      )
      .all(),
    db
      .prepare(
        "SELECT * FROM listings WHERE is_active = 1 AND price_kind = 'total' ORDER BY price_ars ASC LIMIT 5",
      )
      .all(),
    db
      .prepare(
        "SELECT * FROM listings WHERE is_active = 1 AND price_kind = 'total' AND is_new = 0 AND km > 0 ORDER BY km ASC LIMIT 5",
      )
      .all(),
    db
      .prepare(
        "SELECT * FROM listings WHERE is_active = 1 AND price_kind = 'total' AND is_new = 1 AND score_confidence != 'insufficient' ORDER BY deal_score DESC LIMIT 5",
      )
      .all(),
    db
      .prepare(
        "SELECT * FROM listings WHERE is_active = 1 AND price_kind = 'total' AND score_confidence != 'insufficient' AND body_type = 'sedan' ORDER BY deal_score DESC LIMIT 5",
      )
      .all(),
    db
      .prepare(
        "SELECT * FROM listings WHERE is_active = 1 AND price_kind = 'total' AND score_confidence != 'insufficient' AND body_type = 'suv' ORDER BY deal_score DESC LIMIT 5",
      )
      .all(),
    db
      .prepare(
        "SELECT * FROM listings WHERE is_active = 1 AND price_kind = 'total' AND score_confidence != 'insufficient' AND body_type = 'pickup' ORDER BY deal_score DESC LIMIT 5",
      )
      .all(),
  ];

  const [
    topDeals,
    lowestPrice,
    lowestKmUsed,
    best0km,
    sedanDeals,
    suvDeals,
    pickupDeals,
  ] = await Promise.all(queries);

  const mapResults = (r: D1Result<Record<string, unknown>>) =>
    (r.results ?? []).map((row: Record<string, unknown>) => rowToListing(row));

  return {
    topDeals: mapResults(topDeals),
    lowestPrice: mapResults(lowestPrice),
    lowestKmUsed: mapResults(lowestKmUsed),
    best0km: mapResults(best0km),
    sedanDeals: mapResults(sedanDeals),
    suvDeals: mapResults(suvDeals),
    pickupDeals: mapResults(pickupDeals),
  };
}

export async function getModels(brands: string[] = []): Promise<string[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT DISTINCT model FROM listings WHERE is_active=1 AND price_kind='total' ${brands.length ? `AND brand IN (${brands.map(() => "?").join(",")})` : ""} ORDER BY model`,
    )
    .bind(...brands)
    .all<{ model: string }>();
  return results.map((r) => r.model);
}
export async function getPriceHistory(id: string) {
  const db = await getDB();
  const { results } = await db
    .prepare(
      "SELECT price,currency,price_kind,observed_at FROM price_history WHERE listing_id=? ORDER BY observed_at DESC,id DESC LIMIT 100",
    )
    .bind(id)
    .all<{
      price: number;
      currency: "ARS" | "USD";
      price_kind: string;
      observed_at: string;
    }>();
  return results;
}
export async function getSourceHealth() {
  const db = await getDB();
  const { results } = await db
    .prepare(
      "SELECT source, MAX(CASE WHEN status='success' THEN finished_at END) AS last_success, MAX(started_at) AS last_attempt FROM scrape_runs GROUP BY source",
    )
    .all<{
      source: string;
      last_success: string | null;
      last_attempt: string;
    }>();
  return results;
}
export async function getPossibleDuplicates(id: string, group: string) {
  const db = await getDB();
  const { results } = await db
    .prepare(
      "SELECT * FROM listings WHERE duplicate_group=? AND id!=? AND is_active=1 LIMIT 6",
    )
    .bind(group, id)
    .all();
  return results.map(rowToListing);
}
