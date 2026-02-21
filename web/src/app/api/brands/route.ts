import { NextResponse } from "next/server";
import { getBrands } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const brands = await getBrands();
    return NextResponse.json(brands);
  } catch (err) {
    console.error("GET /api/brands error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
