"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { PROVINCES } from "@/lib/types";

interface ProvinceSelectProps {
  selected: string[];
  onChange: (provinces: string[]) => void;
}

export function ProvinceSelect({ selected, onChange }: ProvinceSelectProps) {
  const toggle = useCallback(
    (province: string) => {
      const next = selected.includes(province)
        ? selected.filter((p) => p !== province)
        : [...selected, province];
      onChange(next);
    },
    [selected, onChange]
  );

  const label =
    selected.length === 0
      ? "Todas las provincias"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} provincias`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronDown size={14} className="opacity-50 shrink-0" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 w-56 overflow-y-auto">
        {PROVINCES.map((province) => (
          <DropdownMenuCheckboxItem
            key={province}
            checked={selected.includes(province)}
            onSelect={(e) => {
              e.preventDefault();
              toggle(province);
            }}
          >
            {province}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
