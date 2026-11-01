const { chromium } = require('playwright');
const fs = require('node:fs');
const output =
  process.env.PERF_OUTPUT || '../portfolio-evidence/terrain-performance.json';
async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.addInitScript(() =>
      localStorage.setItem('portfolio-reveal-v1', 'seen'),
    );
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4331');
    await page.waitForSelector('[data-static-lettering="comic"] svg:visible');
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-stack-experience]')
          ?.getAttribute('data-stack-scene') === 'ready',
    );
    await page.waitForTimeout(600);
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const domBefore = await page.locator('*').count(),
      samples = [];
    for (const id of ['react', 'github']) {
      await page.locator(`[data-stack-target=${id}]`).click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-stack-experience]')
            ?.getAttribute('data-phase') === 'travel',
      );
      const delta = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const values = [];
            let last = performance.now();
            const tick = (now) => {
              values.push(now - last);
              last = now;
              if (
                document
                  .querySelector('[data-stack-experience]')
                  ?.getAttribute('data-phase') === 'idle'
              )
                resolve(values);
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );
      delta.sort((a, b) => a - b);
      samples.push({
        id,
        activationMs: Number(
          await page
            .locator('[data-stack-experience]')
            .getAttribute('data-activation-ms'),
        ),
        activeRAF_p95: delta[Math.floor(delta.length * 0.95)],
        samples: delta.length,
      });
    }
    const read = () =>
      page.evaluate(() => ({
        scene: document
          .querySelector('[data-stack-experience]')
          ?.getAttribute('data-stack-frames'),
      }));
    const idleBefore = await read();
    await page.waitForTimeout(1000);
    const result = {
      environment:
        'Local desktop Chrome, 1440x1000, 4x CPU; two-trip smoke, not GPU/field FPS or cold benchmark',
      samples,
      domBefore,
      domAfter: await page.locator('*').count(),
      idleBefore,
      idleAfter: await read(),
      retainedAnimations: await page.evaluate(
        () => document.getAnimations().length,
      ),
      canvasCount: await page.locator('canvas').count(),
      letterAnimations: await page
        .locator('[data-static-lettering]')
        .evaluate((n) => n.getAnimations({ subtree: true }).length),
    };
    fs.writeFileSync(output, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
