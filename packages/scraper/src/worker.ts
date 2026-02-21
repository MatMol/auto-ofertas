import { fetchMercadoLibreListings } from "./sources/mercadolibre";
import { fetchDeMotoresListings } from "./sources/demotores";
import { fetchAutocosmosListings } from "./sources/autocosmos";
import { fetchKavakListings } from "./sources/kavak";
import { normalizeListings } from "./normalizer";
import { calculateDealScores } from "./scorer";
import type { RawListing } from "./types";

export interface Env {
  DB: D1Database;
  ML_APP_TOKEN: string;
  USD_RATE?: string;
}

async function ingestListings(env: Env) {
  const usdRate = Number(env.USD_RATE) || 1180;

  console.log("[Ingester] Starting ingestion run...");

  const results: { source: string; raw: RawListing[] }[] = [];

  try {
    console.log("[ML] Fetching MercadoLibre...");
    const mlRaw = await fetchMercadoLibreListings(env.ML_APP_TOKEN);
    results.push({ source: "mercadolibre", raw: mlRaw });
    console.log(`[ML] Got ${mlRaw.length} listings`);
  } catch (e) {
    console.error("[ML] Error:", e);
  }

  try {
    console.log("[DM] Fetching DeMotores...");
    const dmRaw = await fetchDeMotoresListings();
    results.push({ source: "demotores", raw: dmRaw });
    console.log(`[DM] Got ${dmRaw.length} listings`);
  } catch (e) {
    console.error("[DM] Error:", e);
  }

  try {
    console.log("[AC] Fetching Autocosmos...");
    const acRaw = await fetchAutocosmosListings();
    results.push({ source: "autocosmos", raw: acRaw });
    console.log(`[AC] Got ${acRaw.length} listings`);
  } catch (e) {
    console.error("[AC] Error:", e);
  }

  try {
    console.log("[KV] Fetching Kavak...");
    const kvRaw = await fetchKavakListings();
    results.push({ source: "kavak", raw: kvRaw });
    console.log(`[KV] Got ${kvRaw.length} listings`);
  } catch (e) {
    console.error("[KV] Error:", e);
  }

  let totalInserted = 0;

  for (const { source, raw } of results) {
    const normalized = normalizeListings(source, raw, usdRate);
    const now = new Date().toISOString();

    for (const item of normalized) {
      try {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO listings (
            id, source, source_id, source_url, brand, model, version,
            year, is_new, price, price_usd, km, fuel_type, transmission,
            body_type, doors, is_imported, location, province, image_urls,
            seller_type, verification_badge, accepts_swap, has_financing,
            deal_score, consumption, tank_capacity, created_at, updated_at, is_active
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
          )`
        )
          .bind(
            item.id,
            item.source,
            item.sourceId,
            item.sourceUrl,
            item.brand,
            item.model,
            item.version,
            item.year,
            item.isNew ? 1 : 0,
            item.price,
            item.priceUsd,
            item.km,
            item.fuelType,
            item.transmission,
            item.bodyType,
            item.doors,
            item.isImported ? 1 : 0,
            item.location,
            item.province,
            JSON.stringify(item.imageUrls),
            item.sellerType,
            item.verificationBadge,
            item.acceptsSwap ? 1 : 0,
            item.hasFinancing ? 1 : 0,
            0,
            item.consumption,
            item.tankCapacity,
            now,
            now,
            1
          )
          .run();
        totalInserted++;
      } catch (e) {
        console.error(`[DB] Error inserting ${item.id}:`, e);
      }
    }
  }

  console.log(`[Ingester] Inserted/updated ${totalInserted} listings`);
}

async function recalculateScores(env: Env) {
  console.log("[Scorer] Recalculating deal scores...");

  const { results: rows } = await env.DB.prepare(
    `SELECT id, brand, model, year, price, km, image_urls, version,
            fuel_type, transmission, source, verification_badge, seller_type, created_at
     FROM listings WHERE is_active = 1`
  ).all();

  if (!rows || rows.length === 0) {
    console.log("[Scorer] No active listings found");
    return;
  }

  const listingsForScoring = rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    brand: r.brand as string,
    model: r.model as string,
    year: r.year as number,
    price: r.price as number,
    km: r.km as number,
    imageUrls: JSON.parse((r.image_urls as string) || "[]") as string[],
    version: r.version as string | null,
    fuelType: r.fuel_type as string | null,
    transmission: r.transmission as string | null,
    source: r.source as string,
    verificationBadge: r.verification_badge as string | null,
    sellerType: r.seller_type as string,
    createdAt: r.created_at as string,
  }));

  const scores = calculateDealScores(listingsForScoring);

  const batch: D1PreparedStatement[] = [];
  for (const [id, score] of scores) {
    batch.push(
      env.DB.prepare("UPDATE listings SET deal_score = ? WHERE id = ?").bind(
        score,
        id
      )
    );
  }

  if (batch.length > 0) {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      await env.DB.batch(batch.slice(i, i + CHUNK_SIZE));
    }
  }

  console.log(`[Scorer] Updated scores for ${scores.size} listings`);
}

async function cleanupInactive(env: Env) {
  console.log("[Cleanup] Removing old inactive listings...");
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000
  ).toISOString();

  await env.DB.prepare(
    "DELETE FROM listings WHERE is_active = 0 AND updated_at < ?"
  )
    .bind(threeDaysAgo)
    .run();

  console.log("[Cleanup] Done");
}

async function updateBrandsModels(env: Env) {
  console.log("[BrandsModels] Updating brands_models table...");

  await env.DB.prepare("DELETE FROM brands_models").run();

  await env.DB.prepare(
    `INSERT INTO brands_models (id, brand, model, count)
     SELECT brand || '-' || model, brand, model, COUNT(*) as count
     FROM listings WHERE is_active = 1
     GROUP BY brand, model`
  ).run();

  console.log("[BrandsModels] Done");
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ) {
    const cronName = controller.cron;

    switch (cronName) {
      case "0 */2 * * *":
        // Every 2 hours: ingest new listings
        await ingestListings(env);
        break;
      case "0 */6 * * *":
        // Every 6 hours: recalculate scores
        await recalculateScores(env);
        await updateBrandsModels(env);
        break;
      case "0 3 * * *":
        // Daily at 3 AM: cleanup
        await cleanupInactive(env);
        break;
      default:
        await ingestListings(env);
        await recalculateScores(env);
        await updateBrandsModels(env);
    }
  },

  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === "/run" && request.method === "POST") {
      await ingestListings(env);
      await recalculateScores(env);
      await updateBrandsModels(env);
      return new Response("OK", { status: 200 });
    }

    return new Response("AutoOfertas Scraper Worker", { status: 200 });
  },
};
