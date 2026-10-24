import "./lib/env.js";
import { validateEnv, queryD1, recalculateAllScores } from "./lib/d1.js";
async function main() {
  validateEnv();
  const result = await queryD1(
    "SELECT source, price_kind, COUNT(*) AS count FROM listings GROUP BY source,price_kind",
  );
  console.log(JSON.stringify(result.result[0].results, null, 2));
  if (!process.argv.includes("--apply")) {
    console.log(
      "Dry run. Apply migrations, re-scrape to confirm prices, then use --apply to recalculate. Historical first-seen dates cannot be recovered.",
    );
    return;
  }
  await recalculateAllScores();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
