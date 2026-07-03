import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** flier pages are phone photos/scans — allow more */
export const MAX_FLIER_PAGE_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

export function validateImage(file: File, maxBytes: number = MAX_IMAGE_BYTES): string | null {
  if (!EXTENSIONS[file.type]) return "Formati i imazhit duhet të jetë JPG, PNG, WEBP ose SVG.";
  if (file.size > maxBytes) {
    return `Imazhi duhet të jetë më i vogël se ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  }
  return null;
}

/**
 * Saves an uploaded product image and returns its public URL.
 * Driver via STORAGE_DRIVER: "local" (dev: public/uploads on disk) or
 * "supabase" (prod: Supabase Storage public bucket).
 */
export async function saveImage(file: File): Promise<string> {
  return saveBytes(Buffer.from(await file.arrayBuffer()), file.type);
}

/** Same as saveImage but for server-generated images (e.g. flier crops). */
export async function saveImageBuffer(buffer: Buffer, contentType: string): Promise<string> {
  return saveBytes(buffer, contentType);
}

async function saveBytes(buffer: Buffer, contentType: string): Promise<string> {
  const extension = EXTENSIONS[contentType];
  if (!extension) throw new Error(`Format i papritur imazhi: ${contentType}`);
  const fileName = `${randomUUID()}${extension}`;

  if (resolveDriver() === "supabase") {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "zbritje-images";
    // Blob, not raw Buffer: storage-js sends Blobs via multipart (byte-safe),
    // while raw buffers go through the patched fetch which corrupted
    // sharp-produced buffers in production (UTF-8 mangling)
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, { contentType });
    if (error) throw new Error(`Ngarkimi i imazhit dështoi: ${error.message}`);
    return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  return `/uploads/${fileName}`;
}

function resolveDriver(): "local" | "supabase" {
  const driver = process.env.STORAGE_DRIVER;
  if (driver === "supabase") return "supabase";
  if (driver === "local") return "local";
  return process.env.SUPABASE_URL ? "supabase" : "local";
}
