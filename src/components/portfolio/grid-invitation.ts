import type { Point } from './walking-route';

const SEEN_KEY = 'portfolio-grid-intro-v1';

/** A real destination in the existing grid, not a modal or a second game UI. */
export function mountGridInvitation(options: {
  root: HTMLElement;
  current(): Point;
  reachable(point: Point): boolean;
  choose(point: Point, instant: boolean): void;
  control: HTMLButtonElement;
}) {
  const { root } = options;
  const lifetime = new AbortController();
  let seen = false;
  try {
    seen = localStorage.getItem(SEEN_KEY) === 'seen';
  } catch {
    // Storage is optional: the invitation still works for this page visit.
  }
  let destination: Point | undefined;
  let firstArrival = false;
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  const cue = document.createElement('button');
  cue.type = 'button';
  cue.className = 'grid-invitation';
  cue.dataset.gridInvitation = '';
  cue.hidden = true;
  cue.setAttribute('aria-describedby', 'grid-help');
  cue.innerHTML = `<span class="grid-invitation__copy"><strong>${matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 ? 'tap' : 'click'} here!</strong><small>i’ll follow.</small></span>
    <svg class="grid-invitation__arrow" viewBox="0 0 164 128" fill="none" aria-hidden="true"><path d="M106 40C139 75 63 41 48 64S68 99 27 90m0 0 5-12m-5 12 14-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 87 40 85 42 120 5 122Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-dasharray="5 4"/><path d="m17 97 14 14m0-14-14 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
    <svg class="grid-invitation__compact-arrow" viewBox="0 0 164 48" fill="none" aria-hidden="true"><path d="M7 7 40 5 42 40 5 42Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-dasharray="5 4"/><path d="m17 17 14 14m0-14-14 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  const bubble = document.createElement('div');
  bubble.className = 'grid-first-arrival';
  bubble.dataset.gridFirstArrival = '';
  bubble.textContent = 'nice. where next?';
  bubble.hidden = true;
  bubble.setAttribute('aria-hidden', 'true');
  document.body.append(cue, bubble);

  const clearBubble = () => {
    clearTimeout(bubbleTimer);
    bubble.hidden = true;
  };
  const refresh = () => {
    cue.hidden = true;
    destination = undefined;
    if (
      seen ||
      document.hidden ||
      document.querySelector('[data-reveal-cover]')
    )
      return;
    const start = options.current();
    const header = document
      .querySelector('.site-header')
      ?.getBoundingClientRect();
    const footer = document
      .querySelector('.site-footer')
      ?.getBoundingClientRect();
    const protectedBoxes = [
      ...document.querySelectorAll<HTMLElement>(
        'h1,.work-link,.site-header,.site-footer,[data-grid-instructions]',
      ),
    ]
      .filter((node) => node.getClientRects().length)
      .map((node) => node.getBoundingClientRect());
    let topOffset = 104;
    // Prefer a cell-centred doodle; a compact inline version also fits the
    // clear strip above the heading on small phones and landscape viewports.
    for (const compact of [false, true]) {
      topOffset = compact ? 24 : 104;
      const candidates: Point[] = [];
      const step = compact ? 10 : 40;
      for (
        let y = compact ? 120 : 140;
        y + 24 < Math.min(innerHeight, footer?.top ?? innerHeight);
        y += step
      ) {
        for (let x = 60; x + 140 < innerWidth; x += step) {
          const box = {
            x: x - 24,
            y: y - topOffset,
            right: x + 140,
            bottom: y + 24,
          };
          if (box.y < (header?.bottom ?? 0) + 8) continue;
          if (
            protectedBoxes.some(
              (r) =>
                box.x < r.right + 8 &&
                box.right > r.left - 8 &&
                box.y < r.bottom + 8 &&
                box.bottom > r.top - 8,
            )
          )
            continue;
          candidates.push({ x, y });
        }
      }
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - start.x - 120, a.y - start.y - 160) -
          Math.hypot(b.x - start.x - 120, b.y - start.y - 160),
      );
      destination = candidates.find(options.reachable);
      if (destination) {
        cue.classList.toggle('grid-invitation--compact', compact);
        break;
      }
    }
    if (!destination) return; // Never cover content just to teach the toy.
    cue.style.transform = `translate(${destination.x - 24}px,${destination.y - topOffset}px)`;
    cue.dataset.destinationX = String(destination.x);
    cue.dataset.destinationY = String(destination.y);
    cue.hidden = false;
  };
  cue.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      if (!destination) return;
      options.choose(destination, event.detail === 0);
      if (cue.hidden && event.detail === 0)
        options.control.focus({ preventScroll: true });
    },
    { signal: lifetime.signal },
  );
  root.addEventListener('portfolio:revealed', refresh, {
    signal: lifetime.signal,
  });
  refresh();

  return {
    refresh,
    clearBubble,
    complete() {
      clearBubble();
      if (seen) return;
      seen = true;
      firstArrival = true;
      cue.hidden = true;
      try {
        localStorage.setItem(SEEN_KEY, 'seen');
      } catch {
        /* optional */
      }
    },
    arrive(point: Point) {
      if (!firstArrival) return false;
      firstArrival = false;
      // Find a clear speech-bubble position, rather than clipping under the
      // header or covering the heading when the first walk ends near an edge.
      bubble.style.visibility = 'hidden';
      bubble.hidden = false;
      const { width, height } = bubble.getBoundingClientRect();
      const headerBottom =
        document.querySelector('.site-header')?.getBoundingClientRect()
          .bottom ?? 0;
      const protectedBoxes = [
        ...document.querySelectorAll<HTMLElement>(
          'h1,.work-link,.site-header,.site-footer,[data-grid-instructions]',
        ),
      ]
        .filter((node) => node.getClientRects().length)
        .map((node) => node.getBoundingClientRect());
      const candidates = [
        { x: point.x - width / 2, y: point.y - 105 },
        { x: point.x + 28, y: Math.max(headerBottom + 8, point.y - 40) },
        {
          x: point.x - width - 28,
          y: Math.max(headerBottom + 8, point.y - 40),
        },
        { x: point.x - width / 2, y: point.y + 16 },
      ].map((p) => ({
        ...p,
        x: Math.max(8, Math.min(innerWidth - width - 8, p.x)),
      }));
      const spot = candidates.find(
        (p) =>
          p.y >= 8 &&
          p.y + height <= innerHeight - 8 &&
          !protectedBoxes.some(
            (r) =>
              p.x < r.right + 4 &&
              p.x + width > r.left - 4 &&
              p.y < r.bottom + 4 &&
              p.y + height > r.top - 4,
          ) &&
          !(
            p.x < point.x + 18 &&
            p.x + width > point.x - 18 &&
            p.y < point.y + 4 &&
            p.y + height > point.y - 52
          ),
      );
      bubble.style.visibility = '';
      if (spot) {
        bubble.style.transform = `translate(${spot.x}px,${spot.y}px)`;
        bubbleTimer = setTimeout(clearBubble, 2400);
      } else bubble.hidden = true; // The live status still gives the feedback.
      return true;
    },
    dispose() {
      lifetime.abort();
      clearBubble();
      cue.remove();
      bubble.remove();
    },
  };
}
