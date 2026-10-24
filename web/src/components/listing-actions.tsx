"use client";
import { Button } from "@/components/ui/button";
import {
  usePersonal,
  toggleFavorite,
  toggleCompare,
  updatePersonal,
} from "@/lib/personal";
import type { Listing } from "@/lib/types";
export function ListingActions({ listing }: { listing: Listing }) {
  const p = usePersonal(),
    favorite = p.favorites.some((l) => l.id === listing.id),
    compared = p.compare.includes(listing.id),
    discarded = p.discarded.includes(listing.id);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={favorite}
        onClick={() => toggleFavorite(listing)}
      >
        {favorite ? "Guardado ✓" : "Guardar"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={compared}
        disabled={!compared && p.compare.length >= 3}
        onClick={() => toggleCompare(listing.id)}
      >
        {compared ? "En comparación ✓" : "Comparar"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          updatePersonal((s) => ({
            ...s,
            discarded: discarded
              ? s.discarded.filter((id) => id !== listing.id)
              : [...s.discarded, listing.id],
          }))
        }
      >
        {discarded ? "Restaurar" : "Descartar"}
      </Button>
    </div>
  );
}
