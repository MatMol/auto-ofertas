import type { Listing } from "@/lib/types";

// Try to load real data seeded from MercadoLibre API (via `pnpm seed`).
// Falls back to hardcoded mock data if no seed file exists.
let SEED_DATA: Listing[] | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SEED_DATA = require("./seed-data.json") as Listing[];
} catch {
  // seed-data.json doesn't exist yet — will use mock data below
}

const now = new Date().toISOString();

const HARDCODED_LISTINGS: Listing[] = [
  {
    id: "ml-001",
    source: "mercadolibre",
    sourceId: "MLA-1234567890",
    sourceUrl: "https://auto.mercadolibre.com.ar/MLA-1234567890",
    brand: "Toyota",
    model: "Corolla",
    version: "XEi 2.0 CVT",
    year: 2022,
    isNew: false,
    price: 28_500_000,
    currency: "ARS",
    priceArs: 28_500_000,
    priceUsd: 24_150,
    km: 35_000,
    fuelType: "nafta",
    transmission: "automatica",
    bodyType: "sedan",
    doors: 4,
    isImported: false,
    location: "Palermo, CABA",
    province: "CABA",
    imageUrls: ["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop"],
    sellerType: "particular",
    verificationBadge: "ml_verified",
    acceptsSwap: false,
    hasFinancing: false,
    dealScore: 87,
    consumption: 7.8,
    tankCapacity: 55,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "kv-001",
    source: "kavak",
    sourceId: "KV-98765",
    sourceUrl: "https://www.kavak.com/ar/auto-98765",
    brand: "Volkswagen",
    model: "Golf",
    version: "1.4 TSI Highline DSG",
    year: 2021,
    isNew: false,
    price: 32_000_000,
    currency: "ARS",
    priceArs: 32_000_000,
    priceUsd: 27_120,
    km: 42_000,
    fuelType: "nafta",
    transmission: "automatica",
    bodyType: "hatchback",
    doors: 5,
    isImported: true,
    location: "Vicente López, Buenos Aires",
    province: "Buenos Aires",
    imageUrls: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop"],
    sellerType: "concesionaria",
    verificationBadge: "kavak_verified",
    acceptsSwap: true,
    hasFinancing: true,
    dealScore: 82,
    consumption: 7.2,
    tankCapacity: 50,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "ml-002",
    source: "mercadolibre",
    sourceId: "MLA-9876543210",
    sourceUrl: "https://auto.mercadolibre.com.ar/MLA-9876543210",
    brand: "Ford",
    model: "Ranger",
    version: "3.2 XLT 4x4 AT",
    year: 2023,
    isNew: false,
    price: 45_000_000,
    currency: "ARS",
    priceArs: 45_000_000,
    priceUsd: 38_135,
    km: 18_000,
    fuelType: "diesel",
    transmission: "automatica",
    bodyType: "pickup",
    doors: 4,
    isImported: false,
    location: "Rosario, Santa Fe",
    province: "Santa Fe",
    imageUrls: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=500&fit=crop"],
    sellerType: "concesionaria",
    verificationBadge: "concesionaria",
    acceptsSwap: true,
    hasFinancing: true,
    dealScore: 91,
    consumption: 9.2,
    tankCapacity: 80,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "dr-001",
    source: "deruedas",
    sourceId: "DR-456789",
    sourceUrl: "https://www.deruedas.com.ar/vendo/Chevrolet/Cruze/Usados/Buenos-Aires?cod=456789",
    brand: "Chevrolet",
    model: "Cruze",
    version: "LTZ 1.4 Turbo AT",
    year: 2020,
    isNew: false,
    price: 22_800_000,
    currency: "ARS",
    priceArs: 22_800_000,
    priceUsd: 19_320,
    km: 58_000,
    fuelType: "nafta",
    transmission: "automatica",
    bodyType: "sedan",
    doors: 4,
    isImported: false,
    location: "Córdoba Capital",
    province: "Córdoba",
    imageUrls: ["https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=500&fit=crop"],
    sellerType: "particular",
    verificationBadge: null,
    acceptsSwap: false,
    hasFinancing: false,
    dealScore: 76,
    consumption: 8.2,
    tankCapacity: 52,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "ac-001",
    source: "autocosmos",
    sourceId: "AC-112233",
    sourceUrl: "https://www.autocosmos.com.ar/auto/112233",
    brand: "Fiat",
    model: "Cronos",
    version: "1.3 Drive",
    year: 2023,
    isNew: false,
    price: 18_500_000,
    currency: "ARS",
    priceArs: 18_500_000,
    priceUsd: 15_680,
    km: 22_000,
    fuelType: "nafta",
    transmission: "manual",
    bodyType: "sedan",
    doors: 4,
    isImported: false,
    location: "La Plata, Buenos Aires",
    province: "Buenos Aires",
    imageUrls: ["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=500&fit=crop"],
    sellerType: "particular",
    verificationBadge: null,
    acceptsSwap: true,
    hasFinancing: false,
    dealScore: 93,
    consumption: 7.0,
    tankCapacity: 48,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "kv-002",
    source: "kavak",
    sourceId: "KV-55555",
    sourceUrl: "https://www.kavak.com/ar/auto-55555",
    brand: "Toyota",
    model: "Hilux",
    version: "SRV 2.8 4x4 AT",
    year: 2022,
    isNew: false,
    price: 52_000_000,
    currency: "ARS",
    priceArs: 52_000_000,
    priceUsd: 44_070,
    km: 45_000,
    fuelType: "diesel",
    transmission: "automatica",
    bodyType: "pickup",
    doors: 4,
    isImported: false,
    location: "Tigre, Buenos Aires",
    province: "Buenos Aires",
    imageUrls: ["https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&h=500&fit=crop"],
    sellerType: "concesionaria",
    verificationBadge: "kavak_verified",
    acceptsSwap: true,
    hasFinancing: true,
    dealScore: 79,
    consumption: 9.8,
    tankCapacity: 80,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "ml-003",
    source: "mercadolibre",
    sourceId: "MLA-1111111111",
    sourceUrl: "https://auto.mercadolibre.com.ar/MLA-1111111111",
    brand: "Renault",
    model: "Sandero",
    version: "Stepway 1.6 Intens CVT",
    year: 2024,
    isNew: false,
    price: 24_200_000,
    currency: "ARS",
    priceArs: 24_200_000,
    priceUsd: 20_510,
    km: 8_000,
    fuelType: "nafta",
    transmission: "automatica",
    bodyType: "hatchback",
    doors: 5,
    isImported: false,
    location: "Quilmes, Buenos Aires",
    province: "Buenos Aires",
    imageUrls: ["https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=500&fit=crop"],
    sellerType: "concesionaria",
    verificationBadge: "concesionaria",
    acceptsSwap: false,
    hasFinancing: true,
    dealScore: 85,
    consumption: 7.5,
    tankCapacity: 50,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "dr-002",
    source: "deruedas",
    sourceId: "DR-789012",
    sourceUrl: "https://www.deruedas.com.ar/vendo/Peugeot/208/Usados/Buenos-Aires?cod=789012",
    brand: "Peugeot",
    model: "208",
    version: "Feline 1.6 AT",
    year: 2021,
    isNew: false,
    price: 21_000_000,
    currency: "ARS",
    priceArs: 21_000_000,
    priceUsd: 17_800,
    km: 47_000,
    fuelType: "nafta",
    transmission: "automatica",
    bodyType: "hatchback",
    doors: 5,
    isImported: false,
    location: "Mendoza Capital",
    province: "Mendoza",
    imageUrls: ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=500&fit=crop"],
    sellerType: "particular",
    verificationBadge: null,
    acceptsSwap: false,
    hasFinancing: false,
    dealScore: 72,
    consumption: 7.3,
    tankCapacity: 44,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "ml-004",
    source: "mercadolibre",
    sourceId: "MLA-2222222222",
    sourceUrl: "https://auto.mercadolibre.com.ar/MLA-2222222222",
    brand: "Honda",
    model: "HR-V",
    version: "EXL 1.8 CVT",
    year: 2023,
    isNew: false,
    price: 38_900_000,
    currency: "ARS",
    priceArs: 38_900_000,
    priceUsd: 32_960,
    km: 15_000,
    fuelType: "nafta",
    transmission: "automatica",
    bodyType: "suv",
    doors: 5,
    isImported: true,
    location: "San Isidro, Buenos Aires",
    province: "Buenos Aires",
    imageUrls: ["https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&h=500&fit=crop"],
    sellerType: "concesionaria",
    verificationBadge: "ml_verified",
    acceptsSwap: false,
    hasFinancing: true,
    dealScore: 88,
    consumption: 8.0,
    tankCapacity: 50,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "ac-002",
    source: "autocosmos",
    sourceId: "AC-445566",
    sourceUrl: "https://www.autocosmos.com.ar/auto/445566",
    brand: "Nissan",
    model: "Kicks",
    version: "Exclusive CVT",
    year: 2022,
    isNew: false,
    price: 29_500_000,
    currency: "ARS",
    priceArs: 29_500_000,
    priceUsd: 25_000,
    km: 30_000,
    fuelType: "nafta",
    transmission: "automatica",
    bodyType: "suv",
    doors: 5,
    isImported: true,
    location: "Tucumán Capital",
    province: "Tucumán",
    imageUrls: ["https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop"],
    sellerType: "particular",
    verificationBadge: null,
    acceptsSwap: true,
    hasFinancing: false,
    dealScore: 81,
    consumption: 8.5,
    tankCapacity: 46,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "ml-005",
    source: "mercadolibre",
    sourceId: "MLA-3333333333",
    sourceUrl: "https://auto.mercadolibre.com.ar/MLA-3333333333",
    brand: "Volkswagen",
    model: "Amarok",
    version: "V6 Extreme 3.0 TDI 4x4 AT",
    year: 2023,
    isNew: false,
    price: 62_000_000,
    currency: "ARS",
    priceArs: 62_000_000,
    priceUsd: 52_540,
    km: 12_000,
    fuelType: "diesel",
    transmission: "automatica",
    bodyType: "pickup",
    doors: 4,
    isImported: true,
    location: "Nordelta, Buenos Aires",
    province: "Buenos Aires",
    imageUrls: ["https://images.unsplash.com/photo-1612544448445-b8232cff3b6c?w=800&h=500&fit=crop"],
    sellerType: "concesionaria",
    verificationBadge: "concesionaria",
    acceptsSwap: false,
    hasFinancing: true,
    dealScore: 74,
    consumption: 10.5,
    tankCapacity: 80,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
  {
    id: "kv-003",
    source: "kavak",
    sourceId: "KV-77777",
    sourceUrl: "https://www.kavak.com/ar/auto-77777",
    brand: "Chevrolet",
    model: "Tracker",
    version: "Premier 1.2 Turbo AT",
    year: 2022,
    isNew: false,
    price: 30_500_000,
    currency: "ARS",
    priceArs: 30_500_000,
    priceUsd: 25_850,
    km: 28_000,
    fuelType: "nafta",
    transmission: "automatica",
    bodyType: "suv",
    doors: 5,
    isImported: false,
    location: "Pilar, Buenos Aires",
    province: "Buenos Aires",
    imageUrls: ["https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=500&fit=crop"],
    sellerType: "concesionaria",
    verificationBadge: "kavak_verified",
    acceptsSwap: true,
    hasFinancing: true,
    dealScore: 84,
    consumption: 8.8,
    tankCapacity: 50,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
];

export const MOCK_LISTINGS: Listing[] = SEED_DATA ?? HARDCODED_LISTINGS;

export function getMockListings(filters?: {
  brands?: string[];
  models?: string[];
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  kmMin?: number;
  kmMax?: number;
  provinces?: string[];
  fuelTypes?: string[];
  transmissions?: string[];
  bodyTypes?: string[];
  sellerTypes?: string[];
  sources?: string[];
  verifiedOnly?: boolean;
  acceptsSwap?: boolean;
  hasFinancing?: boolean;
  dealScoreMin?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}): { listings: Listing[]; total: number } {
  let result = [...MOCK_LISTINGS];

  if (filters) {
    if (filters.brands?.length) {
      result = result.filter((l) =>
        filters.brands!.some((b) => l.brand.toLowerCase() === b.toLowerCase())
      );
    }
    if (filters.models?.length) {
      result = result.filter((l) =>
        filters.models!.some((m) => l.model.toLowerCase() === m.toLowerCase())
      );
    }
    if (filters.yearMin) result = result.filter((l) => l.year >= filters.yearMin!);
    if (filters.yearMax) result = result.filter((l) => l.year <= filters.yearMax!);
    if (filters.priceMin) result = result.filter((l) => l.priceArs >= filters.priceMin!);
    if (filters.priceMax) result = result.filter((l) => l.priceArs <= filters.priceMax!);
    if (filters.kmMin) result = result.filter((l) => l.km >= filters.kmMin!);
    if (filters.kmMax) result = result.filter((l) => l.km <= filters.kmMax!);
    if (filters.provinces?.length) {
      result = result.filter((l) => filters.provinces!.includes(l.province));
    }
    if (filters.fuelTypes?.length) {
      result = result.filter((l) => l.fuelType && filters.fuelTypes!.includes(l.fuelType));
    }
    if (filters.transmissions?.length) {
      result = result.filter((l) => l.transmission && filters.transmissions!.includes(l.transmission));
    }
    if (filters.bodyTypes?.length) {
      result = result.filter((l) => l.bodyType && filters.bodyTypes!.includes(l.bodyType));
    }
    if (filters.sellerTypes?.length) {
      result = result.filter((l) => filters.sellerTypes!.includes(l.sellerType));
    }
    if (filters.sources?.length) {
      result = result.filter((l) => filters.sources!.includes(l.source));
    }
    if (filters.verifiedOnly) {
      result = result.filter((l) => l.verificationBadge !== null);
    }
    if (filters.acceptsSwap) {
      result = result.filter((l) => l.acceptsSwap);
    }
    if (filters.hasFinancing) {
      result = result.filter((l) => l.hasFinancing);
    }
    if (filters.dealScoreMin) {
      result = result.filter((l) => l.dealScore >= filters.dealScoreMin!);
    }

    switch (filters.sortBy) {
      case "price_asc":
        result.sort((a, b) => a.priceArs - b.priceArs);
        break;
      case "price_desc":
        result.sort((a, b) => b.priceArs - a.priceArs);
        break;
      case "km_asc":
        result.sort((a, b) => a.km - b.km);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "price_per_km":
        result.sort((a, b) => (a.km > 0 ? a.priceArs / a.km : Infinity) - (b.km > 0 ? b.priceArs / b.km : Infinity));
        break;
      default:
        result.sort((a, b) => b.dealScore - a.dealScore);
    }
  }

  const total = result.length;
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 12;
  const start = (page - 1) * pageSize;
  result = result.slice(start, start + pageSize);

  return { listings: result, total };
}

export function getMockListing(id: string): Listing | null {
  return MOCK_LISTINGS.find((l) => l.id === id) ?? null;
}

export function getMockBrands(): { brand: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const l of MOCK_LISTINGS) {
    counts[l.brand] = (counts[l.brand] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
}

export function getMockModels(brand: string): { model: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const l of MOCK_LISTINGS) {
    if (l.brand.toLowerCase() === brand.toLowerCase()) {
      counts[l.model] = (counts[l.model] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => a.model.localeCompare(b.model));
}
