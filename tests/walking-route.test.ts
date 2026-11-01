import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  walkingRoute,
  routeAt,
  routeSeparation,
} from '../src/components/portfolio/walking-route.ts';
const bounds = { x: 0, y: 0, width: 600, height: 600 };
const start = { x: 40, y: 40 },
  end = { x: 520, y: 520 };
const obstacle = { x: 180, y: 120, width: 230, height: 300 };
test('a legal endpoint next to prose connects even when its rounded grid cell is occupied', () => {
  const box = { x: 40, y: 40, width: 20, height: 20 };
  const end = { x: 39.9, y: 50 };
  const route = walkingRoute(
    { x: 10, y: 50 },
    end,
    { x: 0, y: 0, width: 100, height: 100 },
    [box],
  );
  assert.ok(route);
  assert.deepEqual(routeAt(route, 1), end);
  for (let i = 0; i <= 500; i++) {
    const p = routeAt(route, i / 500);
    assert.ok(!(p.x > 40 && p.x < 60 && p.y > 40 && p.y < 60));
  }
});
test('walking routes preserve endpoints and finite arc-length sampling', () => {
  const route = walkingRoute(start, end, bounds, [obstacle])!;
  assert.ok(route);
  assert.deepEqual(routeAt(route, 0), start);
  assert.deepEqual(routeAt(route, 1), end);
  assert.ok(route.length > Math.hypot(480, 480));
  for (let i = 0; i <= 1000; i++) {
    const p = routeAt(route, i / 1000);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.x >= 0 && p.x <= 600 && p.y >= 0 && p.y <= 600);
    assert.ok(!(p.x > 180 && p.x < 410 && p.y > 120 && p.y < 420));
  }
});
test('return trip uses a distinct corridor, not reversed playback', () => {
  const out = walkingRoute(start, end, bounds, [obstacle])!;
  const back = walkingRoute(end, start, bounds, [obstacle], true, out)!;
  assert.ok(back);
  assert.deepEqual(routeAt(back, 1), start);
  assert.ok(
    [0.2, 0.4, 0.6, 0.8].some(
      (t) =>
        Math.hypot(
          routeAt(out, t).x - routeAt(back, 1 - t).x,
          routeAt(out, t).y - routeAt(back, 1 - t).y,
        ) > 20,
    ),
  );
});
test('blocked or out-of-bounds routes fail closed rather than clipping', () => {
  assert.equal(walkingRoute(start, end, bounds, [bounds]), null);
  assert.equal(walkingRoute({ x: -5, y: 3 }, end, bounds, []), null);
});
test('small phone corridor stays inside viewport with no random route changes', () => {
  const b = { x: 24, y: 60, width: 272, height: 640 };
  const a = { x: 45, y: 72 },
    z = { x: 280, y: 620 };
  const blocks = [{ x: 80, y: 260, width: 150, height: 200 }];
  const first = walkingRoute(a, z, b, blocks)!;
  assert.ok(first);
  assert.deepEqual(walkingRoute(a, z, b, blocks), first);
  first.points.forEach((p) =>
    assert.ok(p.x >= 24 && p.x <= 296 && p.y >= 60 && p.y <= 700),
  );
});

test('390px GitHub regression: narrow peripheral corridor and exact corners remain routable', () => {
  const b = { x: 18, y: -73.4, width: 354, height: 794.4 };
  const a = { x: 41.5, y: -55.3 },
    z = { x: 173.31334877761014, y: 635.8973248762392 };
  const blocks = [
    { x: 91.159375, y: 411.015625, width: 207.68125, height: 91.6 },
    { x: 118.58125, y: 196.96875, width: 152.8375, height: 100.6 },
    { x: 75.20625, y: 236.578125, width: 239.5875, height: 108.6 },
    { x: 157.815625, y: 304.171875, width: 74.36875, height: 63.6 },
    { x: 52.284375, y: 316.4375, width: 285.43125, height: 121.6 },
    { x: 31.561875, y: 326.4375, width: 326.87625, height: 102.178125 },
  ];
  const out = walkingRoute(a, z, b, blocks)!;
  assert.ok(out);
  const back = walkingRoute(z, a, b, blocks, true, out)!;
  assert.ok(back);
  assert.ok(routeSeparation(out, back) >= 6);
  for (const route of [out, back])
    for (let i = 0; i <= 10000; i++) {
      const p = routeAt(route, i / 10000);
      assert.ok(
        !blocks.some(
          (r) =>
            p.x > r.x &&
            p.x < r.x + r.width &&
            p.y > r.y &&
            p.y < r.y + r.height,
        ),
      );
    }
});

test('an exact reversed route is not accepted as a distinct homeward trip', () => {
  const route = walkingRoute(start, end, bounds, [])!;
  const reversed = {
    points: [...route.points].reverse(),
    distances: route.distances.map(
      (_, i) => route.length - route.distances[route.distances.length - 1 - i],
    ),
    length: route.length,
  };
  assert.ok(routeSeparation(route, reversed) < 1e-8);
});
