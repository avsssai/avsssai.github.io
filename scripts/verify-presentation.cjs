const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4331';
const output = process.env.VERIFY_OUTPUT || '../portfolio-evidence/P05/live';
const hero = '[data-stack-experience]';
const selected = process.env.VERIFY_CASES?.split(',');
const sceneChunk = /\/StackExperience\.[^/]+\.js/;
async function opened(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]')?.dataset.revealState,
  );
}
async function dismissed(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-reveal-cover]'),
  );
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--enable-unsafe-swiftshader'],
  });
  const results = [];
  const errors = [];
  const run = async (name, options, action) => {
    if (selected && !selected.includes(name)) return;
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...options,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push({ name, message: e.message }));
    try {
      await action(page, context);
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: String(e) });
      await page.screenshot({ path: path.join(output, `${name}-failure.png`) });
    }
    await context.close();
  };
  await run('ready', {}, async (page) => {
    await opened(page);
    await dismissed(page);
    const data = await page
      .locator(hero)
      .evaluate((node) => ({ ...node.dataset }));
    assert.equal(data.revealState, 'complete');
    const duration =
      Number(data.revealDismissedMs) - Number(data.revealReadyMs);
    assert.ok(
      duration >= 1300 && duration <= 1800,
      `ready-to-dismiss ${duration}`,
    );
    assert.ok(
      Number(data.revealDismissedMs) - Number(data.revealStartedMs) <= 5000,
    );
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
    await page
      .getByRole('heading', {
        level: 1,
        name: 'Full stack web developer with an Imagination.',
      })
      .waitFor();
    await page.screenshot({ path: path.join(output, 'first-visit.png') });
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
  });
  await run('peel', {}, async (page) => {
    await opened(page);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-stack-experience]').dataset
          .revealState === 'revealing',
    );
    await page.locator('.reveal-paper').evaluate((node) =>
      node.getAnimations().forEach((a) => {
        a.pause();
        a.currentTime = 650;
      }),
    );
    await page.screenshot({ path: path.join(output, 'reveal.png') });
    await page.locator('[data-reveal-skip]').click();
    await dismissed(page);
  });
  await run('skip', {}, async (page) => {
    await page.route(sceneChunk, async (route) => {
      await new Promise((r) => setTimeout(r, 6000));
      await route.abort();
    });
    await opened(page);
    await page.locator('[data-reveal-skip]').focus();
    const ms = await page.locator('[data-reveal-skip]').evaluate((node) => {
      const t = performance.now();
      node.click();
      return performance.now() - t;
    });
    assert.ok(ms < 100);
    await dismissed(page);
    assert.equal(
      await page
        .locator('.work-link')
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.screenshot({ path: path.join(output, 'skip.png') });
  });
  await run('keyboard-skip', {}, async (page) => {
    await page.route(sceneChunk, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      await route.abort();
    });
    await opened(page);
    const skip = page.locator('[data-reveal-skip]');
    await skip.focus();
    await skip.press('Enter');
    await dismissed(page);
    assert.equal(
      await page
        .locator('.work-link')
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.locator('.work-link').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/work/');
  });
  await run('timeout', {}, async (page) => {
    await page.route(sceneChunk, async (route) => {
      await new Promise((r) => setTimeout(r, 7000));
      await route.abort();
    });
    await opened(page);
    await dismissed(page);
    const data = await page
      .locator(hero)
      .evaluate((node) => ({ ...node.dataset }));
    assert.equal(data.revealState, 'failed');
    assert.ok(
      Number(data.revealDismissedMs) - Number(data.revealStartedMs) <= 5000,
    );
    assert.equal(await page.locator('[role="progressbar"]').count(), 0);
    await page.screenshot({ path: path.join(output, 'timeout.png') });
  });
  await run('failure', {}, async (page) => {
    await page.addInitScript(() =>
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      }),
    );
    await page.route(sceneChunk, (route) => route.abort());
    await opened(page);
    await dismissed(page);
    assert.equal(
      await page.locator(hero).getAttribute('data-reveal-state'),
      'failed',
    );
    await page.screenshot({ path: path.join(output, 'failure.png') });
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
  });
  await run('repeat', {}, async (page) => {
    await opened(page);
    await dismissed(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-stack-experience]')?.dataset
          .revealState === 'complete',
    );
    assert.equal(await page.locator('[data-reveal-cover]').count(), 0);
    assert.equal(
      await page.locator(hero).getAttribute('data-reveal-started-ms'),
      null,
    );
    await page.screenshot({ path: path.join(output, 'repeat.png') });
  });
  await run('letters', {}, async (page) => {
    await opened(page);
    await dismissed(page);
    await page.evaluate(() => document.fonts.ready);
    const before = await page.locator('h1').boundingBox();
    const glyphs = page.locator('[data-letter-effect]');
    for (let i = 0; i < (await glyphs.count()); i++) {
      const box = await glyphs.nth(i).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForFunction(
        () =>
          !!document.querySelector('[data-stack-experience]').dataset
            .letterActive,
      );
      if (i === 2) {
        await page.locator('[data-letter-decoration]').evaluate((node) =>
          node.getAnimations({ subtree: true }).forEach((a) => {
            a.pause();
            a.currentTime = 200;
          }),
        );
        await page.screenshot({ path: path.join(output, 'letters.png') });
        await page
          .locator('[data-letter-decoration]')
          .evaluate((node) =>
            node.getAnimations({ subtree: true }).forEach((a) => a.play()),
          );
      }
      await page.waitForTimeout(520);
    }
    assert.deepEqual(await page.locator('h1').boundingBox(), before);
    assert.equal(await page.locator('h1 [tabindex], h1 button').count(), 0);
    await page.locator('[data-letter-demo]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-letter-demo]')
          .getAttribute('aria-pressed') === 'true',
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-letter-demo]')
          .getAttribute('aria-pressed') === 'false',
    );
    assert.equal(
      await page
        .locator('[data-letter-demo]')
        .evaluate((node) => node === document.activeElement),
      true,
    );
    assert.equal(
      await page
        .locator('[data-letter-decoration]')
        .evaluate((node) => node.getAnimations({ subtree: true }).length),
      0,
    );
  });
  await run(
    'touch',
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    async (page) => {
      await opened(page);
      await dismissed(page);
      await page.locator('[data-letter-demo]').tap();
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(output, 'mobile.png') });
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-letter-demo]')
            .getAttribute('aria-pressed') === 'false',
      );
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        await page.waitForTimeout(100);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        const demo = await page.locator('[data-letter-demo]').boundingBox();
        const work = await page.locator('.work-link').boundingBox();
        assert.ok(demo.y >= work.y + work.height);
      }
    },
  );
  await run('reduced', { reducedMotion: 'reduce' }, async (page) => {
    await opened(page);
    await dismissed(page);
    assert.equal(await page.locator('canvas').count(), 0);
    assert.equal(await page.locator('[data-letter-demo]').isDisabled(), true);
    assert.equal(
      await page
        .locator('[data-letter-decoration]')
        .evaluate((node) => node.getAnimations({ subtree: true }).length),
      0,
    );
    await page.screenshot({ path: path.join(output, 'reduced.png') });
  });
  await run('no-js', { javaScriptEnabled: false }, async (page) => {
    await page.goto(base);
    assert.equal(await page.locator('[data-reveal-cover]').count(), 0);
    await page
      .getByRole('heading', {
        level: 1,
        name: 'Full stack web developer with an Imagination.',
      })
      .waitFor();
    assert.equal(await page.locator('[data-letter-demo]').isVisible(), false);
    await page.screenshot({ path: path.join(output, 'no-js.png') });
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
  });
  await run('lifecycle', {}, async (page) => {
    await opened(page);
    await dismissed(page);
    await page.locator('[data-letter-demo]').click();
    await page.waitForTimeout(150);
    await page.evaluate(() =>
      document.dispatchEvent(new Event('astro:before-swap')),
    );
    assert.equal(
      await page
        .locator('[data-reveal-cover], [data-letter-effect], [data-avatar]')
        .count(),
      0,
    );
    await page.evaluate(() =>
      document.dispatchEvent(new Event('astro:page-load')),
    );
    await page.waitForFunction(
      () => document.querySelectorAll('[data-letter-effect]').length === 6,
    );
    assert.equal(await page.locator('[data-reveal-cover]').count(), 0);
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
    await page.goBack();
    await page.waitForFunction(
      () => document.querySelectorAll('[data-letter-effect]').length === 6,
    );
    assert.equal(await page.locator('h1').count(), 1);
  });
  await browser.close();
  fs.writeFileSync(
    path.join(output, 'results.json'),
    JSON.stringify({ base, results, errors }, null, 2),
  );
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.ok(
    results.every((r) => r.pass),
    JSON.stringify(results),
  );
}
module.exports = { main };
if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
