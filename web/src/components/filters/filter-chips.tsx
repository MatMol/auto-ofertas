"use client";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { SearchFilters } from "@/lib/types";
import {
  FUEL_TYPE_LABELS,
  BODY_TYPE_LABELS,
  SOURCE_LABELS,
} from "@/lib/types";

interface FilterChipsProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function FilterChips({ filters, onChange }: FilterChipsProps) {
  const chips: Chip[] = [];

  filters.brands?.forEach((b) =>
    chips.push({
      key: `brand-${b}`,
      label: b,
      onRemove: () =>
        onChange({
          ...filters,
          brands: filters.brands?.filter((x) => x !== b),
          page: 1,
        }),
    })
  );

  filters.provinces?.forEach((p) =>
    chips.push({
      key: `province-${p}`,
      label: p,
      onRemove: () =>
        onChange({
          ...filters,
          provinces: filters.provinces?.filter((x) => x !== p),
          page: 1,
        }),
    })
  );

  filters.bodyTypes?.forEach((bt) =>
    chips.push({
      key: `body-${bt}`,
      label: BODY_TYPE_LABELS[bt] ?? bt,
      onRemove: () =>
        onChange({
          ...filters,
          bodyTypes: filters.bodyTypes?.filter((x) => x !== bt),
          page: 1,
        }),
    })
  );

  filters.fuelTypes?.forEach((ft) =>
    chips.push({
      key: `fuel-${ft}`,
      label: FUEL_TYPE_LABELS[ft] ?? ft,
      onRemove: () =>
        onChange({
          ...filters,
          fuelTypes: filters.fuelTypes?.filter((x) => x !== ft),
          page: 1,
        }),
    })
  );

  filters.transmissions?.forEach((t) =>
    chips.push({
      key: `trans-${t}`,
      label: t === "manual" ? "Manual" : "Automática",
      onRemove: () =>
        onChange({
          ...filters,
          transmissions: filters.transmissions?.filter((x) => x !== t),
          page: 1,
        }),
    })
  );

  filters.sources?.forEach((s) =>
    chips.push({
      key: `source-${s}`,
      label: SOURCE_LABELS[s] ?? s,
      onRemove: () =>
        onChange({
          ...filters,
          sources: filters.sources?.filter((x) => x !== s),
          page: 1,
        }),
    })
  );

  if (filters.sellerTypes?.length) {
    filters.sellerTypes.forEach((st) =>
      chips.push({
        key: `seller-${st}`,
        label: st === "particular" ? "Dueño directo" : "Concesionaria",
        onRemove: () =>
          onChange({
            ...filters,
            sellerTypes: filters.sellerTypes?.filter((x) => x !== st),
            page: 1,
          }),
      })
    );
  }

  if (filters.yearMin || filters.yearMax) {
    chips.push({
      key: "year",
      label: `Año: ${filters.yearMin ?? "..."} - ${filters.yearMax ?? "..."}`,
      onRemove: () =>
        onChange({ ...filters, yearMin: undefined, yearMax: undefined, page: 1 }),
    });
  }

  if (filters.priceMin || filters.priceMax) {
    chips.push({
      key: "price",
      label: `Precio: ${filters.priceMin ? `$${(filters.priceMin / 1_000_000).toFixed(1)}M` : "..."} - ${filters.priceMax ? `$${(filters.priceMax / 1_000_000).toFixed(1)}M` : "..."}`,
      onRemove: () =>
        onChange({ ...filters, priceMin: undefined, priceMax: undefined, page: 1 }),
    });
  }

  if (filters.kmMin || filters.kmMax) {
    chips.push({
      key: "km",
      label: `Km: ${filters.kmMin ?? "..."} - ${filters.kmMax ?? "..."}`,
      onRemove: () =>
        onChange({ ...filters, kmMin: undefined, kmMax: undefined, page: 1 }),
    });
  }

  if (filters.verifiedOnly) {
    chips.push({
      key: "verified",
      label: "Solo verificados",
      onRemove: () => onChange({ ...filters, verifiedOnly: false, page: 1 }),
    });
  }

  if (filters.acceptsSwap) {
    chips.push({
      key: "swap",
      label: "Acepta permuta",
      onRemove: () => onChange({ ...filters, acceptsSwap: false, page: 1 }),
    });
  }

  if (filters.hasFinancing) {
    chips.push({
      key: "financing",
      label: "Con financiación",
      onRemove: () => onChange({ ...filters, hasFinancing: false, page: 1 }),
    });
  }

  if (filters.dealScoreMin !== undefined && filters.dealScoreMin > 0) {
    chips.push({
      key: "dealScore",
      label: `Score ≥ ${filters.dealScoreMin}`,
      onRemove: () => onChange({ ...filters, dealScoreMin: undefined, page: 1 }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          role="button"
          tabIndex={0}
          className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
          onClick={chip.onRemove}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              chip.onRemove();
            }
          }}
          aria-label={`Quitar filtro: ${chip.label}`}
        >
          {chip.label}
          <X size={12} aria-hidden="true" />
        </Badge>
      ))}
    </div>
  );
}
