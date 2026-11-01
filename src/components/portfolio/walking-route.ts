export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type Route = { points: Point[]; length: number; distances: number[] };

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
export function routeAt(route: Route, progress: number): Point {
  const d = Math.max(0, Math.min(1, progress)) * route.length;
  let i = 1;
  while (i < route.distances.length - 1 && route.distances[i] < d) i++;
  const a = route.points[i - 1],
    b = route.points[i];
  const t =
    (d - route.distances[i - 1]) /
    (route.distances[i] - route.distances[i - 1] || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Feet-space routing: inflated obstacles account for the full standing actor.
 * Return paths penalise the outgoing corridor; bounded wiggles make both trips
 * hand-drawn without randomly changing the route during an interaction. */
export function walkingRoute(
  start: Point,
  end: Point,
  bounds: Rect,
  obstacles: Rect[],
  returning = false,
  previous?: Route,
): Route | null {
  const step = bounds.width < 500 ? 8 : 18;
  const cols = Math.max(2, Math.ceil(bounds.width / step));
  const rows = Math.max(2, Math.ceil(bounds.height / step));
  const point = (id: number): Point => ({
    x: bounds.x + ((id % cols) * bounds.width) / (cols - 1),
    y: bounds.y + (Math.floor(id / cols) * bounds.height) / (rows - 1),
  });
  const index = (p: Point) =>
    Math.max(
      0,
      Math.min(
        rows - 1,
        Math.round(((p.y - bounds.y) / bounds.height) * (rows - 1)),
      ),
    ) *
      cols +
    Math.max(
      0,
      Math.min(
        cols - 1,
        Math.round(((p.x - bounds.x) / bounds.width) * (cols - 1)),
      ),
    );
  const inside = (p: Point) =>
    p.x >= bounds.x &&
    p.x <= bounds.x + bounds.width &&
    p.y >= bounds.y &&
    p.y <= bounds.y + bounds.height;
  const blocked = (p: Point) =>
    obstacles.some(
      (r) =>
        p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height,
    );
  const clear = (a: Point, b: Point) => {
    if (!inside(a) || !inside(b)) return false;
    // Exact segment/rectangle slab test. Point sampling can miss a thin corner
    // crossing on a long shortcut, even when the grid path itself was safe.
    for (const rect of obstacles) {
      let enter = 0,
        leave = 1,
        hit = true;
      for (const [origin, delta, min, max] of [
        [a.x, b.x - a.x, rect.x, rect.x + rect.width],
        [a.y, b.y - a.y, rect.y, rect.y + rect.height],
      ]) {
        if (Math.abs(delta) < 1e-9) {
          if (origin <= min || origin >= max) {
            hit = false;
            break;
          }
        } else {
          const t1 = (min - origin) / delta,
            t2 = (max - origin) / delta;
          enter = Math.max(enter, Math.min(t1, t2));
          leave = Math.min(leave, Math.max(t1, t2));
          if (enter >= leave) {
            hit = false;
            break;
          }
        }
      }
      if (hit && leave > 0 && enter < 1) return false;
    }
    return true;
  };
  if (!inside(start) || !inside(end) || blocked(start) || blocked(end))
    return null;
  const first = index(start),
    last = index(end);
  if (!clear(start, point(first)) || !clear(point(last), end)) return null;
  const open = new Set([first]);
  const cost = new Map([[first, 0]]),
    score = new Map([[first, distance(start, end)]]),
    parent = new Map<number, number>();
  const penalised = new Set<number>();
  if (returning && previous) {
    const reach =
      Math.ceil(
        32 / Math.min(bounds.width / (cols - 1), bounds.height / (rows - 1)),
      ) + 1;
    for (let i = 0; i < previous.points.length; i += 4) {
      const p = previous.points[i],
        centre = index(p);
      const col = centre % cols,
        row = Math.floor(centre / cols);
      for (
        let y = Math.max(0, row - reach);
        y <= Math.min(rows - 1, row + reach);
        y++
      )
        for (
          let x = Math.max(0, col - reach);
          x <= Math.min(cols - 1, col + reach);
          x++
        ) {
          const id = y * cols + x,
            cell = point(id);
          if ((cell.x - p.x) ** 2 + (cell.y - p.y) ** 2 < 32 ** 2)
            penalised.add(id);
        }
    }
  }
  let found = false;
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const id of open)
      if (score.get(id)! < best) {
        current = id;
        best = score.get(id)!;
      }
    if (current === last) {
      found = true;
      break;
    }
    open.delete(current);
    const a = point(current),
      col = current % cols,
      row = Math.floor(current / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      if (col + dx < 0 || col + dx >= cols || row + dy < 0 || row + dy >= rows)
        continue;
      const next = current + dx + dy * cols,
        b = point(next);
      if (!clear(a, b)) continue;
      const penalty = penalised.has(next) ? 24 : 0;
      const value = cost.get(current)! + distance(a, b) + penalty;
      if (value >= (cost.get(next) ?? Infinity)) continue;
      parent.set(next, current);
      cost.set(next, value);
      score.set(next, value + distance(b, end));
      open.add(next);
    }
  }
  if (!found) return null;
  const raw = [end];
  let cursor = last;
  while (cursor !== first) {
    raw.push(point(cursor));
    cursor = parent.get(cursor)!;
  }
  raw.push(point(first), start);
  raw.reverse();
  // Line-of-sight simplification retains obstacle avoidance. Limit shortcuts on
  // return so the deliberately different corridor isn't simplified away.
  const corners = [raw[0]];
  for (let i = 0; i < raw.length - 1;) {
    let j = Math.min(raw.length - 1, i + (returning ? 5 : 12));
    while (j > i + 1 && !clear(raw[i], raw[j])) j--;
    corners.push(raw[j]);
    i = j;
  }
  const points: Point[] = [start];
  for (let i = 1; i < corners.length; i++) {
    const a = corners[i - 1],
      b = corners[i],
      length = distance(a, b);
    const count = Math.max(1, Math.ceil(length / 5));
    const wavy: Point[] = [];
    const straight: Point[] = [];
    let safe = true;
    for (let n = 1; n <= count; n++) {
      const t = n / count,
        base = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const wave =
        Math.sin(t * Math.PI * 2) *
        Math.sin(t * Math.PI) *
        Math.min(14, length * 0.12) *
        (returning ? -1 : 1);
      const p = {
        x: base.x - ((b.y - a.y) / (length || 1)) * wave,
        y: base.y + ((b.x - a.x) / (length || 1)) * wave,
      };
      safe &&= clear(wavy.at(-1) ?? a, p);
      wavy.push(p);
      straight.push(base);
    }
    // Reject the whole embellishment if even one segment clips. Never join a
    // displaced wave point directly to an unchecked straight-line fallback.
    points.push(...(safe ? wavy : straight));
  }
  for (let i = 1; i < points.length; i++)
    if (!clear(points[i - 1], points[i])) return null;
  const distances = [0];
  for (let i = 1; i < points.length; i++)
    distances.push(distances[i - 1] + distance(points[i - 1], points[i]));
  const route = { points, distances, length: distances[distances.length - 1] };
  if (returning && previous && routeSeparation(previous, route) < 6)
    return null;
  return route;
}

/** Maximum visible separation at matching arc-length progress, excluding the
 * shared departure/arrival approaches. Zero means reversed playback. */
export function routeSeparation(outbound: Route, inbound: Route): number {
  let separation = 0;
  for (let i = 2; i <= 18; i++)
    separation = Math.max(
      separation,
      distance(routeAt(outbound, i / 20), routeAt(inbound, 1 - i / 20)),
    );
  return separation;
}
