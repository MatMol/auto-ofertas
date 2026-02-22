/**
 * Runs ALL scrapers: MercadoLibre + Kavak + deRuedas + Autocosmos.
 * Designed to run from a residential IP.
 */

import "./lib/env.js";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const scrapers = [
  { name: "MercadoLibre", script: "scripts/scrape-ml.ts" },
  { name: "Kavak", script: "scripts/scrape-kavak.ts" },
  { name: "deRuedas", script: "scripts/scrape-deruedas.ts" },
  { name: "Autocosmos", script: "scripts/scrape-autocosmos.ts" },
];

let passed = 0;
let failed = 0;

for (const s of scrapers) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Starting: ${s.name}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    execSync(`npx tsx ${s.script}`, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    passed++;
    console.log(`\n  ✓ ${s.name} completed successfully.`);
  } catch {
    failed++;
    console.error(`\n  ✗ ${s.name} failed. Continuing with next scraper...`);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(60)}\n`);

if (failed > 0) process.exit(1);
