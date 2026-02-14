import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.google.com");
  await page.screenshot({
    path: path.join(process.cwd(), "test-screenshot.png"),
  });
  await browser.close();
  console.log("Success!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
