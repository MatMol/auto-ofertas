import Link from "next/link";
import { CarGallery } from "@/components/car-image";
import { ListingActions } from "@/components/listing-actions";
import {
  PRICE_LABELS,
  INFERRED_LABELS,
  CONFIDENCE_LABELS,
} from "../../../../../shared/quality";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DealScoreGauge } from "@/components/deal-score";
import { VerificationBadge } from "@/components/verification-badge";
import { CostBreakdown } from "@/components/cost-breakdown";
import {
  getListingById,
  getSimilarListings,
  getPriceHistory,
  getPossibleDuplicates,
} from "@/lib/db/client";
import { formatPrice, formatPriceUsd, formatKm } from "@/lib/format";
import { SOURCE_LABELS, FUEL_TYPE_LABELS, BODY_TYPE_LABELS } from "@/lib/types";
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

export const dynamic = "force-dynamic";

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

export default async function AutoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const backRaw = (await searchParams).back;
  const back =
    backRaw && /^\/(buscar|rankings|mi-garage)(\?|$)/.test(backRaw)
      ? backRaw
      : "/buscar";
  const listing = await getListingById(id);

  if (!listing) {
    notFound();
  }

  const [similar, history, duplicates] = await Promise.all([
    getSimilarListings(listing.brand, listing.model, listing.id, 3),
    getPriceHistory(listing.id),
    listing.duplicateGroup
      ? getPossibleDuplicates(listing.id, listing.duplicateGroup)
      : Promise.resolve([]),
  ]);
  const effectiveAvg = listing.referencePrice || 0;
  const priceDiffPct =
    effectiveAvg > 0
      ? Math.round((listing.priceArs / effectiveAvg - 1) * 100)
      : 0;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={back}
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
            <CarGallery
              urls={listing.imageUrls}
              title={`${listing.brand} ${listing.model} ${listing.year}`}
            />
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
                <VerificationBadge
                  badge={listing.verificationBadge}
                  size="md"
                />
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
                <div className="pr-4 space-y-1.5">
                  <InfoRow
                    icon={Calendar}
                    label="Año"
                    value={String(listing.year)}
                  />
                  <InfoRow
                    icon={Gauge}
                    label="Kilómetros"
                    value={formatKm(listing.km)}
                  />
                  {listing.fuelType && (
                    <InfoRow
                      icon={Fuel}
                      label="Combustible"
                      value={
                        FUEL_TYPE_LABELS[listing.fuelType as FuelType] ??
                        listing.fuelType
                      }
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
                <div className="pl-0 sm:pl-4 pt-4 sm:pt-0 space-y-1.5">
                  {listing.bodyType && (
                    <InfoRow
                      icon={Car}
                      label="Tipo"
                      value={
                        BODY_TYPE_LABELS[listing.bodyType as BodyType] ??
                        listing.bodyType
                      }
                    />
                  )}
                  {listing.doors && (
                    <InfoRow
                      icon={DoorOpen}
                      label="Puertas"
                      value={String(listing.doors)}
                    />
                  )}
                  <InfoRow
                    icon={MapPin}
                    label="Ubicación"
                    value={listing.location}
                  />
                  <InfoRow
                    icon={MapPin}
                    label="Provincia"
                    value={listing.province}
                  />
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
                <p className="text-sm text-muted-foreground">
                  {PRICE_LABELS[listing.priceKind || "unknown"]}
                </p>
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

              <ListingActions listing={listing} />
              <p className="text-xs text-muted-foreground">
                Primera detección:{" "}
                {new Date(listing.createdAt).toLocaleDateString("es-AR")}.
                Última detección:{" "}
                {new Date(listing.updatedAt).toLocaleDateString("es-AR")}.{" "}
                {!listing.isActive
                  ? "Aviso inactivo."
                  : new Date().getTime() - Date.parse(listing.updatedAt) >
                      7 * 86400000
                    ? "Disponibilidad sin confirmar hace más de 7 días."
                    : ""}
              </p>
              {listing.usdRate && (
                <p className="text-xs text-muted-foreground">
                  Conversión: 1 USD = {formatPrice(listing.usdRate)}. Fecha:{" "}
                  {listing.rateDate
                    ? new Date(listing.rateDate).toLocaleDateString("es-AR")
                    : "sin informar"}
                  .
                </p>
              )}
              {!!listing.inferredFields?.length && (
                <p className="text-xs text-muted-foreground">
                  Atributos inferidos del título, confirmar en origen:{" "}
                  {listing.inferredFields
                    .map((f) => INFERRED_LABELS[f] || "dato inferido")
                    .join(", ")}
                  .
                </p>
              )}
              {/* Price comparison */}
              {effectiveAvg > 0 ? (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    vs. mediana de {listing.comparableCount} comparables ·
                    confianza{" "}
                    {
                      CONFIDENCE_LABELS[
                        listing.scoreConfidence || "insufficient"
                      ]
                    }
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 h-2 rounded-full bg-muted overflow-hidden"
                      role="img"
                      aria-label={`Este auto está ${priceDiffPct <= 0 ? Math.abs(priceDiffPct) + "% por debajo" : priceDiffPct + "% por encima"} de la mediana de autos comparables`}
                    >
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
                    Mediana: {formatPrice(effectiveAvg, "ARS")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin suficientes comparables para estimar una oportunidad.
                </p>
              )}
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

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Historial de precio publicado</h2>
        {history.length ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Importe original</th>
                  <th className="text-left p-2">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">
                      {new Date(h.observed_at).toLocaleString("es-AR")}
                    </td>
                    <td className="p-2">{formatPrice(h.price, h.currency)}</td>
                    <td className="p-2">
                      {PRICE_LABELS[
                        h.price_kind as keyof typeof PRICE_LABELS
                      ] || "Sin confirmar"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            El historial comienza cuando volvemos a detectar el aviso después de
            la migración.
          </p>
        )}
      </section>
      {duplicates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Posibles publicaciones del mismo auto
          </h2>
          <p className="text-sm">
            Coincidencias por versión, año, km y provincia; verificá que sea la
            misma unidad.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {duplicates.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
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
