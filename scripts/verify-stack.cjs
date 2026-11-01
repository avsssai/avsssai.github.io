const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4328';
const baselineURL = process.env.BASELINE_URL || 'http://127.0.0.1:4327';
const output = process.env.VERIFY_OUTPUT || '../portfolio-evidence/P03/live';
const ids = [
  'typescript',
  'python',
  'astro',
  'gcp',
  'react',
  'fastapi',
  'github',
];
const root = '[data-stack-experience]';
const ready = (page) =>
  page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]')?.dataset.stackScene ===
      'ready',
    null,
    { timeout: 12000 },
  );

async function instrument(context) {
  await context.addInitScript(() => {
    window.__stackDraws = 0;
    window.__stackRenderTimes = [];
    for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
      const prototype = window[name]?.prototype;
      if (!prototype) continue;
      const originalClear = prototype.clear;
      prototype.clear = function (...args) {
        window.__stackRenderTimes.push(performance.now());
        return originalClear.apply(this, args);
      };
      for (const method of [
        'drawArrays',
        'drawElements',
        'drawArraysInstanced',
        'drawElementsInstanced',
      ]) {
        const original = prototype[method];
        if (!original) continue;
        prototype[method] = function (...args) {
          window.__stackDraws++;
          return original.apply(this, args);
        };
      }
    }
  });
}
async function inspect(page, projection = true) {
  const values = await page.evaluate((projection) => {
    const hero = document
      .querySelector('[data-stack-experience]')
      .getBoundingClientRect();
    const heading = [];
    const walker = document.createTreeWalker(
      document.querySelector('h1'),
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      heading.push(...range.getClientRects());
    }
    const link = document.querySelector('.work-link').getBoundingClientRect();
    const overlap = (a, b) =>
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top;
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      targets: [...document.querySelectorAll('[data-stack-target]')].map(
        (button) => {
          const box = button.getBoundingClientRect();
          const anchor = button
            .querySelector('[data-stack-anchor]')
            .getBoundingClientRect();
          return {
            id: button.dataset.stackTarget,
            width: box.width,
            height: box.height,
            overlap:
              heading.some((text) => overlap(box, text)) || overlap(box, link),
            dx: projection
              ? Math.abs(
                  Number(button.dataset.projectedX) -
                    (anchor.x - hero.x + anchor.width / 2),
                )
              : 0,
            dy: projection
              ? Math.abs(
                  Number(button.dataset.projectedY) -
                    (anchor.y - hero.y + anchor.height / 2),
                )
              : 0,
          };
        },
      ),
    };
  }, projection);
  assert.equal(values.overflow, false, 'no horizontal overflow');
  assert.deepEqual(
    values.targets.map((target) => target.id),
    ids,
  );
  for (const target of values.targets) {
    assert.ok(
      target.width >= 44 && target.height >= 44,
      `${target.id} touch size`,
    );
    assert.equal(
      target.overlap,
      false,
      `${target.id} does not cover copy/navigation`,
    );
    assert.ok(
      target.dx < 2 && target.dy < 2,
      `${target.id} projected centre alignment ${target.dx},${target.dy}`,
    );
  }
  return values;
}
async function fallback(page) {
  assert.equal(
    await page.locator(root).getAttribute('data-stack-scene'),
    'static',
  );
  for (const img of await page.locator('[data-stack-anchor] img').all()) {
    assert.equal(
      await img.evaluate((node) => getComputedStyle(node).opacity),
      '1',
    );
    assert.ok(
      await img.evaluate((node) => node.complete && node.naturalWidth > 0),
    );
  }
  await inspect(page, false);
  await page.locator('.work-link').click();
  await page.waitForURL('**/work/');
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ['--enable-unsafe-swiftshader'],
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  });
  const results = [];
  const lane = async (number, title, options, run) => {
    if (process.env.LANE && Number(process.env.LANE) !== number) return;
    const folder = path.join(output, `worker-${number}`);
    fs.mkdirSync(folder, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...options,
    });
    await instrument(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const shot = (slug) =>
      page.screenshot({
        path: path.join(folder, slug + '.png'),
        fullPage: true,
      });
    try {
      const detail = await run({ page, context, shot });
      assert.deepEqual(errors, [], 'no page errors');
      results.push({ number, title, status: 'PASS', detail, folder });
      console.log(`PASS ${number} ${title}`);
    } catch (error) {
      await shot('failure').catch(() => {});
      results.push({
        number,
        title,
        status: 'FAIL',
        error: error.message,
        folder,
      });
      console.error(`FAIL ${number} ${title}: ${error.stack}`);
    } finally {
      await context.close();
    }
  };
  try {
    await lane(1, 'regression navigation', {}, async ({ page, shot }) => {
      await page.goto(baselineURL);
      assert.match(await page.locator('h1').innerText(), /Imagination/);
      const baselineCanvases = await page.locator('canvas').count();
      await page.locator('.work-link').click();
      await page.waitForURL('**/work/');
      await page.goto(baseURL);
      await ready(page);
      await shot('regression');
      await page.locator('.work-link').click();
      await page.waitForURL('**/work/');
      return { baselineCanvases, baselineURL };
    });
    await lane(2, 'desktop single scene', {}, async ({ page, shot }) => {
      await page.goto(baseURL);
      await ready(page);
      assert.equal(await page.locator('canvas').count(), 1);
      const detail = await inspect(page);
      assert.equal(
        await page
          .locator('[data-stack-anchor] img')
          .first()
          .evaluate((e) => getComputedStyle(e).opacity),
        '0',
      );
      await shot('scene');
      return detail;
    });
    await lane(
      3,
      'touch mobile',
      { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      async ({ page, shot }) => {
        await page.goto(baseURL);
        await ready(page);
        const detail = await inspect(page);
        await page.locator('[data-stack-target="react"]').tap();
        assert.equal(
          await page
            .locator('[data-stack-target="react"]')
            .getAttribute('aria-pressed'),
          'true',
        );
        await shot('mobile');
        return detail;
      },
    );
    await lane(4, 'native keyboard selection', {}, async ({ page, shot }) => {
      await page.goto(baseURL);
      await ready(page);
      await page.locator('.work-link').focus();
      for (const id of ids) {
        await page.keyboard.press('Tab');
        assert.equal(
          await page.evaluate(() => document.activeElement.dataset.stackTarget),
          id,
        );
        await page.keyboard.press('Space');
        assert.equal(
          await page
            .locator(`[data-stack-target="${id}"]`)
            .getAttribute('aria-pressed'),
          'true',
        );
        assert.notEqual(
          await page.evaluate(
            () => getComputedStyle(document.activeElement).outlineStyle,
          ),
          'none',
        );
      }
      await shot('keyboard');
    });
    await lane(5, 'unavailable WebGL', {}, async ({ page, context, shot }) => {
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return /webgl/.test(type) ? null : original.call(this, type, ...args);
        };
      });
      await page.goto(baseURL);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-stack-experience]').dataset
            .stackFailure,
      );
      await shot('no-webgl');
      await fallback(page);
    });
    await lane(6, 'blocked enhancement chunk', {}, async ({ page, shot }) => {
      let blocked = 0;
      await page.route('**/*StackExperience*.js', (route) => {
        blocked++;
        return route.abort();
      });
      await page.goto(baseURL);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-stack-experience]').dataset
            .stackFailure,
      );
      assert.ok(blocked > 0, 'actual scene attachment chunk blocked');
      assert.equal(await page.locator('canvas').count(), 0);
      await shot('chunk-failure');
      await fallback(page);
      return { blocked };
    });
    await lane(7, 'context loss fallback', {}, async ({ page, shot }) => {
      await page.goto(baseURL);
      await ready(page);
      const lost = await page.locator('canvas').evaluate((canvas) => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const extension = gl.getExtension('WEBGL_lose_context');
        extension?.loseContext();
        return !!extension;
      });
      assert.ok(lost, 'real context loss extension');
      await page.waitForFunction(
        () =>
          document.querySelector('[data-stack-experience]').dataset
            .stackFailure === 'context-loss',
      );
      await page.waitForTimeout(200);
      assert.equal(await page.locator('canvas').count(), 0);
      await shot('context-loss');
      await fallback(page);
    });
    await lane(
      8,
      'projection repeated resize/rotation',
      {},
      async ({ page, shot }) => {
        await page.goto(baseURL);
        await ready(page);
        const sizes = [
          [1024, 600],
          [768, 1024],
          [390, 844],
          [844, 390],
          [320, 568],
          [700, 650],
          [1440, 900],
        ];
        const detail = [];
        for (const [width, height] of sizes) {
          await page.setViewportSize({ width, height });
          await page.waitForTimeout(250);
          await ready(page);
          detail.push({ width, height, ...(await inspect(page)) });
        }
        await shot('resize');
        return detail;
      },
    );
    await lane(
      9,
      'reduced motion static and cleanup',
      { reducedMotion: 'reduce' },
      async ({ page, shot }) => {
        const requests = [];
        page.on('request', (request) => requests.push(request.url()));
        await page.goto(baseURL);
        await page.waitForTimeout(500);
        assert.equal(await page.locator('canvas').count(), 0);
        assert.equal(
          requests.some((url) => /StackExperience.*\.js/.test(url)),
          false,
        );
        await inspect(page, false);
        await shot('reduced');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await ready(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(200);
        assert.equal(await page.locator('canvas').count(), 0);
        await fallback(page);
        return { noHeavyImportInitially: true };
      },
    );
    await lane(
      10,
      'offscreen hidden pause and bfcache',
      {},
      async ({ page, shot }) => {
        await page.goto(baseURL);
        await ready(page);
        await page.evaluate(() => {
          const spacer = document.createElement('div');
          spacer.id = 'test-spacer';
          spacer.style.height = '200vh';
          document.body.append(spacer);
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(600);
        const before = await page.evaluate(() => window.__stackDraws);
        await page.waitForTimeout(1000);
        assert.equal(
          await page.evaluate(() => window.__stackDraws),
          before,
          'no real offscreen draw calls',
        );
        await page.evaluate(() => {
          document.querySelector('#test-spacer').remove();
          window.scrollTo(0, 0);
        });
        await ready(page);
        const hidden = await require('./native-visibility.cjs').probeVisibility(
          baseURL,
        );
        await page.evaluate(() => {
          window.__stackPersisted = [];
          window.addEventListener('pageshow', (event) =>
            window.__stackPersisted.push(event.persisted),
          );
        });
        await page.locator('.work-link').click();
        await page.waitForURL('**/work/');
        await page.goBack({ waitUntil: 'commit' });
        await ready(page);
        assert.equal(await page.locator('canvas').count(), 1);
        const persisted = await page.evaluate(
          () => window.__stackPersisted || [],
        );
        assert.ok(
          persisted.includes(true),
          'real bfcache restoration occurred',
        );
        await shot('paused');
        return { offscreenDraws: 0, hidden, persisted };
      },
    );
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(output, 'report.json'),
      JSON.stringify(
        { browser: 'System Chrome', baseURL, baselineURL, results },
        null,
        2,
      ),
    );
  }
  if (results.some((result) => result.status !== 'PASS')) process.exitCode = 1;
}
module.exports = { main, ready, instrument };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
