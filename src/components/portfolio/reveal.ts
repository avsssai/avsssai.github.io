import {
  COVER_LIMIT_MS,
  PEEL_MS,
  hasSeenReveal,
  rememberReveal,
  transitionReveal,
  type RevealState,
  type SceneReadiness,
} from './reveal-state';

export function mountReveal(
  root: HTMLElement,
  subscribe: (listener: (state: SceneReadiness) => void) => () => void,
) {
  const lifetime = new AbortController();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let state: RevealState = 'loading';
  let frame: HTMLDivElement | undefined;
  let controls: HTMLDivElement | undefined;
  let skip: HTMLButtonElement | undefined;
  let animation: Animation | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let readyDeadline: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe = () => {};
  let ended = false;
  const update = (event: Parameters<typeof transitionReveal>[1]) => {
    state = transitionReveal(state, event);
    root.dataset.revealState = state;
  };
  const finish = (
    event: 'finish' | 'skip' | 'deadline' | 'failure',
    mark = true,
  ) => {
    if (ended) return;
    ended = true;
    update(event);
    root.dataset.revealDismissedMs = String(performance.now());
    const focus = document.activeElement === skip;
    clearTimeout(deadline);
    clearTimeout(readyDeadline);
    animation?.cancel();
    frame?.remove();
    controls?.remove();
    unsubscribe();
    lifetime.abort();
    if (mark) rememberReveal(() => localStorage);
    if (focus)
      root
        .querySelector<HTMLAnchorElement>('.work-link')
        ?.focus({ preventScroll: true });
  };
  const scene = (value: SceneReadiness) => {
    if (ended) return;
    if (value === 'failed' || value === 'reduced') {
      finish('failure');
      return;
    }
    if (value !== 'ready' || state !== 'loading' || !frame) return;
    update('scene-ready');
    root.dataset.revealReadyMs = String(performance.now());
    readyDeadline = setTimeout(() => finish('finish'), 1700);
    update('peel');
    controls?.querySelector('[role="status"]')?.remove();
    try {
      animation = frame.firstElementChild!.animate(
        [
          {
            transform: 'perspective(1400px) rotateX(0deg) translateY(0)',
            opacity: 1,
          },
          {
            transform: 'perspective(1400px) rotateX(-28deg) translateY(-115%)',
            opacity: 0.8,
          },
        ],
        {
          duration: PEEL_MS,
          easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
          fill: 'forwards',
        },
      );
      animation.finished
        .then(() => finish('finish'))
        .catch(() => finish('failure'));
    } catch {
      finish('failure');
    }
  };
  if (reduce.matches || hasSeenReveal(() => localStorage)) {
    finish('skip', false);
    return { dispose() {} };
  }
  try {
    deadline = setTimeout(() => finish('deadline'), COVER_LIMIT_MS);
    frame = document.createElement('div');
    frame.className = 'reveal-viewport';
    frame.dataset.revealCover = '';
    frame.setAttribute('aria-hidden', 'true');
    const paper = document.createElement('div');
    paper.className = 'reveal-paper';
    frame.append(paper);
    controls = document.createElement('div');
    controls.className = 'reveal-controls';
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.textContent = 'Loading scene';
    skip = document.createElement('button');
    skip.type = 'button';
    skip.dataset.revealSkip = '';
    skip.textContent = 'Skip intro';
    skip.addEventListener('click', () => finish('skip'), {
      signal: lifetime.signal,
    });
    controls.append(status, skip);
    reduce.addEventListener(
      'change',
      () => {
        if (reduce.matches) finish('skip');
      },
      { signal: lifetime.signal },
    );
    root.addEventListener(
      'focusin',
      (event) => {
        if (event.target !== skip) finish('skip');
      },
      { signal: lifetime.signal },
    );
    window.addEventListener('resize', () => finish('skip'), {
      signal: lifetime.signal,
    });
    window.addEventListener('pagehide', () => finish('skip'), {
      signal: lifetime.signal,
    });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) finish('skip');
      },
      { signal: lifetime.signal },
    );
    document.addEventListener('astro:before-swap', () => finish('skip'), {
      signal: lifetime.signal,
    });
    root.dataset.revealState = state;
    root.dataset.revealStartedMs = String(performance.now());
    root.append(frame, controls);
    unsubscribe = subscribe(scene);
    if (ended) unsubscribe();
  } catch {
    finish('failure');
  }
  return {
    dispose() {
      finish('skip', false);
    },
  };
}
