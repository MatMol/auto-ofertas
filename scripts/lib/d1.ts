import type { Listing } from "./types.js";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const DB_ID = process.env.D1_DATABASE_ID!;

const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

const BATCH_SIZE = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function validateEnv(): void {
  if (!ACCOUNT_ID || !API_TOKEN || !DB_ID) {
    console.error(
      "Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID"
    );
    process.exit(1);
  }
}

export async function queryD1(
  sql: string,
  params: unknown[] = []
): Promise<unknown> {
  const res = await fetch(D1_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API error ${res.status}: ${text}`);
  }
  return res.json();
}

const COLUMNS = `id, source, source_id, source_url, brand, model, version,
  year, is_new, price, currency, price_ars, price_usd, km,
  fuel_type, transmission, body_type, doors, is_imported,
  location, province, image_urls, seller_type, verification_badge,
  accepts_swap, has_financing, deal_score, consumption, tank_capacity,
  created_at, updated_at, is_active`;

const PLACEHOLDERS_ONE = `(${Array(32).fill("?").join(",")})`;

function listingToParams(l: Listing, now: string): unknown[] {
  return [
    l.id, l.source, l.sourceId, l.sourceUrl, l.brand, l.model, l.version,
    l.year, l.isNew ? 1 : 0, l.price, l.currency, l.priceArs, l.priceUsd,
    l.km, l.fuelType, l.transmission, l.bodyType, l.doors,
    l.isImported ? 1 : 0, l.location, l.province,
    JSON.stringify(l.imageUrls), l.sellerType, l.verificationBadge,
    l.acceptsSwap ? 1 : 0, l.hasFinancing ? 1 : 0, l.dealScore,
    l.consumption, l.tankCapacity, now, now, 1,
  ];
}

export async function insertListings(listings: Listing[]): Promise<number> {
  let inserted = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => PLACEHOLDERS_ONE).join(",");
    const allParams = batch.flatMap((l) => listingToParams(l, now));

    try {
      await queryD1(
        `INSERT OR REPLACE INTO listings (${COLUMNS}) VALUES ${placeholders}`,
        allParams
      );
      inserted += batch.length;
    } catch (err) {
      console.error(
        `  Batch error at offset ${i}, falling back to individual inserts:`,
        err
      );
      for (const l of batch) {
        try {
          await queryD1(
            `INSERT OR REPLACE INTO listings (${COLUMNS}) VALUES ${PLACEHOLDERS_ONE}`,
            listingToParams(l, now)
          );
          inserted++;
        } catch (e2) {
          console.error(`  Error inserting ${l.id}:`, e2);
        }
      }
    }

    const progress = Math.min(i + BATCH_SIZE, listings.length);
    process.stdout.write(`\r  ${progress}/${listings.length} written...`);

    if (i + BATCH_SIZE < listings.length) await sleep(100);
  }

  console.log();
  return inserted;
}

export async function updateBrandsModels(): Promise<void> {
  await queryD1("DELETE FROM brands_models");
  await queryD1(
    `INSERT INTO brands_models (id, brand, model, count)
     SELECT brand || '-' || model, brand, model, COUNT(*) as count
     FROM listings WHERE is_active = 1
     GROUP BY brand, model`
  );
}
