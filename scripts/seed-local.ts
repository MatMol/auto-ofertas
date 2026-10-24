import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { MOCK_LISTINGS } from "../web/src/lib/db/mock-data.js";
import { upsertStatement } from "./lib/d1.js";
import { calculateScores } from "../shared/scoring.js";
process.env.USD_RATE = "1000"; // Synthetic fixture rate; never used for remote ingestion.
const now = new Date().toISOString();
const rows = MOCK_LISTINGS.map((l) => ({
  ...l,
  priceKind: "total" as const,
  scoreConfidence: "insufficient" as const,
  createdAt: now,
  updatedAt: now,
}));
for (let i = 0; i < 5; i++)
  rows.push({
    ...rows[0],
    id: `demo-comparable-${i}`,
    price: rows[0].price * (0.9 + i * 0.04),
    priceArs: rows[0].priceArs * (0.9 + i * 0.04),
    km: 50000 + i * 2000,
  });
const data = rows.map((l) => ({
  ...l,
  scoreConfidence: "insufficient" as "insufficient" | "low" | "medium" | "high",
  comparableCount: 0,
  referencePrice: null as number | null,
}));
calculateScores(data);
const quote = (v: unknown) =>
  v === null
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;
let sql = "";
for (const l of data) {
  const q = upsertStatement(l, now);
  let i = 0;
  sql += q.sql.replace(/\?/g, () => quote(q.params[i++])) + ";\n";
  sql += `UPDATE listings SET deal_score=${l.dealScore},score_confidence=${quote(l.scoreConfidence)},comparable_count=${l.comparableCount},reference_price=${quote(l.referencePrice)} WHERE id=${quote(l.id)};\n`;
}
const file = join(mkdtempSync(join(tmpdir(), "autoofertas-seed-")), "seed.sql");
writeFileSync(file, sql);
execFileSync(
  "pnpm",
  [
    "exec",
    "wrangler",
    "d1",
    "migrations",
    "apply",
    "auto-ofertas-db",
    "--local",
  ],
  { cwd: resolve("web"), stdio: "inherit" },
);
execFileSync(
  "pnpm",
  [
    "exec",
    "wrangler",
    "d1",
    "execute",
    "auto-ofertas-db",
    "--local",
    `--file=${file}`,
  ],
  { cwd: resolve("web"), stdio: "inherit" },
);
console.log("Synthetic fixtures inserted into LOCAL D1 only.");
