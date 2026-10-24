"use client";
import { readListings } from "@/lib/http";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ListingCard } from "@/components/listing-card";
import { FilterSidebar } from "@/components/filters/filter-sidebar";
import { FilterChips } from "@/components/filters/filter-chips";
import { parseFilters, filtersToParams, clearFilters } from "@/lib/search";
import { usePersonal, updatePersonal } from "@/lib/personal";
import type { SearchFilters, Listing } from "@/lib/types";
function Results({ params }: { params: string }) {
  const router = useRouter(),
    personal = usePersonal();
  let initial: SearchFilters = {},
    invalid = "";
  try {
    initial = parseFilters(new URLSearchParams(params));
  } catch (e) {
    invalid = (e as Error).message;
  }
  const [draft, setDraft] = useState(initial),
    [query, setQuery] = useState(initial.query || ""),
    [open, setOpen] = useState(false),
    [data, setData] = useState<{ listings: Listing[]; total: number } | null>(
      null,
    ),
    [brands, setBrands] = useState<{ brand: string; count: number }[]>([]),
    [error, setError] = useState(invalid),
    [attempt, setAttempt] = useState(0),
    [loading, setLoading] = useState(true),
    [saved, setSaved] = useState(false);
  function update(f: SearchFilters) {
    try {
      const p = filtersToParams(f);
      parseFilters(p);
      router.push(`/buscar?${p}`);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (invalid) return;
    const controller = new AbortController();
    async function load() {
      try {
        const r = await fetch(`/api/listings?${params}`, {
          signal: controller.signal,
        });
        const body = await readListings(r);
        setData(body);
        setError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [params, attempt, invalid]);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/brands", { signal: c.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setBrands(Array.isArray(d) ? d : []))
      .catch(() => {});
    return () => c.abort();
  }, []);
  const filters = initial,
    totalPages = Math.ceil((data?.total || 0) / (filters.pageSize || 12));
  const sidebar = (
    <>
      <FilterSidebar filters={draft} onChange={setDraft} brands={brands} />
      {error && (
        <p role="alert" className="text-sm text-red-700 mt-3">
          {error}
        </p>
      )}
      <Button
        className="w-full mt-4 sticky bottom-0 shadow"
        onClick={() => update({ ...draft, page: 1 })}
      >
        Aplicar filtros
      </Button>
    </>
  );
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Buscar autos</h1>
      <div className="flex gap-6">
        <aside
          aria-label="Filtros de búsqueda"
          className="hidden lg:block w-72 shrink-0"
        >
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-auto pr-2">
            {sidebar}
          </div>
        </aside>
        <div className="min-w-0 flex-1 space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              update({ ...filters, query: query.trim() || undefined, page: 1 });
            }}
          >
            <input
              type="search"
              className="border rounded px-3 py-2 min-w-0 flex-1"
              aria-label="Buscar marca, modelo, año o combustible"
              placeholder="Toyota Corolla 2020"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button>Buscar</Button>
          </form>
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <p aria-live="polite">
              {loading && !error
                ? "Buscando…"
                : `${data?.total || 0} autos encontrados`}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const name = window.prompt(
                    "Nombre de la búsqueda",
                    query || "Mi búsqueda",
                  );
                  if (name?.trim()) {
                    updatePersonal((s) => ({
                      ...s,
                      searches: [
                        ...s.searches,
                        {
                          id: crypto.randomUUID(),
                          name: name.trim(),
                          params,
                          createdAt: new Date().toISOString(),
                          seen: data?.listings.map((l) => l.id) || [],
                          initialized: true,
                        },
                      ],
                    }));
                    setSaved(true);
                  }
                }}
              >
                {saved ? "Guardada ✓" : "Guardar búsqueda"}
              </Button>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden" size="sm">
                    Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[min(90vw,360px)] overflow-y-auto p-5"
                >
                  <SheetTitle>Filtros de búsqueda</SheetTitle>
                  <SheetDescription>
                    Ajustá los criterios y aplicalos al terminar.
                  </SheetDescription>
                  {sidebar}
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <FilterChips filters={filters} onChange={update} />
          {error ? (
            <div
              role="alert"
              className="border border-red-300 rounded p-4 space-y-3"
            >
              <p>{error}</p>
              <Button
                onClick={() => {
                  setLoading(true);
                  setAttempt((a) => a + 1);
                }}
                disabled={!!invalid}
              >
                Reintentar
              </Button>
              <Button
                variant="outline"
                onClick={() => update(clearFilters(filters))}
              >
                Limpiar búsqueda
              </Button>
            </div>
          ) : loading ? (
            <p role="status">Cargando publicaciones…</p>
          ) : data?.listings.length ? (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.listings
                  .filter((l) => !personal.discarded.includes(l.id))
                  .map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
              </div>
              {data.listings.some((l) => personal.discarded.includes(l.id)) && (
                <p className="text-sm text-muted-foreground">
                  Ocultamos avisos descartados. Podés restaurarlos en Mi garage.
                </p>
              )}
            </>
          ) : (
            <div className="border rounded p-8 text-center space-y-3">
              <p>No encontramos autos con esos filtros.</p>
              <Button
                variant="outline"
                onClick={() => update(clearFilters(filters))}
              >
                Limpiar búsqueda
              </Button>
            </div>
          )}
          {totalPages > 1 && !error && (
            <nav
              aria-label="Páginas de resultados"
              className="flex justify-center items-center gap-3"
            >
              <Button
                variant="outline"
                disabled={(filters.page || 1) <= 1}
                onClick={() =>
                  update({ ...filters, page: (filters.page || 1) - 1 })
                }
              >
                Anterior
              </Button>
              <span>
                {filters.page || 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={(filters.page || 1) >= totalPages}
                onClick={() =>
                  update({ ...filters, page: (filters.page || 1) + 1 })
                }
              >
                Siguiente
              </Button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
function Search() {
  const params = useSearchParams().toString();
  return <Results key={params} params={params} />;
}
export default function Page() {
  return (
    <Suspense fallback={<p>Cargando búsqueda…</p>}>
      <Search />
    </Suspense>
  );
}
