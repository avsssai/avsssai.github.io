import type { Rect } from './walking-route';
let measure: CanvasRenderingContext2D | null | undefined;

/** Protect painted prose, not the font's invisible ascent/descent padding.
 * The grid planner and letter solver must agree on these same boundaries. */
export function readProtectedRects(
  root: HTMLElement,
  includeWord = false,
): Rect[] {
  const rects: Rect[] = [];
  if (includeWord) {
    const heading = root.querySelector('h1');
    if (heading) {
      const range = document.createRange();
      range.selectNodeContents(heading);
      const boxes = [
        range.getBoundingClientRect(),
        ...[...heading.querySelectorAll('svg')].map((svg) => {
          const r = document.createRange();
          r.selectNodeContents(svg);
          return r.getBoundingClientRect();
        }),
      ].filter((b) => b.width && b.height);
      const x = Math.min(...boxes.map((b) => b.left)),
        y = Math.min(...boxes.map((b) => b.top));
      rects.push({
        x,
        y,
        width: Math.max(...boxes.map((b) => b.right)) - x,
        height: Math.max(...boxes.map((b) => b.bottom)) - y,
      });
    }
  } else {
    if (measure === undefined)
      measure = document.createElement('canvas').getContext('2d');
    for (const marker of root.querySelectorAll<HTMLElement>(
      '[data-copy-obstacle]',
    )) {
      const text = document.createTreeWalker(marker, NodeFilter.SHOW_TEXT);
      while (text.nextNode()) {
        const node = text.currentNode;
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        let x = box.x,
          y = box.y,
          width = box.width,
          height = box.height;
        if (measure && range.getClientRects().length === 1) {
          measure.font = getComputedStyle(node.parentElement!).font;
          const ink = measure.measureText(node.textContent);
          if (
            Number.isFinite(ink.fontBoundingBoxAscent) &&
            ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent > 0
          ) {
            const baseline = box.top + ink.fontBoundingBoxAscent;
            y = baseline - ink.actualBoundingBoxAscent;
            height = ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent;
            const left = Math.max(0, ink.actualBoundingBoxLeft),
              right = Math.max(0, ink.actualBoundingBoxRight - ink.width);
            x -= left;
            width += left + right;
          }
        }
        rects.push({ x, y, width, height });
      }
    }
  }
  for (const node of root.querySelectorAll<HTMLElement>(
    '.work-link,[data-grid-controls],[data-reset-letters]',
  )) {
    if (!node.getClientRects().length) continue;
    const b = node.getBoundingClientRect();
    if (b.width && b.height)
      rects.push({ x: b.x, y: b.y, width: b.width, height: b.height });
  }
  return rects;
}
