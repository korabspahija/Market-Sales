// Laptop agent: fetches WAF-blocked flier sources from this machine's
// residential IP and uploads them to aksione.com for processing.
// Scheduled daily via Windows Task Scheduler ("AksioneLocalFetch").
//   npx tsx scripts/local-fetch.ts
import "dotenv/config";
import { LOCAL_FLIER_SOURCE_ADAPTERS, type FlierSource } from "../src/lib/flierSources";
import { pdfToImages } from "../src/lib/pdf";

const BASE = process.env.AKSIONE_URL ?? "https://www.aksione.com";
const SECRET = process.env.CRON_SECRET;

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function downloadPages(source: FlierSource): Promise<Buffer[]> {
  if (source.pdfUrl) {
    const res = await fetch(source.pdfUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`PDF ${res.status}`);
    return pdfToImages(Buffer.from(await res.arrayBuffer()));
  }
  const buffers: Buffer[] = [];
  for (const url of source.imageUrls ?? []) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`page ${url} -> ${res.status}`);
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }
  return buffers;
}

async function main() {
  if (!SECRET) {
    log("CRON_SECRET missing from .env — cannot authenticate against the site.");
    process.exitCode = 1;
    return;
  }

  let uploadedAny = false;
  for (const adapter of LOCAL_FLIER_SOURCE_ADAPTERS) {
    try {
      const source = await adapter.fetch();
      if (!source) {
        log(`${adapter.name}: nothing fresh at source`);
        continue;
      }

      const register = await fetch(`${BASE}/api/ingest/flier`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({ chainSlug: source.chainSlug, sourceKey: source.sourceKey }),
      });
      if (!register.ok) throw new Error(`register -> ${register.status}`);
      const { id, existing } = (await register.json()) as { id: string; existing: boolean };
      if (existing) {
        log(`${adapter.name}: already on the site (key ${source.sourceKey})`);
        continue;
      }

      const pages = await downloadPages(source);
      log(`${adapter.name}: downloaded ${pages.length} pages, uploading as flier ${id}`);
      for (let i = 0; i < pages.length; i++) {
        const form = new FormData();
        form.set("pageNo", String(i + 1));
        form.set("page", new Blob([new Uint8Array(pages[i])], { type: "image/jpeg" }), `page-${i + 1}.jpg`);
        const res = await fetch(`${BASE}/api/ingest/flier/${id}/page`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SECRET}` },
          body: form,
        });
        if (!res.ok) throw new Error(`page ${i + 1} upload -> ${res.status}`);
      }
      log(`${adapter.name}: uploaded ${pages.length} pages`);
      uploadedAny = true;
    } catch (error) {
      log(`${adapter.name}: FAILED — ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  }

  if (uploadedAny) {
    // kick processing right away instead of waiting for tonight's cron
    log("triggering processing on the site…");
    const res = await fetch(`${BASE}/api/cron/fetch-fliers`, {
      headers: { Authorization: `Bearer ${SECRET}` },
      signal: AbortSignal.timeout(320_000),
    });
    log(`processing done: ${(await res.text()).slice(0, 400)}`);
  }
}

main();
