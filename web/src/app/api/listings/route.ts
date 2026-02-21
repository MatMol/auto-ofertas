import { NextRequest, NextResponse } from "next/server";
import { getListings } from "@/lib/db/client";
import type { SearchFilters } from "@/lib/types";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const filters: SearchFilters = {
    query: params.get("q") ?? undefined,
    brands: params.get("brands")?.split(",").filter(Boolean) ?? undefined,
    models: params.get("models")?.split(",").filter(Boolean) ?? undefined,
    yearMin: params.get("yearMin") ? Number(params.get("yearMin")) : undefined,
    yearMax: params.get("yearMax") ? Number(params.get("yearMax")) : undefined,
    priceMin: params.get("priceMin") ? Number(params.get("priceMin")) : undefined,
    priceMax: params.get("priceMax") ? Number(params.get("priceMax")) : undefined,
    kmMin: params.get("kmMin") ? Number(params.get("kmMin")) : undefined,
    kmMax: params.get("kmMax") ? Number(params.get("kmMax")) : undefined,
    provinces: params.get("provinces")?.split(",").filter(Boolean) ?? undefined,
    fuelTypes: params.get("fuelTypes")?.split(",").filter(Boolean) as SearchFilters["fuelTypes"],
    transmissions: params.get("transmissions")?.split(",").filter(Boolean) as SearchFilters["transmissions"],
    bodyTypes: params.get("bodyTypes")?.split(",").filter(Boolean) as SearchFilters["bodyTypes"],
    sellerTypes: params.get("sellerTypes")?.split(",").filter(Boolean) as SearchFilters["sellerTypes"],
    sources: params.get("sources")?.split(",").filter(Boolean) as SearchFilters["sources"],
    verifiedOnly: params.get("verifiedOnly") === "true" || undefined,
    acceptsSwap: params.get("acceptsSwap") === "true" || undefined,
    hasFinancing: params.get("hasFinancing") === "true" || undefined,
    dealScoreMin: params.get("dealScoreMin") ? Number(params.get("dealScoreMin")) : undefined,
    sortBy: (params.get("sortBy") as SearchFilters["sortBy"]) ?? "deal_score",
    page: params.get("page") ? Number(params.get("page")) : 1,
    pageSize: 12,
  };

  const data = await getListings(filters);

  return NextResponse.json(data);
}
