import {
  createLetterWorld,
  type LetterActor,
  type LetterBox,
} from './letter-world';
import type { Point } from './walking-route';
import { readProtectedRects } from './copy-obstacles';

export function mountLetterPhysics(root: HTMLElement, onFailure: () => void) {
  const svg = [
    ...root.querySelectorAll<SVGSVGElement>(
      '[data-static-lettering="colour"] svg',
    ),
  ].find(
    (node) =>
      node.getBoundingClientRect().width &&
      node.querySelectorAll('[data-letter-body]').length === 12,
  );
  if (!svg) return;
  const groups = [...svg.querySelectorAll<SVGGElement>('[data-letter-body]')];
  const resetButton = root.querySelector<HTMLButtonElement>(
    '[data-reset-letters]',
  )!;
  let world: ReturnType<typeof createLetterWorld> | undefined;
  let homes: { x: number; y: number; cx: number; cy: number }[] = [];
  let scale = 1,
    frame = 0,
    last = 0,
    accumulator = 0,
    frames = 0,
    disposed = false,
    moving = false;
  let target: LetterActor | undefined,
    simulated: Point | undefined,
    previous: { point: Point; time: number } | undefined;
  const transforms: string[] = [];
  const STEP = 1000 / 60;
  const clear = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    world?.dispose();
    world = undefined;
    groups.forEach((node) => node.removeAttribute('transform'));
    transforms.length = 0;
  };
  const reset = () => {
    clear();
    target = undefined;
    simulated = undefined;
    previous = undefined;
    moving = false;
    accumulator = 0;
    if (disposed) return;
    resetButton.hidden = false;
    const matrix = svg.getScreenCTM();
    if (!matrix) throw new Error('letter-layout-unavailable');
    scale = Math.hypot(matrix.a, matrix.b);
    if (!Number.isFinite(scale) || scale <= 0)
      throw new Error('invalid-letter-scale');
    const boxes = groups.map((node) => {
      const b = node.getBBox(),
        cx = b.x + b.width / 2,
        cy = b.y + b.height / 2;
      const centre = new DOMPoint(cx, cy).matrixTransform(matrix);
      return {
        x: centre.x,
        y: centre.y,
        width: b.width * scale,
        height: b.height * scale,
        cx,
        cy,
      };
    });
    homes = boxes;
    const protectedBoxes: LetterBox[] = readProtectedRects(root).map((b) => ({
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
      width: b.width,
      height: b.height,
    }));
    const top =
      (document.querySelector('.site-header')?.getBoundingClientRect().bottom ||
        0) + 4;
    const bottom = Math.min(
      innerHeight - 8,
      document.querySelector('.site-footer')?.getBoundingClientRect().top ||
        innerHeight - 8,
    );
    world = createLetterWorld(
      boxes,
      {
        x: 8,
        y: top,
        width: innerWidth - 16,
        height: Math.max(1, bottom - top),
      },
      protectedBoxes,
    );
    root.dataset.letterPhysics = 'ready';
    root.dataset.letterMoved = '0';
    root.dataset.letterImpacts = '0';
    root.dataset.letterMotion = 'sleeping';
    svg.closest<HTMLElement>(
      '[data-static-lettering]',
    )!.dataset.physicalLetters = '';
  };
  const paint = () => {
    if (!world) return;
    let moved = 0;
    world.poses.forEach((body, index) => {
      const home = homes[index],
        dx = body.x - home.x,
        dy = body.y - home.y;
      if (Math.hypot(dx, dy) > 1 || Math.abs(body.angle) > 0.025) moved++;
      const transform = `translate(${dx / scale} ${dy / scale}) rotate(${(body.angle * 180) / Math.PI} ${home.cx} ${home.cy})`;
      if (transforms[index] !== transform) {
        groups[index].setAttribute('transform', transform);
        transforms[index] = transform;
      }
    });
    root.dataset.letterMoved = String(moved);
    root.dataset.letterImpacts = String(world.impacts);
    root.dataset.letterFrames = String(++frames);
  };
  const tick = (now: number) => {
    frame = 0;
    if (disposed || !world || document.hidden) return;
    try {
      accumulator += Math.min(50, Math.max(0, now - last));
      last = now;
      const steps = Math.min(3, Math.floor(accumulator / STEP));
      const start = simulated || target;
      for (let i = 0; i < steps; i++) {
        let actor: LetterActor | null = null;
        if (target && start) {
          const fraction = (i + 1) / steps,
            x = start.x + (target.x - start.x) * fraction,
            y = start.y + (target.y - start.y) * fraction;
          const old = simulated || start;
          actor = {
            ...target,
            x,
            y,
            vx: moving ? (x - old.x) * 60 : 0,
            vy: moving ? (y - old.y) * 60 : 0,
          };
          simulated = { x, y };
        }
        world.step(actor);
        accumulator -= STEP;
      }
      if (steps) paint();
      if (
        world.awake ||
        (moving &&
          target &&
          Math.hypot(target.vx, target.vy) > 1 &&
          world.near(target))
      )
        frame = requestAnimationFrame(tick);
      else {
        root.dataset.letterMotion = 'sleeping';
        accumulator = 0;
      }
    } catch {
      clear();
      resetButton.hidden = true;
      root.dataset.letterPhysics = 'failed';
      onFailure();
    }
  };
  const schedule = () => {
    if (!frame && !disposed) {
      last = performance.now();
      accumulator = STEP;
      root.dataset.letterMotion = 'active';
      frame = requestAnimationFrame(tick);
    }
  };
  reset();
  return {
    sample(point: Point, size: { width: number; height: number }, now: number) {
      if (disposed || !world) return;
      const centre = { x: point.x, y: point.y - size.height * 0.45 };
      const dt = previous ? (now - previous.time) / 1000 : 0;
      target = {
        ...centre,
        radius: size.width * 0.4,
        vx: dt > 0 && dt < 0.15 ? (centre.x - previous!.point.x) / dt : 0,
        vy: dt > 0 && dt < 0.15 ? (centre.y - previous!.point.y) / dt : 0,
      };
      if (!frame) simulated = previous?.point || centre;
      previous = { point: centre, time: now };
      moving = true;
      if (world.awake || world.near(target)) schedule();
    },
    stop() {
      moving = false;
      previous = undefined;
      if (target) target = { ...target, vx: 0, vy: 0 };
    },
    releaseCharacter() {
      // Keyboard placement is instantaneous: do not leave a physical ghost at
      // the previous pose or turn the teleport into a new collision impulse.
      moving = false;
      previous = undefined;
      target = undefined;
      simulated = undefined;
      if (world?.awake) schedule();
    },
    reset,
    pause() {
      moving = false;
      previous = undefined;
      cancelAnimationFrame(frame);
      frame = 0;
      if (target) target = { ...target, vx: 0, vy: 0 };
      root.dataset.letterMotion = 'paused';
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clear();
      resetButton.hidden = true;
      delete svg.closest<HTMLElement>('[data-static-lettering]')!.dataset
        .physicalLetters;
    },
  };
}
