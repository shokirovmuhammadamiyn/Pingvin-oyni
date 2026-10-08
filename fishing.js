// VIDEODAGI 4 O'YINCHILI BALIQ OVI
class FishingGame {
  constructor(canvas, ctx, humanCount) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.humanCount = humanCount;
    this.running = false;
    this.timer = 45;
    this.timerInterval = null;

    // 4 ta qayiq / o'yinchi konfiguratsiyasi
    this.players = [
      { name: "P1 Moviy", color: "#06b6d4", score: 0, corner: 0, angle: -0.8, dir: 1, hookState: "idle", hookLen: 30, hookMax: 0, isBot: 0 >= humanCount },
      { name: "P2 Yashil", color: "#22c55e", score: 0, corner: 1, angle: 0.8, dir: 1, hookState: "idle", hookLen: 30, hookMax: 0, isBot: 1 >= humanCount },
      { name: "P3 Binafsha", color: "#a855f7", score: 0, corner: 2, angle: 2.3, dir: 1, hookState: "idle", hookLen: 30, hookMax: 0, isBot: 2 >= humanCount },
      { name: "P4 Qora", color: "#f59e0b", score: 0, corner: 3, angle: -2.3, dir: 1, hookState: "idle", hookLen: 30, hookMax: 0, isBot: 3 >= humanCount }
    ];

    this.fishes = [];
    this.jellyfish = { x: 0, y: 0, vy: 1.2, r: 28 };
    this.particles = [];
  }

  start() {
    this.running = true;
    this.timer = 45;
    this.spawnFishes(14);
    this.jellyfish.x = this.canvas.width / 2;
    this.jellyfish.y = 80;

    // Burchak joylashuvlarini belgilash
    this.updateLayout();

    // Taymer
    document.getElementById("gameTimer").textContent = `⏱️ ${this.timer}`;
    this.timerInterval = setInterval(() => {
      this.timer--;
      document.getElementById("gameTimer").textContent = `⏱️ ${this.timer}`;
      if (this.timer <= 0) {
        this.endGame();
      }
    }, 1000);

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  onResize() {
    this.updateLayout();
  }

  updateLayout() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const offset = 45;

    // 0: Bottom-Left, 1: Top-Left, 2: Top-Right, 3: Bottom-Right
    this.players[0].bx = offset;      this.players[0].by = h - offset;
    this.players[1].bx = offset;      this.players[1].by = offset;
    this.players[2].bx = w - offset;  this.players[2].by = offset;
    this.players[3].bx = w - offset;  this.players[3].by = h - offset;

    const maxLen = Math.hypot(w / 2, h / 2) * 1.1;
    this.players.forEach(p => p.hookMax = maxLen);
  }

  spawnFishes(count) {
    const colors = ["#f97316", "#ef4444", "#3b82f6", "#ec4899", "#eab308"];
    this.fishes = [];
    for (let i = 0; i < count; i++) {
      this.fishes.push({
        x: this.canvas.width * 0.2 + Math.random() * this.canvas.width * 0.6,
        y: this.canvas.height * 0.2 + Math.random() * this.canvas.height * 0.6,
        vx: (Math.random() - 0.5) * 1.6,
        vy: (Math.random() - 0.5) * 1.6,
        size: 16 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        caughtBy: null,
        points: Math.random() > 0.7 ? 3 : 1
      });
    }
  }

  onPlayerAction(idx) {
    const p = this.players[idx];
    if (p && p.hookState === "idle") {
      p.hookState = "extending";
      SoundEngine.play(300, "sine", 0.06);
    }
  }

  updateBots() {
    this.players.forEach(p => {
      if (!p.isBot || p.hookState !== "idle") return;

      // Bot oldidagi baliqlarni hisoblash
      this.fishes.forEach(f => {
        if (f.caughtBy) return;
        const dx = f.x - p.bx;
        const dy = f.y - p.by;
        const angleToFish = Math.atan2(dy, dx);
        if (Math.abs(angleToFish - p.angle) < 0.12 && Math.random() < 0.08) {
          p.hookState = "extending";
        }
      });
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

    // Meduza harakati
    this.jellyfish.y += this.jellyfish.vy;
    if (this.jellyfish.y > h - 100 || this.jellyfish.y < 100) {
      this.jellyfish.vy *= -1;
    }

    // Baliqlar suzishi
    this.fishes.forEach(f => {
      if (!f.caughtBy) {
        f.x += f.vx;
        f.y += f.vy;
        if (f.x < w * 0.15 || f.x > w * 0.85) f.vx *= -1;
        if (f.y < h * 0.15 || f.y > h * 0.85) f.vy *= -1;
      }
    });

    // O'yinchilar qarmoq mantig'i
    this.players.forEach((p, pIdx) => {
      // Burchaklar bo'yicha tebranish
      if (p.hookState === "idle") {
        p.angle += 0.03 * p.dir;
        // Tebranish diapazoni
        const baseAngles = [-Math.PI / 4, Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4];
        const base = baseAngles[p.corner];
        if (Math.abs(p.angle - base) > 0.6) {
          p.dir *= -1;
        }
      } else if (p.hookState === "extending") {
        p.hookLen += 9;

        const hx = p.bx + Math.cos(p.angle) * p.hookLen;
        const hy = p.by + Math.sin(p.angle) * p.hookLen;

        // Meduza bilan to'qnashuv
        if (Math.hypot(hx - this.jellyfish.x, hy - this.jellyfish.y) < this.jellyfish.r) {
          p.hookState = "retracting";
          SoundEngine.play(150, "square", 0.15);
        }

        // Baliqni ilish
        for (let f of this.fishes) {
          if (!f.caughtBy && Math.hypot(hx - f.x, hy - f.y) < f.size + 12) {
            f.caughtBy = p;
            p.hookState = "retracting";
            SoundEngine.play(700, "triangle", 0.1);
            break;
          }
        }

        if (p.hookLen >= p.hookMax) {
          p.hookState = "retracting";
        }
      } else if (p.hookState === "retracting") {
        p.hookLen -= 8;

        const hx = p.bx + Math.cos(p.angle) * p.hookLen;
        const hy = p.by + Math.sin(p.angle) * p.hookLen;

        // Ilingan baliqni tortish
        this.fishes.forEach(f => {
          if (f.caughtBy === p) {
            f.x = hx;
            f.y = hy;
          }
        });

        if (p.hookLen <= 30) {
          p.hookLen = 30;
          p.hookState = "idle";

          // Baliq yetib kelganda ochko qo'shish
          this.fishes.forEach((f, fIdx) => {
            if (f.caughtBy === p) {
              p.score += f.points;
              this.fishes.splice(fIdx, 1);
              SoundEngine.play(900, "sine", 0.1);
            }
          });

          // Yangi baliq chiqarish
          if (this.fishes.length < 10) {
            this.spawnFishes(4);
          }
        }
      }
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Suv foni (Moviy ko'l)
    ctx.fillStyle = "#0c4a6e";
    ctx.fillRect(0, 0, w, h);

    // Suv to'lqinlari effekti
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Meduza chizish
    ctx.save();
    ctx.fillStyle = "rgba(236, 72, 153, 0.5)";
    ctx.beginPath();
    ctx.arc(this.jellyfish.x, this.jellyfish.y, this.jellyfish.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f472b6";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Baliqlarni chizish
    this.fishes.forEach(f => {
      ctx.save();
      ctx.translate(f.x, f.y);
      const angle = Math.atan2(f.vy, f.vx);
      ctx.rotate(angle);

      // Baliq tanasi
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.size, f.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dumi
      ctx.beginPath();
      ctx.moveTo(-f.size, 0);
      ctx.lineTo(-f.size - 8, -6);
      ctx.lineTo(-f.size - 8, 6);
      ctx.closePath();
      ctx.fill();

      // Ko'zi
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(f.size * 0.5, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 4 Qayiq va qarmoqlarni chizish
    this.players.forEach(p => {
      const hx = p.bx + Math.cos(p.angle) * p.hookLen;
      const hy = p.by + Math.sin(p.angle) * p.hookLen;

      // Qarmoq ipi
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.bx, p.by);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      // Qarmoq uchi (ilgak)
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.arc(hx, hy, 7, 0, Math.PI * 2);
      ctx.fill();

      // Qayiq (burchakda)
      ctx.save();
      ctx.translate(p.bx, p.by);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // O'yinchi belgisi
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.score, 0, 0);
      ctx.restore();
    });
  }

  endGame() {
    this.stop();
    const sorted = [...this.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    showGameOverModal(`🏆 ${winner.name} G‘alaba Qozondi!`, sorted);
  }
}
