import { mountAvatar } from './Avatar';
import {
  chooseMove,
  transition,
  type InteractionState,
} from './interaction-state';
import type { StackExperience } from './stack-bridge';
import type { StackId } from './stack-items';

const OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)';

export function mountInteraction(root: HTMLElement, stack: StackExperience) {
  const perch = document.querySelector<HTMLImageElement>('[data-avatar-perch]');
  if (!perch || !Element.prototype.animate) return { dispose() {} };
  const view = mountAvatar(root, perch);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const lifetime = new AbortController();
  const animations = new Set<Animation>();
  let state: InteractionState = { phase: 'idle' };
  let generation = 0;
  let dwell: ReturnType<typeof setTimeout> | undefined;
  let recoilFrame = 0;
  let completed = 0;
  let disposed = false;
  root.dataset.phase = 'idle';
  root.dataset.interactions = '0';
  root.dataset.kicks = '0';
  root.dataset.punches = '0';
  const publish = () => {
    root.dataset.phase = state.phase;
    root.dataset.activeTarget = state.phase === 'idle' ? '' : state.targetId;
  };
  const cancel = () => {
    generation++;
    clearTimeout(dwell);
    cancelAnimationFrame(recoilFrame);
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    stack.recoil(null);
    state = transition(state, { kind: 'cancel' });
    publish();
    view.leg.style.transform = '';
    view.arm.style.transform = '';
    view.reset();
  };
  const animate = async (
    node: Element,
    frames: Keyframe[],
    duration: number,
    easing = OUT,
  ) => {
    const animation = node.animate(frames, { duration, easing, fill: 'both' });
    animations.add(animation);
    try {
      await animation.finished;
    } finally {
      animation.cancel();
      animations.delete(animation);
    }
  };
  const attack = async (id: StackId) => {
    clearTimeout(dwell);
    if (
      disposed ||
      state.phase !== 'idle' ||
      reduce.matches ||
      document.hidden ||
      root.dataset.stackScene !== 'ready'
    )
      return;
    const target = stack.target(id);
    if (target.kind !== 'available' || target.source !== 'scene') return;
    const move = chooseMove(Math.random());
    const limb = move === 'kick' ? view.leg : view.arm;
    const pivot = move === 'kick' ? { x: 72, y: 104 } : { x: 78, y: 69 };
    const end = move === 'kick' ? { x: 100, y: 137 } : { x: 81, y: 92 };
    const angle = (-85 * Math.PI) / 180;
    const anchor = {
      x:
        pivot.x +
        (end.x - pivot.x) * Math.cos(angle) -
        (end.y - pivot.y) * Math.sin(angle),
      y:
        pivot.y +
        (end.x - pivot.x) * Math.sin(angle) +
        (end.y - pivot.y) * Math.cos(angle),
    };
    const own = ++generation;
    const started = performance.now();
    const home = view.home();
    const direction = target.point.x >= home.x + home.width / 2 ? 1 : -1;
    const size = root
      .querySelector(`[data-stack-target="${id}"] [data-stack-anchor]`)!
      .getBoundingClientRect().width;
    const strikePoint = {
      x: target.point.x - direction * size * 0.36,
      y: target.point.y,
    };
    const contact = {
      x:
        strikePoint.x -
        home.width * (direction > 0 ? anchor.x / 120 : 1 - anchor.x / 120),
      y: strikePoint.y - (home.height * anchor.y) / 150,
    };
    view.avatar.querySelector('svg')!.style.transform = `scaleX(${direction})`;
    view.trail.style.left = direction > 0 ? '-65%' : '95%';
    view.trail.style.transform = `scaleX(${direction})`;
    view.dent.style.left = `${home.width / 2 - 72}px`;
    view.dent.style.top = `${home.height * 0.8 - 40}px`;
    const from = `translate(${home.x}px,${home.y}px)`;
    const to = `translate(${contact.x}px,${contact.y}px)`;
    const middle = `translate(${(home.x + contact.x) / 2}px,${Math.min(home.y, contact.y) - 32}px) rotate(${-12 * direction}deg)`;
    const valid = () => {
      const current = stack.target(id);
      if (
        own !== generation ||
        !root.isConnected ||
        !perch.isConnected ||
        current.kind !== 'available' ||
        current.source !== 'scene' ||
        current.revision !== target.revision ||
        Math.hypot(
          current.point.x - target.point.x,
          current.point.y - target.point.y,
        ) > 1
      )
        throw new Error('target-lost');
    };
    const advance = () => {
      valid();
      state = transition(state, { kind: 'advance' });
      publish();
    };
    state = transition(state, { kind: 'activate', id, move });
    root.dataset.move = move;
    publish();
    root.dataset.activationMs = String(performance.now() - started);
    view.avatar.style.transform = from;
    view.show();
    try {
      await animate(
        view.avatar,
        [
          { transform: from },
          {
            transform: `${from} rotate(${-10 * direction}deg) scale(1.05,.92)`,
          },
        ],
        110,
      );
      advance();
      await Promise.all([
        animate(
          view.avatar,
          [
            { transform: from },
            { transform: middle, offset: 0.5 },
            { transform: to },
          ],
          300,
          MOVE,
        ),
        animate(
          view.arm,
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-32deg)' }],
          300,
        ),
        animate(
          view.trail,
          [{ opacity: 0 }, { opacity: 0.55, offset: 0.25 }, { opacity: 0 }],
          300,
          MOVE,
        ),
        animate(
          view.dent,
          [
            { transform: `${from} scale(.95)`, opacity: 0 },
            {
              transform: `${middle} scale(1.12,.86)`,
              opacity: 0.8,
              offset: 0.5,
            },
            { transform: to, opacity: 0 },
          ],
          300,
          MOVE,
        ),
      ]);
      view.avatar.style.transform = to;
      advance();
      await animate(
        limb,
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-85deg)' }],
        130,
      );
      limb.style.transform = 'rotate(-85deg)';
      advance();
      root.dataset.contacts = String(Number(root.dataset.contacts || 0) + 1);
      root.dataset.contactX = String(strikePoint.x);
      root.dataset.contactY = String(strikePoint.y);
      view.crack.style.transform = `translate(${strikePoint.x - 32}px,${strikePoint.y - 32}px)`;
      const impactStarted = performance.now();
      const recoil = () => {
        if (own !== generation) return;
        const progress = Math.min(1, (performance.now() - impactStarted) / 160);
        stack.recoil({ id, amount: Math.sin(progress * Math.PI) * direction });
        if (progress < 1) recoilFrame = requestAnimationFrame(recoil);
      };
      recoil();
      const ringPosition = `translate(${strikePoint.x - 40}px,${strikePoint.y - 40}px)`;
      await Promise.all([
        animate(
          view.crack,
          [{ opacity: 0 }, { opacity: 0.7, offset: 0.25 }, { opacity: 0 }],
          160,
        ),
        animate(
          view.ring,
          [
            { transform: `${ringPosition} scale(.95)`, opacity: 0 },
            {
              transform: `${ringPosition} scale(1.1)`,
              opacity: 0.45,
              offset: 0.25,
            },
            { transform: `${ringPosition} scale(1.45)`, opacity: 0 },
          ],
          160,
        ),
      ]);
      cancelAnimationFrame(recoilFrame);
      stack.recoil(null);
      limb.style.transform = '';
      advance();
      await animate(
        view.avatar,
        [
          { transform: to },
          { transform: middle, offset: 0.5 },
          { transform: from },
        ],
        300,
        MOVE,
      );
      valid();
      completed++;
      root.dataset.interactions = String(completed);
      const counter = move === 'kick' ? 'kicks' : 'punches';
      root.dataset[counter] = String(Number(root.dataset[counter]) + 1);
      root.dataset.lastDuration = String(performance.now() - started);
    } catch {
      // Cancellation rejects WAAPI promises; stale runs must not reset a newer one.
    } finally {
      if (own === generation) {
        view.leg.style.transform = '';
        cancel();
      }
    }
  };
  const unsubscribe = stack.subscribe((event) => {
    if (event.kind === 'activation') void attack(event.id);
    else cancel();
  });
  for (const control of root.querySelectorAll<HTMLButtonElement>(
    '[data-stack-target]',
  )) {
    control.addEventListener(
      'pointerenter',
      () => {
        clearTimeout(dwell);
        if (fine.matches && !reduce.matches && state.phase === 'idle')
          dwell = setTimeout(
            () => void attack(control.dataset.stackTarget as StackId),
            150,
          );
      },
      { signal: lifetime.signal },
    );
    control.addEventListener('pointerleave', () => clearTimeout(dwell), {
      signal: lifetime.signal,
    });
    control.addEventListener('pointerdown', () => clearTimeout(dwell), {
      signal: lifetime.signal,
    });
  }
  const reset = () => {
    view.leg.style.transform = '';
    cancel();
  };
  for (const event of ['resize', 'scroll', 'pagehide'])
    window.addEventListener(event, reset, {
      signal: lifetime.signal,
      capture: true,
      passive: true,
    });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) reset();
    },
    { signal: lifetime.signal },
  );
  reduce.addEventListener('change', reset, { signal: lifetime.signal });
  const observer = new ResizeObserver(reset);
  observer.observe(root);
  observer.observe(perch);
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      unsubscribe();
      lifetime.abort();
      observer.disconnect();
      view.dispose();
    },
  };
}
