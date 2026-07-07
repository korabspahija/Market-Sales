import sharp from "sharp";
import type { BoundingBox, ExtractedItem, LayoutRow } from "./extraction";

export type CropRect = { left: number; top: number; width: number; height: number };

/**
 * Where to crop each extracted product out of the flier page.
 *
 * Geometry comes from the pixels: cells are detected from the page structure
 * (layout rows + column profiles, or the legacy panel-grid detectors). The
 * model then only has to POINT — each item claims the cell its rough box
 * CENTER lands in. Pointing is reliable even when box edges drift, and it
 * removes the old requirement that item count must equal cell count (the
 * extractor intentionally skips multi-buy cards, so counts rarely match).
 * Finally each claimed cell is refined to hug the product PHOTO inside it,
 * ignoring text — names and prices live in the card UI anyway.
 */
export async function computeCropRects(
  items: ExtractedItem[],
  _grid: { rows: number | null; cols: number | null },
  imageBuffer: Buffer,
  imageWidth: number,
  imageHeight: number,
  layoutRows: LayoutRow[] | null = null,
): Promise<(CropRect | null)[]> {
  const none = items.map(() => null);
  if (items.length === 0) return none;

  // cell-structure sources in TRUST order: a box-cluster grid that passed
  // its strict regularity gate describes the page best (counts from the
  // items themselves, geometry from the panel); the layout pass and the
  // legacy pixel detectors follow. First source that accounts for most of
  // the items wins — items are assigned by order-preserving alignment on
  // box-center distance (items arrive in reading order, cells row-major),
  // so order fixes what distance alone shuffles on dense pages.
  const panel = await detectContentPanel(imageBuffer).catch(() => null);
  const candidates: BoundingBox[][] = [];
  const fromBoxes = boxGridCells(items, panel);
  if (fromBoxes) candidates.push(fromBoxes);
  if (layoutRows && layoutRows.length > 0) {
    const fromLayout = await cellsFromLayout(imageBuffer, layoutRows).catch(() => null);
    if (fromLayout && fromLayout.length > 0) candidates.push(fromLayout);
  }
  const fromLegacy = await legacyCells(imageBuffer).catch(() => null);
  if (fromLegacy && fromLegacy.length > 0) candidates.push(fromLegacy);
  if (candidates.length === 0) return none;

  let chosen: (BoundingBox | null)[] = items.map(() => null);
  let bestMatched = 0;
  let confident = false;
  for (const cells of candidates) {
    const result = alignItemsToCells(items, cells);
    if (result.matched >= items.length * 0.7) {
      chosen = result.chosen;
      confident = true;
      break;
    }
    if (result.matched > bestMatched) {
      chosen = result.chosen;
      bestMatched = result.matched;
    }
  }
  // an irregular page (promo collages etc.) never reaches confident cell
  // structure — there, keep only matches where the model's box sits square
  // on the cell; a wrong crop is worse than a category icon
  if (!confident) {
    chosen = chosen.map((cell, i) => {
      const box = items[i].box;
      if (!cell || !box) return null;
      const cx = (box.x0 + box.x1) / 2;
      const cy = (box.y0 + box.y1) / 2;
      const dx = (cx - (cell.x0 + cell.x1) / 2) / Math.max(0.01, cell.x1 - cell.x0);
      const dy = (cy - (cell.y0 + cell.y1) / 2) / Math.max(0.01, cell.y1 - cell.y0);
      return Math.hypot(dx, dy) <= 0.45 ? cell : null;
    });
  }

  const rects: (CropRect | null)[] = [];
  for (let i = 0; i < items.length; i++) {
    const cell = chosen[i];
    if (!cell) {
      rects.push(null);
      continue;
    }
    const photo = await refineCellToPhoto(imageBuffer, cell).catch(() => null);
    rects.push(toPixels(photo ?? cell, imageWidth, imageHeight, 0.004));
  }
  return rects;
}

/**
 * Order-preserving item→cell assignment (Needleman-Wunsch style). Skipping
 * a cell is cheap (the extractor intentionally skips multi-buy cards);
 * dropping an item is expensive but better than a wrong match; matches
 * beyond one-cell's distance are forbidden.
 */
/**
 * A regular grid inferred from the item boxes THEMSELVES: individual boxes
 * drift (often ALL of them, systematically), but their centers still cluster
 * into clean columns and rows on a regular page. So the clusters supply only
 * the COUNTS — the geometry is a uniform grid over the pixel-detected panel,
 * which can't inherit the boxes' drift. Pages whose box centers don't fit a
 * regular grid (mixed layouts) are rejected.
 */
function boxGridCells(items: ExtractedItem[], panel: BoundingBox | null): BoundingBox[] | null {
  const boxes = items.filter((i) => i.box).map((i) => i.box!);
  if (boxes.length < 6) return null;

  const cluster = (values: number[]): number[][] => {
    const sorted = [...values].sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
    const positive = gaps.filter((g) => g > 0.001);
    const typical = positive.length > 0 ? median(positive) : 0.05;
    const groups: number[][] = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > Math.max(typical * 1.8, 0.05)) groups.push([sorted[i]]);
      else groups[groups.length - 1].push(sorted[i]);
    }
    // a lone straggler is a drifted box, not a real column/row
    return groups.filter((g) => g.length >= 2 || groups.length <= 2);
  };

  const centerOf = (g: number[]) => g.reduce((a, b) => a + b, 0) / g.length;
  const colGroups = cluster(boxes.map((b) => (b.x0 + b.x1) / 2));
  const rowGroups = cluster(boxes.map((b) => (b.y0 + b.y1) / 2));
  const cols = colGroups.length;
  const rows = rowGroups.length;
  if (cols < 2 || cols > 6 || rows < 2 || rows > 8) return null;
  if (cols * rows < boxes.length || cols * rows > boxes.length * 1.8) return null;

  // regularity check: nearly every box center must sit close to a cluster
  // center on BOTH axes — mixed layouts (a 5-col row above 4-col rows) fail here
  const colCenters = colGroups.map(centerOf);
  const rowCenters = rowGroups.map(centerOf);
  const colSpacing = cols > 1 ? (colCenters[cols - 1] - colCenters[0]) / (cols - 1) : 0.2;
  const rowSpacing = rows > 1 ? (rowCenters[rows - 1] - rowCenters[0]) / (rows - 1) : 0.2;
  let fits = 0;
  for (const box of boxes) {
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    const colOk = colCenters.some((c) => Math.abs(cx - c) < colSpacing * 0.35);
    const rowOk = rowCenters.some((r) => Math.abs(cy - r) < rowSpacing * 0.35);
    if (colOk && rowOk) fits++;
  }
  if (fits < boxes.length * 0.85) return null;

  // geometry from the panel, not from the (possibly shifted) boxes
  const areaX0 = panel?.x0 ?? 0.03;
  const areaX1 = panel?.x1 ?? 0.97;
  const areaY0 = panel?.y0 ?? 0.05;
  const areaY1 = panel?.y1 ?? 0.95;
  const cells: BoundingBox[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x0: areaX0 + ((areaX1 - areaX0) * c) / cols,
        y0: areaY0 + ((areaY1 - areaY0) * r) / rows,
        x1: areaX0 + ((areaX1 - areaX0) * (c + 1)) / cols,
        y1: areaY0 + ((areaY1 - areaY0) * (r + 1)) / rows,
      });
    }
  }
  return cells;
}

function alignItemsToCells(
  items: ExtractedItem[],
  cells: BoundingBox[],
): { chosen: (BoundingBox | null)[]; matched: number; meanDist: number } {
  const n = items.length;
  const m = cells.length;
  const SKIP_CELL = 0.06;
  const SKIP_ITEM = 0.9;
  const MAX_DIST = 1.25;

  const dist = (item: ExtractedItem, cell: BoundingBox): number => {
    if (!item.box) return Infinity;
    const cx = (item.box.x0 + item.box.x1) / 2;
    const cy = (item.box.y0 + item.box.y1) / 2;
    // in cell-size units, so "one cell over" costs the same on both axes
    const dx = (cx - (cell.x0 + cell.x1) / 2) / Math.max(0.01, cell.x1 - cell.x0);
    const dy = (cy - (cell.y0 + cell.y1) / 2) / Math.max(0.01, cell.y1 - cell.y0);
    const d = Math.hypot(dx, dy);
    return d <= MAX_DIST ? d : Infinity;
  };

  // dp[i][j]: min cost of aligning first i items with first j cells
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(Infinity));
  const from: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  dp[0][0] = 0;
  for (let j = 1; j <= m; j++) {
    dp[0][j] = dp[0][j - 1] + SKIP_CELL;
    from[0][j] = 1; // skipped cell
  }
  for (let i = 1; i <= n; i++) {
    dp[i][0] = dp[i - 1][0] + SKIP_ITEM;
    from[i][0] = 2; // dropped item
    for (let j = 1; j <= m; j++) {
      const skipCell = dp[i][j - 1] + SKIP_CELL;
      const dropItem = dp[i - 1][j] + SKIP_ITEM;
      const match = dp[i - 1][j - 1] + dist(items[i - 1], cells[j - 1]);
      dp[i][j] = Math.min(skipCell, dropItem, match);
      from[i][j] = dp[i][j] === match ? 3 : dp[i][j] === skipCell ? 1 : 2;
    }
  }

  const chosen: (BoundingBox | null)[] = items.map(() => null);
  let matched = 0;
  let distSum = 0;
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const move = from[i][j];
    if (move === 3) {
      chosen[i - 1] = cells[j - 1];
      matched++;
      distSum += dist(items[i - 1], cells[j - 1]);
      i--;
      j--;
    } else if (move === 1) {
      j--;
    } else {
      i--;
    }
  }
  return { chosen, matched, meanDist: matched > 0 ? distSum / matched : Infinity };
}

/** Full cell list from the layout pass: pixel rows × per-strip columns. */
async function cellsFromLayout(buffer: Buffer, layoutRows: LayoutRow[]): Promise<BoundingBox[] | null> {
  const panel = await detectContentPanel(buffer).catch(() => null);
  const x0 = panel?.x0 ?? 0.03;
  const x1 = panel?.x1 ?? 0.97;

  // pixel row bands are precise and stable; the model's rows are the fallback
  let rows: LayoutRow[] | null = null;
  if (panel) {
    const profiles = await panelProfiles(buffer, panel).catch(() => null);
    const bands = profiles ? bandsFromProfile(profiles.rowFraction, panel.y0, panel.y1) : null;
    if (bands && bands.length >= 2) {
      rows = bands.map(([a, b], i) => ({
        y0: a,
        y1: b,
        // the model's per-row counts only line up when it saw the same rows
        cards: bands.length === layoutRows.length ? layoutRows[i].cards : 0,
      }));
    }
  }
  if (!rows) rows = layoutRows;

  const cells: BoundingBox[] = [];
  for (const row of rows) {
    const strip: BoundingBox = { x0, y0: row.y0, x1, y1: row.y1 };
    let colBands = await detectStripColumns(buffer, strip).catch(() => null);
    if (!colBands && row.cards > 0) colBands = uniformBands(x0, x1, row.cards);
    if (!colBands) continue;
    for (const x of colBands) cells.push({ x0: x[0], y0: row.y0, x1: x[1], y1: row.y1 });
  }
  return cells.length > 0 ? cells : null;
}

/** Cell list from the legacy whole-page grid detectors. */
async function legacyCells(buffer: Buffer): Promise<BoundingBox[] | null> {
  const panel = await detectContentPanel(buffer).catch(() => null);
  let bands = panel ? await detectGridBands(buffer, panel).catch(() => null) : null;
  if (!bands) bands = await detectPageCardBands(buffer, panel).catch(() => null);
  if (!bands) return null;
  const cells: BoundingBox[] = [];
  for (const y of bands.rowBands) {
    for (const x of bands.colBands) cells.push({ x0: x[0], y0: y[0], x1: x[1], y1: y[1] });
  }
  return cells;
}

/**
 * The product PHOTO inside a card cell — the crop centers on it and ignores
 * the text, exactly like a product shot. The photo is the connected
 * component with the best area × color-diversity score: price bubbles are
 * big but near-monochrome, text lines are small, photos are large and
 * colorful. Returns null when nothing photo-like is found (crop stays the
 * whole cell).
 */
async function refineCellToPhoto(buffer: Buffer, cell: BoundingBox): Promise<BoundingBox | null> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) return null;

  // pad the cell slightly so a marginally-off cell still contains the photo
  const padX = (cell.x1 - cell.x0) * 0.05;
  const padY = (cell.y1 - cell.y0) * 0.05;
  const area = {
    x0: Math.max(0, cell.x0 - padX),
    y0: Math.max(0, cell.y0 - padY),
    x1: Math.min(1, cell.x1 + padX),
    y1: Math.min(1, cell.y1 + padY),
  };
  const region = {
    left: Math.round(area.x0 * meta.width),
    top: Math.round(area.y0 * meta.height),
    width: Math.max(24, Math.round((area.x1 - area.x0) * meta.width)),
    height: Math.max(24, Math.round((area.y1 - area.y0) * meta.height)),
  };
  const W = 140;
  const H = Math.max(48, Math.min(420, Math.round((region.height / region.width) * W)));
  const { data } = await sharp(buffer)
    .extract(region)
    .resize(W, H, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channel = (x: number, y: number, c: number) => data[(y * W + x) * 3 + c];
  // card background from the border ring of the cell
  const ring = Math.max(2, Math.round(Math.min(W, H) * 0.05));
  const bgSamples: number[][] = [[], [], []];
  for (let x = 0; x < W; x++) {
    for (const y of [ring, H - 1 - ring]) {
      for (let c = 0; c < 3; c++) bgSamples[c].push(channel(x, y, c));
    }
  }
  for (let y = 0; y < H; y++) {
    for (const x of [ring, W - 1 - ring]) {
      for (let c = 0; c < 3; c++) bgSamples[c].push(channel(x, y, c));
    }
  }
  const bg = bgSamples.map(median);
  let mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const diff =
        Math.abs(channel(x, y, 0) - bg[0]) +
        Math.abs(channel(x, y, 1) - bg[1]) +
        Math.abs(channel(x, y, 2) - bg[2]);
      if (diff > 55) mask[y * W + x] = 1;
    }
  }
  // one erosion pass: thin text strokes vanish, the photo body survives
  const eroded = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      if (mask[p] && mask[p - 1] && mask[p + 1] && mask[p - W] && mask[p + W]) eroded[p] = 1;
    }
  }
  mask = eroded;

  // connected components with a per-component color-diversity measure
  type Component = { minX: number; maxX: number; minY: number; maxY: number; area: number; colors: Set<number> };
  const seen = new Uint8Array(W * H);
  const components: Component[] = [];
  const stack: number[] = [];
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || seen[start]) continue;
    const comp: Component = { minX: W, maxX: 0, minY: H, maxY: 0, area: 0, colors: new Set() };
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0) {
      const p = stack.pop()!;
      const px = p % W;
      const py = (p / W) | 0;
      comp.area++;
      if (px < comp.minX) comp.minX = px;
      if (px > comp.maxX) comp.maxX = px;
      if (py < comp.minY) comp.minY = py;
      if (py > comp.maxY) comp.maxY = py;
      // 3 bits per channel — enough to tell a photo from a flat price bubble
      comp.colors.add(((channel(px, py, 0) >> 5) << 6) | ((channel(px, py, 1) >> 5) << 3) | (channel(px, py, 2) >> 5));
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= W * H || seen[q] || !mask[q]) continue;
        if ((q === p - 1 && px === 0) || (q === p + 1 && px === W - 1)) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    if (comp.area >= W * H * 0.03) components.push(comp);
  }
  if (components.length === 0) return null;

  const scoreOf = (c: Component) => c.area * Math.min(1, c.colors.size / 10);
  components.sort((a, b) => scoreOf(b) - scoreOf(a));
  const best = components[0];
  // too sliver-like to be a product photo
  if (best.maxX - best.minX < W * 0.18 || best.maxY - best.minY < H * 0.12) return null;

  // fold in fragments of the same photo (a bottle cap above its label) —
  // conservatively, so a neighbour's photo poking into the padded area
  // doesn't drag the crop sideways
  const reachX = W * 0.04;
  const reachY = H * 0.04;
  let { minX, maxX, minY, maxY } = best;
  for (const comp of components.slice(1)) {
    const overlapsX = comp.minX < maxX + reachX && comp.maxX > minX - reachX;
    const overlapsY = comp.minY < maxY + reachY && comp.maxY > minY - reachY;
    if (overlapsX && overlapsY && scoreOf(comp) > scoreOf(best) * 0.3) {
      minX = Math.min(minX, comp.minX);
      maxX = Math.max(maxX, comp.maxX);
      minY = Math.min(minY, comp.minY);
      maxY = Math.max(maxY, comp.maxY);
    }
  }

  // back to page coordinates, with breathing room, clamped to the CELL —
  // never past its edges even when the padded search area saw further
  const spanX = area.x1 - area.x0;
  const spanY = area.y1 - area.y0;
  const breathe = 0.05;
  return {
    x0: Math.max(cell.x0, area.x0 + (minX / W - breathe) * spanX),
    y0: Math.max(cell.y0, area.y0 + (minY / H - breathe) * spanY),
    x1: Math.min(cell.x1, area.x0 + (maxX / W + breathe) * spanX),
    y1: Math.min(cell.y1, area.y0 + (maxY / H + breathe) * spanY),
  };
}

function uniformBands(start: number, end: number, count: number): [number, number][] {
  const step = (end - start) / count;
  return Array.from({ length: count }, (_, i) => [start + i * step, start + (i + 1) * step]);
}

/** Column bands inside one horizontal strip, from its content profile. */
export async function detectStripColumns(buffer: Buffer, strip: BoundingBox): Promise<[number, number][] | null> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) return null;
  const region = {
    left: Math.round(strip.x0 * meta.width),
    top: Math.round(strip.y0 * meta.height),
    width: Math.max(24, Math.round((strip.x1 - strip.x0) * meta.width)),
    height: Math.max(24, Math.round((strip.y1 - strip.y0) * meta.height)),
  };
  const W = 240;
  const H = Math.max(24, Math.round((region.height / region.width) * W));
  const { data } = await sharp(buffer)
    .extract(region)
    .resize(W, H, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channel = (x: number, y: number, c: number) => data[(y * W + x) * 3 + c];
  const bg = [0, 1, 2].map((c) => {
    const values: number[] = [];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) values.push(channel(x, y, c));
    return median(values);
  });
  const isContent = (x: number, y: number) =>
    Math.abs(channel(x, y, 0) - bg[0]) + Math.abs(channel(x, y, 1) - bg[1]) + Math.abs(channel(x, y, 2) - bg[2]) > 60;

  const colFraction = smooth(
    Array.from({ length: W }, (_, x) => {
      let n = 0;
      for (let y = 0; y < H; y++) if (isContent(x, y)) n++;
      return n / H;
    }),
  );
  if (process.env.CROP_DEBUG) {
    const compress = colFraction
      .map((v) => (v > 0.5 ? "#" : v > 0.35 ? "*" : v > 0.2 ? "+" : v > 0.1 ? "." : " "))
      .join("");
    console.log(`[crop] strip y ${strip.y0.toFixed(2)}-${strip.y1.toFixed(2)} bg ${bg.join(",")}: ${compress}`);
  }
  const bands = bandsFromProfile(colFraction, strip.x0, strip.x1, 0.2, true);
  return bands ? splitWideBands(bands) : null;
}

/**
 * Two cards whose contents touch merge into one band about twice the typical
 * width — split multiples of the typical width back into equal parts. A page
 * with a genuinely double-width card fails the item-count cross-check
 * afterwards and falls back, so a wrong split never reaches a crop.
 */
function splitWideBands(bands: [number, number][]): [number, number][] {
  const typical = median(bands.map(([a, b]) => b - a));
  const out: [number, number][] = [];
  for (const [a, b] of bands) {
    const parts = Math.max(1, Math.round((b - a) / typical));
    const step = (b - a) / parts;
    for (let i = 0; i < parts; i++) out.push([a + i * step, a + (i + 1) * step]);
  }
  return out;
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
  // ring sampled slightly inset — exported fliers often carry a 1-3px white edge
  const inset = Math.max(2, Math.round(SIZE * 0.025));
  const borderSamples: number[][] = [[], [], []];
  for (let i = inset; i < SIZE - inset; i++) {
    for (const [x, y] of [[i, inset], [i, SIZE - 1 - inset], [inset, i], [SIZE - 1 - inset, i]] as const) {
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
 * Card-grid detection for pages where products sit on individual light cards
 * over a colored (often textured) page background — e.g. white cards on
 * orange. Lightness separates cards from any background texture; the bands
 * come from light-pixel profiles, with small outlier bands (logo strips,
 * footers) dropped rather than failing the page. Pages that are light all
 * over (no card structure) produce one giant band and are rejected.
 */
export async function detectPageCardBands(
  buffer: Buffer,
  panel: BoundingBox | null,
): Promise<GridBands | null> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) return null;

  // analyze inside the panel when one was detected, otherwise inset the page
  // edges — exported fliers often carry a white border that would read as cards
  const area = panel ?? { x0: 0.025, y0: 0.025, x1: 0.975, y1: 0.975 };
  const region = {
    left: Math.round(area.x0 * meta.width),
    top: Math.round(area.y0 * meta.height),
    width: Math.round((area.x1 - area.x0) * meta.width),
    height: Math.round((area.y1 - area.y0) * meta.height),
  };
  const W = 360;
  const H = Math.max(90, Math.round((region.height / region.width) * W));
  const { data } = await sharp(buffer)
    .extract(region)
    .resize(W, H, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // light-pixel mask: card backgrounds are near-white, page textures are not
  let mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      if (Math.min(data[i], data[i + 1], data[i + 2]) >= 200) mask[y * W + x] = 1;
    }
  }

  // erode twice: thin bridges between cards (JPEG halos, overhanging price
  // tags) disconnect while the cards themselves survive
  for (let pass = 0; pass < 2; pass++) {
    const eroded = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x;
        if (mask[p] && mask[p - 1] && mask[p + 1] && mask[p - W] && mask[p + W]) eroded[p] = 1;
      }
    }
    mask = eroded;
  }

  // connected components -> the cards themselves
  type Component = { minX: number; maxX: number; minY: number; maxY: number; area: number };
  const seen = new Uint8Array(W * H);
  const components: Component[] = [];
  const stack: number[] = [];
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || seen[start]) continue;
    const comp: Component = { minX: W, maxX: 0, minY: H, maxY: 0, area: 0 };
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0) {
      const p = stack.pop()!;
      const px = p % W;
      const py = (p / W) | 0;
      comp.area++;
      if (px < comp.minX) comp.minX = px;
      if (px > comp.maxX) comp.maxX = px;
      if (py < comp.minY) comp.minY = py;
      if (py > comp.maxY) comp.maxY = py;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= W * H || seen[q] || !mask[q]) continue;
        if ((q === p - 1 && px === 0) || (q === p + 1 && px === W - 1)) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    components.push(comp);
  }

  // keep card-sized components only
  const cards = components.filter(
    (c) =>
      c.area >= W * H * 0.015 &&
      c.maxX - c.minX >= W * 0.08 &&
      c.maxY - c.minY >= H * 0.06,
  );
  if (process.env.CROP_DEBUG) {
    console.log(
      `[crop] components: ${components.length}, card-sized: ${cards.length}`,
      cards
        .slice(0, 20)
        .map((c) => `(${c.minX}-${c.maxX},${c.minY}-${c.maxY},a${c.area})`)
        .join(" "),
    );
  }
  if (cards.length < 4 || cards.length > 60) return null;

  const rowClusters = clusterBands(cards.map((c) => [c.minY, c.maxY] as [number, number]), H);
  const colClusters = clusterBands(cards.map((c) => [c.minX, c.maxX] as [number, number]), W);
  if (!rowClusters || !colClusters) return null;
  if (rowClusters.length < 2 || rowClusters.length > 10 || colClusters.length < 2 || colClusters.length > 8) return null;

  const spanY = area.y1 - area.y0;
  const spanX = area.x1 - area.x0;
  return {
    rowBands: rowClusters.map(([a, b]) => [area.y0 + (a / H) * spanY, area.y0 + (b / H) * spanY] as [number, number]),
    colBands: colClusters.map(([a, b]) => [area.x0 + (a / W) * spanX, area.x0 + (b / W) * spanX] as [number, number]),
  };
}

/**
 * Groups card extents (e.g. [minY, maxY] of each card) into grid bands:
 * cluster by center, band = union of member extents, then neighbouring
 * bands split the gap between them.
 */
function clusterBands(extents: [number, number][], scale: number): [number, number][] | null {
  const sorted = [...extents].sort((a, b) => (a[0] + a[1]) / 2 - (b[0] + b[1]) / 2);
  const typical = median(sorted.map(([a, b]) => b - a));
  const clusters: [number, number][] = [];
  for (const [start, end] of sorted) {
    const current = clusters[clusters.length - 1];
    const center = (start + end) / 2;
    if (current && center - (current[0] + current[1]) / 2 < typical * 0.5) {
      current[0] = Math.min(current[0], start);
      current[1] = Math.max(current[1], end);
    } else {
      clusters.push([start, end]);
    }
  }
  // bands must not overlap and should be similar in size
  for (let i = 1; i < clusters.length; i++) {
    if (clusters[i][0] < clusters[i - 1][1] - typical * 0.2) return null;
  }
  const sizes = clusters.map(([a, b]) => b - a);
  if (Math.max(...sizes) > Math.min(...sizes) * 2.5) return null;

  // expand into half of each neighbouring gap (bounded by the scale)
  return clusters.map(([a, b], i) => {
    const from = i === 0 ? Math.max(0, a - typical * 0.05) : (clusters[i - 1][1] + a) / 2;
    const to =
      i === clusters.length - 1 ? Math.min(scale, b + typical * 0.05) : (b + clusters[i + 1][0]) / 2;
    return [from, to] as [number, number];
  });
}

/**
 * Row/column bands of a regular product grid inside the panel, found from
 * the content profile: product cards are humps, the gaps between them are
 * valleys. Returns null when the layout isn't a clean grid.
 */
export async function detectGridBands(buffer: Buffer, panel: BoundingBox): Promise<GridBands | null> {
  const profiles = await panelProfiles(buffer, panel);
  if (!profiles) return null;

  const rowBands = bandsFromProfile(profiles.rowFraction, panel.y0, panel.y1);
  const colBands = bandsFromProfile(profiles.colFraction, panel.x0, panel.x1);
  if (!rowBands || !colBands) return null;
  if (rowBands.length < 2 || rowBands.length > 10 || colBands.length < 2 || colBands.length > 8) return null;
  return { rowBands, colBands };
}

/** Content-fraction profiles of the panel: humps are cards, valleys are gaps. */
export async function panelProfiles(
  buffer: Buffer,
  panel: BoundingBox,
): Promise<{ rowFraction: number[]; colFraction: number[] } | null> {
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

  if (process.env.CROP_DEBUG) {
    const compress = (f: number[]) =>
      f.map((v) => (v > 0.5 ? "#" : v > 0.35 ? "*" : v > 0.2 ? "+" : v > 0.1 ? "." : " ")).join("");
    console.log("[crop] panel bg:", bg.join(","));
    console.log("[crop] panel rows:", compress(rowFraction));
    console.log("[crop] panel cols:", compress(colFraction));
  }

  return { rowFraction, colFraction };
}

/**
 * Humps in the content profile -> bands in page-normalized coordinates,
 * each expanded to the midpoint of its neighbouring valleys so the crop
 * keeps the text at the card edges.
 */
export function bandsFromProfile(
  fraction: number[],
  normStart: number,
  normEnd: number,
  // gaps can carry stray content (headers bridging columns) — stay above that
  threshold = 0.2,
  // between grid ROWS real small bands exist (discount-label strips), so
  // holes from dropping them are normal; between COLUMNS in one row there
  // is nothing, so a hole means a split card was dropped — reject those
  rejectHoles = false,
): [number, number][] | null {
  const n = fraction.length;
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

  // grid gaps can be as thin as 1px at this scale, so bridging noise specks
  // can also swallow real gaps — try unbridged first, then increasingly
  // bridged (narrow bottle necks dip below threshold and split their card,
  // e.g. 2-3px dips vs 7px+ real gaps)
  for (const bridge of [0, Math.max(1, n * 0.008), n * 0.02]) {
    const merged: [number, number][] = [];
    for (const run of runs) {
      const previous = merged[merged.length - 1];
      if (previous && run[0] - previous[1] <= bridge) previous[1] = run[1];
      else merged.push([...run] as [number, number]);
    }
    let bands = merged.filter(([a, b]) => b - a >= n * 0.04);
    if (process.env.CROP_DEBUG) {
      console.log(
        `[crop] profile n=${n} bridge=${bridge.toFixed(1)} runs=${runs.map(([a, b]) => `${a}-${b}`).join(",")} sized=${bands.map(([a, b]) => `${a}-${b}`).join(",")}`,
      );
    }
    if (bands.length === 0) continue;

    // headers/footers register as small bands — drop them instead of failing
    const sizeOf = ([a, b]: [number, number]) => b - a;
    const medianSize = median(bands.map(sizeOf));
    bands = bands.filter((band) => sizeOf(band) >= medianSize * 0.55);
    if (process.env.CROP_DEBUG) {
      console.log(
        `[crop]   medianFiltered=${bands.map(([a, b]) => `${a}-${b}`).join(",")} regularity=${bands.length ? (Math.max(...bands.map(sizeOf)) / Math.min(...bands.map(sizeOf))).toFixed(2) : "-"}`,
      );
    }
    if (bands.length < 2 || bands.length > 12) continue;

    if (
      rejectHoles &&
      bands.some((band, i) => i > 0 && band[0] - bands[i - 1][1] > medianSize * 0.6)
    )
      continue;

    // what remains must look like a regular grid
    const sizes = bands.map(sizeOf);
    if (Math.max(...sizes) > Math.min(...sizes) * 2.2) continue;

    const span = normEnd - normStart;
    return bands.map(([a, b], i) => {
      const from = i === 0 ? 0 : (bands[i - 1][1] + 1 + a) / 2;
      const to = i === bands.length - 1 ? n : (b + 1 + bands[i + 1][0]) / 2;
      return [normStart + (from / n) * span, normStart + (to / n) * span] as [number, number];
    });
  }
  return null;
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
