// ============================================================
// MAIN ENGINE — SOUND & TOUCH MULTIPLAYER CONTROLS
// ============================================================

const SoundEngine = {
  ctx: null,
  enabled: true,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },
  play(freq = 440, type = "sine", duration = 0.08) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch(e) {}
  }
};

let activeGame = null;
let activeGameName = "";
let humanPlayersCount = 1;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  if (activeGame && activeGame.onResize) {
    activeGame.onResize(canvas.width, canvas.height);
  }
}
window.addEventListener("resize", resizeCanvas);

// O'yinchi sonini tanlash
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    humanPlayersCount = parseInt(btn.dataset.players, 10);
    SoundEngine.play(520, "triangle", 0.05);
  };
});

// O'yinni boshlash
function launchGame(name) {
  SoundEngine.init();
  SoundEngine.play(600, "triangle", 0.1);
  activeGameName = name;

  document.getElementById("menuScreen").classList.remove("active");
  document.getElementById("gameScreen").classList.add("active");
  document.getElementById("resultModal").classList.remove("show");

  resizeCanvas();

  if (name === "fishing") {
    activeGame = new FishingGame(canvas, ctx, humanPlayersCount);
  } else if (name === "tank") {
    activeGame = new TankGame(canvas, ctx, humanPlayersCount);
  }

  activeGame.start();
}

function showMenu() {
  if (activeGame) {
    activeGame.stop();
    activeGame = null;
  }
  document.getElementById("gameScreen").classList.remove("active");
  document.getElementById("menuScreen").classList.add("active");
  document.getElementById("resultModal").classList.remove("show");
}

document.getElementById("btnBack").onclick = showMenu;
document.getElementById("btnMenu").onclick = showMenu;
document.getElementById("btnRestart").onclick = () => launchGame(activeGameName);

document.getElementById("btnSound").onclick = () => {
  SoundEngine.enabled = !SoundEngine.enabled;
  document.getElementById("btnSound").textContent = SoundEngine.enabled ? "🔊" : "🔇";
};

// 4 BURCHAK KNOPKALARINI BOSH QARISH (HOLD & RELEASE)
function setupCornerButtons() {
  const map = [
    { id: "tapP1", idx: 0 },
    { id: "tapP2", idx: 1 },
    { id: "tapP3", idx: 2 },
    { id: "tapP4", idx: 3 }
  ];

  map.forEach(({ id, idx }) => {
    const el = document.getElementById(id);
    if (!el) return;

    const startHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add("pressed");
      if (activeGame) {
        if (activeGame.onPlayerDown) activeGame.onPlayerDown(idx);
        else if (activeGame.onPlayerAction) activeGame.onPlayerAction(idx);
      }
    };

    const stopHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove("pressed");
      if (activeGame && activeGame.onPlayerUp) {
        activeGame.onPlayerUp(idx);
      }
    };

    // Sensor qurilmalar (Smartfon / Planshet)
    el.addEventListener("touchstart", startHandler, { passive: false });
    el.addEventListener("touchend", stopHandler, { passive: false });
    el.addEventListener("touchcancel", stopHandler, { passive: false });

    // Kompyuter (Sichqoncha)
    el.addEventListener("mousedown", startHandler);
    el.addEventListener("mouseup", stopHandler);
    el.addEventListener("mouseleave", stopHandler);
  });

  // Ekran zonasidan boshqarish (P1 uchun chap-pastki qism)
  const container = document.querySelector(".canvas-container");
  container.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    const rect = container.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;

    if (x < rect.width * 0.35 && y > rect.height * 0.65) {
      if (activeGame && activeGame.onPlayerDown) activeGame.onPlayerDown(0);
      document.getElementById("tapP1").classList.add("pressed");
    }
  }, { passive: true });

  container.addEventListener("touchend", () => {
    if (activeGame && activeGame.onPlayerUp) activeGame.onPlayerUp(0);
    document.getElementById("tapP1").classList.remove("pressed");
  }, { passive: true });
}
setupCornerButtons();

// KLAVIATURA (KOMPYUTER FOYDALANUVCHILARI UCHUN)
const keyMap = {
  "Space": 0, "KeyW": 0,
  "KeyQ": 1,
  "KeyP": 2, "ArrowUp": 2,
  "Enter": 3, "ArrowDown": 3
};

window.addEventListener("keydown", (e) => {
  if (!activeGame || e.repeat) return;
  const pIdx = keyMap[e.code];
  if (pIdx !== undefined) {
    if (activeGame.onPlayerDown) activeGame.onPlayerDown(pIdx);
    else if (activeGame.onPlayerAction) activeGame.onPlayerAction(pIdx);
  }
});

window.addEventListener("keyup", (e) => {
  if (!activeGame) return;
  const pIdx = keyMap[e.code];
  if (pIdx !== undefined && activeGame.onPlayerUp) {
    activeGame.onPlayerUp(pIdx);
  }
});

function showGameOverModal(title, scoreList) {
  document.getElementById("resTitle").textContent = title;
  const board = document.getElementById("resScores");
  board.innerHTML = "";

  scoreList.forEach(item => {
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `
      <span style="color:${item.color}">${item.name}</span>
      <span>${item.score}</span>
    `;
    board.appendChild(row);
  });

  document.getElementById("resultModal").classList.add("show");
  SoundEngine.play(523, "triangle", 0.15);
  setTimeout(() => SoundEngine.play(659, "triangle", 0.25), 140);
}

