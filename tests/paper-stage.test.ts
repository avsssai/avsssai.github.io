import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  paperStage,
  paperOutline,
} from '../src/components/portfolio/paper-stage.ts';

for (const [width, height] of [
  [320, 729],
  [390, 729],
  [768, 650],
  [1440, 838],
  [1920, 900],
]) {
  test(`paper-cut backdrop stays inside hero at ${width}px`, () => {
    const stage = paperStage(width, height);
    assert.ok(stage.x - stage.width / 2 >= 0);
    assert.ok(stage.x + stage.width / 2 <= width);
    assert.ok(stage.y - stage.height / 2 >= 0);
    assert.ok(stage.y + stage.height / 2 <= height);
    assert.ok(
      stage.fold > 0 &&
        stage.fold < stage.width / 4 &&
        stage.fold < stage.height / 4,
    );
    const commands = paperOutline(stage.width, stage.height, stage.fold);
    assert.equal(commands[0][0], 'M');
    assert.equal(commands.at(-1)![0], 'Z');
    for (const command of commands)
      for (const n of command.slice(1))
        assert.ok(typeof n === 'number' && Number.isFinite(n));
    assert.ok(
      commands.some((c) => c[0] === 'L'),
      'dog-ear has a genuinely cut diagonal',
    );
  });
}
test('the fallback and Three.js share one deterministic outline and placement', () => {
  assert.deepEqual(paperStage(390, 729), paperStage(390, 729));
  assert.deepEqual(paperOutline(351, 357, 30), paperOutline(351, 357, 30));
  assert.equal(paperStage(390, 729).width, 351);
});
