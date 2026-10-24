"use client";
import { readListings } from "@/lib/http";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePersonal, toggleCompare } from "@/lib/personal";
import { personalCosts } from "@/lib/costs/personal";
import { PreferencesForm } from "@/components/preferences";
import { formatPrice, formatKm } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FUEL_TYPE_LABELS, type Listing } from "@/lib/types";
function CompareData({ ids }: { ids: string }) {
  const p = usePersonal();
  const [data, setData] = useState<Listing[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    if (!ids) return;
    fetch(`/api/listings?ids=${encodeURIComponent(ids)}`, { signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("No pudimos cargar la comparación");
        return readListings(r);
      })
      .then((d) => setData(d.listings))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [ids]);
  const listings = p.compare
    .map(
      (id) =>
        data.find((l) => l.id === id) || p.favorites.find((l) => l.id === id),
    )
    .filter((l): l is Listing => !!l);
  return (
    <>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            className="underline"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </p>
      )}
      {listings.length ? (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm min-w-[640px]">
            <caption className="sr-only">
              Comparación de vehículos y costos mensuales
            </caption>
            <thead>
              <tr>
                <th className="p-4 text-left">Característica</th>
                {listings.map((l) => (
                  <th key={l.id} className="p-4 text-left min-w-48">
                    {l.brand} {l.model}
                    <Button
                      className="block mt-2"
                      size="sm"
                      variant="outline"
                      aria-label={`Quitar ${l.brand} ${l.model}`}
                      onClick={() => toggleCompare(l.id)}
                    >
                      Quitar
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Precio publicado",
                  (l: Listing) =>
                    `${l.priceKind === "total" ? "Total" : l.priceKind === "deposit" ? "Anticipo" : l.priceKind === "installment" ? "Cuota" : "Sin confirmar"}: ${formatPrice(l.price, l.currency)}`,
                ],
                ["Año", (l: Listing) => l.year],
                ["Kilómetros", (l: Listing) => formatKm(l.km)],
                ["Versión", (l: Listing) => l.version || "Sin informar"],
                [
                  "Combustible",
                  (l: Listing) =>
                    l.fuelType ? FUEL_TYPE_LABELS[l.fuelType] : "Sin informar",
                ],
                [
                  "Transmisión",
                  (l: Listing) =>
                    l.transmission === "automatica"
                      ? "Automática"
                      : l.transmission === "manual"
                        ? "Manual"
                        : "Sin informar",
                ],
                ["Ubicación", (l: Listing) => l.location],
                ["Puntaje", (l: Listing) => l.dealScore || "Sin comparables"],
                [
                  "Costo mensual estimado",
                  (l: Listing) =>
                    l.priceKind === "total" &&
                    personalCosts(l, p.preferences).price > 0
                      ? formatPrice(
                          personalCosts(l, p.preferences).monthlyTotal,
                        )
                      : "Requiere precio total y cotización",
                ],
              ].map(([label, render]) => (
                <tr key={String(label)} className="border-t">
                  <th className="p-4 text-left font-medium">{String(label)}</th>
                  {listings.map((l) => (
                    <td key={l.id} className="p-4">
                      {(render as (l: Listing) => string | number)(l)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          Agregá hasta tres autos desde las tarjetas, el detalle o Mi garage.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Mismos supuestos para todos: {p.preferences.province},{" "}
        {p.preferences.monthlyKm} km/mes. Los costos son estimaciones, sin
        préstamo. En móvil, deslizá la tabla horizontalmente.
      </p>
    </>
  );
}
export default function Page() {
  const p = usePersonal(),
    ids = p.compare.filter((id) => !id.startsWith("external-")).join(",");
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">
        Comparar autos ({p.compare.length}/3)
      </h1>
      <div className="flex gap-4">
        <Link className="underline" href="/buscar">
          Agregar desde búsqueda
        </Link>
        <Link className="underline" href="/mi-garage">
          Mis favoritos
        </Link>
      </div>
      <PreferencesForm />
      <CompareData key={ids} ids={ids} />
      {p.compare.length > 0 && (
        <Button
          variant="outline"
          onClick={() => p.compare.forEach(toggleCompare)}
        >
          Vaciar comparación
        </Button>
      )}
    </div>
  );
}
