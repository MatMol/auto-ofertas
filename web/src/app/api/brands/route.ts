import { NextResponse } from "next/server";
import { getBrands } from "@/lib/db/client";

export const runtime = "edge";

export async function GET() {
  const brands = await getBrands();
  return NextResponse.json(brands);
}
