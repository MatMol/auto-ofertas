/**
 * deRuedas Argentina scraper — HTML scraping with Cheerio.
 * Server-rendered ASP pages. Runs from GitHub Actions.
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
const MAX_PAGES = 50;
const BASE_URL = "https://www.deruedas.com.ar";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseListingFromHtml(
  html: string,
  _url: string
): Listing[] {
  const $ = cheerio.load(html);
  const listings: Listing[] = [];
  const now = new Date().toISOString();

  $("a[href*='/vendo/']").each((_i, el) => {
    try {
      const link = $(el);
      const href = link.attr("href") ?? "";
      if (!href.includes("/vendo/")) return;

      const codMatch = href.match(/cod=(\d+)/);
      if (!codMatch) return;
      const sourceId = codMatch[1];

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

      const textContent = link.text().replace(/\s+/g, " ").trim();

      const pathParts = href.split("/").filter(Boolean);
      const brandRaw = pathParts.find(
        (_p, i) => i > 0 && pathParts[i - 1] === "vendo"
      );
      const modelRaw = pathParts[pathParts.indexOf(brandRaw ?? "") + 1];

      if (!brandRaw || !modelRaw) return;

      const brand = fixBrand(brandRaw.replace(/-/g, " "));
      const model = modelRaw.replace(/-/g, " ");

      const versionMatch = textContent.match(
        /^(.+?)(?:\$|U\$|u\$|\d{4})/
      );
      const version = versionMatch
        ? versionMatch[1].replace(brand, "").replace(model, "").trim() || null
        : null;

      const priceMatch = textContent.match(
        /(?:U?\$\s*)([\d.]+(?:[\d.]*)*)/
      );
      const priceStr = priceMatch ? priceMatch[1].replace(/\./g, "") : "0";
      const price = parseInt(priceStr, 10) || 0;
      if (!price) return;

      const isUsd =
        textContent.includes("U$") || textContent.includes("u$");

      const yearMatch = textContent.match(/\b(19\d{2}|20[0-2]\d)\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

      const kmMatch = textContent.match(/([\d.]+)\s*[Kk][Mm]/);
      const km = kmMatch
        ? parseInt(kmMatch[1].replace(/\./g, ""), 10)
        : 0;

      const fuelTypes = ["Diesel", "GNC", "Nafta", "Eléctrico", "Híbrido"];
      const fuelMatch = fuelTypes.find((f) =>
        textContent.toLowerCase().includes(f.toLowerCase())
      );
      const fuelType = fuelMatch
        ? fuelMatch.toLowerCase() === "eléctrico"
          ? "electrico"
          : fuelMatch.toLowerCase() === "híbrido"
            ? "hibrido"
            : fuelMatch.toLowerCase()
        : null;

      const locationParts = href.split("/");
      const conditionIdx = locationParts.indexOf("Usados");
      const province =
        conditionIdx >= 0
          ? fixProvince(
              (locationParts[conditionIdx + 1] ?? "Argentina").replace(
                /-/g,
                " "
              )
            )
          : "Argentina";

      const priceArs = isUsd ? Math.round(price * USD_RATE) : price;
      const priceUsd = isUsd ? price : Math.round(price / USD_RATE);

      listings.push({
        id: `deruedas-${sourceId}`,
        source: "deruedas",
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
        fuelType,
        transmission: null,
        bodyType: null,
        doors: null,
        isImported: IMPORTED_BRANDS.has(brand),
        location: province,
        province,
        imageUrls: [],
        sellerType: "concesionaria",
        verificationBadge: null,
        acceptsSwap: false,
        hasFinancing: textContent.toLowerCase().includes("cuota"),
        dealScore: 0,
        consumption: null,
        tankCapacity: null,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
    } catch {
      /* skip malformed listing */
    }
  });

  return listings;
}

async function main() {
  validateEnv();
  console.log("=== AutoOfertas — deRuedas Scraper ===\n");

  const allListings: Listing[] = [];
  const seenIds = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * 30;
    const url = `${BASE_URL}/bus.asp?condicion=Usados&segmento=0&pagina=${page + 1}`;
    process.stdout.write(`  Page ${page + 1}/${MAX_PAGES}...`);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      if (!res.ok) {
        console.log(` HTTP ${res.status}`);
        break;
      }

      const html = await res.text();
      const pageListings = parseListingFromHtml(html, url);

      let added = 0;
      for (const listing of pageListings) {
        if (!seenIds.has(listing.id)) {
          seenIds.add(listing.id);
          allListings.push(listing);
          added++;
        }
      }

      console.log(` ${added} new (${allListings.length} total)`);
      if (added === 0 && page > 0) {
        console.log("  No more results");
        break;
      }
    } catch (err) {
      console.log(` error: ${err}`);
    }

    if (page < MAX_PAGES - 1) await sleep(DELAY_MS);
  }

  if (allListings.length === 0) {
    console.log("\nNo listings scraped from deRuedas.");
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

  console.log(`\nDone! deRuedas: ${inserted} listings in D1.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
