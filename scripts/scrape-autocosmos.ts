/**
 * Autocosmos Argentina scraper — HTML scraping with Cheerio.
 * Server-rendered pages (IIS/C#). Runs from GitHub Actions.
 *
 * Environment variables required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   D1_DATABASE_ID
 */

import * as cheerio from "cheerio";
import type { Listing } from "./lib/types.js";
import {
  fixBrand,
  fixProvince,
  inferAttributes,
  USD_RATE,
  IMPORTED_BRANDS,
} from "./lib/normalize.js";
import { calculateScores } from "./lib/scoring.js";
import { filterSuspiciousListings } from "./lib/filters.js";
import { validateEnv, insertListings, updateBrandsModels } from "./lib/d1.js";

const DELAY_MS = 2000;
const MAX_PAGES = 100;
const BASE_URL = "https://www.autocosmos.com.ar";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseListingsFromHtml(html: string): Listing[] {
  const $ = cheerio.load(html);
  const listings: Listing[] = [];
  const now = new Date().toISOString();

  $("a[href*='/auto/usado/']").each((_i, el) => {
    try {
      const link = $(el);
      const href = link.attr("href") ?? "";
      if (!href.includes("/auto/usado/")) return;

      const pathParts = href
        .replace(/^\//, "")
        .split("/")
        .filter(Boolean);
      // Format: auto/usado/{brand}/{model}/{version}/{id}
      if (pathParts.length < 5) return;

      const brandRaw = pathParts[2];
      const modelRaw = pathParts[3];
      const versionRaw = pathParts[4];
      const sourceId = pathParts[5] ?? "";
      if (!sourceId || sourceId.length < 10) return;

      const brand = fixBrand(brandRaw.replace(/-/g, " "));
      const model = modelRaw.replace(/-/g, " ");
      const version = versionRaw.replace(/-/g, " ");

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

      const text = link.text().replace(/\s+/g, " ").trim();

      const yearMatch = text.match(/\b(20[0-2]\d|19\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

      const kmMatch = text.match(/([\d.]+)\s*km/i);
      const km = kmMatch
        ? parseInt(kmMatch[1].replace(/\./g, ""), 10)
        : 0;

      const isUsd = text.includes("u$s") || text.includes("US$") || text.includes("u$");
      const priceMatch = text.match(
        /(?:Anticipo:\s*)?(?:u\$s?\s*)?(?:US\$\s*)?\$?\s*([\d.,]+)/i
      );
      let price = 0;
      if (priceMatch) {
        price =
          parseInt(priceMatch[1].replace(/\./g, "").replace(",", ""), 10) || 0;
      }
      if (!price) return;

      const locationMatch = text.match(
        /(\w[\w\s]*?)\s*\|\s*(\w[\w\s]*?)(?:\s*Anticipo|\s*Cuota|\s*u\$s|\s*\$|$)/
      );
      const location = locationMatch
        ? `${locationMatch[1].trim()} - ${locationMatch[2].trim()}`
        : "Argentina";
      const province = locationMatch
        ? fixProvince(locationMatch[2].trim())
        : "Argentina";

      const hasFinancing =
        text.toLowerCase().includes("anticipo") ||
        text.toLowerCase().includes("cuota");

      const priceArs = isUsd ? Math.round(price * USD_RATE) : price;
      const priceUsd = isUsd ? price : Math.round(price / USD_RATE);

      listings.push({
        id: `autocosmos-${sourceId}`,
        source: "autocosmos",
        sourceId,
        sourceUrl: fullUrl,
        brand,
        model,
        version,
        year,
        isNew: km === 0 && year >= new Date().getFullYear(),
        price,
        currency: isUsd ? "USD" : "ARS",
        priceArs,
        priceUsd,
        km,
        fuelType: null,
        transmission: null,
        bodyType: null,
        doors: null,
        isImported: IMPORTED_BRANDS.has(brand),
        location,
        province,
        imageUrls: [],
        sellerType: "concesionaria",
        verificationBadge: null,
        acceptsSwap: false,
        hasFinancing,
        dealScore: 0,
        consumption: null,
        tankCapacity: null,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
    } catch {
      /* skip */
    }
  });

  return listings;
}

async function main() {
  validateEnv();
  console.log("=== AutoOfertas — Autocosmos Scraper ===\n");

  const allListings: Listing[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      page === 1
        ? `${BASE_URL}/auto/usado`
        : `${BASE_URL}/auto/usado?pg=${page}`;
    process.stdout.write(`  Page ${page}/${MAX_PAGES}...`);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      if (!res.ok) {
        console.log(` HTTP ${res.status}`);
        break;
      }

      const html = await res.text();
      const pageListings = parseListingsFromHtml(html);

      let added = 0;
      for (const listing of pageListings) {
        if (!seenIds.has(listing.id)) {
          seenIds.add(listing.id);
          allListings.push(listing);
          added++;
        }
      }

      console.log(` ${added} new (${allListings.length} total)`);
      if (added === 0 && page > 1) {
        console.log("  No more results");
        break;
      }
    } catch (err) {
      console.log(` error: ${err}`);
    }

    if (page < MAX_PAGES) await sleep(DELAY_MS);
  }

  if (allListings.length === 0) {
    console.log("\nNo listings scraped from Autocosmos.");
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

  console.log(`\nDone! Autocosmos: ${inserted} listings in D1.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
