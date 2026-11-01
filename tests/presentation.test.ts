import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  transitionReveal,
  hasSeenReveal,
  rememberReveal,
  PEEL_MS,
  COVER_LIMIT_MS,
} from '../src/components/portfolio/reveal-state.ts';
import {
  letterEffects,
  letterFrames,
} from '../src/components/portfolio/letter-effects.ts';

test('readiness starts one peel and completes', () => {
  assert.equal(transitionReveal('loading', 'scene-ready'), 'ready');
  assert.equal(transitionReveal('ready', 'peel'), 'revealing');
  assert.equal(transitionReveal('revealing', 'scene-ready'), 'revealing');
  assert.equal(transitionReveal('revealing', 'finish'), 'complete');
  assert.equal(PEEL_MS, 1400);
  assert.ok(COVER_LIMIT_MS < 5000);
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
test('letter registry assigns bounded effects to unique natural word indexes', () => {
  assert.equal(
    new Set(letterEffects.map((spec) => spec.index)).size,
    letterEffects.length,
  );
  assert.equal(new Set(letterEffects.map((spec) => spec.effect)).size, 4);
  for (const spec of letterEffects) {
    assert.ok(spec.index >= 0 && spec.index < 'Imagination'.length);
    const frames = letterFrames(spec.effect);
    assert.equal(frames[0].opacity, 0);
    assert.equal(frames.at(-1)?.opacity, 0);
    assert.ok(
      frames.every((frame) => !('width' in frame) && !('height' in frame)),
    );
  }
});
test('server markup retains complete natural word and no cover or glyph tab stops', () => {
  const word = readFileSync(
    new URL(
      '../src/components/portfolio/ImaginationLetters.astro',
      import.meta.url,
    ),
    'utf8',
  );
  const hero = readFileSync(
    new URL('../src/components/ImaginationHero.astro', import.meta.url),
    'utf8',
  );
  assert.match(word, /data-letter-source>Imagination\.<\/span>/);
  assert.match(word, /data-letter-decoration\s+aria-hidden="true"/);
  assert.doesNotMatch(word, /tabindex/);
  assert.doesNotMatch(hero, /data-reveal-cover/);
  assert.equal((hero.match(/<h1 /g) || []).length, 1);
});
