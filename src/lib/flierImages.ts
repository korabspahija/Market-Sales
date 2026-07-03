import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { saveImageBuffer } from "./storage";

/** Reads a stored image (local /uploads path or public https URL). */
export async function loadImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("http")) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`S'u lexua imazhi (${res.status}).`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path.join(process.cwd(), "public", imageUrl.replace(/^\//, "")));
}

export type NormalizedBox = { x0: number; y0: number; x1: number; y1: number };

/**
 * Crops a normalized box out of a stored page image, stores the crop and
 * returns its public URL. Throws when the box is degenerate.
 */
export async function cropBoxFromImage(imageUrl: string, box: NormalizedBox): Promise<string> {
  const buffer = await loadImageBuffer(imageUrl);
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) throw new Error("Imazhi i faqes nuk u lexua dot.");

  const left = Math.max(0, Math.round(box.x0 * meta.width));
  const top = Math.max(0, Math.round(box.y0 * meta.height));
  const width = Math.min(meta.width - left, Math.round((box.x1 - box.x0) * meta.width));
  const height = Math.min(meta.height - top, Math.round((box.y1 - box.y0) * meta.height));
  if (width < 24 || height < 24) throw new Error("Zona e zgjedhur është shumë e vogël.");

  const crop = await sharp(buffer)
    .extract({ left, top, width, height })
    .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return saveImageBuffer(crop, "image/jpeg");
}
