import sharp from "sharp";
import type { BoundingBox, ExtractedItem } from "./extraction";

export type CropRect = { left: number; top: number; width: number; height: number };

/**
 * Where to crop each extracted product out of the flier page.
 *
 * The vision model reads text and enumerates products in reading order
 * reliably, but its pixel boxes and even its row/column arithmetic drift
 * between runs. So the geometry comes from the pixels: the content panel is
 * detected by contrast with the page border, and the row/column bands by the
 * content profile inside the panel. The model then only has to say *which*
 * cell an item occupies — via its grid indices when its column count agrees
 * with the pixels, or via reading order when the item count matches the grid
 * exactly. Irregular pages produce no crops (category icons) by design.
 */
export async function computeCropRects(
  items: ExtractedItem[],
  grid: { rows: number | null; cols: number | null },
  imageBuffer: Buffer,
  imageWidth: number,
  imageHeight: number,
): Promise<(CropRect | null)[]> {
  const none = items.map(() => null);
  if (items.length === 0) return none;

  const panel = await detectContentPanel(imageBuffer).catch(() => null);
  if (!panel) {
    // no detectable panel: the padded raw box is all there is
    return items.map((item) =>
      item.box ? toPixels(item.box, imageWidth, imageHeight, 0.03) : null,
    );
  }

  const bands = await detectGridBands(imageBuffer, panel).catch(() => null);
  if (!bands) return none;

  const rows = bands.rowBands.length;
  const cols = bands.colBands.length;

  // how does an item map to a cell?
  let cellOf: (item: ExtractedItem, index: number) => { r: number; c: number } | null;
  if (grid.cols === cols && items.every((i) => !i.gridCol || i.gridCol <= cols)) {
    // the model agrees with the pixels on the column count — trust its indices
    cellOf = (item) =>
      item.gridRow && item.gridCol && item.gridRow <= rows
        ? { r: item.gridRow - 1, c: item.gridCol - 1 }
        : null;
  } else if (items.length === rows * cols) {
    // full page in reading order — position follows from the index alone
    cellOf = (_item, index) => ({ r: Math.floor(index / cols), c: index % cols });
  } else {
    return none;
  }

  return items.map((item, index) => {
    const cell = cellOf(item, index);
    if (!cell) return null;
    const y = bands.rowBands[cell.r];
    const x = bands.colBands[cell.c];
    if (!y || !x) return null;
    return toPixels({ x0: x[0], y0: y[0], x1: x[1], y1: y[1] }, imageWidth, imageHeight, 0.004);
  });
}

/**
 * Bounding box of the content panel: pixels that contrast with the page
 * border color (e.g. the beige product area inside an orange frame).
 */
export async function detectContentPanel(buffer: Buffer): Promise<BoundingBox | null> {
  const SIZE = 96;
  const { data } = await sharp(buffer)
    .resize(SIZE, SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channel = (x: number, y: number, c: number) => data[(y * SIZE + x) * 3 + c];
  const borderSamples: number[][] = [[], [], []];
  for (let i = 0; i < SIZE; i++) {
    for (const [x, y] of [[i, 0], [i, SIZE - 1], [0, i], [SIZE - 1, i]] as const) {
      for (let c = 0; c < 3; c++) borderSamples[c].push(channel(x, y, c));
    }
  }
  const borderColor = borderSamples.map(median);
  const isContent = (x: number, y: number) =>
    Math.abs(channel(x, y, 0) - borderColor[0]) +
      Math.abs(channel(x, y, 1) - borderColor[1]) +
      Math.abs(channel(x, y, 2) - borderColor[2]) >
    90;

  const rowFraction = Array.from({ length: SIZE }, (_, y) => {
    let n = 0;
    for (let x = 0; x < SIZE; x++) if (isContent(x, y)) n++;
    return n / SIZE;
  });
  const colFraction = Array.from({ length: SIZE }, (_, x) => {
    let n = 0;
    for (let y = 0; y < SIZE; y++) if (isContent(x, y)) n++;
    return n / SIZE;
  });

  const ys = longestRun(rowFraction, 0.35);
  const xs = longestRun(colFraction, 0.35);
  if (!ys || !xs) return null;
  if (ys[1] - ys[0] < SIZE * 0.3 || xs[1] - xs[0] < SIZE * 0.3) return null;

  return { x0: xs[0] / SIZE, y0: ys[0] / SIZE, x1: (xs[1] + 1) / SIZE, y1: (ys[1] + 1) / SIZE };
}

type GridBands = { rowBands: [number, number][]; colBands: [number, number][] };

/**
 * Row/column bands of a regular product grid inside the panel, found from
 * the content profile: product cards are humps, the gaps between them are
 * valleys. Returns null when the layout isn't a clean grid.
 */
export async function detectGridBands(buffer: Buffer, panel: BoundingBox): Promise<GridBands | null> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) return null;

  const region = {
    left: Math.round(panel.x0 * meta.width),
    top: Math.round(panel.y0 * meta.height),
    width: Math.round((panel.x1 - panel.x0) * meta.width),
    height: Math.round((panel.y1 - panel.y0) * meta.height),
  };
  const W = 240;
  const H = Math.max(60, Math.round((region.height / region.width) * W));
  const { data } = await sharp(buffer)
    .extract(region)
    .resize(W, H, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channel = (x: number, y: number, c: number) => data[(y * W + x) * 3 + c];
  // the panel background dominates the area between cards
  const bg = [0, 1, 2].map((c) => {
    const values: number[] = [];
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) values.push(channel(x, y, c));
    return median(values);
  });
  const isContent = (x: number, y: number) =>
    Math.abs(channel(x, y, 0) - bg[0]) + Math.abs(channel(x, y, 1) - bg[1]) + Math.abs(channel(x, y, 2) - bg[2]) > 60;

  const rowFraction = smooth(
    Array.from({ length: H }, (_, y) => {
      let n = 0;
      for (let x = 0; x < W; x++) if (isContent(x, y)) n++;
      return n / W;
    }),
  );
  const colFraction = smooth(
    Array.from({ length: W }, (_, x) => {
      let n = 0;
      for (let y = 0; y < H; y++) if (isContent(x, y)) n++;
      return n / H;
    }),
  );

  const rowBands = bandsFromProfile(rowFraction, panel.y0, panel.y1);
  const colBands = bandsFromProfile(colFraction, panel.x0, panel.x1);
  if (!rowBands || !colBands) return null;
  if (rowBands.length < 2 || rowBands.length > 10 || colBands.length < 2 || colBands.length > 8) return null;
  return { rowBands, colBands };
}

/**
 * Humps in the content profile -> bands in page-normalized coordinates,
 * each expanded to the midpoint of its neighbouring valleys so the crop
 * keeps the text at the card edges.
 */
function bandsFromProfile(fraction: number[], normStart: number, normEnd: number): [number, number][] | null {
  const n = fraction.length;
  const threshold = 0.12;
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n && fraction[i] > threshold) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      runs.push([start, i - 1]);
      start = -1;
    }
  }
  // bridge specks and drop noise
  const merged: [number, number][] = [];
  for (const run of runs) {
    const previous = merged[merged.length - 1];
    if (previous && run[0] - previous[1] <= Math.max(1, n * 0.008)) previous[1] = run[1];
    else merged.push([...run] as [number, number]);
  }
  const bands = merged.filter(([a, b]) => b - a >= n * 0.04);
  if (bands.length === 0) return null;

  // regular grids have similar band sizes — bail out on wild variance
  const sizes = bands.map(([a, b]) => b - a);
  if (Math.max(...sizes) > Math.min(...sizes) * 2.2) return null;

  const span = normEnd - normStart;
  return bands.map(([a, b], i) => {
    const from = i === 0 ? 0 : (bands[i - 1][1] + 1 + a) / 2;
    const to = i === bands.length - 1 ? n : (b + 1 + bands[i + 1][0]) / 2;
    return [normStart + (from / n) * span, normStart + (to / n) * span] as [number, number];
  });
}

function smooth(values: number[]): number[] {
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 1), Math.min(values.length, i + 2));
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
}

function longestRun(fractions: number[], threshold: number): [number, number] | null {
  let best: [number, number] | null = null;
  let start = -1;
  for (let i = 0; i <= fractions.length; i++) {
    if (i < fractions.length && fractions[i] > threshold) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      if (!best || i - 1 - start > best[1] - best[0]) best = [start, i - 1];
      start = -1;
    }
  }
  return best;
}

function toPixels(box: BoundingBox, width: number, height: number, pad: number): CropRect | null {
  const left = Math.max(0, Math.round((box.x0 - pad) * width));
  const top = Math.max(0, Math.round((box.y0 - pad) * height));
  const right = Math.min(width, Math.round((box.x1 + pad) * width));
  const bottom = Math.min(height, Math.round((box.y1 + pad) * height));
  // degenerate box — better no crop (category icon) than a garbage image
  if (right - left < 24 || bottom - top < 24) return null;
  return { left, top, width: right - left, height: bottom - top };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
