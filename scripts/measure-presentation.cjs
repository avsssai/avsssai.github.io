const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4331';
const baseline = process.env.BASELINE_URL || 'http://127.0.0.1:4324';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P05/performance';
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--enable-unsafe-swiftshader'],
  });
  const create = async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.addInitScript(() => {
      window.__shifts = 0;
      new PerformanceObserver((list) =>
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) window.__shifts += entry.value;
        }),
      ).observe({ type: 'layout-shift', buffered: true });
      window.__staticHeading = 0;
      window.__nativeWork = 0;
      const probe = () => {
        const h = document.querySelector('h1');
        const a = document.querySelector(
          '.work-link, a[href="/work/"],a[href="/work"]',
        );
        if (
          h?.getBoundingClientRect().height &&
          document.fonts.status === 'loaded'
        )
          window.__staticHeading ||= performance.now();
        if (a?.getBoundingClientRect().height)
          window.__nativeWork ||= performance.now();
        if (!window.__staticHeading || !window.__nativeWork)
          requestAnimationFrame(probe);
      };
      requestAnimationFrame(probe);
    });
    return { context, page };
  };
  const samples = [];
  for (let i = 0; i < 5; i++)
    for (const revision of ['trunk', 'head']) {
      const { context, page } = await create();
      await page.goto(revision === 'trunk' ? baseline : base, {
        waitUntil: 'domcontentloaded',
      });
      if (revision === 'head')
        await page.waitForFunction(() =>
          ['complete', 'failed'].includes(
            document.querySelector('[data-stack-experience]')?.dataset
              .revealState,
          ),
        );
      await page.waitForFunction(
        () => window.__staticHeading > 0 && window.__nativeWork > 0,
      );
      const sample = await page.evaluate(() => {
        const d = document.querySelector('[data-stack-experience]')?.dataset;
        const dismissed = Number(d?.revealDismissedMs || 0);
        return {
          staticHeadingMs: window.__staticHeading,
          nativeWorkMs: window.__nativeWork,
          uncoveredHeadingMs: Math.max(window.__staticHeading, dismissed),
          uncoveredWorkMs: Math.max(window.__nativeWork, dismissed),
          readyToDismissMs: d?.revealReadyMs
            ? dismissed - Number(d.revealReadyMs)
            : null,
          coverLifetimeMs: d?.revealStartedMs
            ? dismissed - Number(d.revealStartedMs)
            : 0,
        };
      });
      await page.waitForTimeout(
        Math.max(0, 5000 - (await page.evaluate(() => performance.now()))),
      );
      samples.push({
        revision,
        index: i,
        ...sample,
        cls: await page.evaluate(() => window.__shifts),
      });
      await context.close();
    }
  const { context, page } = await create();
  await page.route(/\/StackExperience\.[^/]+\.js/, async (route) => {
    await new Promise((r) => setTimeout(r, 7000));
    await route.abort();
  });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]')?.dataset.revealState ===
      'failed',
  );
  const stalled = await page
    .locator('[data-stack-experience]')
    .evaluate(
      (node) =>
        Number(node.dataset.revealDismissedMs) -
        Number(node.dataset.revealStartedMs),
    );
  await context.close();
  const skipContext = await create();
  const skipPage = skipContext.page;
  await skipPage.route(/\/StackExperience\.[^/]+\.js/, async (route) => {
    await new Promise((r) => setTimeout(r, 7000));
    await route.abort();
  });
  await skipPage.goto(base, { waitUntil: 'domcontentloaded' });
  await skipPage.locator('[data-reveal-skip]').waitFor();
  await skipPage.locator('[data-reveal-skip]').evaluate((node) =>
    node.addEventListener(
      'click',
      () => {
        window.__skipAt = performance.now();
      },
      { capture: true, once: true },
    ),
  );
  await skipPage.locator('[data-reveal-skip]').focus();
  await skipPage.keyboard.press('Enter');
  const skipMs = await skipPage
    .locator('[data-stack-experience]')
    .evaluate(
      (node) => Number(node.dataset.revealDismissedMs) - window.__skipAt,
    );
  await skipContext.context.close();
  const active = await create();
  await active.page.addInitScript(() =>
    localStorage.setItem('portfolio-reveal-v1', 'seen'),
  );
  await active.page.goto(base);
  await active.page.evaluate(() => document.fonts.ready);
  const trace = await active.page.evaluate(async () => {
    const button = document.querySelector('[data-letter-demo]');
    const root = document.querySelector('[data-stack-experience]');
    const before = document.querySelectorAll('*').length;
    const intervals = [];
    let tracing = false;
    let last = 0;
    const tick = (t) => {
      if (tracing && root.dataset.letterActive && last)
        intervals.push(t - last);
      last = t;
      if (tracing) requestAnimationFrame(tick);
    };
    tracing = true;
    requestAnimationFrame(tick);
    for (let i = 0; i < 10; i++) {
      button.click();
      await new Promise((r) => setTimeout(r, 530));
    }
    while (button.getAttribute('aria-pressed') === 'true')
      await new Promise((r) => setTimeout(r, 50));
    tracing = false;
    await new Promise((r) => setTimeout(r, 100));
    return {
      intervals,
      nodesBefore: before,
      nodesAfter: document.querySelectorAll('*').length,
      animations: document
        .querySelector('[data-letter-decoration]')
        .getAnimations({ subtree: true }).length,
    };
  });
  await active.context.close();
  trace.intervals.sort((a, b) => a - b);
  trace.p95Ms = trace.intervals[Math.floor(trace.intervals.length * 0.95)];
  const head = samples.filter((x) => x.revision === 'head'),
    trunk = samples.filter((x) => x.revision === 'trunk');
  const summary = {
    trunkUncoveredHeadingMedianMs: median(
      trunk.map((x) => x.uncoveredHeadingMs),
    ),
    headUncoveredHeadingMedianMs: median(head.map((x) => x.uncoveredHeadingMs)),
    headingCostMs:
      median(head.map((x) => x.uncoveredHeadingMs)) -
      median(trunk.map((x) => x.uncoveredHeadingMs)),
    workVisibleCostMs:
      median(head.map((x) => x.uncoveredWorkMs)) -
      median(trunk.map((x) => x.uncoveredWorkMs)),
    maxCLS: Math.max(...samples.map((x) => x.cls)),
    maxReadyToDismissMs: Math.max(...head.map((x) => x.readyToDismissMs)),
    stalledCoverMs: stalled,
    skipMs,
  };
  const gates = [
    ['CLS <= 0.1', summary.maxCLS <= 0.1],
    ['ready-to-dismiss <= 1800ms', summary.maxReadyToDismissMs <= 1800],
    ['stalled cover <= 5000ms', stalled <= 5000],
    ['skip acknowledgment <= 100ms', skipMs <= 100],
    ['letter active rAF p95 <= 33.4ms', trace.p95Ms <= 33.4],
    [
      'no letter DOM growth or retained animations',
      trace.nodesAfter === trace.nodesBefore && trace.animations === 0,
    ],
  ].map(([name, pass]) => ({ name, pass }));
  fs.writeFileSync(
    path.join(output, 'performance.json'),
    JSON.stringify(
      {
        browser: browser.version(),
        base,
        baseline,
        baselineSHA:
          process.env.BASELINE_SHA ||
          '7cf8da1f5eaa3fc5696545c28d190852a3a844b6',
        headSHA: process.env.HEAD_SHA || 'working-tree',
        profile: {
          viewport: '1440x900',
          cpuThrottle: 4,
          network: 'local previews; no network throttle',
          coldCache: true,
          runs: 5,
        },
        metricNotes:
          'Static heading/native work sample HTML availability. Uncovered heading/work wait for whole hero cover removal. The cover is pointer-transparent and never disables native navigation. Heading cost is intentional entrance delay, not a like-for-like static paint regression. Ten demo activations exercise cancellation/restart before one final sequence settles.',
        samples,
        summary,
        trace,
        gates,
      },
      null,
      2,
    ),
  );
  await browser.close();
  assert.ok(
    gates.every((g) => g.pass),
    JSON.stringify(gates),
  );
}
module.exports = { main };
if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
