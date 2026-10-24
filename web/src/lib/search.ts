import {
  SORT_OPTIONS,
  SOURCE_LABELS,
  BODY_TYPE_LABELS,
  FUEL_TYPE_LABELS,
  type SearchFilters,
} from "./types";
export function parseFilters(params: URLSearchParams): SearchFilters {
  const out: Record<string, unknown> = {};
  for (const key of [
    "yearMin",
    "yearMax",
    "priceMin",
    "priceMax",
    "kmMin",
    "kmMax",
    "dealScoreMin",
    "page",
    "pageSize",
  ]) {
    const raw = params.get(key);
    if (raw === null || raw === "") continue;
    const v = Number(raw),
      max =
        key === "pageSize"
          ? 60
          : key === "page"
            ? 10000
            : key === "dealScoreMin"
              ? 100
              : key.startsWith("year")
                ? new Date().getFullYear() + 1
                : 1e12;
    if (
      !Number.isFinite(v) ||
      !Number.isInteger(v) ||
      v < (key === "page" || key === "pageSize" ? 1 : 0) ||
      v > max
    )
      throw new Error(`Valor inválido: ${key}`);
    out[key] = v;
  }
  for (const range of ["year", "price", "km"]) {
    if (
      out[`${range}Min`] !== undefined &&
      out[`${range}Max`] !== undefined &&
      Number(out[`${range}Min`]) > Number(out[`${range}Max`])
    )
      throw new Error("El mínimo no puede superar al máximo");
  }
  const enums: Record<string, string[]> = {
    sources: Object.keys(SOURCE_LABELS),
    bodyTypes: Object.keys(BODY_TYPE_LABELS),
    fuelTypes: Object.keys(FUEL_TYPE_LABELS),
    transmissions: ["manual", "automatica"],
    sellerTypes: ["particular", "concesionaria"],
  };
  for (const key of ["brands", "models", "provinces", ...Object.keys(enums)]) {
    const values = params.get(key)?.split(",").filter(Boolean);
    if (!values?.length) continue;
    if (
      values.length > 30 ||
      values.some((v) => v.length > 100) ||
      (enums[key] && values.some((v) => !enums[key].includes(v)))
    )
      throw new Error(`Filtro inválido: ${key}`);
    out[key] = values;
  }
  for (const key of [
    "verifiedOnly",
    "acceptsSwap",
    "hasFinancing",
    "includeUnconfirmed",
    "isNew",
  ]) {
    const raw = params.get(key);
    if (raw === null) continue;
    if (!["true", "false"].includes(raw))
      throw new Error(`Filtro inválido: ${key}`);
    out[key] = raw === "true";
  }
  const q = params.get("q")?.trim();
  if (q) {
    if (q.length > 200) throw new Error("Búsqueda demasiado larga");
    out.query = q;
  }
  const sort = params.get("sortBy") || "deal_score";
  if (!SORT_OPTIONS.some((o) => o.value === sort))
    throw new Error("Orden inválido");
  out.sortBy = sort;
  out.page ??= 1;
  out.pageSize ??= 12;
  return out as SearchFilters;
}
export function filtersToParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && !value.length)
    )
      continue;
    params.set(
      key === "query" ? "q" : key,
      Array.isArray(value) ? value.join(",") : String(value),
    );
  }
  return params;
}
export function clearFilters(filters: SearchFilters): SearchFilters {
  return { sortBy: filters.sortBy, page: 1, pageSize: filters.pageSize };
}
