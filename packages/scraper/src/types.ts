export interface RawListing {
  sourceId: string;
  sourceUrl: string;
  title: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  isNew: boolean;
  price: number;
  currency: string;
  km: number;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  doors: number | null;
  location: string;
  province: string;
  imageUrls: string[];
  /** @deprecated Use imageUrls. Kept for normalizer compatibility. */
  images?: string[];
  sellerType: "particular" | "concesionaria";
  isVerified: boolean;
  /** @deprecated Use isVerified. Kept for normalizer compatibility. */
  verificationBadge?: string;
  acceptsSwap: boolean;
  hasFinancing: boolean;
  /** Optional. Used by normalizer for USD conversion. */
  priceUsd?: number;
  /** Optional. Fuel consumption L/100km. */
  consumption?: number;
  /** Optional. Tank capacity in liters. */
  tankCapacity?: number;
}
