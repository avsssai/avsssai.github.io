import { mountAvatar } from './Avatar';
import { walkingRoute, routeSeparation } from './walking-route';
import { mountWalking } from './walking-view';
import {
  chooseMove,
  transition,
  type InteractionState,
} from './interaction-state';
import { impactWord, placeComic } from './comic-effects';
import type { StackExperience } from './stack-bridge';
import type { StackId } from './stack-items';

const OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export function mountInteraction(root: HTMLElement, stack: StackExperience) {
  const perch = document.querySelector<HTMLImageElement>('[data-avatar-perch]');
  if (!perch || !Element.prototype.animate) return { dispose() {} };
  const view = mountAvatar(root, perch);
  const walking = mountWalking(view.avatar);
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
    walking.cancel();
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
    if (innerWidth <= 700) {
      const ratio = Math.min(1, 32 / home.width);
      home.x += (home.width * (1 - ratio)) / 2;
      home.y += home.height * (1 - ratio) * 0.94;
      home.width *= ratio;
      home.height *= ratio;
      view.avatar.style.width = `${home.width}px`;
      view.avatar.style.height = `${home.height}px`;
    }
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
    view.trail.style.left = direction > 0 ? '-165%' : '95%';
    view.trail.style.transform = `scaleX(${direction})`;
    view.dent.style.left = `${home.width / 2 - 72}px`;
    view.dent.style.top = `${home.height * 0.8 - 40}px`;
    const from = `translate(${home.x}px,${home.y}px)`;
    const to = `translate(${contact.x}px,${contact.y}px)`;
    const heroBox = root.getBoundingClientRect();
    const viewport = {
      x: -heroBox.x,
      y: -heroBox.y,
      width: innerWidth,
      height: innerHeight,
    };
    const protectedRects = [
      ...document.querySelectorAll(
        '.work-link, .identity, .header-actions a, .header-actions button',
      ),
    ].map((element) => element.getBoundingClientRect());
    const heading = root.querySelector('h1')!;
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      protectedRects.push(...range.getClientRects());
    }
    const obstacles = protectedRects.map((box) => {
      return {
        x: box.x - heroBox.x,
        y: box.y - heroBox.y,
        width: box.width,
        height: box.height,
      };
    });
    const locateComic = (
      element: HTMLElement,
      point: { x: number; y: number },
      width: number,
      height: number,
      protectedAreas = obstacles,
    ) => {
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      const footprint = { width: width * 1.28, height: height * 1.5 };
      const position = placeComic(point, footprint, viewport, protectedAreas);
      return `translate(${position.x + (footprint.width - width) / 2}px,${position.y + (footprint.height - height) / 2}px) rotate(-8deg)`;
    };
    const comicWidth = innerWidth <= 700 ? 128 : 160;
    const comicPosition = locateComic(
      view.burst,
      strikePoint,
      comicWidth,
      comicWidth * 0.625,
      [
        ...obstacles,
        {
          x: contact.x - 8,
          y: contact.y - 8,
          width: home.width + 16,
          height: home.height + 16,
        },
      ],
    );
    view.burst.querySelector('[data-comic-word]')!.textContent =
      impactWord(move);
    const feet = (point: { x: number; y: number }) => ({
      x: point.x + home.width / 2,
      y: point.y + home.height * 0.94,
    });
    const startFeet = feet(home);
    const endFeet = feet(contact);
    const terrainBox = root
      .querySelector('.static-lettering')
      ?.getBoundingClientRect();
    // Header labels sit on an opaque foreground shelf; the actor walks behind
    // that shelf on departure rather than treating a phone's full nav row as
    // an impassable wall. Hero content remains a genuine routing obstacle.
    const protectedWalking = obstacles.filter((box) => box.y + box.height > 0);
    if (terrainBox)
      protectedWalking.push({
        x: terrainBox.x - heroBox.x - terrainBox.width * 0.08,
        y: terrainBox.y - heroBox.y,
        width: terrainBox.width * 1.16,
        height: terrainBox.height,
      });
    const routeObstacles = protectedWalking.map((box) => ({
      x: box.x - home.width * 0.35 - 2,
      y: box.y - 4,
      width: box.width + home.width * 0.7 + 4,
      height: box.height + home.height * 0.94 + 8,
    }));
    const routeBounds = {
      x: viewport.x + home.width / 2 + 2,
      y: viewport.y + home.height * 0.94 + 4,
      width: viewport.width - home.width - 4,
      height: viewport.height - home.height * 0.94 - 12,
    };
    const outbound = walkingRoute(
      startFeet,
      endFeet,
      routeBounds,
      routeObstacles,
    );
    const inbound =
      outbound &&
      walkingRoute(
        endFeet,
        startFeet,
        routeBounds,
        routeObstacles,
        true,
        outbound,
      );
    // If the full actor cannot safely fit, keep native selection without
    // sending him through readable content or outside the viewport.
    if (!outbound || !inbound) {
      root.dataset.walkingUnavailable = id;
      root.dataset.walkingReason = outbound
        ? 'no-distinct-return'
        : 'no-clear-route';
      return;
    }
    delete root.dataset.walkingUnavailable;
    delete root.dataset.walkingReason;
    root.dataset.routeSeparation = String(routeSeparation(outbound, inbound));
    root.dataset.outboundLength = String(outbound.length);
    root.dataset.returnLength = String(inbound.length);
    walking.prepare([outbound, inbound]);
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
      await walking.travel(outbound, 0, home, valid);
      view.avatar.style.transform = to;
      view.avatar.querySelector('svg')!.style.transform =
        `scaleX(${direction})`;
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
        const progress = Math.min(1, (performance.now() - impactStarted) / 240);
        stack.recoil({ id, amount: Math.sin(progress * Math.PI) * direction });
        if (progress < 1) recoilFrame = requestAnimationFrame(recoil);
      };
      recoil();
      const ringPosition = `translate(${strikePoint.x - 52}px,${strikePoint.y - 52}px)`;
      await Promise.all([
        animate(
          view.crack,
          [{ opacity: 0 }, { opacity: 0.9, offset: 0.25 }, { opacity: 0 }],
          240,
        ),
        animate(
          view.ring,
          [
            { transform: `${ringPosition} scale(.95)`, opacity: 0 },
            {
              transform: `${ringPosition} scale(1.1)`,
              opacity: 0.85,
              offset: 0.25,
            },
            { transform: `${ringPosition} scale(1.65)`, opacity: 0 },
          ],
          240,
        ),
        animate(
          view.burst,
          [
            {
              transform: `${comicPosition} scale(.95)`,
              opacity: 0,
              easing: OUT,
            },
            {
              transform: `${comicPosition} scale(1.1)`,
              opacity: 1,
              offset: 0.16,
            },
            {
              transform: `${comicPosition} scale(1.03)`,
              opacity: 1,
              offset: 0.75,
              easing: OUT,
            },
            { transform: `${comicPosition} scale(1.12)`, opacity: 0 },
          ],
          240,
          'linear',
        ),
      ]);
      cancelAnimationFrame(recoilFrame);
      stack.recoil(null);
      limb.style.transform = '';
      advance();
      await walking.travel(inbound, 1, home, valid);
      await animate(walking.trail, [{ opacity: 1 }, { opacity: 0 }], 180);
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
      walking.dispose();
      view.dispose();
    },
  };
}
