/**
 * Cleanup script — removes stale listings to stay within D1 free tier.
 *
 * Strategy:
 *   1. Mark listings not updated in the last 7 days as inactive.
 *   2. Delete listings inactive for more than 14 days.
 *   3. If total rows exceed a threshold, delete oldest inactive first.
 *
 * D1 free tier: 5 GB storage, 100k writes/day, 5M reads/day.
 * Target: keep < 80,000 active listings total.
 *
 * Environment variables required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   D1_DATABASE_ID
 */

import "./lib/env.js";
import { validateEnv, queryD1 } from "./lib/d1.js";

const MAX_ACTIVE_LISTINGS = 80_000;
const STALE_DAYS = 7;
const DELETE_AFTER_DAYS = 14;
/** Precio mínimo en ARS — listings por debajo son datos mal parseados (ej. "200" de "200 tsi") */
const MIN_PRICE_ARS = 1_000_000;

async function main() {
  validateEnv();
  console.log("=== AutoOfertas — Cleanup ===\n");

  const now = new Date().toISOString();

  console.log("0. Removing listings with absurd prices (e.g. Autocosmos parse errors)...");
  await queryD1("DELETE FROM listings WHERE price_ars < ?", [MIN_PRICE_ARS]);
  console.log("   Done.\n");
  const staleDate = new Date(
    Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const deleteDate = new Date(
    Date.now() - DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  console.log(`Current time: ${now}`);
  console.log(`Stale threshold (${STALE_DAYS}d): ${staleDate}`);
  console.log(`Delete threshold (${DELETE_AFTER_DAYS}d): ${deleteDate}\n`);

  console.log("1. Marking stale listings as inactive...");
  await queryD1(
    "UPDATE listings SET is_active = 0 WHERE is_active = 1 AND updated_at < ?",
    [staleDate]
  );
  console.log("   Done.\n");

  console.log("2. Deleting old inactive listings...");
  await queryD1("DELETE FROM listings WHERE is_active = 0 AND updated_at < ?", [
    deleteDate,
  ]);
  console.log("   Done.\n");

  const countResult = (await queryD1(
    "SELECT COUNT(*) as cnt FROM listings"
  )) as { result: Array<{ results: Array<{ cnt: number }> }> };
  const totalRows =
    countResult?.result?.[0]?.results?.[0]?.cnt ?? 0;
  console.log(`3. Total rows in DB: ${totalRows}`);

  if (totalRows > MAX_ACTIVE_LISTINGS * 1.2) {
    const excess = Math.floor(totalRows - MAX_ACTIVE_LISTINGS);
    console.log(
      `   Exceeds threshold (${MAX_ACTIVE_LISTINGS}), removing ~${excess} oldest inactive...`
    );
    await queryD1(
      `DELETE FROM listings WHERE id IN (
        SELECT id FROM listings WHERE is_active = 0
        ORDER BY updated_at ASC LIMIT ?
      )`,
      [excess]
    );
    console.log("   Done.");
  } else {
    console.log("   Within limits, no further cleanup needed.");
  }

  const activeResult = (await queryD1(
    "SELECT COUNT(*) as cnt FROM listings WHERE is_active = 1"
  )) as { result: Array<{ results: Array<{ cnt: number }> }> };
  const activeRows =
    activeResult?.result?.[0]?.results?.[0]?.cnt ?? 0;
  console.log(`\nFinal: ${activeRows} active listings.`);

  console.log("Refreshing brands_models...");
  await queryD1("DELETE FROM brands_models");
  await queryD1(
    `INSERT INTO brands_models (id, brand, model, count)
     SELECT brand || '-' || model, brand, model, COUNT(*) as count
     FROM listings WHERE is_active = 1
     GROUP BY brand, model`
  );
  console.log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
