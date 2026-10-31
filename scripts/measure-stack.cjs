const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { ready, instrument } = require('./verify-stack.cjs');
const { probeVisibility } = require('./native-visibility.cjs');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4328';
const baselineURL = process.env.BASELINE_URL || 'http://127.0.0.1:4327';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P03/performance';
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const p95 = (values) =>
  values.length
    ? [...values].sort((a, b) => a - b)[
        Math.min(values.length - 1, Math.floor(values.length * 0.95))
      ]
    : null;
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ['--enable-unsafe-swiftshader'],
  });
  const report = {
    browser: browser.version(),
    baseURL,
    baselineURL,
    baselineSHA: process.env.BASELINE_SHA || null,
    headSHA: process.env.HEAD_SHA || null,
    profile: {
      viewport: '1440x900',
      cpuThrottle: 4,
      coldCache: true,
      network:
        'Local preview, no network throttle; HTTP compressed transferSize',
      scene: 'Static demand rendering; no decorative idle animation',
    },
    samples: [],
    active: null,
    hidden: null,
    gates: [],
  };
  try {
    for (let run = 0; run < 5; run++)
      for (const [revision, url] of run % 2
        ? [
            ['head', baseURL],
            ['baseline', baselineURL],
          ]
        : [
            ['baseline', baselineURL],
            ['head', baseURL],
          ]) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          colorScheme: 'light',
        });
        await instrument(context);
        try {
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await cdp.send('Network.enable');
          await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
          await page.addInitScript(() => {
            window.__stackCLS = 0;
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries())
                if (!entry.hadRecentInput) window.__stackCLS += entry.value;
            }).observe({ type: 'layout-shift', buffered: true });
          });
          assert.equal(
            (await page.goto(url, { waitUntil: 'domcontentloaded' })).status(),
            200,
          );
          await page
            .getByRole('heading', { level: 1 })
            .waitFor({ state: 'visible' });
          const headingMs = await page.evaluate(() => performance.now());
          if (revision === 'head') await ready(page);
          await page.waitForTimeout(
            Math.max(0, 5000 - (await page.evaluate(() => performance.now()))),
          );
          const sample = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const resources = performance
              .getEntriesByType('resource')
              .map((entry) => ({
                name: new URL(entry.name).pathname,
                bytes: entry.transferSize,
                start: entry.startTime,
              }));
            const heavyStart =
              resources.find((entry) =>
                /StackExperience.*\.js/.test(entry.name),
              )?.start ?? Infinity;
            const deferred = resources.filter(
              (entry) =>
                entry.start >= heavyStart && entry.name.endsWith('.js'),
            );
            return {
              readyMs:
                Number(
                  document.querySelector('[data-stack-experience]')?.dataset
                    .stackReadyMs,
                ) || null,
              canvasCount: document.querySelectorAll('canvas').length,
              cls: window.__stackCLS,
              initialBytes:
                navigation.transferSize +
                resources
                  .filter((entry) => !deferred.includes(entry))
                  .reduce((sum, entry) => sum + entry.bytes, 0),
              attachmentBytes: deferred
                .filter((entry) => /StackExperience/.test(entry.name))
                .reduce((sum, entry) => sum + entry.bytes, 0),
              sharedRendererBytes: deferred
                .filter((entry) => !/StackExperience/.test(entry.name))
                .reduce((sum, entry) => sum + entry.bytes, 0),
              deferredBytes: deferred.reduce(
                (sum, entry) => sum + entry.bytes,
                0,
              ),
              totalBytes:
                navigation.transferSize +
                resources.reduce((sum, entry) => sum + entry.bytes, 0),
              resources,
            };
          });
          report.samples.push({ run: run + 1, revision, headingMs, ...sample });
          console.log(
            `${run + 1} ${revision}: heading ${headingMs.toFixed(1)}ms, scene ${sample.readyMs?.toFixed(1)}ms, deferred ${sample.deferredBytes}B`,
          );
        } finally {
          await context.close();
        }
      }
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await instrument(context);
    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(baseURL);
      await ready(page);
      const trace = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const root = document.querySelector('[data-stack-experience]');
            const initialStyle = root.style.width;
            const intervals = [];
            const started = performance.now();
            let previous = started;
            let step = -1;
            window.__stackRenderTimes = [];
            const drawsBefore = window.__stackDraws;
            const tick = (now) => {
              intervals.push(now - previous);
              previous = now;
              const next = Math.floor((now - started) / 250);
              if (next !== step) {
                step = next;
                root.style.width = innerWidth - (step % 2) * 2 + 'px';
              }
              if (now - started < 10000) requestAnimationFrame(tick);
              else {
                root.style.width = initialStyle;
                resolve({
                  browserIntervals: intervals.slice(2),
                  renderTimes: window.__stackRenderTimes,
                  drawCalls: window.__stackDraws - drawsBefore,
                  durationMs: now - started,
                });
              }
            };
            requestAnimationFrame(tick);
          }),
      );
      await ready(page);
      await page.waitForTimeout(500);
      const before = await page.evaluate(() => window.__stackDraws);
      await page.waitForTimeout(1000);
      const idleDraws =
        (await page.evaluate(() => window.__stackDraws)) - before;
      report.active = {
        workload:
          'Ten seconds of real hero-width changes every 250ms under 4x CPU; browser presentation RAF intervals sampled during actual scene redraw work. On-demand draw spacing is reported separately, not called animation FPS.',
        durationMs: trace.durationMs,
        browserP95FrameMs: p95(trace.browserIntervals),
        browserIntervals: trace.browserIntervals,
        onDemandRenderIntervals: trace.renderTimes
          .slice(1)
          .map((time, i) => time - trace.renderTimes[i]),
        drawCalls: trace.drawCalls,
        renderCount: trace.renderTimes.length,
        idleDraws,
      };
      await page.screenshot({
        path: path.join(output, 'perf-head.png'),
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
  try {
    report.hidden = await probeVisibility(
      baseURL,
      path.join(output, 'native-resumed.png'),
    );
    const heads = report.samples.filter((row) => row.revision === 'head');
    const baseline = report.samples.filter(
      (row) => row.revision === 'baseline',
    );
    const gate = (name, pass, observed) =>
      report.gates.push({ name, pass, observed });
    const regression =
      median(heads.map((row) => row.headingMs)) -
      median(baseline.map((row) => row.headingMs));
    gate('heading median regression <=200ms', regression <= 200, regression);
    gate(
      'baseline has no equivalent scene',
      baseline.every((row) => row.canvasCount === 0),
      baseline.map((row) => row.canvasCount),
    );
    gate(
      'all deferred enhancement resources <=1MB',
      heads.every((row) => row.deferredBytes <= 1000000),
      Math.max(...heads.map((row) => row.deferredBytes)),
    );
    gate(
      'first usable scene frame <=5s',
      heads.every((row) => row.readyMs > 0 && row.readyMs <= 5000),
      Math.max(...heads.map((row) => row.readyMs)),
    );
    gate(
      'active browser presentation p95 <=33.4ms during scene resize workload',
      report.active.browserP95FrameMs <= 33.4,
      report.active.browserP95FrameMs,
    );
    gate(
      'zero demand-rendered idle draw calls',
      report.active.idleDraws === 0,
      report.active.idleDraws,
    );
    gate(
      'zero actual hidden draws after 500ms settling for five seconds',
      report.hidden.hiddenDraws === 0,
      report.hidden.hiddenDraws,
    );
    gate(
      'CLS <=.1 through five seconds',
      heads.every((row) => row.cls <= 0.1),
      Math.max(...heads.map((row) => row.cls)),
    );
    console.log(JSON.stringify(report.gates, null, 2));
    assert.ok(
      report.gates.every((gate) => gate.pass),
      'P03 performance gates',
    );
  } finally {
    fs.writeFileSync(
      path.join(output, 'performance.json'),
      JSON.stringify(report, null, 2),
    );
  }
}
module.exports = { main };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
