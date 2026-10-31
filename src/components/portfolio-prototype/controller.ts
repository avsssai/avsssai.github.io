type TargetId = 'react';
type ActivePhase = 'anticipation' | 'travel' | 'kick' | 'impact' | 'return';
type CharacterState =
  { phase: 'idle' } | { phase: ActivePhase; targetId: TargetId };
type Scene = Awaited<ReturnType<(typeof import('./scene'))['createScene']>>;

const OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)';

export function mountPrototype(root: HTMLElement) {
  const element = <T extends HTMLElement>(selector: string) => {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`Missing prototype element ${selector}`);
    return found;
  };
  const stage = element('#stage');
  const avatar = element('#avatar');
  const perch = element('#perch');
  const target = element<HTMLButtonElement>('#target');
  const crack = root.querySelector<SVGElement>('#crack')!;
  const status = element('#interaction-status');
  const sceneStatus = element('#scene-status');
  const cover = element('#peel-cover');
  const skip = element<HTMLButtonElement>('#skip-peel');
  const sceneHost = element('#scene');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const lifetime = new AbortController();
  const animations = new Set<Animation>();
  let state: CharacterState = { phase: 'idle' };
  let scene: Scene | undefined;
  let generation = 0;
  let dwell: ReturnType<typeof setTimeout> | undefined;
  let revealFrame = 0;
  let revealDeadline: ReturnType<typeof setTimeout> | undefined;
  let completed = 0;
  let disposed = false;
  let returnFocus: HTMLElement | null = null;
  root.dataset.kicks = '0';
  root.dataset.frames = '0';

  const relative = (node: Element) => {
    const box = node.getBoundingClientRect();
    const parent = stage.getBoundingClientRect();
    return {
      x: box.x - parent.x,
      y: box.y - parent.y,
      width: box.width,
      height: box.height,
    };
  };
  const home = () => {
    const anchor = relative(perch);
    return `translate(${anchor.x - 3}px, ${anchor.y - 15}px)`;
  };
  const setState = (next: CharacterState) => {
    state = next;
    root.dataset.phase = next.phase;
  };
  const resetVisuals = () => {
    avatar.style.transform = home();
    crack.style.opacity = '0';
    scene?.render({ recoil: 0, curl: null });
  };
  const finishPeel = () => {
    const hadPeel = root.dataset.peel !== 'none';
    cancelAnimationFrame(revealFrame);
    clearTimeout(revealDeadline);
    root.dataset.peel = 'none';
    cover.hidden = true;
    cover.style.transform = '';
    skip.hidden = true;
    sceneHost.style.zIndex = '';
    scene?.render({ recoil: 0, curl: null });
    if (hadPeel && returnFocus?.isConnected)
      returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  };
  const cancel = () => {
    generation++;
    clearTimeout(dwell);
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    finishPeel();
    setState({ phase: 'idle' });
    resetVisuals();
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
  const attack = async () => {
    clearTimeout(dwell);
    if (state.phase !== 'idle' || root.dataset.peel !== 'none') return;
    if (reduce.matches) {
      status.textContent =
        'React selected. Travel and impact are off for reduced motion.';
      return;
    }
    const own = ++generation;
    const started = performance.now();
    const anchor = relative(target);
    const avatarBox = avatar.getBoundingClientRect();
    const contact = `translate(${anchor.x - avatarBox.width * 0.6}px, ${anchor.y + anchor.height * 0.29}px)`;
    const from = home();
    const middle = relative(perch);
    const airborne = `translate(${(middle.x + anchor.x) / 2}px, ${Math.max(70, anchor.y - 75)}px) rotate(-12deg)`;
    const phase = (value: ActivePhase) => {
      if (own !== generation) throw new Error('cancelled');
      setState({ phase: value, targetId: 'react' });
    };
    try {
      phase('anticipation');
      status.textContent = 'A little mischief incoming.';
      await animate(
        avatar,
        [
          { transform: from },
          { transform: `${from} rotate(-12deg) scale(1.05,.92)` },
        ],
        110,
      );
      phase('travel');
      await animate(
        avatar,
        [
          { transform: from },
          { transform: airborne, offset: 0.5 },
          { transform: contact },
        ],
        300,
        MOVE,
      );
      avatar.style.transform = contact;
      phase('kick');
      const leg = avatar.querySelector('.front-leg')!;
      const body = avatar.querySelector('.body')!;
      await Promise.all([
        animate(
          leg,
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-87deg)' }],
          130,
        ),
        animate(
          body,
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-13deg)' }],
          130,
        ),
      ]);
      phase('impact');
      crack.style.left = `${anchor.x + anchor.width / 2 - 80}px`;
      crack.style.top = `${anchor.y + 45 - 80}px`;
      scene?.render({ recoil: 1, curl: null });
      await animate(
        crack,
        [
          { opacity: 0, transform: 'scale(.9)' },
          { opacity: 0.85, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(1.04)' },
        ],
        160,
      );
      scene?.render({ recoil: 0, curl: null });
      phase('return');
      await animate(
        avatar,
        [
          { transform: contact },
          { transform: airborne, offset: 0.5 },
          { transform: from },
        ],
        300,
        MOVE,
      );
      if (own !== generation) return;
      completed++;
      root.dataset.kicks = String(completed);
      root.dataset.lastDuration = String(
        Math.round(performance.now() - started),
      );
      status.textContent = 'React survived. Back to the perch.';
    } catch {
      if (own === generation)
        status.textContent = 'Reset to the perch. Ready when you are.';
    } finally {
      if (own === generation) {
        setState({ phase: 'idle' });
        resetVisuals();
      }
    }
  };

  const showPeel = (kind: 'css' | 'mesh') => {
    if (reduce.matches) {
      status.textContent = 'Reveal motion is off for reduced motion.';
      return;
    }
    cancel();
    returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    root.dataset.peel = kind;
    skip.hidden = false;
    skip.focus({ preventScroll: true });
    const started = performance.now();
    revealDeadline = setTimeout(finishPeel, 1500);
    if (kind === 'css') {
      cover.hidden = false;
      void animate(
        cover,
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
        800,
        MOVE,
      )
        .then(finishPeel)
        .catch(() => {});
    } else if (scene) {
      sceneHost.style.zIndex = '10';
      const frame = () => {
        if (root.dataset.peel !== 'mesh') return;
        const progress = Math.min(1, (performance.now() - started) / 800);
        scene?.render({ recoil: 0, curl: progress });
        if (progress < 1) revealFrame = requestAnimationFrame(frame);
        else finishPeel();
      };
      revealFrame = requestAnimationFrame(frame);
    } else finishPeel();
  };

  target.disabled = false;
  root.querySelector<HTMLButtonElement>('[data-peel-button="css"]')!.disabled =
    false;
  target.addEventListener(
    'pointerenter',
    () => {
      if (fine.matches && !reduce.matches)
        dwell = setTimeout(() => void attack(), 150);
    },
    { signal: lifetime.signal },
  );
  target.addEventListener('pointerleave', () => clearTimeout(dwell), {
    signal: lifetime.signal,
  });
  target.addEventListener('click', () => void attack(), {
    signal: lifetime.signal,
  });
  skip.addEventListener(
    'click',
    () => {
      cancel();
      status.textContent = 'Reveal skipped. Content is ready.';
    },
    { signal: lifetime.signal },
  );
  root
    .querySelectorAll<HTMLButtonElement>('[data-layout]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          cancel();
          root.dataset.composition = button.dataset.layout;
          root
            .querySelectorAll('[data-layout]')
            .forEach((choice) =>
              choice.setAttribute('aria-pressed', String(choice === button)),
            );
          requestAnimationFrame(resetVisuals);
        },
        { signal: lifetime.signal },
      );
    });
  root
    .querySelectorAll<HTMLButtonElement>('[data-peel-button]')
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => showPeel(button.dataset.peelButton as 'css' | 'mesh'),
        { signal: lifetime.signal },
      );
    });
  reduce.addEventListener('change', cancel, { signal: lifetime.signal });
  window.addEventListener(
    'scroll',
    () => {
      if (state.phase !== 'idle') cancel();
    },
    { signal: lifetime.signal, passive: true },
  );
  const observer = new ResizeObserver(cancel);
  observer.observe(stage);
  resetVisuals();

  void import('./scene')
    .then(({ createScene }) => {
      if (disposed || reduce.matches) {
        root.dataset.scene = 'static';
        sceneStatus.textContent = 'Static artwork. Reduced motion is enabled.';
        return;
      }
      scene = createScene(sceneHost, target, () => {
        root.dataset.scene = 'fallback';
        sceneStatus.textContent = '3D unavailable. Static artwork stays ready.';
        cancel();
        root.querySelector<HTMLButtonElement>(
          '[data-peel-button="mesh"]',
        )!.disabled = true;
      });
      root.dataset.scene = 'ready';
      sceneStatus.textContent = 'Live 3D. One canvas. No Blender required.';
      root.querySelector<HTMLButtonElement>(
        '[data-peel-button="mesh"]',
      )!.disabled = false;
      resetVisuals();
    })
    .catch(() => {
      root.dataset.scene = 'fallback';
      sceneStatus.textContent = '3D unavailable. Static artwork stays ready.';
    });

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) cancel();
    },
    { signal: lifetime.signal },
  );
  window.addEventListener(
    'pagehide',
    () => {
      disposed = true;
      cancel();
      observer.disconnect();
      lifetime.abort();
      scene?.dispose();
    },
    { signal: lifetime.signal, once: true },
  );
}
