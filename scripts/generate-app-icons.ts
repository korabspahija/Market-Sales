// Renders the app icons from src/app/icon.svg.
//   npx tsx scripts/generate-app-icons.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SVG = readFileSync(path.join(process.cwd(), "src", "app", "icon.svg"));
const OUT = path.join(process.cwd(), "public", "icons");
mkdirSync(OUT, { recursive: true });

async function main() {
  for (const size of [192, 512]) {
    writeFileSync(
      path.join(OUT, `icon-${size}.png`),
      await sharp(SVG, { density: 300 }).resize(size, size).png().toBuffer(),
    );
    console.log(`✓ icon-${size}.png`);
  }

  // maskable: full-bleed brand background with the logo inside the safe zone
  for (const size of [512]) {
    const inner = await sharp(SVG, { density: 300 }).resize(Math.round(size * 0.72)).png().toBuffer();
    writeFileSync(
      path.join(OUT, `maskable-${size}.png`),
      await sharp({
        create: { width: size, height: size, channels: 4, background: "#dc2626" },
      })
        .composite([{ input: inner, gravity: "center" }])
        .png()
        .toBuffer(),
    );
    console.log(`✓ maskable-${size}.png`);
  }

  // iOS home-screen icon (Next serves src/app/apple-icon.png automatically)
  writeFileSync(
    path.join(process.cwd(), "src", "app", "apple-icon.png"),
    await sharp(SVG, { density: 300 }).resize(180, 180).png().toBuffer(),
  );
  console.log("✓ apple-icon.png");
}

main();
