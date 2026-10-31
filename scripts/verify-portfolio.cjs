const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4322';
const baselineURL = process.env.BASELINE_URL;
const output =
  process.env.VERIFY_OUTPUT || path.join(os.tmpdir(), 'portfolio-verification');
const selected = process.env.LANE ? Number(process.env.LANE) : null;
const record = process.env.RECORD_VIDEO === '1';
const results = [];

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const lane = async (number, title, options, run) => {
    if (selected && selected !== number) return;
    const folder = path.join(output, `worker-${number}`);
    fs.mkdirSync(folder, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      ...(record
        ? { recordVideo: { dir: folder, size: { width: 1440, height: 1000 } } }
        : {}),
      ...options,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const screenshot = async (slug) => {
      const file = path.join(folder, `${slug}.png`);
      await page.screenshot({ path: file, fullPage: true });
      return file;
    };
    const open = async () => {
      const response = await page.goto(`${baseURL}/lab/portfolio/`);
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      if (options.javaScriptEnabled !== false)
        await page.waitForFunction(
          () => document.querySelector('#target')?.disabled === false,
        );
    };
    try {
      await run({ page, context, open, screenshot, errors });
      assert.deepEqual(errors, [], `page errors in lane ${number}`);
      results.push({ number, title, status: 'PASS', folder });
      console.log(`PASS lane ${number}. ${title}`);
    } catch (error) {
      await screenshot('failure').catch(() => {});
      results.push({
        number,
        title,
        status: 'ISSUES',
        error: error.message,
        folder,
      });
      console.error(`ISSUES lane ${number}. ${error.stack}`);
    } finally {
      await context.close();
    }
  };
  const idle = (page) =>
    page.waitForFunction(
      () => document.querySelector('#playground')?.dataset.phase === 'idle',
    );
  const kick = async (page, method = 'click') => {
    const before = Number(
      await page.locator('#playground').getAttribute('data-kicks'),
    );
    const target = page.getByRole('button', {
      name: 'Let the character kick React',
    });
    if (method === 'hover') await target.hover();
    else if (method === 'keyboard') {
      await target.focus();
      await page.keyboard.press('Enter');
    } else await target.click();
    await page.waitForFunction(
      (count) =>
        Number(document.querySelector('#playground')?.dataset.kicks) ===
        count + 1,
      before,
    );
    await idle(page);
  };
  const geometry = async (page) => {
    const result = await page.evaluate(() => {
      const title = document.querySelector('h1').getBoundingClientRect();
      const cta = document.querySelector('.work-link');
      const box = cta.getBoundingClientRect();
      const at = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        titleClipped: title.left < 0 || title.right > innerWidth + 1,
        clickable: cta.contains(at),
        height: box.height,
      };
    });
    assert.equal(result.overflow, false, 'no horizontal page overflow');
    assert.equal(result.titleClipped, false, 'heading fits viewport');
    assert.equal(result.clickable, true, 'CTA is unobstructed');
    assert.ok(result.height >= 44, 'CTA has a 44 px touch target');
  };

  try {
    await lane(
      1,
      'Regression against trunk and head',
      {},
      async ({ page, open, screenshot }) => {
        for (const url of [...(baselineURL ? [baselineURL] : []), baseURL]) {
          const response = await page.goto(url);
          assert.equal(response.status(), 200);
          assert.equal(
            await page.getByRole('heading', { level: 1 }).count(),
            1,
          );
          await page.locator('a[href="/work/"]').first().click();
          await page.waitForURL('**/work/');
          assert.equal(
            await page.getByRole('heading', { level: 1 }).count(),
            1,
          );
        }
        if (baselineURL) {
          const response = await page.goto(`${baselineURL}/lab/portfolio/`);
          assert.equal(response.status(), 404, 'trunk has no prototype route');
        }
        await open();
        await kick(page);
        await screenshot('regression');
      },
    );
    await lane(
      2,
      'Desktop hover, compositions, and peel comparison',
      {},
      async ({ page, open, screenshot }) => {
        await open();
        await page.waitForFunction(
          () =>
            document.querySelector('#playground')?.dataset.scene === 'ready',
        );
        assert.equal(await page.locator('#scene canvas').count(), 1);
        await geometry(page);
        await screenshot('candidate-a');
        const scene = await page.locator('#scene').evaluate((host) => {
          const stage = host.getBoundingClientRect();
          const target = document
            .querySelector('#target')
            .getBoundingClientRect();
          return {
            delta: Math.abs(
              Number(host.dataset.projectedX) -
                (target.x - stage.x + target.width / 2),
            ),
          };
        });
        assert.ok(scene.delta < 1, 'scene and DOM share an anchor');
        await page.evaluate(() => {
          window.__phaseTrace = [];
          const root = document.querySelector('#playground');
          new MutationObserver(() =>
            window.__phaseTrace.push(root.dataset.phase),
          ).observe(root, {
            attributes: true,
            attributeFilter: ['data-phase'],
          });
        });
        await kick(page, 'hover');
        assert.deepEqual(await page.evaluate(() => window.__phaseTrace), [
          'anticipation',
          'travel',
          'kick',
          'impact',
          'return',
          'idle',
        ]);
        assert.equal(
          await page.locator('#playground').getAttribute('data-kicks'),
          '1',
        );
        await page.getByRole('button', { name: 'B · Object stage' }).click();
        await geometry(page);
        await screenshot('candidate-b');
        await page.getByRole('button', { name: 'A · Editorial' }).click();
        for (const [name, kind] of [
          ['Paper peel', 'css'],
          ['3D curl', 'mesh'],
        ]) {
          await page.getByRole('button', { name, exact: true }).click();
          assert.equal(
            await page.locator('#playground').getAttribute('data-peel'),
            kind,
          );
          await page.waitForTimeout(250);
          await screenshot(`peel-${kind}`);
          await page.waitForFunction(
            () =>
              document.querySelector('#playground')?.dataset.peel === 'none',
          );
          assert.equal(await page.locator('#skip-peel').isVisible(), false);
        }
        await page
          .getByRole('button', { name: 'Paper peel', exact: true })
          .click();
        await page.getByRole('button', { name: 'Skip reveal' }).click();
        assert.equal(
          await page.locator('#playground').getAttribute('data-peel'),
          'none',
        );
        assert.equal(
          await page
            .getByRole('button', { name: 'Paper peel', exact: true })
            .evaluate((node) => document.activeElement === node),
          true,
        );
        if (record) {
          for (let i = 0; i < 5; i++) {
            await page.waitForTimeout(1700);
            await kick(page);
            await page
              .getByRole('button', {
                name: i % 2 ? 'A · Editorial' : 'B · Object stage',
              })
              .click();
            await page.waitForTimeout(1200);
          }
        }
      },
    );
    await lane(
      3,
      'Mobile compositions and unobstructed content',
      {
        viewport: { width: 390, height: 1000 },
        isMobile: true,
        hasTouch: true,
      },
      async ({ page, open, screenshot }) => {
        await open();
        for (const [label, slug] of [
          ['A · Editorial', 'mobile-a'],
          ['B · Object stage', 'mobile-b'],
        ]) {
          await page.getByRole('button', { name: label }).click();
          await page.evaluate(() => scrollTo(0, 0));
          await geometry(page);
          await screenshot(slug);
        }
      },
    );
    await lane(
      4,
      'Keyboard activation and focus retention',
      {},
      async ({ page, open, screenshot }) => {
        await open();
        await kick(page, 'keyboard');
        assert.equal(
          await page
            .locator('#target')
            .evaluate((node) => document.activeElement === node),
          true,
        );
        assert.notEqual(
          await page
            .locator('#target')
            .evaluate((node) => getComputedStyle(node).outlineStyle),
          'none',
        );
        await screenshot('keyboard');
      },
    );
    await lane(
      5,
      'Touch activation without hover',
      {
        viewport: { width: 390, height: 1000 },
        isMobile: true,
        hasTouch: true,
      },
      async ({ page, open, screenshot }) => {
        await open();
        const before = await page
          .locator('#playground')
          .getAttribute('data-kicks');
        await page
          .getByRole('button', { name: 'Let the character kick React' })
          .tap();
        await page.waitForFunction(
          (count) =>
            Number(document.querySelector('#playground')?.dataset.kicks) ===
            Number(count) + 1,
          before,
        );
        await idle(page);
        await screenshot('touch');
      },
    );
    await lane(
      6,
      'Reduced motion stays static',
      { reducedMotion: 'reduce' },
      async ({ page, open, screenshot }) => {
        await open();
        await page.locator('#target').click();
        await page
          .getByRole('button', { name: 'Paper peel', exact: true })
          .click();
        assert.equal(
          await page.locator('#playground').getAttribute('data-phase'),
          'idle',
        );
        assert.equal(
          await page.locator('#playground').getAttribute('data-peel'),
          'none',
        );
        assert.equal(
          await page.locator('#playground').getAttribute('data-kicks'),
          '0',
        );
        assert.equal(await page.locator('#scene canvas').count(), 0);
        await screenshot('reduced');
      },
    );
    await lane(
      7,
      'No-JavaScript content and navigation',
      { javaScriptEnabled: false, viewport: { width: 390, height: 1000 } },
      async ({ page, open, screenshot }) => {
        await open();
        await geometry(page);
        assert.equal(await page.locator('#peel-cover').isVisible(), false);
        await screenshot('no-js');
        await page.getByRole('link', { name: 'Explore my work' }).click();
        await page.waitForURL('**/work/');
      },
    );
    await lane(
      8,
      'Blocked scene chunk and context loss',
      {},
      async ({ page, context, open, screenshot }) => {
        await context.route('**/*scene*.js', (route) => route.abort());
        await open();
        await page.waitForFunction(
          () =>
            document.querySelector('#playground')?.dataset.scene === 'fallback',
        );
        await geometry(page);
        assert.equal(await page.locator('.fallback-atom').isVisible(), true);
        await kick(page);
        await screenshot('chunk-failure');
        await context.unroute('**/*scene*.js');
        await open();
        await page.waitForFunction(
          () =>
            document.querySelector('#playground')?.dataset.scene === 'ready',
        );
        await page.locator('#scene canvas').evaluate((canvas) => {
          const gl = canvas.getContext('webgl2');
          if (!gl) throw new Error('expected live WebGL2 context');
          const extension = gl.getExtension('WEBGL_lose_context');
          if (!extension) throw new Error('context loss extension unavailable');
          extension.loseContext();
        });
        await page.waitForFunction(
          () =>
            document.querySelector('#playground')?.dataset.scene === 'fallback',
        );
        await screenshot('context-loss');
        await geometry(page);
      },
    );
    await lane(
      9,
      'Resize cancellation and perch recovery',
      {},
      async ({ page, open, screenshot }) => {
        await open();
        await page.locator('#target').click();
        await page.waitForFunction(
          () =>
            document.querySelector('#playground')?.dataset.phase === 'travel',
        );
        await page.setViewportSize({ width: 768, height: 1000 });
        await idle(page);
        await page.waitForTimeout(1100);
        assert.equal(
          await page.locator('#playground').getAttribute('data-kicks'),
          '0',
        );
        const bounds = await page.locator('#avatar').boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width < 768);
        await screenshot('resize');
      },
    );
    await lane(
      10,
      'Rapid requests and twenty completed kicks',
      {},
      async ({ page, open, screenshot }) => {
        await open();
        await page.locator('#target').click();
        for (let i = 0; i < 20; i++)
          await page.locator('#target').dispatchEvent('click');
        await page.waitForFunction(
          () => document.querySelector('#playground')?.dataset.kicks === '1',
        );
        await idle(page);
        await page.waitForTimeout(1100);
        assert.equal(
          await page.locator('#playground').getAttribute('data-kicks'),
          '1',
          'busy requests are ignored, not queued',
        );
        for (let i = 0; i < 19; i++) await kick(page);
        assert.equal(
          await page.locator('#playground').getAttribute('data-kicks'),
          '20',
        );
        assert.equal(await page.locator('#avatar').count(), 1);
        assert.equal(
          await page
            .locator('#crack')
            .evaluate((node) => getComputedStyle(node).opacity),
          '0',
        );
        const frames = await page.locator('#scene').getAttribute('data-frames');
        await page.waitForTimeout(500);
        assert.equal(
          await page.locator('#scene').getAttribute('data-frames'),
          frames,
          'no continuous idle rendering',
        );
        await screenshot('repeat');
      },
    );
  } finally {
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify(
        {
          browser: browser.version(),
          baseURL,
          baselineURL: baselineURL || null,
          independentModelReview: false,
          results,
        },
        null,
        2,
      ),
    );
    await browser.close();
  }
  if (results.some((result) => result.status !== 'PASS')) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
