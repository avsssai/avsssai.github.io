const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4327';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P02/foundation';
const sizes = [
  [1440, 900],
  [1280, 700],
  [1024, 600],
  [768, 1024],
  [700, 650],
  [651, 601],
  [390, 844],
  [390, 650],
  [360, 568],
  [320, 568],
  [844, 390],
  [600, 360],
];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  const results = [];
  try {
    for (const test of [
      ...sizes.map(([width, height]) => ({ width, height })),
      { width: 390, height: 650, noJS: true },
      { width: 390, height: 650, fontsBlocked: true },
      { width: 1440, height: 900, fontsBlocked: true },
      { width: 1440, height: 900, dark: true },
    ]) {
      const slug = `${test.width}-${test.height}${test.noJS ? '-no-js' : ''}${test.fontsBlocked ? '-fonts-blocked' : ''}${test.dark ? '-dark' : ''}`;
      const context = await browser.newContext({
        viewport: { width: test.width, height: test.height },
        javaScriptEnabled: !test.noJS,
        colorScheme: test.dark ? 'dark' : 'light',
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        if (test.fontsBlocked)
          await page.route('**/*.woff2', (route) => route.abort());
        assert.equal((await page.goto(baseURL)).status(), 200);
        await page.evaluate(() => document.fonts.ready);
        assert.match(
          await page.locator('h1').innerText(),
          /Full stack[\s\S]*web developer[\s\S]*Imagination/,
        );
        assert.doesNotMatch(
          await page.locator('body').innerText(),
          /code is the medium|a little logic|a little mischief|something good underneath|your strongest project|your location|AVAILABLE FOR/i,
        );
        const metrics = await page.evaluate(() => {
          const rect = (selector) => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              right: r.right,
              bottom: r.bottom,
              height: r.height,
              width: r.width,
            };
          };
          const cta = rect('.work-link');
          return {
            width: innerWidth,
            height: innerHeight,
            reflow:
              !!document.querySelector('[data-stack-experience]') &&
              matchMedia('(max-width: 1000px), (max-height: 550px)').matches,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            heading: rect('h1'),
            cta,
            hit: document
              .querySelector('.work-link')
              .contains(
                document.elementFromPoint(
                  cta.x + cta.width / 2,
                  cta.y + cta.height / 2,
                ),
              ),
          };
        });
        assert.ok(
          metrics.scrollWidth <= metrics.width,
          'no horizontal page scroll',
        );
        assert.ok(
          metrics.reflow || metrics.scrollHeight <= metrics.height + 1,
          `whole homepage fits 100dvh; observed ${metrics.scrollHeight}/${metrics.height}`,
        );
        assert.ok(
          metrics.heading.y >= 0 &&
            metrics.heading.bottom <=
              (metrics.reflow ? metrics.scrollHeight : metrics.height),
          'heading fits',
        );
        assert.ok(
          metrics.cta.bottom <=
            (metrics.reflow ? metrics.scrollHeight : metrics.height) &&
            metrics.cta.height >= 44,
          'CTA fits and retains touch size',
        );
        if (metrics.reflow) {
          assert.equal(
            await page.locator('[data-stack-target]').count(),
            7,
            'reflow retains every stack target',
          );
          await page.locator('.work-link').scrollIntoViewIfNeeded();
          assert.ok(
            await page.locator('.work-link').evaluate((link) => {
              const box = link.getBoundingClientRect();
              return (
                box.top >= 0 &&
                box.bottom <= innerHeight &&
                link.contains(
                  document.elementFromPoint(
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                  ),
                )
              );
            }),
            'primary work link is reachable and unobstructed after reflow',
          );
        } else assert.ok(metrics.hit, 'primary work link is unobstructed');
        assert.equal(
          await page
            .locator('a[href*="example.com"], a[href*="your-handle"]')
            .count(),
          0,
          'no placeholder contacts',
        );
        if (test.noJS)
          assert.equal(
            await page.locator('[data-theme-toggle]').isVisible(),
            false,
          );
        assert.equal(
          await page.locator('canvas').count(),
          0,
          'static foundation has no canvas',
        );
        await page.screenshot({
          path: path.join(output, `${slug}.png`),
          fullPage: true,
        });
        await page.locator('.work-link').click();
        await page.waitForURL('**/work/');
        assert.equal(await page.locator('h1').innerText(), 'Work');
        await page
          .getByRole('navigation', { name: 'Primary navigation' })
          .getByRole('link', { name: 'Blog', exact: true })
          .click();
        await page.waitForURL('**/blog/');
        assert.equal(await page.locator('h1').innerText(), 'Blog');
        await page.locator('main article a').first().click();
        await page.waitForURL('**/blog/starting-with-the-system/');
        assert.equal(
          await page.locator('h1').innerText(),
          'Starting with the system',
        );
        assert.ok(await page.locator('.prose').innerText());
        assert.deepEqual(errors, [], 'no browser page errors');
        results.push({ test, status: 'PASS', metrics });
        console.log(`PASS ${slug}`);
      } catch (error) {
        results.push({ test, status: 'FAIL', error: error.message });
        console.error(`FAIL ${slug}: ${error.message}`);
        await page.screenshot({
          path: path.join(output, `${slug}-failure.png`),
          fullPage: true,
        });
      } finally {
        await context.close();
      }
    }
    const page = await browser.newPage({ colorScheme: 'light' });
    await page.goto(baseURL);
    await page.locator('[data-theme-toggle]').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(
      await page
        .locator('meta[name="theme-color"]')
        .first()
        .getAttribute('content'),
      '#191918',
    );
    await page.goto(`${baseURL}/blog/starting-with-the-system/`);
    await page.screenshot({
      path: path.join(output, 'article-dark.png'),
      fullPage: true,
    });
    results.push({
      test: 'theme persistence and browser chrome',
      status: 'PASS',
    });
    console.log('PASS theme persistence');
    await page.goto(baseURL);
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.className),
      'skip-link',
    );
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
    await page.reload();
    for (let tab = 0; tab < 3; tab++) await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('href')),
      '/work/',
    );
    assert.notEqual(
      await page.evaluate(
        () => getComputedStyle(document.activeElement).outlineStyle,
      ),
      'none',
    );
    await page.screenshot({
      path: path.join(output, 'keyboard.png'),
      fullPage: true,
    });
    await page.keyboard.press('Enter');
    await page.waitForURL('**/work/');
    await page.getByRole('link', { name: 'Contact', exact: true }).click();
    assert.ok(page.url().endsWith('#contact'));
    assert.ok(
      await page
        .locator('#contact a[href="https://github.com/avsssai"]')
        .isVisible(),
    );
    const rss = await page.request.get(`${baseURL}/rss.xml`);
    assert.equal(rss.status(), 200);
    assert.match(await rss.text(), /Starting with the system/);
    results.push({ test: 'keyboard, contact and RSS', status: 'PASS' });
    console.log('PASS keyboard, contact and RSS');
    await page.close();
    const zoomProfile = fs.mkdtempSync(
      path.join(os.tmpdir(), 'portfolio-zoom-'),
    );
    const zoomContext = await chromium.launchPersistentContext(zoomProfile, {
      executablePath: process.env.CHROME_PATH,
      headless: true,
      viewport: null,
      args: ['--window-size=1440,900'],
    });
    try {
      const zoomPage = await zoomContext.newPage();
      await zoomPage.goto('chrome://settings/appearance');
      await zoomPage.locator('#zoomLevel').selectOption('2');
      await zoomPage.goto(baseURL);
      await zoomPage.evaluate(() => document.fonts.ready);
      const zoom = await zoomPage.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
        outerWidth,
        dpr: devicePixelRatio,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.ok(
        zoom.outerWidth / zoom.width > 1.9 &&
          zoom.outerWidth / zoom.width < 2.1,
        'actual Chrome 200% page zoom',
      );
      assert.ok(
        zoom.scrollWidth <= zoom.width,
        '200% zoom has no horizontal page scroll',
      );
      await zoomPage.locator('.work-link').scrollIntoViewIfNeeded();
      const zoomSession = await zoomContext.newCDPSession(zoomPage);
      const capture = await zoomSession.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      fs.writeFileSync(
        path.join(output, 'zoom-200.png'),
        Buffer.from(capture.data, 'base64'),
      );
      await zoomSession.detach();
      await zoomPage.locator('.work-link').click();
      await zoomPage.waitForURL('**/work/');
      results.push({
        test: 'native Chrome 200% page zoom',
        status: 'PASS',
        metrics: zoom,
      });
      console.log('PASS native Chrome 200% page zoom');
    } finally {
      await zoomContext.close();
      fs.rmSync(zoomProfile, { recursive: true, force: true });
    }
  } finally {
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify({ baseURL, browser: browser.version(), results }, null, 2),
    );
    await browser.close();
  }
  assert.ok(
    results.every((result) => result.status === 'PASS'),
    'static foundation scenarios pass',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
