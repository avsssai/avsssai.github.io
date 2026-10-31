const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4323';
const output =
  process.env.VERIFY_OUTPUT || path.join(os.tmpdir(), 'portfolio-viewport');
const cases = [
  { width: 1440, height: 900 },
  { width: 1280, height: 700 },
  { width: 1024, height: 600 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 390, height: 650 },
  { width: 360, height: 568 },
  { width: 844, height: 390 },
  { width: 600, height: 360 },
  { width: 390, height: 650, javaScriptEnabled: false },
];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const results = [];
  try {
    for (const test of cases) {
      const context = await browser.newContext({
        viewport: { width: test.width, height: test.height },
        reducedMotion: 'reduce',
        javaScriptEnabled: test.javaScriptEnabled !== false,
      });
      const page = await context.newPage();
      const slug = `${test.width}-${test.height}${test.javaScriptEnabled === false ? '-no-js' : ''}`;
      try {
        await page.goto(`${baseURL}/lab/portfolio/`);
        await page.evaluate(() => document.fonts.ready);
        const metrics = await page.evaluate(() => {
          const box = (selector) => {
            const rect = document
              .querySelector(selector)
              .getBoundingClientRect();
            return {
              x: rect.x,
              y: rect.y,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
            };
          };
          const stage = box('#stage');
          const heading = box('h1');
          const cta = box('.work-link');
          const target = box('#target');
          const header = box('.masthead');
          const footer = box('.stage-footer');
          const hit = document.elementFromPoint(
            cta.x + cta.width / 2,
            cta.y + cta.height / 2,
          );
          return {
            viewportHeight: innerHeight,
            stage,
            heading,
            cta,
            target,
            header,
            footer,
            overflowX: document.documentElement.scrollWidth > innerWidth,
            clickable: document.querySelector('.work-link').contains(hit),
            stageOverflow: getComputedStyle(document.querySelector('#stage'))
              .overflow,
          };
        });
        const overlap = (a, b) =>
          a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
        assert.ok(
          Math.abs(metrics.stage.height - metrics.viewportHeight) <= 1,
          `stage is exactly 100dvh, observed ${metrics.stage.height} versus ${metrics.viewportHeight}`,
        );
        assert.equal(metrics.overflowX, false, 'no horizontal scroll');
        assert.equal(
          metrics.clickable,
          true,
          'primary link stays unobstructed',
        );
        assert.equal(
          overlap(metrics.cta, metrics.target),
          false,
          'stack target stays clear of the primary link',
        );
        assert.equal(
          overlap(metrics.heading, metrics.target),
          false,
          'stack target stays clear of the heading',
        );
        assert.equal(
          overlap(metrics.heading, metrics.header),
          false,
          'header stays clear of the heading',
        );
        for (const name of ['heading', 'cta', 'target', 'header', 'footer']) {
          assert.ok(
            metrics[name].y >= metrics.stage.y - 1 &&
              metrics[name].bottom <= metrics.stage.bottom + 1,
            `${name} fits inside the landing screen`,
          );
        }
        assert.ok(
          metrics.cta.height >= 44,
          'primary link retains its touch size',
        );
        assert.notEqual(
          metrics.stageOverflow,
          'hidden',
          'content is not hidden to fake the viewport fit',
        );
        await page.screenshot({
          path: path.join(output, `${slug}.png`),
          fullPage: true,
        });
        results.push({ ...test, status: 'PASS', metrics });
        console.log(
          `PASS ${slug}. 100dvh without clipping or blocked controls.`,
        );
      } catch (error) {
        await page.screenshot({
          path: path.join(output, `${slug}-failure.png`),
          fullPage: true,
        });
        results.push({ ...test, status: 'ISSUES', error: error.message });
        console.error(`ISSUES ${slug}. ${error.message}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify({ browser: browser.version(), baseURL, results }, null, 2),
    );
    await browser.close();
  }
  if (results.some((result) => result.status !== 'PASS')) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
