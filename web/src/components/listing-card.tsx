"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DealScoreBadge } from "@/components/deal-score";
import { VerificationBadge } from "@/components/verification-badge";
import { formatPrice, formatKm } from "@/lib/format";
import { Car, ArrowLeftRight, CreditCard } from "lucide-react";
import type { Listing } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";

export function ListingCard({ listing }: { listing: Listing }) {
  const hasImage =
    listing.imageUrls.length > 0 &&
    listing.imageUrls[0] !== "/placeholder-car.jpg";

  return (
    <Link
      href={`/auto/${listing.id}`}
      aria-label={`${listing.brand} ${listing.model} ${listing.year} — ${formatPrice(listing.price, listing.currency)}`}
    >
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 h-full py-0 gap-0">
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {hasImage ? (
            <Image
              src={listing.imageUrls[0]}
              alt={`${listing.brand} ${listing.model} ${listing.year}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Car size={48} strokeWidth={1} aria-hidden="true" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <DealScoreBadge score={listing.dealScore} />
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[11px]">
              {SOURCE_LABELS[listing.source]}
            </Badge>
          </div>
        </div>
        <CardContent className="px-3.5 py-3 space-y-2">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight line-clamp-1">
                {listing.brand} {listing.model}
              </h3>
            </div>
            {listing.version && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {listing.version}
              </p>
            )}
          </div>

          <p className="text-lg font-bold">{formatPrice(listing.price, listing.currency)}</p>

          <p className="text-xs text-muted-foreground">
            {listing.year} · {formatKm(listing.km)}
          </p>

          <div className="flex flex-wrap gap-1.5">
            <VerificationBadge badge={listing.verificationBadge} size="sm" />
            {listing.acceptsSwap && (
              <Badge
                variant="outline"
                className="gap-1 text-[11px] text-orange-700 border-orange-200 bg-orange-50"
              >
                <ArrowLeftRight size={10} aria-hidden="true" />
                Permuta
              </Badge>
            )}
            {listing.hasFinancing && (
              <Badge
                variant="outline"
                className="gap-1 text-[11px] text-violet-700 border-violet-200 bg-violet-50"
              >
                <CreditCard size={10} aria-hidden="true" />
                Financiación
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
