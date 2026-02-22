/**
 * MercadoLibre scraper — runs from a residential IP (Windows/Mac).
 *
 * Scrapes MercadoLibre listings using segmented brand searches to
 * bypass the ~2000 result cap per query, aiming for ~40K+ listings.
 *
 * Environment variables required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   D1_DATABASE_ID
 */

import "./lib/env.js";
import type { Listing, PolycardData } from "./lib/types.js";
import {
  inferAttributes,
  polycardToListing,
} from "./lib/normalize.js";
import { calculateScores } from "./lib/scoring.js";
import { filterSuspiciousListings } from "./lib/filters.js";
import {
  validateEnv,
  insertListings,
  updateBrandsModels,
} from "./lib/d1.js";

const MAX_PAGES_PER_SEARCH = 42;
const PAGE_DELAY_MIN = 2500;
const PAGE_DELAY_MAX = 5000;
const BRAND_COOLDOWN_MIN = 15000;
const BRAND_COOLDOWN_MAX = 30000;
const BLOCKED_WAIT = 60000;

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Segmented searches by brand so we get up to ~2000 results per brand.
 * The generic search catches anything not covered by specific brands.
 */
const BRAND_SEARCHES: { label: string; url: string }[] = [
  { label: "Ford", url: "https://autos.mercadolibre.com.ar/ford/" },
  { label: "Volkswagen", url: "https://autos.mercadolibre.com.ar/volkswagen/" },
  { label: "Chevrolet", url: "https://autos.mercadolibre.com.ar/chevrolet/" },
  { label: "Fiat", url: "https://autos.mercadolibre.com.ar/fiat/" },
  { label: "Toyota", url: "https://autos.mercadolibre.com.ar/toyota/" },
  { label: "Renault", url: "https://autos.mercadolibre.com.ar/renault/" },
  { label: "Peugeot", url: "https://autos.mercadolibre.com.ar/peugeot/" },
  { label: "Citroën", url: "https://autos.mercadolibre.com.ar/citroen/" },
  { label: "Honda", url: "https://autos.mercadolibre.com.ar/honda/" },
  { label: "Nissan", url: "https://autos.mercadolibre.com.ar/nissan/" },
  { label: "Hyundai", url: "https://autos.mercadolibre.com.ar/hyundai/" },
  { label: "Kia", url: "https://autos.mercadolibre.com.ar/kia/" },
  { label: "BMW", url: "https://autos.mercadolibre.com.ar/bmw/" },
  { label: "Mercedes-Benz", url: "https://autos.mercadolibre.com.ar/mercedes-benz/" },
  { label: "Audi", url: "https://autos.mercadolibre.com.ar/audi/" },
  { label: "Jeep", url: "https://autos.mercadolibre.com.ar/jeep/" },
  { label: "RAM", url: "https://autos.mercadolibre.com.ar/ram/" },
  { label: "Dodge", url: "https://autos.mercadolibre.com.ar/dodge/" },
  { label: "Suzuki", url: "https://autos.mercadolibre.com.ar/suzuki/" },
  { label: "Chery", url: "https://autos.mercadolibre.com.ar/chery/" },
  { label: "DS", url: "https://autos.mercadolibre.com.ar/ds/" },
  { label: "Volvo", url: "https://autos.mercadolibre.com.ar/volvo/" },
  { label: "Subaru", url: "https://autos.mercadolibre.com.ar/subaru/" },
  { label: "Mini", url: "https://autos.mercadolibre.com.ar/mini/" },
  { label: "Porsche", url: "https://autos.mercadolibre.com.ar/porsche/" },
  { label: "Geely", url: "https://autos.mercadolibre.com.ar/geely/" },
  { label: "Mazda", url: "https://autos.mercadolibre.com.ar/mazda/" },
  { label: "Mitsubishi", url: "https://autos.mercadolibre.com.ar/mitsubishi/" },
  { label: "Jaguar", url: "https://autos.mercadolibre.com.ar/jaguar/" },
  { label: "Land Rover", url: "https://autos.mercadolibre.com.ar/land-rover/" },
  { label: "Alfa Romeo", url: "https://autos.mercadolibre.com.ar/alfa-romeo/" },
  // Catch-all for remaining brands not listed above
  { label: "Todos (resto)", url: "https://autos.mercadolibre.com.ar/" },
];

// ---- Extraction (ML-specific polycard parsing) ----

function extractJsonObject(str: string, startIdx: number): string | null {
  if (str[startIdx] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return str.substring(startIdx, i + 1);
    }
  }
  return null;
}

function extractPolycards(html: string): PolycardData[] {
  const polycards: PolycardData[] = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let scriptMatch: RegExpExecArray | null;

  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const content = scriptMatch[1];
    if (!content.includes('"polycard"') || content.length < 10000) continue;

    const marker = '"polycard":';
    let searchFrom = 0;
    while (true) {
      const idx = content.indexOf(marker, searchFrom);
      if (idx === -1) break;
      let start = idx + marker.length;
      while (start < content.length && content[start] === " ") start++;
      if (content[start] === "{") {
        const jsonStr = extractJsonObject(content, start);
        if (jsonStr) {
          try {
            const raw = jsonStr.replace(/\\u002F/g, "/");
            const data = JSON.parse(raw);
            if (data.metadata?.id && data.components) {
              polycards.push({
                metadata: data.metadata,
                pictures: data.pictures,
                components: data.components,
              });
            }
          } catch { /* skip malformed JSON */ }
          searchFrom = start + (jsonStr?.length ?? 1);
        } else {
          searchFrom = start + 1;
        }
      } else {
        searchFrom = start + 1;
      }
    }
    break;
  }
  return polycards;
}

// ---- Scrape a single search URL across pages ----

async function scrapeSearch(
  baseUrl: string,
  label: string,
  seenIds: Set<string>
): Promise<{ listings: Listing[]; blocked: boolean }> {
  const listings: Listing[] = [];
  let emptyPages = 0;
  let blocked = false;

  for (let page = 0; page < MAX_PAGES_PER_SEARCH; page++) {
    const offset = page * 48;
    const separator = baseUrl.includes("?") ? "&" : "_";
    const url = `${baseUrl}${separator}Desde_${offset + 1}_NoIndex_true`;
    process.stdout.write(
      `  [${label}] Page ${page + 1}/${MAX_PAGES_PER_SEARCH} (offset ${offset})...`
    );

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": randomUA(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
        },
        redirect: "follow",
      });

      if (!res.ok) {
        console.log(` HTTP ${res.status}`);
        if (res.status === 429) {
          console.log(`  Rate limited! Waiting ${BLOCKED_WAIT / 1000}s...`);
          await sleep(BLOCKED_WAIT);
          emptyPages = 0;
          continue;
        }
        break;
      }

      const html = await res.text();
      const polycards = extractPolycards(html);
      let added = 0;

      for (const pc of polycards) {
        const listing = polycardToListing(pc);
        if (listing && !seenIds.has(listing.id)) {
          seenIds.add(listing.id);
          listings.push(listing);
          added++;
        }
      }

      console.log(` ${added} new (${listings.length} from ${label})`);

      if (added === 0 && polycards.length === 0) {
        emptyPages++;
        if (page === 0) {
          console.log(`  Page 1 empty — likely blocked, will pause.`);
          blocked = true;
          break;
        }
        if (emptyPages >= 2) {
          console.log(`  No more results for ${label}`);
          break;
        }
      } else {
        emptyPages = 0;
      }
    } catch (err) {
      console.log(` error: ${err}`);
    }

    if (page < MAX_PAGES_PER_SEARCH - 1) {
      await sleep(randomDelay(PAGE_DELAY_MIN, PAGE_DELAY_MAX));
    }
  }

  return { listings, blocked };
}

// ---- Main ----

async function main() {
  validateEnv();
  console.log("=== AutoOfertas — MercadoLibre Scraper ===\n");

  const allListings: Listing[] = [];
  const seenIds = new Set<string>();

  let consecutiveBlocks = 0;

  for (let i = 0; i < BRAND_SEARCHES.length; i++) {
    const search = BRAND_SEARCHES[i];
    console.log(`\n[${i + 1}/${BRAND_SEARCHES.length}] Scraping: ${search.label}`);

    const { listings: brandListings, blocked } = await scrapeSearch(
      search.url,
      search.label,
      seenIds
    );
    allListings.push(...brandListings);
    console.log(
      `  ${search.label}: ${brandListings.length} listings (${allListings.length} total)`
    );

    if (blocked) {
      consecutiveBlocks++;
      if (consecutiveBlocks >= 3) {
        console.log(
          `\n  Blocked ${consecutiveBlocks} times in a row. Waiting ${BLOCKED_WAIT * 2 / 1000}s before continuing...`
        );
        await sleep(BLOCKED_WAIT * 2);
        consecutiveBlocks = 0;
      } else {
        console.log(`  Blocked — cooling down ${BLOCKED_WAIT / 1000}s...`);
        await sleep(BLOCKED_WAIT);
      }
    } else {
      consecutiveBlocks = 0;
      if (i < BRAND_SEARCHES.length - 1) {
        const cooldown = randomDelay(BRAND_COOLDOWN_MIN, BRAND_COOLDOWN_MAX);
        console.log(`  Cooling down ${(cooldown / 1000).toFixed(0)}s before next brand...`);
        await sleep(cooldown);
      }
    }
  }

  if (allListings.length === 0) {
    console.log("\nNo listings scraped.");
    process.exit(1);
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

  console.log(`\nDone! ${inserted} listings in D1.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
