const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const output = '../portfolio-evidence/ui-behavior';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() =>
    localStorage.setItem('portfolio-reveal-v1', 'seen'),
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:4321/');
    await page.locator('[data-theme-toggle]').click();
    assert.equal(
      await page
        .locator('body')
        .evaluate((n) => getComputedStyle(n).backgroundColor),
      'rgb(25, 25, 24)',
    );
    assert.equal(
      await page
        .locator('meta[name="theme-color"]')
        .first()
        .getAttribute('content'),
      '#191918',
    );
    await page.screenshot({ path: `${output}/home-dark.png` });
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    for (const route of ['work/', 'blog/']) {
      await page.goto(`http://127.0.0.1:4321/${route}`);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-character-document]')?.dataset
            .gridPhase === 'idle',
      );
      assert.equal(
        await page
          .locator('[data-grid-host] canvas,[data-reveal-cover]')
          .count(),
        0,
      );
      // Use an actual blank margin, not a reading or navigation target.
      await page.mouse.click(32, 500);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-character-document]')?.dataset
            .destinationX === '32',
      );
      await page.waitForFunction(
        () =>
          document.querySelector('[data-character-document]')?.dataset
            .gridPhase === 'idle',
      );
      assert.equal(await page.locator('[data-grid-marker]').isVisible(), true);
      await page.screenshot({
        path: `${output}/${route.replace('/', '')}-dark.png`,
      });
      await page.getByRole('heading', { level: 1 }).click();
      assert.equal(
        await page
          .locator('[data-character-document]')
          .getAttribute('data-destination-x'),
        '32',
      );
      await page.getByRole('button', { name: 'Switch to light theme' }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.screenshot({
        path: `${output}/${route.replace('/', '')}-phone.png`,
      });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    }
    await page.getByRole('link', { name: 'Work', exact: true }).click();
    await page.waitForURL('**/work/');
    assert.deepEqual(errors, []);
    console.log(
      'PASS: dark Home/persistence; Work + Blog walking, text protection, native navigation, phone overflow; zero page errors',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
