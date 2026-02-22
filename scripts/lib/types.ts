export interface Listing {
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

export interface PolycardComponent {
  type: string;
  title?: { text?: string };
  price?: { current_price?: { value?: number; currency?: string } };
  attributes_list?: { texts?: string[] };
  location?: { text?: string };
  seller?: {
    text?: string;
    values?: Array<{ key?: string; type?: string; icon?: { key?: string } }>;
  };
}

export interface PolycardData {
  metadata?: { id?: string; url?: string };
  pictures?: { pictures?: Array<{ id?: string }> };
  components?: PolycardComponent[];
}
