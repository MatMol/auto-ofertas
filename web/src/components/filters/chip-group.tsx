"use client";

import { cn } from "@/lib/utils";

interface ChipGroupProps {
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multi?: boolean;
}

export function ChipGroup({
  options,
  selected,
  onChange,
  multi = true,
}: ChipGroupProps) {
  const toggle = (value: string) => {
    if (multi) {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value]
      );
    } else {
      onChange(selected.includes(value) ? [] : [value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="group">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={isSelected}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-accent"
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className="text-[10px] opacity-70">({opt.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
