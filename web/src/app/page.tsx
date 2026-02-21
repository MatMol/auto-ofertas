"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ListingCard } from "@/components/listing-card";
import { MOCK_LISTINGS } from "@/lib/db/mock-data";
import {
  Search,
  Car,
  Truck,
  Fuel,
  Zap,
  User,
  CreditCard,
  ArrowRight,
  TrendingDown,
  Star,
  Sparkles,
} from "lucide-react";

const QUICK_CATEGORIES = [
  {
    label: "Primer auto",
    description: "Económicos y confiables",
    icon: Car,
    href: "/buscar?priceMax=20000000&kmMax=80000&yearMin=2015&bodyTypes=sedan,hatchback",
  },
  {
    label: "SUVs familiares",
    description: "Espacio y comodidad",
    icon: Truck,
    href: "/buscar?bodyTypes=suv",
  },
  {
    label: "Económicos",
    description: "Bajo consumo",
    icon: Fuel,
    href: "/buscar?priceMax=22000000&fuelTypes=nafta,gnc",
  },
  {
    label: "Eléctricos e híbridos",
    description: "Sustentables",
    icon: Zap,
    href: "/buscar?fuelTypes=electrico,hibrido",
  },
  {
    label: "Dueño directo",
    description: "Sin intermediarios",
    icon: User,
    href: "/buscar?sellerTypes=particular",
  },
  {
    label: "Con financiación",
    description: "Pagá en cuotas",
    icon: CreditCard,
    href: "/buscar?hasFinancing=true",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const topUsedDeals = [...MOCK_LISTINGS]
    .filter((l) => !l.isNew)
    .sort((a, b) => b.dealScore - a.dealScore)
    .slice(0, 6);

  const topNewDeals = [...MOCK_LISTINGS]
    .filter((l) => l.isNew)
    .sort((a, b) => b.dealScore - a.dealScore)
    .slice(0, 6);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/buscar?${params.toString()}`);
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Encontrá el mejor auto
            <br />
            <span className="text-emerald-600">al mejor precio</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comparamos miles de publicaciones de MercadoLibre, DeMotores,
            Autocosmos y Kavak. Te mostramos las mejores ofertas con un
            análisis de precio, estado y costos de tenencia.
          </p>
          <form
            onSubmit={handleSearch}
            className="flex gap-2 max-w-xl mx-auto"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Toyota Corolla 2020, Ford Ranger diesel..."
                aria-label="Buscar autos por marca, modelo o año"
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6">
              Buscar
            </Button>
          </form>
        </div>
      </section>

      {/* Quick Categories */}
      <section className="mx-auto max-w-7xl px-4">
        <h2 className="text-xl font-semibold mb-4">Búsquedas rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link key={cat.label} href={cat.href}>
                <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group h-full">
                  <CardContent className="p-4 text-center space-y-2">
                    <Icon
                      size={28}
                      className="mx-auto text-muted-foreground group-hover:text-primary transition-colors"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium text-sm">{cat.label}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {cat.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Top Used Deals */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star size={20} className="text-amber-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Mejores ofertas — Usados</h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href="/buscar?sortBy=deal_score" className="gap-1">
              Ver todas
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {topUsedDeals.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* Top 0km Deals */}
      {topNewDeals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-blue-500" aria-hidden="true" />
              <h2 className="text-xl font-semibold">Mejores ofertas — 0km</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/buscar?sortBy=deal_score&kmMax=0" className="gap-1">
                Ver todas
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {topNewDeals.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingDown size={20} className="text-emerald-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Recién publicados</h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href="/buscar?sortBy=newest" className="gap-1">
              Ver todos
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {MOCK_LISTINGS.slice(0, 6).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
}
