import character from '../../../public/art/portfolio/character.svg?raw';
import { mountWalking } from './walking-view';
import { walkingRoute, type Point, type Rect } from './walking-route';
import { mountReveal } from './reveal';
import type { SceneReadiness } from './reveal-state';
import type { createGridRenderer } from './grid-renderer';
import type { mountLetterPhysics } from './letter-physics';
import { readProtectedRects } from './copy-obstacles';

const mounted = new WeakMap<HTMLElement, { dispose(): void }>();
export function mountGrid(root: HTMLElement) {
  if (mounted.has(root)) return mounted.get(root)!;
  const lifetime = new AbortController(),
    signal = lifetime.signal;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const perch = document.querySelector<HTMLImageElement>(
    '[data-avatar-perch]',
  )!;
  const host = root.querySelector<HTMLElement>('[data-grid-host]')!;
  const control = root.querySelector<HTMLButtonElement>(
    '[data-grid-controls]',
  )!;
  const status = root.querySelector<HTMLOutputElement>('[data-grid-status]')!;
  const resetLetters = root.querySelector<HTMLButtonElement>(
    '[data-reset-letters]',
  )!;
  let letters: ReturnType<typeof mountLetterPhysics>;
  let lettersLoading = false;
  const instructions = root.querySelector<HTMLElement>(
    '[data-grid-instructions]',
  )!;
  const layer = document.createElement('div');
  layer.className = 'grid-actors';
  layer.setAttribute('aria-hidden', 'true');
  const marker = document.createElement('div');
  marker.className = 'grid-marker';
  marker.dataset.gridMarker = '';
  marker.hidden = true;
  marker.innerHTML =
    '<svg viewBox="0 0 64 64" fill="none"><path d="m14 9 18 17L49 8l8 8-19 17 18 17-8 8-17-19-18 17-7-8 19-16L7 17Z" fill="#ef4d43" stroke="#88291f" stroke-width="2.5" stroke-linejoin="round"/><path d="m15 15 14 14m18-13-11 12" stroke="#ff9684" stroke-width="3" stroke-linecap="round"/></svg>';
  const avatar = document.createElement('div');
  avatar.className = 'grid-character';
  avatar.dataset.gridCharacter = '';
  avatar.style.visibility = 'hidden';
  avatar.innerHTML = character;
  const svg = avatar.querySelector('svg')!;
  svg.querySelector<SVGGElement>('.body')!.style.transformOrigin = '60px 95px';
  svg.querySelector<SVGGElement>('.front-leg')!.style.transformOrigin =
    '72px 104px';
  svg.querySelector<SVGGElement>('.front-arm')!.style.transformOrigin =
    '78px 69px';
  layer.append(marker, avatar);
  document.body.append(layer);
  const walking = mountWalking(avatar);
  let serial = 0,
    disposed = false,
    renderer: ReturnType<typeof createGridRenderer> | undefined;
  let loading = false,
    failed = false,
    readiness: SceneReadiness = 'pending';
  let destination: Point | undefined, aim: Point | undefined;
  const listeners = new Set<(state: SceneReadiness) => void>();
  const notify = (value: SceneReadiness) => {
    readiness = value;
    listeners.forEach((fn) => fn(value));
  };
  const subscribe = (fn: (state: SceneReadiness) => void) => {
    listeners.add(fn);
    fn(readiness);
    return () => {
      listeners.delete(fn);
    };
  };
  const size = () => {
    const width = innerWidth <= 700 ? 32 : 44;
    return { width, height: width * 1.25 };
  };
  const position = (point: Point) => {
    const s = size();
    avatar.style.width = `${s.width}px`;
    avatar.style.height = `${s.height}px`;
    avatar.style.transform = `translate(${point.x - s.width / 2}px,${point.y - s.height * 0.94}px)`;
    root.dataset.characterX = String(point.x);
    root.dataset.characterY = String(point.y);
  };
  const current = (): Point => {
    const box =
      avatar.style.visibility === 'visible'
        ? avatar.getBoundingClientRect()
        : perch.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height * 0.94 };
  };
  const geometry = () => {
    const s = size(),
      inset = s.width / 2 + 8,
      top = s.height * 0.94 + 8;
    const footer = document
      .querySelector('.site-footer')
      ?.getBoundingClientRect();
    const bottom = Math.min(
      innerHeight - 20,
      footer ? footer.top - 12 : innerHeight - 20,
    );
    const bounds: Rect = {
      x: inset,
      y: top,
      width: innerWidth - 2 * inset,
      height: Math.max(0, bottom - top),
    };
    const obstacles = readProtectedRects(root, !letters).map((box) => ({
      x: box.x - s.width / 2 - 6,
      y: box.y - 6,
      width: box.width + s.width + 12,
      height: box.height + s.height * 0.94 + 12,
    }));
    return { bounds, obstacles };
  };
  const defaultSpot = () => {
    const { bounds } = geometry();
    return { x: bounds.x + 2, y: bounds.y + bounds.height - 24 };
  };
  const legal = (p: Point, bounds: Rect, obstacles: Rect[]) =>
    Number.isFinite(p.x + p.y) &&
    p.x >= bounds.x &&
    p.x <= bounds.x + bounds.width &&
    p.y >= bounds.y &&
    p.y <= bounds.y + bounds.height &&
    !obstacles.some(
      (r) =>
        p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height,
    );
  const mark = (point: Point) => {
    marker.hidden = false;
    marker.style.transform = `translate(${point.x - 19}px,${point.y - 19}px)`;
  };
  const stop = () => {
    serial++;
    letters?.stop();
    walking.cancel();
    root.dataset.gridPhase = 'idle';
  };
  const choose = (point: Point, instant = false) => {
    if (
      disposed ||
      document.hidden ||
      document.querySelector('[data-reveal-cover]')
    )
      return;
    const { bounds, obstacles } = geometry();
    if (!legal(point, bounds, obstacles)) {
      status.textContent = 'Pick a clear spot on the grid, away from the text.';
      return;
    }
    const start = current();
    const route = walkingRoute(start, point, bounds, obstacles);
    const close = Math.hypot(start.x - point.x, start.y - point.y) < 6;
    if (!route && !close && !instant && !reduce.matches) {
      status.textContent = 'That spot is out of reach. Try another square.';
      return;
    }
    stop();
    const own = serial;
    destination = { ...point };
    aim = { ...point };
    mark(point);
    position(start);
    avatar.style.visibility = 'visible';
    perch.style.visibility = 'hidden';
    root.dataset.destinationX = String(point.x);
    root.dataset.destinationY = String(point.y);
    if (route) walking.prepare([route], true);
    const arrive = () => {
      if (own !== serial || disposed) return;
      position(point);
      letters?.stop();
      root.dataset.gridPhase = 'idle';
      status.textContent = 'Made it. Pick another spot when you like.';
    };
    if (instant || reduce.matches || !route) {
      letters?.releaseCharacter();
      arrive();
      return;
    }
    root.dataset.gridPhase = 'walking';
    status.textContent = 'On my way to the red X.';
    void walking
      .travel(
        route,
        0,
        size(),
        () => {
          if (disposed || own !== serial || document.hidden)
            throw new Error('grid-trip-cancelled');
        },
        (point, now) => {
          try {
            letters?.sample(point, size(), now);
          } catch {
            disableLetters();
          }
        },
      )
      .then(arrive)
      .catch(() => {});
  };
  const fallback = () => {
    if (disposed || failed) return;
    failed = true;
    renderer?.dispose();
    renderer = undefined;
    document.body.dataset.gridRenderer = 'fallback';
    root.dataset.gridRenderer = 'fallback';
    notify('failed');
  };
  const startRenderer = async () => {
    if (disposed || renderer || loading || failed) return;
    loading = true;
    const deadline = setTimeout(fallback, 7000);
    try {
      const { createGridRenderer } = await import('./grid-renderer');
      if (disposed || failed) return;
      renderer = createGridRenderer(host, fallback);
      document.body.dataset.gridRenderer = 'ready';
      root.dataset.gridRenderer = 'ready';
      notify(reduce.matches ? 'reduced' : 'ready');
    } catch {
      fallback();
    } finally {
      clearTimeout(deadline);
      loading = false;
    }
  };
  const disableLetters = () => {
    letters?.dispose();
    letters = undefined;
    resetLetters.hidden = true;
    root.dataset.letterPhysics = 'failed';
    stop();
    avatar.style.visibility = 'hidden';
    perch.style.visibility = '';
    marker.hidden = true;
  };
  const startLetters = async () => {
    if (disposed || reduce.matches || letters || lettersLoading) return;
    lettersLoading = true;
    root.dataset.letterPhysics = 'loading';
    try {
      await document.fonts.ready;
      const { mountLetterPhysics } = await import('./letter-physics');
      if (disposed || reduce.matches) return;
      letters = mountLetterPhysics(root, disableLetters);
      if (!letters) root.dataset.letterPhysics = 'static';
    } catch {
      disableLetters();
    } finally {
      lettersLoading = false;
    }
  };
  root.dataset.gridPhase = 'idle';
  instructions.hidden = false;
  const reveal = mountReveal(root, subscribe);
  if (reduce.matches) notify('reduced');
  else {
    void startRenderer();
    void startLetters();
  }
  resetLetters.addEventListener(
    'click',
    () => {
      stop();
      try {
        letters?.reset();
        status.textContent = 'Word reset. Walk through it again.';
      } catch {
        disableLetters();
      }
    },
    { signal },
  );
  let gesture:
    | { x: number; y: number; scroll: number; id: number; travel: number }
    | undefined;
  document.addEventListener(
    'pointerdown',
    (event) => {
      gesture =
        event.button === 0 && event.isPrimary
          ? {
              x: event.clientX,
              y: event.clientY,
              scroll: scrollY,
              id: event.pointerId,
              travel: 0,
            }
          : undefined;
    },
    { signal, passive: true },
  );
  document.addEventListener(
    'pointermove',
    (event) => {
      if (gesture && event.pointerId === gesture.id)
        gesture.travel = Math.max(
          gesture.travel,
          Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y),
        );
    },
    { signal, passive: true },
  );
  document.addEventListener(
    'pointercancel',
    () => {
      gesture = undefined;
    },
    { signal, passive: true },
  );
  document.addEventListener(
    'click',
    (event) => {
      const start = gesture;
      gesture = undefined;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        !start ||
        start.travel > 8 ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 ||
        Math.abs(scrollY - start.scroll) > 2
      )
        return;
      const target = event.target as Element;
      if (
        target.closest(
          'a,button,input,textarea,select,summary,[role="button"],[data-copy-obstacle],.site-header,.site-footer,[data-reveal-cover],[data-reveal-controls]',
        )
      )
        return;
      if (window.getSelection()?.toString()) return;
      choose({ x: event.clientX, y: event.clientY });
    },
    { signal },
  );
  control.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      choose(aim || defaultSpot(), event.detail === 0);
    },
    { signal },
  );
  control.addEventListener(
    'keydown',
    (event) => {
      const directions: Record<string, Point> = {
        ArrowLeft: { x: -40, y: 0 },
        ArrowRight: { x: 40, y: 0 },
        ArrowUp: { x: 0, y: -40 },
        ArrowDown: { x: 0, y: 40 },
      };
      const delta = directions[event.key];
      if (!delta) return;
      event.preventDefault();
      const { bounds, obstacles } = geometry(),
        old = aim || defaultSpot();
      const next = {
        x: Math.max(
          bounds.x,
          Math.min(bounds.x + bounds.width, old.x + delta.x),
        ),
        y: Math.max(
          bounds.y,
          Math.min(bounds.y + bounds.height, old.y + delta.y),
        ),
      };
      if (!legal(next, bounds, obstacles)) {
        status.textContent =
          'The heading is in the way. Choose another direction.';
        return;
      }
      stop();
      aim = next;
      mark(next);
      root.dataset.gridPhase = 'aiming';
      status.textContent = `Destination ${Math.round(next.x)}, ${Math.round(next.y)}. Press Enter to move there.`;
    },
    { signal },
  );
  const reset = () => {
    stop();
    destination = undefined;
    aim = undefined;
    gesture = undefined;
    marker.hidden = true;
    avatar.style.visibility = 'hidden';
    perch.style.visibility = '';
    status.textContent = 'Pick a spot on the grid.';
    try {
      letters?.reset();
    } catch {
      disableLetters();
    }
  };
  window.addEventListener(
    'resize',
    () => {
      reset();
      try {
        renderer?.resize();
      } catch {
        fallback();
      }
    },
    { signal },
  );
  window.addEventListener('scroll', reset, { signal, passive: true });
  document.fonts?.addEventListener('loadingdone', reset, { signal });
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        stop();
        marker.hidden = true;
        destination = undefined;
        aim = undefined;
        status.textContent = 'Stopped. Pick another spot.';
      }
    },
    { signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        stop();
        letters?.pause();
        marker.hidden = true;
        destination = undefined;
      }
    },
    { signal },
  );
  reduce.addEventListener(
    'change',
    () => {
      if (reduce.matches) {
        reset();
        letters?.dispose();
        letters = undefined;
        root.dataset.letterPhysics = 'reduced';
        notify('reduced');
      } else {
        if (renderer) notify('ready');
        else void startRenderer();
        void startLetters();
      }
    },
    { signal },
  );
  const handle = {
    dispose() {
      if (disposed) return;
      disposed = true;
      lifetime.abort();
      stop();
      reveal.dispose();
      renderer?.dispose();
      letters?.dispose();
      walking.dispose();
      layer.remove();
      perch.style.visibility = '';
      instructions.hidden = true;
      listeners.clear();
      mounted.delete(root);
      delete document.body.dataset.gridRenderer;
    },
  };
  mounted.set(root, handle);
  window.addEventListener('pagehide', () => handle.dispose(), { signal });
  document.addEventListener('astro:before-swap', () => handle.dispose(), {
    signal,
  });
  return handle;
}
