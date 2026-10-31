const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4322';
const baselineURL = process.env.BASELINE_URL;
const output =
  process.env.VERIFY_OUTPUT || path.join(os.tmpdir(), 'portfolio-measurements');
const runs = Number(process.env.PERF_RUNS || 5);
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const percentile = (values, fraction) =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.floor(values.length * fraction))
  ];

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const report = {
    browser: browser.version(),
    profile: {
      viewport: '1440x1000',
      cpuThrottle: 4,
      network: 'Local preview. No network throttling.',
      coldCache: true,
    },
    baseURL,
    baselineURL: baselineURL || null,
    runs: [],
    prototype: null,
    gates: [],
  };
  const newPage = async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.addInitScript(() => {
      window.__portfolioCLS = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput) window.__portfolioCLS += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    return { context, page };
  };
  try {
    for (let run = 0; run < runs; run++) {
      for (const [revision, url] of [
        ...(baselineURL ? [['trunk', baselineURL]] : []),
        ['head', baseURL],
      ]) {
        const { context, page } = await newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page
          .getByRole('heading', { level: 1 })
          .waitFor({ state: 'visible' });
        const headingMs = await page.evaluate(() => performance.now());
        await page.waitForLoadState('networkidle');
        const metrics = await page.evaluate(() => ({
          cls: window.__portfolioCLS,
          bytes: performance
            .getEntriesByType('resource')
            .reduce((total, entry) => total + entry.transferSize, 0),
        }));
        report.runs.push({
          run: run + 1,
          revision,
          headingMs: Math.round(headingMs),
          ...metrics,
        });
        await context.close();
      }
    }
    const { context, page } = await newPage();
    await page.goto(`${baseURL}/lab/portfolio/`);
    await page.waitForFunction(
      () => document.querySelector('#playground')?.dataset.scene === 'ready',
      undefined,
      { timeout: 15000 },
    );
    await page.evaluate(() => document.fonts.ready);
    const resources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((entry) => ({
        name: new URL(entry.name).pathname,
        bytes: entry.transferSize,
        duration: entry.duration,
      })),
    );
    const readyMs = await page.evaluate(() => performance.now());
    const documentBytes = await page.evaluate(
      () => performance.getEntriesByType('navigation')[0].transferSize,
    );
    await page.evaluate(() => {
      window.__portfolioIntervals = [];
      window.__portfolioSampling = true;
      let previous = performance.now();
      const frame = (now) => {
        window.__portfolioIntervals.push(now - previous);
        previous = now;
        if (window.__portfolioSampling) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    await page.locator('#target').click();
    await page.waitForFunction(
      () => document.querySelector('#playground')?.dataset.kicks === '1',
    );
    const sample = await page.evaluate(() => {
      window.__portfolioSampling = false;
      const root = document.querySelector('#playground');
      return {
        intervals: window.__portfolioIntervals.slice(2),
        kickMs: Number(root.dataset.lastDuration),
        cls: window.__portfolioCLS,
      };
    });
    const framesBefore = await page
      .locator('#scene')
      .getAttribute('data-frames');
    await page.waitForTimeout(1000);
    const framesAfter = await page
      .locator('#scene')
      .getAttribute('data-frames');
    report.prototype = {
      readyMs: Math.round(readyMs),
      documentBytes,
      totalResourceBytes:
        documentBytes +
        resources.reduce((total, entry) => total + entry.bytes, 0),
      sceneResourceBytes: resources
        .filter((entry) => /scene.*\.js/.test(entry.name))
        .reduce((total, entry) => total + entry.bytes, 0),
      activeP95FrameMs: Number(percentile(sample.intervals, 0.95).toFixed(2)),
      kickMs: sample.kickMs,
      cls: sample.cls,
      idleFrames: Number(framesAfter) - Number(framesBefore),
      resources,
    };
    await page.screenshot({
      path: path.join(output, 'perf-head.png'),
      fullPage: true,
    });
    await context.close();
    const head = median(
      report.runs
        .filter((run) => run.revision === 'head')
        .map((run) => run.headingMs),
    );
    const trunkRuns = report.runs.filter((run) => run.revision === 'trunk');
    const trunk = trunkRuns.length
      ? median(trunkRuns.map((run) => run.headingMs))
      : null;
    const gate = (name, pass, observed) =>
      report.gates.push({ name, pass, observed });
    gate(
      'Homepage heading regression at most 200 ms',
      trunk === null ? null : head - trunk <= 200,
      { trunkMedianMs: trunk, headMedianMs: head },
    );
    gate(
      'Lab resources at most 1 MB transferred',
      report.prototype.totalResourceBytes <= 1_000_000,
      report.prototype.totalResourceBytes,
    );
    gate(
      'Active p95 frame interval at most 33.4 ms',
      report.prototype.activeP95FrameMs <= 33.4,
      report.prototype.activeP95FrameMs,
    );
    gate(
      'Kick completes within 2 seconds',
      report.prototype.kickMs <= 2000,
      report.prototype.kickMs,
    );
    gate(
      'No idle render loop',
      report.prototype.idleFrames === 0,
      report.prototype.idleFrames,
    );
    console.log(
      JSON.stringify(
        { prototype: report.prototype, gates: report.gates },
        null,
        2,
      ),
    );
    assert.ok(
      report.gates.every((gate) => gate.pass !== false),
      'all measured performance gates pass',
    );
  } finally {
    fs.writeFileSync(
      path.join(output, 'perf.json'),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
}

const run =
  process.env.PORTFOLIO_TICKET === 'P03'
    ? require('./measure-stack.cjs').main
    : main;
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
