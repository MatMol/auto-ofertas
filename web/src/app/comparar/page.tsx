"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DealScoreGauge } from "@/components/deal-score";
import { VerificationBadge } from "@/components/verification-badge";
import { calculatePatente } from "@/lib/costs/patente";
import { calculateFuel } from "@/lib/costs/fuel";
import { calculateInsurance } from "@/lib/costs/insurance";
import { MOCK_LISTINGS } from "@/lib/db/mock-data";
import { formatPrice, formatKm } from "@/lib/format";
import {
  FUEL_TYPE_LABELS,
  BODY_TYPE_LABELS,
} from "@/lib/types";
import type { FuelType, BodyType } from "@/lib/types";
import { GitCompareArrows, Plus, X, ExternalLink } from "lucide-react";
import type { Listing } from "@/lib/types";

function CompareColumn({
  listing,
  onRemove,
}: {
  listing: Listing;
  onRemove: () => void;
}) {
  const patente = calculatePatente(listing.priceArs, listing.province);
  const fuel = calculateFuel(
    listing.fuelType,
    listing.bodyType,
    listing.tankCapacity,
    listing.consumption,
    1500
  );
  const insurance = calculateInsurance(
    listing.bodyType,
    listing.year,
    listing.province
  );
  const monthlyTotal =
    patente.cuotaBimestral / 2 +
    fuel.costoMensual +
    (insurance.tercerosMin + insurance.tercerosMax) / 2;

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {listing.brand} {listing.model}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {listing.version}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onRemove}
        >
          <X size={14} />
        </Button>
      </div>

      <div className="flex justify-center">
        <DealScoreGauge score={listing.dealScore} size="sm" />
      </div>

      <VerificationBadge badge={listing.verificationBadge} size="sm" />

      <Separator />

      <div className="space-y-2 text-sm">
        <Row label="Precio" value={formatPrice(listing.price, listing.currency)} highlight />
        <Row label="Año" value={String(listing.year)} />
        <Row label="Km" value={formatKm(listing.km)} />
        <Row
          label="Combustible"
          value={
            listing.fuelType
              ? (FUEL_TYPE_LABELS[listing.fuelType as FuelType] ?? listing.fuelType)
              : "—"
          }
        />
        <Row
          label="Transmisión"
          value={
            listing.transmission === "manual"
              ? "Manual"
              : listing.transmission === "automatica"
                ? "Automática"
                : "—"
          }
        />
        <Row
          label="Tipo"
          value={
            listing.bodyType
              ? (BODY_TYPE_LABELS[listing.bodyType as BodyType] ?? listing.bodyType)
              : "—"
          }
        />
        <Row label="Ubicación" value={listing.province} />

        <Separator />

        <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          Costos mensuales
        </p>
        <Row
          label="Patente"
          value={formatPrice(Math.round(patente.cuotaBimestral / 2))}
        />
        <Row label="Combustible" value={formatPrice(fuel.costoMensual)} />
        <Row
          label="Seguro (terceros)"
          value={`${formatPrice(insurance.tercerosMin)}–${formatPrice(insurance.tercerosMax)}`}
        />
        <Separator />
        <Row
          label="Total mensual"
          value={formatPrice(Math.round(monthlyTotal))}
          highlight
        />
      </div>

      <Button variant="outline" size="sm" className="w-full gap-1 text-xs" asChild>
        <a
          href={listing.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={12} />
          Ver publicación
        </a>
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className={highlight ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}

export default function CompararPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedListings = useMemo(
    () =>
      selectedIds
        .map((id) => MOCK_LISTINGS.find((l) => l.id === id))
        .filter(Boolean) as Listing[],
    [selectedIds]
  );

  const availableListings = MOCK_LISTINGS.filter(
    (l) => !selectedIds.includes(l.id)
  );

  const addListing = (id: string) => {
    if (selectedIds.length < 3 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeListing = (id: string) => {
    setSelectedIds(selectedIds.filter((sid) => sid !== id));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitCompareArrows size={24} />
          Comparar autos
        </h1>
        <p className="text-muted-foreground mt-1">
          Seleccioná hasta 3 autos para compararlos lado a lado.
        </p>
      </div>

      {/* Selector */}
      {selectedIds.length < 3 && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Plus size={18} className="text-muted-foreground flex-shrink-0" />
            <Select onValueChange={addListing}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Agregar un auto para comparar..." />
              </SelectTrigger>
              <SelectContent>
                {availableListings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.brand} {l.model} {l.year} — {formatPrice(l.price, l.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Comparison table */}
      {selectedListings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Comparación ({selectedListings.length}/3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-6"
              style={{
                gridTemplateColumns: `repeat(${selectedListings.length}, minmax(0, 1fr))`,
              }}
            >
              {selectedListings.map((listing) => (
                <CompareColumn
                  key={listing.id}
                  listing={listing}
                  onRemove={() => removeListing(listing.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <GitCompareArrows size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">
            Seleccioná autos para comparar
          </p>
          <p className="text-sm mt-1">
            Usá el selector de arriba para agregar hasta 3 autos.
          </p>
        </div>
      )}
    </div>
  );
}
