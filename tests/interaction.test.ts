import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  chooseMove,
  transition,
  type InteractionState,
} from '../src/components/portfolio/interaction-state.ts';

for (const move of ['kick', 'punch'] as const) {
  test(`${move} follows every legal phase and returns to idle`, () => {
    let state: InteractionState = transition(
      { phase: 'idle' },
      { kind: 'activate', id: 'react', move },
    );
    for (const phase of [
      'anticipation',
      'travel',
      move,
      'impact',
      'return',
      'idle',
    ]) {
      assert.equal(state.phase, phase);
      if (state.phase !== 'idle') {
        assert.equal(state.targetId, 'react');
        assert.equal(state.move, move);
      }
      state = transition(state, { kind: 'advance' });
    }
    assert.deepEqual(state, { phase: 'idle' });
  });

  test(`${move}: busy requests neither replace the target/move nor create a queue`, () => {
    let state: InteractionState = transition(
      { phase: 'idle' },
      { kind: 'activate', id: 'python', move },
    );
    while (state.phase !== 'idle') {
      for (let i = 0; i < 20; i++)
        assert.equal(
          transition(state, {
            kind: 'activate',
            id: 'react',
            move: move === 'kick' ? 'punch' : 'kick',
          }),
          state,
        );
      state = transition(state, { kind: 'advance' });
    }
    assert.deepEqual(transition(state, { kind: 'advance' }), { phase: 'idle' });
  });

  for (const kind of ['cancel', 'target-lost'] as const) {
    test(`${move}: ${kind} restores idle from every phase and is idempotent`, () => {
      let state: InteractionState = transition(
        { phase: 'idle' },
        { kind: 'activate', id: 'astro', move },
      );
      while (state.phase !== 'idle') {
        const idle = transition(state, { kind });
        assert.deepEqual(idle, { phase: 'idle' });
        assert.deepEqual(transition(idle, { kind }), idle);
        state = transition(state, { kind: 'advance' });
      }
    });
  }
}

test('random selection covers both moves with an explicit equal split', () => {
  assert.equal(chooseMove(0), 'kick');
  assert.equal(chooseMove(0.4999), 'kick');
  assert.equal(chooseMove(0.5), 'punch');
  assert.equal(chooseMove(0.9999), 'punch');
});
