import type { Listing } from "./types";
export async function readListings(
  response: Response,
): Promise<{ listings: Listing[]; total: number }> {
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(
      body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "No pudimos cargar los autos",
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("listings" in body) ||
    !Array.isArray(body.listings) ||
    !("total" in body) ||
    typeof body.total !== "number"
  )
    throw new Error("Respuesta inválida del servidor");
  return { listings: body.listings as Listing[], total: body.total };
}
