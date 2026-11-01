import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bendSheetPoint,
  peelFold,
  settleAxis,
  isDetachPull,
  detachedTip,
  clampTip,
} from '../src/components/portfolio/peel-math.ts';

import { paperLayout } from '../src/components/portfolio/peel-paper.ts';

test('paper decoration uses responsive insets and leaves the monogram inside the seal', () => {
  for (const [width, height, inset] of [
    [1440, 900, 40],
    [390, 844, 24],
    [320, 568, 24],
  ]) {
    const layout = paperLayout(width, height);
    assert.equal(layout.inset, inset);
    assert.ok(
      layout.monogram.x > inset && layout.monogram.x + 54 < width - inset,
    );
    assert.ok(
      layout.monogram.y > inset && layout.monogram.y + 36 < height - inset,
    );
  }
});
test('paper bitmaps remain bounded on high-resolution viewports', () => {
  const layout = paperLayout(3840, 2160);
  assert.equal(layout.textureWidth, 1536);
  assert.ok(layout.textureHeight <= 1536);
  assert.equal(layout.textureWidth / layout.textureHeight, 3840 / 2160);
});

const near = (a: number, b: number, tolerance = 0.00001) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test('the actual sheet corner follows the grab in both axes', () => {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [320, 568],
  ]) {
    for (const tip of [
      { x: width - 36, y: 36 },
      { x: width * 0.5, y: height * 0.4 },
    ]) {
      const fold = peelFold(width, height, tip);
      const corner = bendSheetPoint(width, 0, width, fold);
      near(corner.x, tip.x);
      near(corner.y, tip.y);
      assert.ok(corner.z > 0, 'backside lifts above the page');
    }
  }
});
test('the still-attached film remains fixed on the live page', () => {
  const fold = peelFold(1440, 900, { x: 1000, y: 300 });
  assert.deepEqual(bendSheetPoint(0, 900, 1440, fold), { x: 0, y: 900, z: 0 });
});
test('cylinder position is continuous at both flat-to-curve joins', () => {
  const width = 1000;
  const fold = peelFold(width, 800, { x: 500, y: 300 });
  for (const distance of [0, Math.PI * fold.radius]) {
    const point = (offset: number) => {
      const s = fold.crease - distance + offset;
      return bendSheetPoint(width + s * fold.nx, s * fold.ny, width, fold);
    };
    const a = point(-0.0001),
      b = point(0.0001);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.001);
  }
});
test('releasing halfway does not imply full detachment', () => {
  assert.equal(isDetachPull({ x: 720, y: 350 }, 1440, 900), false);
  assert.equal(isDetachPull({ x: 20, y: 880 }, 1440, 900), true);
});
test('a completed pull moves every corner beyond the bend into the free sheet', () => {
  const tip = detachedTip({ x: 30, y: 850 }, 1440, 900);
  const fold = peelFold(1440, 900, tip);
  for (const [x, y] of [
    [0, 0],
    [1440, 0],
    [0, 900],
    [1440, 900],
  ]) {
    const s = (x - 1440) * fold.nx + y * fold.ny;
    assert.ok(fold.crease - s > Math.PI * fold.radius);
  }
});
test('release spring settles at the exact partial target, not an endpoint', () => {
  let axis = { position: 500, velocity: 1200 };
  assert.ok(
    settleAxis(axis, 500, 0.016).position > 500,
    'initial velocity is preserved',
  );
  for (let i = 0; i < 120; i++) axis = settleAxis(axis, 500, 1 / 60);
  near(axis.position, 500);
  near(axis.velocity, 0);
});
test('the spring is stable and time-step independent', () => {
  const start = { position: 100, velocity: -230 };
  let small = start;
  for (let i = 0; i < 60; i++) small = settleAxis(small, 400, 1 / 60);
  const large = settleAxis(start, 400, 1);
  near(small.position, large.position);
  near(small.velocity, large.velocity);
});
test('tip boundaries keep fold inputs finite and reversible', () => {
  const tip = clampTip({ x: 9000, y: -8000 }, 390, 844);
  assert.deepEqual(tip, { x: 389, y: 1 });
  const fold = peelFold(390, 844, tip);
  assert.ok(Object.values(fold).every(Number.isFinite));
});
