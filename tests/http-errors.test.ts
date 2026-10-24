import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry, HttpError } from "../scripts/lib/http.js";
import { runTracked } from "../scripts/lib/d1.js";

test("Cloudflare quota errors are shown and not retried; credentials are redacted", async (t) => {
  const previous = process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_API_TOKEN = "test-secret";
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json(
      {
        errors: [
          {
            code: 7500,
            message: "Daily row write limit exceeded: test-secret",
          },
        ],
      },
      { status: 400 },
    );
  });
  try {
    await assert.rejects(
      fetchWithRetry("https://api.cloudflare.com/client/v4/test", {
        method: "POST",
      }),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, 400);
        assert.match(error.message, /7500.*Daily row write limit exceeded/);
        assert.ok(!error.message.includes("test-secret"));
        return true;
      },
    );
    assert.equal(calls, 1);
  } finally {
    if (previous === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previous;
  }
});

test("failed run tracking cannot replace the original ingestion error", async (t) => {
  const keys = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "D1_DATABASE_ID",
    "USD_RATE",
  ];
  const previous = keys.map((key) => process.env[key]);
  keys.forEach((key) => {
    process.env[key] = key === "USD_RATE" ? "1000" : "test-value";
  });
  const original = new Error("Original write failure");
  let calls = 0;
  t.mock.method(console, "warn", () => {});
  t.mock.method(globalThis, "fetch", async () => {
    if (++calls === 1)
      return Response.json({
        success: true,
        result: [{ success: true, results: [] }],
      });
    return Response.json(
      { errors: [{ code: 7500, message: "Daily row write limit exceeded" }] },
      { status: 400 },
    );
  });
  try {
    await assert.rejects(
      runTracked("test", async () => {
        throw original;
      }),
      (error: unknown) => error === original,
    );
    assert.equal(calls, 2);
  } finally {
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
});
