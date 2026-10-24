import type { Listing } from "./types.js";
export function filterSuspiciousListings(listings: Listing[]): Listing[] {
  const brands = (process.env.TARGET_BRANDS || "")
    .toLowerCase()
    .split(",")
    .filter(Boolean);
  const models = (process.env.TARGET_MODELS || "")
    .toLowerCase()
    .split(",")
    .filter(Boolean);
  return listings.filter(
    (l) =>
      Number.isFinite(l.price) &&
      l.price > 0 &&
      l.year >= 1950 &&
      l.year <= new Date().getFullYear() + 1 &&
      (l.km === null || l.km >= 0) &&
      (!brands.length || brands.includes(l.brand.toLowerCase())) &&
      (!models.length || models.includes(l.model.toLowerCase())) &&
      (!process.env.TARGET_YEAR_MIN ||
        l.year >= Number(process.env.TARGET_YEAR_MIN)) &&
      (!process.env.TARGET_KM_MAX ||
        (l.km !== null && l.km <= Number(process.env.TARGET_KM_MAX))),
  );
}
