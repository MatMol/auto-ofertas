import "./lib/env.js";
import { readFileSync } from "node:fs";
import {
  validateEnv,
  queryD1,
  insertListings,
  recalculateAllScores,
} from "./lib/d1.js";
import { rowToListing } from "../shared/rows.js";
import { enrichListing } from "./lib/enrich.js";
async function main() {
  validateEnv();
  const file = process.argv[2];
  if (!file)
    throw new Error(
      "Usage: pnpm recheck /path/to/garage-backup.json [--apply]",
    );
  const backup = JSON.parse(readFileSync(file, "utf8"));
  const ids = (backup.favorites || [])
    .map((l: { id: string }) => l.id)
    .filter((id: string) => !id.startsWith("external-"));
  for (const id of ids) {
    const row = (await queryD1("SELECT * FROM listings WHERE id=?", [id]))
      .result[0].results[0];
    if (!row) continue;
    const listing = rowToListing(row);
    if (!process.argv.includes("--apply")) {
      console.log(`Would refresh ${listing.id} (${listing.source})`);
      continue;
    }
    try {
      const confirmed = await enrichListing(listing);
      if (confirmed) await insertListings([listing]);
      else
        console.log(
          `${id}: no explicit price; leaving last observation unchanged`,
        );
    } catch (error) {
      console.warn(`${id}: ${String(error)} (availability unchanged)`);
    }
  }
  if (process.argv.includes("--apply")) await recalculateAllScores();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
