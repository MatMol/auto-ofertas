import type { ListingRecord } from "../../../shared/listing";
export type Source =
  "mercadolibre" | "autocosmos" | "kavak" | "deruedas" | "external";

export type FuelType = "nafta" | "diesel" | "gnc" | "electrico" | "hibrido";

export type Transmission = "manual" | "automatica";

export type BodyType =
  | "sedan"
  | "suv"
  | "hatchback"
  | "pickup"
  | "coupe"
  | "van"
  | "convertible"
  | "otro";

export type SellerType = "particular" | "concesionaria";

export type VerificationBadge =
  "kavak_verified" | "ml_verified" | "concesionaria" | null;

export type Currency = "ARS" | "USD";

export interface Listing extends Omit<
  ListingRecord,
  | "source"
  | "fuelType"
  | "transmission"
  | "bodyType"
  | "sellerType"
  | "verificationBadge"
> {
  source: Source;
  fuelType: FuelType | null;
  transmission: Transmission | null;
  bodyType: BodyType | null;
  sellerType: SellerType;
  verificationBadge: VerificationBadge;
}

export interface ReferencePrice {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  sampleSize: number;
  updatedAt: string;
}

export interface BrandModel {
  id: string;
  brand: string;
  model: string;
  count: number;
}

export interface SearchFilters {
  query?: string;
  isNew?: boolean;
  includeUnconfirmed?: boolean;
  brands?: string[];
  models?: string[];
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  kmMin?: number;
  kmMax?: number;
  provinces?: string[];
  fuelTypes?: FuelType[];
  transmissions?: Transmission[];
  bodyTypes?: BodyType[];
  sellerTypes?: SellerType[];
  sources?: Source[];
  verifiedOnly?: boolean;
  acceptsSwap?: boolean;
  hasFinancing?: boolean;
  dealScoreMin?: number;
  sortBy?: SortOption;
  page?: number;
  pageSize?: number;
}

export type SortOption =
  "deal_score" | "price_asc" | "price_desc" | "km_asc" | "newest";

export interface SearchResult {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CostBreakdown {
  patenteBimestral: number;
  patenteAnual: number;
  patenteAnualConDescuento: number;
  transferencia: number | null;
  patentamiento: number | null;
  llenarTanque: number | null;
  combustibleMensual: number | null;
  seguroTercerosMin: number;
  seguroTercerosMax: number;
  seguroTodoRiesgoMin: number;
  seguroTodoRiesgoMax: number;
  cuotaPrestamo: number | null;
  totalIntereses: number | null;
  totalDevolver: number | null;
  costoMensualEstimado: number;
}

export const PROVINCES = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "deal_score", label: "Mejor oferta" },
  { value: "price_asc", label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "km_asc", label: "Menos kilómetros" },
  { value: "newest", label: "Más recientes" },
];

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  nafta: "Nafta",
  diesel: "Diesel",
  gnc: "GNC",
  electrico: "Eléctrico",
  hibrido: "Híbrido",
};

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  sedan: "Sedán",
  suv: "SUV",
  hatchback: "Hatchback",
  pickup: "Pickup",
  coupe: "Coupé",
  van: "Van",
  convertible: "Convertible",
  otro: "Otro",
};

export const SOURCE_LABELS: Record<Source, string> = {
  mercadolibre: "MercadoLibre",
  autocosmos: "Autocosmos",
  kavak: "Kavak",
  deruedas: "deRuedas",
  external: "Aviso externo",
};
