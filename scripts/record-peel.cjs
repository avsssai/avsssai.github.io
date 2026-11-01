const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const output =
    process.env.VERIFY_OUTPUT || '../portfolio-evidence/P05/corner-recording';
  const base = process.env.BASE_URL || 'http://127.0.0.1:4331';
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--enable-unsafe-swiftshader'],
  });
  const recordings = [];
  try {
    for (const [name, viewport] of [
      ['desktop', { width: 1440, height: 900 }],
      ['phone', { width: 390, height: 844 }],
    ]) {
      const context = await browser.newContext({
        viewport,
        recordVideo: { dir: output, size: viewport },
      });
      const page = await context.newPage();
      const started = Date.now();
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-peel-grip]').waitFor({ state: 'visible' });
      await page.waitForTimeout(900);
      const drag = async (x, y) => {
        const grip = await page.locator('[data-peel-grip]').boundingBox();
        await page.mouse.move(grip.x + 28, grip.y + 28);
        await page.mouse.down();
        for (let step = 1; step <= 60; step++) {
          await page.mouse.move(
            grip.x + 28 + ((x - grip.x - 28) * step) / 60,
            grip.y + 28 + ((y - grip.y - 28) * step) / 60,
          );
          await page.waitForTimeout(22);
        }
        await page.mouse.up();
      };
      await drag(viewport.width * 0.5, viewport.height * 0.4);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-stack-experience]').dataset
            .peelMotion === 'held',
      );
      await page.waitForTimeout(1700);
      await drag(viewport.width * 0.72, viewport.height * 0.23);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-stack-experience]').dataset
            .peelMotion === 'held',
      );
      await page.waitForTimeout(900);
      await drag(8, viewport.height - 12);
      await page.waitForFunction(
        () => !document.querySelector('[data-reveal-cover]'),
      );
      await page.waitForTimeout(900);
      const video = page.video();
      await context.close();
      await video.saveAs(path.join(output, `${name}.webm`));
      recordings.push({ name, viewport, wallMs: Date.now() - started });
    }
    fs.writeFileSync(
      path.join(output, 'recording.json'),
      JSON.stringify(
        {
          source: process.env.HEAD_SHA || 'local working-tree',
          base,
          recordings,
          scenes:
            'corner grab, slow diagonal drag, partial release and hold, re-grab and reverse, deliberate full pull and removal',
          note: 'Real browser mouse gestures at both viewport sizes, not physical touch hardware.',
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
