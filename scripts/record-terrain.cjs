const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const output =
    process.env.VERIFY_OUTPUT || '../portfolio-evidence/terrain-recording';
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-unsafe-swiftshader'],
  });
  const recordings = [];
  try {
    for (const [name, viewport, targets] of [
      ['desktop', { width: 1280, height: 800 }, ['react', 'github', 'fastapi']],
      ['phone', { width: 390, height: 844 }, ['react', 'typescript']],
    ]) {
      if (process.env.RECORD_VIEW && process.env.RECORD_VIEW !== name) continue;
      const context = await browser.newContext({
        viewport,
        recordVideo: { dir: output, size: viewport },
      });
      await context.addInitScript(() =>
        localStorage.setItem('portfolio-reveal-v1', 'seen'),
      );
      const page = await context.newPage();
      const errors = [],
        events = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const started = Date.now();
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4331');
      await page.waitForSelector('[data-static-lettering="comic"] svg:visible');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-stack-experience]')
            ?.getAttribute('data-stack-scene') === 'ready',
      );
      events.push({ kind: 'ready', ms: Date.now() - started });
      await page.waitForTimeout(2200);
      await page.screenshot({
        path: path.join(output, `${name}.png`),
        fullPage: true,
      });
      for (let i = 0; i < targets.length; i++) {
        if (i === targets.length - 1) {
          await page.locator('[data-theme-toggle]').click();
          events.push({ kind: 'dark', ms: Date.now() - started });
          await page.waitForTimeout(1600);
          await page.screenshot({
            path: path.join(output, `${name}-dark.png`),
            fullPage: true,
          });
        }
        const id = targets[i];
        await page.locator(`[data-stack-target="${id}"]`).hover();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-stack-experience]')
              ?.getAttribute('data-phase') === 'travel',
        );
        events.push({ kind: 'outbound', id, ms: Date.now() - started });
        await page.waitForTimeout(650);
        if (i === 0)
          await page.screenshot({
            path: path.join(output, `${name}-walking.png`),
            fullPage: true,
          });
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-stack-experience]')
              ?.getAttribute('data-phase') === 'return',
        );
        events.push({ kind: 'return', id, ms: Date.now() - started });
        await page.waitForTimeout(650);
        if (i === 0)
          await page.screenshot({
            path: path.join(output, `${name}-return.png`),
            fullPage: true,
          });
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-stack-experience]')
              ?.getAttribute('data-phase') === 'idle',
        );
        events.push({ kind: 'home', id, ms: Date.now() - started });
        await page.mouse.move(viewport.width / 2, viewport.height - 20);
        await page.waitForTimeout(1000);
      }
      await page.waitForTimeout(1500);
      const video = page.video();
      await context.close();
      const file = path.join(output, `${name}.webm`);
      await video.saveAs(file);
      recordings.push({
        name,
        viewport,
        events,
        errors,
        bytes: fs.statSync(file).size,
        wallMs: Date.now() - started,
      });
      if (errors.length) throw new Error(errors.join('\n'));
    }
    fs.writeFileSync(
      path.join(output, 'recording.json'),
      JSON.stringify(
        {
          source:
            'Local uncommitted P05 terrain/walking/surface prototype above checkpoint a2aa474; desktop Chrome, phone viewport is not physical touch hardware; no audio',
          recordings,
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
