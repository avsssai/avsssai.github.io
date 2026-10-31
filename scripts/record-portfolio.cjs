const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4327';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P02/recording';
const scenes = [
  { route: '/', theme: 'light' },
  { route: '/', theme: 'dark' },
  { route: '/work/', theme: 'dark' },
  { route: '/blog/', theme: 'dark' },
  { route: '/blog/starting-with-the-system/', theme: 'dark' },
  { route: '/', theme: 'light' },
];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    recordVideo: { dir: output, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const video = page.video();
  const started = Date.now();
  try {
    for (const scene of scenes) {
      await page.goto(baseURL + scene.route);
      await page.evaluate(() => document.fonts.ready);
      if (
        (await page.locator('html').getAttribute('data-theme')) !== scene.theme
      ) {
        await page.locator('[data-theme-toggle]').click();
      }
      await page.waitForTimeout(6000);
    }
  } finally {
    await context.close();
    await browser.close();
  }
  const file = path.join(output, 'walkthrough.webm');
  fs.copyFileSync(await video.path(), file);
  fs.writeFileSync(
    path.join(output, 'recording.json'),
    JSON.stringify(
      {
        baseURL,
        scenes,
        viewport: '1440x900',
        durationMs: Date.now() - started,
        browser: browser.version(),
        bytes: fs.statSync(file).size,
      },
      null,
      2,
    ),
  );
  console.log(file);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
