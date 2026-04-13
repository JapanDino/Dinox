/**
 * Renders build/icon.svg to build/icon.png (1024×1024) using Playwright,
 * then generates a multi-size ICO at build/icon.ico using png-to-ico.
 *
 * Usage: node scripts/generate-icon.js
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SVG_PATH = path.join(ROOT, "build", "icon.svg");
const PNG_PATH = path.join(ROOT, "build", "icon.png");
const PNG_256_PATH = path.join(ROOT, "build", "icon-256.png");
const ICO_PATH = path.join(ROOT, "build", "icon.ico");

async function main() {
  console.log("🎨 Rendering SVG → PNG with Playwright...");
  const svgContent = fs.readFileSync(SVG_PATH, "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set exact viewport
  await page.setViewportSize({ width: 1024, height: 1024 });

  // Load SVG directly in the page
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1024px; height: 1024px; background: transparent; overflow: hidden; }
  svg { display: block; }
</style>
</head>
<body>${svgContent}</body>
</html>`;

  await page.setContent(html);
  await page.screenshot({ path: PNG_PATH, clip: { x: 0, y: 0, width: 1024, height: 1024 }, omitBackground: true });
  await browser.close();

  console.log("✅ PNG saved:", PNG_PATH);

  // Also generate 256px version for ICO
  console.log("🔧 Generating 256px PNG for ICO...");
  // Use Playwright again for 256px
  const browser2 = await chromium.launch();
  const page2 = await browser2.newPage();
  await page2.setViewportSize({ width: 256, height: 256 });
  const html256 = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; }
  body { width: 256px; height: 256px; background: transparent; overflow: hidden; }
  svg { display: block; width: 256px; height: 256px; }
</style>
</head>
<body><svg width="256" height="256" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">${svgContent.replace(/<svg[^>]*>/, "").replace("</svg>", "")}</svg></body>
</html>`;
  await page2.setContent(html256);
  await page2.screenshot({ path: PNG_256_PATH, clip: { x: 0, y: 0, width: 256, height: 256 }, omitBackground: true });
  await browser2.close();

  console.log("✅ 256px PNG saved:", PNG_256_PATH);

  // Convert PNG to ICO
  console.log("📦 Converting to ICO...");
  execSync(`npx png-to-ico "${PNG_256_PATH}" > "${ICO_PATH}"`, { stdio: "inherit" });

  console.log("✅ ICO saved:", ICO_PATH);
  console.log("🎉 Done! Rebuild the app to apply the new icon.");
}

main().catch((e) => { console.error(e); process.exit(1); });
