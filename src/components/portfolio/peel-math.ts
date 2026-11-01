export interface PeelPoint {
  x: number;
  y: number;
}
export interface SpringAxis {
  position: number;
  velocity: number;
}
export interface PeelFold {
  nx: number;
  ny: number;
  length: number;
  radius: number;
  crease: number;
}

// Screen-space coordinates: the fixed attached corner is the top right.
export function peelFold(
  width: number,
  height: number,
  tip: PeelPoint,
): PeelFold {
  const dx = Math.min(-0.01, tip.x - width);
  const dy = Math.max(0.01, tip.y);
  const length = Math.hypot(dx, dy);
  const radius = Math.min(
    44,
    Math.min(width, height) * 0.065,
    length / (Math.PI * 1.5),
  );
  return {
    nx: dx / length,
    ny: dy / length,
    length,
    radius,
    crease: (length + Math.PI * radius) / 2,
  };
}

// Developable cylindrical bend: flat attached film -> continuous curved lip
// -> folded-back underside. Position AND tangent agree at both joins.
export function bendSheetPoint(
  x: number,
  y: number,
  width: number,
  fold: PeelFold,
): { x: number; y: number; z: number } {
  const s = (x - width) * fold.nx + y * fold.ny;
  const distance = fold.crease - s;
  if (distance <= 0) return { x, y, z: 0 };
  const arc = Math.min(distance / fold.radius, Math.PI);
  const projected =
    distance <= Math.PI * fold.radius
      ? fold.crease - fold.radius * Math.sin(arc)
      : fold.crease + distance - Math.PI * fold.radius;
  const shift = projected - s;
  return {
    x: x + shift * fold.nx,
    y: y + shift * fold.ny,
    z: fold.radius * (1 - Math.cos(arc)),
  };
}

// Exact critically damped solution, response 0.4s. Stable after a delayed frame;
// no frame-rate-dependent Euler integration or input latency while dragging.
export function settleAxis(
  axis: SpringAxis,
  target: number,
  dt: number,
): SpringAxis {
  const omega = (2 * Math.PI) / 0.4;
  const delta = axis.position - target;
  const c = axis.velocity + omega * delta;
  const decay = Math.exp(-omega * dt);
  return {
    position: target + (delta + c * dt) * decay,
    velocity: (axis.velocity - omega * c * dt) * decay,
  };
}

export function clampTip(
  point: PeelPoint,
  width: number,
  height: number,
): PeelPoint {
  return {
    x: Math.max(-width * 2, Math.min(width - 1, point.x)),
    y: Math.max(1, Math.min(height * 3, point.y)),
  };
}

// Only a deliberate pull to the far edge can detach. A release in the middle
// never projects momentum into an unsolicited full dismissal.
export function isDetachPull(
  tip: PeelPoint,
  width: number,
  height: number,
): boolean {
  return Math.hypot(width - tip.x, tip.y) >= Math.hypot(width, height) * 0.94;
}

export function detachedTip(
  tip: PeelPoint,
  width: number,
  height: number,
): PeelPoint {
  const fold = peelFold(width, height, tip);
  const extent = -width * fold.nx + height * fold.ny;
  const length =
    extent * 2 + Math.PI * fold.radius + Math.hypot(width, height) * 0.15;
  return { x: width + fold.nx * length, y: fold.ny * length };
}
