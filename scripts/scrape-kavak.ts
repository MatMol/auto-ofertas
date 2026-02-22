/**
 * Kavak Argentina scraper — uses their internal search API.
 * No authentication required. Runs from GitHub Actions.
 *
 * Environment variables required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   D1_DATABASE_ID
 */

import "./lib/env.js";
import type { Listing } from "./lib/types.js";
import {
  fixBrand,
  inferAttributes,
  USD_RATE,
  IMPORTED_BRANDS,
} from "./lib/normalize.js";
import { calculateScores } from "./lib/scoring.js";
import { filterSuspiciousListings } from "./lib/filters.js";
import { validateEnv, insertListings, updateBrandsModels } from "./lib/d1.js";

const DELAY_MS = 1500;
const BASE_URL =
  "https://www.kavak.com/api/advanced-search-api/v2/advanced-search?loan_limit=true&status=disponible";

const HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "es-AR,es;q=0.9",
  "kavak-client-type": "web",
  "kavak-country-acronym": "ar",
  referer: "https://www.kavak.com/ar/usados",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parsePrice(priceStr: string): number {
  return parseInt(priceStr.replace(/[^\d]/g, ""), 10) || 0;
}

function parseKm(kmStr: string): number {
  return parseInt(kmStr.replace(/[^\d]/g, ""), 10) || 0;
}

function kavakCarToListing(car: Record<string, unknown>): Listing | null {
  const id = String(car.id ?? "");
  if (!id) return null;

  const brand = fixBrand(String(car.make ?? ""));
  const model = String(car.model ?? "");
  const version = car.trim ? String(car.trim) : null;
  if (!brand || !model) return null;

  const priceStr = String(car.price ?? "0");
  const price = parsePrice(priceStr);
  if (!price) return null;

  const year = Number(car.year) || 0;
  const km = Number(car.kmNoFormat) || parseKm(String(car.km ?? "0"));

  const rawUrl = String(car.url ?? "");
  const url = rawUrl.startsWith("http")
    ? rawUrl
    : `https://www.kavak.com${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

  const transmission = String(car.transmission ?? "").toLowerCase();
  const transmissionNorm =
    transmission.includes("auto") || transmission.includes("automát") ? "automatica" :
    transmission.includes("manual") ? "manual" : null;

  const regionName = String(car.regionName ?? "");
  const location = regionName || "Buenos Aires";

  const imageUrl = String(car.imageUrl ?? car.image ?? "");
  const imageUrls = imageUrl ? [imageUrl] : [];

  const isUsd = priceStr.includes("US") || priceStr.includes("U$");
  const priceArs = isUsd ? Math.round(price * USD_RATE) : price;
  const priceUsd = isUsd ? price : Math.round(price / USD_RATE);

  const now = new Date().toISOString();

  return {
    id: `kavak-${id}`,
    source: "kavak",
    sourceId: id,
    sourceUrl: url,
    brand,
    model,
    version,
    year,
    isNew: km === 0,
    price,
    currency: isUsd ? "USD" : "ARS",
    priceArs,
    priceUsd,
    km,
    fuelType: null,
    transmission: transmissionNorm,
    bodyType: null,
    doors: null,
    isImported: IMPORTED_BRANDS.has(brand),
    location,
    province: "Buenos Aires",
    imageUrls,
    sellerType: "concesionaria",
    verificationBadge: "kavak_verified",
    acceptsSwap: true,
    hasFinancing: true,
    dealScore: 0,
    consumption: null,
    tankCapacity: null,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };
}

async function main() {
  validateEnv();
  console.log("=== AutoOfertas — Kavak Scraper ===\n");

  const allListings: Listing[] = [];
  const seenIds = new Set<string>();
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const url = `${BASE_URL}&page=${page}`;
    process.stdout.write(`  Page ${page + 1}...`);

    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) {
        console.log(` HTTP ${res.status}`);
        break;
      }

      const data = (await res.json()) as {
        cars?: Record<string, unknown>[];
        pagination?: { total?: number };
        total?: number;
      };

      const cars = data.cars ?? [];
      totalPages = data.pagination?.total ?? 1;

      let added = 0;
      for (const car of cars) {
        const listing = kavakCarToListing(car);
        if (listing && !seenIds.has(listing.id)) {
          seenIds.add(listing.id);
          allListings.push(listing);
          added++;
        }
      }

      console.log(` ${added} new (${allListings.length} total, ${totalPages} pages)`);
      if (cars.length === 0) break;
    } catch (err) {
      console.log(` error: ${err}`);
      break;
    }

    page++;
    if (page < totalPages) await sleep(DELAY_MS);
  }

  if (allListings.length === 0) {
    console.log("\nNo listings scraped from Kavak.");
    process.exit(0);
  }

  console.log(`\nTotal raw listings: ${allListings.length}`);
  console.log("Inferring attributes...");
  for (const l of allListings) inferAttributes(l);

  console.log("Filtering suspicious listings...");
  const filtered = filterSuspiciousListings(allListings);
  console.log(
    `  Removed ${allListings.length - filtered.length} (${filtered.length} remaining)`
  );

  console.log("Calculating deal scores...");
  calculateScores(filtered);

  console.log(`\nWriting ${filtered.length} listings to D1...`);
  const inserted = await insertListings(filtered);
  console.log(`  Inserted/updated: ${inserted}`);

  console.log("Updating brands_models...");
  await updateBrandsModels();

  console.log(`\nDone! Kavak: ${inserted} listings in D1.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
