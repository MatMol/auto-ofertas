import { test } from "node:test";
import assert from "node:assert/strict";
import {
  batchD1,
  insertListings,
  recalculateAllScores,
  type D1Statement,
} from "../scripts/lib/d1.js";
import { kavakCarToListing } from "../scripts/scrape-kavak.js";

test("ingestion sends bounded batches and preserves every listing exactly once", async (t) => {
  t.mock.method(console, "log", () => {});
  const batches: D1Statement[][] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      const { batch } = JSON.parse(String(init.body));
      batches.push(batch);
      return Response.json({
        success: true,
        result: batch.map(() => ({ success: true, results: [] })),
      });
    },
  );
  const previous = process.env.USD_RATE;
  process.env.USD_RATE = "1000";
  try {
    const listings = Array.from({ length: 101 }, (_, id) =>
      kavakCarToListing({
        id,
        make: "Toyota",
        model: "Corolla",
        price: 20000000,
        year: 2022,
        km: 1000,
      })!,
    );
    assert.equal(await insertListings(listings), 101);
    assert.deepEqual(
      batches.map((b) => b.length),
      [50, 50, 1],
    );
    assert.deepEqual(
      batches.flat().map((q) => q.params[0]),
      listings.map((l) => l.id),
    );
    assert.ok(batches.flat().every((q) => q.sql.includes("ON CONFLICT(id)")));
  } finally {
    if (previous === undefined) delete process.env.USD_RATE;
    else process.env.USD_RATE = previous;
  }
});

test("D1 failures and missing batch results are never reported as success", async (t) => {
  const responses = [
    { success: true, result: [{ success: false, results: [] }] },
    { success: true, result: [] },
    { success: false },
  ];
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(responses.shift()),
  );
  for (let i = 0; i < 3; i++)
    await assert.rejects(
      batchD1([{ sql: "SELECT 1", params: [] }]),
      /incomplete query result/,
    );
});

test("score updates are batched and retain observation concurrency guard", async (t) => {
  t.mock.method(console, "log", () => {});
  const batches: D1Statement[][] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (body.batch) {
        batches.push(body.batch);
        return Response.json({
          success: true,
          result: body.batch.map(() => ({ success: true, results: [] })),
        });
      }
      return Response.json({
        success: true,
        result: [
          {
            success: true,
            results: Array.from({ length: 51 }, (_, i) => ({
              id: String(i),
              updated_at: "2026-10-24T00:00:00Z",
            })),
          },
        ],
      });
    },
  );
  await recalculateAllScores();
  assert.deepEqual(
    batches.map((b) => b.length),
    [50, 1],
  );
  assert.ok(
    batches
      .flat()
      .every(
        (q) =>
          q.sql.endsWith("AND updated_at=?") &&
          q.params.at(-1) === "2026-10-24T00:00:00Z",
      ),
  );
});
