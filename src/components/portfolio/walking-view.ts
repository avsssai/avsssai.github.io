import { routeAt, type Route } from './walking-route';

/** Owns only trip visuals and a single active frame loop; selection and the
 * interaction state machine remain owned by the existing controller. */
export function mountWalking(avatar: HTMLElement) {
  const ns = 'http://www.w3.org/2000/svg';
  const trail = document.createElementNS(ns, 'svg');
  trail.dataset.walkingTrail = '';
  trail.setAttribute('aria-hidden', 'true');
  trail.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;color:var(--color-ink);opacity:0;';
  avatar.before(trail);
  const svg = avatar.querySelector('svg')!;
  const body = svg.querySelector<SVGGElement>('.body')!;
  const frontLeg = svg.querySelector<SVGGElement>('.front-leg')!;
  const backLeg = svg.querySelector<SVGGElement>('.back-leg')!;
  const frontArm = svg.querySelector<SVGGElement>('.front-arm')!;
  const backArm = svg.querySelector<SVGGElement>('.back-arm')!;
  backLeg.style.transformOrigin = '52px 104px';
  backArm.style.transformOrigin = '43px 70px';
  let frame = 0;
  let rejectTravel: ((reason: Error) => void) | undefined;
  let dots: SVGCircleElement[][] = [];
  const resetPose = () => {
    [body, frontLeg, backLeg, frontArm, backArm].forEach(
      (n) => (n.style.transform = ''),
    );
  };
  const cancel = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    rejectTravel?.(new Error('walking-cancelled'));
    rejectTravel = undefined;
    resetPose();
    trail.style.opacity = '0';
    trail.replaceChildren();
    dots = [];
  };
  return {
    trail,
    prepare(routes: Route[], preview = false) {
      cancel();
      trail.style.opacity = '1';
      dots = routes.map((route, index) => {
        const group = document.createElementNS(ns, 'g');
        group.dataset.route = index ? 'return' : 'outbound';
        group.setAttribute('opacity', index ? '.44' : '.62');
        trail.append(group);
        const count = Math.min(220, Math.ceil(route.length / 10));
        return Array.from({ length: count }, (_, i) => {
          const point = routeAt(route, (i + 0.5) / count);
          const dot = document.createElementNS(ns, 'circle');
          dot.setAttribute('cx', String(point.x));
          dot.setAttribute('cy', String(point.y));
          dot.setAttribute('r', index ? '1.5' : '1.8');
          dot.setAttribute('fill', 'currentColor');
          dot.style.visibility = preview ? 'visible' : 'hidden';
          group.append(dot);
          return dot;
        });
      });
    },
    travel(
      route: Route,
      index: number,
      size: { width: number; height: number },
      valid: () => void,
    ) {
      return new Promise<void>((resolve, reject) => {
        rejectTravel = reject;
        const duration = Math.max(
          800,
          Math.min(2400, (route.length / 300) * 1000),
        );
        let started: number | undefined,
          shown = 0;
        const tick = (now: number) => {
          try {
            valid();
          } catch (error) {
            frame = 0;
            rejectTravel = undefined;
            reject(error);
            return;
          }
          started ??= now;
          const progress = Math.min(1, (now - started) / duration);
          const point = routeAt(route, progress),
            next = routeAt(route, Math.min(1, progress + 0.003));
          const previous = routeAt(route, Math.max(0, progress - 0.003));
          const direction = next.x - previous.x >= 0 ? 1 : -1;
          svg.style.transform = `scaleX(${direction})`;
          const stride = ((progress * route.length) / 40) * Math.PI * 2;
          const settle = Math.min(1, progress * 15, (1 - progress) * 15);
          const swing = Math.sin(stride) * 26 * settle;
          avatar.style.transform = `translate(${point.x - size.width / 2}px,${point.y - size.height * 0.94}px)`;
          body.style.transform = `translateY(${-Math.abs(Math.sin(stride)) * 2.5 * settle}px) rotate(${Math.sin(stride) * 1.5 * settle}deg)`;
          frontLeg.style.transform = `rotate(${swing}deg)`;
          backLeg.style.transform = `rotate(${-swing}deg)`;
          frontArm.style.transform = `rotate(${-swing * 0.65}deg)`;
          backArm.style.transform = `rotate(${swing * 0.65}deg)`;
          const count = Math.floor(progress * (dots[index]?.length ?? 0));
          while (shown < count)
            dots[index][shown++].style.visibility = 'visible';
          if (progress < 1) frame = requestAnimationFrame(tick);
          else {
            frame = 0;
            rejectTravel = undefined;
            resetPose();
            resolve();
          }
        };
        frame = requestAnimationFrame(tick);
      });
    },
    cancel,
    dispose() {
      cancel();
      trail.remove();
    },
  };
}
