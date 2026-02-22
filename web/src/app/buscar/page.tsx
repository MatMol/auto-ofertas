"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ListingCard } from "@/components/listing-card";
import { FilterSidebar } from "@/components/filters/filter-sidebar";
import { FilterChips } from "@/components/filters/filter-chips";
import { SlidersHorizontal, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SearchFilters, Listing } from "@/lib/types";

function parseFiltersFromParams(params: URLSearchParams): SearchFilters {
  return {
    query: params.get("q") ?? undefined,
    brands: params.get("brands")?.split(",").filter(Boolean) ?? undefined,
    models: params.get("models")?.split(",").filter(Boolean) ?? undefined,
    yearMin: params.get("yearMin") ? Number(params.get("yearMin")) : undefined,
    yearMax: params.get("yearMax") ? Number(params.get("yearMax")) : undefined,
    priceMin: params.get("priceMin") ? Number(params.get("priceMin")) : undefined,
    priceMax: params.get("priceMax") ? Number(params.get("priceMax")) : undefined,
    kmMin: params.get("kmMin") ? Number(params.get("kmMin")) : undefined,
    kmMax: params.get("kmMax") ? Number(params.get("kmMax")) : undefined,
    provinces: params.get("provinces")?.split(",").filter(Boolean) ?? undefined,
    fuelTypes: (params.get("fuelTypes")?.split(",").filter(Boolean) as SearchFilters["fuelTypes"]) ?? undefined,
    transmissions: (params.get("transmissions")?.split(",").filter(Boolean) as SearchFilters["transmissions"]) ?? undefined,
    bodyTypes: (params.get("bodyTypes")?.split(",").filter(Boolean) as SearchFilters["bodyTypes"]) ?? undefined,
    sellerTypes: (params.get("sellerTypes")?.split(",").filter(Boolean) as SearchFilters["sellerTypes"]) ?? undefined,
    sources: (params.get("sources")?.split(",").filter(Boolean) as SearchFilters["sources"]) ?? undefined,
    verifiedOnly: params.get("verifiedOnly") === "true" || undefined,
    acceptsSwap: params.get("acceptsSwap") === "true" || undefined,
    hasFinancing: params.get("hasFinancing") === "true" || undefined,
    dealScoreMin: params.get("dealScoreMin") ? Number(params.get("dealScoreMin")) : undefined,
    sortBy: (params.get("sortBy") as SearchFilters["sortBy"]) ?? "deal_score",
    page: params.get("page") ? Number(params.get("page")) : 1,
    pageSize: 12,
  };
}

function filtersToParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.brands?.length) params.set("brands", filters.brands.join(","));
  if (filters.models?.length) params.set("models", filters.models.join(","));
  if (filters.yearMin) params.set("yearMin", String(filters.yearMin));
  if (filters.yearMax) params.set("yearMax", String(filters.yearMax));
  if (filters.priceMin) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
  if (filters.kmMin) params.set("kmMin", String(filters.kmMin));
  if (filters.kmMax) params.set("kmMax", String(filters.kmMax));
  if (filters.provinces?.length) params.set("provinces", filters.provinces.join(","));
  if (filters.fuelTypes?.length) params.set("fuelTypes", filters.fuelTypes.join(","));
  if (filters.transmissions?.length) params.set("transmissions", filters.transmissions.join(","));
  if (filters.bodyTypes?.length) params.set("bodyTypes", filters.bodyTypes.join(","));
  if (filters.sellerTypes?.length) params.set("sellerTypes", filters.sellerTypes.join(","));
  if (filters.sources?.length) params.set("sources", filters.sources.join(","));
  if (filters.verifiedOnly) params.set("verifiedOnly", "true");
  if (filters.acceptsSwap) params.set("acceptsSwap", "true");
  if (filters.hasFinancing) params.set("hasFinancing", "true");
  if (filters.dealScoreMin) params.set("dealScoreMin", String(filters.dealScoreMin));
  if (filters.sortBy && filters.sortBy !== "deal_score") params.set("sortBy", filters.sortBy);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState<{ brand: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const filters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    setQueryInput(filters.query ?? "");
  }, [filters.query]);

  const totalPages = Math.ceil(total / (filters.pageSize ?? 12));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/listings?${searchParams.toString()}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<{ listings: Listing[]; total: number }>)
      .then((data) => {
        setListings(data.listings);
        setTotal(data.total);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setLoading(false);
      });

    return () => controller.abort();
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json() as Promise<{ brand: string; count: number }[]>)
      .then((data) => setBrands(data))
      .catch(() => {});
  }, []);

  const updateFilters = useCallback(
    (newFilters: SearchFilters) => {
      const params = filtersToParams(newFilters);
      router.push(`/buscar?${params.toString()}`);
    },
    [router]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="sr-only">Resultados de búsqueda de autos</h1>
      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        <aside aria-label="Filtros de búsqueda" className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
            <FilterSidebar
              filters={filters}
              onChange={updateFilters}
              brands={brands}
            />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateFilters({ ...filters, query: queryInput.trim() || undefined, page: 1 });
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Toyota Corolla 2020, Ford Ranger diesel..."
                aria-label="Buscar autos por marca, modelo o año"
                className="pl-10 h-10"
              />
            </div>
            <Button type="submit" size="default" className="h-10 px-4">
              Buscar
            </Button>
          </form>

          {/* Mobile filter button + results count */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
              <span className="font-semibold text-foreground">{total}</span>{" "}
              autos encontrados
            </p>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden gap-1.5"
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <FilterSidebar
                  filters={filters}
                  onChange={(f) => {
                    updateFilters(f);
                    setMobileOpen(false);
                  }}
                  brands={brands}
                  onClose={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          <FilterChips filters={filters} onChange={updateFilters} />

          {/* Results grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-lg font-medium">
                No encontramos autos con esos filtros
              </p>
              <p className="text-muted-foreground text-sm">
                Probá ampliar tu búsqueda o quitar algunos filtros.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  updateFilters({
                    ...filters,
                    brands: undefined,
                    provinces: undefined,
                    yearMin: undefined,
                    yearMax: undefined,
                    priceMin: undefined,
                    priceMax: undefined,
                    kmMin: undefined,
                    kmMax: undefined,
                    fuelTypes: undefined,
                    bodyTypes: undefined,
                    transmissions: undefined,
                    sellerTypes: undefined,
                    sources: undefined,
                    verifiedOnly: false,
                    acceptsSwap: false,
                    hasFinancing: false,
                    dealScoreMin: undefined,
                    page: 1,
                  })
                }
              >
                Limpiar filtros
              </Button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() =>
                  updateFilters({
                    ...filters,
                    page: (filters.page ?? 1) - 1,
                  })
                }
              >
                <ChevronLeft size={14} aria-hidden="true" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Página {filters.page ?? 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(filters.page ?? 1) >= totalPages}
                onClick={() =>
                  updateFilters({
                    ...filters,
                    page: (filters.page ?? 1) + 1,
                  })
                }
              >
                Siguiente
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
