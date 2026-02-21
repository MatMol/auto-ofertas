import type { RawListing } from "../types.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_ITEMS = 1000;
const PAGE_SIZE = 50;
const RATE_LIMIT_DELAY_MS = 500;

interface MLAttribute {
  id?: string;
  name?: string;
  value_id?: string | null;
  value_name?: string | null;
  value_struct?: { number?: number; unit?: string } | null;
}

interface MLSearchResult {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  condition: string;
  attributes?: MLAttribute[];
  location?: {
    city?: { name?: string };
    state?: { name?: string };
  };
  seller?: {
    id?: number;
    permalink?: string;
    seller_reputation?: {
      tags?: string[];
    };
  };
  pictures?: Array<{ url?: string; secure_url?: string }>;
}

interface MLSearchResponse {
  results?: MLSearchResult[];
  paging?: { total: number; offset: number; limit: number };
}

function getAttr(results: MLAttribute[] | undefined, id: string): string | null {
  const attr = results?.find((a) => a.id === id);
  const val = attr?.value_name ?? attr?.value_struct?.number?.toString();
  return val != null && val !== "" ? String(val) : null;
}

function getAttrNumber(results: MLAttribute[] | undefined, id: string): number {
  const attr = results?.find((a) => a.id === id);
  if (attr?.value_struct?.number != null) return attr.value_struct.number;
  const str = attr?.value_name;
  if (typeof str === "string") {
    const num = parseInt(str.replace(/\D/g, ""), 10);
    if (!isNaN(num)) return num;
  }
  return 0;
}

function normalizeFuelType(val: string | null): string | null {
  if (!val) return null;
  const v = val.toLowerCase();
  if (v.includes("nafta") || v.includes("gasolina") || v.includes("bencina"))
    return "nafta";
  if (v.includes("diesel") || v.includes("gasoil")) return "diesel";
  if (v.includes("gnc") || v.includes("gas")) return "gnc";
  if (v.includes("eléctrico") || v.includes("electrico")) return "electrico";
  if (v.includes("híbrido") || v.includes("hibrido")) return "hibrido";
  return val;
}

function normalizeTransmission(val: string | null): string | null {
  if (!val) return null;
  const v = val.toLowerCase();
  if (v.includes("automática") || v.includes("automatica") || v.includes("auto"))
    return "automática";
  if (v.includes("manual")) return "manual";
  if (v.includes("cvt")) return "cvt";
  return val;
}

function mapToRawListing(item: MLSearchResult): RawListing {
  const attrs = item.attributes ?? [];
  const brand = getAttr(attrs, "BRAND") ?? "";
  const model = getAttr(attrs, "MODEL") ?? "";
  const version = getAttr(attrs, "TRIM") ?? getAttr(attrs, "VEHICLE_TRIM") ?? null;
  const year = getAttrNumber(attrs, "VEHICLE_YEAR") || 0;
  const km = getAttrNumber(attrs, "KILOMETERS");
  const fuelType = normalizeFuelType(getAttr(attrs, "FUEL_TYPE"));
  const transmission = normalizeTransmission(getAttr(attrs, "TRANSMISSION"));
  const bodyType = getAttr(attrs, "VEHICLE_BODY_TYPE") ?? getAttr(attrs, "VEHICLE_TYPE");
  const doorsStr = getAttr(attrs, "DOORS");
  const doors = doorsStr ? parseInt(doorsStr.replace(/\D/g, ""), 10) : null;
  const isNew = item.condition === "new";

  const province = item.location?.state?.name ?? "";
  const city = item.location?.city?.name ?? "";
  const location = [city, province].filter(Boolean).join(", ") || "Argentina";

  const imageUrls: string[] = [];
  if (item.thumbnail) imageUrls.push(item.thumbnail);
  for (const p of item.pictures ?? []) {
    const url = p.secure_url ?? p.url;
    if (url && !imageUrls.includes(url)) imageUrls.push(url);
  }

  const sellerTags = item.seller?.seller_reputation?.tags ?? [];
  const isOfficialStore = sellerTags.some(
    (t) => typeof t === "string" && t.toLowerCase().includes("official")
  );
  const sellerType: "particular" | "concesionaria" = isOfficialStore
    ? "concesionaria"
    : "particular";

  const isVerified = sellerTags.some(
    (t) =>
      typeof t === "string" &&
      (t.toLowerCase().includes("verified") || t.toLowerCase().includes("ml_verified"))
  );

  return {
    sourceId: item.id,
    sourceUrl: item.permalink,
    title: item.title,
    brand,
    model,
    version,
    year,
    isNew,
    price: item.price,
    currency: item.currency_id ?? "ARS",
    km,
    fuelType,
    transmission,
    bodyType,
    doors: Number.isNaN(doors) ? null : doors,
    location,
    province,
    imageUrls,
    sellerType,
    isVerified,
    acceptsSwap: false,
    hasFinancing: false,
  };
}

export async function fetchMercadoLibreListings(
  appToken: string
): Promise<RawListing[]> {
  const listings: RawListing[] = [];
  let offset = 0;

  try {
    while (listings.length < MAX_ITEMS) {
      const url = new URL("https://api.mercadolibre.com/sites/MLA/search");
      url.searchParams.set("category", "MLA1743");
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("limit", String(PAGE_SIZE));

      const headers: HeadersInit = {};
      if (appToken) {
        headers["Authorization"] = `Bearer ${appToken}`;
      }

      const res = await fetch(url.toString(), { headers });

      if (!res.ok) {
        if (res.status === 429) {
          await sleep(2000);
          continue;
        }
        throw new Error(`MercadoLibre API error: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as MLSearchResponse;
      const results = data.results ?? [];

      if (results.length === 0) break;

      for (const item of results) {
        try {
          listings.push(mapToRawListing(item));
        } catch {
          // Skip malformed items
        }
      }

      offset += results.length;
      if (results.length < PAGE_SIZE) break;

      await sleep(RATE_LIMIT_DELAY_MS);
    }

    return listings;
  } catch {
    return [];
  }
}
