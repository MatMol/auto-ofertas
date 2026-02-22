/**
 * deRuedas Argentina scraper — HTML scraping with Cheerio.
 * Server-rendered ASP pages with divCar containers. Runs from GitHub Actions.
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
const MAX_PAGES = 50;
const BASE_URL = "https://www.deruedas.com.ar";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseListingsFromHtml(html: string): Listing[] {
  const $ = cheerio.load(html);
  const listings: Listing[] = [];
  const now = new Date().toISOString();

  $(".divCar_2").each((_i, el) => {
    try {
      const card = $(el);

      const titleLink = card.find("a.titulo.redirect-result").first();
      if (!titleLink.length) return;

      const href = titleLink.attr("href") ?? "";
      const dataCar = titleLink.attr("data-car") ?? "";
      const codMatch = href.match(/cod=(\d+)/) || dataCar.match(/car_(\d+)/);
      if (!codMatch) return;
      const sourceId = codMatch[1];

      const fullUrl = href.startsWith("http")
        ? href
        : `${BASE_URL}${href}`;

      const h2 = titleLink.find("h2").text().trim();
      const parts = h2.split(/\s+/);
      const brand = fixBrand(parts[0] ?? "");
      const model = parts.slice(1).join(" ");

      const versionSpan = titleLink
        .find("span[style*='font-weight:normal']")
        .text()
        .trim();
      const version = versionSpan || null;

      const priceSpan = card
        .find("span.titulo")
        .not("a.titulo")
        .first()
        .text()
        .trim();
      const isUsd = priceSpan.includes("U$") || priceSpan.includes("u$");
      const priceNum =
        parseInt(priceSpan.replace(/[^\d]/g, ""), 10) || 0;
      if (!priceNum) return;

      const infoSpan = card
        .find("span.titulo")
        .not("a.titulo")
        .first()
        .parent()
        .find("span.texto")
        .first()
        .text()
        .trim();

      const fuelTypes = ["Diesel", "GNC", "Nafta", "Eléctrico", "Híbrido"];
      const fuelMatch = fuelTypes.find((f) =>
        infoSpan.toLowerCase().includes(f.toLowerCase())
      );
      const fuelType = fuelMatch
        ? fuelMatch.toLowerCase() === "eléctrico"
          ? "electrico"
          : fuelMatch.toLowerCase() === "híbrido"
            ? "hibrido"
            : fuelMatch.toLowerCase()
        : null;

      const yearMatch = infoSpan.match(/\b(19\d{2}|20[0-2]\d)\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

      const detailText = card
        .find("td[colspan] span.texto")
        .first()
        .text()
        .trim();

      const kmMatch = detailText.match(/([\d.]+)\s*[Kk][Mm]/);
      const km = kmMatch
        ? parseInt(kmMatch[1].replace(/\./g, ""), 10)
        : 0;

      const locationRaw = detailText
        .replace(/[\d.]+\s*[Kk][Mm]/, "")
        .replace(/^\s*\n?\s*/, "")
        .trim();
      const province = fixProvince(locationRaw);

      const hasFinancing = card
        .text()
        .toLowerCase()
        .includes("cuota");

      const pathParts = href.split("/");
      const condIdx = pathParts.indexOf("Usados");
      const urlProvince =
        condIdx >= 0
          ? fixProvince(
              decodeURIComponent(pathParts[condIdx + 1] ?? "").replace(/-/g, " ")
            )
          : province;

      const priceArs = isUsd ? Math.round(priceNum * USD_RATE) : priceNum;
      const priceUsd = isUsd ? priceNum : Math.round(priceNum / USD_RATE);

      const hasDealerLogo = card.find("img[alt]").length > 0;

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
        price: priceNum,
        currency: isUsd ? "USD" : "ARS",
        priceArs,
        priceUsd,
        km,
        fuelType,
        transmission: null,
        bodyType: null,
        doors: null,
        isImported: IMPORTED_BRANDS.has(brand),
        location: locationRaw || urlProvince,
        province: urlProvince || province,
        imageUrls: [],
        sellerType: hasDealerLogo ? "concesionaria" : "particular",
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

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE_URL}/bus.asp?condicion=Usados&segmento=0&pagina=${page}`;
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
