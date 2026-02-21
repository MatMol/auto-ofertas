export function formatPrice(price: number, currency: "ARS" | "USD" = "ARS"): string {
  if (currency === "USD") {
    return "US$ " + new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 0,
    }).format(price);
  }
  return "$ " + new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPriceUsd(price: number): string {
  return "US$ " + new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatKm(km: number): string {
  return new Intl.NumberFormat("es-AR").format(km) + " km";
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

export function getDealScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

export function getDealScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function getDealScoreLabel(score: number): string {
  if (score >= 90) return "Excelente oferta";
  if (score >= 80) return "Muy buena oferta";
  if (score >= 70) return "Buena oferta";
  if (score >= 60) return "Oferta aceptable";
  return "Precio alto";
}
