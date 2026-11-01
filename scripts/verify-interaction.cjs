const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const output = process.env.VERIFY_OUTPUT || '../portfolio-evidence/P04/live';
const base = process.env.BASE_URL || 'http://127.0.0.1:4330';
const baseline = process.env.BASELINE_URL || 'http://127.0.0.1:4328';
const hero = '[data-stack-experience]';
const button = '[data-stack-target="react"]';
const phase = (page, value) =>
  page.waitForFunction(
    (value) =>
      document.querySelector('[data-stack-experience]')?.dataset.phase ===
      value,
    value,
  );
const ready = (page) =>
  page.waitForFunction(
    () =>
      document.querySelector('[data-stack-experience]')?.dataset.stackScene ===
      'ready',
  );
const data = (page) =>
  page.locator(hero).evaluate((node) => ({ ...node.dataset }));
const waitKick = (page, count) =>
  page.waitForFunction((count) => {
    const node = document.querySelector('[data-stack-experience]');
    return (
      Number(node?.dataset.interactions) === count &&
      node.dataset.phase === 'idle'
    );
  }, count);
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const results = [];
  const errors = [];
  async function run(name, options, check) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...options,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) =>
      errors.push({ name, error: error.message }),
    );
    try {
      await page.goto(base);
      if (options.reducedMotion !== 'reduce') await ready(page);
      await check(page, context);
      await page.screenshot({ path: path.join(output, `${name}.png`) });
      results.push({
        name,
        pass: true,
        ...((await page.locator(hero).count())
          ? { data: await data(page) }
          : {}),
      });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack });
      await page
        .screenshot({ path: path.join(output, `${name}-failure.png`) })
        .catch(() => {});
    } finally {
      await context.close();
    }
  }
  await run('regression', {}, async (page, context) => {
    const before = await context.newPage();
    await before.goto(baseline);
    assert.equal(
      await before.locator('[data-avatar]').count(),
      0,
      'P03 has no kick',
    );
    await before.locator(button).click();
    await before.locator('.work-link').click();
    await before.waitForURL('**/work/');
    await page.locator(button).click();
    await waitKick(page, 1);
    await page.locator('.work-link').click();
    await page.waitForURL('**/work/');
  });
  await run('impact', {}, async (page) => {
    await page.screenshot({ path: path.join(output, 'perch.png') });
    await page.evaluate(() => {
      Math.random = () => 0;
    });
    await page.locator(button).hover();
    await phase(page, 'impact');
    const contact = await page.evaluate(() => {
      const root = document.querySelector('[data-stack-experience]');
      const leg = document.querySelector('[data-avatar] .front-leg');
      const foot = new DOMPoint(100, 137).matrixTransform(leg.getScreenCTM());
      const box = root.getBoundingClientRect();
      return {
        error: Math.hypot(
          foot.x - box.x - Number(root.dataset.contactX),
          foot.y - box.y - Number(root.dataset.contactY),
        ),
        contacts: Number(root.dataset.contacts),
      };
    });
    assert.ok(contact.error < 4, `foot contact error ${contact.error}`);
    assert.equal(contact.contacts, 1);
    await page
      .locator(hero)
      .evaluate((node) =>
        node
          .getAnimations({ subtree: true })
          .forEach((animation) => animation.pause()),
      );
    await page.screenshot({ path: path.join(output, 'contact.png') });
    await page
      .locator(hero)
      .evaluate((node) =>
        node
          .getAnimations({ subtree: true })
          .forEach((animation) => animation.play()),
      );
    await waitKick(page, 1);
    assert.equal((await data(page)).contacts, '1');
  });
  await run('busy', {}, async (page) => {
    await page.locator(button).click();
    await phase(page, 'travel');
    await page.locator('[data-stack-target]').evaluateAll((nodes) => {
      for (let i = 0; i < 5; i++) for (const node of nodes) node.click();
    });
    await waitKick(page, 1);
    await page.waitForTimeout(250);
    assert.equal((await data(page)).interactions, '1');
    assert.equal((await data(page)).contacts, '1');
  });
  await run(
    'touch',
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    async (page) => {
      await page.evaluate(() => {
        Math.random = () => 0.9;
      });
      await page.locator(button).tap();
      await phase(page, 'impact');
      const handError = await page.evaluate(() => {
        const root = document.querySelector('[data-stack-experience]');
        const arm = document.querySelector('[data-avatar] .front-arm');
        const hand = new DOMPoint(81, 92).matrixTransform(arm.getScreenCTM());
        const box = root.getBoundingClientRect();
        return Math.hypot(
          hand.x - box.x - Number(root.dataset.contactX),
          hand.y - box.y - Number(root.dataset.contactY),
        );
      });
      assert.ok(handError < 4, `punch contact error ${handError}`);
      assert.equal((await data(page)).move, 'punch');
      await page
        .locator(hero)
        .evaluate((node) =>
          node
            .getAnimations({ subtree: true })
            .forEach((animation) => animation.pause()),
        );
      await page.screenshot({ path: path.join(output, 'mobile-contact.png') });
      await page
        .locator(hero)
        .evaluate((node) =>
          node
            .getAnimations({ subtree: true })
            .forEach((animation) => animation.play()),
        );
      await waitKick(page, 1);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    },
  );
  await run('keyboard', {}, async (page) => {
    await page.locator(button).focus();
    await page.keyboard.press('Enter');
    await waitKick(page, 1);
    assert.equal(
      await page
        .locator(button)
        .evaluate((node) => node === document.activeElement),
      true,
    );
  });
  await run('reduced', { reducedMotion: 'reduce' }, async (page) => {
    await page.locator(button).click();
    await page.waitForTimeout(250);
    assert.equal((await data(page)).phase, 'idle');
    assert.equal((await data(page)).interactions, '0');
    assert.equal(await page.locator('canvas').count(), 0);
    assert.equal(
      await page.locator(button).getAttribute('aria-pressed'),
      'true',
    );
  });
  await run('cancel', {}, async (page) => {
    await page.locator(button).click();
    await phase(page, 'travel');
    await page.setViewportSize({ width: 1024, height: 700 });
    await phase(page, 'idle');
    await ready(page);
    await page.locator(button).click();
    await phase(page, 'travel');
    await page.evaluate(() => {
      document.body.style.minHeight = '1600px';
      scrollTo(0, 120);
    });
    await phase(page, 'idle');
    assert.equal(
      await page
        .locator('[data-avatar-perch]')
        .evaluate((node) => getComputedStyle(node).visibility),
      'visible',
    );
    await page.evaluate(() => scrollTo(0, 0));
    await ready(page);
    await page.locator(button).click();
    await phase(page, 'travel');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await phase(page, 'idle');
    assert.equal((await data(page)).interactions, '0');
  });
  await run('navigation', {}, async (page) => {
    for (const targetPhase of ['impact', 'return']) {
      await page.locator(button).click();
      await phase(page, targetPhase);
      await page.goto(`${base}/work/`);
      assert.equal(await page.locator('[data-avatar-layer]').count(), 0);
      await page.goBack();
      await ready(page);
      assert.equal((await data(page)).phase, 'idle');
      assert.equal(await page.locator('[data-avatar]').count(), 1);
    }
  });
  await run('failure', {}, async (page) => {
    await page.locator(button).click();
    await phase(page, 'travel');
    await page.locator('canvas').evaluate((canvas) => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      gl.getExtension('WEBGL_lose_context').loseContext();
    });
    await phase(page, 'idle');
    await page.waitForFunction(
      () =>
        document.querySelector('[data-stack-experience]').dataset.stackScene ===
        'static',
    );
    await page.locator(button).click();
    assert.equal(
      await page.locator(button).getAttribute('aria-pressed'),
      'true',
    );
    assert.equal(
      await page
        .locator('[data-avatar-perch]')
        .evaluate((node) => getComputedStyle(node).visibility),
      'visible',
    );
  });
  await run('target-lost', {}, async (page) => {
    await page.locator(button).click();
    await phase(page, 'travel');
    await page.locator(button).evaluate((node) => node.remove());
    await phase(page, 'idle');
    assert.equal((await data(page)).interactions, '0');
    assert.equal(
      await page
        .locator('[data-avatar-perch]')
        .evaluate((node) => getComputedStyle(node).visibility),
      'visible',
    );
  });
  await run('repeat', {}, async (page) => {
    const before = await page.locator('*').count();
    for (let i = 1; i <= 20; i++) {
      await page.locator(button).evaluate((node, i) => {
        Math.random = () => (i % 2 ? 0 : 0.9);
        node.click();
      }, i);
      await waitKick(page, i);
    }
    await page.waitForTimeout(200);
    assert.ok((await page.locator('*').count()) - before <= 5);
    assert.equal(await page.locator('[data-avatar]').count(), 1);
    assert.equal(
      await page
        .locator('[data-kick-crack]')
        .evaluate((node) => getComputedStyle(node).opacity),
      '0',
    );
    assert.equal((await data(page)).contacts, '20');
    assert.equal((await data(page)).kicks, '10');
    assert.equal((await data(page)).punches, '10');
    assert.equal(
      await page
        .locator(hero)
        .evaluate((node) => node.getAnimations({ subtree: true }).length),
      0,
    );
  });
  await browser.close();
  fs.writeFileSync(
    path.join(output, 'results.json'),
    JSON.stringify({ base, baseline, results, errors }, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        passed: results.filter((item) => item.pass).length,
        total: results.length,
        failures: results.filter((item) => !item.pass),
        errors,
      },
      null,
      2,
    ),
  );
  if (errors.length || results.some((item) => !item.pass)) process.exitCode = 1;
}
module.exports = { main };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
