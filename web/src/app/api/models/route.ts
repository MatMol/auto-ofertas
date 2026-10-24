import { NextRequest, NextResponse } from "next/server";
import { getModels } from "@/lib/db/client";
export async function GET(req: NextRequest) {
  const brands =
    req.nextUrl.searchParams.get("brands")?.split(",").slice(0, 30) || [];
  try {
    return NextResponse.json(await getModels(brands));
  } catch {
    return NextResponse.json(
      { error: "No pudimos cargar los modelos" },
      { status: 503 },
    );
  }
}
