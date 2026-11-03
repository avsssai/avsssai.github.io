const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/grid-onboarding';
const root = '[data-grid-experience]';

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    ...(process.platform === 'win32' ? { channel: 'chrome' } : {}),
    args: ['--enable-unsafe-swiftshader'],
  });
  const results = [];
  async function run(name, options, action) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...options,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(12000);
    try {
      await action(page);
      assert.deepEqual(errors, []);
      results.push({ name, pass: true });
      console.log('PASS', name);
    } catch (error) {
      results.push({ name, pass: false, error: error.stack, errors });
      console.error('FAIL', name, error.stack);
      await page
        .screenshot({ path: path.join(output, `${name}-failure.png`) })
        .catch(() => {});
    } finally {
      await context.close();
    }
  }
  async function open(page, seen = true) {
    if (seen)
      await page.addInitScript(() =>
        localStorage.setItem('portfolio-reveal-v1', 'seen'),
      );
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
      () =>
        ['ready', 'fallback'].includes(
          document.querySelector('[data-grid-experience]')?.dataset
            .gridRenderer,
        ) || matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }
  async function arrived(page, point) {
    await page.waitForFunction(({ x, y }) => {
      const r = document.querySelector('[data-grid-experience]');
      return (
        r?.dataset.gridPhase === 'idle' &&
        Math.abs(Number(r.dataset.characterX) - x) < 1 &&
        Math.abs(Number(r.dataset.characterY) - y) < 1
      );
    }, point);
  }
  async function invitation(page, name) {
    const cue = page.locator('[data-grid-invitation]');
    await cue.waitFor({ state: 'visible' });
    assert.match(await cue.innerText(), /here!\s+i’ll follow\./);
    const box = await cue.boundingBox();
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= page.viewportSize().width,
      JSON.stringify(box),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.equal(
      await cue.evaluate((n) =>
        [
          ...document.querySelectorAll(
            'h1,.work-link,.site-header,.site-footer',
          ),
        ].some((other) => {
          const a = n.getBoundingClientRect(),
            b = other.getBoundingClientRect();
          return (
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
          );
        }),
      ),
      false,
      'invitation must not cover content',
    );
    await page.screenshot({
      path: path.join(output, `${name}-invitation.png`),
    });
    return cue.evaluate((n) => ({
      x: Number(n.dataset.destinationX),
      y: Number(n.dataset.destinationY),
    }));
  }
  for (const [name, width, height, touch] of [
    ['desktop', 1440, 900, false],
    ['phone', 390, 844, true],
    ['narrow', 320, 568, true],
  ]) {
    await run(
      `${name}-peel-and-play`,
      { viewport: { width, height }, hasTouch: touch },
      async (page) => {
        await open(page, false);
        const grip = page.locator('[data-peel-grip]');
        await grip.waitFor({ state: 'visible' });
        assert.equal(
          await page.locator('[data-grid-invitation]').isVisible(),
          false,
          'hide teaching cue beneath peel',
        );
        const box = await grip.boundingBox();
        const start = { x: box.x + box.width / 2, y: box.y + 36 };
        const diagonal = Math.hypot(width, height);
        const at = (p) => {
          const length = 51 + p * (diagonal * 0.94 - 51);
          return {
            x: start.x + width - (width / diagonal) * length - (width - 36),
            y: start.y + (height / diagonal) * length - 36,
          };
        };
        const cdp = touch
          ? await page.context().newCDPSession(page)
          : undefined;
        const beginPull = async () => {
          if (cdp)
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [start],
            });
          else {
            await page.mouse.move(start.x, start.y);
            await page.mouse.down();
          }
        };
        const pullTo = async (end, steps) => {
          if (!cdp) return page.mouse.move(end.x, end.y, { steps });
          for (let i = 1; i <= steps; i++) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [
                {
                  x: start.x + ((end.x - start.x) * i) / steps,
                  y: start.y + ((end.y - start.y) * i) / steps,
                },
              ],
            });
          }
        };
        const endPull = () =>
          cdp
            ? cdp.send('Input.dispatchTouchEvent', {
                type: 'touchEnd',
                touchPoints: [],
              })
            : page.mouse.up();
        await beginPull();
        await pullTo(at(0.55), 8);
        await page.waitForFunction(
          () =>
            Number(
              document.querySelector('[data-grid-experience]').dataset
                .peelProgress,
            ) > 50,
        );
        assert.equal(await page.locator('[data-reveal-cover]').count(), 1);
        await endPull();
        await page.waitForFunction(
          () =>
            Number(
              document.querySelector('[data-grid-experience]').dataset
                .peelProgress,
            ) < 0.1,
        );
        assert.equal(
          await page.locator('[data-reveal-cover]').count(),
          1,
          '55% release returns rather than leaving a half-open sheet',
        );
        await beginPull();
        await pullTo(at(0.62), 10);
        // Stay held: completion must not require a pointer-up or an edge pull.
        await page.waitForFunction(
          () => !document.querySelector('[data-reveal-cover]'),
          null,
          { timeout: 1500 },
        );
        await endPull();
        await cdp?.detach();
        assert.equal(await page.locator('.reveal-controls').count(), 0);
        assert.equal(
          await page.locator(root).getAttribute('data-destination-x'),
          null,
          'peel release must not accidentally move character',
        );
        const point = await invitation(page, name);
        if (touch) {
          assert.match(
            await page.locator('[data-grid-invitation]').innerText(),
            /tap here!/,
          );
          // Tap the marked square, not just its text label.
          await page.touchscreen.tap(point.x, point.y);
        } else await page.locator('[data-grid-invitation]').click();
        await arrived(page, point);
        assert.equal(
          await page.locator('[data-grid-invitation]').isVisible(),
          false,
        );
        await page
          .locator('[data-grid-first-arrival]')
          .waitFor({ state: 'visible' });
        assert.equal(
          await page.locator('[data-grid-first-arrival]').evaluate((n) => {
            const a = n.getBoundingClientRect();
            return [
              ...document.querySelectorAll(
                'h1,.work-link,.site-header,.site-footer',
              ),
            ].some((other) => {
              const b = other.getBoundingClientRect();
              return (
                a.left < b.right &&
                a.right > b.left &&
                a.top < b.bottom &&
                a.bottom > b.top
              );
            });
          }),
          false,
          'first-arrival feedback must not be clipped by header or cover copy',
        );
        await page.screenshot({
          path: path.join(output, `${name}-first-arrival.png`),
        });
        await page
          .locator('[data-grid-first-arrival]')
          .waitFor({ state: 'hidden' });
        await page.reload();
        await page.waitForTimeout(500);
        assert.equal(await page.locator('[data-reveal-cover]').count(), 0);
        assert.equal(
          await page.locator('[data-grid-invitation]').isVisible(),
          false,
          'teach once after a successful movement',
        );
        await page.getByRole('link', { name: 'Explore my work' }).click();
        await page.waitForURL('**/work/');
      },
    );
  }
  await run(
    'keyboard-reduced',
    { viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' },
    async (page) => {
      await open(page, false);
      assert.equal(await page.locator('canvas,[data-reveal-cover]').count(), 0);
      const point = await invitation(page, 'reduced');
      await page.locator('[data-grid-invitation]').focus();
      await page.keyboard.press('Enter');
      await arrived(page, point);
      assert.equal(
        await page
          .locator('[data-grid-controls]')
          .evaluate((n) => n === document.activeElement),
        true,
      );
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      assert.equal(
        await page.locator(root).getAttribute('data-grid-phase'),
        'idle',
      );
    },
  );
  await run('keyboard-peel', {}, async (page) => {
    await open(page, false);
    await page.locator('[data-peel-grip]').waitFor({ state: 'visible' });
    await page.locator('[data-peel-grip]').focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-reveal-cover]').count(), 0);
    assert.equal(
      await page
        .getByRole('link', { name: 'Explore my work' })
        .evaluate((n) => document.activeElement === n),
      true,
    );
  });
  await run('dark', {}, async (page) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await open(page);
    // Set via the real control if a stored theme key changes in the future.
    if ((await page.locator('html').getAttribute('data-theme')) !== 'dark')
      await page.getByRole('button', { name: /dark/i }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    const point = await invitation(page, 'dark');
    await page.locator('[data-grid-invitation]').click();
    await arrived(page, point);
  });
  await browser.close();
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
