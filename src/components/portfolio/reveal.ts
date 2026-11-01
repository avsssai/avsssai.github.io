import {
  COVER_LIMIT_MS,
  hasSeenReveal,
  rememberReveal,
  transitionReveal,
  type RevealState,
  type SceneReadiness,
} from './reveal-state';
import {
  clampTip,
  detachedTip,
  isDetachPull,
  settleAxis,
  type PeelPoint,
  type SpringAxis,
} from './peel-math';
import type { createPeelRenderer } from './peel-renderer';

export function mountReveal(
  root: HTMLElement,
  subscribe: (listener: (state: SceneReadiness) => void) => () => void,
) {
  const lifetime = new AbortController();
  const signal = lifetime.signal;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let state: RevealState = 'loading';
  let frame: HTMLDivElement | undefined;
  let controls: HTMLDivElement | undefined;
  let grip: HTMLButtonElement | undefined;
  let skip: HTMLButtonElement | undefined;
  let range: HTMLInputElement | undefined;
  let renderer: ReturnType<typeof createPeelRenderer> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe = () => {};
  let ended = false;
  let importing = false;
  let active = false;
  let raf = 0;
  let lastTime = 0;
  let completing = false;
  const width = innerWidth;
  const height = innerHeight;
  const diagonal = Math.hypot(width, height);
  let tip: PeelPoint = { x: width - 36, y: 36 };
  let target = { ...tip };
  let sx: SpringAxis = { position: tip.x, velocity: 0 };
  let sy: SpringAxis = { position: tip.y, velocity: 0 };
  let drag:
    | {
        id: number;
        x: number;
        y: number;
        tip: PeelPoint;
        time: number;
        vx: number;
        vy: number;
      }
    | undefined;
  let moved = false;
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
    const focus =
      controls?.contains(document.activeElement) ||
      document.activeElement === grip;
    clearTimeout(deadline);
    cancelAnimationFrame(raf);
    if (drag && grip?.hasPointerCapture(drag.id))
      grip.releasePointerCapture(drag.id);
    drag = undefined;
    renderer?.dispose();
    renderer = undefined;
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
  const draw = () => {
    if (ended || !renderer || !grip || !range) return;
    try {
      renderer.draw(tip);
      grip.style.transform = `translate(${Math.max(28, Math.min(width - 28, tip.x)) - 28}px, ${Math.max(28, Math.min(height - 110, tip.y)) - 28}px)`;
      const progress = Math.min(
        100,
        Math.max(
          0,
          ((Math.hypot(width - tip.x, tip.y) - 51) / (diagonal * 0.94 - 51)) *
            100,
        ),
      );
      range.value = String(Math.round(progress));
      root.dataset.peelProgress = String(progress);
      root.dataset.peelTipX = String(tip.x);
      root.dataset.peelTipY = String(tip.y);
      root.dataset.peelFrames = String(
        Number(root.dataset.peelFrames || 0) + 1,
      );
    } catch {
      finish('failure');
    }
  };
  const tick = (now: number) => {
    raf = 0;
    if (ended) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    if (!drag) {
      sx = settleAxis(sx, target.x, dt);
      sy = settleAxis(sy, target.y, dt);
      tip = clampTip({ x: sx.position, y: sy.position }, width, height);
    }
    draw();
    const settling =
      Math.hypot(sx.position - target.x, sy.position - target.y) > 0.1 ||
      Math.hypot(sx.velocity, sy.velocity) > 0.5;
    if (!drag && !settling) {
      tip = { ...target };
      draw();
      root.dataset.peelMotion = 'held';
      if (completing) finish('finish');
    } else if (!drag) raf = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (!raf && !ended) {
      lastTime = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  const keyboardProgress = (value: number) => {
    if (!active || ended) return;
    completing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    if (value >= 100) return finish('finish');
    update('peel');
    const angle = Math.atan2(tip.y, width - tip.x);
    const length = 51 + (Math.max(0, value) / 100) * (diagonal * 0.94 - 51);
    tip = { x: width - Math.cos(angle) * length, y: Math.sin(angle) * length };
    target = { ...tip };
    sx = { position: tip.x, velocity: 0 };
    sy = { position: tip.y, velocity: 0 };
    root.dataset.peelMotion = 'held';
    draw();
  };
  const release = (event: PointerEvent, cancelled = false) => {
    if (!drag || event.pointerId !== drag.id || ended) return;
    const own = drag;
    drag = undefined;
    if (grip?.hasPointerCapture(own.id)) grip.releasePointerCapture(own.id);
    // Preserve the exact release location as the resting position. Velocity
    // causes a small physical settle, never a projected halfway auto-dismiss.
    target = { ...tip };
    const fresh = performance.now() - own.time < 80;
    sx = { position: tip.x, velocity: fresh && !cancelled ? own.vx : 0 };
    sy = { position: tip.y, velocity: fresh && !cancelled ? own.vy : 0 };
    completing = !cancelled && moved && isDetachPull(tip, width, height);
    if (completing) target = detachedTip(tip, width, height);
    root.dataset.peelMotion = completing ? 'detaching' : 'settling';
    schedule();
  };
  const scene = async (value: SceneReadiness) => {
    if (ended) return;
    if (value === 'failed' || value === 'reduced') return finish('failure');
    if (value !== 'ready' || importing || active || !frame) return;
    importing = true;
    try {
      const module = await import('./peel-renderer');
      if (ended || !frame) return;
      renderer = module.createPeelRenderer(frame, () => finish('failure'));
      renderer.draw(tip);
      if (ended) return;
      active = true;
      clearTimeout(deadline);
      frame.classList.add('is-interactive');
      controls?.classList.add('is-interactive');
      grip!.hidden = false;
      range!.disabled = false;
      controls?.querySelector('[role="status"]')?.remove();
      update('scene-ready');
      root.dataset.revealReadyMs = String(performance.now());
      root.dataset.peelMotion = 'held';
      draw();
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
    frame.style.setProperty('--reveal-cover-limit', `${COVER_LIMIT_MS}ms`);
    frame.setAttribute('aria-label', 'Site cover');
    grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'reveal-grip';
    grip.dataset.peelGrip = '';
    grip.hidden = true;
    const tab = document.createElement('span');
    tab.className = 'reveal-tab';
    tab.setAttribute('aria-hidden', 'true');
    grip.append(tab);
    grip.setAttribute(
      'aria-label',
      'Peel cover further. Drag to peel, release to hold.',
    );
    grip.addEventListener(
      'click',
      (event) => {
        // Native keyboard/AT clicks advance without forced gesture animation.
        if (event.detail === 0)
          keyboardProgress(Number(range?.value || 0) + 15);
      },
      { signal },
    );
    frame.append(grip);
    controls = document.createElement('div');
    controls.className = 'reveal-controls';
    controls.style.setProperty('--reveal-cover-limit', `${COVER_LIMIT_MS}ms`);
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.textContent = 'Loading scene';
    const instructions = document.createElement('span');
    instructions.className = 'reveal-instructions';
    instructions.textContent = 'Pull the tab. Release to hold.';
    const label = document.createElement('label');
    label.className = 'reveal-range-label';
    label.textContent = 'Peel';
    range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.step = '1';
    range.value = '0';
    range.disabled = true;
    range.setAttribute('aria-label', 'Cover peeled');
    range.addEventListener(
      'input',
      () => keyboardProgress(Number(range!.value)),
      { signal },
    );
    label.append(range);
    skip = document.createElement('button');
    skip.type = 'button';
    skip.dataset.revealSkip = '';
    skip.textContent = 'Skip intro';
    skip.addEventListener('click', () => finish('skip'), { signal });
    controls.append(status, instructions, label, skip);
    // Raycast only on pointer-down: uncovered live links remain interactive;
    // a covered area starts a peel instead of clicking an invisible control.
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (
          !active ||
          ended ||
          drag ||
          !event.isPrimary ||
          event.button !== 0 ||
          controls?.contains(event.target as Node)
        )
          return;
        const onGrip = event.target === grip;
        if (!onGrip && !renderer?.hits(event.clientX, event.clientY)) return;
        event.preventDefault();
        event.stopPropagation();
        cancelAnimationFrame(raf);
        raf = 0;
        sx = { position: tip.x, velocity: 0 };
        sy = { position: tip.y, velocity: 0 };
        drag = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          tip: { ...tip },
          time: performance.now(),
          vx: 0,
          vy: 0,
        };
        completing = false;
        target = { ...tip };
        moved = false;
        grip!.setPointerCapture(event.pointerId);
        update('peel');
        root.dataset.peelMotion = 'dragging';
      },
      { capture: true, signal },
    );
    document.addEventListener(
      'pointermove',
      (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const next = clampTip(
          {
            x: drag.tip.x + event.clientX - drag.x,
            y: drag.tip.y + event.clientY - drag.y,
          },
          width,
          height,
        );
        const now = performance.now();
        const dt = Math.max(8, now - drag.time) / 1000;
        const limit = diagonal * 0.8;
        drag.vx = Math.max(-limit, Math.min(limit, (next.x - tip.x) / dt));
        drag.vy = Math.max(-limit, Math.min(limit, (next.y - tip.y) / dt));
        drag.time = now;
        moved ||=
          Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8;
        tip = next;
        sx.position = tip.x;
        sy.position = tip.y;
        schedule();
      },
      { signal },
    );
    document.addEventListener('pointerup', (event) => release(event), {
      signal,
    });
    document.addEventListener(
      'pointercancel',
      (event) => release(event, true),
      { signal },
    );
    grip.addEventListener(
      'lostpointercapture',
      (event) => release(event, true),
      { signal },
    );
    reduce.addEventListener(
      'change',
      () => {
        if (reduce.matches) finish('skip');
      },
      { signal },
    );
    document.addEventListener(
      'focusin',
      (event) => {
        if (event.target !== grip && !controls?.contains(event.target as Node))
          finish('skip');
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') finish('skip');
      },
      { signal },
    );
    window.addEventListener(
      'resize',
      () => {
        // Mobile Chrome emits an initial resize even when the CSS viewport is
        // unchanged. Only real geometry changes invalidate the sheet/capture.
        if (innerWidth !== width || innerHeight !== height) finish('skip');
      },
      { signal },
    );
    window.addEventListener('pagehide', () => finish('skip'), { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) finish('skip');
      },
      { signal },
    );
    document.addEventListener('astro:before-swap', () => finish('skip'), {
      signal,
    });
    root.dataset.revealState = state;
    root.dataset.revealStartedMs = String(performance.now());
    document.body.append(frame, controls);
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
