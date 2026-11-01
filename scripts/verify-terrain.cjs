const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4331';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/terrain-final';
const results = [];
const ids = [
  'typescript',
  'python',
  'astro',
  'gcp',
  'react',
  'fastapi',
  'github',
];

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--enable-unsafe-swiftshader'],
  });
  async function run(name, options, action) {
    if (
      process.env.VERIFY_CASES &&
      !process.env.VERIFY_CASES.split(',').includes(name)
    )
      return;
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      ...options,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await action(page, context);
      assert.deepEqual(errors, []);
      results.push({ name, status: 'PASS' });
      console.log('PASS', name);
    } catch (error) {
      await page
        .screenshot({ path: path.join(output, `${name}-failure.png`) })
        .catch(() => {});
      results.push({ name, status: 'FAIL', error: error.message });
      console.error('FAIL', name, error.stack);
    } finally {
      await context.close();
    }
  }
  const open = async (page, seen = true) => {
    if (seen)
      await page.addInitScript(() =>
        localStorage.setItem('portfolio-reveal-v1', 'seen'),
      );
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-stack-experience]')
          ?.getAttribute('data-stack-scene') === 'ready',
    );
    await page.waitForSelector('[data-static-lettering="comic"] svg:visible');
  };
  const snap = (page, name) =>
    page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  const clean = async (page) => {
    assert.equal(
      await page
        .locator('[data-avatar]')
        .evaluate((n) => getComputedStyle(n).visibility),
      'hidden',
    );
    assert.equal(
      await page
        .locator('[data-avatar-perch]')
        .evaluate((n) => getComputedStyle(n).visibility),
      'visible',
    );
    assert.equal(await page.locator('[data-walking-trail] circle').count(), 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  };
  const trip = async (page, id, record = false) => {
    const before = Number(
      await page
        .locator('[data-stack-experience]')
        .getAttribute('data-interactions'),
    );
    await page.locator(`[data-stack-target="${id}"]`).click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-stack-experience]')
          ?.getAttribute('data-phase') === 'travel',
    );
    assert.equal(
      await page
        .locator('[data-stack-experience]')
        .getAttribute('data-walking-unavailable'),
      null,
    );
    assert.ok(
      Number(
        await page
          .locator('[data-stack-experience]')
          .getAttribute('data-route-separation'),
      ) >= 6,
    );
    const traces = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          const sample = () => {
            const root = document.querySelector('[data-stack-experience]');
            const avatar = document.querySelector('[data-avatar]');
            const rect = avatar.getBoundingClientRect();
            samples.push({
              phase: root.getAttribute('data-phase'),
              x: rect.x,
              y: rect.y,
              right: rect.right,
              bottom: rect.bottom,
              width: innerWidth,
              height: innerHeight,
              overflow: document.documentElement.scrollWidth > innerWidth,
              leg: avatar.querySelector('.front-leg').getAttribute('style'),
              visibleDots: [
                ...document.querySelectorAll('[data-route="outbound"] circle'),
              ].filter((n) => getComputedStyle(n).visibility === 'visible')
                .length,
            });
            if (root.getAttribute('data-phase') === 'idle') resolve(samples);
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }),
    );
    assert.ok(traces.some((s) => s.phase === 'return'));
    assert.ok(
      new Set(traces.filter((s) => s.phase === 'travel').map((s) => s.leg))
        .size > 5,
      'legs actually step',
    );
    assert.ok(
      traces.some((s) => s.visibleDots > 5),
      'trail draws behind character',
    );
    for (const s of traces) {
      assert.equal(s.overflow, false);
      assert.ok(
        s.x >= -1 &&
          s.right <= s.width + 1 &&
          s.y >= -1 &&
          s.bottom <= s.height + 1,
        `actor remains in viewport: ${JSON.stringify(s)}`,
      );
    }
    assert.equal(
      Number(
        await page
          .locator('[data-stack-experience]')
          .getAttribute('data-interactions'),
      ),
      before + 1,
    );
    await clean(page);
    if (record)
      fs.writeFileSync(
        path.join(output, `trace-${page.viewportSize().width}-${id}.json`),
        JSON.stringify(traces),
      );
  };
  try {
    await run('flat-lettering', {}, async (page) => {
      await open(page);
      assert.equal(
        await page
          .locator('terrain-lettering, [data-static-lettering] canvas')
          .count(),
        0,
      );
      assert.equal(
        await page.locator('canvas').count(),
        1,
        'only the technology/stage renderer remains',
      );
      const artwork = await page.locator('[data-static-lettering]').innerHTML();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width > 700 ? 1000 : 844 });
        await page.waitForTimeout(200);
        await page
          .getByRole('heading', {
            level: 1,
            name: 'Full stack web developer with an Imagination.',
          })
          .waitFor();
        assert.equal(await page.locator('.light-art svg').isVisible(), true);
        assert.equal(
          await page
            .locator('[data-static-lettering]')
            .evaluate((n) => n.getAnimations({ subtree: true }).length),
          0,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert.equal(
          await page.locator('[data-static-lettering]').innerHTML(),
          artwork,
        );
        await snap(page, `flat-lettering-${width}`);
      }
      const ids = await page
        .locator('[data-static-lettering] [id]')
        .evaluateAll((nodes) => nodes.map((n) => n.id));
      assert.equal(
        new Set(ids).size,
        ids.length,
        'theme SVG IDs remain unique',
      );
      await page.locator('[data-theme-toggle]').click();
      assert.equal(await page.locator('.dark-art svg').isVisible(), true);
      await snap(page, 'flat-lettering-dark');
    });
    for (const width of [1440, 390, 320])
      await run(
        `routes-${width}`,
        { viewport: { width, height: width > 700 ? 1000 : 844 } },
        async (page) => {
          await open(page);
          assert.match(
            (await page.locator('h1').innerText()).replace(/\s+/g, ' '),
            /Full stack web developer with an Imagination\./,
          );
          const baseDOM = await page.locator('*').count();
          assert.equal(
            await page
              .locator('.stack-label')
              .first()
              .evaluate((n) => getComputedStyle(n).color),
            'rgb(37, 37, 35)',
          );
          assert.equal(
            await page.evaluate(
              () => getComputedStyle(document.body).backgroundColor,
            ),
            'rgb(229, 222, 237)',
          );
          assert.equal(
            await page.evaluate(
              () => getComputedStyle(document.body).backgroundImage,
            ),
            'none',
          );
          assert.ok(
            Number(
              await page
                .locator('[data-stack-experience]')
                .getAttribute('data-stack-draw-calls'),
            ) >= 22,
          );
          await snap(page, `terrain-${width}`);
          for (const id of ids) await trip(page, id, id === 'react');
          assert.equal(
            await page.locator('*').count(),
            baseDOM,
            'no retained route nodes',
          );
        },
      );
    await run(
      'hover-and-return',
      { viewport: { width: 1440, height: 1000 } },
      async (page) => {
        await open(page);
        await page.locator('[data-stack-target="react"]').hover();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-stack-experience]')
              ?.getAttribute('data-phase') === 'travel',
        );
        await page.waitForTimeout(1100);
        await snap(page, 'walking-outbound');
        const target = await page
          .locator('[data-stack-experience]')
          .getAttribute('data-active-target');
        await page
          .locator('[data-stack-target="python"]')
          .evaluate((n) =>
            n.dispatchEvent(new MouseEvent('click', { bubbles: true })),
          );
        assert.equal(
          await page
            .locator('[data-stack-experience]')
            .getAttribute('data-active-target'),
          target,
          'busy activation cannot retarget trip',
        );
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-stack-experience]')
              ?.getAttribute('data-phase') === 'return',
        );
        await page.waitForTimeout(1000);
        await snap(page, 'walking-return');
        assert.ok(
          await page
            .locator('[data-route="return"] circle')
            .evaluateAll((ns) =>
              ns.some((n) => getComputedStyle(n).visibility === 'visible'),
            ),
        );
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-stack-experience]')
              ?.getAttribute('data-phase') === 'idle',
        );
        await clean(page);
      },
    );
    await run(
      'dark-phone',
      { viewport: { width: 390, height: 844 }, colorScheme: 'dark' },
      async (page) => {
        await open(page);
        assert.equal(
          await page
            .locator('.stack-label')
            .first()
            .evaluate((n) => getComputedStyle(n).color),
          'rgb(241, 239, 232)',
        );
        await snap(page, 'terrain-dark-phone');
        await trip(page, 'fastapi');
      },
    );
    await run('cancel-and-preference', {}, async (page) => {
      await open(page);
      await page.locator('[data-stack-target="typescript"]').click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-stack-experience]')
            ?.getAttribute('data-phase') === 'travel',
      );
      await page.setViewportSize({ width: 1300, height: 900 });
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-stack-experience]')
            ?.getAttribute('data-phase') === 'idle',
      );
      await clean(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(
        await page.locator('[data-static-lettering] canvas').count(),
        0,
      );
      assert.equal(
        await page
          .locator('.light-art')
          .evaluate((n) => getComputedStyle(n).visibility),
        'visible',
      );
      await page.locator('[data-stack-target="react"]').click();
      assert.equal(
        await page
          .locator('[data-stack-experience]')
          .getAttribute('data-phase'),
        'idle',
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForSelector('[data-static-lettering="comic"] svg:visible');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-stack-experience]')
            ?.getAttribute('data-stack-scene') === 'ready',
      );
      await trip(page, 'python');
    });
    await run('scene-context-loss', {}, async (page) => {
      await open(page);
      await page
        .locator('[data-stack-canvas] canvas')
        .evaluate((canvas) =>
          canvas.dispatchEvent(
            new Event('webglcontextlost', { cancelable: true }),
          ),
        );
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-stack-experience]')
            ?.getAttribute('data-stack-scene') === 'static',
      );
      assert.equal(await page.locator('.light-art svg').isVisible(), true);
      await page.locator('[data-stack-target="react"]').click();
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
      assert.match(
        await page
          .locator('.imagination-hero')
          .evaluate((n) => getComputedStyle(n).backgroundImage),
        /paper-stage-light\.svg/,
      );
      await snap(page, 'scene-fallback');
    });
    await run('peel-preserved', {}, async (page) => {
      await open(page, false);
      await page.waitForSelector('[data-reveal-cover]');
      await snap(page, 'cream-peel');
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-stack-experience]')
            ?.getAttribute('data-reveal-state') === 'complete',
      );
      await trip(page, 'react');
    });
    await run(
      'no-js',
      { javaScriptEnabled: false, viewport: { width: 320, height: 844 } },
      async (page) => {
        await page.goto(base);
        assert.equal(
          await page.locator('[data-static-lettering] canvas').count(),
          0,
        );
        assert.match(await page.locator('h1').innerText(), /Imagination\./);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert.match(
          await page
            .locator('.imagination-hero')
            .evaluate((n) => getComputedStyle(n).backgroundImage),
          /paper-stage-phone-light\.svg/,
        );
        await snap(page, 'no-js');
        await page.getByRole('link', { name: 'Explore my work' }).click();
        await page.waitForURL('**/work/');
      },
    );
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify(results, null, 2),
    );
  }
  if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
