const { chromium } = require("playwright");
const path = require("path");

const BASE = "https://frontend-ruby-tau-69.vercel.app";
const OUT = "/home/arch/anchorfx/docs/demo-video.webm";
const WIDTH = 1280;
const HEIGHT = 720;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });

  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: path.dirname(OUT),
      size: { width: WIDTH, height: HEIGHT },
    },
  });

  const page = await ctx.newPage();

  // ---- Scene 1: Landing Page (20s) ----
  console.log("Scene 1: Landing page...");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(3000);
  // Smooth scroll down to show sections
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "smooth" }));
  await sleep(3000);
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "smooth" }));
  await sleep(3000);
  await page.evaluate(() => window.scrollTo({ top: 2400, behavior: "smooth" }));
  await sleep(3000);
  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(2000);

  // ---- Scene 2: Open nav menu (10s) ----
  console.log("Scene 2: Nav menu...");
  // Click hamburger
  try {
    await page.click('button:has-text("Menu")');
    await sleep(2000);
  } catch { /* menu button might be different */ }
  // Hover over BUILD section to show links
  await sleep(3000);
  // Close menu
  try {
    await page.click('button:has-text("Close")');
    await sleep(1000);
  } catch { /* might already be closed */ }

  // ---- Scene 3: Wallet page (20s) ----
  console.log("Scene 3: Wallet page...");
  await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(3000);
  // Scroll to show connect buttons
  // The wallet page shows Freighter/xBull connect options

  // ---- Scene 4: Contract page (20s) ----
  console.log("Scene 4: Contract page...");
  await page.goto(`${BASE}/contract`, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(3000);
  // Scroll to show deploy section + event stream
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await sleep(4000);

  // ---- Scene 5: Back to landing footer (10s) ----
  console.log("Scene 5: Footer...");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await sleep(4000);

  await ctx.close();
  await browser.close();

  // Rename the recorded video
  const fs = require("fs");
  const dir = path.dirname(OUT);
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".webm") && f.startsWith("demo"));
  if (files.length > 0) {
    fs.renameSync(path.join(dir, files[0]), OUT);
  }
  console.log(`Video saved to ${OUT}`);
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
