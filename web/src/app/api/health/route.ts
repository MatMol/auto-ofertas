import { NextResponse } from "next/server";
import { getSourceHealth } from "@/lib/db/client";
export async function GET() {
  try {
    return NextResponse.json(await getSourceHealth());
  } catch {
    return NextResponse.json(
      { error: "Estado no disponible" },
      { status: 503 },
    );
  }
}
