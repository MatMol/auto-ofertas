export type PriceKind = "total" | "deposit" | "installment" | "unknown";
export interface QualityFields {
  priceKind?: PriceKind;
  usdRate?: number | null;
  rateDate?: string | null;
  scoreConfidence?: "insufficient" | "low" | "medium" | "high";
  comparableCount?: number;
  referencePrice?: number | null;
  inferredFields?: string[];
  duplicateGroup?: string | null;
}
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function classifyPrice(text: string, price: number): PriceKind {
  const value = normalizeText(text);
  if (
    /entrega\s*[:$]/i.test(text) ||
    /\bentrega (de )?(u s |us |ars )?\d/.test(value)
  )
    return "deposit";
  if (/\b(anticipo|entrega inicial|adelanto|reserva)\b/.test(value))
    return "deposit";
  if (
    /\b(cuota|cuotas|por mes|mensual)\b/.test(value) &&
    !/\b(precio total|contado)\b/.test(value)
  )
    return "installment";
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    /\b(consultar|a convenir)\b/.test(value)
  )
    return "unknown";
  return "total";
}
export function parseAmount(
  raw: string | number,
  structured = false,
): number | null {
  if (typeof raw === "number")
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (structured && /^\d+(\.\d+)?$/.test(raw.trim())) return Number(raw);
  const clean = raw.replace(/[^\d.,]/g, "");
  if (!clean) return null;
  const result = Number(clean.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(result) ? result : null;
}
export function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export const PRICE_LABELS: Record<PriceKind, string> = {
  total: "Precio total",
  deposit: "Anticipo",
  installment: "Cuota",
  unknown: "Precio sin confirmar",
};

export const INFERRED_LABELS: Record<string, string> = {
  fuelType: "combustible",
  transmission: "transmisión",
  bodyType: "carrocería",
  isImported: "origen nacional/importado",
  sellerType: "tipo de vendedor",
};
export const CONFIDENCE_LABELS: Record<string, string> = {
  insufficient: "insuficiente",
  low: "baja",
  medium: "media",
  high: "alta",
};
