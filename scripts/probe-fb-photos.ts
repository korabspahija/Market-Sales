// Dev probe: what does the logged-out /photos tab expose?
import { chromium } from "playwright-core";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ locale: "sq-AL", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto("https://www.facebook.com/RrjetiMeridianExpress/photos", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForTimeout(4_000);
  await page.keyboard.press("Escape").catch(() => {});
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(1_500);
  }
  const data = (await page.evaluate(`(() => {
    const anchors = [...document.querySelectorAll('a[href*="photo"]')].slice(0, 20).map((a) => a.href);
    const imgs = [...document.querySelectorAll("img")]
      .filter((img) => img.src.includes("scontent"))
      .slice(0, 20)
      .map((img) => img.src.slice(0, 130));
    return { title: document.title, anchors, imgCount: imgs.length, imgs: imgs.slice(0, 6) };
  })()`)) as { title: string; anchors: string[]; imgCount: number; imgs: string[] };
  console.log("title:", data.title);
  console.log("photo anchors:", data.anchors.length);
  for (const a of data.anchors.slice(0, 8)) console.log(" ", a.slice(0, 120));
  console.log("scontent imgs:", data.imgCount);
  for (const s of data.imgs) console.log(" ", s);
  await browser.close();
}
main();
