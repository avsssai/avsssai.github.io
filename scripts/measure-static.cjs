const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const headURL = process.env.BASE_URL || 'http://127.0.0.1:4327';
const baselineURL = process.env.BASELINE_URL || 'http://127.0.0.1:4323';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P02/performance';
const routes = ['/', '/work/', '/blog/starting-with-the-system/'];
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
  });
  const report = {
    browser: browser.version(),
    headURL,
    baselineURL,
    profile: {
      viewport: '1440x900',
      cpuThrottle: 4,
      coldCache: true,
      network: 'Local preview, no network throttle',
      clsWindowMs: 5000,
    },
    samples: [],
    gates: [],
  };
  try {
    for (let run = 0; run < 5; run++) {
      for (const route of routes) {
        const revisions =
          run % 2
            ? [
                ['head', headURL],
                ['baseline', baselineURL],
              ]
            : [
                ['baseline', baselineURL],
                ['head', headURL],
              ];
        for (const [revision, origin] of revisions) {
          const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            colorScheme: 'light',
          });
          try {
            const page = await context.newPage();
            const cdp = await context.newCDPSession(page);
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
            await cdp.send('Network.enable');
            await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
            await page.addInitScript(() => {
              window.__cls = 0;
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries())
                  if (!entry.hadRecentInput) window.__cls += entry.value;
              }).observe({ type: 'layout-shift', buffered: true });
            });
            assert.equal(
              (
                await page.goto(origin + route, {
                  waitUntil: 'domcontentloaded',
                })
              ).status(),
              200,
            );
            await page
              .getByRole('heading', { level: 1 })
              .waitFor({ state: 'visible' });
            const headingMs = await page.evaluate(() => performance.now());
            await page.waitForTimeout(
              Math.max(
                0,
                5000 - (await page.evaluate(() => performance.now())),
              ),
            );
            const sample = await page.evaluate(() => ({
              cls: window.__cls,
              bytes:
                performance.getEntriesByType('navigation')[0].transferSize +
                performance
                  .getEntriesByType('resource')
                  .reduce((sum, entry) => sum + entry.transferSize, 0),
            }));
            report.samples.push({
              run: run + 1,
              route,
              revision,
              headingMs,
              ...sample,
            });
            console.log(
              `${run + 1} ${revision} ${route}: ${Math.round(headingMs)}ms, ${sample.bytes}B, CLS ${sample.cls}`,
            );
          } finally {
            await context.close();
          }
        }
      }
    }
    for (const route of routes) {
      const baseline = report.samples.filter(
        (row) => row.route === route && row.revision === 'baseline',
      );
      const head = report.samples.filter(
        (row) => row.route === route && row.revision === 'head',
      );
      const regression =
        median(head.map((row) => row.headingMs)) -
        median(baseline.map((row) => row.headingMs));
      const growth =
        median(head.map((row) => row.bytes)) -
        median(baseline.map((row) => row.bytes));
      const maxCLS = Math.max(...head.map((row) => row.cls));
      report.gates.push({
        route,
        name: 'heading regression <=200ms',
        pass: regression <= 200,
        observed: regression,
      });
      report.gates.push({
        route,
        name: 'CLS <=0.1 over five seconds',
        pass: maxCLS <= 0.1,
        observed: maxCLS,
      });
      report.gates.push({
        route,
        name:
          route === '/' ? 'homepage <=800KB' : 'interior byte growth <=100KB',
        pass:
          route === '/'
            ? Math.max(...head.map((row) => row.bytes)) <= 800000
            : growth <= 100000,
        observed:
          route === '/' ? Math.max(...head.map((row) => row.bytes)) : growth,
      });
    }
    console.log(JSON.stringify(report.gates, null, 2));
    assert.ok(
      report.gates.every((gate) => gate.pass),
      'static route performance gates pass',
    );
  } finally {
    fs.writeFileSync(
      path.join(output, 'performance.json'),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
