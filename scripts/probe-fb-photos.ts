// Dev probe: does the /photo/?fbid= URL form render logged-out where
// photo.php?set=pb... login-walls? Two page visits, minimal footprint.
import { chromium } from "playwright-core";

async function biggest(page: import("playwright-core").Page): Promise<string> {
  await page.waitForTimeout(2_500);
  await page.keyboard.press("Escape").catch(() => {});
  return (await page.evaluate(`(() => {
    const imgs = [...document.querySelectorAll("img")]
      .filter((img) => img.src.includes("scontent"));
    imgs.sort((a, b) => (b.naturalWidth || 0) - (a.naturalWidth || 0));
    return imgs[0] ? imgs[0].naturalWidth + "px " + imgs[0].src.slice(0, 90) : "none";
  })()`)) as string;
}

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ locale: "sq-AL", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto("https://www.facebook.com/RrjetiMeridianExpress/photos", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForTimeout(3_000);
  const fbid = (await page.evaluate(`(() => {
    for (const a of document.querySelectorAll('a[href*="photo.php"]')) {
      const m = a.href.match(/fbid=(\\d+)/);
      if (m) return m[1];
    }
    return null;
  })()`)) as string | null;
  console.log("probing fbid:", fbid);
  if (!fbid) return browser.close();

  await page.goto(`https://www.facebook.com/photo.php?fbid=${fbid}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  console.log("photo.php form :", await biggest(page));

  await page.goto(`https://www.facebook.com/photo/?fbid=${fbid}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  console.log("/photo/ form   :", await biggest(page));

  await browser.close();
}
main();
