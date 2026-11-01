const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4331';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P05/corner-live';
const selected = process.env.VERIFY_CASES?.split(',');
const hero = '[data-stack-experience]';
const rendererChunk = /\/peel-renderer\.[^/]+\.js/;
const sceneChunk = /\/StackExperience\.[^/]+\.js/;
async function opened(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]')?.dataset.revealState,
  );
}
async function ready(page) {
  await opened(page);
  await page.locator('[data-peel-grip]').waitFor({ state: 'visible' });
}
async function dismissed(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-reveal-cover]'),
  );
}
async function held(page) {
  await page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]').dataset.peelMotion ===
      'held',
  );
}
async function data(page) {
  return page.locator(hero).evaluate((node) => ({ ...node.dataset }));
}
async function mouseDrag(page, x, y) {
  const box = await page.locator('[data-peel-grip]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 30 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await held(page);
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--enable-unsafe-swiftshader'],
  });
  const results = [],
    errors = [];
  const run = async (name, options, action) => {
    if (selected && !selected.includes(name)) return;
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...options,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) =>
      errors.push({ name, message: error.message }),
    );
    try {
      await action(page, context);
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: String(error) });
      await page.screenshot({ path: path.join(output, `${name}-failure.png`) });
    } finally {
      await context.close();
    }
  };
  await run('ready', {}, async (page) => {
    await ready(page);
    assert.deepEqual(await page.locator('[data-reveal-cover]').boundingBox(), {
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
    });
    assert.equal(
      await page
        .locator('[data-reveal-cover]')
        .evaluate((node) => node.parentElement === document.body),
      true,
    );
    assert.equal((await data(page)).revealState, 'ready');
    assert.equal(await page.locator('[data-peel-grip]').textContent(), '');
    assert.equal(await page.locator('[data-peel-grip] .reveal-tab').count(), 1);
    const grip = await page.locator('[data-peel-grip]').boundingBox();
    assert.ok(
      grip.width >= 44 && grip.height >= 44,
      'tab retains a generous hit area',
    );
    await page.waitForTimeout(1600);
    assert.equal(
      await page
        .locator('.reveal-tab')
        .evaluate(
          (node) =>
            node
              .getAnimations()
              .filter((animation) => animation.playState === 'running').length,
        ),
      0,
      'tab sway does not loop',
    );
    assert.equal((await data(page)).revealState, 'ready', 'no automatic peel');
    await page.screenshot({ path: path.join(output, 'ready.png') });
    await page.locator('[data-reveal-skip]').click();
    await dismissed(page);
  });
  for (const [name, viewport] of [
    ['peel', { width: 1440, height: 900 }],
    ['peel-phone', { width: 390, height: 844 }],
    ['peel-small', { width: 320, height: 568 }],
    ['peel-dark', { width: 1440, height: 900 }],
  ]) {
    await run(name, { viewport }, async (page) => {
      if (name === 'peel-dark')
        await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
      await ready(page);
      await mouseDrag(page, viewport.width * 0.5, viewport.height * 0.4);
      const partial = await data(page);
      assert.ok(
        Number(partial.peelProgress) > 20 && Number(partial.peelProgress) < 85,
      );
      await page.screenshot({ path: path.join(output, `${name}-partial.png`) });
      await page.waitForTimeout(700);
      assert.equal(
        (await data(page)).peelFrames,
        partial.peelFrames,
        'no idle renderer loop',
      );
      assert.equal(
        (await data(page)).peelProgress,
        partial.peelProgress,
        'partial peel stays put',
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await mouseDrag(page, viewport.width * 0.72, viewport.height * 0.22);
      assert.ok(
        Number((await data(page)).peelProgress) < Number(partial.peelProgress),
        'can lay it back down',
      );
      await page.screenshot({ path: path.join(output, `${name}-reverse.png`) });
      await page.locator('[data-reveal-skip]').click();
      await dismissed(page);
      assert.equal(await page.locator('[data-reveal-cover] canvas').count(), 0);
    });
  }
  await run('hold', {}, async (page) => {
    await ready(page);
    await mouseDrag(page, 750, 340);
    const partial = await data(page);
    await page.waitForTimeout(8500);
    assert.equal(
      await page.locator('[data-reveal-cover]').isVisible(),
      true,
      'old absolute cap must not dismiss an interactive partial peel',
    );
    assert.equal((await data(page)).peelProgress, partial.peelProgress);
    assert.equal((await data(page)).peelFrames, partial.peelFrames);
    await mouseDrag(page, 560, 510);
    assert.ok(
      Number((await data(page)).peelProgress) > Number(partial.peelProgress),
      'resume from held position',
    );
  });
  await run(
    'touch',
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    async (page, context) => {
      await ready(page);
      const cdp = await context.newCDPSession(page);
      const box = await page.locator('[data-peel-grip]').boundingBox();
      const x = box.x + 28,
        y = box.y + 28;
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 25; i++)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            { x: x + ((190 - x) * i) / 25, y: y + ((330 - y) * i) / 25 },
          ],
        });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await held(page);
      assert.ok(Number((await data(page)).peelProgress) > 25);
      assert.equal(
        await page.evaluate(() => scrollY),
        0,
        'corner touch does not scroll the document',
      );
      await page.screenshot({ path: path.join(output, 'touch-partial.png') });
      const partial = Number((await data(page)).peelProgress);
      const again = await page.locator('[data-peel-grip]').boundingBox();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: again.x + 28, y: again.y + 28 }],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 155, y: 410 }],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchCancel',
        touchPoints: [],
      });
      await held(page);
      assert.ok(
        Number((await data(page)).peelProgress) > partial,
        'cancelled touch retains the partial position',
      );
    },
  );
  await run('covered-link', {}, async (page) => {
    await ready(page);
    const link = await page
      .getByRole('link', { name: 'Work', exact: true })
      .boundingBox();
    await page.mouse.click(link.x + link.width / 2, link.y + link.height / 2);
    await held(page);
    assert.equal(
      new URL(page.url()).pathname,
      '/',
      'covered links must not activate invisibly',
    );
    assert.equal(await page.locator('[data-reveal-cover]').count(), 1);
  });
  await run('live-link', {}, async (page) => {
    await ready(page);
    await mouseDrag(page, 720, 360);
    await page.getByRole('link', { name: 'Work', exact: true }).click();
    await page.waitForURL('**/work/');
  });
  await run('complete', {}, async (page) => {
    await ready(page);
    const box = await page.locator('[data-peel-grip]').boundingBox();
    await page.mouse.move(box.x + 28, box.y + 28);
    await page.mouse.down();
    await page.mouse.move(10, 885, { steps: 50 });
    await page.mouse.up();
    await dismissed(page);
    assert.equal((await data(page)).revealState, 'complete');
    await page
      .getByRole('heading', {
        level: 1,
        name: 'Full stack web developer with an Imagination.',
      })
      .waitFor();
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
  });
  await run('keyboard', {}, async (page) => {
    await ready(page);
    const range = page.getByRole('slider', { name: 'Cover peeled' });
    await range.focus();
    await range.press('Home');
    for (let i = 0; i < 35; i++) await range.press('ArrowRight');
    assert.equal(await range.inputValue(), '35');
    await page.waitForTimeout(500);
    assert.equal(await range.inputValue(), '35');
    await range.press('ArrowLeft');
    assert.equal(await range.inputValue(), '34');
    await range.press('End');
    await dismissed(page);
    assert.equal(
      await page
        .locator('.work-link')
        .evaluate((node) => node === document.activeElement),
      true,
    );
  });
  await run('keyboard-skip', {}, async (page) => {
    await page.route(sceneChunk, (route) =>
      new Promise((resolve) => setTimeout(resolve, 10000)).then(() =>
        route.abort(),
      ),
    );
    await opened(page);
    await page.locator('[data-reveal-skip]').focus();
    await page.locator('[data-reveal-skip]').press('Enter');
    await dismissed(page);
    assert.equal(
      await page
        .locator('.work-link')
        .evaluate((node) => node === document.activeElement),
      true,
    );
  });
  await run('timeout', {}, async (page) => {
    await page.route(rendererChunk, async (route) => {
      await new Promise((r) => setTimeout(r, 11000));
      await route.abort();
    });
    await opened(page);
    await dismissed(page);
    const d = await data(page);
    assert.equal(d.revealState, 'failed');
    const duration = Number(d.revealDismissedMs) - Number(d.revealStartedMs);
    assert.ok(
      duration >= 7900 && duration < 8400,
      `absolute loading deadline ${duration}`,
    );
    await page.waitForTimeout(3500);
    assert.equal(
      await page.locator('[data-reveal-cover]').count(),
      0,
      'late import cannot remount',
    );
  });
  await run('failure', {}, async (page) => {
    await page.addInitScript(() =>
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      }),
    );
    await page.route(rendererChunk, (route) => route.abort());
    await opened(page);
    await dismissed(page);
    assert.equal((await data(page)).revealState, 'failed');
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
  });
  await run('context-loss', {}, async (page) => {
    await ready(page);
    await mouseDrag(page, 760, 340);
    await page
      .locator('[data-reveal-cover] canvas')
      .evaluate((node) =>
        node
          .getContext('webgl2')
          .getExtension('WEBGL_lose_context')
          .loseContext(),
      );
    await dismissed(page);
    assert.equal((await data(page)).revealState, 'failed');
  });
  await run('cancel', {}, async (page) => {
    await ready(page);
    const box = await page.locator('[data-peel-grip]').boundingBox();
    await page.mouse.move(box.x + 28, box.y + 28);
    await page.mouse.down();
    await page.mouse.move(820, 270, { steps: 20 });
    await page.setViewportSize({ width: 1000, height: 700 });
    await dismissed(page);
    await page.mouse.up();
    assert.equal(await page.locator('[data-peel-grip]').count(), 0);
  });
  await run('header-focus', {}, async (page) => {
    await ready(page);
    await page.locator('header a').first().focus();
    await dismissed(page);
  });
  await run('repeat', {}, async (page) => {
    await ready(page);
    await page.locator('[data-reveal-skip]').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-stack-experience]')?.dataset
          .revealState === 'complete',
    );
    assert.equal(await page.locator('[data-reveal-cover]').count(), 0);
    assert.equal((await data(page)).revealStartedMs, undefined);
  });
  await run('reduced', { reducedMotion: 'reduce' }, async (page) => {
    await opened(page);
    await dismissed(page);
    assert.equal(await page.locator('canvas').count(), 0);
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
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
  });
  await run('lifecycle', {}, async (page) => {
    await ready(page);
    await mouseDrag(page, 750, 340);
    await page.evaluate(() =>
      document.dispatchEvent(new Event('astro:before-swap')),
    );
    assert.equal(
      await page.locator('[data-reveal-cover], [data-avatar]').count(),
      0,
    );
    await page.evaluate(() =>
      document.dispatchEvent(new Event('astro:page-load')),
    );
    await page.waitForFunction(
      () => document.querySelectorAll('[data-avatar]').length === 1,
    );
    assert.equal(await page.locator('[data-reveal-cover]').count(), 0);
  });
  await run('letters', {}, async (page) => {
    await ready(page);
    await page.locator('[data-reveal-skip]').click();
    const word = page.locator('[data-static-lettering="comic"]');
    await word.hover();
    assert.equal(
      await word.evaluate(
        (node) => node.getAnimations({ subtree: true }).length,
      ),
      0,
    );
    assert.equal(await page.locator('[data-letter-demo]').count(), 0);
    assert.equal(
      await word
        .locator('[id]')
        .evaluateAll(
          (nodes) =>
            new Set(nodes.map((node) => node.id)).size === nodes.length,
        ),
      true,
    );
  });
  await browser.close();
  fs.writeFileSync(
    path.join(output, 'results.json'),
    JSON.stringify({ base, results, errors }, null, 2),
  );
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.ok(
    results.length > 0 && results.every((r) => r.pass),
    JSON.stringify(results),
  );
}
module.exports = { main };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
