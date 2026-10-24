import "./lib/env.js";
import { validateEnv, queryD1 } from "./lib/d1.js";
// Absence from a bounded search is not evidence of removal. Preserve listings/history.
async function main() {
  validateEnv();
  const result = await queryD1(
    "SELECT source, COUNT(*) AS stale FROM listings WHERE is_active=1 AND updated_at < ? GROUP BY source",
    [new Date(Date.now() - 7 * 86400000).toISOString()],
  );
  console.log(
    "Avisos sin confirmar hace 7 días (no se borran):",
    JSON.stringify(result.result[0].results),
  );
  await queryD1(
    "UPDATE scrape_runs SET status='failed', error='Execution interrupted', finished_at=? WHERE status='running' AND started_at < ?",
    [
      new Date().toISOString(),
      new Date(Date.now() - 24 * 3600000).toISOString(),
    ],
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
