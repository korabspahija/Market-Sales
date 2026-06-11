/**
 * Accent-insensitive normalization for product search.
 * "Qumësht Viçi" -> "qumesht vici", so a query like "qumesht" matches "qumësht".
 */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function slugify(value: string): string {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
