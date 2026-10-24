"use client";
import { readListings } from "@/lib/http";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePersonal } from "@/lib/personal";
import { ListingCard } from "./listing-card";
import type { Listing } from "@/lib/types";
export function PersonalHighlights() {
  const { preferences: p, discarded } = usePersonal();
  const [data, setData] = useState<Listing[]>([]);
  const [error, setError] = useState(false);
  const query = `yearMin=${p.yearMin}&kmMax=${p.kmMax}&priceMax=${p.budget}&pageSize=6&sortBy=deal_score`;
  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/listings?${query}`, { signal: c.signal })
      .then(readListings)
      .then((d) => {
        setData(d.listings || []);
        setError(false);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError(true);
      });
    return () => c.abort();
  }, [query]);
  return (
    <section className="max-w-7xl mx-auto px-4 space-y-3">
      <div className="flex justify-between gap-3">
        <h2 className="font-semibold text-xl">Para tu búsqueda</h2>
        <Link className="underline text-sm" href="/mi-garage">
          Ajustar preferencias
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Desde {p.yearMin} · hasta {p.kmMax.toLocaleString("es-AR")} km ·
        presupuesto ARS {p.budget.toLocaleString("es-AR")}
      </p>
      {error ? (
        <p>No pudimos cargar tus recomendaciones.</p>
      ) : data.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data
            .filter((l) => !discarded.includes(l.id))
            .map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
        </div>
      ) : (
        <p>No hay avisos con precio confirmado para estas preferencias.</p>
      )}
    </section>
  );
}
