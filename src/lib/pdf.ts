import { createCanvas } from "@napi-rs/canvas";

/**
 * Renders PDF pages to JPEG buffers (~1600px wide) — used for chains that
 * publish their fliers as PDFs. pdfjs + napi canvas work on serverless Node.
 */
export async function pdfToImages(pdf: Buffer, maxPages = 10): Promise<Buffer[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(pdf),
    disableFontFace: true,
  }).promise;

  const images: Buffer[] = [];
  const pageCount = Math.min(document.numPages, maxPages);
  for (let pageNo = 1; pageNo <= pageCount; pageNo++) {
    const page = await document.getPage(pageNo);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(3, 1600 / base.width) });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const context = canvas.getContext("2d");
    // @ts-expect-error — napi canvas context is API-compatible with the DOM one pdfjs expects
    await page.render({ canvasContext: context, viewport }).promise;
    images.push(canvas.toBuffer("image/jpeg", 85));
    page.cleanup();
  }
  return images;
}
