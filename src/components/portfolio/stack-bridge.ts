import {
  stackItems,
  sameLayout,
  type Point,
  type SceneLayout,
  type StackId,
} from './stack-items';
import type { SceneSession, SceneReport } from './StackExperience';

type StackEvent =
  { kind: 'activation'; id: StackId } | { kind: 'layout' | 'mode' };
type Target =
  | {
      kind: 'available';
      id: StackId;
      point: Point;
      source: 'scene' | 'dom';
      revision: number;
    }
  | { kind: 'unavailable'; reason: 'unmeasured' | 'disposed' };
export interface StackExperience {
  target(id: StackId): Target;
  subscribe(listener: (event: StackEvent) => void): () => void;
  dispose(): void;
}
const mounted = new WeakMap<HTMLElement, StackExperience>();

export function mountStackExperience(root: HTMLElement): StackExperience {
  const existing = mounted.get(root);
  if (existing) return existing;
  const host = root.querySelector<HTMLElement>('[data-stack-canvas]')!;
  const controls = stackItems.map((item) =>
    root.querySelector<HTMLButtonElement>(`[data-stack-target="${item.id}"]`)!,
  );
  const status = root.querySelector<HTMLOutputElement>('[data-stack-status]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const lifetime = new AbortController();
  const subscribers = new Set<(event: StackEvent) => void>();
  let session: SceneSession | undefined;
  let layout: SceneLayout | undefined;
  let projected: SceneReport | undefined;
  let revision = 0;
  let generation = 0;
  let disposed = false;
  let suspended = false;
  let failed = false;
  let intersecting = false;
  let loading = false;
  let scheduled = 0;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let frames = 0;
  let lastUpdate: { revision: number; active: boolean } | undefined;
  const updateScene = (running: boolean) => {
    if (
      !session ||
      !layout ||
      (lastUpdate?.revision === layout.revision &&
        lastUpdate.active === running)
    )
      return;
    lastUpdate = { revision: layout.revision, active: running };
    session.update(layout, running);
  };
  const emit = (event: StackEvent) =>
    subscribers.forEach((listener) => listener(event));
  const active = () =>
    !disposed &&
    !suspended &&
    !document.hidden &&
    intersecting &&
    !reduce.matches &&
    !failed;
  const mode = (value: string) => {
    if (root.dataset.stackScene === value) return;
    root.dataset.stackScene = value;
    emit({ kind: 'mode' });
  };
  const restore = () => {
    projected = undefined;
    mode('static');
  };
  const release = () => {
    generation++;
    loading = false;
    clearTimeout(deadline);
    clearTimeout(startTimer);
    restore();
    session?.dispose();
    session = undefined;
    lastUpdate = undefined;
  };
  const fail = (reason: string) => {
    root.dataset.stackFailure = reason;
    failed = true;
    release();
  };
  const readLayout = (): SceneLayout | undefined => {
    const box = root.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const targets = controls.map((control, i) => {
      const anchor = control
        .querySelector('[data-stack-anchor]')!
        .getBoundingClientRect();
      return {
        id: stackItems[i].id,
        centre: {
          x: anchor.x - box.x + anchor.width / 2,
          y: anchor.y - box.y + anchor.height / 2,
        },
        size: anchor.width,
      };
    });
    return {
      revision: revision + 1,
      width: box.width,
      height: box.height,
      targets,
    };
  };
  const report = (value: SceneReport, own: number) => {
    if (own !== generation || !active() || value.revision !== layout?.revision)
      return;
    if (value.points.length !== stackItems.length || value.drawCalls < 7)
      return;
    projected = value;
    root.dataset.stackFrames = String(++frames);
    root.dataset.stackDrawCalls = String(value.drawCalls);
    root.dataset.stackReadyMs ??= String(performance.now());
    for (const [i, point] of value.points.entries()) {
      controls[i].dataset.projectedX = String(point.x);
      controls[i].dataset.projectedY = String(point.y);
    }
    if (root.dataset.stackScene !== 'ready') {
      clearTimeout(deadline);
      loading = false;
      mode('ready');
    }
  };
  const start = async () => {
    if (!active() || session || loading || !layout) return;
    loading = true;
    const own = ++generation;
    mode('loading');
    deadline = setTimeout(() => {
      if (own === generation) fail('deadline');
    }, 5000);
    try {
      const module = await import('./StackExperience');
      if (own !== generation || !active() || !layout) return;
      session = module.attachStackScene(
        host,
        (value) => report(value, own),
        (reason) => {
          if (own === generation) fail(reason);
        },
      );
      updateScene(true);
    } catch {
      if (own === generation) fail('import-or-webgl');
    }
  };
  const sync = () => {
    if (disposed || suspended) return;
    const measured = readLayout();
    if (!sameLayout(layout, measured)) {
      restore();
      layout = measured;
      revision = layout?.revision ?? revision;
      root.dataset.stackRevision = String(revision);
      emit({ kind: 'layout' });
    }
    if (session && layout) updateScene(active());
    else if (active()) {
      clearTimeout(startTimer);
      startTimer = setTimeout(start, 200);
    }
  };
  const schedule = () => {
    if (scheduled || disposed || suspended) return;
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      sync();
    });
  };
  const visibility = () => {
    if (!active()) {
      if (loading) release();
      else {
        restore();
        updateScene(false);
      }
    } else schedule();
  };
  const resize = new ResizeObserver(schedule);
  const intersection = new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting;
    visibility();
  });
  const observe = () => {
    resize.observe(root);
    controls.forEach((control) =>
      resize.observe(control.querySelector('[data-stack-anchor]')!),
    );
    intersection.observe(root);
  };
  for (const [index, control] of controls.entries()) {
    control.disabled = false;
    control.addEventListener(
      'click',
      () => {
        controls.forEach((other) =>
          other.setAttribute('aria-pressed', String(other === control)),
        );
        status.textContent = `${stackItems[index].label} selected.`;
        emit({ kind: 'activation', id: stackItems[index].id });
      },
      { signal: lifetime.signal },
    );
  }
  reduce.addEventListener(
    'change',
    () => {
      if (reduce.matches) release();
      else schedule();
    },
    { signal: lifetime.signal },
  );
  document.addEventListener('visibilitychange', visibility, {
    signal: lifetime.signal,
  });
  window.addEventListener('resize', schedule, { signal: lifetime.signal });
  window.addEventListener('scroll', schedule, {
    signal: lifetime.signal,
    passive: true,
  });
  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) {
        handle.dispose();
        return;
      }
      suspended = true;
      resize.disconnect();
      intersection.disconnect();
      cancelAnimationFrame(scheduled);
      scheduled = 0;
      release();
    },
    { signal: lifetime.signal },
  );
  window.addEventListener(
    'pageshow',
    (event) => {
      if (!event.persisted || disposed) return;
      suspended = false;
      observe();
      schedule();
    },
    { signal: lifetime.signal },
  );
  const handle: StackExperience = {
    target(id) {
      if (disposed) return { kind: 'unavailable', reason: 'disposed' };
      const index = stackItems.findIndex((item) => item.id === id);
      if (index < 0 || !root.isConnected)
        return { kind: 'unavailable', reason: 'unmeasured' };
      if (projected && projected.revision === layout?.revision && active())
        return {
          kind: 'available',
          id,
          point: projected.points[index],
          source: 'scene',
          revision,
        };
      const anchor = controls[index]
        .querySelector('[data-stack-anchor]')!
        .getBoundingClientRect();
      const box = root.getBoundingClientRect();
      if (!anchor.width) return { kind: 'unavailable', reason: 'unmeasured' };
      return {
        kind: 'available',
        id,
        point: {
          x: anchor.x - box.x + anchor.width / 2,
          y: anchor.y - box.y + anchor.height / 2,
        },
        source: 'dom',
        revision,
      };
    },
    subscribe(listener) {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release();
      lifetime.abort();
      resize.disconnect();
      intersection.disconnect();
      cancelAnimationFrame(scheduled);
      subscribers.clear();
      controls.forEach((control) => {
        control.disabled = true;
      });
      mounted.delete(root);
    },
  };
  mounted.set(root, handle);
  root.dataset.stackFrames = '0';
  observe();
  schedule();
  return handle;
}
