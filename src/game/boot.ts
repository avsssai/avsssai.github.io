const W = 960;
const H = 540;
const CX = 480;
const CY = 285;
const LANES = [190, 285, 380];
const PALETTE = ['#67eeff', '#ff6abd', '#b1ff70', '#ffcb70', '#a998ff'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

type Enemy = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  max: number;
  r: number;
  color: string;
  flying: boolean;
  phase: number;
  hit: number;
};
type Agent = {
  x: number;
  y: number;
  lane: number;
  life: number;
  ammo: number;
  cooldown: number;
  angle: number;
};
type Shot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  target: Enemy;
  color: string;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

export function bootMissionPreview(host: HTMLElement) {
  const shell = document.createElement('div');
  shell.className = 'mission';
  shell.innerHTML = `
    <div class="mission__top"><span class="mission__brand"><i></i> AGENT RUNNER <b>/// DEFENSE PROTOCOL</b></span><span>WAVE <strong data-wave>01</strong> / 05</span></div>
    <div class="mission__canvas"><canvas aria-label="Agent Runner: defend the core from flying tickets approaching on all sides" tabindex="0"></canvas></div>
    <div class="mission__dashboard">
      <div class="mission__stat"><span>SCORE</span><strong data-score>000000</strong></div>
      <div class="mission__stat"><span>CORE INTEGRITY</span><strong data-health>10 / 10</strong><div class="mission__meter"><i data-healthbar></i></div></div>
      <div class="mission__stat"><span>AGENT ENERGY</span><strong data-energy>100%</strong><div class="mission__meter mission__meter--cyan"><i data-energybar></i></div></div>
      <div class="mission__stat"><span>TIME</span><strong data-time>01:30</strong></div>
    </div>
    <div class="mission__controls"><span><kbd>↑</kbd><kbd>↓</kbd> SELECT LANE &nbsp; <kbd>SPACE</kbd> DEPLOY &nbsp; <kbd>P</kbd> PAUSE</span><div><button type="button" data-up aria-label="Select lane above">↑</button><button type="button" data-down aria-label="Select lane below">↓</button><button type="button" class="mission__deploy" data-deploy>DEPLOY AGENT</button><button type="button" data-pause>PAUSE</button></div></div>
    <div class="mission__overlay" data-overlay hidden><p data-kicker></p><h2 data-title></h2><span data-detail></span><button type="button" data-restart>PLAY AGAIN ↗</button></div>`;
  host.append(shell);
  const canvas = shell.querySelector('canvas')!;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const get = (key: string) =>
    shell.querySelector<HTMLElement>(`[data-${key}]`)!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  const stars = Array.from({ length: 75 }, () => ({
    x: rand(0, W),
    y: rand(0, H),
    size: rand(0.6, 2),
    speed: rand(3, 14),
    alpha: rand(0.2, 0.7),
  }));
  let enemies: Enemy[] = [];
  let agents: Agent[] = [];
  let shots: Shot[] = [];
  let particles: Particle[] = [];
  let score = 0,
    health = 10,
    energy = 100,
    elapsed = 0,
    spawnIn = 1,
    lane = 1,
    shake = 0,
    flash = 0;
  let paused = false,
    ended = false,
    last = performance.now(),
    frame = 0;

  function burst(
    x: number,
    y: number,
    color: string,
    amount: number,
    force = 1,
  ) {
    if (reduced) return;
    for (let i = 0; i < amount && particles.length < 230; i++) {
      const angle = rand(0, Math.PI * 2),
        speed = rand(30, 150) * force,
        life = rand(0.25, 0.65);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        max: life,
        size: rand(1.5, 4),
        color: i % 5 === 0 ? '#fff' : color,
      });
    }
  }
  function reset() {
    enemies = [];
    agents = [];
    shots = [];
    particles = [];
    score = 0;
    health = 10;
    energy = 100;
    elapsed = 0;
    spawnIn = 1;
    lane = 1;
    shake = 0;
    flash = 0;
    paused = false;
    ended = false;
    get('overlay').hidden = true;
    get('pause').textContent = 'PAUSE';
    last = performance.now();
    canvas.focus({ preventScroll: true });
    updateHud();
  }
  function spawnEnemy() {
    const wave = Math.min(5, Math.floor(elapsed / 18) + 1);
    const side = Math.floor(rand(0, wave < 2 ? 2 : 4));
    const flying = wave > 1 && Math.random() < 0.42;
    const hp =
      Math.random() < 0.16 + wave * 0.05
        ? Math.min(5, 2 + Math.floor(wave / 2))
        : Math.random() < 0.25
          ? 2
          : 1;
    const x = side === 0 ? -35 : side === 1 ? W + 35 : rand(150, 810);
    const y =
      side === 2
        ? -35
        : side === 3
          ? H + 35
          : LANES[Math.floor(rand(0, 3))] + rand(-22, 22);
    const angle = Math.atan2(CY - y, CX - x),
      speed = (flying ? 62 : 48) + wave * 9 + rand(-5, 8);
    enemies.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hp,
      max: hp,
      r: hp > 2 ? 20 : 15,
      color: PALETTE[(hp + side + wave) % PALETTE.length],
      flying,
      phase: rand(0, 6),
      hit: 0,
    });
  }
  function deploy() {
    if (ended || paused || energy < 25 || agents.length >= 4) return;
    energy -= 25;
    const same = agents.filter((agent) => agent.lane === lane).length;
    const x = CX + (same % 2 ? 78 : -78),
      y = LANES[lane];
    agents.push({ x, y, lane, life: 8, ammo: 8, cooldown: 0, angle: 0 });
    burst(x, y, '#67eeff', 18, 0.65);
    updateHud();
  }
  function finish(win: boolean) {
    ended = true;
    get('overlay').hidden = false;
    get('restart').textContent = 'PLAY AGAIN ↗';
    get('kicker').textContent = win ? 'MISSION COMPLETE' : 'CONNECTION LOST';
    get('title').textContent = win ? 'SPRINT SHIPPED' : 'BACKLOG BREACH';
    get('detail').textContent =
      `${score.toLocaleString()} points · ${Math.floor(elapsed)}s survived`;
  }
  function updateHud() {
    get('score').textContent = String(score).padStart(6, '0');
    get('health').textContent = `${health} / 10`;
    get('energy').textContent = `${Math.floor(energy)}%`;
    get('healthbar').style.width = `${health * 10}%`;
    get('energybar').style.width = `${energy}%`;
    const remain = Math.floor(Math.max(0, 90 - elapsed));
    get('time').textContent =
      `${String(Math.floor(remain / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`;
    get('wave').textContent = String(
      Math.min(5, Math.floor(elapsed / 18) + 1),
    ).padStart(2, '0');
  }
  function update(dt: number) {
    elapsed += dt;
    energy = clamp(energy + dt * 8, 0, 100);
    spawnIn -= dt;
    if (spawnIn <= 0 && elapsed < 90) {
      spawnEnemy();
      const wave = Math.min(5, Math.floor(elapsed / 18) + 1);
      spawnIn = rand(0.8, 1.3) / (1 + (wave - 1) * 0.12);
    }
    for (const star of stars) star.x = (star.x - star.speed * dt + W) % W;
    for (const enemy of enemies) {
      enemy.phase += dt * 5;
      enemy.hit = Math.max(0, enemy.hit - dt * 5);
      enemy.x += enemy.vx * dt;
      enemy.y +=
        enemy.vy * dt + (enemy.flying ? Math.sin(enemy.phase) * 12 * dt : 0);
      if (Math.hypot(enemy.x - CX, enemy.y - CY) < 39) {
        enemy.hp = 0;
        health = Math.max(0, health - Math.min(3, enemy.max));
        flash = 0.35;
        shake = reduced ? 0 : 9;
        burst(enemy.x, enemy.y, '#ff688f', 24, 1.2);
      }
    }
    enemies = enemies.filter((enemy) => enemy.hp > 0);
    for (const agent of agents) {
      agent.life -= dt;
      agent.cooldown -= dt;
      // Agents can target threats from either side or from above and below.
      const target = enemies
        .filter(
          (enemy) => Math.hypot(enemy.x - agent.x, enemy.y - agent.y) < 365,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - CX, a.y - CY) - Math.hypot(b.x - CX, b.y - CY),
        )[0];
      if (target)
        agent.angle = Math.atan2(target.y - agent.y, target.x - agent.x);
      if (target && agent.cooldown <= 0 && agent.ammo > 0) {
        agent.cooldown = 0.3;
        agent.ammo--;
        shots.push({
          x: agent.x,
          y: agent.y,
          vx: Math.cos(agent.angle) * 510,
          vy: Math.sin(agent.angle) * 510,
          target,
          life: 0.9,
          color: PALETTE[agent.lane],
        });
        burst(
          agent.x + Math.cos(agent.angle) * 16,
          agent.y + Math.sin(agent.angle) * 16,
          '#fff',
          3,
          0.2,
        );
      }
    }
    agents = agents.filter((agent) => agent.life > 0 && agent.ammo > 0);
    for (const shot of shots) {
      shot.life -= dt;
      if (shot.target.hp > 0) {
        const angle = Math.atan2(
          shot.target.y - shot.y,
          shot.target.x - shot.x,
        );
        shot.vx += Math.cos(angle) * 1000 * dt;
        shot.vy += Math.sin(angle) * 1000 * dt;
        const speed = Math.hypot(shot.vx, shot.vy);
        shot.vx = (shot.vx / speed) * 510;
        shot.vy = (shot.vy / speed) * 510;
      }
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (
        shot.target.hp > 0 &&
        Math.hypot(shot.x - shot.target.x, shot.y - shot.target.y) <
          shot.target.r + 7
      ) {
        shot.life = 0;
        shot.target.hp--;
        shot.target.hit = 1;
        burst(
          shot.x,
          shot.y,
          shot.target.color,
          shot.target.hp ? 8 : 26,
          shot.target.hp ? 0.5 : 1,
        );
        if (shot.target.hp <= 0) {
          score += shot.target.max * 100;
          energy = clamp(energy + 3, 0, 100);
        }
      }
    }
    shots = shots.filter(
      (shot) =>
        shot.life > 0 &&
        shot.x > -40 &&
        shot.x < W + 40 &&
        shot.y > -40 &&
        shot.y < H + 40,
    );
    enemies = enemies.filter((enemy) => enemy.hp > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - dt * 2.5);
      p.vy *= Math.max(0, 1 - dt * 2.5);
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    shake = Math.max(0, shake - dt * 30);
    flash = Math.max(0, flash - dt);
    updateHud();
    if (health <= 0) finish(false);
    else if (elapsed >= 90 && enemies.length === 0) finish(true);
  }
  function label(
    value: string,
    x: number,
    y: number,
    color = '#a9c3d2',
    size = 12,
    align: CanvasTextAlign = 'left',
  ) {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }
  function draw(time: number) {
    ctx.fillStyle = '#070b19';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(CX, CY, 20, CX, CY, 490);
    glow.addColorStop(0, '#172e4a');
    glow.addColorStop(0.55, '#0c172c');
    glow.addColorStop(1, '#070b19');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,169,211,.09)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (const star of stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#bceaff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    if (shake) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    for (let i = 0; i < 3; i++) {
      const y = LANES[i],
        selected = i === lane;
      ctx.fillStyle = selected
        ? 'rgba(103,238,255,.045)'
        : 'rgba(255,255,255,.01)';
      ctx.fillRect(0, y - 36, W, 72);
      ctx.strokeStyle = selected
        ? 'rgba(103,238,255,.27)'
        : 'rgba(128,179,209,.11)';
      ctx.setLineDash([7, 12]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.setLineDash([]);
      label(`0${i + 1}`, 25, y - 16, selected ? '#67eeff' : '#4f7086', 11);
      if (selected) {
        ctx.fillStyle = '#67eeff';
        ctx.beginPath();
        ctx.moveTo(14, y);
        ctx.lineTo(30, y - 8);
        ctx.lineTo(30, y + 8);
        ctx.fill();
      }
    }
    ctx.save();
    ctx.translate(CX, CY);
    const pulse = reduced ? 0 : Math.sin(time * 2.5) * 3;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(103,238,255,${0.16 - i * 0.035})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 48 + i * 14 + pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.rotate(reduced ? 0 : time * 0.16);
    ctx.strokeStyle = '#67eeff';
    ctx.lineWidth = 3;
    ctx.strokeRect(-29, -29, 58, 58);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#142e48';
    ctx.strokeStyle = '#b1ff70';
    ctx.fillRect(-24, -24, 48, 48);
    ctx.strokeRect(-24, -24, 48, 48);
    ctx.fillStyle = '#b1ff70';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
    label('SPRINT CORE', CX, CY + 84, '#91aebf', 11, 'center');
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.flying) ctx.rotate(Math.sin(e.phase) * 0.12);
      ctx.shadowBlur = e.hit ? 25 : 14;
      ctx.shadowColor = e.color;
      ctx.fillStyle = e.hit ? '#fff' : '#111827';
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (e.flying) {
        ctx.moveTo(0, -e.r - 5);
        ctx.lineTo(e.r + 8, 0);
        ctx.lineTo(0, e.r + 5);
        ctx.lineTo(-e.r - 8, 0);
      } else ctx.roundRect(-e.r, -e.r, e.r * 2, e.r * 2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = e.color;
      ctx.fillRect(-5, -3, 10, 6);
      if (e.hp > 1) label(String(e.hp), 0, -e.r - 12, '#fff', 11, 'center');
      if (e.flying) {
        ctx.beginPath();
        ctx.moveTo(-e.r - 13, 0);
        ctx.lineTo(-e.r - 3, -7);
        ctx.moveTo(e.r + 13, 0);
        ctx.lineTo(e.r + 3, -7);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const a of agents) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.shadowColor = '#67eeff';
      ctx.shadowBlur = 17;
      ctx.fillStyle = '#0c2434';
      ctx.strokeStyle = '#67eeff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(a.angle);
      ctx.fillStyle = '#67eeff';
      ctx.fillRect(1, -4, 22, 8);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(103,238,255,.55)';
      ctx.beginPath();
      ctx.arc(
        a.x,
        a.y,
        23,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * a.life) / 8,
      );
      ctx.stroke();
    }
    for (const s of shots) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.024, s.y - s.vy * 0.024);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (flash) {
      ctx.fillStyle = `rgba(255,75,115,${flash * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(6,12,25,.72)';
    ctx.fillRect(18, 16, 220, 36);
    label('◈  DEFEND THE CORE', 32, 40, '#b1ff70', 12);
    label('AUTO TARGET · ALL DIRECTIONS', W - 24, 40, '#7799aa', 11, 'right');
    label(
      agents.length >= 4
        ? 'AGENT SLOTS FULL'
        : energy < 25
          ? 'RECHARGING AGENTS'
          : 'SPACE / TAP TO DEPLOY',
      CX,
      H - 26,
      '#91b9c7',
      12,
      'center',
    );
  }
  function tick(now: number) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    if (!paused && !ended && !document.hidden) update(dt);
    draw(reduced ? 0 : now / 1000);
    frame = requestAnimationFrame(tick);
  }
  function togglePause() {
    if (ended) return;
    paused = !paused;
    get('pause').textContent = paused ? 'RESUME' : 'PAUSE';
    get('overlay').hidden = !paused;
    if (paused) {
      get('kicker').textContent = 'TAKE A BREATH';
      get('title').textContent = 'PAUSED';
      get('detail').textContent = 'Press P or Resume to continue';
      get('restart').textContent = 'RESUME ↗';
    }
    last = performance.now();
  }
  function onKey(e: KeyboardEvent) {
    if (!host.isConnected || !shell.contains(document.activeElement)) return;
    if (
      [
        'ArrowUp',
        'ArrowDown',
        ' ',
        'w',
        'W',
        's',
        'S',
        'p',
        'P',
        'r',
        'R',
      ].includes(e.key)
    )
      e.preventDefault();
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w')
      lane = Math.max(0, lane - 1);
    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's')
      lane = Math.min(2, lane + 1);
    if (e.key === ' ') deploy();
    if (e.key.toLowerCase() === 'p') togglePause();
    if (e.key.toLowerCase() === 'r') reset();
  }
  function onPointer(e: PointerEvent) {
    const box = canvas.getBoundingClientRect(),
      y = ((e.clientY - box.top) / box.height) * H;
    lane = LANES.reduce(
      (best, value, index) =>
        Math.abs(value - y) < Math.abs(LANES[best] - y) ? index : best,
      0,
    );
    deploy();
    canvas.focus({ preventScroll: true });
  }
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', onPointer);
  get('up').addEventListener('click', () => {
    lane = Math.max(0, lane - 1);
  });
  get('down').addEventListener('click', () => {
    lane = Math.min(2, lane + 1);
  });
  get('deploy').addEventListener('click', deploy);
  get('pause').addEventListener('click', togglePause);
  get('restart').addEventListener('click', () => {
    if (paused) togglePause();
    else reset();
  });
  const onVisibility = () => {
    last = performance.now();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    },
    { once: true },
  );
  reset();
  frame = requestAnimationFrame(tick);
}
