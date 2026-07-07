// Manual flier uploader: drop a chain's saved flier pages into its folder
// under C:\Aksione\<chain>\, run this once, and the pages upload + extract +
// auto-publish. Uploaded files move to a `done` subfolder so re-runs skip
// them. Built for the Facebook-only chains you grab by hand.
//   npx tsx scripts/upload-folders.ts            (uses C:\Aksione)
//   npx tsx scripts/upload-folders.ts D:\path     (custom base)
import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, statSync } from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "C:\\Aksione";
const AKSIONE_URL = process.env.AKSIONE_URL ?? "https://www.aksione.com";
const SECRET = process.env.CRON_SECRET;

// folder name -> chain slug. Extra aliases so the folder can be named the
// short, obvious way. Unknown folders are reported, not silently skipped.
const SLUGS: Record<string, string> = {
  meridian: "meridian-express",
  "meridian-express": "meridian-express",
  albi: "albi-market",
  "albi-market": "albi-market",
  maxi: "maxi",
  conad: "conad",
  viva: "viva-fresh",
  "viva-fresh": "viva-fresh",
  spar: "spar",
  interex: "interex",
  express: "express-store",
  "express-store": "express-store",
  etc: "etc",
  eliabi: "eli-abi",
  "eli-abi": "eli-abi",
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const IGNORED_DIRS = new Set(["done"]);

function log(message: string) {
  console.log(message);
}

/** Natural sort so page 2 comes before page 10. */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function imageFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .filter((name) => statSync(path.join(dir, name)).isFile())
    .sort(naturalSort);
}

async function uploadChainFolder(folder: string, slug: string): Promise<number> {
  const dir = path.join(BASE, folder);
  const files = imageFiles(dir);
  if (files.length === 0) return 0;

  // stray HEIC (iPhone) can't be read server-side — flag it explicitly
  const heic = readdirSync(dir).filter((n) => /\.(heic|heif)$/i.test(n));
  if (heic.length > 0) {
    log(`  ⚠ ${folder}: ${heic.length} HEIC file(s) ignored — convert to JPG first (${heic.slice(0, 2).join(", ")}…)`);
  }

  const buffers = files.map((name) => readFileSync(path.join(dir, name)));
  // content hash => same flier dropped twice is deduped by the server
  const sourceKey = `manual:${slug}:${createHash("sha256")
    .update(Buffer.concat(buffers))
    .digest("hex")
    .slice(0, 24)}`;

  const register = await fetch(`${AKSIONE_URL}/api/ingest/flier`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ chainSlug: slug, sourceKey }),
  });
  if (!register.ok) {
    const msg = await register.text().catch(() => "");
    log(`  ✗ ${folder}: register failed (${register.status}) ${msg.slice(0, 120)}`);
    return 0;
  }
  const { id, existing } = (await register.json()) as { id: string; existing: boolean };
  if (existing) {
    log(`  = ${folder}: already uploaded earlier — moving files to done`);
    moveToDone(dir, files);
    return 0;
  }

  for (let i = 0; i < files.length; i++) {
    const form = new FormData();
    form.set("pageNo", String(i + 1));
    form.set("page", new Blob([new Uint8Array(buffers[i])], { type: "image/jpeg" }), files[i]);
    const res = await fetch(`${AKSIONE_URL}/api/ingest/flier/${id}/page`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
      body: form,
    });
    if (!res.ok) {
      log(`  ✗ ${folder}: page ${i + 1} (${files[i]}) failed (${res.status})`);
      return 0;
    }
  }
  log(`  ✓ ${folder} -> ${slug}: uploaded ${files.length} page(s)`);
  moveToDone(dir, files);
  return files.length;
}

function moveToDone(dir: string, files: string[]) {
  // timestamp-free unique-ish subfolder from the first filename + count, so a
  // second run in the same session doesn't collide (Date.now is avoided to
  // keep the script deterministic/testable)
  const stamp = createHash("sha256").update(files.join("|")).digest("hex").slice(0, 8);
  const doneDir = path.join(dir, "done", stamp);
  mkdirSync(doneDir, { recursive: true });
  for (const name of files) renameSync(path.join(dir, name), path.join(doneDir, name));
}

async function main() {
  if (!SECRET) {
    log("CRON_SECRET missing from .env — cannot authenticate. Aborting.");
    process.exitCode = 1;
    return;
  }

  mkdirSync(BASE, { recursive: true });

  // first-run scaffolding: create the chain folders and explain the flow
  const facebookChains = ["meridian", "albi", "maxi", "conad"];
  let scaffolded = 0;
  for (const name of facebookChains) {
    const dir = path.join(BASE, name);
    try {
      statSync(dir);
    } catch {
      mkdirSync(dir, { recursive: true });
      scaffolded++;
    }
  }
  if (scaffolded > 0) {
    log(`Created chain folders under ${BASE}: ${facebookChains.join(", ")}`);
    log("Drop each chain's saved flier pages into its folder, then run this again.");
  }

  const entries = readdirSync(BASE).filter((name) => {
    if (IGNORED_DIRS.has(name)) return false;
    try {
      return statSync(path.join(BASE, name)).isDirectory();
    } catch {
      return false;
    }
  });

  let totalPages = 0;
  let unknown = 0;
  for (const folder of entries) {
    const slug = SLUGS[folder.toLowerCase()];
    if (!slug) {
      if (imageFiles(path.join(BASE, folder)).length > 0) {
        log(`  ? ${folder}: not a known chain folder — rename it to one of: ${Object.keys(SLUGS).join(", ")}`);
        unknown++;
      }
      continue;
    }
    totalPages += await uploadChainFolder(folder, slug);
  }

  if (totalPages === 0) {
    log(unknown > 0 ? "Nothing uploaded — fix the folder names above." : "Nothing to upload — folders are empty.");
    return;
  }

  log(`Uploaded ${totalPages} page(s). Triggering extraction + publish…`);
  const res = await fetch(`${AKSIONE_URL}/api/cron/fetch-fliers`, {
    headers: { Authorization: `Bearer ${SECRET}` },
    signal: AbortSignal.timeout(320_000),
  });
  const body = await res.text();
  log(`Done: ${body.slice(0, 500)}`);
  log("Review/tweak anything at https://www.aksione.com/menaxho if needed — offers are already live.");
}

main();
