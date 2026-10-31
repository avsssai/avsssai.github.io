import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import {
  heroPoint,
  sameLayout,
  stackItems,
} from '../src/components/portfolio/stack-items.ts';

test('registry has seven unique, complete records and real fallback assets', () => {
  assert.deepEqual(stackItems.map((item) => item.id).sort(), [
    'astro',
    'fastapi',
    'gcp',
    'github',
    'python',
    'react',
    'typescript',
  ]);
  assert.equal(new Set(stackItems.map((item) => item.id)).size, 7);
  for (const item of stackItems) {
    assert.ok(item.label && item.geometry);
    assert.match(item.colour, /^#[0-9a-f]{6}$/i);
    assert.ok(existsSync(`public${item.fallbackAsset}`));
    for (const value of Object.values(item.desktopAnchor))
      assert.ok(value > 0 && value < 1);
    assert.ok(item.mobileAnchor.column >= 1 && item.mobileAnchor.column <= 4);
    assert.ok(item.mobileAnchor.row >= 1 && item.mobileAnchor.row <= 2);
  }
});

test('camera projection maps both axes into hero coordinates including offsets', () => {
  assert.deepEqual(
    heroPoint(
      { x: 0, y: 0 },
      { x: 30, y: 70, width: 400, height: 200 },
      { x: 10, y: 20 },
    ),
    { x: 220, y: 150 },
  );
  assert.deepEqual(
    heroPoint(
      { x: -1, y: 1 },
      { x: 30, y: 70, width: 400, height: 200 },
      { x: 10, y: 20 },
    ),
    { x: 20, y: 50 },
  );
  assert.deepEqual(
    heroPoint(
      { x: 1, y: -1 },
      { x: 30, y: 70, width: 400, height: 200 },
      { x: 10, y: 20 },
    ),
    { x: 420, y: 250 },
  );
});

test('projection recomputes at rotated/resized dimensions without stale coordinates', () => {
  const point = { x: 0.5, y: -0.5 };
  const desktop = heroPoint(
    point,
    { x: 0, y: 0, width: 1440, height: 900 },
    { x: 0, y: 0 },
  );
  const mobile = heroPoint(
    point,
    { x: 0, y: 0, width: 390, height: 650 },
    { x: 0, y: 0 },
  );
  assert.deepEqual(desktop, { x: 1080, y: 675 });
  assert.deepEqual(mobile, { x: 292.5, y: 487.5 });
  assert.notDeepEqual(mobile, desktop);
});

test('unchanged hero-local anchors do not revise the scene on scroll', () => {
  const layout = {
    revision: 1,
    width: 1440,
    height: 700,
    targets: [{ id: 'react' as const, centre: { x: 500, y: 300 }, size: 80 }],
  };
  assert.ok(sameLayout(layout, { ...layout, revision: 2 }));
  assert.ok(!sameLayout(layout, { ...layout, width: 390 }));
  assert.ok(
    !sameLayout(layout, {
      ...layout,
      targets: [{ ...layout.targets[0], centre: { x: 501, y: 300 } }],
    }),
  );
  assert.ok(!sameLayout(layout, undefined));
});
