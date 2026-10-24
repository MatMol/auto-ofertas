import * as cheerio from "cheerio";
import { fetchWithRetry } from "./http.js";
import {
  classifyPrice,
  normalizeText,
  parseAmount,
  safeUrl,
} from "../../shared/quality.js";
import type { Listing } from "./types.js";
const hosts: Record<string, string[]> = {
  mercadolibre: ["auto.mercadolibre.com.ar", "autos.mercadolibre.com.ar"],
  autocosmos: ["www.autocosmos.com.ar", "autocosmos.com.ar"],
  deruedas: ["www.deruedas.com.ar", "deruedas.com.ar"],
  kavak: ["www.kavak.com", "kavak.com"],
};
export function enrichFromHtml(l: Listing, html: string): boolean {
  const $ = cheerio.load(html),
    heading = normalizeText($("h1").first().text());
  if (
    !heading.includes(normalizeText(l.brand)) ||
    !heading.includes(normalizeText(l.model))
  )
    return false;
  const title = $("title").text();
  const kind = classifyPrice(title, l.price);
  if (kind !== "total") l.priceKind = kind;
  // Only explicit machine-readable offers update a price; unknown page structures preserve the old value.
  let changed = false;
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const raw = JSON.parse($(el).text());
      const nodes = Array.isArray(raw) ? raw : raw["@graph"] || [raw];
      for (const node of nodes) {
        if (!["Car", "Vehicle", "Product"].includes(node["@type"])) continue;
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (
          offer?.price != null &&
          ["ARS", "USD"].includes(offer.priceCurrency)
        ) {
          const price = parseAmount(offer.price, true);
          if (price && price > 0) {
            l.price = price;
            l.currency = offer.priceCurrency;
            l.priceKind = classifyPrice(
              `${title} ${offer.description || ""}`,
              price,
            );
            changed = true;
          }
        }
        if (node.mileageFromOdometer?.unitCode === "KMT") {
          const km = parseAmount(node.mileageFromOdometer.value, true);
          if (km !== null) l.km = km;
        }
        const images = Array.isArray(node.image) ? node.image : [node.image];
        const valid = images.filter(
          (v: unknown): v is string => typeof v === "string" && !!safeUrl(v),
        );
        if (valid.length)
          l.imageUrls = [...new Set([...l.imageUrls, ...valid])].slice(0, 20);
      }
    } catch {
      /* Unsupported or malformed structured data leaves the listing unchanged. */
    }
  });
  $("tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length !== 2) return;
    const label = normalizeText(cells.eq(0).text()),
      value = normalizeText(cells.eq(1).text());
    if (label === "combustible") {
      const known: Record<string, string> = {
        diesel: "diesel",
        nafta: "nafta",
        gnc: "gnc",
        electrico: "electrico",
        hibrido: "hibrido",
      };
      if (known[value]) {
        l.fuelType = known[value];
        l.inferredFields = l.inferredFields?.filter((x) => x !== "fuelType");
      }
    }
    if (label === "transmision" && /automatica|manual/.test(value)) {
      l.transmission = value.includes("automatica") ? "automatica" : "manual";
      l.inferredFields = l.inferredFields?.filter((x) => x !== "transmission");
    }
    if (label === "tanque de combustible") {
      const v = parseAmount(value);
      if (v && v <= 200) l.tankCapacity = v;
    }
  });
  return changed;
}
export async function enrichListing(l: Listing): Promise<boolean> {
  const url = safeUrl(l.sourceUrl);
  if (!url || !hosts[l.source]?.includes(new URL(url).hostname))
    throw new Error("Unsupported detail source");
  const response = await fetchWithRetry(url, {
    cache: "no-store",
    redirect: "error",
  });
  return enrichFromHtml(l, await response.text());
}
export async function enrichCandidates(listings: Listing[]) {
  const limit = Math.max(
    0,
    Math.min(100, Number(process.env.ENRICH_LIMIT ?? 10)),
  );
  for (const l of listings
    .filter((l) => l.priceKind === "total")
    .slice(0, limit)) {
    try {
      await enrichListing(l);
    } catch (e) {
      console.warn(`Detail unavailable for ${l.id}: ${String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
