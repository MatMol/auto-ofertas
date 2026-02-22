"use client";

import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChipGroup } from "./chip-group";
import { ProvinceSelect } from "./province-select";
import { RangeInput } from "./range-input";
import { X, RotateCcw } from "lucide-react";
import type { SearchFilters, SortOption } from "@/lib/types";
import {
  FUEL_TYPE_LABELS,
  BODY_TYPE_LABELS,
  SOURCE_LABELS,
  SORT_OPTIONS,
} from "@/lib/types";

interface FilterSidebarProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  brands: { brand: string; count: number }[];
  onClose?: () => void;
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function FilterSidebar({
  filters,
  onChange,
  brands,
  onClose,
}: FilterSidebarProps) {
  const update = useCallback(
    (patch: Partial<SearchFilters>) => {
      onChange({ ...filters, ...patch, page: 1 });
    },
    [filters, onChange]
  );

  const hasFilters =
    (filters.brands?.length ?? 0) > 0 ||
    (filters.provinces?.length ?? 0) > 0 ||
    (filters.fuelTypes?.length ?? 0) > 0 ||
    (filters.bodyTypes?.length ?? 0) > 0 ||
    (filters.transmissions?.length ?? 0) > 0 ||
    (filters.sources?.length ?? 0) > 0 ||
    filters.yearMin !== undefined ||
    filters.yearMax !== undefined ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.kmMin !== undefined ||
    filters.kmMax !== undefined ||
    filters.verifiedOnly ||
    filters.acceptsSwap ||
    filters.hasFinancing ||
    filters.dealScoreMin !== undefined;

  const clearAll = () => {
    onChange({ sortBy: filters.sortBy, page: 1, pageSize: filters.pageSize });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Filtros</h2>
        <div className="flex items-center gap-1">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7 gap-1">
              <RotateCcw size={12} />
              Limpiar
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 lg:hidden" aria-label="Cerrar filtros">
              <X size={16} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <FilterSection label="Ordenar por">
        <Select
          value={filters.sortBy ?? "deal_score"}
          onValueChange={(v) => update({ sortBy: v as SortOption })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      <Accordion type="multiple" defaultValue={["basics"]} className="mt-4">
        <AccordionItem value="basics">
          <AccordionTrigger className="text-sm py-3">Precio, año, km y marca</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FilterSection label="Precio (ARS)">
              <RangeInput
                min={filters.priceMin}
                max={filters.priceMax}
                onMinChange={(v) => update({ priceMin: v })}
                onMaxChange={(v) => update({ priceMax: v })}
                placeholderMin="Ej: 5000000"
                placeholderMax="Ej: 25000000"
                labelMin="Precio mínimo"
                labelMax="Precio máximo"
              />
            </FilterSection>
            <FilterSection label="Año">
              <RangeInput
                min={filters.yearMin}
                max={filters.yearMax}
                onMinChange={(v) => update({ yearMin: v })}
                onMaxChange={(v) => update({ yearMax: v })}
                placeholderMin="Ej: 2018"
                placeholderMax="Ej: 2024"
                labelMin="Año mínimo"
                labelMax="Año máximo"
              />
            </FilterSection>
            <FilterSection label="Kilómetros">
              <RangeInput
                min={filters.kmMin}
                max={filters.kmMax}
                onMinChange={(v) => update({ kmMin: v })}
                onMaxChange={(v) => update({ kmMax: v })}
                placeholderMin="Ej: 0"
                placeholderMax="Ej: 100000"
                labelMin="Kilómetros mínimos"
                labelMax="Kilómetros máximos"
              />
            </FilterSection>
            <FilterSection label="Marca">
              <ChipGroup
                options={brands
                  .slice(0, 12)
                  .map((b) => ({
                    value: b.brand,
                    label: b.brand,
                    count: b.count,
                  }))}
                selected={filters.brands ?? []}
                onChange={(v) => update({ brands: v })}
              />
              {brands.length > 12 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Top marcas por cantidad de resultados
                </p>
              )}
            </FilterSection>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="features">
          <AccordionTrigger className="text-sm py-3">Categoría, combustible, transmisión</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FilterSection label="Categoría">
              <ChipGroup
                options={Object.entries(BODY_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                selected={filters.bodyTypes ?? []}
                onChange={(v) => update({ bodyTypes: v as SearchFilters["bodyTypes"] })}
              />
            </FilterSection>
            <FilterSection label="Combustible">
              <ChipGroup
                options={Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                selected={filters.fuelTypes ?? []}
                onChange={(v) => update({ fuelTypes: v as SearchFilters["fuelTypes"] })}
              />
            </FilterSection>
            <FilterSection label="Transmisión">
              <ChipGroup
                options={[
                  { value: "manual", label: "Manual" },
                  { value: "automatica", label: "Automática" },
                ]}
                selected={filters.transmissions ?? []}
                onChange={(v) => update({ transmissions: v as SearchFilters["transmissions"] })}
              />
            </FilterSection>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="location">
          <AccordionTrigger className="text-sm py-3">Provincia y fuente</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FilterSection label="Provincia">
              <ProvinceSelect
                selected={filters.provinces ?? []}
                onChange={(v) => update({ provinces: v })}
              />
            </FilterSection>
            <FilterSection label="Fuente">
              <ChipGroup
                options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                selected={filters.sources ?? []}
                onChange={(v) => update({ sources: v as SearchFilters["sources"] })}
              />
            </FilterSection>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="options">
          <AccordionTrigger className="text-sm py-3">Vendedor, condiciones, Deal Score</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FilterSection label="Vendedor">
              <ChipGroup
                options={[
                  { value: "particular", label: "Dueño directo" },
                  { value: "concesionaria", label: "Concesionaria" },
                ]}
                selected={filters.sellerTypes ?? []}
                onChange={(v) => update({ sellerTypes: v as SearchFilters["sellerTypes"] })}
              />
            </FilterSection>
            <FilterSection label="Condiciones">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.verifiedOnly ?? false}
                    onCheckedChange={(v) => update({ verifiedOnly: v === true })}
                  />
                  Solo verificados
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.acceptsSwap ?? false}
                    onCheckedChange={(v) => update({ acceptsSwap: v === true })}
                  />
                  Acepta permuta
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.hasFinancing ?? false}
                    onCheckedChange={(v) => update({ hasFinancing: v === true })}
                  />
                  Con financiación
                </label>
              </div>
            </FilterSection>
            <FilterSection label="Deal Score mínimo">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cualquiera</span>
                  <span>Aceptable (60)</span>
                  <span>Buena oferta (80+)</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={filters.dealScoreMin ?? 0}
                    onChange={(e) =>
                      update({
                        dealScoreMin: Number(e.target.value) || undefined,
                      })
                    }
                    aria-label="Deal Score mínimo"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={filters.dealScoreMin ?? 0}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-sm font-medium w-8 text-right">
                    {filters.dealScoreMin ?? 0}
                  </span>
                </div>
              </div>
            </FilterSection>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
