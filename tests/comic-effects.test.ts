import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  impactWord,
  placeComic,
} from '../src/components/portfolio/comic-effects.ts';

test('comic word matches the fixed active move', () => {
  assert.equal(impactWord('kick'), 'KACHOW!');
  assert.equal(impactWord('punch'), 'KAPOW!');
});

test('comic placement clears heading and navigation when a local opening exists', () => {
  const point = placeComic(
    { x: 300, y: 200 },
    { width: 170, height: 110 },
    { x: 0, y: 0, width: 390, height: 844 },
    [
      { x: 20, y: 20, width: 350, height: 90 },
      { x: 40, y: 320, width: 310, height: 260 },
    ],
  );
  assert.ok(point.x >= 14 && point.x + 170 <= 376);
  assert.ok(point.y >= 110 && point.y + 110 <= 320);
});

test('takeoff puff can snap below a full-width mobile navigation row', () => {
  const point = placeComic(
    { x: 45, y: 62 },
    { width: 134, height: 111 },
    { x: 0, y: 0, width: 390, height: 844 },
    [
      { x: 16, y: 8, width: 165, height: 54 },
      { x: 16, y: 63, width: 358, height: 44 },
    ],
  );
  assert.ok(point.y >= 121);
});

for (const width of [320, 390, 768, 1440]) {
  test(`comic burst stays in the viewport at ${width}px, including a negative hero origin`, () => {
    const viewport = { x: 0, y: -110, width, height: 568 };
    for (const anchor of [
      { x: 0, y: -110 },
      { x: width, y: 458 },
      { x: width / 2, y: 200 },
    ]) {
      const point = placeComic(
        anchor,
        { width: 180, height: 120 },
        viewport,
        [],
      );
      assert.ok(point.x >= 14 && point.x + 180 <= width - 14);
      assert.ok(point.y >= -96 && point.y + 120 <= 444);
    }
  });
}
