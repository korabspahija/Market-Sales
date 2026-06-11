import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

export function validateImage(file: File): string | null {
  if (!EXTENSIONS[file.type]) return "Formati i imazhit duhet të jetë JPG, PNG, WEBP ose SVG.";
  if (file.size > MAX_IMAGE_BYTES) return "Imazhi duhet të jetë më i vogël se 4 MB.";
  return null;
}

/**
 * Saves an uploaded product image and returns its public URL.
 * Driver via STORAGE_DRIVER: "local" (dev: public/uploads on disk) or
 * "supabase" (prod: Supabase Storage public bucket).
 */
export async function saveImage(file: File): Promise<string> {
  const fileName = `${randomUUID()}${EXTENSIONS[file.type]}`;

  if (resolveDriver() === "supabase") {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "zbritje-images";
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { contentType: file.type });
    if (error) throw new Error(`Ngarkimi i imazhit dështoi: ${error.message}`);
    return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${fileName}`;
}

function resolveDriver(): "local" | "supabase" {
  const driver = process.env.STORAGE_DRIVER;
  if (driver === "supabase") return "supabase";
  if (driver === "local") return "local";
  return process.env.SUPABASE_URL ? "supabase" : "local";
}
