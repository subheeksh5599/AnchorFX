const { chromium } = require("playwright");
const path = require("path");

const BASE = "https://anchorfx.vercel.app";
const OUT = "/home/arch/anchorfx/docs";

const MOBILE = { width: 375, height: 812 }; // iPhone X

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile wallet page
  console.log("Capturing mobile wallet...");
  const walletCtx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 2 });
  const walletPage = await walletCtx.newPage();
  await walletPage.goto(`${BASE}/wallet`, { waitUntil: "networkidle", timeout: 30000 });
  await walletPage.waitForTimeout(2000);
  await walletPage.screenshot({ path: path.join(OUT, "mobile-wallet.png"), fullPage: false });
  await walletCtx.close();

  // 2. Mobile contract page
  console.log("Capturing mobile contract...");
  const contractCtx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 2 });
  const contractPage = await contractCtx.newPage();
  await contractPage.goto(`${BASE}/contract`, { waitUntil: "networkidle", timeout: 30000 });
  await contractPage.waitForTimeout(2000);
  await contractPage.screenshot({ path: path.join(OUT, "mobile-contract.png"), fullPage: false });
  await contractCtx.close();

  // 3. Desktop landing page (for general UI)
  console.log("Capturing desktop landing...");
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(OUT, "desktop-landing.png"), fullPage: false });
  await desktopCtx.close();

  await browser.close();
  console.log("Done! Screenshots saved to docs/");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
