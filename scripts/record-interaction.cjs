const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const output =
    process.env.VERIFY_OUTPUT || '../portfolio-evidence/P04/recording';
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: output, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4330');
  await page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]')?.dataset.stackScene ===
      'ready',
  );
  await page.waitForTimeout(2200);
  const ids = [
    'python',
    'react',
    'astro',
    'typescript',
    'github',
    'fastapi',
    'gcp',
  ];
  const moves = [];
  for (let i = 0; i < ids.length; i++) {
    await page
      .locator(`[data-stack-target="${ids[i]}"]`)
      .evaluate((node) => node.click());
    moves.push(
      await page.locator('[data-stack-experience]').getAttribute('data-move'),
    );
    await page.waitForTimeout(1500);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);
  for (const id of ['react', 'python', 'typescript', 'astro']) {
    await page
      .locator(`[data-stack-target="${id}"]`)
      .evaluate((node) => node.click());
    moves.push(
      await page.locator('[data-stack-experience]').getAttribute('data-move'),
    );
    await page.waitForTimeout(1700);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-stack-target="react"]').click();
  await page.waitForTimeout(3300);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]')?.dataset.stackScene ===
      'ready',
  );
  await page
    .locator('canvas')
    .evaluate((canvas) =>
      canvas
        .getContext('webgl2')
        .getExtension('WEBGL_lose_context')
        .loseContext(),
    );
  await page.waitForTimeout(Math.max(3000, 33500 - (Date.now() - started)));
  const video = page.video();
  const wallMs = Date.now() - started;
  await context.close();
  await video.saveAs(path.join(output, 'review.webm'));
  fs.writeFileSync(
    path.join(output, 'recording.json'),
    JSON.stringify(
      {
        wallMs,
        moves,
        selection:
          'natural random choice per activation; desktop, narrow viewport, reduced motion and context-loss fallback',
        source: process.env.HEAD_SHA || 'working-tree',
        encodedDuration: 'inspect separately',
      },
      null,
      2,
    ),
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
