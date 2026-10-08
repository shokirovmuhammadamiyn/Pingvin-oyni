// ============================================================
// TANK BATTLE — 4 PLAYER ARENA (PRO v3)
// ============================================================

class TankGame {
  constructor(canvas, ctx, humanCount) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.humanCount = humanCount;
    this.running = false;

    // Tanklar: o'lchami kattaroq (1 sm² ga mos ~48px)
    this.tanks = [
      { id: 0, name: "P1 Moviy", color: "#06b6d4", darkColor: "#0891b2", x: 90, y: canvas.height - 90, angle: -Math.PI / 4, ammo: 5, maxAmmo: 5, alive: true, isBot: 0 >= humanCount, isMoving: false, rotateSpeed: 0.04, speed: 2.3 },
      { id: 1, name: "P2 Yashil", color: "#22c55e", darkColor: "#16a34a", x: 90, y: 90, angle: Math.PI / 4, ammo: 5, maxAmmo: 5, alive: true, isBot: 1 >= humanCount, isMoving: false, rotateSpeed: 0.04, speed: 2.3 },
      { id: 2, name: "P3 Binafsha", color: "#a855f7", darkColor: "#9333ea", x: canvas.width - 90, y: 90, angle: 3 * Math.PI / 4, ammo: 5, maxAmmo: 5, alive: true, isBot: 2 >= humanCount, isMoving: false, rotateSpeed: 0.04, speed: 2.3 },
      { id: 3, name: "P4 Qora", color: "#334155", darkColor: "#0f172a", x: canvas.width - 90, y: canvas.height - 90, angle: -3 * Math.PI / 4, ammo: 5, maxAmmo: 5, alive: true, isBot: 3 >= humanCount, isMoving: false, rotateSpeed: 0.04, speed: 2.3 }
    ];

    this.bullets = [];
    this.particles = [];
    this.obstacles = [];
    this.rocks = [];
    this.plants = [];
    this.mysteryBox = { x: 0, y: 0, w: 34, h: 34, pulse: 0 };

    this.initArena();
  }

  initArena() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Tanklarning boshlang'ich joylari
    this.tanks[0].x = 95;           this.tanks[0].y = h - 95;
    this.tanks[1].x = 95;           this.tanks[1].y = 95;
    this.tanks[2].x = w - 95;       this.tanks[2].y = 95;
    this.tanks[3].x = w - 95;       this.tanks[3].y = h - 95;

    // To'siqlar
    this.obstacles = [
      { x: w * 0.35, y: h * 0.08, w: 22, h: h * 0.30, type: "hazard" },
      { x: w * 0.35, y: h * 0.62, w: 22, h: h * 0.30, type: "hazard" },
      { x: w * 0.65, y: h * 0.08, w: 22, h: h * 0.30, type: "hazard" },
      { x: w * 0.65, y: h * 0.62, w: 22, h: h * 0.30, type: "hazard" },
      { x: w * 0.12, y: h * 0.5 - 12, w: w * 0.18, h: 24, type: "concrete" },
      { x: w * 0.70, y: h * 0.5 - 12, w: w * 0.18, h: 24, type: "concrete" }
    ];

    // Toshlar
    this.rocks = [
      { x: w * 0.46, y: h * 0.5, r: 30 },
      { x: w * 0.28, y: h * 0.82, r: 26 },
      { x: w * 0.72, y: h * 0.18, r: 26 },
      { x: w * 0.72, y: h * 0.88, r: 28 }
    ];

    // O'simliklar
    this.plants = [
      { x: w * 0.24, y: h * 0.22, r: 26 },
      { x: w * 0.10, y: h * 0.65, r: 24 },
      { x: w * 0.88, y: h * 0.66, r: 26 }
    ];

    this.mysteryBox.x = w * 0.56;
    this.mysteryBox.y = h * 0.5 - 17;
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

  // TUGMA BOSILDI (Harakat boshlanadi)
  onPlayerDown(idx) {
    const t = this.tanks[idx];
    if (t && t.alive) {
      t.isMoving = true;
    }
  }

  // TUGMA QO'YIB YUBORILDI (To'xtaydi va darhol o'q uzadi!)
  onPlayerUp(idx) {
    const t = this.tanks[idx];
    if (t && t.alive && t.isMoving) {
      t.isMoving = false;
      this.fireBullet(t);
    }
  }

  // O'Q OTISH (Sekinlashgan o'q tezligi: 3.8)
  fireBullet(t) {
    if (t.ammo <= 0) {
      SoundEngine.play(130, "sine", 0.05);
      return;
    }

    t.ammo--;
    SoundEngine.play(200, "square", 0.12);

    this.spawnMuzzleFlash(t);

    const bx = t.x + Math.cos(t.angle) * 32;
    const by = t.y + Math.sin(t.angle) * 32;

    this.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(t.angle) * 3.8, // Sekinlashtirilgan tezlik
      vy: Math.sin(t.angle) * 3.8,
      bounces: 4,
      owner: t,
      life: 420
    });

    // O'q zaxirasi asta to'ladi
    setTimeout(() => {
      if (t.ammo < t.maxAmmo) t.ammo++;
    }, 1600);
  }

  spawnMuzzleFlash(t) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: t.x + Math.cos(t.angle) * 30,
        y: t.y + Math.sin(t.angle) * 30,
        vx: Math.cos(t.angle + (Math.random() - 0.5)) * 2,
        vy: Math.sin(t.angle + (Math.random() - 0.5)) * 2,
        color: "#fbbf24",
        life: 12,
        r: 3
      });
    }
  }

  spawnDust(t) {
    if (Math.random() < 0.4) {
      this.particles.push({
        x: t.x - Math.cos(t.angle) * 20 + (Math.random() - 0.5) * 10,
        y: t.y - Math.sin(t.angle) * 20 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: "rgba(202, 138, 4, 0.45)",
        life: 25,
        r: 5
      });
    }
  }

  updateBots() {
    this.tanks.forEach(t => {
      if (!t.isBot || !t.alive) return;

      // Botlarning harakati va o'q uzishi
      if (!t.isMoving && Math.random() < 0.03) {
        t.isMoving = true;
        t.botDriveTime = 400 + Math.random() * 800;
        t.botStartDrive = performance.now();
      }

      if (t.isMoving && performance.now() - t.botStartDrive > t.botDriveTime) {
        t.isMoving = false;
        // Bot harakat to'xtaganda o'q uzadi
        if (Math.random() < 0.7) {
          this.fireBullet(t);
        }
      }
    });
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

    this.updateBots();
    this.mysteryBox.pulse += 0.05;

    // Tanklar harakati
    this.tanks.forEach(t => {
      if (!t.alive) return;

      if (!t.isMoving) {
        // Aylanish
        t.angle += t.rotateSpeed;
      } else {
        // Oldinga yurish
        const nextX = t.x + Math.cos(t.angle) * t.speed;
        const nextY = t.y + Math.sin(t.angle) * t.speed;

        let collides = false;

        // Chegaralar (tank razmeri kattalashgani uchun 30px chegara)
        if (nextX < 30 || nextX > w - 30 || nextY < 30 || nextY > h - 30) {
          collides = true;
        }

        // To'siqlar
        for (let obs of this.obstacles) {
          if (nextX > obs.x - 24 && nextX < obs.x + obs.w + 24 &&
              nextY > obs.y - 24 && nextY < obs.y + obs.h + 24) {
            collides = true;
            break;
          }
        }

        // Toshlar
        for (let rk of this.rocks) {
          if (Math.hypot(nextX - rk.x, nextY - rk.y) < rk.r + 20) {
            collides = true;
            break;
          }
        }

        if (!collides) {
          t.x = nextX;
          t.y = nextY;
          this.spawnDust(t);
        }
      }
    });

    // O'qlar
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      // Tashqi devor rikosheti
      if (b.x < 12 || b.x > w - 12) {
        b.vx *= -1;
        b.bounces--;
        SoundEngine.play(400, "sine", 0.04);
      }
      if (b.y < 12 || b.y > h - 12) {
        b.vy *= -1;
        b.bounces--;
        SoundEngine.play(400, "sine", 0.04);
      }

      // To'siqlar rikosheti
      for (let obs of this.obstacles) {
        if (b.x > obs.x && b.x < obs.x + obs.w && b.y > obs.y && b.y < obs.y + obs.h) {
          b.vx *= -1;
          b.bounces--;
          SoundEngine.play(400, "sine", 0.04);
          break;
        }
      }

      // Toshlar rikosheti
      for (let rk of this.rocks) {
        if (Math.hypot(b.x - rk.x, b.y - rk.y) < rk.r) {
          b.vx *= -1;
          b.vy *= -1;
          b.bounces--;
          break;
        }
      }

      // Tankka tegishi (radius 26px ga moslandi)
      for (let t of this.tanks) {
        if (t.alive && Math.hypot(b.x - t.x, b.y - t.y) < 26) {
          t.alive = false;
          b.bounces = 0;
          this.spawnExplosion(t.x, t.y, t.color);
          SoundEngine.play(90, "sawtooth", 0.28);
          this.checkWinner();
          break;
        }
      }

      if (b.bounces <= 0 || b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }

    // Particllar
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnExplosion(x, y, color) {
    for (let i = 0; i < 22; i++) {
      const spd = 1.2 + Math.random() * 4.5;
      const ang = Math.random() * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: Math.random() > 0.5 ? color : "#f97316",
        life: 30,
        r: 4 + Math.random() * 4
      });
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fon
    ctx.fillStyle = "#e5ba79";
    ctx.fillRect(0, 0, w, h);

    // Qum relyefi
    ctx.fillStyle = "rgba(212, 160, 89, 0.4)";
    for (let y = 0; y < h; y += 48) {
      ctx.beginPath();
      ctx.ellipse(w / 2, y, w * 0.7, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.renderCornerZones(ctx, w, h);

    // To'siqlar
    this.obstacles.forEach(obs => {
      if (obs.type === "hazard") {
        ctx.fillStyle = "#eab308";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        ctx.fillStyle = "#111";
        for (let sy = obs.y + 4; sy < obs.y + obs.h; sy += 16) {
          ctx.beginPath();
          ctx.moveTo(obs.x, sy);
          ctx.lineTo(obs.x + obs.w, sy + 8);
          ctx.lineTo(obs.x + obs.w, sy + 14);
          ctx.lineTo(obs.x, sy + 6);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = "#475569";
        for (let bx = obs.x + 12; bx < obs.x + obs.w - 8; bx += 14) {
          ctx.fillRect(bx, obs.y + 6, 2, 2);
          ctx.fillRect(bx, obs.y + obs.h - 8, 2, 2);
        }
      }
    });

    // Toshlar
    this.rocks.forEach(rk => {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.arc(rk.x + 6, rk.y + 7, rk.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#a8a29e";
      ctx.beginPath();
      ctx.arc(rk.x, rk.y, rk.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#78716c";
      ctx.beginPath();
      ctx.arc(rk.x - 3, rk.y - 3, rk.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Palma
    this.plants.forEach(pl => {
      ctx.save();
      ctx.translate(pl.x, pl.y);
      ctx.fillStyle = "#65a30d";
      for (let a = 0; a < 8; a++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.ellipse(14, 0, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#3f6212";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Sirli '?' qutisi
    ctx.save();
    const boxScale = 1 + Math.sin(this.mysteryBox.pulse) * 0.08;
    ctx.translate(this.mysteryBox.x, this.mysteryBox.y);
    ctx.scale(boxScale, boxScale);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-17, -17, 34, 34);
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 3;
    ctx.strokeRect(-17, -17, 34, 34);
    ctx.fillStyle = "#000";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 0);
    ctx.restore();

    // Zarrachalar
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // O'qlar (kattaroq va yorqinroq ko'rinish)
    this.bullets.forEach(b => {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Tanklar (KATTALASHTIRILGAN 1 sm² / ~48px)
    this.tanks.forEach(t => {
      if (!t.alive) return;
      this.drawTankSprite(ctx, t);
    });

    this.renderAmmoHUD(ctx, w, h);
  }

  renderCornerZones(ctx, w, h) {
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI / 2);
    ctx.fill();

    ctx.fillStyle = "#4c1d95";
    ctx.beginPath();
    ctx.arc(w, 0, 75, Math.PI / 2, Math.PI);
    ctx.fill();

    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(0, h, 75, -Math.PI / 2, 0);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(w, h, 75, Math.PI, -Math.PI / 2);
    ctx.fill();
  }

  // TANKNI CHIZISH (Katta 48px o'lchamda)
  drawTankSprite(ctx, t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);

    // Soya
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(-24, -20, 50, 40);

    // Gusenitsalar (G'ildirak yo'llari)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-24, -24, 48, 11);
    ctx.fillRect(-24, 13, 48, 11);

    // Gusenitsa qovurg'alari
    ctx.fillStyle = "#475569";
    for (let gx = -21; gx < 21; gx += 8) {
      ctx.fillRect(gx, -24, 4, 11);
      ctx.fillRect(gx, 13, 4, 11);
    }

    // Korpus (42x30 px)
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.roundRect(-21, -15, 42, 30, 7);
    ctx.fill();
    ctx.strokeStyle = t.darkColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Zambarak lulasi (Barrel)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(4, -5, 28, 10);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(28, -6, 5, 12);

    // Minora (Turret)
    ctx.fillStyle = t.darkColor;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Qopqoq / Lyuk
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-3, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderAmmoHUD(ctx, w, h) {
    const hudPositions = [
      { x: 22, y: h - 38, t: this.tanks[0] },
      { x: 22, y: 18, t: this.tanks[1] },
      { x: w - 110, y: 18, t: this.tanks[2] },
      { x: w - 110, y: h - 38, t: this.tanks[3] }
    ];

    hudPositions.forEach(({ x, y, t }) => {
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, 90, 20, 6);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < t.maxAmmo; i++) {
        ctx.fillStyle = i < t.ammo ? "#38bdf8" : "#334155";
        ctx.fillRect(x + 7 + i * 16, y + 4, 10, 12);
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
        score: t.alive ? "Tirik qoldi 👑" : "Mag‘lub bo‘ldi 💥"
      }));
      showGameOverModal(`🏆 ${winner.name} G‘olib!`, list);
    }
  }
}
