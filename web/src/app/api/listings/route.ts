import { NextRequest, NextResponse } from "next/server";
import { getListings, getListingsByIds } from "@/lib/db/client";
import { parseFilters } from "@/lib/search";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  let filters;
  try {
    filters = parseFilters(request.nextUrl.searchParams);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const ids = request.nextUrl.searchParams.get("ids");
    if (ids) {
      const values = [...new Set(ids.split(","))];
      if (values.length > 60 || values.some((v) => v.length > 160))
        return NextResponse.json(
          { error: "Demasiados avisos" },
          { status: 400 },
        );
      const listings = await getListingsByIds(values);
      return NextResponse.json({ listings, total: listings.length });
    }
    return NextResponse.json(await getListings(filters));
  } catch (e) {
    console.error("listings", e);
    return NextResponse.json(
      { error: "No pudimos cargar los autos. Volvé a intentar." },
      { status: 503 },
    );
  }
}
