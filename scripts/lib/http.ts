import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Bounded retries of the SAME request. Optional disk cache resumes an interrupted read-only crawl. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const cacheDir = process.env.SCRAPE_CACHE_DIR;
  const cacheable =
    !!cacheDir &&
    init.cache !== "no-store" &&
    (!init.method || init.method === "GET");
  const key = createHash("sha256").update(url).digest("hex");
  const path = join(cacheDir || ".cache/scraping", `${key}.json`);
  if (cacheable)
    try {
      const cached = JSON.parse(await readFile(path, "utf8"));
      if (
        Date.now() - cached.at <
        Number(process.env.SCRAPE_CACHE_MINUTES || 60) * 60_000
      )
        return new Response(cached.body, { headers: cached.headers });
    } catch {
      /* no valid checkpoint */
    }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 429 || response.status >= 500) {
        if (attempt === 2)
          throw new Error(
            `HTTP ${response.status} after 3 attempts: ${new URL(url).hostname}`,
          );
        const retry = response.headers.get("retry-after");
        const seconds = retry
          ? Number(retry) ||
            Math.max(0, (Date.parse(retry) - Date.now()) / 1000)
          : 0;
        if (seconds > 60)
          throw new Error(
            "Source requests a longer pause; retry the run later",
          );
        await sleep(
          Math.max(
            Number.isFinite(seconds) ? seconds * 1000 : 0,
            1000 * 2 ** attempt,
          ),
        );
        continue;
      }
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${new URL(url).hostname}`);
      if (cacheable) {
        await mkdir(cacheDir!, { recursive: true });
        await writeFile(
          path,
          JSON.stringify({
            at: Date.now(),
            body: await response.clone().text(),
            headers: Object.fromEntries(response.headers),
          }),
        );
      }
      return response;
    } catch (error) {
      if (
        attempt === 2 ||
        (error instanceof Error && /HTTP 4|longer pause/.test(error.message))
      )
        throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw new Error("Request failed");
}
