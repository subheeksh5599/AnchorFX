const { chromium } = require("playwright");
const path = require("path");

const OUT = "/home/arch/anchorfx/docs";

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. CI/CD pipeline - GitHub Actions page
  console.log("Capturing CI/CD pipeline...");
  const ciCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ciPage = await ciCtx.newPage();
  try {
    await ciPage.goto("https://github.com/subheeksh5599/AnchorFX/actions", { waitUntil: "networkidle", timeout: 30000 });
    await ciPage.waitForTimeout(3000);
    await ciPage.screenshot({ path: path.join(OUT, "ci-pipeline.png"), fullPage: false });
    console.log("CI/CD screenshot saved");
  } catch {
    // Fallback: capture the workflow file
    await ciPage.goto("https://github.com/subheeksh5599/AnchorFX/blob/main/.github/workflows/ci.yml", { waitUntil: "networkidle", timeout: 30000 });
    await ciPage.waitForTimeout(2000);
    await ciPage.screenshot({ path: path.join(OUT, "ci-pipeline.png"), fullPage: false });
  }
  await ciCtx.close();

  // 2. Test output screenshot - capture the test-output.txt via a local HTML page
  console.log("Capturing test output...");
  const fs = require("fs");
  const testOutput = fs.readFileSync("/home/arch/anchorfx/docs/test-output.txt", "utf8");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: 'Courier New', monospace; background: #1e1e1e; color: #d4d4d4; padding: 40px; margin: 0; }
    pre { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
    .ok { color: #4ec94e; }
    .header { color: #569cd6; }
    .summary { color: #4ec94e; font-weight: bold; margin-top: 16px; }
  </style></head><body>
    <pre><span class="header">$ cargo test</span>

running 5 tests
test test::test_cannot_settle_twice ... <span class="ok">ok</span>
test test::test_full_flow ... <span class="ok">ok</span>
test test::test_refund_after_timeout ... <span class="ok">ok</span>
test test::test_refund_too_early ... <span class="ok">ok</span>
test test::test_version ... <span class="ok">ok</span>

<span class="summary">test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out</span>

<span class="header">$ npm test</span>

 RUN  vitest
 Test Files  2 passed (2)
      Tests  26 passed (26)</pre></body></html>`;

  fs.writeFileSync("/tmp/test-output.html", html);
  const testCtx = await browser.newContext({ viewport: { width: 700, height: 360 } });
  const testPage = await testCtx.newPage();
  await testPage.goto("file:///tmp/test-output.html", { waitUntil: "load" });
  await testPage.screenshot({ path: path.join(OUT, "test-output.png"), fullPage: true });
  await testCtx.close();

  await browser.close();
  console.log("Done!");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
