export type { ListingRecord as Listing } from "../../shared/listing";
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
