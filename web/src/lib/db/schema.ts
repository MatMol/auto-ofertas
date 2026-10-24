import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    sourceId: text("source_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    version: text("version"),
    year: integer("year").notNull(),
    isNew: integer("is_new", { mode: "boolean" }).notNull().default(false),
    price: real("price").notNull(),
    priceUsd: real("price_usd"),
    currency: text("currency").notNull().default("ARS"),
    priceArs: real("price_ars"),
    priceKind: text("price_kind").notNull().default("unknown"),
    kmKnown: integer("km_known", { mode: "boolean" }).notNull().default(true),
    usdRate: real("usd_rate"),
    rateDate: text("rate_date"),
    scoreConfidence: text("score_confidence").notNull().default("insufficient"),
    comparableCount: integer("comparable_count").notNull().default(0),
    referencePrice: real("reference_price"),
    inferredFields: text("inferred_fields").notNull().default("[]"),
    duplicateGroup: text("duplicate_group"),
    km: integer("km").notNull().default(0),
    fuelType: text("fuel_type"),
    transmission: text("transmission"),
    bodyType: text("body_type"),
    doors: integer("doors"),
    isImported: integer("is_imported", { mode: "boolean" })
      .notNull()
      .default(false),
    location: text("location").notNull(),
    province: text("province").notNull(),
    imageUrls: text("image_urls").notNull().default("[]"),
    sellerType: text("seller_type").notNull().default("particular"),
    verificationBadge: text("verification_badge"),
    acceptsSwap: integer("accepts_swap", { mode: "boolean" })
      .notNull()
      .default(false),
    hasFinancing: integer("has_financing", { mode: "boolean" })
      .notNull()
      .default(false),
    dealScore: real("deal_score").notNull().default(0),
    consumption: real("consumption"),
    tankCapacity: real("tank_capacity"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    index("idx_listings_brand").on(table.brand),
    index("idx_listings_year").on(table.year),
    index("idx_listings_price").on(table.price),
    index("idx_listings_province").on(table.province),
    index("idx_listings_fuel_type").on(table.fuelType),
    index("idx_listings_transmission").on(table.transmission),
    index("idx_listings_body_type").on(table.bodyType),
    index("idx_listings_seller_type").on(table.sellerType),
    index("idx_listings_deal_score").on(table.dealScore),
    index("idx_listings_km").on(table.km),
    index("idx_listings_search").on(
      table.isActive,
      table.brand,
      table.year,
      table.price,
    ),
    index("idx_listings_source").on(table.source, table.sourceId),
    index("idx_listings_eligible_price").on(
      table.isActive,
      table.priceKind,
      table.priceArs,
      table.id,
    ),
    index("idx_listings_comparables").on(
      table.brand,
      table.model,
      table.year,
      table.priceKind,
    ),
  ],
);

export const referencePrices = sqliteTable("reference_prices", {
  id: text("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  version: text("version"),
  year: integer("year").notNull(),
  avgPrice: real("avg_price").notNull(),
  minPrice: real("min_price").notNull(),
  maxPrice: real("max_price").notNull(),
  sampleSize: integer("sample_size").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const brandsModels = sqliteTable("brands_models", {
  id: text("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  count: integer("count").notNull().default(0),
});

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listingId: text("listing_id").notNull(),
    price: real("price").notNull(),
    currency: text("currency").notNull(),
    priceKind: text("price_kind").notNull(),
    observedAt: text("observed_at").notNull(),
  },
  (table) => [
    index("idx_history_listing").on(table.listingId, table.observedAt),
  ],
);
export const scrapeRuns = sqliteTable(
  "scrape_runs",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    status: text("status").notNull(),
    found: integer("found").notNull().default(0),
    written: integer("written").notNull().default(0),
    rejected: integer("rejected").notNull().default(0),
    error: text("error"),
  },
  (table) => [index("idx_runs_source").on(table.source, table.startedAt)],
);
