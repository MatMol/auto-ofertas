import * as cheerio from "cheerio";
import type { RawListing } from "../types.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://www.kavak.com";
const DELAY_BETWEEN_PAGES_MS = 2500;
const MAX_PAGES = 30;

function parsePrice(text: string): number {
  const match = text.replace(/\s/g, "").replace(/\$/g, "").match(/[\d.,]+/);
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

function parseTransmission(text: string): string | null {
  if (/automático|automatica|cvt/i.test(text)) return "automática";
  if (/manual/i.test(text)) return "manual";
  return null;
}

function parseBodyType(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("suv")) return "suv";
  if (lower.includes("sedan") || lower.includes("sedán")) return "sedan";
  if (lower.includes("hatchback") || lower.includes("hatch")) return "hatchback";
  if (lower.includes("pickup") || lower.includes("pick-up")) return "pickup";
  if (lower.includes("minivan") || lower.includes("van")) return "van";
  if (lower.includes("coupe") || lower.includes("coupé")) return "coupe";
  return null;
}

export async function fetchKavakListings(): Promise<RawListing[]> {
  try {
    const apiResult = await tryKavakApi();
    if (apiResult.length > 0) return apiResult;

    return await scrapeKavakHtml();
  } catch {
    return [];
  }
}

async function tryKavakApi(): Promise<RawListing[]> {
  try {
    const urls = [
      "https://www.kavak.com/ar/api/inventory/search",
      "https://www.kavak.com/ar/api/cars",
      "https://www.kavak.com/ar/api/inventory",
    ];

    for (const url of urls) {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AutoOfertas/1.0; +https://auto-ofertas.com)",
          Accept: "application/json",
        },
      });

      if (!res.ok) continue;

      const data = await res.json();

      const cars = data.cars ?? data.results ?? data.inventory ?? data.data ?? [];
      if (!Array.isArray(cars) || cars.length === 0) continue;

      return cars.map((car: Record<string, unknown>) =>
        mapApiCarToRawListing(car)
      );
    }
  } catch {
    // Fall through to HTML scrape
  }
  return [];
}

function mapApiCarToRawListing(car: Record<string, unknown>): RawListing {
  const id = String(car.id ?? car.car_id ?? car.slug ?? "");
  const title = String(car.title ?? car.name ?? "");
  const brand = String(car.brand ?? car.make ?? "");
  const model = String(car.model ?? "");
  const version = (car.version ?? car.trim ?? car.variant) as string | null;
  const year = Number(car.year ?? car.model_year ?? 0);
  const price = Number(
    car.price ?? car.list_price ?? car.cash_price ?? car.main_price ?? 0
  );
  const km = Number(car.km ?? car.kilometers ?? car.mileage ?? 0);
  const fuelType = (car.fuel_type ?? car.fuel) as string | null;
  const transmission = (car.transmission ?? car.gearbox) as string | null;
  const bodyType = (car.body_type ?? car.vehicle_type ?? car.type) as
    | string
    | null;
  const doors = car.doors != null ? Number(car.doors) : null;
  const location = String(car.location ?? car.city ?? car.province ?? "Buenos Aires");
  const images = (car.images ?? car.photos ?? car.pictures ?? []) as string[];

  return {
    sourceId: id,
    sourceUrl: id ? `${BASE_URL}/ar/venta/${id}` : BASE_URL,
    title: title || `${brand} ${model}`.trim(),
    brand: brand || "Desconocida",
    model: model || "Desconocido",
    version: version ?? null,
    year: year || new Date().getFullYear(),
    isNew: false,
    price,
    currency: "ARS",
    km,
    fuelType: fuelType ?? null,
    transmission: transmission ?? null,
    bodyType: bodyType ?? null,
    doors,
    location,
    province: location,
    imageUrls: Array.isArray(images) ? images : [],
    sellerType: "concesionaria",
    isVerified: true,
    acceptsSwap: true,
    hasFinancing: true,
  };
}

async function scrapeKavakHtml(): Promise<RawListing[]> {
  const listings: RawListing[] = [];
  let page = 0;

  try {
    while (page < MAX_PAGES) {
      const url =
        page === 0
          ? `${BASE_URL}/ar/usados`
          : `${BASE_URL}/ar/usados?page=${page}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AutoOfertas/1.0; +https://auto-ofertas.com)",
          Accept: "text/html",
        },
      });

      if (!res.ok) {
        if (page === 0) throw new Error(`Kavak fetch failed: ${res.status}`);
        break;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      const cards = $(
        [
          "a[href*='/ar/venta/']",
          "[class*='card']",
          "[class*='listing']",
          "article",
        ].join(", ")
      );

      let found = 0;

      cards.each((_, el) => {
        try {
          const $el = $(el);
          const link = $el.attr("href") ?? $el.find("a[href*='/venta/']").first().attr("href");
          const href = link?.startsWith("http")
            ? link
            : link
              ? new URL(link, BASE_URL).href
              : "";

          if (!href || !href.includes("/venta/")) return;

          const slug = href.split("/venta/")[1]?.split("?")[0] ?? "";
          if (!slug) return;

          const text = $el.text();
          const priceText =
            $el.find("[class*='price'], [class*='Price']").first().text() || text;
          const price = parsePrice(priceText);

          const year = parseYear(text);
          const km = parseKm(text);
          const transmission = parseTransmission(text);
          const bodyType = parseBodyType(text);

          const titleEl = $el.find("h3, h2, [class*='title'], [class*='Title']").first();
          const titleText = titleEl.text().trim() || text.slice(0, 80);

          const brandModel = titleText.split("•").map((s) => s.trim());
          const brand = brandModel[0] ?? "";
          const model = brandModel[1] ?? "";

          const img =
            $el.find("img").first().attr("src") ??
            $el.find("img").first().attr("data-src") ??
            "";

          const locationText =
            $el.find("[class*='location'], [class*='Location']").first().text() ||
            text;
          const province =
            locationText.includes("Buenos Aires") ? "Buenos Aires" : "Argentina";

          const versionMatch = text.match(/\d{4}\s*[•·]\s*[\d.]+\s*km\s*[•·]\s*(.+?)(?:\s*[•·]|\s*Manual|\s*Automático)/i);
          const version = versionMatch?.[1]?.trim() ?? null;

          listings.push({
            sourceId: slug,
            sourceUrl: href,
            title: titleText || `${brand} ${model}`.trim(),
            brand: brand || "Desconocida",
            model: model || "Desconocido",
            version,
            year: year || new Date().getFullYear(),
            isNew: false,
            price,
            currency: "ARS",
            km,
            fuelType: null,
            transmission,
            bodyType,
            doors: null,
            location: province,
            province,
            imageUrls: img
              ? [img.startsWith("http") ? img : new URL(img, BASE_URL).href]
              : [],
            sellerType: "concesionaria",
            isVerified: true,
            acceptsSwap: true,
            hasFinancing: true,
          });

          found++;
        } catch {
          // Skip malformed cards
        }
      });

      if (found === 0 && page === 0) break;

      const hasNext = $("a[href*='page=']").length > 0;
      if (!hasNext || found === 0) break;

      page++;
      await sleep(DELAY_BETWEEN_PAGES_MS);
    }

    return listings;
  } catch {
    return [];
  }
}
