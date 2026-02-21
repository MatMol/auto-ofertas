"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DealScoreGauge } from "@/components/deal-score";
import { VerificationBadge } from "@/components/verification-badge";
import { CostBreakdown } from "@/components/cost-breakdown";
import { getMockListing, MOCK_LISTINGS } from "@/lib/db/mock-data";
import { formatPrice, formatPriceUsd, formatKm } from "@/lib/format";
import {
  SOURCE_LABELS,
  FUEL_TYPE_LABELS,
  BODY_TYPE_LABELS,
} from "@/lib/types";
import type { FuelType, BodyType } from "@/lib/types";
import {
  ExternalLink,
  MapPin,
  Calendar,
  Gauge,
  Fuel,
  Settings2,
  Car,
  ArrowLeftRight,
  CreditCard,
  ChevronLeft,
  DoorOpen,
} from "lucide-react";
import { ListingCard } from "@/components/listing-card";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon size={16} className="text-muted-foreground flex-shrink-0" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium ml-auto">{value}</span>
    </div>
  );
}

export default function AutoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const listing = getMockListing(id);

  if (!listing) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Auto no encontrado</h1>
        <p className="text-muted-foreground mt-2">
          El auto que buscás no existe o fue removido.
        </p>
        <Button asChild className="mt-4">
          <Link href="/buscar">Volver a buscar</Link>
        </Button>
      </div>
    );
  }

  const similar = MOCK_LISTINGS.filter(
    (l) =>
      l.id !== listing.id &&
      (l.brand === listing.brand || l.bodyType === listing.bodyType)
  ).slice(0, 3);

  const sameModelListings = MOCK_LISTINGS.filter(
    (l) => l.brand === listing.brand && l.model === listing.model
  );
  const avgPriceArs =
    sameModelListings.reduce((sum, l) => sum + l.priceArs, 0) /
      Math.max(sameModelListings.length, 1) || listing.priceArs;

  const priceDiffPct = Math.round(
    ((listing.priceArs - avgPriceArs) / avgPriceArs) * 100
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/buscar"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Volver a resultados
        </Link>
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image + Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <Card className="overflow-hidden">
            <div className="relative aspect-[16/9] bg-muted">
              {listing.imageUrls.length > 0 &&
              listing.imageUrls[0] !== "/placeholder-car.jpg" ? (
                <Image
                  src={listing.imageUrls[0]}
                  alt={`${listing.brand} ${listing.model} ${listing.year}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Car
                    size={80}
                    strokeWidth={1}
                    className="text-muted-foreground/30"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Vehicle details */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold">
                    {listing.brand} {listing.model} {listing.year}
                  </h1>
                  {listing.version && (
                    <p className="text-muted-foreground">{listing.version}</p>
                  )}
                </div>
                <DealScoreGauge score={listing.dealScore} size="md" />
              </div>

              <div className="flex flex-wrap gap-2">
                <VerificationBadge badge={listing.verificationBadge} size="md" />
                <Badge variant="secondary">
                  {SOURCE_LABELS[listing.source]}
                </Badge>
                {listing.acceptsSwap && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-orange-700 border-orange-200 bg-orange-50"
                  >
                    <ArrowLeftRight size={12} />
                    Permuta
                  </Badge>
                )}
                {listing.hasFinancing && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-violet-700 border-violet-200 bg-violet-50"
                  >
                    <CreditCard size={12} />
                    Financiación
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                <div className="pr-4 space-y-0.5">
                  <InfoRow icon={Calendar} label="Año" value={String(listing.year)} />
                  <InfoRow icon={Gauge} label="Kilómetros" value={formatKm(listing.km)} />
                  {listing.fuelType && (
                    <InfoRow
                      icon={Fuel}
                      label="Combustible"
                      value={FUEL_TYPE_LABELS[listing.fuelType as FuelType] ?? listing.fuelType}
                    />
                  )}
                  {listing.transmission && (
                    <InfoRow
                      icon={Settings2}
                      label="Transmisión"
                      value={
                        listing.transmission === "manual"
                          ? "Manual"
                          : "Automática"
                      }
                    />
                  )}
                </div>
                <div className="pl-0 sm:pl-4 space-y-0.5">
                  {listing.bodyType && (
                    <InfoRow
                      icon={Car}
                      label="Tipo"
                      value={BODY_TYPE_LABELS[listing.bodyType as BodyType] ?? listing.bodyType}
                    />
                  )}
                  {listing.doors && (
                    <InfoRow icon={DoorOpen} label="Puertas" value={String(listing.doors)} />
                  )}
                  <InfoRow icon={MapPin} label="Ubicación" value={listing.location} />
                  <InfoRow icon={MapPin} label="Provincia" value={listing.province} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Price + CTA */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-3xl font-bold">
                  {formatPrice(listing.price, listing.currency)}
                </p>
                {listing.currency === "USD" ? (
                  <p className="text-sm text-muted-foreground">
                    ≈ {formatPrice(listing.priceArs, "ARS")}
                  </p>
                ) : listing.priceUsd ? (
                  <p className="text-sm text-muted-foreground">
                    ≈ {formatPriceUsd(listing.priceUsd)}
                  </p>
                ) : null}
              </div>

              {/* Price comparison */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  vs. precio promedio de mercado
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden" role="img" aria-label={`Este auto está ${priceDiffPct <= 0 ? Math.abs(priceDiffPct) + "% por debajo" : priceDiffPct + "% por encima"} del precio promedio de mercado`}>
                    <div
                      className={`h-full rounded-full ${
                        priceDiffPct <= -10
                          ? "bg-emerald-500"
                          : priceDiffPct <= 0
                            ? "bg-emerald-400"
                            : priceDiffPct <= 10
                              ? "bg-amber-400"
                              : "bg-red-400"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(20, 50 - priceDiffPct))}%`,
                      }}
                    />
                  </div>
                  <span
                    aria-hidden="true"
                    className={`text-sm font-semibold ${
                      priceDiffPct <= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {priceDiffPct > 0 ? "+" : ""}
                    {priceDiffPct}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Promedio: {formatPrice(avgPriceArs, "ARS")}
                </p>
              </div>

              <Button className="w-full gap-2" size="lg" asChild>
                <a
                  href={listing.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  Ver publicación original
                </a>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                En {SOURCE_LABELS[listing.source]}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cost Breakdown */}
      <CostBreakdown listing={listing} />

      {/* Similar */}
      {similar.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Autos similares</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {similar.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
