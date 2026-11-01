import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLetterWorld } from '../src/components/portfolio/letter-world.ts';

const bounds = { x: 0, y: 0, width: 900, height: 500 };
const shapes = [
  { x: 200, y: 200, width: 25, height: 40 },
  { x: 232, y: 200, width: 25, height: 40 },
  { x: 600, y: 200, width: 25, height: 40 },
];
test('uncontacted letters stay in their original sleeping pose', () => {
  const world = createLetterWorld(shapes, bounds);
  for (let i = 0; i < 60; i++) world.step(null);
  assert.deepEqual(
    world.poses.map((b) => ({
      x: b.x,
      y: b.y,
      angle: b.angle,
      sleeping: b.sleeping,
    })),
    shapes.map((b) => ({ x: b.x, y: b.y, angle: 0, sleeping: true })),
  );
  assert.equal(world.awake, false);
  assert.equal(world.impacts, 0);
  world.dispose();
});
test('character contact rotates a glyph, transfers contact to its neighbour, and leaves a remote glyph alone', () => {
  const world = createLetterWorld(shapes, bounds);
  for (let i = 0; i < 80; i++)
    world.step({ x: 130 + i * 2, y: 204, radius: 14, vx: 120, vy: 0 });
  assert.ok(world.poses[0].x > 210);
  assert.ok(world.poses[1].x > 242);
  assert.ok(Math.abs(world.poses[0].angle) > 0.05);
  assert.equal(world.poses[2].x, 600);
  assert.equal(world.poses[2].angle, 0);
  assert.ok(world.impacts > 0);
  world.dispose();
});
test('a protected copy/link wall stops a contacted glyph from coasting through it', () => {
  const wall = { x: 265, y: 200, width: 20, height: 180 };
  const encounter = (protectedBoxes: typeof shapes) => {
    const world = createLetterWorld([shapes[0]], bounds, protectedBoxes);
    for (let i = 0; i < 60; i++)
      world.step({ x: 130 + i * 1.5, y: 204, radius: 14, vx: 90, vy: 0 });
    for (let i = 0; i < 240; i++) world.step(null);
    const pose = world.poses[0];
    world.dispose();
    return pose;
  };
  const free = encounter([]),
    stopped = encounter([wall]);
  assert.ok(
    free.x > stopped.x + 3,
    'the protected wall must materially change the encounter',
  );
  const extent =
    ((25 * 0.88) / 2) * Math.abs(Math.cos(stopped.angle)) +
    ((40 * 0.9) / 2) * Math.abs(Math.sin(stopped.angle));
  assert.ok(stopped.x + extent <= wall.x - wall.width / 2 + 1);
});
test('letter speeds stay proportional to the contact body even with extreme input velocity', () => {
  const world = createLetterWorld(shapes, bounds);
  for (let i = 0; i < 80; i++) {
    world.step({ x: 130 + i * 2, y: 205, radius: 14, vx: 20000, vy: 0 });
    world.poses.forEach((body) => {
      assert.ok(body.speed <= 14 * 12 + 1e-6);
      assert.ok(Math.abs(body.angularSpeed) <= 2.5 + 1e-6);
    });
  }
  for (let i = 0; i < 240; i++) {
    world.step(null);
    world.poses.forEach((body) => assert.ok(body.speed <= 14 * 12 + 1e-6));
  }
  world.dispose();
});
test('the same normalized encounter scales down with the character and typography', () => {
  const encounter = (scale: number) => {
    const world = createLetterWorld(
      shapes.map((b) => ({
        x: b.x * scale,
        y: b.y * scale,
        width: b.width * scale,
        height: b.height * scale,
      })),
      { x: 0, y: 0, width: 900 * scale, height: 500 * scale },
    );
    for (let i = 0; i < 80; i++)
      world.step({
        x: (130 + i * 2) * scale,
        y: 204 * scale,
        radius: 14 * scale,
        vx: 120 * scale,
        vy: 0,
      });
    for (let i = 0; i < 200; i++) world.step(null);
    const moved = (world.poses[0].x - 200 * scale) / scale;
    world.dispose();
    return moved;
  };
  assert.ok(Math.abs(encounter(1) - encounter(0.6)) < 8);
});
test('after contact ends the bodies settle, sleep, and retain their displaced positions', () => {
  const world = createLetterWorld(shapes, bounds);
  for (let i = 0; i < 80; i++)
    world.step({ x: 130 + i * 2, y: 204, radius: 14, vx: 120, vy: 0 });
  for (let i = 0; i < 240; i++) world.step(null);
  assert.equal(world.awake, false);
  assert.ok(world.poses[0].x > 220);
  const rest = world.poses;
  for (let i = 0; i < 60; i++) world.step(null);
  assert.deepEqual(world.poses, rest);
  world.dispose();
});
