"use client";

import { Input } from "@/components/ui/input";

interface RangeInputProps {
  min: number | undefined;
  max: number | undefined;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
  placeholderMin?: string;
  placeholderMax?: string;
  labelMin?: string;
  labelMax?: string;
  formatFn?: (v: number) => string;
}

export function RangeInput({
  min,
  max,
  onMinChange,
  onMaxChange,
  placeholderMin = "Mín",
  placeholderMax = "Máx",
  labelMin,
  labelMax,
}: RangeInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        placeholder={placeholderMin}
        aria-label={labelMin ?? placeholderMin}
        value={min ?? ""}
        onChange={(e) =>
          onMinChange(e.target.value ? Number(e.target.value) : undefined)
        }
        className="text-sm h-8"
      />
      <span className="text-muted-foreground text-xs" aria-hidden="true">—</span>
      <Input
        type="number"
        placeholder={placeholderMax}
        aria-label={labelMax ?? placeholderMax}
        value={max ?? ""}
        onChange={(e) =>
          onMaxChange(e.target.value ? Number(e.target.value) : undefined)
        }
        className="text-sm h-8"
      />
    </div>
  );
}
