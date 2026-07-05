/** Single place for contact details — info@ forwards via Cloudflare Email Routing. */
export const CONTACT_EMAIL = "info@aksione.com";
export const INSTAGRAM_URL = "https://www.instagram.com/aksione.kosova";
export const SITE_NAME = "Aksione";
/** primary domain — the apex redirects here */
export const SITE_URL = "https://www.aksione.com";

export function absoluteUrl(pathOrUrl: string): string {
  return pathOrUrl.startsWith("http") ? pathOrUrl : `${SITE_URL}${pathOrUrl}`;
}
