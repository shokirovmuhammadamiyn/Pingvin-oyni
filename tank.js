// ============================================================
// TANK BATTLE — 4 PLAYER ARENA (PRO VERSION)
// ============================================================

class TankGame {
  constructor(canvas, ctx, humanCount) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.humanCount = humanCount;
    this.running = false;

    // Tanklar sozlamalari
    this.tanks = [
      { id: 0, name: "P1 Moviy", color: "#06b6d4", darkColor: "#0891b2", x: 80, y: canvas.height - 80, angle: -Math.PI / 4, ammo: 5, maxAmmo: 5, alive: true, isBot: 0 >= humanCount, isPressing: false, pressTime: 0, rotateSpeed: 0.045, speed: 2.6 },
      { id: 1, name: "P2 Yashil", color: "#22c55e", darkColor: "#16a34a", x: 80, y: 80, angle: Math.PI / 4, ammo: 5, maxAmmo: 5, alive: true, isBot: 1 >= humanCount, isPressing: false, pressTime: 0, rotateSpeed: 0.045, speed: 2.6 },
      { id: 2, name: "P3 Binafsha", color: "#a855f7", darkColor: "#9333ea", x: canvas.width - 80, y: 80, angle: 3 * Math.PI / 4, ammo: 5, maxAmmo: 5, alive: true, isBot: 2 >= humanCount, isPressing: false, pressTime: 0, rotateSpeed: 0.045, speed: 2.6 },
      { id: 3, name: "P4 Qora", color: "#334155", darkColor: "#0f172a", x: canvas.width - 80, y: canvas.height - 80, angle: -3 * Math.PI / 4, ammo: 5, maxAmmo: 5, alive: true, isBot: 3 >= humanCount, isPressing: false, pressTime: 0, rotateSpeed: 0.045, speed: 2.6 }
    ];

    this.bullets = [];
    this.particles = [];
    this.mysteryBox = { x: 0, y: 0, w: 32, h: 32, active: true, pulse: 0 };
    this.obstacles = [];
    this.rocks = [];
    this.plants = [];

    this.initArena();
  }

  initArena() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Tanklarning burchaklardagi start pozitsiyalari
    this.tanks[0].x = 85;           this.tanks[0].y = h - 85;
    this.tanks[1].x = 85;           this.tanks[1].y = 85;
    this.tanks[2].x = w - 85;       this.tanks[2].y = 85;
    this.tanks[3].x = w - 85;       this.tanks[3].y = h - 85;

    // Skrinshotdagi vertikal sariq-qora to'siqlar
    this.obstacles = [
      { x: w * 0.35, y: h * 0.08, w: 22, h: h * 0.30, type: "hazard" },
      { x: w * 0.35, y: h * 0.62, w: 22, h: h * 0.30, type: "hazard" },
      { x: w * 0.65, y: h * 0.08, w: 22, h: h * 0.30, type: "hazard" },
      { x: w * 0.65, y: h * 0.62, w: 22, h: h * 0.30, type: "hazard" },

      // Gorizontal beton devorlar
      { x: w * 0.12, y: h * 0.5 - 12, w: w * 0.18, h: 24, type: "concrete" },
      { x: w * 0.70, y: h * 0.5 - 12, w: w * 0.18, h: 24, type: "concrete" }
    ];

    // Toshlar (Boulders)
    this.rocks = [
      { x: w * 0.46, y: h * 0.5, r: 28 },
      { x: w * 0.28, y: h * 0.82, r: 24 },
      { x: w * 0.72, y: h * 0.18, r: 24 },
      { x: w * 0.72, y: h * 0.88, r: 26 }
    ];

    // Palma butalari
    this.plants = [
      { x: w * 0.24, y: h * 0.22, r: 25 },
      { x: w * 0.10, y: h * 0.65, r: 22 },
      { x: w * 0.88, y: h * 0.66, r: 24 }
    ];

    // O'rtadagi sirli '?' qutisi
    this.mysteryBox.x = w * 0.58;
    this.mysteryBox.y = h * 0.5 - 16;
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

  // TUGMA BOSILGANDA (Harakat boshlanadi)
  onPlayerDown(idx) {
    const t = this.tanks[idx];
    if (t && t.alive) {
      t.isPressing = true;
      t.pressTime = performance.now();
    }
  }

  // TUGMA QO'YIB YUBORILGANDA (Agar tez bosilgan bo'lsa - o'q uzadi)
  onPlayerUp(idx) {
    const t = this.tanks[idx];
    if (t && t.alive && t.isPressing) {
      const duration = performance.now() - t.pressTime;
      t.isPressing = false;

      // Agar bosish 250 millisekunddan kam davom etgan bo'lsa -> O'Q OTISH
      if (duration < 250) {
        this.fireBullet(t);
      }
    }
  }

  fireBullet(t) {
    if (t.ammo <= 0) {
      SoundEngine.play(120, "sine", 0.05);
      return;
    }

    t.ammo--;
    SoundEngine.play(180, "square", 0.12);

    // Otilgan o'q uchquni
    this.spawnMuzzleFlash(t);

    const bx = t.x + Math.cos(t.angle) * 26;
    const by = t.y + Math.sin(t.angle) * 26;

    this.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(t.angle) * 6.5,
      vy: Math.sin(t.angle) * 6.5,
      bounces: 4,
      owner: t,
      life: 300
    });

    // Patronni qayta zaryadlash
    setTimeout(() => {
      if (t.ammo < t.maxAmmo) t.ammo++;
    }, 1800);
  }

  spawnMuzzleFlash(t) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: t.x + Math.cos(t.angle) * 24,
        y: t.y + Math.sin(t.angle) * 24,
        vx: Math.cos(t.angle + (Math.random() - 0.5)) * 3,
        vy: Math.sin(t.angle + (Math.random() - 0.5)) * 3,
        color: "#fbbf24",
        life: 12,
        r: 3
      });
    }
  }

  spawnDust(t) {
    if (Math.random() < 0.4) {
      this.particles.push({
        x: t.x - Math.cos(t.angle) * 14 + (Math.random() - 0.5) * 8,
        y: t.y - Math.sin(t.angle) * 14 + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        color: "rgba(217, 163, 98, 0.5)",
        life: 25,
        r: 4 + Math.random() * 3
      });
    }
  }

  updateBots() {
    this.tanks.forEach(t => {
      if (!t.isBot || !t.alive) return;

      // Botlar o'z-o'zidan harakatlanishi va nishonga olishi
      if (!t.isPressing && Math.random() < 0.03) {
        t.isPressing = true;
        t.pressTime = performance.now();
        t.botDriveTime = 400 + Math.random() * 700;
      }

      if (t.isPressing && performance.now() - t.pressTime > (t.botDriveTime || 500)) {
        t.isPressing = false;
      }

      // Tasodifiy o'q uzish
      if (Math.random() < 0.02 && t.ammo > 0) {
        this.fireBullet(t);
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

    // Sirli quti animatsiyasi
    this.mysteryBox.pulse += 0.05;

    // Tanklar holatini yangilash
    this.tanks.forEach(t => {
      if (!t.alive) return;

      if (!t.isPressing) {
        // BOSILMAGANDA: Joyida doimiy aylanadi
        t.angle += t.rotateSpeed;
      } else {
        // BOSIB TURILGANDA: O'sha tarafga qarab oldinga siljiydi
        const nextX = t.x + Math.cos(t.angle) * t.speed;
        const nextY = t.y + Math.sin(t.angle) * t.speed;

        // Devorlar va chegaralar bilan to'qnashuv tekshiruvi
        let collides = false;

        // Ekran chegarasi
        if (nextX < 24 || nextX > w - 24 || nextY < 24 || nextY > h - 24) {
          collides = true;
        }

        // To'siqlar
        for (let obs of this.obstacles) {
          if (nextX > obs.x - 18 && nextX < obs.x + obs.w + 18 &&
              nextY > obs.y - 18 && nextY < obs.y + obs.h + 18) {
            collides = true;
            break;
          }
        }

        // Toshlar
        for (let rk of this.rocks) {
          if (Math.hypot(nextX - rk.x, nextY - rk.y) < rk.r + 14) {
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

    // O'qlar harakati va rikoshet
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      // Tashqi devorlardan rikoshet
      if (b.x < 12 || b.x > w - 12) {
        b.vx *= -1;
        b.bounces--;
        SoundEngine.play(450, "sine", 0.04);
      }
      if (b.y < 12 || b.y > h - 12) {
        b.vy *= -1;
        b.bounces--;
        SoundEngine.play(450, "sine", 0.04);
      }

      // To'siqlardan rikoshet
      for (let obs of this.obstacles) {
        if (b.x > obs.x && b.x < obs.x + obs.w && b.y > obs.y && b.y < obs.y + obs.h) {
          b.vx *= -1;
          b.bounces--;
          SoundEngine.play(450, "sine", 0.04);
          break;
        }
      }

      // Toshlardan rikoshet
      for (let rk of this.rocks) {
        if (Math.hypot(b.x - rk.x, b.y - rk.y) < rk.r) {
          b.vx *= -1;
          b.vy *= -1;
          b.bounces--;
          break;
        }
      }

      // Tankka tegishi
      for (let t of this.tanks) {
        if (t.alive && Math.hypot(b.x - t.x, b.y - t.y) < 22) {
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

    // Zarrachalar (particles)
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
    for (let i = 0; i < 20; i++) {
      const spd = 1 + Math.random() * 4;
      const ang = Math.random() * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: Math.random() > 0.5 ? color : "#f97316",
        life: 30,
        r: 3 + Math.random() * 4
      });
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Cho'l foni (Sand Dunes)
    ctx.fillStyle = "#e5ba79";
    ctx.fillRect(0, 0, w, h);

    // Qum barxanlari chiziqlari (tekstura)
    ctx.fillStyle = "rgba(212, 160, 89, 0.4)";
    for (let y = 0; y < h; y += 45) {
      ctx.beginPath();
      ctx.ellipse(w / 2, y, w * 0.7, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. To'rt burchakdagi maxsus zonalar (Skrinshotdagi kabi)
    this.renderCornerZones(ctx, w, h);

    // 3. To'siqlar
    this.obstacles.forEach(obs => {
      if (obs.type === "hazard") {
        // Sariq-qora chiziqli to'siq
        ctx.save();
        ctx.fillStyle = "#eab308";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        // Qora chiziqlar (Hazard stripes)
        ctx.fillStyle = "#111";
        for (let sy = obs.y + 4; sy < obs.y + obs.h; sy += 16) {
          ctx.beginPath();
          ctx.moveTo(obs.x, sy);
          ctx.lineTo(obs.x + obs.w, sy + 8);
          ctx.lineTo(obs.x + obs.w, sy + 14);
          ctx.lineTo(obs.x, sy + 6);
          ctx.fill();
        }
        ctx.restore();
      } else {
        // Gorizontal beton to'siq
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

        // Beton nuqtalari
        ctx.fillStyle = "#475569";
        for (let bx = obs.x + 12; bx < obs.x + obs.w - 8; bx += 14) {
          ctx.fillRect(bx, obs.y + 6, 2, 2);
          ctx.fillRect(bx, obs.y + obs.h - 8, 2, 2);
        }
      }
    });

    // 4. Toshlar (Boulders)
    this.rocks.forEach(rk => {
      ctx.save();
      // Tosh soyasi
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.arc(rk.x + 5, rk.y + 6, rk.r, 0, Math.PI * 2);
      ctx.fill();

      // Tosh tanasi
      ctx.fillStyle = "#a8a29e";
      ctx.beginPath();
      ctx.arc(rk.x, rk.y, rk.r, 0, Math.PI * 2);
      ctx.fill();

      // Qirralari
      ctx.fillStyle = "#78716c";
      ctx.beginPath();
      ctx.arc(rk.x - 3, rk.y - 3, rk.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 5. Palma butalari
    this.plants.forEach(pl => {
      ctx.save();
      ctx.translate(pl.x, pl.y);
      ctx.fillStyle = "#65a30d";
      for (let a = 0; a < 8; a++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.ellipse(12, 0, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#3f6212";
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Sirli '?' qutisi
    ctx.save();
    const boxScale = 1 + Math.sin(this.mysteryBox.pulse) * 0.06;
    ctx.translate(this.mysteryBox.x, this.mysteryBox.y);
    ctx.scale(boxScale, boxScale);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 3;
    ctx.strokeRect(-16, -16, 32, 32);
    ctx.fillStyle = "#000";
    ctx.font = "900 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 0);
    ctx.restore();

    // 7. Zarrachalar (Particles)
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. O'qlar
    this.bullets.forEach(b => {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 9. Tanklar (Yuqori darajadagi 3D ko'rinish)
    this.tanks.forEach(t => {
      if (!t.alive) return;
      this.drawTankSprite(ctx, t);
    });

    // 10. Patronlar ko'rsatkichi (Burchaklardagi 5 talik patron panellari)
    this.renderAmmoHUD(ctx, w, h);
  }

  renderCornerZones(ctx, w, h) {
    // Chap-yuqori: Yashil radar
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI / 2);
    ctx.fill();

    // O'ng-yuqori: Kosmik binafsha
    ctx.fillStyle = "#4c1d95";
    ctx.beginPath();
    ctx.arc(w, 0, 75, Math.PI / 2, Math.PI);
    ctx.fill();

    // Chap-pastki: Moviy ko'l
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(0, h, 75, -Math.PI / 2, 0);
    ctx.fill();

    // O'ng-pastki: Qora tuynuk
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(w, h, 75, Math.PI, -Math.PI / 2);
    ctx.fill();
  }

  drawTankSprite(ctx, t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);

    // Tank soyasi
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(-18, -14, 38, 30);

    // Gusenitsalar (Tracks)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-19, -17, 38, 8);
    ctx.fillRect(-19, 9, 38, 8);

    // Gusenitsa tishlari
    ctx.fillStyle = "#475569";
    for (let gx = -16; gx < 16; gx += 7) {
      ctx.fillRect(gx, -17, 3, 8);
      ctx.fillRect(gx, 9, 3, 8);
    }

    // Korpus
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.roundRect(-16, -11, 32, 22, 5);
    ctx.fill();
    ctx.strokeStyle = t.darkColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Zambarak lulasi (Barrel)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(2, -3.5, 22, 7);
    ctx.fillStyle = "#475569";
    ctx.fillRect(21, -4.5, 4, 9); // Lulaning uchi

    // Minora (Turret)
    ctx.fillStyle = t.darkColor;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Qopqoq / Lyuk
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-2, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderAmmoHUD(ctx, w, h) {
    const hudPositions = [
      { x: 18, y: h - 34, t: this.tanks[0] }, // P1
      { x: 18, y: 16, t: this.tanks[1] },     // P2
      { x: w - 100, y: 16, t: this.tanks[2] }, // P3
      { x: w - 100, y: h - 34, t: this.tanks[3] } // P4
    ];

    hudPositions.forEach(({ x, y, t }) => {
      // Qora ramka
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, 82, 18, 5);
      ctx.fill();
      ctx.stroke();

      // 5 ta patron
      for (let i = 0; i < t.maxAmmo; i++) {
        ctx.fillStyle = i < t.ammo ? "#38bdf8" : "#334155";
        ctx.fillRect(x + 6 + i * 15, y + 4, 9, 10);
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
