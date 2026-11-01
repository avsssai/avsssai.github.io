const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P05/lettering';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const results = [],
    errors = [];
  for (const variant of ['sculpted', 'objects', 'comic']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.addInitScript(() =>
      localStorage.setItem('portfolio-reveal-v1', 'seen'),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:4331/lab/lettering/${variant}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-stack-experience]').dataset.stackScene ===
        'ready',
    );
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(output, `${variant}-desktop.png`),
    });
    const light = page.locator('[data-static-lettering] .light-art svg');
    await light.screenshot({
      path: path.join(output, `${variant}-detail.png`),
    });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(350);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${variant}/${width} overflow`,
      );
      await page
        .getByRole('heading', {
          level: 1,
          name: 'Full stack web developer with an Imagination.',
        })
        .waitFor();
      assert.equal(
        await page.locator('[data-letter-demo], [data-letter-effect]').count(),
        0,
      );
      assert.equal(
        await page
          .locator('[data-static-lettering]')
          .evaluate((node) => node.getAnimations({ subtree: true }).length),
        0,
      );
      if (width === 390)
        await page.screenshot({
          path: path.join(output, `${variant}-mobile.png`),
        });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-theme-toggle]').click();
    await page.waitForTimeout(150);
    assert.equal(
      await page.locator('[data-static-lettering] .dark-art svg').isVisible(),
      true,
    );
    await page.screenshot({ path: path.join(output, `${variant}-dark.png`) });
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
    await context.close();
    const staticContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const staticPage = await staticContext.newPage();
    await staticPage.goto(`http://127.0.0.1:4331/lab/lettering/${variant}/`);
    await staticPage
      .getByRole('heading', {
        level: 1,
        name: 'Full stack web developer with an Imagination.',
      })
      .waitFor();
    assert.equal(await staticPage.locator('[data-reveal-cover]').count(), 0);
    await staticPage.locator('.work-link').click();
    await staticPage.waitForURL('**/work/');
    await staticContext.close();
    results.push({
      variant,
      pass: true,
      sizes: [1440, 390, 320],
      checks: [
        'natural accessible heading',
        'no horizontal scroll',
        'static word, no demo/animations',
        'dark art',
        'native work navigation',
        'no-JS heading/navigation',
      ],
    });
  }
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1050 },
  });
  await page.goto('http://127.0.0.1:4331/lab/lettering/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(output, 'comparison.png'),
    fullPage: true,
  });
  await browser.close();
  fs.writeFileSync(
    path.join(output, 'results.json'),
    JSON.stringify({ results, errors }, null, 2),
  );
  assert.equal(errors.length, 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
