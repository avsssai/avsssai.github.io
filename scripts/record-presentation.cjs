const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const output =
    process.env.VERIFY_OUTPUT || '../portfolio-evidence/P05/recording';
  const base = process.env.BASE_URL || 'http://127.0.0.1:4331';
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: output, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(base);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]')?.dataset.revealState ===
      'complete',
  );
  await page.waitForTimeout(4100);
  await page.locator('[data-stack-target="react"]').click();
  await page.waitForTimeout(1600);
  await page.reload();
  await page.waitForTimeout(1400);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(4200);
  await page.locator('[data-stack-target="python"]').click();
  await page.waitForTimeout(1700);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(1700);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => localStorage.removeItem('portfolio-reveal-v1'));
  await page.route(/\/StackExperience\.[^/]+\.js/, async (route) => {
    await new Promise((r) => setTimeout(r, 6000));
    await route.abort();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-reveal-skip]').waitFor();
  await page.waitForTimeout(900);
  await page.locator('[data-reveal-skip]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.locator('.work-link').click();
  await page.waitForTimeout(1800);
  await page.goBack();
  await page.waitForTimeout(Math.max(1500, 34500 - (Date.now() - started)));
  const video = page.video();
  const wallMs = Date.now() - started;
  await context.close();
  await video.saveAs(path.join(output, 'review.webm'));
  fs.writeFileSync(
    path.join(output, 'recording.json'),
    JSON.stringify(
      {
        source: process.env.HEAD_SHA || 'working-tree',
        wallMs,
        scenes:
          'first-visit peel, selected static comic lettering, cartoon kick, repeat load, resized narrow static lettering, reduced motion, delayed scene keyboard skip, work navigation',
        note: 'Narrow segment is resized desktop, not touch hardware',
      },
      null,
      2,
    ),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
