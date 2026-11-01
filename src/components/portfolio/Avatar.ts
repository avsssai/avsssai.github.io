import character from '../../../public/art/portfolio/character.svg?raw';

export function mountAvatar(root: HTMLElement, perch: HTMLImageElement) {
  const layer = document.createElement('div');
  layer.dataset.avatarLayer = '';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:absolute;inset:0;pointer-events:none;z-index:5;overflow:visible;';
  const avatar = document.createElement('div');
  avatar.dataset.avatar = '';
  avatar.style.cssText =
    'position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;';
  avatar.innerHTML = character;
  const svg = avatar.querySelector('svg')!;
  svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible;';
  const body = svg.querySelector<SVGGElement>('.body')!;
  const leg = svg.querySelector<SVGGElement>('.front-leg')!;
  const arm = svg.querySelector<SVGGElement>('.front-arm')!;
  body.style.transformOrigin = '60px 95px';
  leg.style.transformOrigin = '72px 104px';
  arm.style.transformOrigin = '78px 69px';
  const crack = document.createElement('div');
  crack.dataset.kickCrack = '';
  crack.style.cssText =
    'position:absolute;left:0;top:0;width:64px;height:64px;opacity:0;color:var(--color-ink);';
  crack.innerHTML =
    '<svg viewBox="-32 -32 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M-23 -15 -10 -10 -5 -2 0 0 9 -3 15 -16M0 0 -5 10 -17 16M0 0 10 8 24 10"/><path d="M-22 -25 -25 -29M23 -20 28 -23M22 24 26 28"/></svg>';
  const trail = document.createElement('div');
  trail.dataset.motionEffect = 'speed';
  trail.style.cssText =
    'position:absolute;top:30%;width:70%;height:45%;opacity:0;color:var(--color-ink);';
  trail.innerHTML =
    '<svg viewBox="0 0 60 40" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 9H48M0 20H40M15 31H52"/></svg>';
  avatar.append(trail);
  const ring = document.createElement('div');
  ring.dataset.motionEffect = 'pressure';
  ring.style.cssText =
    'position:absolute;left:0;top:0;width:80px;height:80px;opacity:0;color:var(--color-ink);';
  ring.innerHTML =
    '<svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.2"><ellipse cx="40" cy="40" rx="17" ry="28"/></svg>';
  const dent = document.createElement('div');
  dent.dataset.motionEffect = 'paper';
  dent.style.cssText =
    'position:absolute;width:144px;height:80px;opacity:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse at 50% 50%,transparent 32%,color-mix(in srgb,var(--color-ink) 9%,transparent) 48%,transparent 67%);';
  root.prepend(dent);
  layer.append(avatar, crack, ring);
  root.append(layer);
  const home = () => {
    const box = root.getBoundingClientRect();
    const anchor = perch.getBoundingClientRect();
    avatar.style.width = `${anchor.width}px`;
    avatar.style.height = `${anchor.height}px`;
    return {
      x: anchor.x - box.x,
      y: anchor.y - box.y,
      width: anchor.width,
      height: anchor.height,
    };
  };
  return {
    avatar,
    body,
    leg,
    arm,
    crack,
    trail,
    ring,
    dent,
    home,
    show() {
      avatar.style.visibility = 'visible';
      perch.style.visibility = 'hidden';
    },
    reset() {
      avatar.style.visibility = 'hidden';
      perch.style.visibility = '';
      crack.style.opacity = '0';
      trail.style.opacity = '0';
      ring.style.opacity = '0';
      dent.style.opacity = '0';
    },
    dispose() {
      perch.style.visibility = '';
      layer.remove();
      dent.remove();
    },
  };
}
