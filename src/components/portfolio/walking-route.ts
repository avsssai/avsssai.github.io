export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type Route = { points: Point[]; length: number; distances: number[] };

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const;
type FrontierNode = { id: number; score: number; order: number };
const earlier = (a: FrontierNode, b: FrontierNode) =>
  a.score < b.score || (a.score === b.score && a.order < b.order);
/** Stable priority queue preserves the previous Set insertion-order tie-break
 * while avoiding a full frontier scan on every A* expansion. */
class Frontier {
  private nodes: FrontierNode[] = [];
  push(node: FrontierNode) {
    let i = this.nodes.length;
    this.nodes.push(node);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!earlier(node, this.nodes[parent])) break;
      this.nodes[i] = this.nodes[parent];
      i = parent;
    }
    this.nodes[i] = node;
  }
  pop(): FrontierNode | undefined {
    if (!this.nodes.length) return;
    const first = this.nodes[0],
      last = this.nodes.pop()!;
    if (this.nodes.length) {
      let i = 0;
      while (i * 2 + 1 < this.nodes.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < this.nodes.length &&
          earlier(this.nodes[child + 1], this.nodes[child])
        )
          child++;
        if (!earlier(this.nodes[child], last)) break;
        this.nodes[i] = this.nodes[child];
        i = child;
      }
      this.nodes[i] = last;
    }
    return first;
  }
}
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
  const cells = new Array<Point | undefined>(cols * rows);
  const point = (id: number): Point =>
    (cells[id] ??= {
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
    // Exact slab intersection, without allocating nested coordinate arrays in
    // this hot loop. Tangency to an inflated obstacle edge remains allowed.
    const dx = b.x - a.x,
      dy = b.y - a.y;
    for (const rect of obstacles) {
      const right = rect.x + rect.width,
        bottom = rect.y + rect.height;
      if (
        (a.x <= rect.x && b.x <= rect.x) ||
        (a.x >= right && b.x >= right) ||
        (a.y <= rect.y && b.y <= rect.y) ||
        (a.y >= bottom && b.y >= bottom)
      )
        continue;
      let enter = 0,
        leave = 1;
      if (Math.abs(dx) >= 1e-9) {
        const t1 = (rect.x - a.x) / dx,
          t2 = (right - a.x) / dx;
        enter = Math.max(enter, Math.min(t1, t2));
        leave = Math.min(leave, Math.max(t1, t2));
        if (enter >= leave) continue;
      } else if (a.x <= rect.x || a.x >= right) continue;
      if (Math.abs(dy) >= 1e-9) {
        const t1 = (rect.y - a.y) / dy,
          t2 = (bottom - a.y) / dy;
        enter = Math.max(enter, Math.min(t1, t2));
        leave = Math.min(leave, Math.max(t1, t2));
        if (enter >= leave) continue;
      } else if (a.y <= rect.y || a.y >= bottom) continue;
      if (leave > 0 && enter < 1) return false;
    }
    return true;
  };
  if (!inside(start) || !inside(end) || blocked(start) || blocked(end))
    return null;
  // A legal point can round into an occupied grid cell at the edge of text.
  // Connect it to the nearest visible free neighbour rather than treating
  // that quantization artifact as an unreachable destination.
  const connector = (p: Point) => {
    const closest = index(p);
    if (clear(p, point(closest))) return closest;
    const col = closest % cols,
      row = Math.floor(closest / cols);
    let best = -1,
      nearest = Infinity;
    for (let y = Math.max(0, row - 2); y <= Math.min(rows - 1, row + 2); y++)
      for (
        let x = Math.max(0, col - 2);
        x <= Math.min(cols - 1, col + 2);
        x++
      ) {
        const id = y * cols + x,
          candidate = point(id),
          length = distance(p, candidate);
        if (length < nearest && clear(p, candidate)) {
          nearest = length;
          best = id;
        }
      }
    return best;
  };
  const first = connector(start),
    last = connector(end);
  if (first < 0 || last < 0) return null;
  const open = new Set([first]);
  const frontier = new Frontier();
  const order = new Map([[first, 0]]);
  let nextOrder = 1;
  frontier.push({ id: first, score: distance(start, end), order: 0 });
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
    let entry = frontier.pop();
    while (
      entry &&
      (!open.has(entry.id) ||
        entry.score !== score.get(entry.id) ||
        entry.order !== order.get(entry.id))
    )
      entry = frontier.pop();
    if (!entry) break;
    const current = entry.id;
    if (current === last) {
      found = true;
      break;
    }
    open.delete(current);
    const a = point(current),
      col = current % cols,
      row = Math.floor(current / cols);
    for (const [dx, dy] of NEIGHBOURS) {
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
      if (!open.has(next)) order.set(next, nextOrder++);
      open.add(next);
      frontier.push({
        id: next,
        score: score.get(next)!,
        order: order.get(next)!,
      });
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
