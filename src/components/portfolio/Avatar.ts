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
    'position:absolute;top:10%;width:180%;height:85%;opacity:0;color:var(--color-ink);';
  trail.innerHTML =
    '<svg viewBox="0 0 150 90" width="100%" height="100%" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M10 58Q46 75 77 44T143 30" stroke-width="7"/><path d="M23 78Q65 84 94 60T145 48M3 30Q38 43 62 25T116 10" stroke-width="3.5"/><path d="m102 72 5-11 5 11 11 5-11 5-5 11-5-11-11-5z" fill="currentColor" stroke="none"/></svg>';
  avatar.append(trail);
  const ring = document.createElement('div');
  ring.dataset.motionEffect = 'pressure';
  ring.style.cssText =
    'position:absolute;left:0;top:0;width:104px;height:104px;opacity:0;color:var(--color-ink);';
  ring.innerHTML =
    '<svg viewBox="0 0 104 104" width="104" height="104" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><ellipse cx="52" cy="52" rx="23" ry="35"/><path d="m17 20-8-8M12 51H2m15 31-8 8m78-70 8-8M92 51h10M87 82l8 8"/></svg>';
  const burst = document.createElement('div');
  burst.dataset.motionEffect = 'comic';
  burst.style.cssText =
    'position:absolute;left:0;top:0;width:160px;height:100px;opacity:0;';
  burst.innerHTML =
    '<svg viewBox="0 0 160 100" width="100%" height="100%" overflow="visible"><path d="M7 42 25 33 14 15 49 20 60 4 80 17 101 5 109 24 142 15 132 36 156 49 139 60 148 83 113 78 101 96 81 82 60 96 49 80 19 88 24 65 4 56Z" fill="#252523" transform="translate(3 4)"/><path d="M7 42 25 33 14 15 49 20 60 4 80 17 101 5 109 24 142 15 132 36 156 49 139 60 148 83 113 78 101 96 81 82 60 96 49 80 19 88 24 65 4 56Z" fill="#ffe18a" stroke="#252523" stroke-width="2.5" stroke-linejoin="round"/><text data-comic-word x="80" y="59" text-anchor="middle" fill="#252523" font-size="25" font-weight="900" font-style="italic" font-family="var(--font-sans),sans-serif" textLength="120" lengthAdjust="spacingAndGlyphs">KAPOW!</text></svg>';
  const puff = document.createElement('div');
  puff.dataset.motionEffect = 'puff';
  puff.style.cssText =
    'position:absolute;left:0;top:0;width:104px;height:74px;opacity:0;color:var(--color-ink);';
  puff.innerHTML =
    '<svg viewBox="0 0 110 78" width="100%" height="100%" overflow="visible" fill="var(--color-paper)" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M18 52C0 48 4 30 18 29 11 13 31 5 43 17 48 2 69 6 71 19 87 7 104 20 96 33 112 37 106 55 92 54 92 70 72 73 64 61 51 76 35 68 34 59 26 66 12 65 18 52Z"/><circle cx="10" cy="68" r="4"/><circle cx="2" cy="76" r="2" stroke-width="1.5"/><text x="54" y="46" text-anchor="middle" fill="currentColor" stroke="none" font-size="19" font-weight="900" font-style="italic" font-family="var(--font-sans),sans-serif">POOF!</text></svg>';
  const dent = document.createElement('div');
  dent.dataset.motionEffect = 'paper';
  dent.style.cssText =
    'position:absolute;width:144px;height:80px;opacity:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse at 50% 50%,transparent 32%,color-mix(in srgb,var(--color-ink) 9%,transparent) 48%,transparent 67%);';
  root.prepend(dent);
  layer.append(avatar, crack, ring, puff, burst);
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
    burst,
    puff,
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
      burst.style.opacity = '0';
      puff.style.opacity = '0';
    },
    dispose() {
      perch.style.visibility = '';
      layer.remove();
      dent.remove();
    },
  };
}
