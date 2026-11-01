import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  transitionReveal,
  hasSeenReveal,
  rememberReveal,
  COVER_LIMIT_MS,
} from '../src/components/portfolio/reveal-state.ts';

test('readiness starts one peel and completes', () => {
  assert.equal(transitionReveal('loading', 'scene-ready'), 'ready');
  assert.equal(transitionReveal('ready', 'peel'), 'revealing');
  assert.equal(transitionReveal('revealing', 'scene-ready'), 'revealing');
  assert.equal(transitionReveal('revealing', 'finish'), 'complete');
  assert.equal(COVER_LIMIT_MS, 8000);
});
for (const state of ['loading', 'ready', 'revealing'] as const) {
  test(`${state}: skip, deadline and error fail open`, () => {
    assert.equal(transitionReveal(state, 'skip'), 'complete');
    assert.equal(transitionReveal(state, 'deadline'), 'failed');
    assert.equal(transitionReveal(state, 'failure'), 'failed');
  });
}
test('terminal states cannot restart on stale readiness or completion', () => {
  for (const state of ['complete', 'failed'] as const) {
    for (const event of [
      'scene-ready',
      'peel',
      'skip',
      'finish',
      'failure',
    ] as const)
      assert.equal(transitionReveal(state, event), state);
  }
});
test('repeat visit marker and blocked storage access', () => {
  const values = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  });
  assert.equal(hasSeenReveal(storage), false);
  rememberReveal(storage);
  assert.equal(hasSeenReveal(storage), true);
  const blocked = () => {
    throw new Error('SecurityError');
  };
  assert.equal(hasSeenReveal(blocked), false);
  assert.doesNotThrow(() => rememberReveal(blocked));
});
test('selected comic artwork is local static vector lettering in both themes', () => {
  for (const name of ['comic', 'comic-dark']) {
    const svg = readFileSync(
      new URL(`../public/art/portfolio/lettering/${name}.svg`, import.meta.url),
      'utf8',
    );
    assert.match(svg, /viewBox="0 0 900 235"/);
    assert.doesNotMatch(svg, /<(animate|animateTransform|script|image)\b/);
    assert.match(svg, /<path/);
  }
});
test('server markup retains complete natural word and no cover or glyph tab stops', () => {
  const word = readFileSync(
    new URL(
      '../src/components/portfolio/StaticLettering.astro',
      import.meta.url,
    ),
    'utf8',
  );
  const hero = readFileSync(
    new URL('../src/components/ImaginationHero.astro', import.meta.url),
    'utf8',
  );
  assert.match(word, /class="lettering-readable">Imagination\.<\/span>/);
  assert.match(word, /aria-hidden="true"/);
  assert.match(hero, /lettering = 'colour'/);
  assert.doesNotMatch(hero, /data-letter-demo|ImaginationLetters/);
  assert.doesNotMatch(word, /tabindex/);
  assert.doesNotMatch(hero, /data-reveal-cover/);
  assert.equal((hero.match(/<h1 /g) || []).length, 1);
});
