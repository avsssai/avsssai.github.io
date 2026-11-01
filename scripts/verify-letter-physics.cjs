const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4333';
const out =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/letter-physics-final';
const root = '[data-grid-experience]';
async function staticHeadlines(page) {
  assert.equal(await page.locator('[data-physical-headlines]').count(), 0);
  assert.ok(
    (
      await page
        .locator('[data-headline-body]')
        .evaluateAll((nodes) => nodes.map((n) => n.style.transform))
    ).every((t) => !t),
  );
}
async function open(page, physical = true) {
  await page.addInitScript(() =>
    localStorage.setItem('portfolio-reveal-v1', 'seen'),
  );
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction((physical) => {
    const r = document.querySelector('[data-grid-experience]');
    return (
      r?.dataset.gridPhase === 'idle' &&
      (!physical || r.dataset.letterPhysics === 'ready')
    );
  }, physical);
}
async function idle(page, x, y) {
  await page.waitForFunction(
    ({ x, y }) => {
      const r = document.querySelector('[data-grid-experience]');
      return (
        r?.dataset.gridPhase === 'idle' &&
        Math.abs(Number(r.dataset.characterX) - x) < 1.1 &&
        Math.abs(Number(r.dataset.characterY) - y) < 1.1
      );
    },
    { x, y },
    { timeout: 12000 },
  );
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    ...(process.platform === 'win32' ? { channel: 'chrome' } : {}),
    args: ['--enable-unsafe-swiftshader'],
  });
  const results = [];
  const run = async (name, options, action) => {
    const recording =
      process.env.RECORD_PHYSICS === '1' && ['desktop', 'phone'].includes(name);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
      ...options,
      ...(recording
        ? {
            recordVideo: {
              dir: path.join(out, 'raw'),
              size: options.viewport || { width: 1440, height: 900 },
            },
          }
        : {}),
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await action(page);
      assert.deepEqual(errors, []);
      results.push({ name, pass: true });
      console.log('PASS', name);
    } catch (error) {
      results.push({ name, pass: false, error: error.stack, errors });
      console.error('FAIL', name, error.stack);
      await page
        .screenshot({ path: path.join(out, `${name}-failure.png`) })
        .catch(() => {});
    } finally {
      const video = page.video();
      await context.close();
      if (video) await video.saveAs(path.join(out, `${name}.webm`));
    }
  };
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['phone', { width: 390, height: 844 }],
  ])
    await run(
      name,
      { viewport, ...(name === 'phone' ? { hasTouch: true } : {}) },
      async (page) => {
        await open(page);
        assert.equal(
          await page
            .locator('[data-physical-letters] [data-letter-body]')
            .count(),
          12,
          'one shared physical SVG retains all twelve bodies across themes',
        );
        const visible =
          '[data-static-lettering="colour"] svg:visible [data-letter-body]';
        assert.equal(await page.locator(visible).count(), 12);
        const original = await page
          .locator(visible)
          .evaluateAll((nodes) =>
            nodes.map((n) => n.getAttribute('transform')),
          );
        assert.ok(original.every((t) => !t));
        const canvasCount = await page.locator('canvas').count();
        assert.equal(
          canvasCount,
          1,
          'physics must not create another WebGL context',
        );
        await page.waitForTimeout(350);
        assert.equal(
          await page.locator(root).getAttribute('data-letter-frames'),
          null,
          'no idle physics before contact',
        );
        await page.screenshot({ path: path.join(out, `${name}-before.png`) });
        // Observe actual collision updates while the walker is in flight, not an
        // arrival-triggered keyframe applied to the whole word.
        await page.locator(root).evaluate((node) => {
          new MutationObserver(() => {
            if (
              node.dataset.gridPhase === 'walking' &&
              Number(node.dataset.letterImpacts) > 0
            )
              node.dataset.contactDuringWalk = 'yes';
          }).observe(node, {
            attributes: true,
            attributeFilter: ['data-letter-impacts'],
          });
        });
        const boxes = await page.locator(visible).evaluateAll((nodes) =>
          nodes.map((n) => {
            const b = n.getBoundingClientRect();
            return { x: b.x, y: b.y, width: b.width, height: b.height };
          }),
        );
        const actorWidth = name === 'phone' ? 32 : 44,
          first = boxes[0],
          last = boxes[10];
        const x = Math.round(first.x + first.width / 2),
          y = Math.round(
            first.y + first.height / 2 + actorWidth * 1.25 * 0.45 + 3,
          );
        const click = async (x, y) =>
          name === 'phone'
            ? page.touchscreen.tap(x, y)
            : page.mouse.click(x, y);
        await click(x, y);
        await idle(page, x, y);
        assert.ok(
          Number(await page.locator(root).getAttribute('data-letter-moved')) >
            0,
        );
        await page.evaluate(
          () => (document.documentElement.dataset.theme = 'dark'),
        );
        assert.equal(
          await page.locator(visible).count(),
          12,
          'changing theme must not swap out the physical SVG',
        );
        const endX = Math.min(
            viewport.width - actorWidth / 2 - 9,
            Math.round(last.x + last.width + actorWidth),
          ),
          endY = y;
        await click(endX, endY);
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(out, `${name}-contact.png`) });
        await idle(page, endX, endY);
        await page.waitForFunction(
          () =>
            document.querySelector('[data-grid-experience]').dataset
              .letterMotion === 'sleeping',
          {},
          { timeout: 10000 },
        );
        assert.equal(
          await page.locator(root).getAttribute('data-contact-during-walk'),
          'yes',
        );
        const moved = Number(
          await page.locator(root).getAttribute('data-letter-moved'),
        );
        assert.ok(moved >= 2, 'neighbour collisions must propagate');
        assert.equal(await page.locator('canvas').count(), canvasCount);
        await page.screenshot({ path: path.join(out, `${name}-after.png`) });
        const frames = await page
          .locator(root)
          .getAttribute('data-letter-frames');
        await page.waitForTimeout(400);
        assert.equal(
          await page.locator(root).getAttribute('data-letter-frames'),
          frames,
          'sleep must stop the physics rAF',
        );
        await page
          .getByRole('button', { name: 'Reset headline and Imagination' })
          .focus();
        await page.keyboard.press('Enter');
        assert.equal(
          await page.locator(root).getAttribute('data-letter-moved'),
          '0',
        );
        assert.ok(
          (
            await page
              .locator(visible)
              .evaluateAll((nodes) =>
                nodes.map((n) => n.getAttribute('transform')),
              )
          ).every((t) => !t),
        );
        await page.screenshot({ path: path.join(out, `${name}-reset.png`) });
        await page.waitForTimeout(400);
        await page
          .getByRole('heading', {
            level: 1,
            name: 'Full stack web developer with an Imagination.',
          })
          .waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      },
    );
  await run(
    'reduced',
    { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
    async (page) => {
      await open(page, false);
      await page.waitForTimeout(200);
      await staticHeadlines(page);
      assert.equal(await page.locator('[data-physical-letters]').count(), 0);
      assert.equal(
        await page.locator('[data-reset-letters]').isVisible(),
        false,
      );
      await page.locator('[data-grid-controls]').focus();
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Enter');
      assert.equal(
        await page.locator(root).getAttribute('data-grid-phase'),
        'idle',
      );
      assert.equal(
        await page.locator(root).getAttribute('data-letter-frames'),
        null,
      );
      assert.equal(await page.locator('canvas').count(), 0);
    },
  );
  await run('import-failure', {}, async (page) => {
    await page.route(/\/letter-physics\.[^/]+\.js/, (route) => route.abort());
    await open(page, false);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-grid-experience]').dataset
          .letterPhysics === 'failed',
    );
    assert.equal(await page.locator('[data-physical-letters]').count(), 0);
    assert.equal(await page.locator('[data-reset-letters]').isVisible(), false);
    await staticHeadlines(page);
    await page.mouse.click(280, 700);
    await idle(page, 280, 700);
    await page.getByRole('link', { name: 'Explore my work' }).click();
    await page.waitForURL('**/work/');
  });
  await run('live-preference-and-lifecycle', {}, async (page) => {
    await open(page);
    await page.mouse.click(575, 560);
    await page.waitForFunction(
      () =>
        Number(
          document.querySelector('[data-grid-experience]').dataset
            .letterImpacts,
        ) > 0,
    );
    await page.locator('[data-grid-controls]').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    assert.equal(
      await page.locator(root).getAttribute('data-grid-phase'),
      'idle',
    );
    const impacts = await page
      .locator(root)
      .getAttribute('data-letter-impacts');
    await page.waitForTimeout(200);
    assert.equal(
      await page.locator(root).getAttribute('data-letter-impacts'),
      impacts,
      'instant keyboard placement must release the old contact collider',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-grid-experience]').dataset
          .letterPhysics === 'reduced',
    );
    assert.equal(await page.locator('[data-physical-letters]').count(), 0);
    await staticHeadlines(page);
    const frames = await page.locator(root).getAttribute('data-letter-frames');
    await page.waitForTimeout(200);
    assert.equal(
      await page.locator(root).getAttribute('data-letter-frames'),
      frames,
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-grid-experience]').dataset
          .letterPhysics === 'ready',
    );
    await page.mouse.click(575, 560);
    await page.waitForFunction(
      () =>
        Number(
          document.querySelector('[data-grid-experience]').dataset
            .letterImpacts,
        ) > 0,
    );
    // Synthetic lifecycle dispatch verifies our ownership/teardown contract;
    // this is not a claim of native BFCache or real background-tab coverage.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await page.locator('canvas,[data-grid-character]').count(), 0);
    assert.equal(await page.locator('[data-physical-letters]').count(), 0);
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.waitForFunction(
      () =>
        document.querySelector('[data-grid-experience]').dataset
          .letterPhysics === 'ready',
    );
    assert.equal(await page.locator('[data-grid-character]').count(), 1);
    assert.equal(await page.locator('canvas').count(), 1);
  });
  await browser.close();
  fs.writeFileSync(
    path.join(out, 'results.json'),
    JSON.stringify(results, null, 2),
  );
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
