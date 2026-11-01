export type SceneReadiness = 'pending' | 'ready' | 'failed' | 'reduced';
export type RevealState =
  'loading' | 'ready' | 'revealing' | 'complete' | 'failed';
export type RevealEvent =
  'scene-ready' | 'peel' | 'finish' | 'skip' | 'deadline' | 'failure';
export const PEEL_MS = 1400;
export const COVER_LIMIT_MS = 4800;
export const REPEAT_KEY = 'portfolio-reveal-v1';

export function transitionReveal(
  state: RevealState,
  event: RevealEvent,
): RevealState {
  if (state === 'complete' || state === 'failed') return state;
  if (event === 'failure' || event === 'deadline') return 'failed';
  if (event === 'skip' || event === 'finish') return 'complete';
  if (event === 'scene-ready' && state === 'loading') return 'ready';
  if (event === 'peel' && state === 'ready') return 'revealing';
  return state;
}

export function hasSeenReveal(
  storage: () => Pick<Storage, 'getItem'>,
): boolean {
  try {
    return storage().getItem(REPEAT_KEY) === 'seen';
  } catch {
    return false;
  }
}

export function rememberReveal(storage: () => Pick<Storage, 'setItem'>): void {
  try {
    storage().setItem(REPEAT_KEY, 'seen');
  } catch {}
}
