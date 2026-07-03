// Dev helper: print content-fraction profiles for page-level band debugging.
//   npx tsx scripts/debug-profiles.ts <image-path>
import { readFileSync } from "node:fs";
import sharp from "sharp";

async function main() {
  const buffer = readFileSync(process.argv[2]);
  const W = 240;
  const meta = await sharp(buffer).metadata();
  const H = Math.max(60, Math.round((meta.height! / meta.width!) * W));
  const { data } = await sharp(buffer).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const channel = (x: number, y: number, c: number) => data[(y * W + x) * 3 + c];
  const insetX = Math.max(2, Math.round(W * 0.025));
  const insetY = Math.max(2, Math.round(H * 0.025));
  const samples: number[][] = [[], [], []];
  for (let x = insetX; x < W - insetX; x++) for (const y of [insetY, H - 1 - insetY]) for (let c = 0; c < 3; c++) samples[c].push(channel(x, y, c));
  for (let y = insetY; y < H - insetY; y++) for (const x of [insetX, W - 1 - insetX]) for (let c = 0; c < 3; c++) samples[c].push(channel(x, y, c));
  const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const bg = samples.map(median);
  console.log("border color:", bg.join(","));
  const isContent = (x: number, y: number) =>
    Math.abs(channel(x, y, 0) - bg[0]) + Math.abs(channel(x, y, 1) - bg[1]) + Math.abs(channel(x, y, 2) - bg[2]) > 90;

  const rowF = Array.from({ length: H }, (_, y) => { let n = 0; for (let x = 0; x < W; x++) if (isContent(x, y)) n++; return n / W; });
  const colF = Array.from({ length: W }, (_, x) => { let n = 0; for (let y = 0; y < H; y++) if (isContent(x, y)) n++; return n / H; });

  const compress = (f: number[]) => f.map((v) => (v > 0.5 ? "#" : v > 0.25 ? "+" : v > 0.12 ? "." : " ")).join("");
  console.log("rows:", compress(rowF));
  console.log("cols:", compress(colF));

  const isCard = (x: number, y: number) => {
    const i = (y * W + x) * 3;
    return Math.min(data[i], data[i + 1], data[i + 2]) >= 190;
  };
  const rowL = Array.from({ length: H }, (_, y) => { let n = 0; for (let x = 0; x < W; x++) if (isCard(x, y)) n++; return n / W; });
  const colL = Array.from({ length: W }, (_, x) => { let n = 0; for (let y = 0; y < H; y++) if (isCard(x, y)) n++; return n / H; });
  console.log("light rows:", compress(rowL));
  console.log("light cols:", compress(colL));
}

main();
