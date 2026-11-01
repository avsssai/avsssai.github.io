export type PaperCut = {
  x: number;
  y: number;
  width: number;
  height: number;
  fold: number;
};

/** Coordinates are hero-local CSS pixels. The title and native controls keep
 * their existing layout; this stationary backdrop never becomes a hit target. */
export function paperStage(width: number, height: number): PaperCut {
  const phone = width <= 700;
  return {
    x: width / 2,
    y: height * (phone ? 0.485 : 0.41),
    width: width * (phone ? 0.9 : 0.65),
    height: height * (phone ? 0.49 : 0.67),
    fold: Math.min(phone ? 30 : 58, height * 0.08),
  };
}

/** A hand-cut outline, not a perfect UI card. Shape commands use screen-space
 * coordinates so the exact same outline can be authored as the SVG fallback. */
export function paperOutline(width: number, height: number, fold: number) {
  const w = width / 2,
    h = height / 2;
  const corner = Math.min(14, width * 0.04, height * 0.04);
  return [
    ['M', -w + corner, -h],
    ['Q', 0, -h - 4, w - corner, -h + 3],
    ['Q', w + 1, -h + 3, w, -h + corner],
    ['Q', w - 4, 0, w - 3, h - fold],
    ['L', w - fold, h - 1],
    ['Q', 0, h + 3, -w + corner, h - 2],
    ['Q', -w - 2, h - 2, -w, h - corner],
    ['Q', -w + 4, 0, -w, -h + corner],
    ['Q', -w, -h, -w + corner, -h],
    ['Z'],
  ] as const;
}
