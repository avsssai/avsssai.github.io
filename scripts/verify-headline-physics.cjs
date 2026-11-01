const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, firefox } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4333';
const out = process.env.VERIFY_OUTPUT || '../portfolio-evidence/headline-final';
const root = '[data-grid-experience]';
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const engine = process.env.VERIFY_ENGINE || 'chromium';
  const browser = await (engine === 'firefox' ? firefox : chromium).launch({
    ...(engine === 'chromium' && process.platform === 'win32'
      ? { channel: 'chrome' }
      : {}),
    args: engine === 'chromium' ? ['--enable-unsafe-swiftshader'] : [],
  });
  const results = [];
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['phone', { width: 390, height: 844 }],
  ]) {
    const record = process.env.RECORD_HEADLINE === '1';
    const context = await browser.newContext({
      viewport,
      colorScheme: 'light',
      ...(name === 'phone' ? { hasTouch: true } : {}),
      ...(record
        ? { recordVideo: { dir: path.join(out, 'raw'), size: viewport } }
        : {}),
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.addInitScript(() =>
        localStorage.setItem('portfolio-reveal-v1', 'seen'),
      );
      await page.goto(base);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-grid-experience]')?.dataset
            .letterPhysics === 'ready',
      );
      assert.deepEqual(
        await page.locator('[data-headline-body]').allTextContents(),
        ['Full stack', 'web developer'],
      );
      await page
        .getByRole('heading', {
          name: 'Full stack web developer with an Imagination.',
        })
        .waitFor();
      await page.waitForTimeout(400);
      assert.equal(
        await page.locator(root).getAttribute('data-letter-frames'),
        null,
      );
      await page.screenshot({ path: path.join(out, `${name}-before.png`) });
      const click = async (x, y) =>
        name === 'phone' ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
      const travel = async (x, y) => {
        x = Math.round(x);
        y = Math.round(y);
        await click(x, y);
        await page.waitForFunction(
          ({ x, y }) => {
            const r = document.querySelector('[data-grid-experience]');
            return (
              r.dataset.gridPhase === 'idle' &&
              Math.abs(Number(r.dataset.characterX) - x) < 1.1 &&
              Math.abs(Number(r.dataset.characterY) - y) < 1.1
            );
          },
          { x, y },
          { timeout: 12000 },
        );
      };
      await page.locator(root).evaluate((node) => {
        new MutationObserver(() => {
          if (
            node.dataset.gridPhase === 'walking' &&
            Number(node.dataset.headlineImpacts) > 0
          )
            node.dataset.headlineContactDuringWalk = 'yes';
        }).observe(node, {
          attributes: true,
          attributeFilter: ['data-headline-impacts'],
        });
      });
      const size = name === 'phone' ? 32 : 44;
      const initial = await page
        .locator('[data-headline-body]')
        .evaluateAll((nodes) =>
          nodes.map((n) => {
            const b = n.getBoundingClientRect();
            return { x: b.x, y: b.y, width: b.width, height: b.height };
          }),
        );
      for (let i = 0; i < 2; i++) {
        const b = initial[i];
        await travel(
          b.x + b.width * 0.28,
          b.y + b.height / 2 + size * 1.25 * 0.45,
        );
        const poses = await page
          .locator('[data-headline-body]')
          .evaluateAll((nodes) =>
            nodes.map((n) => {
              const m = new DOMMatrix(getComputedStyle(n).transform);
              return { x: m.e, y: m.f, angle: Math.atan2(m.b, m.a) };
            }),
          );
        assert.ok(
          Math.abs(poses[i].x) +
            Math.abs(poses[i].y) +
            Math.abs(poses[i].angle) >
            0.1,
          'a walked-through line must react',
        );
        for (const p of poses) {
          assert.ok(Math.abs(p.x) <= 12.01);
          assert.ok(Math.abs(p.y) <= 3.01);
          assert.ok(Math.abs(p.angle) <= 0.01201);
        }
        await page.screenshot({
          path: path.join(out, `${name}-headline-${i}.png`),
        });
        await page.waitForFunction(
          () =>
            document.querySelector('[data-grid-experience]').dataset
              .letterMotion === 'sleeping',
          {},
          { timeout: 10000 },
        );
        const stopped = await page
          .locator(root)
          .getAttribute('data-letter-frames');
        await page.waitForTimeout(250);
        assert.equal(
          await page.locator(root).getAttribute('data-letter-frames'),
          stopped,
          'standing inside a headline must not leave an idle loop',
        );
      }
      assert.equal(
        await page
          .locator(root)
          .getAttribute('data-headline-contact-during-walk'),
        'yes',
      );
      assert.ok(
        Number(
          await page.locator(root).getAttribute('data-headline-impacts'),
        ) >= 2,
      );
      const word = '[data-static-lettering="colour"] svg [data-letter-body]';
      const glyphs = await page.locator(word).evaluateAll((nodes) =>
        nodes.map((n) => {
          const b = n.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        }),
      );
      const first = glyphs[0],
        last = glyphs[10],
        y = first.y + first.height / 2 + size * 1.25 * 0.45 + 6;
      await travel(first.x + first.width / 2 + 5, y);
      await travel(
        Math.min(viewport.width - size / 2 - 9, last.x + last.width + size),
        y,
      );
      await page.waitForFunction(
        () =>
          document.querySelector('[data-grid-experience]').dataset
            .letterMotion === 'sleeping',
        {},
        { timeout: 10000 },
      );
      assert.ok(
        Number(await page.locator(root).getAttribute('data-letter-moved')) >= 2,
      );
      assert.ok(
        Number(await page.locator(root).getAttribute('data-headline-moved')) >=
          1,
      );
      await page.screenshot({ path: path.join(out, `${name}-after.png`) });
      const frames = await page
        .locator(root)
        .getAttribute('data-letter-frames');
      await page.waitForTimeout(400);
      assert.equal(
        await page.locator(root).getAttribute('data-letter-frames'),
        frames,
      );
      const headTexts = await page
        .locator('[data-headline-body]')
        .allTextContents();
      assert.deepEqual(headTexts, ['Full stack', 'web developer']);
      await page
        .getByRole('button', { name: 'Reset headline and Imagination' })
        .click();
      assert.equal(
        await page.locator(root).getAttribute('data-headline-moved'),
        '0',
      );
      assert.equal(
        await page.locator(root).getAttribute('data-letter-moved'),
        '0',
      );
      assert.ok(
        (
          await page
            .locator('[data-headline-body]')
            .evaluateAll((nodes) => nodes.map((n) => n.style.transform))
        ).every((t) => !t),
      );
      await page.screenshot({ path: path.join(out, `${name}-reset.png`) });
      await page.waitForTimeout(600);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      results.push({ name, engine, pass: true });
      console.log('PASS', engine, name);
    } catch (error) {
      results.push({ name, engine, pass: false, error: error.stack, errors });
      console.error('FAIL', engine, name, error.stack);
      await page
        .screenshot({ path: path.join(out, `${name}-failure.png`) })
        .catch(() => {});
    } finally {
      const video = page.video();
      await context.close();
      if (video) await video.saveAs(path.join(out, `${name}.webm`));
    }
  }
  await browser.close();
  fs.writeFileSync(
    path.join(out, 'results.json'),
    JSON.stringify(results, null, 2),
  );
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
