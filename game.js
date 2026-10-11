'use strict';

const $ = (s) => document.querySelector(s); const $$ = (s) => Array.from(document.querySelectorAll(s));

let playerCount = 1;
let game = null;
let soundOn = true;

const AudioEngine = {
  ctx: null,

  init() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  tone(freq = 440, duration = 0.06, type = 'sine', volume = 0.05) {
    if (!soundOn) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  },

  shot() {
    this.tone(140, 0.08, 'square', 0.08);
    setTimeout(() => this.tone(80, 0.06, 'sawtooth', 0.05), 25);
  },

  hit() {
    this.tone(190, 0.08, 'square', 0.06);
  },

  bonus() {
    this.tone(740, 0.12, 'triangle', 0.07);
  },

  win() {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.16, 'triangle', 0.07), i * 110);
    });
  }
};

class TankGame {
  constructor(canvas, humans) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.humans = humans;
    this.running = false;
    this.round = 0;
    this.totalRounds = 3;
    this.last = 0;

    this.bullets = [];
    this.particles = [];
    this.texts = [];
    this.tanks = [];
    this.bonus = null;
    this.bonusTimer = 0;

    this.maps = [
      { name: 'INDUSTRIAL', bg: '#3d4148', grid: '#555b64', wall: '#d5d1c8' },
      { name: 'DESERT TEMPLE', bg: '#a98b62', grid: '#c1a579', wall: '#ddd0b5' },
      { name: 'ICE BASE', bg: '#46517a', grid: '#59668f', wall: '#b7c3d1' }
    ];

    this.resize();
    this.makeRound();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.max(320, rect.width);
    const h = Math.max(320, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = w;
    this.height = h;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.buildWalls();
  }

  buildWalls() {
    const w = this.width;
    const h = this.height;
    const thick = Math.max(26, Math.min(w, h) * 0.055);

    this.walls = [
      { x: w * 0.16, y: h * 0.18, w: w * 0.22, h: thick },
      { x: w * 0.62, y: h * 0.18, w: w * 0.22, h: thick },
      { x: w * 0.16, y: h * 0.77, w: w * 0.22, h: thick },
      { x: w * 0.62, y: h * 0.77, w: w * 0.22, h: thick },
      { x: w * 0.475, y: h * 0.36, w: thick, h: h * 0.28 },
      { x: w * 0.27, y: h * 0.45, w: thick, h: h * 0.15 },
      { x: w * 0.73, y: h * 0.45, w: thick, h: h * 0.15 }
    ];
  }

  makeRound() {
    this.map = this.maps[this.round % this.maps.length];
    this.bullets = [];
    this.particles = [];
    this.texts = [];
    this.bonusTimer = 0;

    this.buildWalls();

    const w = this.width;
    const h = this.height;
    const margin = Math.max(65, Math.min(w, h) * 0.13);

    const defs = [
      { name: 'P1 MOVIY', color: '#16d9f3', dark: '#087b93', x: margin, y: h - margin, angle: -0.7 },
      { name: 'P2 YASHIL', color: '#42e55d', dark: '#167a2c', x: margin, y: margin, angle: 0.7 },
      { name: 'P3 BINAFSHA', color: '#c45cff', dark: '#7020a6', x: w - margin, y: margin, angle: 2.4 },
      { name: 'P4 SARIQ', color: '#ffb516', dark: '#805700', x: w - margin, y: h - margin, angle: -2.4 }
    ];

    this.tanks = defs.map((d, i) => ({
      ...d,
      id: i,
      alive: true,
      ammo: 4,
      maxAmmo: 4,
      cooldown: 0,
      speed: 2.4,
      turnSpeed: 0.045, // Aylanish tezligi
      moving: false,
      rotationDir: i % 2 === 0 ? 1 : -1,
      bot: i >= this.humans,
      score: 0,
      shield: 0,
      aiTimer: 0
    }));

    this.spawnBonus();

    const round = $('#roundText');
    if (round) {
      round.textContent = `RAUND ${this.round + 1} / ${this.totalRounds} • ${this.map.name}`;
    }
  }

  spawnBonus() {
    let x, y, tries = 0;
    do {
      x = this.width * (0.35 + Math.random() * 0.3);
      y = this.height * (0.35 + Math.random() * 0.3);
      tries++;
    } while (this.pointInWall(x, y, 28) && tries < 30);

    this.bonus = {
      x,
      y,
      type: Math.random() < 0.5 ? 'ammo' : 'shield',
      pulse: 0
    };
  }

  pointInWall(x, y, pad = 0) {
    return this.walls.some(
      w => x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad
    );
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(40, now - this.last || 16.67);
    this.last = now;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (!this.bonus) this.spawnBonus();
    this.bonusTimer += dt;
    this.bonus.pulse += dt * 0.008;

    if (this.bonusTimer > 9000) {
      this.spawnBonus();
      this.bonusTimer = 0;
    }

    for (const t of this.tanks) {
      if (!t.alive) continue;

      t.cooldown = Math.max(0, t.cooldown - dt);
      t.shield = Math.max(0, t.shield - dt);

      // Bot boshqaruvi
      if (t.bot) {
        this.botThink(t, dt);
      }

      // 1. TUGMA BOSILGANDA -> OLDINGA YURISH
      if (t.moving) {
        this.moveTank(t);
      } else {
        // 2. TUGMA BOSILMAGANDA -> JOYIDA DOIMIY AYLANISH
        t.angle += t.turnSpeed * t.rotationDir;
      }

      // Bonus olish
      if (this.bonus && Math.hypot(t.x - this.bonus.x, t.y - this.bonus.y) < 32) {
        this.collectBonus(t);
      }
    }

    this.updateBullets();
    this.updateParticles(dt);
    this.updateTexts(dt);

    const alive = this.tanks.filter((t) => t.alive);
    if (alive.length <= 1) {
      this.endRound(alive[0] || null);
    }
  }

  botThink(t, dt) {
    t.aiTimer -= dt;
    const enemies = this.tanks.filter((x) => x.alive && x !== t);
    if (!enemies.length) return;

    let target = enemies[0];
    let best = Infinity;

    for (const e of enemies) {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d < best) {
        best = d;
        target = e;
      }
    }

    const desired = Math.atan2(target.y - t.y, target.x - t.x);
    let diff = normalizeAngle(desired - t.angle);

    // Bot nishon tomonga buralishi
    if (Math.abs(diff) < 0.22) {
      if (t.ammo > 0 && Math.random() < 0.04) {
        this.fire(t);
      }
    }

    if (t.aiTimer <= 0) {
      t.aiTimer = 350 + Math.random() * 650;
      t.moving = Math.random() > 0.35;
    }
  }

  moveTank(t) {
    const nx = t.x + Math.cos(t.angle) * t.speed;
    const ny = t.y + Math.sin(t.angle) * t.speed;

    if (!this.collides(nx, ny, t)) {
      t.x = nx;
      t.y = ny;
      this.addDust(t);
    } else {
      // Devorga tekkanida tiqilmasdan to'xtash
      this.addDust(t);
    }
  }

  collides(x, y, self) {
    const r = 24; // Tank radiusi (1 sm² ga mos ~48px)

    if (x < r || x > this.width - r || y < r || y > this.height - r) {
      return true;
    }

    if (this.walls.some((w) => circleRect(x, y, r, w))) {
      return true;
    }

    return this.tanks.some(
      (t) => t !== self && t.alive && Math.hypot(x - t.x, y - t.y) < 46
    );
  }

  addDust(t) {
    if (Math.random() > 0.2) return;
    this.particles.push({
      x: t.x - Math.cos(t.angle) * 18,
      y: t.y - Math.sin(t.angle) * 18,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 18,
      max: 18,
      size: 3,
      color: '#c0b5a2'
    });
  }

  fire(t) {
    if (!t || !t.alive || t.cooldown > 0 || t.ammo <= 0) return;

    t.ammo--;
    t.cooldown = 400; // O'qlar orasidagi interval

    // O'Q OTILGANDA AYLANISH YO'NALISHI ALMASHADI (1-2-3-4 Player qoidasi)
    t.rotationDir *= -1;

    AudioEngine.shot();

    const dx = Math.cos(t.angle);
    const dy = Math.sin(t.angle);

    this.bullets.push({
      x: t.x + dx * 30,
      y: t.y + dy * 30,
      vx: dx * 4.6, // O'q tezligi
      vy: dy * 4.6,
      owner: t,
      life: 220
    });

    this.burst(t.x + dx * 28, t.y + dy * 28, '#ffd21a', 7);

    setTimeout(() => {
      if (t.alive && t.ammo < t.maxAmmo) {
        t.ammo++;
      }
    }, 1400);
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      let remove = false;

      // 1. Ekran chetiga tegsa -> DARHOL YO'QOLADI
      if (b.x <= 4 || b.y <= 4 || b.x >= this.width - 4 || b.y >= this.height - 4 || b.life <= 0) {
        remove = true;
      }

      // 2. Devorga tegsa -> DARHOL YO'QOLADI (rikoshet yo'q)
      if (!remove && this.walls.some((w) => pointInRect(b.x, b.y, w))) {
        remove = true;
      }

      // 3. Tankka tegsa -> Tankni yo'q qiladi
      if (!remove) {
        for (const t of this.tanks) {
          if (t === b.owner || !t.alive || Math.hypot(b.x - t.x, b.y - t.y) > 26) {
            continue;
          }

          remove = true;

          if (t.shield > 0) {
            this.addText(t.x, t.y - 30, 'BLOCK!', '#63e8ff');
            this.burst(b.x, b.y, '#63e8ff', 12);
          } else {
            t.alive = false;
            b.owner.score += 1;
            this.addText(t.x, t.y - 30, 'K.O.', '#ffffff');
            this.burst(t.x, t.y, t.color, 26);
            AudioEngine.hit();
          }
          break;
        }
      }

      if (remove) {
        this.burst(b.x, b.y, '#ffe45c', 5);
        this.bullets.splice(i, 1);
      }
    }
  }

  collectBonus(t) {
    if (!this.bonus) return;

    if (this.bonus.type === 'ammo') {
      t.ammo = t.maxAmmo;
    } else {
      t.shield = 1800;
    }

    this.addText(
      t.x,
      t.y - 34,
      this.bonus.type === 'ammo' ? 'AMMO MAX!' : 'SHIELD!',
      t.color
    );
    this.burst(t.x, t.y, '#ffe05b', 16);
    AudioEngine.bonus();

    this.spawnBonus();
    this.bonusTimer = 0;
  }

  burst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 20 + Math.random() * 16,
        max: 36,
        size: 2 + Math.random() * 3,
        color
      });
    }
  }

  addText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 55 });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt / 16.67;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateTexts(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 0.5;
      t.life -= dt / 16.67;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  endRound(winner) {
    if (!this.running) return;
    this.running = false;

    if (winner) winner.score += 5;
    AudioEngine.win();

    const icon = $('#modalIcon');
    const title = $('#modalTitle');
    const reward = $('#reward');
    const scores = $('#scores');
    const next = $('#nextBtn');
    const modal = $('#modal');

    if (icon) icon.textContent = winner ? '🏆' : '💥';
    if (title) title.textContent = winner ? `${winner.name} G‘OLIB!` : 'DURANG!';
    if (reward) reward.textContent = winner ? `+6 tanga • ${this.map.name}` : `+1 tanga • ${this.map.name}`;

    if (scores) {
      scores.innerHTML = this.tanks
        .map(
          (t) =>
            `<div class="score-row">
              <span style="color:${t.color}">${escapeHtml(t.name)}</span>
              <b>${t.score}</b>
            </div>`
        )
        .join('');
    }

    if (next) {
      next.textContent = this.round < this.totalRounds - 1 ? 'KEYINGI RAUND ▶' : 'QAYTA O‘YNASH';
    }

    if (modal) modal.classList.add('show');
  }

  nextRound() {
    const modal = $('#modal');
    if (modal) modal.classList.remove('show');

    if (this.round >= this.totalRounds - 1) {
      this.round = 0;
    } else {
      this.round++;
    }

    this.makeRound();
    this.start();
  }

  draw() {
    const c = this.ctx;
    const w = this.width;
    const h = this.height;
    const m = this.map;

    c.clearRect(0, 0, w, h);

    // Fon va to'r
    c.fillStyle = m.bg;
    c.fillRect(0, 0, w, h);

    c.strokeStyle = m.grid;
    c.lineWidth = 1;
    const step = 42;
    for (let x = 0; x <= w; x += step) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }

    // Devorlar
    for (const wall of this.walls) {
      c.fillStyle = m.wall;
      c.fillRect(wall.x, wall.y, wall.w, wall.h);

      c.strokeStyle = '#59606a';
      c.lineWidth = 2;
      c.strokeRect(wall.x, wall.y, wall.w, wall.h);

      c.fillStyle = '#ffffff44';
      for (let x = wall.x + 7; x < wall.x + wall.w - 4; x += 24) {
        c.fillRect(x, wall.y + 4, 12, 3);
      }
    }

    this.drawDecoration();
    this.drawBonus();

    // O'qlar
    for (const b of this.bullets) {
      c.save();
      c.fillStyle = '#fff';
      c.shadowColor = '#ffe45c';
      c.shadowBlur = 10;
      c.beginPath();
      c.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    // Zarrachalar
    for (const p of this.particles) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // Tanklar
    for (const t of this.tanks) {
      if (t.alive) this.drawTank(t);
    }

    // Matnlar
    for (const t of this.texts) {
      c.globalAlpha = Math.min(1, t.life / 20);
      c.fillStyle = t.color;
      c.font = '900 14px Arial';
      c.textAlign = 'center';
      c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;

    this.drawHud();
  }

  drawDecoration() {
    const c = this.ctx;
    if (this.map.name === 'INDUSTRIAL') {
      c.fillStyle = '#b99355';
      for (let i = 0; i < 6; i++) {
        c.fillRect(22 + i * 30, this.height * 0.5, 20, 10);
      }
    } else if (this.map.name === 'DESERT TEMPLE') {
      c.fillStyle = '#638f42';
      const plants = [[0.1, 0.3], [0.9, 0.3], [0.1, 0.7], [0.9, 0.7]];
      for (const [px, py] of plants) {
        c.beginPath();
        c.arc(this.width * px, this.height * py, 17, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  drawBonus() {
    if (!this.bonus) return;
    const c = this.ctx;
    const scale = 1 + Math.sin(this.bonus.pulse) * 0.08;

    c.save();
    c.translate(this.bonus.x, this.bonus.y);
    c.scale(scale, scale);

    c.fillStyle = '#facc15';
    c.shadowColor = '#ffe86a';
    c.shadowBlur = 16;
    c.fillRect(-17, -17, 34, 34);

    c.shadowBlur = 0;
    c.strokeStyle = '#876000';
    c.lineWidth = 3;
    c.strokeRect(-17, -17, 34, 34);

    c.fillStyle = '#111';
    c.font = '900 21px Arial';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('?', 0, 1);
    c.restore();
  }

  drawTank(t) {
    const c = this.ctx;
    c.save();
    c.translate(t.x, t.y);
    c.rotate(t.angle);

    if (t.shield > 0) {
      c.strokeStyle = '#62eaff';
      c.lineWidth = 4;
      c.shadowColor = '#62eaff';
      c.shadowBlur = 14;
      c.beginPath();
      c.arc(0, 0, 31, 0, Math.PI * 2);
      c.stroke();
      c.shadowBlur = 0;
    }

    // Gusenitsalar
    c.fillStyle = '#151923';
    c.fillRect(-25, -23, 50, 46);

    c.fillStyle = '#2a303b';
    c.fillRect(-25, -24, 50, 10);
    c.fillRect(-25, 14, 50, 10);

    c.fillStyle = '#737b88';
    for (let x = -21; x < 22; x += 8) {
      c.fillRect(x, -23, 4, 7);
      c.fillRect(x, 16, 4, 7);
    }

    // Korpus
    c.fillStyle = t.color;
    c.strokeStyle = t.dark;
    c.lineWidth = 3;
    roundRect(c, -21, -15, 42, 30, 8);
    c.fill();
    c.stroke();

    // Zambarak
    c.fillStyle = '#1b2330';
    c.fillRect(2, -5, 31, 10);

    c.fillStyle = '#aeb9c7';
    c.fillRect(30, -6, 6, 12);

    // Minora
    c.fillStyle = t.dark;
    c.beginPath();
    c.arc(0, 0, 13, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#f8fafc';
    c.beginPath();
    c.arc(-3, -2, 5, 0, Math.PI * 2);
    c.fill();

    c.restore();
  }

  drawHud() {
    const c = this.ctx;
    const positions = [
      [12, this.height - 34],
      [12, 12],
      [this.width - 102, 12],
      [this.width - 102, this.height - 34]
    ];

    this.tanks.forEach((t, i) => {
      const [x, y] = positions[i];

      c.fillStyle = '#05070ddd';
      c.fillRect(x, y, 90, 22);

      c.strokeStyle = t.color;
      c.strokeRect(x, y, 90, 22);

      for (let a = 0; a < t.maxAmmo; a++) {
        c.fillStyle = a < t.ammo ? t.color : '#2a3038';
        c.fillRect(x + 7 + a * 20, y + 5, 12, 12);
      }
    });
  }
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function circleRect(cx, cy, radius, r) {
  const x = clamp(cx, r.x, r.x + r.w);
  const y = clamp(cy, r.y, r.y + r.h);
  return Math.hypot(cx - x, cy - y) < radius;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[ch]));
}

function showGame() {
  const menu = $('#menuScreen');
  const gameScreen = $('#gameScreen');
  if (menu) menu.classList.remove('active');
  if (gameScreen) gameScreen.classList.add('active');
}

function showMenu() {
  if (game) game.stop();
  game = null;

  const modal = $('#modal');
  const gameScreen = $('#gameScreen');
  const menu = $('#menuScreen');

  if (modal) modal.classList.remove('show');
  if (gameScreen) gameScreen.classList.remove('active');
  if (menu) menu.classList.add('active');
}

function startGame() {
  AudioEngine.init();
  showGame();

  const canvas = $('#gameCanvas');   if (!canvas) return;    game = new TankGame(canvas, playerCount);   game.start(); }  document.addEventListener('DOMContentLoaded', () => {   const modes = $$('.mode');
  modes.forEach((btn) => {
    btn.addEventListener('click', () => {
      modes.forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      playerCount = Number(btn.dataset.players) || 1;
      AudioEngine.tone(560, 0.05, 'triangle');
    });
  });

  const tankCard = $('#tankCard');
  const quickCard = $('#quickCard');
  const backBtn = $('#backBtn');
  const menuBtn = $('#menuBtn');
  const nextBtn = $('#nextBtn');
  const soundBtn = $('#soundBtn');    if (tankCard) tankCard.addEventListener('click', startGame);   if (quickCard) quickCard.addEventListener('click', startGame);   if (backBtn) backBtn.addEventListener('click', showMenu);   if (menuBtn) menuBtn.addEventListener('click', showMenu);    if (nextBtn) {     nextBtn.addEventListener('click', () => {       if (game) game.nextRound();     });   }    if (soundBtn) {     soundBtn.addEventListener('click', () => {       soundOn = !soundOn;       soundBtn.textContent = soundOn ? '🔊' : '🔇';       if (soundOn) AudioEngine.tone(600, 0.06);     });   }    // BURCHAK TOUCH TUGMALARI   $$('.corner').forEach((btn) => {
    const index = Number(btn.dataset.p);

    const press = (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      if (game && game.tanks[index] && game.tanks[index].alive) {
        game.tanks[index].moving = true; // Bosib turganda oldinga yuradi
      }
    };

    const release = (e) => {
      e.preventDefault();
      btn.classList.remove('pressed');
      if (game && game.tanks[index] && game.tanks[index].alive) {
        game.tanks[index].moving = false;
        game.fire(game.tanks[index]); // Qo'yib yuborganda o'q uzadi va aylanma yo'nalishi o'zgaradi
      }
    };

    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  });

  // KLAVIATURA BOSHQARUVI
  const keyMap = {
    Space: 0, KeyW: 0,
    KeyQ: 1,
    KeyP: 2, ArrowUp: 2,
    Enter: 3, ArrowDown: 3
  };

  window.addEventListener('keydown', (e) => {
    const i = keyMap[e.code];
    if (!game || i === undefined || e.repeat || !game.tanks[i]) return;
    e.preventDefault();
    game.tanks[i].moving = true;
  });

  window.addEventListener('keyup', (e) => {
    const i = keyMap[e.code];
    if (!game || i === undefined || !game.tanks[i]) return;
    e.preventDefault();
    game.tanks[i].moving = false;
    game.fire(game.tanks[i]);
  });

  window.addEventListener('resize', () => {
    if (game) game.resize();
  });
});
