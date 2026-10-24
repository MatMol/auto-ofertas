import { rowToListing } from "../../shared/rows.js";
import type { Listing } from "./types.js";
import { fetchWithRetry } from "./http.js";
import { calculateScores } from "../../shared/scoring.js";
import { normalizeText } from "../../shared/quality.js";
export function validateEnv(): void {
  if (
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.CLOUDFLARE_API_TOKEN ||
    !process.env.D1_DATABASE_ID
  )
    throw new Error(
      "Configure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN and D1_DATABASE_ID",
    );
}
export interface D1Statement {
  sql: string;
  params: unknown[];
}
type D1Response = { result: { results: Record<string, unknown>[] }[] };
export async function queryD1(
  sql: string,
  params: unknown[] = [],
): Promise<D1Response> {
  return sendD1({ sql, params }, 1);
}
export async function batchD1(batch: D1Statement[]): Promise<D1Response> {
  if (!batch.length) return { result: [] };
  if (batch.length > 50) throw new Error("D1 batch exceeds 50 statements");
  return sendD1({ batch }, batch.length);
}
async function sendD1(
  body: D1Statement | { batch: D1Statement[] },
  expected: number,
): Promise<D1Response> {
  const response = await fetchWithRetry(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const data = (await response.json()) as {
    success: boolean;
    result?: { success?: boolean; results: Record<string, unknown>[] }[];
  };
  if (
    !data.success ||
    !Array.isArray(data.result) ||
    data.result.length !== expected ||
    data.result.some((r) => r.success !== true)
  )
    throw new Error(
      "D1 rejected or returned an incomplete query result; inspect database configuration and migrations",
    );
  return { result: data.result };
}
function progress(label: string, done: number, total: number, started: number) {
  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(
    `  ${label}: ${done}/${total} (${Math.round((done / total) * 100)}%) — ${elapsed}s`,
  );
}
const columns = [
  "id",
  "source",
  "source_id",
  "source_url",
  "brand",
  "model",
  "version",
  "year",
  "is_new",
  "price",
  "currency",
  "price_ars",
  "price_usd",
  "km",
  "fuel_type",
  "transmission",
  "body_type",
  "doors",
  "is_imported",
  "location",
  "province",
  "image_urls",
  "seller_type",
  "verification_badge",
  "accepts_swap",
  "has_financing",
  "deal_score",
  "consumption",
  "tank_capacity",
  "created_at",
  "updated_at",
  "is_active",
  "price_kind",
  "km_known",
  "usd_rate",
  "rate_date",
  "inferred_fields",
  "duplicate_group",
];
const mutable = columns.filter(
  (c) => !["id", "created_at", "deal_score"].includes(c),
);
export function upsertStatement(l: Listing, now: string) {
  const rate = Number(process.env.USD_RATE);
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error("Configure a positive USD_RATE before ingestion");
  const duplicateGroup =
    l.km === null || !l.version
      ? null
      : normalizeText(
          `${l.brand}|${l.model}|${l.version}|${l.year}|${l.km}|${l.province}`,
        );
  return {
    sql: `INSERT INTO listings (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${mutable.map((c) => `${c}=excluded.${c}`).join(",")},deal_score=0,score_confidence='insufficient',reference_price=NULL,comparable_count=0`,
    params: [
      l.id,
      l.source,
      l.sourceId,
      l.sourceUrl,
      l.brand,
      l.model,
      l.version,
      l.year,
      +l.isNew,
      l.price,
      l.currency,
      l.currency === "USD" ? Math.round(l.price * rate) : l.price,
      l.currency === "USD" ? l.price : Math.round(l.price / rate),
      l.km ?? 0,
      l.fuelType,
      l.transmission,
      l.bodyType,
      l.doors,
      +l.isImported,
      l.location,
      l.province,
      JSON.stringify(l.imageUrls),
      l.sellerType,
      l.verificationBadge,
      +l.acceptsSwap,
      +l.hasFinancing,
      0,
      l.consumption,
      l.tankCapacity,
      l.createdAt || now,
      now,
      1,
      l.priceKind ?? "unknown",
      +(l.km !== null),
      rate,
      process.env.USD_RATE_DATE || now,
      JSON.stringify(l.inferredFields ?? []),
      duplicateGroup,
    ],
  };
}
let written = 0,
  found = 0,
  rejected = 0;
export function recordCandidates(count: number, excluded: number) {
  found += count;
  rejected += excluded;
}
export async function insertListings(listings: Listing[]): Promise<number> {
  if (!found) found = listings.length;
  const started = Date.now();
  for (let i = 0; i < listings.length; i += 50) {
    const batch = listings.slice(i, i + 50);
    const now = new Date().toISOString();
    await batchD1(batch.map((l) => upsertStatement(l, now)));
    written += batch.length;
    progress("Guardados", i + batch.length, listings.length, started);
  }
  return listings.length;
}
export async function recalculateAllScores(): Promise<void> {
  console.log("Leyendo catálogo para recalcular puntajes...");
  const rows: Record<string, unknown>[] = [];
  let after = "";
  while (true) {
    const page = (
      await queryD1(
        "SELECT * FROM listings WHERE id > ? ORDER BY id LIMIT 500",
        [after],
      )
    ).result[0].results;
    rows.push(...page);
    console.log(`  Leídos: ${rows.length}`);
    if (page.length < 500) break;
    after = String(page.at(-1)!.id);
  }
  const listings = rows.map(rowToListing);
  console.log(`Calculando puntajes de ${listings.length} avisos...`);
  calculateScores(listings);
  const started = Date.now();
  for (let i = 0; i < listings.length; i += 50) {
    const batch = listings.slice(i, i + 50);
    await batchD1(
      batch.map((l) => ({
        sql: "UPDATE listings SET deal_score=?, score_confidence=?, comparable_count=?, reference_price=? WHERE id=? AND updated_at=?",
        params: [
          l.dealScore,
          l.scoreConfidence ?? "insufficient",
          l.comparableCount ?? 0,
          l.referencePrice ?? null,
          l.id,
          l.updatedAt,
        ],
      })),
    );
    progress("Puntajes procesados", i + batch.length, listings.length, started);
  }
}
export async function updateBrandsModels(): Promise<void> {
  // Read queries derive brands from listings; no destructive cache refresh needed.
  await recalculateAllScores();
}
export async function runTracked(
  source: string,
  main: () => Promise<void>,
): Promise<void> {
  validateEnv();
  if (
    !Number.isFinite(Number(process.env.USD_RATE)) ||
    Number(process.env.USD_RATE) <= 0
  )
    throw new Error("Configure a positive USD_RATE before scraping");
  const id = crypto.randomUUID();
  await queryD1(
    "INSERT INTO scrape_runs(id,source,started_at,status) VALUES(?,?,?,'running')",
    [id, source, new Date().toISOString()],
  );
  try {
    await main();
    if (!written)
      throw new Error(
        "No listings written; source may be blocked or parser changed",
      );
    await queryD1(
      "UPDATE scrape_runs SET status='success', finished_at=?, found=?, written=?, rejected=? WHERE id=?",
      [new Date().toISOString(), found, written, rejected, id],
    );
  } catch (error) {
    await queryD1(
      "UPDATE scrape_runs SET status='failed', finished_at=?, found=?, written=?, rejected=?, error=? WHERE id=?",
      [
        new Date().toISOString(),
        found,
        written,
        rejected,
        String(error).slice(0, 500),
        id,
      ],
    );
    throw error;
  }
}
