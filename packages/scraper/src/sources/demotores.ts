import * as cheerio from "cheerio";
import type { RawListing } from "../types.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://www.demotores.com.ar";
const DELAY_BETWEEN_PAGES_MS = 2500;
const MAX_PAGES = 50;

function parsePrice(text: string): number {
  const match = text.replace(/\s/g, "").match(/[\d.,]+/);
  if (!match) return 0;
  const num = match[0].replace(/\./g, "").replace(",", ".");
  return parseFloat(num) || 0;
}

function parseYear(text: string): number {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : 0;
}

function parseKm(text: string): number {
  const match = text.replace(/\./g, "").match(/(\d+)\s*km/i);
  return match ? parseInt(match[1], 10) : 0;
}

function extractFromTitle(title: string): { brand: string; model: string } {
  const parts = title.split(/\s*[-•|]\s*/).map((p) => p.trim());
  const brand = parts[0] ?? "";
  const model = parts.slice(1).join(" ") || brand;
  return { brand, model };
}

export async function fetchDeMotoresListings(): Promise<RawListing[]> {
  const listings: RawListing[] = [];
  let page = 1;

  try {
    while (page <= MAX_PAGES) {
      const url =
        page === 1
          ? `${BASE_URL}/autos/usados/`
          : `${BASE_URL}/autos/usados/?page=${page}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AutoOfertas/1.0; +https://auto-ofertas.com)",
          Accept: "text/html",
        },
      });

      if (!res.ok) {
        if (page === 1) throw new Error(`DeMotores fetch failed: ${res.status}`);
        break;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      const cards = $(
        [
          "article[data-listing]",
          ".listing-card",
          ".vehicle-card",
          ".card-vehicle",
          ".auto-card",
          "[class*='listing']",
          "[class*='vehicle']",
          ".result-item",
        ].join(", ")
      );

      let found = 0;

      cards.each((_, el) => {
        try {
          const $el = $(el);
          const link =
            $el.find("a[href*='/autos/']").first().attr("href") ??
            $el.find("a").first().attr("href");
          const href = link?.startsWith("http")
            ? link
            : link
              ? new URL(link, BASE_URL).href
              : "";

          const title =
            $el.find("h2, h3, .title, [class*='title']").first().text().trim() ||
            $el.text().trim().slice(0, 100);

          const priceText =
            $el.find(".price, [class*='price']").first().text() || $el.text();
          const price = parsePrice(priceText);

          const metaText = $el.text();
          const year = parseYear(metaText);
          const km = parseKm(metaText);

          const { brand, model } = extractFromTitle(title);

          const img =
            $el.find("img").first().attr("src") ??
            $el.find("img").first().attr("data-src") ??
            "";

          const locationText =
            $el.find("[class*='location'], [class*='ubicacion'], .location")
              .first()
              .text() || "";
          const province = locationText.trim() || "Argentina";

          const sourceId = (href.match(/[-/](\d+)[-/]?/)?.[1] ?? href) || `dm-${listings.length}`;

          listings.push({
            sourceId,
            sourceUrl: href || BASE_URL,
            title: title || `${brand} ${model}`.trim(),
            brand: brand || "Desconocida",
            model: model || "Desconocido",
            version: null,
            year: year || new Date().getFullYear(),
            isNew: false,
            price,
            currency: "ARS",
            km,
            fuelType: null,
            transmission: null,
            bodyType: null,
            doors: null,
            location: province,
            province,
            imageUrls: img ? [img.startsWith("http") ? img : new URL(img, BASE_URL).href] : [],
            sellerType: "particular",
            isVerified: false,
            acceptsSwap: false,
            hasFinancing: false,
          });

          found++;
        } catch {
          // Skip malformed cards
        }
      });

      if (found === 0 && page === 1) break;

      const hasNext =
        $("a[href*='page='], .pagination a, [class*='next']").length > 0;
      if (!hasNext || found === 0) break;

      page++;
      await sleep(DELAY_BETWEEN_PAGES_MS);
    }

    return listings;
  } catch {
    return [];
  }
}
