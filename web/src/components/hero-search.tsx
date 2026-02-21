"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/buscar?${params.toString()}`);
  };

  return (
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
  );
}
