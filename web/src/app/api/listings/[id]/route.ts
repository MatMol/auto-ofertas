import { NextRequest, NextResponse } from "next/server";
import { getListingById } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListingById(id);
  } catch {
    return NextResponse.json(
      { error: "No pudimos cargar el aviso" },
      { status: 503 },
    );
  }

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(listing);
}
