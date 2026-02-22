import type { Listing, PolycardData } from "./types.js";

export const USD_RATE = 1250;

export const IMPORTED_BRANDS = new Set([
  "BMW", "Audi", "Mercedes-Benz", "Porsche", "Volvo", "Jaguar",
  "Land Rover", "Mini", "Alfa Romeo", "Lexus", "Maserati",
]);

export const BRAND_FIX: Record<string, string> = {
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
  "land rover": "Land Rover", "alfa romeo": "Alfa Romeo",
  lexus: "Lexus", maserati: "Maserati",
};

export const PROVINCE_FIX: Record<string, string> = {
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

export function fixBrand(raw: string): string {
  const t = raw.trim();
  return (
    BRAND_FIX[t.toLowerCase()] ??
    t
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  );
}

export function fixProvince(locationText: string): string {
  const parts = locationText.split(" - ");
  const province = (parts[parts.length - 1] ?? "").trim();
  return PROVINCE_FIX[province.toLowerCase()] ?? province;
}

export function parseTitle(title: string): {
  brand: string;
  model: string;
  version: string | null;
} {
  const words = title.trim().split(/\s+/);
  const brand = fixBrand(words[0] ?? "");
  const rest = words.slice(1);
  if (rest.length === 0) return { brand, model: "", version: null };
  return {
    brand,
    model: rest[0] ?? "",
    version: rest.length > 1 ? rest.slice(1).join(" ") : null,
  };
}

export function parseAttributes(texts: string[]): {
  year: number;
  km: number;
  isNew: boolean;
} {
  let year = 0,
    km = 0,
    isNew = false;
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

export function inferAttributes(listing: Listing): void {
  const title =
    `${listing.model} ${listing.version ?? ""}`.toLowerCase();
  if (!listing.transmission) {
    if (
      /\bat\b|automát|automatic|cvt|dsg|tiptronic|powershift|dct/.test(title)
    )
      listing.transmission = "automatica";
    else if (/\bmt\b|manual/.test(title)) listing.transmission = "manual";
  }
  if (!listing.fuelType) {
    if (/tdi|diesel|cdti|hdi|dci|jtd|tdci/.test(title))
      listing.fuelType = "diesel";
    else if (/gnc/.test(title)) listing.fuelType = "gnc";
    else if (/e-tron|eléctric|electric|ev\b|bev/.test(title))
      listing.fuelType = "electrico";
    else if (/hybrid|híbrid|e-?hybrid|phev/.test(title))
      listing.fuelType = "hibrido";
    else if (/tsi|tfsi|vtec|vti|nafta|16v|mpi/.test(title))
      listing.fuelType = "nafta";
  }
  if (!listing.bodyType) {
    const bm = `${listing.brand} ${listing.model}`.toLowerCase();
    const pickups = [
      "amarok", "hilux", "ranger", "frontier", "s10", "montana",
      "toro", "maverick", "oroch", "strada",
    ];
    const suvs = [
      "t-cross", "tcross", "tracker", "kicks", "hrv", "hr-v",
      "duster", "tiggo", "tiguan", "tucson", "sportage",
      "corolla cross", "taos", "territory", "ecosport", "captur",
      "2008", "3008", "5008", "koleos", "equinox", "trailblazer",
      "q3", "q5", "q7", "q8", "x1", "x3", "x5", "glb", "glc",
      "gle", "gla",
    ];
    const sedans = [
      "corolla", "vento", "cruze", "civic", "sentra", "virtus",
      "cronos", "logan", "onix plus", "a3 sedan", "a4", "a6",
      "serie 3", "serie 5", "clase c", "clase e",
    ];
    const hatchbacks = [
      "gol", "polo", "onix", "yaris", "sandero", "208", "fiesta",
      "ka", "clio", "kwid", "mobi", "argo", "golf",
    ];
    if (pickups.some((p) => bm.includes(p))) listing.bodyType = "pickup";
    else if (suvs.some((s) => bm.includes(s))) listing.bodyType = "suv";
    else if (sedans.some((s) => bm.includes(s))) listing.bodyType = "sedan";
    else if (hatchbacks.some((h) => bm.includes(h)))
      listing.bodyType = "hatchback";
  }
}

export function polycardToListing(pc: PolycardData): Listing | null {
  const meta = pc.metadata;
  if (!meta?.id) return null;

  const titleComp = pc.components?.find((c) => c.type === "title");
  const priceComp = pc.components?.find((c) => c.type === "price");
  const attrsComp = pc.components?.find(
    (c) => c.type === "attributes_list"
  );
  const locationComp = pc.components?.find((c) => c.type === "location");
  const sellerComp = pc.components?.find((c) => c.type === "seller");

  const titleText = titleComp?.title?.text ?? "";
  const price = priceComp?.price?.current_price?.value ?? 0;
  const currency = priceComp?.price?.current_price?.currency ?? "ARS";
  if (!titleText || !price) return null;

  const { brand, model, version } = parseTitle(titleText);
  if (!brand) return null;

  const { year, km, isNew } = parseAttributes(
    attrsComp?.attributes_list?.texts ?? []
  );
  const locationText = locationComp?.location?.text ?? "Argentina";
  const province = fixProvince(locationText);

  const sellerText = sellerComp?.seller?.text ?? "";
  const hasCockade =
    sellerComp?.seller?.values?.some(
      (v) => v.icon?.key === "icon_cockade"
    ) ?? false;
  const isConcesionaria =
    hasCockade || sellerText.toLowerCase().includes("oficial");

  const imageUrls: string[] = [];
  for (const pic of pc.pictures?.pictures ?? []) {
    if (pic.id)
      imageUrls.push(`https://http2.mlstatic.com/D_NQ_NP_${pic.id}-O.webp`);
  }

  const sourceUrl = meta.url
    ? meta.url.startsWith("http")
      ? meta.url
      : `https://${meta.url}`
    : `https://auto.mercadolibre.com.ar/MLA-${meta.id}`;

  const now = new Date().toISOString();
  const isUsd = currency === "USD";
  const priceArs = isUsd ? Math.round(price * USD_RATE) : price;
  const priceUsd = isUsd ? price : Math.round(price / USD_RATE);

  return {
    id: `ml-${meta.id}`,
    source: "mercadolibre",
    sourceId: meta.id,
    sourceUrl,
    brand,
    model,
    version,
    year,
    isNew,
    price,
    currency: isUsd ? ("USD" as const) : ("ARS" as const),
    priceArs,
    priceUsd,
    km,
    fuelType: null,
    transmission: null,
    bodyType: null,
    doors: null,
    isImported: IMPORTED_BRANDS.has(brand),
    location: locationText,
    province,
    imageUrls,
    sellerType: isConcesionaria ? "concesionaria" : "particular",
    verificationBadge: isConcesionaria ? "concesionaria" : null,
    acceptsSwap: false,
    hasFinancing: isConcesionaria,
    dealScore: 0,
    consumption: null,
    tankCapacity: null,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };
}
