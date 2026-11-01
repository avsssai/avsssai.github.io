import type { StackId } from './stack-items';

export type Move = 'kick' | 'punch';
export const chooseMove = (random: number): Move =>
  random < 0.5 ? 'kick' : 'punch';

export type ActivePhase =
  'anticipation' | 'travel' | Move | 'impact' | 'return';
export type InteractionState =
  { phase: 'idle' } | { phase: ActivePhase; targetId: StackId; move: Move };
export type InteractionEvent =
  | { kind: 'activate'; id: StackId; move: Move }
  | { kind: 'advance' }
  | { kind: 'cancel' | 'target-lost' };

const nextPhase = {
  anticipation: 'travel',
  travel: 'kick',
  kick: 'impact',
  punch: 'impact',
  impact: 'return',
  return: 'idle',
} as const;

export function transition(
  state: InteractionState,
  event: InteractionEvent,
): InteractionState {
  if (event.kind === 'cancel' || event.kind === 'target-lost')
    return { phase: 'idle' };
  if (event.kind === 'activate')
    return state.phase === 'idle'
      ? { phase: 'anticipation', targetId: event.id, move: event.move }
      : state;
  if (state.phase === 'idle') return state;
  const phase = state.phase === 'travel' ? state.move : nextPhase[state.phase];
  return phase === 'idle'
    ? { phase }
    : { phase, targetId: state.targetId, move: state.move };
}
