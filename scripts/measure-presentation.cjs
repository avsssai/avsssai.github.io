const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4331';
const output =
  process.env.VERIFY_OUTPUT || '../portfolio-evidence/P05/corner-performance';
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.floor(values.length * p))
  ] || 0;
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__peelMeasure = { costs: [], gaps: [], cls: 0 };
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) window.__peelMeasure.cls += entry.value;
      }),
    ).observe({ type: 'layout-shift', buffered: true });
    const original = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      original((time) => {
        const before = Number(
          document.querySelector('[data-stack-experience]')?.dataset
            .peelFrames || 0,
        );
        const started = performance.now();
        callback(time);
        const after = Number(
          document.querySelector('[data-stack-experience]')?.dataset
            .peelFrames || 0,
        );
        if (before && after > before)
          window.__peelMeasure.costs.push(performance.now() - started);
      });
    let previous = 0;
    const cadence = (time) => {
      const motion = document.querySelector('[data-stack-experience]')?.dataset
        .peelMotion;
      if (['dragging', 'settling'].includes(motion)) {
        if (previous) window.__peelMeasure.gaps.push(time - previous);
        previous = time;
      } else previous = 0;
      original(cadence);
    };
    original(cadence);
  });
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-peel-grip]').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    const nodesBefore = await page.locator('*').count();
    for (let action = 0; action < 6; action++) {
      const box = await page.locator('[data-peel-grip]').boundingBox();
      const start = { x: box.x + 28, y: box.y + 28 };
      const target = action % 2 ? { x: 1060, y: 190 } : { x: 730, y: 350 };
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      for (let step = 1; step <= 40; step++) {
        await page.mouse.move(
          start.x + ((target.x - start.x) * step) / 40,
          start.y + ((target.y - start.y) * step) / 40,
        );
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-stack-experience]').dataset
            .peelMotion === 'held',
      );
    }
    const beforeIdle = await page
      .locator('[data-stack-experience]')
      .getAttribute('data-peel-frames');
    await page.waitForTimeout(1200);
    const idleDraws =
      Number(
        await page
          .locator('[data-stack-experience]')
          .getAttribute('data-peel-frames'),
      ) - Number(beforeIdle);
    const nodesAfter = await page.locator('*').count();
    const measurements = await page.evaluate(() => window.__peelMeasure);
    await page.locator('[data-reveal-skip]').focus();
    await page.locator('[data-reveal-skip]').evaluate((node) =>
      node.addEventListener(
        'click',
        () => {
          window.__peelSkipAt = performance.now();
        },
        { once: true, capture: true },
      ),
    );
    await page.keyboard.press('Enter');
    const skipMs = await page
      .locator('[data-stack-experience]')
      .evaluate(
        (node) => Number(node.dataset.revealDismissedMs) - window.__peelSkipAt,
      );
    const retainedCovers = await page
      .locator('[data-reveal-cover], [data-peel-grip]')
      .count();
    const summary = {
      cls: measurements.cls,
      gestureFrames: measurements.costs.length,
      drawCallbackP95Ms: percentile(measurements.costs, 0.95),
      activeRafP95Ms: percentile(measurements.gaps, 0.95),
      idleDraws,
      nodesBefore,
      nodesAfter,
      skipMs,
      retainedCovers,
    };
    const gates = [
      ['CLS <= 0.1', summary.cls <= 0.1],
      [
        'gesture draw callback p95 <= 34ms',
        summary.drawCallbackP95Ms <= 34 && summary.gestureFrames >= 100,
      ],
      ['idle peel draws = 0', idleDraws === 0],
      ['no gesture DOM growth', nodesAfter === nodesBefore],
      ['keyboard skip acknowledgment <= 100ms', skipMs <= 100],
      [
        'no retained cover nodes or page errors',
        retainedCovers === 0 && errors.length === 0,
      ],
    ].map(([name, pass]) => ({ name, pass }));
    fs.writeFileSync(
      path.join(output, 'performance.json'),
      JSON.stringify(
        {
          base,
          source: process.env.HEAD_SHA || 'local working-tree',
          browser: browser.version(),
          profile: {
            viewport: '1440x900',
            cpuThrottle: 4,
            actions: 6,
            network: 'local',
            renderer: 'Chrome with SwiftShader allowed',
          },
          notes:
            'Focused active-gesture smoke, not a cold-load benchmark or hardware FPS/GPU timing. Draw callback includes geometry/Three submission plus grip/debug DOM writes; active rAF is a cadence proxy. User-controlled partial cover lifetime is intentionally unbounded, so old automatic visibility-delay gates do not apply. Cadence is reported, not certified as 60fps.',
          summary,
          gates,
          errors,
        },
        null,
        2,
      ),
    );
    assert.ok(
      gates.every((gate) => gate.pass),
      JSON.stringify(gates),
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
module.exports = { main };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
