/**
 * Autocosmos Argentina scraper — HTML scraping with Cheerio.
 * Uses structured listing-card elements with schema.org microdata.
 * Runs from GitHub Actions.
 *
 * Environment variables required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   D1_DATABASE_ID
 */

import "./lib/env.js";
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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseListingsFromHtml(html: string): Listing[] {
  const $ = cheerio.load(html);
  const listings: Listing[] = [];
  const now = new Date().toISOString();

  $("a[itemprop='url'][href*='/auto/usado/']").each((_i, el) => {
    try {
      const link = $(el);
      const href = link.attr("href") ?? "";

      const pathParts = href.replace(/^\//, "").split("/").filter(Boolean);
      // Format: auto/usado/{brand}/{model}/{version}/{id}
      if (pathParts.length < 6) return;

      const brandRaw = pathParts[2];
      const modelRaw = pathParts[3];
      const versionRaw = pathParts[4];
      const sourceId = pathParts[5];
      if (!sourceId || sourceId.length < 10) return;

      const brand = fixBrand(decodeURIComponent(brandRaw).replace(/-/g, " "));
      const model = decodeURIComponent(modelRaw).replace(/-/g, " ");
      const version = decodeURIComponent(versionRaw).replace(/-/g, " ");
      const fullUrl = `${BASE_URL}${href}`;

      const card = link.find(".listing-card__content").length
        ? link
        : link.closest("[itemscope]");

      const brandEl = card.find(".listing-card__brand");
      const finalBrand = brandEl.length
        ? fixBrand(brandEl.text().trim())
        : brand;

      const modelEl = card.find(".listing-card__model");
      const finalModel = modelEl.length ? modelEl.text().trim() : model;

      const versionEl = card.find(".listing-card__version");
      const finalVersion = versionEl.length
        ? versionEl.text().trim()
        : version;

      const yearEl = card.find(".listing-card__year");
      const year = yearEl.length ? parseInt(yearEl.text().trim(), 10) || 0 : 0;

      const kmEl = card.find(".listing-card__km");
      const kmText = kmEl.length ? kmEl.text().trim() : "";
      const km = parseInt(kmText.replace(/[^\d]/g, ""), 10) || 0;

      const currencyMeta = card.find("meta[itemprop='priceCurrency']");
      const currencyRaw = currencyMeta.attr("content") ?? "ARS";
      const isUsd =
        currencyRaw === "USD" ||
        currencyRaw === "U$S" ||
        link.attr("title")?.includes("u$s") ||
        false;

      const priceEl = card.find(".listing-card__price-value");
      const priceContent = priceEl.attr("content") ?? "";
      const priceText = priceEl.text().trim();
      let price = parseInt(priceContent, 10) || 0;
      if (!price) {
        price =
          parseInt(priceText.replace(/[^\d]/g, ""), 10) || 0;
      }
      if (!price) return;

      const priceTitle = card.find(".listing-card__price-title").text().trim();
      const hasFinancing = priceTitle.toLowerCase().includes("anticipo");

      const cityEl = card.find(".listing-card__city");
      const provinceEl = card.find(".listing-card__province");
      const city = cityEl.text().replace("|", "").trim();
      const province = provinceEl.length
        ? fixProvince(provinceEl.text().trim())
        : "Argentina";
      const location = city ? `${city}, ${province}` : province;

      const imgEl = card.find("img[itemprop='image']");
      const imgSrc =
        imgEl.attr("content") ?? imgEl.attr("src") ?? "";
      const imageUrls = imgSrc ? [imgSrc] : [];

      const priceArs = isUsd ? Math.round(price * USD_RATE) : price;
      const priceUsd = isUsd ? price : Math.round(price / USD_RATE);

      listings.push({
        id: `autocosmos-${sourceId}`,
        source: "autocosmos",
        sourceId,
        sourceUrl: fullUrl,
        brand: finalBrand,
        model: finalModel,
        version: finalVersion,
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
        isImported: IMPORTED_BRANDS.has(finalBrand),
        location,
        province,
        imageUrls,
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
  const MAX_CONSECUTIVE_FAILURES = 3;
  let consecutiveFailures = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      page === 1
        ? `${BASE_URL}/auto/usado`
        : `${BASE_URL}/auto/usado?pg=${page}`;
    process.stdout.write(`  Page ${page}/${MAX_PAGES}...`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        console.log(` HTTP ${res.status}`);
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log(
            `  ${MAX_CONSECUTIVE_FAILURES} consecutive failures — site may be unreachable, stopping.`
          );
          break;
        }
        continue;
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

      consecutiveFailures = 0;
      console.log(` ${added} new (${allListings.length} total)`);
      if (added === 0 && page > 1) {
        console.log("  No more results");
        break;
      }
    } catch (err) {
      const isTimeout =
        err instanceof Error && err.name === "AbortError";
      console.log(
        isTimeout
          ? " timeout (30s) — site not responding"
          : ` error: ${err}`
      );
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log(
          `  ${MAX_CONSECUTIVE_FAILURES} consecutive failures — site may be unreachable, stopping.`
        );
        break;
      }
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
