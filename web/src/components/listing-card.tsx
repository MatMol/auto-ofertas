"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { DealScoreBadge } from "@/components/deal-score";
import { VerificationBadge } from "@/components/verification-badge";
import { CarImage } from "@/components/car-image";
import { ListingActions } from "@/components/listing-actions";
import { formatPrice, formatKm } from "@/lib/format";
import { SOURCE_LABELS, type Listing } from "@/lib/types";
import { PRICE_LABELS } from "../../../shared/quality";
export function ListingCard({ listing: l }: { listing: Listing }) {
  const path = usePathname(),
    params = useSearchParams();
  const back = path === "/buscar" ? `${path}?${params.toString()}` : path;
  return (
    <Card className="overflow-hidden h-full py-0 gap-0">
      <Link
        href={`/auto/${encodeURIComponent(l.id)}?back=${encodeURIComponent(back)}`}
        aria-label={`${l.brand} ${l.model} ${l.year}, ${formatPrice(l.price, l.currency)}`}
      >
        <div className="relative aspect-[4/3]">
          <CarImage
            src={l.imageUrls[0]}
            alt={`${l.brand} ${l.model} ${l.year}`}
          />
          <span className="absolute top-2 right-2 bg-background/95 rounded-full px-2 py-1 text-xs">
            {SOURCE_LABELS[l.source]}
          </span>
        </div>
      </Link>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between gap-2">
          <h3 className="font-semibold">
            {l.brand} {l.model}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {l.version || "Versión sin confirmar"}
        </p>
        <p className="text-lg font-bold">
          {l.priceKind !== "total" && (
            <span className="block text-xs font-medium text-amber-700">
              {PRICE_LABELS[l.priceKind || "unknown"]}
            </span>
          )}
          {formatPrice(l.price, l.currency)}
        </p>
        <p className="text-sm">
          {l.year || "Año sin confirmar"} · {formatKm(l.km)}
        </p>
        <p className="text-xs text-muted-foreground">
          {l.location} · Visto{" "}
          {new Date(l.updatedAt).toLocaleDateString("es-AR")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DealScoreBadge score={l.dealScore} />
          <VerificationBadge badge={l.verificationBadge} />
        </div>
        <ListingActions listing={l} />
      </CardContent>
    </Card>
  );
}
