import type { RawListing } from "./types.js";

export interface NormalizedListing {
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
  sellerType: string;
  verificationBadge: string | null;
  acceptsSwap: boolean;
  hasFinancing: boolean;
  consumption: number | null;
  tankCapacity: number | null;
}

const BRAND_CORRECTIONS: Record<string, string> = {
  volkswagen: "Volkswagen",
  vw: "Volkswagen",
  "mercedes benz": "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  bmw: "BMW",
  audi: "Audi",
  porsche: "Porsche",
  toyota: "Toyota",
  ford: "Ford",
  chevrolet: "Chevrolet",
  chevy: "Chevrolet",
  fiat: "Fiat",
  renault: "Renault",
  honda: "Honda",
  nissan: "Nissan",
  volvo: "Volvo",
  jeep: "Jeep",
  peugeot: "Peugeot",
  citroen: "Citroën",
  citroën: "Citroën",
  hyundai: "Hyundai",
  kia: "Kia",
  mazda: "Mazda",
  mitsubishi: "Mitsubishi",
  subaru: "Subaru",
  land: "Land Rover",
  "land rover": "Land Rover",
  jaguar: "Jaguar",
  mini: "Mini",
  alfa: "Alfa Romeo",
  "alfa romeo": "Alfa Romeo",
};

const IMPORTED_BRANDS = new Set([
  "BMW",
  "Audi",
  "Mercedes-Benz",
  "Porsche",
  "Volvo",
  "Jaguar",
  "Land Rover",
  "Mini",
  "Alfa Romeo",
  "Lexus",
  "Infiniti",
  "Acura",
  "Genesis",
  "Maserati",
  "Ferrari",
  "Lamborghini",
  "Bentley",
  "Rolls-Royce",
]);

const FUEL_TYPE_MAP: Record<string, string> = {
  nafta: "nafta",
  gasolina: "nafta",
  bencina: "nafta",
  premium: "nafta",
  "super": "nafta",
  diesel: "diesel",
  gasoil: "diesel",
  "gas oil": "diesel",
  gnc: "gnc",
  gas: "gnc",
  natural: "gnc",
  electrico: "electrico",
  eléctrico: "electrico",
  electric: "electrico",
  ev: "electrico",
  hibrido: "hibrido",
  híbrido: "hibrido",
  hybrid: "hibrido",
  hybrido: "hibrido",
};

const TRANSMISSION_MAP: Record<string, string> = {
  manual: "manual",
  mecánica: "manual",
  mecanica: "manual",
  mt: "manual",
  automatica: "automatica",
  automática: "automatica",
  at: "automatica",
  cvt: "automatica",
  dct: "automatica",
  dsg: "automatica",
  tiptronic: "automatica",
  secuencial: "automatica",
};

const BODY_TYPE_MAP: Record<string, string> = {
  sedan: "sedan",
  sedán: "sedan",
  suv: "suv",
  utilitario: "suv",
  crossover: "suv",
  hatchback: "hatchback",
  hatch: "hatchback",
  pickup: "pickup",
  camioneta: "pickup",
  coupe: "coupe",
  coupé: "coupe",
  van: "van",
  minivan: "van",
  convertible: "convertible",
  cabriolet: "convertible",
  otro: "otro",
  other: "otro",
};

const PROVINCE_MAP: Record<string, string> = {
  "buenos aires": "Buenos Aires",
  "caba": "CABA",
  "capital federal": "CABA",
  "ciudad autónoma de buenos aires": "CABA",
  "ciudad autonoma de buenos aires": "CABA",
  catamarca: "Catamarca",
  chaco: "Chaco",
  chubut: "Chubut",
  córdoba: "Córdoba",
  cordoba: "Córdoba",
  corrientes: "Corrientes",
  "entre ríos": "Entre Ríos",
  "entre rios": "Entre Ríos",
  formosa: "Formosa",
  jujuy: "Jujuy",
  "la pampa": "La Pampa",
  "la rioja": "La Rioja",
  mendoza: "Mendoza",
  misiones: "Misiones",
  neuquén: "Neuquén",
  neuquen: "Neuquén",
  "río negro": "Río Negro",
  "rio negro": "Río Negro",
  salta: "Salta",
  "san juan": "San Juan",
  "san luis": "San Luis",
  "santa cruz": "Santa Cruz",
  "santa fe": "Santa Fe",
  "santiago del estero": "Santiago del Estero",
  "tierra del fuego": "Tierra del Fuego",
  tucumán: "Tucumán",
  tucuman: "Tucumán",
};

export function normalizeBrand(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  const corrected = BRAND_CORRECTIONS[lower];
  if (corrected) return corrected;
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeModel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeFuelType(raw: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const lower = raw.trim().toLowerCase();
  return FUEL_TYPE_MAP[lower] ?? null;
}

export function normalizeTransmission(raw: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const lower = raw.trim().toLowerCase();
  return TRANSMISSION_MAP[lower] ?? null;
}

export function normalizeBodyType(raw: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const lower = raw.trim().toLowerCase();
  return BODY_TYPE_MAP[lower] ?? null;
}

export function normalizeProvince(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  return PROVINCE_MAP[lower] ?? trimmed.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export function detectImported(brand: string, _model: string): boolean {
  const normalizedBrand = normalizeBrand(brand);
  return IMPORTED_BRANDS.has(normalizedBrand);
}

export function generateListingId(source: string, sourceId: string): string {
  const prefix = source.toLowerCase().replace(/\s+/g, "-");
  const cleanId = String(sourceId).trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return `${prefix}-${cleanId}`;
}

function getImages(raw: RawListing): string[] {
  const urls = raw.imageUrls ?? raw.images ?? [];
  return Array.isArray(urls) ? urls.filter((u): u is string => typeof u === "string") : [];
}

function getSellerType(raw: RawListing): string {
  const v = (raw.sellerType ?? "").toString().toLowerCase();
  if (v.includes("concesionaria") || v.includes("concesionario") || v.includes("agencia")) return "concesionaria";
  return "particular";
}

function getVerificationBadge(raw: RawListing): string | null {
  if (raw.isVerified) return "kavak_verified";
  const v = (raw.verificationBadge ?? "").toString().toLowerCase();
  if (!v) return null;
  if (v.includes("kavak")) return "kavak_verified";
  if (v.includes("ml") || v.includes("mercadolibre") || v.includes("verificado")) return "ml_verified";
  if (v.includes("concesionaria")) return "concesionaria";
  return v || null;
}

export function normalizeListings(
  source: string,
  rawListings: RawListing[],
  usdRate: number
): NormalizedListing[] {
  return rawListings.map((raw) => {
    const brand = normalizeBrand(raw.brand);
    const model = normalizeModel(raw.model);
    const sourceId = String(raw.sourceId).trim();
    const id = generateListingId(source, sourceId);

    return {
      id,
      source,
      sourceId,
      sourceUrl: String(raw.sourceUrl || "").trim() || `#${sourceId}`,
      brand,
      model,
      version: raw.version != null && String(raw.version).trim() ? String(raw.version).trim() : null,
      year: Math.max(1900, Math.min(2100, Number(raw.year) || new Date().getFullYear())),
      isNew: Boolean(raw.isNew),
      price: Math.max(0, Number(raw.price) || 0),
      priceUsd: raw.priceUsd != null ? Number(raw.priceUsd) : (usdRate > 0 ? (Number(raw.price) || 0) / usdRate : null),
      km: Math.max(0, Number(raw.km) || 0),
      fuelType: normalizeFuelType(raw.fuelType ?? null),
      transmission: normalizeTransmission(raw.transmission ?? null),
      bodyType: normalizeBodyType(raw.bodyType ?? null),
      doors: raw.doors != null ? Math.max(0, Math.min(10, Number(raw.doors) || 0)) : null,
      isImported: detectImported(brand, model),
      location: String(raw.location || "").trim() || "Sin especificar",
      province: normalizeProvince(raw.province ?? raw.location ?? ""),
      imageUrls: getImages(raw),
      sellerType: getSellerType(raw),
      verificationBadge: getVerificationBadge(raw),
      acceptsSwap: Boolean(raw.acceptsSwap),
      hasFinancing: Boolean(raw.hasFinancing),
      consumption: raw.consumption != null ? Number(raw.consumption) : null,
      tankCapacity: raw.tankCapacity != null ? Number(raw.tankCapacity) : null,
    };
  });
}
