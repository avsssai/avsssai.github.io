import type { Point } from './stack-items';
import type { Move } from './interaction-state';

export type EffectRect = Point & { width: number; height: number };

export const impactWord = (move: Move) =>
  move === 'kick' ? 'KACHOW!' : 'KAPOW!';

export function placeComic(
  anchor: Point,
  size: { width: number; height: number },
  viewport: EffectRect,
  obstacles: readonly EffectRect[],
): Point {
  const { width, height } = size;
  const gap = 14;
  const candidates = [
    { x: anchor.x - width / 2, y: anchor.y - height - gap },
    { x: anchor.x + gap, y: anchor.y - height / 2 },
    { x: anchor.x - width - gap, y: anchor.y - height / 2 },
    { x: anchor.x - width / 2, y: anchor.y + gap },
    { x: anchor.x + gap, y: anchor.y - height - gap },
    { x: anchor.x - width - gap, y: anchor.y - height - gap },
    ...obstacles.flatMap((obstacle) => [
      { x: anchor.x - width / 2, y: obstacle.y + obstacle.height + gap },
      { x: anchor.x - width / 2, y: obstacle.y - height - gap },
      { x: obstacle.x + obstacle.width + gap, y: anchor.y - height / 2 },
      { x: obstacle.x - width - gap, y: anchor.y - height / 2 },
    ]),
  ].map((point) => ({
    x: Math.max(
      viewport.x + gap,
      Math.min(viewport.x + viewport.width - width - gap, point.x),
    ),
    y: Math.max(
      viewport.y + gap,
      Math.min(viewport.y + viewport.height - height - gap, point.y),
    ),
  }));
  const overlap = (point: Point) =>
    obstacles.reduce(
      (area, obstacle) =>
        area +
        Math.max(
          0,
          Math.min(point.x + width, obstacle.x + obstacle.width) -
            Math.max(point.x, obstacle.x),
        ) *
          Math.max(
            0,
            Math.min(point.y + height, obstacle.y + obstacle.height) -
              Math.max(point.y, obstacle.y),
          ),
      0,
    );
  const distance = (point: Point) =>
    (point.x + width / 2 - anchor.x) ** 2 +
    (point.y + height / 2 - anchor.y) ** 2;
  return candidates.reduce((best, candidate) => {
    const difference = overlap(candidate) - overlap(best);
    return difference < 0 ||
      (difference === 0 && distance(candidate) < distance(best))
      ? candidate
      : best;
  });
}
