import Matter from 'matter-js';
import type { Body as MatterBody } from 'matter-js';

const { Bodies, Body, Composite, Engine, Query, Sleeping } = Matter;
export type LetterBox = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;
export type LetterActor = Readonly<{
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}>;

/** Planar rigid bodies in viewport pixels. Keep engine objects private to this
 * module; views only receive poses. Glyph/protected boxes use centre x/y;
 * bounds use top-left x/y. One step is exactly 1/60 second. */
export function createLetterWorld(
  boxes: readonly LetterBox[],
  bounds: LetterBox,
  protectedBoxes: readonly LetterBox[] = [],
  headlineBoxes: readonly LetterBox[] = [],
) {
  const engine = Engine.create({
    enableSleeping: true,
    positionIterations: 8,
    velocityIterations: 8,
  });
  engine.gravity.x = 0;
  engine.gravity.y = 0;
  engine.gravity.scale = 0;
  const letters = boxes.map((b, index) =>
    Bodies.rectangle(
      b.x,
      b.y,
      Math.max(4, b.width * 0.88),
      Math.max(4, b.height * 0.9),
      {
        label: `letter-${index}`,
        density: 0.002,
        friction: 0.7,
        frictionStatic: 0.85,
        frictionAir: 0.085,
        restitution: 0.09,
        slop: 0.03,
        sleepThreshold: 35,
      },
    ),
  );
  const headlines = headlineBoxes.map((b, index) =>
    Bodies.rectangle(b.x, b.y, b.width, b.height, {
      label: `headline-${index}`,
      density: 0.08,
      friction: 0.8,
      frictionAir: 0.22,
      restitution: 0.02,
      slop: 0.03,
      sleepThreshold: 35,
    }),
  );
  const bodies = [...letters, ...headlines];
  const wall = (x: number, y: number, width: number, height: number) =>
    Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      friction: 0.7,
      restitution: 0.05,
    });
  const halfW = bounds.width / 2,
    halfH = bounds.height / 2;
  const walls = [
    wall(bounds.x - 16, bounds.y + halfH, 32, bounds.height + 64),
    wall(
      bounds.x + bounds.width + 16,
      bounds.y + halfH,
      32,
      bounds.height + 64,
    ),
    wall(bounds.x + halfW, bounds.y - 16, bounds.width + 64, 32),
    wall(
      bounds.x + halfW,
      bounds.y + bounds.height + 16,
      bounds.width + 64,
      32,
    ),
    ...protectedBoxes
      .filter((b) => b.width > 0 && b.height > 0)
      .map((b) => wall(b.x, b.y, b.width + 6, b.height + 6)),
  ];
  Composite.add(engine.world, [...bodies, ...walls]);
  bodies.forEach((body) => Sleeping.set(body, true));
  let actor: MatterBody | undefined,
    contacts = new Set<number>(),
    impacts = 0,
    headlineImpacts = 0,
    contactRadius = 18,
    disposed = false;
  const near = (sample: LetterActor) =>
    bodies.some((body) => {
      const dx = Math.max(
          body.bounds.min.x - sample.x,
          0,
          sample.x - body.bounds.max.x,
        ),
        dy = Math.max(
          body.bounds.min.y - sample.y,
          0,
          sample.y - body.bounds.max.y,
        );
      const reach = sample.radius + Math.hypot(sample.vx, sample.vy) / 60 + 3;
      return dx * dx + dy * dy < reach * reach;
    });
  return {
    near,
    step(sample: LetterActor | null) {
      if (disposed) return;
      if (sample) {
        contactRadius = sample.radius;
        if (!actor) {
          actor = Bodies.circle(sample.x, sample.y, sample.radius, {
            isStatic: true,
            friction: 0.55,
            restitution: 0.08,
            label: 'character',
          });
          Composite.add(engine.world, actor);
        }
        Body.setPosition(actor, { x: sample.x, y: sample.y });
        const speed = Math.hypot(sample.vx, sample.vy),
          factor = speed ? Math.min(1, (sample.radius * 18) / speed) : 0;
        Body.setVelocity(actor, {
          x: (sample.vx * factor) / 60,
          y: (sample.vy * factor) / 60,
        });
        const next = new Set<number>();
        for (const collision of Query.collides(actor, bodies)) {
          const body =
            collision.bodyA === actor ? collision.bodyB : collision.bodyA;
          next.add(body.id);
          if (speed > 5) {
            Sleeping.set(body, false);
            if (!contacts.has(body.id)) {
              if (letters.includes(body)) impacts++;
              else headlineImpacts++;
            }
          }
        }
        contacts = next;
      } else if (actor) {
        Composite.remove(engine.world, actor);
        actor = undefined;
        contacts.clear();
      }
      Engine.update(engine, 1000 / 60);
      // A fast far-away destination must not turn a small walker into an
      // explosive bowling ball. Bounds are in character-size units per second.
      const maxSpeed = (contactRadius * 12) / 60;
      for (const body of letters) {
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed > maxSpeed)
          Body.setVelocity(body, {
            x: (body.velocity.x * maxSpeed) / speed,
            y: (body.velocity.y * maxSpeed) / speed,
          });
        const maxSpin = 2.5 / 60;
        if (Math.abs(body.angularVelocity) > maxSpin)
          Body.setAngularVelocity(
            body,
            Math.sign(body.angularVelocity) * maxSpin,
          );
      }
      // Heavy, locally constrained blocks: nudged, never scattered. These
      // vertical/tilt limits preserve the separation of the two readable lines.
      headlines.forEach((body, index) => {
        const home = headlineBoxes[index],
          maxX = Math.min(12, home.height * 0.18),
          maxY = Math.min(3, home.height * 0.025);
        const dx = body.position.x - home.x,
          dy = body.position.y - home.y;
        const x = Math.max(-maxX, Math.min(maxX, dx)),
          y = Math.max(-maxY, Math.min(maxY, dy));
        if (x !== dx || y !== dy)
          Body.setPosition(body, { x: home.x + x, y: home.y + y });
        let vx = x !== dx && body.velocity.x * dx > 0 ? 0 : body.velocity.x;
        let vy = y !== dy && body.velocity.y * dy > 0 ? 0 : body.velocity.y;
        const speed = Math.hypot(vx, vy),
          cap = (contactRadius * 1.8) / 60;
        if (speed > cap) {
          vx *= cap / speed;
          vy *= cap / speed;
        }
        Body.setVelocity(body, { x: vx, y: vy });
        const angle = Math.max(-0.012, Math.min(0.012, body.angle));
        let spin = Math.max(
          -0.16 / 60,
          Math.min(0.16 / 60, body.angularVelocity),
        );
        if (angle !== body.angle) {
          if (spin * body.angle > 0) spin = 0;
          Body.setAngle(body, angle);
        }
        Body.setAngularVelocity(body, spin);
      });
    },
    get headlinePoses() {
      return headlines.map((b) => ({
        x: b.position.x,
        y: b.position.y,
        angle: b.angle,
        sleeping: b.isSleeping,
      }));
    },
    get headlineImpacts() {
      return headlineImpacts;
    },
    get poses() {
      return letters.map((b) => ({
        x: b.position.x,
        y: b.position.y,
        angle: b.angle,
        sleeping: b.isSleeping,
        speed: Math.hypot(b.velocity.x, b.velocity.y) * 60,
        angularSpeed: b.angularVelocity * 60,
      }));
    },
    get awake() {
      return bodies.some((b) => !b.isSleeping);
    },
    get impacts() {
      return impacts;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    },
  };
}
