import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPrice, parseAmount } from "../shared/quality.js";
import { calculateScores, type Scorable } from "../shared/scoring.js";
import {
  parseTitle,
  parseAttributes,
  fixProvince,
} from "../scripts/lib/normalize.js";
import { parseFilters, filtersToParams } from "../web/src/lib/search.js";
import { calculateLoan } from "../web/src/lib/costs/loan.js";
import { parseListingsFromHtml } from "../scripts/scrape-autocosmos.js";
import { kavakCarToListing } from "../scripts/scrape-kavak.js";
import { readFileSync } from "node:fs";
const item = (id: string, patch: Partial<Scorable> = {}): Scorable => ({
  id,
  brand: "Toyota",
  model: "Corolla",
  version: "XEi",
  year: 2022,
  km: 50000,
  priceArs: 20e6,
  priceKind: "total",
  isNew: false,
  dealScore: 0,
  ...patch,
});
test("deposits and installments never become full prices", () => {
  assert.equal(classifyPrice("Anticipo: $1.000.000", 1e6), "deposit");
  assert.equal(classifyPrice("Cuota mensual", 100000), "installment");
  assert.equal(classifyPrice("Consultar", 0), "unknown");
  assert.equal(classifyPrice("Precio total contado", 20e6), "total");
});
test("structured decimals and Argentine separators", () => {
  assert.equal(parseAmount("1000000.00", true), 1e6);
  assert.equal(parseAmount("$ 1.000.000"), 1e6);
  assert.equal(parseAmount(""), null);
});
test("compound names and unknown mileage", () => {
  assert.deepEqual(parseTitle("Land Rover Discovery HSE"), {
    brand: "Land Rover",
    model: "Discovery",
    version: "HSE",
  });
  assert.equal(parseTitle("Toyota Corolla Cross XEi").model, "Corolla Cross");
  assert.equal(parseAttributes(["2022"]).km, null);
  assert.equal(parseAttributes(["2022", "0 km"]).km, 0);
  assert.equal(fixProvince("Ciudad Autónoma Buenos Aires"), "CABA");
});
test("unconfirmed, old-year, isolated or extreme prices are not promoted", () => {
  const list = [
    item("a"),
    item("b"),
    item("c"),
    item("d"),
    item("cheap", { priceArs: 1e6 }),
    item("deposit", { priceArs: 1e6, priceKind: "deposit" }),
    item("old", { year: 2000, priceArs: 5e6 }),
    item("missing", { km: null }),
  ];
  calculateScores(list);
  assert.equal(list[0].dealScore, 60);
  for (const l of list.slice(4)) assert.equal(l.dealScore, 0);
  assert.equal(list[0].comparableCount, 3);
});
test("duplicates cannot manufacture market confidence", () => {
  const list = [
    item("a"),
    item("b", { duplicateGroup: "same" }),
    item("c", { duplicateGroup: "same" }),
    item("d", { duplicateGroup: "same" }),
  ];
  calculateScores(list);
  assert.equal(list[0].scoreConfidence, "insufficient");
});
test("zero mileage filter survives serialization; bad ranges rejected", () => {
  const p = filtersToParams({ kmMax: 0, isNew: false, pageSize: 60 });
  assert.equal(parseFilters(p).kmMax, 0);
  assert.equal(parseFilters(p).isNew, false);
  for (const query of [
    "page=-1",
    "priceMin=NaN",
    "kmMin=100&kmMax=10",
    "pageSize=9999",
  ])
    assert.throws(() => parseFilters(new URLSearchParams(query)));
});
test("loan zero-interest and invalid inputs", () => {
  const l = calculateLoan(120000, 50, 0, 12);
  assert.equal(l.cuotaMensual, 5000);
  assert.equal(l.totalDevolver, 60000);
  assert.throws(() => calculateLoan(1000, 50, -1, 12));
});
test("Autocosmos card preserves deposit and missing mileage", () => {
  const listings = parseListingsFromHtml(
    readFileSync(
      new URL("./fixtures/autocosmos.html", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(listings.length, 1);
  assert.equal(listings[0].priceKind, "deposit");
  assert.equal(listings[0].price, 1000000);
  assert.equal(listings[0].km, null);
  assert.equal(listings[0].province, "CABA");
});
test("Kavak keeps missing mileage unknown", () => {
  const listing = kavakCarToListing({
    id: 1,
    make: "Toyota",
    model: "Corolla",
    price: 20000000,
    year: 2022,
  });
  assert.equal(listing?.km, null);
  assert.equal(listing?.isNew, false);
});

import { upsertStatement } from "../scripts/lib/d1.js";
import { rowToListing } from "../shared/rows.js";
import { spawnSync } from "node:child_process";
import { enrichFromHtml } from "../scripts/lib/enrich.js";
test("real upsert preserves first-seen and triggers only original price changes", () => {
  process.env.USD_RATE = "1000";
  const listing = kavakCarToListing({
    id: 2,
    make: "Toyota",
    model: "Corolla",
    price: 20000000,
    year: 2022,
    km: 1000,
  })!;
  listing.createdAt = "2020-01-01T00:00:00Z";
  const first = upsertStatement(listing, "2020-01-01T00:00:00Z");
  listing.createdAt = "2021-01-01T00:00:00Z";
  listing.price = 19000000;
  const second = upsertStatement(listing, "2021-01-01T00:00:00Z");
  process.env.USD_RATE = "2000";
  const third = upsertStatement(listing, "2022-01-01T00:00:00Z");
  const program = `import json,sqlite3,pathlib,sys\nc=sqlite3.connect(':memory:')\nfor f in sorted(pathlib.Path('web/drizzle').glob('*.sql')):c.executescript(f.read_text())\nfor q in json.load(sys.stdin):c.execute(q['sql'],q['params'])\nassert c.execute('SELECT created_at FROM listings').fetchone()[0]=='2020-01-01T00:00:00Z'\nassert c.execute('SELECT COUNT(*) FROM price_history').fetchone()[0]==2\nassert c.execute('SELECT deal_score FROM listings').fetchone()[0]==0\n`;
  const result = spawnSync("python3", ["-c", program], {
    input: JSON.stringify([first, second, third]),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
});
test("malformed images and missing mileage are safe at the database boundary", () => {
  const l = rowToListing({
    id: "a",
    image_urls: "not json",
    km: 0,
    km_known: 0,
  });
  assert.deepEqual(l.imageUrls, []);
  assert.equal(l.km, null);
  assert.equal(l.priceKind, "unknown");
});
test("detail enrichment flags deposits and fills only explicit attributes", () => {
  const l = kavakCarToListing({
    id: 3,
    make: "Volkswagen",
    model: "Amarok",
    price: 1e6,
    year: 2024,
  })!;
  enrichFromHtml(
    l,
    "<title>Volkswagen Amarok anticipo $1.000.000</title><h1>Volkswagen Amarok</h1><table><tr><td>Combustible</td><td>diesel</td></tr></table>",
  );
  assert.equal(l.priceKind, "deposit");
  assert.equal(l.fuelType, "diesel");
});

import { polycardToListing } from "../scripts/lib/normalize.js";
import { parseListingsFromHtml as parseDeRuedas } from "../scripts/scrape-deruedas.js";
test("MercadoLibre title identifies deposits and preserves multiword model", () => {
  const l = polycardToListing({
    metadata: { id: "test" },
    components: [
      { type: "title", title: { text: "Toyota Corolla Cross XEi anticipo" } },
      {
        type: "price",
        price: { current_price: { value: 1000000, currency: "ARS" } },
      },
      { type: "attributes_list", attributes_list: { texts: ["2024"] } },
    ],
  });
  assert.equal(l?.priceKind, "deposit");
  assert.equal(l?.model, "Corolla Cross");
  assert.equal(l?.km, null);
});
test("deRuedas keeps explicit price kind and unknown mileage", () => {
  const rows = parseDeRuedas(
    '<div class="divCar_2"><a class="titulo redirect-result" href="/Usados/Buenos-Aires/test?cod=1"><h2>Land Rover Discovery</h2></a><div><span class="titulo">Anticipo $2.000.000</span><span class="texto">2022 Diesel</span></div></div>',
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].brand, "Land Rover");
  assert.equal(rows[0].priceKind, "deposit");
  assert.equal(rows[0].km, null);
});
