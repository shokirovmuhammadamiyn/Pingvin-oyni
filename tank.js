// SKRINSHOTDAGI 4 O'YINCHILI TANK MAYDONI
class TankGame {
  constructor(canvas, ctx, humanCount) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.humanCount = humanCount;
    this.running = false;

    this.tanks = [
      { name: "P1 Moviy", color: "#06b6d4", x: 60, y: canvas.height - 60, angle: -Math.PI / 4, ammo: 5, alive: true, isBot: 0 >= humanCount },
      { name: "P2 Yashil", color: "#22c55e", x: 60, y: 60, angle: Math.PI / 4, ammo: 5, alive: true, isBot: 1 >= humanCount },
      { name: "P3 Binafsha", color: "#a855f7", x: canvas.width - 60, y: 60, angle: 3 * Math.PI / 4, ammo: 5, alive: true, isBot: 2 >= humanCount },
      { name: "P4 Qora", color: "#f59e0b", x: canvas.width - 60, y: canvas.height - 60, angle: -3 * Math.PI / 4, ammo: 5, alive: true, isBot: 3 >= humanCount }
    ];

    this.bullets = [];
    this.obstacles = [];
    this.initArena();
  }

  initArena() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Skrinshotdagi kabi to'siqlar
    this.obstacles = [
      // Chap va o'ng vertikal chiziqli devorlar
      { x: w * 0.35, y: h * 0.15, w: 20, h: h * 0.28, color: "#d97706" },
      { x: w * 0.35, y: h * 0.58, w: 20, h: h * 0.28, color: "#d97706" },
      { x: w * 0.65, y: h * 0.15, w: 20, h: h * 0.28, color: "#d97706" },
      { x: w * 0.65, y: h * 0.58, w: 20, h: h * 0.28, color: "#d97706" },
      // Gorizontal beton devorlar
      { x: w * 0.15, y: h * 0.5, w: w * 0.18, h: 22, color: "#cbd5e1" },
      { x: w * 0.68, y: h * 0.5, w: w * 0.18, h: 22, color: "#cbd5e1" },
      // O'rtadagi tosh
      { x: w * 0.5 - 20, y: h * 0.5 - 20, w: 40, h: 40, color: "#78716c", isRock: true }
    ];
  }

  start() {
    this.running = true;
    document.getElementById("gameTimer").textContent = "🛡️ JANG";

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  onResize() {
    this.initArena();
  }

  onPlayerAction(idx) {
    const t = this.tanks[idx];
    if (t && t.alive && t.ammo > 0) {
      this.fireBullet(t);
    }
  }

  fireBullet(t) {
    t.ammo--;
    SoundEngine.play(180, "square", 0.1);

    this.bullets.push({
      x: t.x + Math.cos(t.angle) * 25,
      y: t.y + Math.sin(t.angle) * 25,
      vx: Math.cos(t.angle) * 5.5,
      vy: Math.sin(t.angle) * 5.5,
      bounces: 3,
      owner: t
    });

    // O'q zaxirasini asta qayta tiklash
    setTimeout(() => {
      if (t.ammo < 5) t.ammo++;
    }, 1500);
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.render();
    requestAnimationFrame(this.loop);
  }

  update() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Tanklar harakati va botlar
    this.tanks.forEach(t => {
      if (!t.alive) return;

      // Tanklar doimiy sekin buriladi (1-2-3-4 Player Games kabi bitta tugmali mexanika: tugma bosilganda o'q uzadi va yo'nalish o'zgaradi)
      t.angle += 0.035;

      // Botlar o'z-o'zidan vaqti-vaqti bilan o't ochadi
      if (t.isBot && Math.random() < 0.025 && t.ammo > 0) {
        this.fireBullet(t);
      }
    });

    // O'qlar harakati
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Devorlardan rikoshet
      if (b.x < 10 || b.x > w - 10) { b.vx *= -1; b.bounces--; SoundEngine.play(400, "sine", 0.04); }
      if (b.y < 10 || b.y > h - 10) { b.vy *= -1; b.bounces--; SoundEngine.play(400, "sine", 0.04); }

      // To'siqlar bilan rikoshet
      this.obstacles.forEach(obs => {
        if (b.x > obs.x && b.x < obs.x + obs.w && b.y > obs.y && b.y < obs.y + obs.h) {
          b.vx *= -1;
          b.bounces--;
        }
      });

      // Tankka tegishi
      this.tanks.forEach(t => {
        if (t.alive && Math.hypot(b.x - t.x, b.y - t.y) < 22) {
          t.alive = false;
          b.bounces = 0;
          SoundEngine.play(100, "sawtooth", 0.25);
          this.checkWinner();
        }
      });

      if (b.bounces <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Qumli fon (Skrinshotdagi kabi sarg'ish-qum)
    ctx.fillStyle = "#eab308";
    ctx.fillRect(0, 0, w, h);

    // Qum to'lqinlari fakturasi
    ctx.fillStyle = "rgba(202, 138, 4, 0.35)";
    for (let y = 0; y < h; y += 40) {
      ctx.fillRect(0, y, w, 14);
    }

    // To'siqlar
    this.obstacles.forEach(obs => {
      ctx.fillStyle = obs.color;
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
    });

    // O'qlar
    ctx.fillStyle = "#fff";
    this.bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Tanklar
    this.tanks.forEach(t => {
      if (!t.alive) return;

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);

      // Tank korpusi
      ctx.fillStyle = t.color;
      ctx.fillRect(-16, -14, 32, 28);

      // Lulya (qurol)
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(4, -3, 20, 6);

      // Minora
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Tank ustida o'qlar indikatori (5 ta chiziqcha)
      ctx.fillStyle = "#22c55e";
      for (let k = 0; k < t.ammo; k++) {
        ctx.fillRect(t.x - 14 + k * 6, t.y - 24, 4, 6);
      }
    });
  }

  checkWinner() {
    const aliveTanks = this.tanks.filter(t => t.alive);
    if (aliveTanks.length <= 1) {
      this.stop();
      const winner = aliveTanks[0] || { name: "Hech kim", color: "#fff" };
      const list = this.tanks.map(t => ({
        name: t.name,
        color: t.color,
        score: t.alive ? "Omon qoldi" : "Mag‘lub"
      }));
      showGameOverModal(`🏆 ${winner.name} Jangda G‘olib!`, list);
    }
  }
}
