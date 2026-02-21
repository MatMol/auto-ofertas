/**
 * Scrape script for GitHub Actions.
 *
 * Scrapes MercadoLibre listings (HTML polycard extraction),
 * normalizes, filters suspicious listings, calculates deal scores,
 * and writes to Cloudflare D1 via the HTTP API.
 *
 * Environment variables required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   D1_DATABASE_ID
 */

const PAGES_TO_FETCH = 42;
const DELAY_MS = 1500;
const BATCH_SIZE = 25;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const DB_ID = process.env.D1_DATABASE_ID!;

if (!ACCOUNT_ID || !API_TOKEN || !DB_ID) {
  console.error("Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID");
  process.exit(1);
}

const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- Types ----

interface Listing {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  isNew: boolean;
  price: number;
  currency: "ARS" | "USD";
  priceArs: number;
  priceUsd: number | null;
  km: number;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  doors: number | null;
  isImported: boolean;
  location: string;
  province: string;
  imageUrls: string[];
  sellerType: "particular" | "concesionaria";
  verificationBadge: string | null;
  acceptsSwap: boolean;
  hasFinancing: boolean;
  dealScore: number;
  consumption: number | null;
  tankCapacity: number | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface PolycardComponent {
  type: string;
  title?: { text?: string };
  price?: { current_price?: { value?: number; currency?: string } };
  attributes_list?: { texts?: string[] };
  location?: { text?: string };
  seller?: { text?: string; values?: Array<{ key?: string; type?: string; icon?: { key?: string } }> };
}

interface PolycardData {
  metadata?: { id?: string; url?: string };
  pictures?: { pictures?: Array<{ id?: string }> };
  components?: PolycardComponent[];
}

// ---- Constants ----

const USD_RATE = 1250;

const IMPORTED_BRANDS = new Set([
  "BMW", "Audi", "Mercedes-Benz", "Porsche", "Volvo", "Jaguar",
  "Land Rover", "Mini", "Alfa Romeo", "Lexus", "Maserati",
]);

const BRAND_FIX: Record<string, string> = {
  volkswagen: "Volkswagen", vw: "Volkswagen",
  "mercedes benz": "Mercedes-Benz", "mercedes-benz": "Mercedes-Benz",
  bmw: "BMW", toyota: "Toyota", ford: "Ford", chevrolet: "Chevrolet",
  fiat: "Fiat", renault: "Renault", honda: "Honda", nissan: "Nissan",
  peugeot: "Peugeot", citroen: "Citroën", citroën: "Citroën",
  hyundai: "Hyundai", kia: "Kia", jeep: "Jeep", dodge: "Dodge",
  ram: "RAM", ds: "DS", chery: "Chery", geely: "Geely",
  subaru: "Subaru", mazda: "Mazda", mitsubishi: "Mitsubishi",
  suzuki: "Suzuki", mini: "Mini", volvo: "Volvo", audi: "Audi",
  porsche: "Porsche", jaguar: "Jaguar",
};

const PROVINCE_FIX: Record<string, string> = {
  "capital federal": "CABA",
  "bs.as. g.b.a. norte": "Buenos Aires",
  "bs.as. g.b.a. sur": "Buenos Aires",
  "bs.as. g.b.a. oeste": "Buenos Aires",
  "bs.as. costa atlántica": "Buenos Aires",
  "bs.as. costa atlantica": "Buenos Aires",
  "buenos aires interior": "Buenos Aires",
  "buenos aires": "Buenos Aires",
  córdoba: "Córdoba", cordoba: "Córdoba",
  "santa fe": "Santa Fe",
  tucumán: "Tucumán", tucuman: "Tucumán",
  mendoza: "Mendoza", salta: "Salta",
  "entre ríos": "Entre Ríos", "entre rios": "Entre Ríos",
  misiones: "Misiones", chaco: "Chaco",
  corrientes: "Corrientes", neuquén: "Neuquén",
  "río negro": "Río Negro", "rio negro": "Río Negro",
  "san juan": "San Juan", jujuy: "Jujuy",
  "san luis": "San Luis", formosa: "Formosa",
  "la pampa": "La Pampa", catamarca: "Catamarca",
  chubut: "Chubut", "la rioja": "La Rioja",
  "santa cruz": "Santa Cruz",
  "santiago del estero": "Santiago del Estero",
  "tierra del fuego": "Tierra del Fuego",
};

// ---- Extraction ----

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
              polycards.push({ metadata: data.metadata, pictures: data.pictures, components: data.components });
            }
          } catch { /* skip */ }
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

// ---- Normalization ----

function fixBrand(raw: string): string {
  const t = raw.trim();
  return BRAND_FIX[t.toLowerCase()] ?? t.split(/\s+/).map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function fixProvince(locationText: string): string {
  const parts = locationText.split(" - ");
  const province = (parts[parts.length - 1] ?? "").trim();
  return PROVINCE_FIX[province.toLowerCase()] ?? province;
}

function parseTitle(title: string): { brand: string; model: string; version: string | null } {
  const words = title.trim().split(/\s+/);
  const brand = fixBrand(words[0] ?? "");
  const rest = words.slice(1);
  if (rest.length === 0) return { brand, model: "", version: null };
  return { brand, model: rest[0] ?? "", version: rest.length > 1 ? rest.slice(1).join(" ") : null };
}

function parseAttributes(texts: string[]): { year: number; km: number; isNew: boolean } {
  let year = 0, km = 0, isNew = false;
  for (const text of texts) {
    const t = text.trim().toLowerCase();
    if (/^\d{4}$/.test(t)) year = parseInt(t, 10);
    else if (t.includes("km")) {
      km = parseInt(t.replace(/[^\d]/g, ""), 10) || 0;
      if (t === "0 km") isNew = true;
    }
  }
  return { year, km, isNew };
}

function inferAttributes(listing: Listing): void {
  const title = `${listing.model} ${listing.version ?? ""}`.toLowerCase();
  if (!listing.transmission) {
    if (/\bat\b|automát|automatic|cvt|dsg|tiptronic|powershift|dct/.test(title)) listing.transmission = "automatica";
    else if (/\bmt\b|manual/.test(title)) listing.transmission = "manual";
  }
  if (!listing.fuelType) {
    if (/tdi|diesel|cdti|hdi|dci|jtd|tdci/.test(title)) listing.fuelType = "diesel";
    else if (/gnc/.test(title)) listing.fuelType = "gnc";
    else if (/e-tron|eléctric|electric|ev\b|bev/.test(title)) listing.fuelType = "electrico";
    else if (/hybrid|híbrid|e-?hybrid|phev/.test(title)) listing.fuelType = "hibrido";
    else if (/tsi|tfsi|vtec|vti|nafta|16v|mpi/.test(title)) listing.fuelType = "nafta";
  }
  if (!listing.bodyType) {
    const bm = `${listing.brand} ${listing.model}`.toLowerCase();
    const pickups = ["amarok", "hilux", "ranger", "frontier", "s10", "montana", "toro", "maverick", "oroch", "strada"];
    const suvs = ["t-cross", "tcross", "tracker", "kicks", "hrv", "hr-v", "duster", "tiggo", "tiguan", "tucson", "sportage", "corolla cross", "taos", "territory", "ecosport", "captur", "2008", "3008", "5008", "koleos", "equinox", "trailblazer", "q3", "q5", "q7", "q8", "x1", "x3", "x5", "glb", "glc", "gle", "gla"];
    const sedans = ["corolla", "vento", "cruze", "civic", "sentra", "virtus", "cronos", "logan", "onix plus", "a3 sedan", "a4", "a6", "serie 3", "serie 5", "clase c", "clase e"];
    const hatchbacks = ["gol", "polo", "onix", "yaris", "sandero", "208", "fiesta", "ka", "clio", "kwid", "mobi", "argo", "golf"];
    if (pickups.some((p) => bm.includes(p))) listing.bodyType = "pickup";
    else if (suvs.some((s) => bm.includes(s))) listing.bodyType = "suv";
    else if (sedans.some((s) => bm.includes(s))) listing.bodyType = "sedan";
    else if (hatchbacks.some((h) => bm.includes(h))) listing.bodyType = "hatchback";
  }
}

function polycardToListing(pc: PolycardData): Listing | null {
  const meta = pc.metadata;
  if (!meta?.id) return null;
  const titleComp = pc.components?.find((c) => c.type === "title");
  const priceComp = pc.components?.find((c) => c.type === "price");
  const attrsComp = pc.components?.find((c) => c.type === "attributes_list");
  const locationComp = pc.components?.find((c) => c.type === "location");
  const sellerComp = pc.components?.find((c) => c.type === "seller");
  const titleText = titleComp?.title?.text ?? "";
  const price = priceComp?.price?.current_price?.value ?? 0;
  const currency = priceComp?.price?.current_price?.currency ?? "ARS";
  if (!titleText || !price) return null;
  const { brand, model, version } = parseTitle(titleText);
  if (!brand) return null;
  const { year, km, isNew } = parseAttributes(attrsComp?.attributes_list?.texts ?? []);
  const locationText = locationComp?.location?.text ?? "Argentina";
  const province = fixProvince(locationText);
  const sellerText = sellerComp?.seller?.text ?? "";
  const hasCockade = sellerComp?.seller?.values?.some((v) => v.icon?.key === "icon_cockade") ?? false;
  const isConcesionaria = hasCockade || sellerText.toLowerCase().includes("oficial");
  const imageUrls: string[] = [];
  for (const pic of pc.pictures?.pictures ?? []) {
    if (pic.id) imageUrls.push(`https://http2.mlstatic.com/D_NQ_NP_${pic.id}-O.webp`);
  }
  const sourceUrl = meta.url ? (meta.url.startsWith("http") ? meta.url : `https://${meta.url}`) : `https://auto.mercadolibre.com.ar/MLA-${meta.id}`;
  const now = new Date().toISOString();
  const isUsd = currency === "USD";
  const priceArs = isUsd ? Math.round(price * USD_RATE) : price;
  const priceUsd = isUsd ? price : Math.round(price / USD_RATE);

  return {
    id: `ml-${meta.id}`, source: "mercadolibre", sourceId: meta.id, sourceUrl,
    brand, model, version, year, isNew, price,
    currency: isUsd ? "USD" as const : "ARS" as const, priceArs, priceUsd,
    km, fuelType: null, transmission: null, bodyType: null, doors: null,
    isImported: IMPORTED_BRANDS.has(brand), location: locationText, province,
    imageUrls, sellerType: isConcesionaria ? "concesionaria" : "particular",
    verificationBadge: isConcesionaria ? "concesionaria" : null,
    acceptsSwap: false, hasFinancing: isConcesionaria, dealScore: 0,
    consumption: null, tankCapacity: null, createdAt: now, updatedAt: now, isActive: true,
  };
}

// ---- Deal Score ----

function calculateScores(listings: Listing[]): void {
  const groups = new Map<string, Listing[]>();
  for (const l of listings) {
    const key = `${l.brand}|${l.model}`;
    const group = groups.get(key) ?? [];
    group.push(l);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (group.length < 2) { for (const l of group) l.dealScore = 55; continue; }
    const avgPrice = group.reduce((s, l) => s + l.priceArs, 0) / group.length;
    const avgKm = group.reduce((s, l) => s + l.km, 0) / group.length;
    for (const l of group) {
      const priceRatio = avgPrice > 0 ? l.priceArs / avgPrice : 1;
      const priceScore = Math.max(0, Math.min(100, (2 - priceRatio) * 50));
      const kmRatio = avgKm > 0 ? l.km / avgKm : 1;
      const kmScore = l.isNew ? 90 : Math.max(0, Math.min(100, (2 - kmRatio) * 50));
      const pricePerKm = l.km > 0 ? l.priceArs / l.km : l.priceArs;
      const groupPpkm = group.filter((g) => g.km > 0).map((g) => g.priceArs / g.km);
      const avgPpkm = groupPpkm.length > 0 ? groupPpkm.reduce((a, b) => a + b, 0) / groupPpkm.length : pricePerKm;
      const ppkmRatio = avgPpkm > 0 ? pricePerKm / avgPpkm : 1;
      const ppkmScore = Math.max(0, Math.min(100, (2 - ppkmRatio) * 50));
      let completeness = 0;
      if (l.imageUrls.length > 0) completeness += 40;
      if (l.version) completeness += 25;
      if (l.fuelType) completeness += 15;
      if (l.transmission) completeness += 10;
      if (l.bodyType) completeness += 10;
      const trusted = l.verificationBadge === "ml_verified" ? 80 : l.verificationBadge === "concesionaria" ? 65 : l.sellerType === "concesionaria" ? 55 : 35;
      const score = priceScore * 0.40 + kmScore * 0.20 + ppkmScore * 0.15 + completeness * 0.10 + 50 * 0.10 + trusted * 0.05;
      l.dealScore = Math.round(Math.max(10, Math.min(98, score)));
    }
  }
}

// ---- Suspicious Listing Filter ----

const ANTICIPO_KEYWORDS = [
  "cuota", "anticipo", "plan ", "solo con dni", "retiralo", "retíralo",
  "adjudic", "reserv", "financiacion", "financiación", "entrega inmediata",
  "uber", "cabify", "aplicaciones", "promo ",
];

function filterSuspiciousListings(listings: Listing[]): Listing[] {
  const groups = new Map<string, number[]>();
  for (const l of listings) {
    const key = `${l.brand}|${l.model}`;
    const arr = groups.get(key) ?? [];
    arr.push(l.priceArs);
    groups.set(key, arr);
  }
  const medians = new Map<string, number>();
  for (const [key, prices] of groups) {
    if (prices.length < 3) continue;
    const sorted = [...prices].sort((a, b) => a - b);
    medians.set(key, sorted[Math.floor(sorted.length / 2)]);
  }
  return listings.filter((l) => {
    const key = `${l.brand}|${l.model}`;
    const median = medians.get(key);
    const fullText = `${l.model} ${l.version ?? ""} ${l.sourceUrl}`.toLowerCase();
    const isSuspicious = ANTICIPO_KEYWORDS.some((kw) => fullText.includes(kw));
    if (isSuspicious && (!median || l.priceArs < median * 0.5)) return false;
    if (median && groups.get(key)!.length >= 5 && l.priceArs / median < 0.30) return false;
    if (l.isNew && median && l.priceArs / median < 0.40) return false;
    return true;
  });
}

// ---- D1 HTTP API ----

async function queryD1(sql: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(D1_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API error ${res.status}: ${text}`);
  }
  return res.json();
}

function listingToParams(l: Listing, now: string): unknown[] {
  return [
    l.id, l.source, l.sourceId, l.sourceUrl, l.brand, l.model, l.version,
    l.year, l.isNew ? 1 : 0, l.price, l.currency, l.priceArs, l.priceUsd, l.km,
    l.fuelType, l.transmission, l.bodyType, l.doors, l.isImported ? 1 : 0,
    l.location, l.province, JSON.stringify(l.imageUrls), l.sellerType, l.verificationBadge,
    l.acceptsSwap ? 1 : 0, l.hasFinancing ? 1 : 0, l.dealScore, l.consumption, l.tankCapacity,
    now, now, 1,
  ];
}

const COLUMNS = `id, source, source_id, source_url, brand, model, version,
  year, is_new, price, currency, price_ars, price_usd, km,
  fuel_type, transmission, body_type, doors, is_imported,
  location, province, image_urls, seller_type, verification_badge,
  accepts_swap, has_financing, deal_score, consumption, tank_capacity,
  created_at, updated_at, is_active`;

const PLACEHOLDERS_ONE = `(${Array(32).fill("?").join(",")})`;

async function insertListings(listings: Listing[]): Promise<number> {
  let inserted = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => PLACEHOLDERS_ONE).join(",");
    const allParams = batch.flatMap((l) => listingToParams(l, now));

    try {
      await queryD1(
        `INSERT OR REPLACE INTO listings (${COLUMNS}) VALUES ${placeholders}`,
        allParams
      );
      inserted += batch.length;
    } catch (err) {
      console.error(`  Batch error at offset ${i}, falling back to individual inserts:`, err);
      for (const l of batch) {
        try {
          await queryD1(
            `INSERT OR REPLACE INTO listings (${COLUMNS}) VALUES ${PLACEHOLDERS_ONE}`,
            listingToParams(l, now)
          );
          inserted++;
        } catch (e2) {
          console.error(`  Error inserting ${l.id}:`, e2);
        }
      }
    }

    const progress = Math.min(i + BATCH_SIZE, listings.length);
    process.stdout.write(`\r  ${progress}/${listings.length} written...`);

    if (i + BATCH_SIZE < listings.length) await sleep(100);
  }

  console.log();
  return inserted;
}

async function updateBrandsModels(): Promise<void> {
  await queryD1("DELETE FROM brands_models");
  await queryD1(
    `INSERT INTO brands_models (id, brand, model, count)
     SELECT brand || '-' || model, brand, model, COUNT(*) as count
     FROM listings WHERE is_active = 1
     GROUP BY brand, model`
  );
}

// ---- Main ----

async function main() {
  console.log("=== AutoOfertas Scraper ===\n");
  console.log("Scraping MercadoLibre...\n");

  const allListings: Listing[] = [];
  const seenIds = new Set<string>();

  for (let page = 0; page < PAGES_TO_FETCH; page++) {
    const offset = page * 48;
    const url = `https://autos.mercadolibre.com.ar/_Desde_${offset + 1}_NoIndex_true`;
    process.stdout.write(`  Page ${page + 1}/${PAGES_TO_FETCH} (offset ${offset})...`);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "es-AR,es;q=0.9" },
        redirect: "follow",
      });
      if (!res.ok) {
        console.log(` HTTP ${res.status}`);
        if (res.status === 429) { console.log("  Rate limited, waiting 5s..."); await sleep(5000); continue; }
        break;
      }
      const html = await res.text();
      const polycards = extractPolycards(html);
      let added = 0;
      for (const pc of polycards) {
        const listing = polycardToListing(pc);
        if (listing && !seenIds.has(listing.id)) {
          seenIds.add(listing.id);
          allListings.push(listing);
          added++;
        }
      }
      console.log(` ${added} new (${allListings.length} total)`);
      if (added === 0 && polycards.length === 0) { console.log("  End reached"); break; }
    } catch (err) {
      console.log(` error: ${err}`);
    }

    if (page < PAGES_TO_FETCH - 1) await sleep(DELAY_MS);
  }

  if (allListings.length === 0) {
    console.log("\nNo listings scraped.");
    process.exit(1);
  }

  console.log(`\nInferring attributes...`);
  for (const l of allListings) inferAttributes(l);

  console.log(`Filtering suspicious listings...`);
  const filtered = filterSuspiciousListings(allListings);
  console.log(`  Removed ${allListings.length - filtered.length} (${filtered.length} remaining)`);

  console.log(`Calculating deal scores...`);
  calculateScores(filtered);

  console.log(`\nWriting ${filtered.length} listings to D1...`);
  const inserted = await insertListings(filtered);
  console.log(`  Inserted/updated: ${inserted}`);

  console.log(`Updating brands_models...`);
  await updateBrandsModels();

  console.log(`\nDone! ${inserted} listings in D1.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
