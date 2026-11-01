const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, firefox } = require('playwright');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4331').replace(
  /\/$/,
  '',
);
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/p05-release-smoke';

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  for (const [engine, kind] of [
    [chromium, 'chromium'],
    [firefox, 'firefox'],
  ]) {
    const browser = await engine.launch({
      headless: true,
      ...(kind === 'chromium'
        ? {
            args: ['--enable-unsafe-swiftshader'],
            ...(process.platform === 'win32' ? { channel: 'chrome' } : {}),
          }
        : {}),
    });
    const run = async (name, options, action) => {
      const context = await browser.newContext({
          colorScheme: 'light',
          ...options,
        }),
        page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await action(page, context);
        assert.deepEqual(errors, []);
        results.push({
          name,
          engine: kind,
          version: browser.version(),
          pass: true,
        });
        console.log('PASS', kind, name);
      } catch (error) {
        await page
          .screenshot({
            path: path.join(output, `${kind}-${name}-failure.png`),
            fullPage: true,
          })
          .catch(() => {});
        results.push({
          name,
          engine: kind,
          pass: false,
          error: error.message,
          errors,
        });
        console.error('FAIL', kind, name, error.stack);
      } finally {
        await context.close();
      }
    };
    await run(
      'touch-and-theme',
      { viewport: { width: 390, height: 844 }, hasTouch: true },
      async (page, context) => {
        await page.goto(base);
        // First visit must either admit the interactive cover or explicitly fail
        // open; a browser without WebGL still has a usable native portfolio.
        await page.waitForFunction(
          () => {
            const root = document.querySelector('[data-stack-experience]');
            return (
              root?.getAttribute('data-reveal-state') === 'ready' ||
              root?.getAttribute('data-reveal-state') === 'complete' ||
              root?.getAttribute('data-reveal-state') === 'failed'
            );
          },
          {},
          { timeout: 12000 },
        );
        if (await page.locator('[data-reveal-skip]').count())
          await page.locator('[data-reveal-skip]').tap();
        await page.waitForFunction(
          () => !document.querySelector('[data-reveal-cover]'),
        );
        await page
          .getByRole('heading', {
            level: 1,
            name: 'Full stack web developer with an Imagination.',
          })
          .waitFor();
        assert.equal(
          await page
            .locator('[data-static-lettering] canvas, terrain-lettering')
            .count(),
          0,
        );
        assert.equal(
          await page
            .locator('meta[name="theme-color"]')
            .first()
            .getAttribute('content'),
          '#e5deed',
        );
        await page.locator('[data-theme-toggle]').tap();
        assert.equal(
          await page
            .locator('meta[name="theme-color"]')
            .first()
            .getAttribute('content'),
          '#282534',
        );
        await page.locator('[data-theme-toggle]').tap();
        await page.waitForFunction(
          () => {
            const root = document.querySelector('[data-stack-experience]');
            return (
              root?.getAttribute('data-stack-scene') === 'ready' ||
              root?.hasAttribute('data-stack-failure')
            );
          },
          {},
          { timeout: 12000 },
        );
        const before = Number(
          await page
            .locator('[data-stack-experience]')
            .getAttribute('data-interactions'),
        );
        const mode = await page
          .locator('[data-stack-experience]')
          .getAttribute('data-stack-scene');
        await page.locator('[data-stack-target="react"]').tap();
        assert.equal(
          await page
            .locator('[data-stack-target="react"]')
            .getAttribute('aria-pressed'),
          'true',
        );
        if (mode === 'ready')
          await page.waitForFunction(
            (before) =>
              Number(
                document
                  .querySelector('[data-stack-experience]')
                  ?.getAttribute('data-interactions'),
              ) ===
              before + 1,
            before,
            { timeout: 12000 },
          );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.screenshot({
          path: path.join(output, `${kind}-phone.png`),
          fullPage: true,
        });
        await page.getByRole('link', { name: 'Explore my work' }).tap();
        await page.waitForURL('**/work/');
        assert.equal(
          await page
            .locator('meta[name="theme-color"]')
            .first()
            .getAttribute('content'),
          '#f6f5f1',
        );
        await page.getByRole('heading', { level: 1, name: 'Work' }).waitFor();
        const response = await context.request.get(`${base}/rss.xml`);
        assert.equal(response.status(), 200);
        for (const url of [
          '/blog/',
          '/blog/starting-with-the-system/',
          '/game/',
        ]) {
          const response = await context.request.get(base + url);
          assert.equal(response.status(), 200, url);
        }
      },
    );
    await run(
      'keyboard-reduced',
      { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
      async (page) => {
        await page.goto(base);
        await page
          .getByRole('heading', {
            level: 1,
            name: 'Full stack web developer with an Imagination.',
          })
          .waitFor();
        assert.equal(await page.locator('[data-reveal-cover]').count(), 0);
        assert.equal(await page.locator('canvas').count(), 0);
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-stack-experience]')
              ?.getAttribute('data-phase') === 'idle',
        );
        await page.locator('[data-stack-target="react"]').focus();
        await page.keyboard.press('Enter');
        assert.equal(
          await page
            .locator('[data-stack-target="react"]')
            .getAttribute('aria-pressed'),
          'true',
        );
        assert.equal(
          await page
            .locator('[data-stack-experience]')
            .getAttribute('data-phase'),
          'idle',
        );
        await page.getByRole('link', { name: 'Explore my work' }).focus();
        await page.keyboard.press('Enter');
        await page.waitForURL('**/work/');
        await page.getByRole('heading', { level: 1, name: 'Work' }).waitFor();
      },
    );
    await run(
      'no-js',
      { viewport: { width: 320, height: 844 }, javaScriptEnabled: false },
      async (page) => {
        await page.goto(base);
        await page
          .getByRole('heading', {
            level: 1,
            name: 'Full stack web developer with an Imagination.',
          })
          .waitFor();
        assert.equal(await page.locator('canvas').count(), 0);
        assert.match(
          await page
            .locator('.imagination-hero')
            .evaluate((n) => getComputedStyle(n).backgroundImage),
          /paper-stage-phone-light\.svg/,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.getByRole('link', { name: 'Explore my work' }).click();
        await page.waitForURL('**/work/');
      },
    );
    await browser.close();
  }
  fs.writeFileSync(
    path.join(output, 'results.json'),
    JSON.stringify(results, null, 2),
  );
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
