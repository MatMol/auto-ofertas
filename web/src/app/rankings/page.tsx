import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingCard } from "@/components/listing-card";
import { DealScoreBadge } from "@/components/deal-score";
import { getRankingData } from "@/lib/db/client";
import { formatPrice, formatKm } from "@/lib/format";
import { Trophy, TrendingDown, Gauge, Car, Truck, Sparkles } from "lucide-react";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

function RankingTable({
  icon: Icon,
  title,
  description,
  listings,
  valueLabel,
  valueFn,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  listings: Listing[];
  valueLabel: string;
  valueFn: (l: Listing) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon size={18} aria-hidden="true" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {listings.map((listing, i) => (
          <Link
            key={listing.id}
            href={`/auto/${listing.id}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group"
          >
            <span className="text-lg font-bold text-muted-foreground w-6 text-right">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {listing.brand} {listing.model} {listing.year}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(listing.price, listing.currency)} · {formatKm(listing.km)} ·{" "}
                {listing.province}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <DealScoreBadge score={listing.dealScore} />
              <p className="text-[10px] text-muted-foreground mt-1">
                {valueLabel}: {valueFn(listing)}
              </p>
            </div>
          </Link>
        ))}
        {listings.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin datos todavía
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function RankingsPage() {
  const data = await getRankingData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy size={24} className="text-amber-500" aria-hidden="true" />
          Rankings
        </h1>
        <p className="text-muted-foreground mt-1">
          Las mejores ofertas del mercado argentino, actualizadas cada pocas
          horas.
        </p>
      </div>

      {/* Top overall */}
      {data.topDeals.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" aria-hidden="true" />
            Top 5 mejores ofertas generales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.topDeals.slice(0, 3).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Category rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RankingTable
          icon={TrendingDown}
          title="Mejor precio/km"
          description="Autos con la mejor relación precio por kilómetro recorrido"
          listings={data.bestPricePerKm}
          valueLabel="$/km"
          valueFn={(l) => `$${Math.round(l.priceArs / Math.max(l.km, 1)).toLocaleString()}`}
        />

        <RankingTable
          icon={Gauge}
          title="Usados con menos km"
          description="Usados semi-nuevos con los menores kilómetros"
          listings={data.lowestKmUsed}
          valueLabel="Km"
          valueFn={(l) => formatKm(l.km)}
        />

        <RankingTable
          icon={Sparkles}
          title="Mejores ofertas 0km"
          description="Los 0km con mejor relación precio/valor"
          listings={data.best0km}
          valueLabel="Score"
          valueFn={(l) => String(l.dealScore)}
        />

        <RankingTable
          icon={Car}
          title="Mejores sedanes"
          description="Las mejores ofertas en sedanes"
          listings={data.sedanDeals}
          valueLabel="Score"
          valueFn={(l) => String(l.dealScore)}
        />

        <RankingTable
          icon={Truck}
          title="Mejores SUVs"
          description="Las mejores ofertas en SUVs"
          listings={data.suvDeals}
          valueLabel="Score"
          valueFn={(l) => String(l.dealScore)}
        />

        <RankingTable
          icon={Truck}
          title="Mejores pickups"
          description="Las mejores ofertas en pickups"
          listings={data.pickupDeals}
          valueLabel="Score"
          valueFn={(l) => String(l.dealScore)}
        />
      </div>
    </div>
  );
}
