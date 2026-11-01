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
  layer.append(avatar, crack);
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
    home,
    show() {
      avatar.style.visibility = 'visible';
      perch.style.visibility = 'hidden';
    },
    reset() {
      avatar.style.visibility = 'hidden';
      perch.style.visibility = '';
      crack.style.opacity = '0';
    },
    dispose() {
      perch.style.visibility = '';
      layer.remove();
    },
  };
}
