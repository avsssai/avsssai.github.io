const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function probeVisibility(url, screenshot) {
  const profile = fs.mkdtempSync(
    path.join(os.tmpdir(), 'portfolio-visibility-'),
  );
  const chrome = spawn(
    process.env.CHROME_PATH ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-pipe',
      '--enable-unsafe-swiftshader',
      '--disable-features=CalculateNativeWinOcclusion',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
  );
  let next = 0;
  let buffer = '';
  const pending = new Map();
  chrome.stdio[4].on('data', (data) => {
    buffer += data;
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id) {
        pending.get(message.id)?.(message);
        pending.delete(message.id);
      }
    }
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++next;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      pending.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      });
      chrome.stdio[3].write(
        JSON.stringify({ id, method, params, sessionId }) + '\0',
      );
    });
  }
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    const { targetId: front } = await send('Target.createTarget', {
      url: 'about:blank',
    });
    await send('Target.activateTarget', { targetId: front });
    const { targetId } = await send('Target.createTarget', {
      url: 'about:blank',
      background: true,
    });
    const { sessionId } = await send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    const evaluate = async (expression) => {
      const result = await send(
        'Runtime.evaluate',
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      );
      if (result.exceptionDetails)
        throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async (expression) => {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(expression)) return;
        await pause(100);
      }
      throw new Error(
        `Native Chrome condition timed out: ${expression}; ${JSON.stringify(await evaluate(`({visibility:document.visibilityState,hidden:document.hidden,width:innerWidth,height:innerHeight,root:{...document.querySelector('[data-stack-experience]')?.dataset}})`))}`,
      );
    };
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setCPUThrottlingRate', { rate: 4 }, sessionId);
    await send(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: `window.__stackDraws=0;for(const name of ['WebGLRenderingContext','WebGL2RenderingContext']){const p=window[name]?.prototype;if(!p)continue;for(const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=p[method];if(original)p[method]=function(...args){window.__stackDraws++;return original.apply(this,args);};}}`,
      },
      sessionId,
    );
    await send('Page.navigate', { url }, sessionId);
    await wait(`document.querySelector('[data-stack-experience]') !== null`);
    assert.equal(
      await evaluate('document.hidden'),
      true,
      'native background target is really hidden',
    );
    await pause(700);
    assert.equal(
      await evaluate(`document.querySelectorAll('canvas').length`),
      0,
      'hidden initial page does not start GPU scene',
    );
    await send('Target.activateTarget', { targetId });
    await wait(
      `!document.hidden && document.querySelector('[data-stack-experience]').dataset.stackScene === 'ready'`,
    );
    const beforeHide = await evaluate('window.__stackDraws');
    await send('Target.activateTarget', { targetId: front });
    await wait('document.hidden');
    await pause(500);
    const before = await evaluate('window.__stackDraws');
    await pause(5000);
    const after = await evaluate('window.__stackDraws');
    const nativeVisibility = await evaluate(
      `({state:document.visibilityState,hidden:document.hidden,ownHidden:Object.hasOwn(document,'hidden'),getter:String(Object.getOwnPropertyDescriptor(Document.prototype,'hidden').get)})`,
    );
    assert.equal(nativeVisibility.hidden, true);
    assert.equal(nativeVisibility.ownHidden, false);
    assert.match(nativeVisibility.getter, /native code/);
    assert.equal(
      after,
      before,
      'no real draw calls over five hidden seconds after settling',
    );
    await send('Target.activateTarget', { targetId });
    await wait(
      `!document.hidden && document.querySelector('[data-stack-experience]').dataset.stackScene === 'ready'`,
    );
    const afterResume = await evaluate('window.__stackDraws');
    assert.ok(afterResume > after, 'real rendering resumes on foreground');
    if (screenshot) {
      const image = await send(
        'Page.captureScreenshot',
        { format: 'png' },
        sessionId,
      );
      fs.writeFileSync(screenshot, Buffer.from(image.data, 'base64'));
    }
    return {
      nativeVisibility,
      beforeHide,
      before,
      after,
      hiddenDraws: after - before,
      hiddenIntervalMs: 5000,
      settlingMs: 500,
      afterResume,
      cpuThrottle: 4,
    };
  } finally {
    await send('Browser.close').catch(() => {});
    if (chrome.exitCode === null)
      await Promise.race([
        new Promise((resolve) => chrome.once('exit', resolve)),
        pause(5000),
      ]);
    if (chrome.exitCode === null) chrome.kill();
    await pause(100);
    fs.rmSync(profile, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  }
}
module.exports = { probeVisibility };
