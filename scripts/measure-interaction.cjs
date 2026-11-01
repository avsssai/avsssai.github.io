const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4330';
const baselineURL = process.env.BASELINE_URL || 'http://127.0.0.1:4328';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P04/performance';
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const report = {
    browser: browser.version(),
    baseURL,
    baselineURL,
    baselineSHA:
      process.env.BASELINE_SHA || '054c9edd7b7d600e37d80226a545576248b85565',
    headSHA: process.env.HEAD_SHA || 'working-tree',
    profile: {
      viewport: '1440x900',
      cpuThrottle: 4,
      network: 'local preview; no network throttling',
      baseline: 'verified P03 parent, lacks character interaction',
      coldCache: true,
    },
    samples: [],
    active: null,
    gates: [],
  };
  const context = async () => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    return { ctx, page };
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
        const { ctx, page } = await context();
        try {
          assert.equal(
            (await page.goto(url, { waitUntil: 'domcontentloaded' })).status(),
            200,
          );
          await page
            .getByRole('heading', { level: 1 })
            .waitFor({ state: 'visible' });
          report.samples.push({
            run,
            revision,
            headingMs: await page.evaluate(() => performance.now()),
          });
        } finally {
          await ctx.close();
        }
      }
    const { ctx, page } = await context();
    try {
      await page.goto(baseURL);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-stack-experience]')?.dataset
            .stackScene === 'ready',
      );
      await page.waitForTimeout(300);
      const before = await page.locator('*').count();
      await page.evaluate(() => {
        window.__activeIntervals = [];
        let last = null;
        const frame = (time) => {
          const active =
            document.querySelector('[data-stack-experience]')?.dataset.phase !==
            'idle';
          if (active && last !== null)
            window.__activeIntervals.push(time - last);
          last = active ? time : null;
          window.__interactionProbe = requestAnimationFrame(frame);
        };
        window.__interactionProbe = requestAnimationFrame(frame);
      });
      const acknowledgments = [];
      const moves = [];
      for (let i = 1; i <= 20; i++) {
        const activation = await page
          .locator('[data-stack-target="react"]')
          .evaluate((node, i) => {
            Math.random = () => (i % 2 ? 0 : 0.9);
            const start = performance.now();
            node.click();
            const root = document.querySelector('[data-stack-experience]');
            return {
              phase: root.dataset.phase,
              ms: performance.now() - start,
              move: root.dataset.move,
            };
          }, i);
        assert.equal(activation.phase, 'anticipation');
        acknowledgments.push(activation.ms);
        moves.push(activation.move);
        await page.waitForFunction((count) => {
          const root = document.querySelector('[data-stack-experience]');
          return (
            Number(root.dataset.interactions) === count &&
            root.dataset.phase === 'idle'
          );
        }, i);
      }
      await page.waitForTimeout(500);
      const intervals = await page.evaluate(() => {
        cancelAnimationFrame(window.__interactionProbe);
        return window.__activeIntervals;
      });
      const sorted = [...intervals].sort((a, b) => a - b);
      report.active = {
        moves,
        count: 20,
        acknowledgments,
        maxAcknowledgmentMs: Math.max(...acknowledgments),
        intervals,
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        nodesBefore: before,
        nodesAfter: await page.locator('*').count(),
        fragments: await page.locator('[data-kick-crack]').count(),
        animationsAfter: await page
          .locator('[data-stack-experience]')
          .evaluate((node) => node.getAnimations({ subtree: true }).length),
      };
    } finally {
      await ctx.close();
    }
    const delta =
      median(
        report.samples
          .filter((s) => s.revision === 'head')
          .map((s) => s.headingMs),
      ) -
      median(
        report.samples
          .filter((s) => s.revision === 'baseline')
          .map((s) => s.headingMs),
      );
    report.gates = [
      {
        name: 'heading median delta <= 200ms',
        value: delta,
        pass: delta <= 200,
      },
      {
        name: 'activation acknowledgment <= 100ms',
        value: report.active.maxAcknowledgmentMs,
        pass: report.active.maxAcknowledgmentMs <= 100,
      },
      {
        name: 'active rAF p95 <= 33.4ms',
        value: report.active.p95Ms,
        pass: report.active.p95Ms <= 33.4,
      },
      {
        name: 'settled DOM growth <= 5',
        value: report.active.nodesAfter - report.active.nodesBefore,
        pass: report.active.nodesAfter - report.active.nodesBefore <= 5,
      },
      {
        name: 'no retained WAAPI animations',
        value: report.active.animationsAfter,
        pass: report.active.animationsAfter === 0,
      },
    ];
    console.log(JSON.stringify(report.gates, null, 2));
    if (report.gates.some((gate) => !gate.pass)) process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(output, 'performance.json'),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
}
module.exports = { main };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
