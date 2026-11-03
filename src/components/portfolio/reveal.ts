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
  peelProgress,
  PEEL_COMMIT_PROGRESS,
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
  let completionStart = 0;
  let completionFrom: PeelPoint | undefined;
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
    root.dispatchEvent(new Event('portfolio:revealed'));
    if (focus)
      root
        .querySelector<HTMLAnchorElement>('.work-link')
        ?.focus({ preventScroll: true });
  };
  const draw = () => {
    if (ended || !renderer || !grip || !range) return;
    try {
      renderer.draw(tip);
      grip.style.transform = `translate(${Math.max(36, Math.min(width - 36, tip.x)) - 36}px, ${Math.max(36, Math.min(height - 110, tip.y)) - 36}px)`;
      const progress = peelProgress(tip, width, height) * 100;
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
    if (completing && completionFrom) {
      const progress = Math.min(1, (now - completionStart) / 280);
      // easeOutCubic: finish from the actual grab, without restarting the peel.
      const eased = 1 - (1 - progress) ** 3;
      tip = {
        x: completionFrom.x + (target.x - completionFrom.x) * eased,
        y: completionFrom.y + (target.y - completionFrom.y) * eased,
      };
      draw();
      if (progress === 1) finish('finish');
      else if (!ended) raf = requestAnimationFrame(tick);
      return;
    }
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
    } else if (!drag) raf = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (!raf && !ended) {
      lastTime = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  const commit = () => {
    if (ended || completing) return;
    const own = drag;
    drag = undefined;
    completing = true;
    completionStart = performance.now();
    completionFrom = { ...tip };
    target = detachedTip(tip, width, height);
    if (own && grip?.hasPointerCapture(own.id))
      grip.releasePointerCapture(own.id);
    root.dataset.peelMotion = 'detaching';
    schedule();
  };
  const keyboardProgress = (value: number) => {
    if (!active || ended || completing) return;
    cancelAnimationFrame(raf);
    raf = 0;
    if (value >= PEEL_COMMIT_PROGRESS * 100) return finish('finish');
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
    if (!cancelled && moved && isDetachPull(tip, width, height)) {
      commit();
      return;
    }
    const own = drag;
    drag = undefined;
    if (grip?.hasPointerCapture(own.id)) grip.releasePointerCapture(own.id);
    // An unfinished/cancelled pull returns to the loose corner, not a stuck sheet.
    target = { x: width - 36, y: 36 };
    sx = { position: tip.x, velocity: 0 };
    sy = { position: tip.y, velocity: 0 };
    root.dataset.peelMotion = 'settling';
    schedule();
  };
  const scene = async (value: SceneReadiness) => {
    if (ended) return;
    if (value === 'failed' || value === 'reduced') return finish('failure');
    if (value !== 'ready' || importing || active || !frame) return;
    importing = true;
    try {
      const character = new Image();
      character.src = '/art/portfolio/character.svg';
      const [module] = await Promise.all([
        import('./peel-renderer'),
        character.decode(),
        document.fonts.load('600 28px "Space Grotesk"'),
      ]);
      if (ended || !frame) return;
      renderer = module.createPeelRenderer(
        frame,
        () => finish('failure'),
        character,
      );
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
      'Pull to peel. The cover comes off automatically after sixty percent.',
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
    instructions.textContent = 'Pull the tab — I’ll take it from there.';
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
          completing ||
          drag ||
          !event.isPrimary ||
          event.button !== 0 ||
          controls?.contains(event.target as Node)
        )
          return;
        const onGrip = grip?.contains(event.target as Node);
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
        if (!drag || drag.id !== event.pointerId || completing) return;
        const next = clampTip(
          {
            x: drag.tip.x + event.clientX - drag.x,
            y: drag.tip.y + event.clientY - drag.y,
          },
          width,
          height,
        );
        moved ||=
          Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8;
        tip = next;
        sx.position = tip.x;
        sy.position = tip.y;
        if (moved && isDetachPull(tip, width, height)) commit();
        else schedule();
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
