import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLetterWorld } from '../src/components/portfolio/letter-world.ts';
const bounds = { x: 0, y: 0, width: 1000, height: 700 };
const heads = [
  { x: 300, y: 180, width: 250, height: 60 },
  { x: 300, y: 300, width: 380, height: 70 },
];
test('untouched headline blocks remain asleep, with no effect on loose letters', () => {
  const world = createLetterWorld(
    [{ x: 700, y: 500, width: 20, height: 30 }],
    bounds,
    [],
    heads,
  );
  for (let i = 0; i < 120; i++) world.step(null);
  assert.deepEqual(
    world.headlinePoses,
    heads.map((h) => ({ x: h.x, y: h.y, angle: 0, sleeping: true })),
  );
  assert.equal(world.awake, false);
  assert.equal(world.headlineImpacts, 0);
  world.dispose();
});
test('headline contact nudges an intact block within readable position and tilt limits, then sleeps', () => {
  const world = createLetterWorld(
    [{ x: 700, y: 500, width: 20, height: 30 }],
    bounds,
    [],
    heads,
  );
  let displaced = false;
  for (let i = 0; i < 180; i++) {
    world.step({ x: 130 + i * 2, y: 196, radius: 14, vx: 120, vy: 0 });
    world.headlinePoses.forEach((p, index) => {
      const home = heads[index];
      assert.ok(
        Math.abs(p.x - home.x) <= Math.min(12, home.height * 0.18) + 1e-7,
      );
      assert.ok(
        Math.abs(p.y - home.y) <= Math.min(3, home.height * 0.025) + 1e-7,
      );
      assert.ok(Math.abs(p.angle) <= 0.012 + 1e-7);
    });
    if (Math.abs(world.headlinePoses[0].x - 300) > 0.5) displaced = true;
  }
  assert.ok(displaced);
  assert.ok(world.headlineImpacts > 0);
  assert.equal(world.impacts, 0);
  assert.equal(world.headlinePoses[1].x, 300);
  assert.equal(world.poses[0].x, 700);
  for (let i = 0; i < 240; i++) world.step(null);
  assert.equal(world.awake, false);
  assert.ok(Math.abs(world.headlinePoses[0].x - 300) > 0.5);
  world.dispose();
});
test('a character standing inside a bounded headline does not keep the simulation awake', () => {
  const world = createLetterWorld([], bounds, [], [heads[0]]);
  for (let i = 0; i < 85; i++)
    world.step({ x: 130 + i * 2, y: 196, radius: 14, vx: 120, vy: 0 });
  for (let i = 0; i < 300; i++)
    world.step({ x: 298, y: 196, radius: 14, vx: 0, vy: 0 });
  assert.equal(world.awake, false);
  world.dispose();
});
test('headline displacement constraints scale with small-screen typography', () => {
  const encounter = (s: number) => {
    const h = { x: 300 * s, y: 180 * s, width: 250 * s, height: 60 * s };
    const world = createLetterWorld(
      [],
      { x: 0, y: 0, width: 1000 * s, height: 700 * s },
      [],
      [h],
    );
    for (let i = 0; i < 180; i++)
      world.step({
        x: (130 + i * 2) * s,
        y: 196 * s,
        radius: 14 * s,
        vx: 120 * s,
        vy: 0,
      });
    const dx = Math.abs(world.headlinePoses[0].x - h.x) / s;
    world.dispose();
    return dx;
  };
  assert.ok(Math.abs(encounter(1) - encounter(0.6)) < 0.5);
});
