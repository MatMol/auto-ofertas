import { calculateScores } from "../../../shared/scoring";
import { rowToListing } from "../../../shared/rows";
interface Env {
  DB: D1Database;
  RUN_TOKEN?: string;
}
async function maintain(env: Env) {
  const rows: Record<string, unknown>[] = [];
  let after = "";
  while (true) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM listings WHERE id>? ORDER BY id LIMIT 500",
    )
      .bind(after)
      .all<Record<string, unknown>>();
    rows.push(...results);
    if (results.length < 500) break;
    after = String(results.at(-1)!.id);
  }
  const listings = rows.map(rowToListing);
  calculateScores(listings);
  for (let i = 0; i < listings.length; i += 50)
    await env.DB.batch(
      listings
        .slice(i, i + 50)
        .map((l) =>
          env.DB.prepare(
            "UPDATE listings SET deal_score=?, score_confidence=?, comparable_count=?, reference_price=? WHERE id=? AND updated_at=?",
          ).bind(
            l.dealScore,
            l.scoreConfidence,
            l.comparableCount,
            l.referencePrice,
            l.id,
            l.updatedAt,
          ),
        ),
    );
}
export default {
  async scheduled(_controller: ScheduledController, env: Env) {
    await maintain(env);
  },
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname !== "/run")
      return new Response("AutoOfertas maintenance", { status: 200 });
    if (request.method !== "POST")
      return new Response("Method not allowed", { status: 405 });
    if (
      !env.RUN_TOKEN ||
      request.headers.get("Authorization") !== `Bearer ${env.RUN_TOKEN}`
    )
      return new Response("Unauthorized", { status: 401 });
    await maintain(env);
    return new Response("OK");
  },
};
