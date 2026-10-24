"use client";
import { useState } from "react";
interface Props {
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
function Field({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  label: string;
  placeholder: string;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  return (
    <input
      className="min-w-0 w-full border rounded px-2 py-2 text-sm"
      type="number"
      min={0}
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(text === "" ? undefined : Number(text))}
    />
  );
}
export function RangeInput(p: Props) {
  return (
    <div className="flex gap-2">
      <Field
        key={`min-${p.min}`}
        value={p.min}
        onChange={p.onMinChange}
        label={p.labelMin || "Mínimo"}
        placeholder={p.placeholderMin || "Mínimo"}
      />
      <span aria-hidden="true">–</span>
      <Field
        key={`max-${p.max}`}
        value={p.max}
        onChange={p.onMaxChange}
        label={p.labelMax || "Máximo"}
        placeholder={p.placeholderMax || "Máximo"}
      />
    </div>
  );
}
